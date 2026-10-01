const { query, withTransaction } = require('../models/db');
const { generateUniqueCouponCode } = require('../utils/couponGenerator');
const memoryCache = require('../utils/cache');
const { sendRenewalEmail, sendSubscriptionExpiryEmail } = require('../config/email');

/**
 * Subscription Service
 * Implements 1-year ₹5,999 subscription plans, 8-character coupons,
 * vendor panel status & expiry popups, storefront visibility rules,
 * and multi-stage expiry reminder emails (7d, 3d, 1d, 0d, expired).
 */
class SubscriptionService {

  /**
   * Formats a Date object to YYYY-MM-DD in Asia/Kolkata timezone.
   */
  getTodayIST() {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now); // "YYYY-MM-DD"
  }

  /**
   * Calculates difference in integer days between target date string and today in IST.
   */
  calculateDaysLeft(endDateStr) {
    if (!endDateStr) return -999;
    const todayStr = this.getTodayIST();
    const targetDate = new Date(endDateStr + 'T00:00:00+05:30');
    const todayDate = new Date(todayStr + 'T00:00:00+05:30');
    const diffMs = targetDate.getTime() - todayDate.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * 1. GET AVAILABLE PLANS
   * Note: The plans table supports future scalability. Currently returns the active 1-year ₹5,999 plan.
   */
  async getPlans() {
    const res = await query(
      `SELECT plan_id, plan_code, name, description, price, duration_days, billing_cycle, features, is_active 
       FROM plans 
       WHERE is_active = TRUE AND plan_code = 'ANNUAL_5999' 
       ORDER BY plan_id ASC LIMIT 1`
    );

    if (res.rows && res.rows.length > 0) {
      return res.rows;
    }

    // Default fallback
    return [{
      plan_id: 1,
      plan_code: 'ANNUAL_5999',
      name: 'Annual Merchant Plan',
      description: '1 Year DigiLocal Storefront Visibility & Resident Ordering',
      price: 5999.00,
      duration_days: 365,
      billing_cycle: 'YEARLY',
      features: [
        'Storefront visible on DigiLocal user portal',
        'Customers can view and buy products from your store',
        'Vendor panel dashboard & catalog management',
        'Real-time resident order notifications',
        'Priority merchant support'
      ],
      is_active: true
    }];
  }

  /**
   * 2. GET UNUSED ACTIVE COUPONS FOR A VENDOR
   * Only returns coupons where status = 'unused' and CURRENT_DATE is between start_date and end_date.
   */
  async getVendorCoupons(vendorId) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }

    const today = this.getTodayIST();

    const sql = `
      SELECT id, coupon_code, vendor_id, discount, type, 
             TO_CHAR(start_date, 'YYYY-MM-DD') as start_date, 
             TO_CHAR(end_date, 'YYYY-MM-DD') as end_date, 
             usage_limit, status, created_at
      FROM coupons
      WHERE (vendor_id = ? OR vendor_id IS NULL)
        AND LOWER(status) = 'unused'
        AND start_date <= ?::date
        AND end_date >= ?::date
      ORDER BY id DESC
    `;

    const res = await query(sql, [vId, today, today]);
    return res.rows || [];
  }

  /**
   * 3. APPLY / VALIDATE COUPON
   * Validates coupon code and returns discounted subscription pricing.
   */
  async applyCoupon({ vendorId, couponCode, planId }) {
    if (!couponCode) {
      throw new Error('coupon_code is required');
    }
    const cleanCode = String(couponCode).trim().toUpperCase();
    const vId = vendorId ? Number(vendorId) : null;
    const today = this.getTodayIST();

    // 1. Fetch active 1-year plan
    let basePrice = 5999.00;
    let plan = null;
    if (planId) {
      const planRes = await query(`SELECT * FROM plans WHERE plan_id = ? AND is_active = TRUE`, [planId]);
      if (planRes.rows.length > 0) {
        plan = planRes.rows[0];
        basePrice = parseFloat(plan.price);
      }
    }
    if (!plan) {
      const planRes = await query(`SELECT * FROM plans WHERE plan_code = 'ANNUAL_5999' AND is_active = TRUE LIMIT 1`);
      plan = planRes.rows[0] || { plan_id: 1, name: 'Annual Merchant Plan', price: 5999.00, duration_days: 365 };
      basePrice = parseFloat(plan.price);
    }

    // 2. Fetch coupon
    const couponRes = await query(
      `SELECT * FROM coupons WHERE UPPER(coupon_code) = ? LIMIT 1`,
      [cleanCode]
    );

    if (!couponRes.rows || couponRes.rows.length === 0) {
      throw new Error(`Coupon "${cleanCode}" is invalid.`);
    }

    const coupon = couponRes.rows[0];

    // 3. Validate status
    if (String(coupon.status).toLowerCase() !== 'unused') {
      throw new Error(`Coupon "${cleanCode}" has already been used.`);
    }

    // 4. Validate vendor ownership if vendor-specific
    if (coupon.vendor_id && vId && Number(coupon.vendor_id) !== vId) {
      throw new Error(`Coupon "${cleanCode}" is not valid for this vendor account.`);
    }

    // 5. Validate date range
    const couponStartDate = coupon.start_date instanceof Date ? coupon.start_date.toISOString().split('T')[0] : String(coupon.start_date).split('T')[0];
    const couponEndDate = coupon.end_date instanceof Date ? coupon.end_date.toISOString().split('T')[0] : String(coupon.end_date).split('T')[0];

    if (today < couponStartDate) {
      throw new Error(`Coupon "${cleanCode}" is not active yet (starts on ${couponStartDate}).`);
    }
    if (today > couponEndDate) {
      throw new Error(`Coupon "${cleanCode}" expired on ${couponEndDate}.`);
    }

    // 6. Calculate discount
    const rawDiscount = parseFloat(coupon.discount);
    let discountAmount = 0.00;

    if (coupon.type === 'percentage') {
      discountAmount = (basePrice * rawDiscount) / 100.0;
    } else {
      // Flat discount
      discountAmount = rawDiscount;
    }

    discountAmount = Math.min(discountAmount, basePrice);
    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalPrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

    return {
      valid: true,
      coupon_id: coupon.id,
      coupon_code: coupon.coupon_code,
      discount_type: coupon.type,
      discount_value: rawDiscount,
      original_price: basePrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      plan_id: plan.plan_id,
      plan_name: plan.name,
      duration_days: plan.duration_days || 365,
      start_date: couponStartDate,
      end_date: couponEndDate,
      message: `Coupon "${cleanCode}" applied successfully! You saved ₹${discountAmount.toFixed(2)}.`
    };
  }

  /**
   * 4. SUBSCRIBE / RENEW SUBSCRIPTION
   * Enforces ONLINE payment method ONLY.
   * Consumes coupon (marks 'used').
   * Grants 1-year subscription (extends current subscription if active).
   * Sets vendor status to 'ACTIVE' so shop is immediately live on user portal.
   */
  async subscribe({ vendorId, planId, couponCode, paymentMethod = 'ONLINE', transactionId }) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }

    // Check payment method - strictly ONLINE ONLY
    const rawMethod = String(paymentMethod || '').trim().toUpperCase();
    const disallowedMethods = ['COD', 'CASH', 'PAY_ON_DELIVERY', 'CASH_ON_DELIVERY', 'OFFLINE'];
    if (disallowedMethods.includes(rawMethod)) {
      throw new Error('Vendor subscription can ONLY be purchased using online payment (Razorpay, Cashfree, UPI, NetBanking, Card). Cash/COD is not accepted for subscriptions.');
    }

    // Check vendor exists
    const vendorRes = await query(`SELECT vendor_id, vendor_name, store_name, email, phone_number, status FROM vendors WHERE vendor_id = ?`, [vId]);
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor ${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];

    // Fetch plan details (1-year 5999 default)
    let plan = null;
    if (planId) {
      const pRes = await query(`SELECT * FROM plans WHERE plan_id = ? AND is_active = TRUE`, [planId]);
      if (pRes.rows.length > 0) plan = pRes.rows[0];
    }
    if (!plan) {
      const pRes = await query(`SELECT * FROM plans WHERE plan_code = 'ANNUAL_5999' AND is_active = TRUE LIMIT 1`);
      plan = pRes.rows[0] || { plan_id: 1, name: 'Annual Merchant Plan', price: 5999.00, duration_days: 365 };
    }

    const basePrice = parseFloat(plan.price || 5999.00);
    let discountAmount = 0.00;
    let appliedCoupon = null;

    // Validate & apply coupon if provided
    if (couponCode) {
      const couponCheck = await this.applyCoupon({ vendorId: vId, couponCode, planId: plan.plan_id });
      discountAmount = couponCheck.discount_amount;
      appliedCoupon = couponCheck;
    }

    const finalPrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);
    const txnId = transactionId || `TXN_${Date.now()}_${vId}`;
    const todayStr = this.getTodayIST();

    // Check current active subscription to determine start and end dates
    const existingSubRes = await query(
      `SELECT subscription_id, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date, status 
       FROM subscriptions 
       WHERE vendor_id = ? AND UPPER(status) = 'ACTIVE' 
       ORDER BY subscription_id DESC LIMIT 1`,
      [vId]
    );

    let startDateStr = todayStr;
    const existingSub = existingSubRes.rows && existingSubRes.rows[0];

    if (existingSub && existingSub.end_date && existingSub.end_date >= todayStr) {
      // Current subscription still active: Extend from current end_date!
      startDateStr = existingSub.end_date;
    }

    // Calculate end_date = startDate + 365 days
    const startDateObj = new Date(startDateStr + 'T00:00:00+05:30');
    const endDateObj = new Date(startDateObj);
    endDateObj.setFullYear(endDateObj.getFullYear() + 1);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    return await withTransaction(async (txQuery) => {
      // 1. Mark coupon as 'used' if applied
      if (appliedCoupon && appliedCoupon.coupon_id) {
        await txQuery(
          `UPDATE coupons SET status = 'used' WHERE id = ?`,
          [appliedCoupon.coupon_id]
        );
      }

      // 2. Insert new 1-year subscription record
      const subRes = await txQuery(
        `INSERT INTO subscriptions (
           vendor_id, plan_id, plan_name, start_date, end_date, 
           original_price, discount_amount, final_price, coupon_code, 
           payment_method, transaction_id, status, reminders_sent, created_at, updated_at
         ) VALUES (?, ?, ?, ?::date, ?::date, ?, ?, ?, ?, ?, ?, 'ACTIVE', '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          vId,
          plan.plan_id || null,
          plan.name || 'Annual Merchant Plan',
          startDateStr,
          endDateStr,
          basePrice,
          discountAmount,
          finalPrice,
          appliedCoupon ? appliedCoupon.coupon_code : null,
          rawMethod || 'ONLINE',
          txnId
        ]
      );

      const newSub = subRes.rows[0];

      // 3. Ensure vendor status is set to 'ACTIVE' so store is visible to resident users
      await txQuery(`UPDATE vendors SET status = 'ACTIVE' WHERE vendor_id = ?`, [vId]);

      // 4. Record payment in payments table
      await txQuery(
        `INSERT INTO payments (vendor_id, amount, currency, payment_status, payment_method, transaction_id, created_at, updated_at)
         VALUES (?, ?, 'INR', 'SUCCESS', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [vId, finalPrice, rawMethod || 'ONLINE', txnId]
      ).catch(() => {});

      // 5. Send Renewal / Subscription Success Email
      try {
        if (vendor.email && !vendor.email.includes('@vendor.digilocal')) {
          sendRenewalEmail(vendor.email, vendor.vendor_name, vendor.store_name, endDateStr, finalPrice, txnId);
        }
      } catch (mailErr) {
        console.warn('[SubscriptionService] Could not send confirmation email:', mailErr.message);
      }

      // 6. Clear cache
      memoryCache.clear();

      return {
        success: true,
        message: `Subscription activated successfully for 1 full year until ${endDateStr}! Store is now visible on DigiLocal user portal.`,
        subscription_id: newSub.subscription_id,
        vendor_id: vId,
        store_name: vendor.store_name,
        plan_name: plan.name,
        start_date: startDateStr,
        end_date: endDateStr,
        original_price: basePrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        coupon_applied: appliedCoupon ? appliedCoupon.coupon_code : null,
        payment_method: rawMethod || 'ONLINE',
        transaction_id: txnId,
        status: 'ACTIVE',
        shop_visible_on_portal: true
      };
    });
  }

  /**
   * 5. VENDOR PANEL SUBSCRIPTION STATUS & EXPIRY POPUP
   * Checks subscription status, computes days left, and determines if frontend (Web/App)
   * should trigger an expiry popup/modal or renewal banner.
   */
  async getVendorSubscriptionStatus(vendorId) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }

    const vendorRes = await query(
      `SELECT vendor_id, vendor_name, store_name, email, phone_number, status FROM vendors WHERE vendor_id = ?`,
      [vId]
    );
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor ${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];

    // Fetch latest subscription record
    const subRes = await query(
      `SELECT s.subscription_id, s.plan_id, s.plan_name, 
              TO_CHAR(s.start_date, 'YYYY-MM-DD') as start_date, 
              TO_CHAR(s.end_date, 'YYYY-MM-DD') as end_date, 
              s.original_price, s.discount_amount, s.final_price, 
              s.coupon_code, s.payment_method, s.transaction_id, 
              s.status, s.reminders_sent, s.created_at,
              p.duration_days, p.price as plan_price
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.plan_id
       WHERE s.vendor_id = ?
       ORDER BY s.subscription_id DESC LIMIT 1`,
      [vId]
    );

    const subscription = (subRes.rows && subRes.rows[0]) || null;
    const todayStr = this.getTodayIST();

    // Available unused coupons count for this vendor
    const couponsRes = await query(
      `SELECT COUNT(*) as count FROM coupons 
       WHERE (vendor_id = ? OR vendor_id IS NULL) 
         AND LOWER(status) = 'unused' 
         AND start_date <= ?::date 
         AND end_date >= ?::date`,
      [vId, todayStr, todayStr]
    );
    const availableCouponsCount = parseInt(couponsRes.rows[0]?.count || 0, 10);

    if (!subscription) {
      // Vendor has never subscribed
      return {
        vendor_id: vId,
        store_name: vendor.store_name,
        has_subscription: false,
        status: 'NONE',
        start_date: null,
        end_date: null,
        days_left: 0,
        is_expired: true,
        is_expiring_soon: false,
        shop_visible_on_portal: false,
        show_expiry_popup: true,
        popup_type: 'NO_SUBSCRIPTION',
        popup_title: 'Subscription Required',
        popup_message: 'Your store is currently not visible on the DigiLocal user portal. Subscribe to our Annual Merchant Plan (₹5,999/year) to make your shop visible and start receiving orders from local residents.',
        action_text: 'Subscribe for ₹5,999/yr',
        annual_price: 5999.00,
        available_coupons_count: availableCouponsCount
      };
    }

    const daysLeft = this.calculateDaysLeft(subscription.end_date);
    const isExpired = daysLeft < 0 || String(subscription.status).toUpperCase() === 'EXPIRED';
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;
    const shopVisible = !isExpired && String(vendor.status).toUpperCase() === 'ACTIVE' && String(subscription.status).toUpperCase() === 'ACTIVE';

    // Popup logic for Frontend (App and Web)
    let showExpiryPopup = false;
    let popupType = 'NONE';
    let popupTitle = '';
    let popupMessage = '';
    let actionText = 'Renew Subscription';

    if (isExpired) {
      showExpiryPopup = true;
      popupType = 'EXPIRED';
      popupTitle = '⚠️ Subscription Expired';
      popupMessage = `Your DigiLocal subscription for "${vendor.store_name}" has expired on ${subscription.end_date}. Your store is currently hidden from resident users on the portal. Please renew now to restore shop visibility and receive customer orders.`;
      actionText = 'Renew Now for ₹5,999/yr';
    } else if (daysLeft === 0) {
      showExpiryPopup = true;
      popupType = 'EXPIRING_TODAY';
      popupTitle = '🚨 Subscription Expires Today!';
      popupMessage = `Your DigiLocal subscription for "${vendor.store_name}" expires TODAY. Renew immediately to ensure zero disruption to your store visibility and orders.`;
      actionText = 'Renew Today';
    } else if (daysLeft <= 3) {
      showExpiryPopup = true;
      popupType = 'EXPIRING_CRITICAL';
      popupTitle = `🔔 Subscription Expiring in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`;
      popupMessage = `Your DigiLocal subscription for "${vendor.store_name}" will expire on ${subscription.end_date} (in ${daysLeft} day${daysLeft === 1 ? '' : 's'}). Renew now to keep receiving resident orders.`;
      actionText = 'Renew Now';
    } else if (daysLeft <= 7) {
      // Warning banner only, non-blocking modal
      showExpiryPopup = false;
      popupType = 'EXPIRING_WARNING';
      popupTitle = `Subscription Expiring in ${daysLeft} Days`;
      popupMessage = `Your annual subscription will end on ${subscription.end_date}.`;
      actionText = 'Renew Early';
    }

    return {
      vendor_id: vId,
      store_name: vendor.store_name,
      has_subscription: true,
      subscription_id: subscription.subscription_id,
      plan_name: subscription.plan_name || 'Annual Merchant Plan',
      status: isExpired ? 'EXPIRED' : subscription.status,
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      days_left: Math.max(0, daysLeft),
      raw_days_left: daysLeft,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      shop_visible_on_portal: shopVisible,
      show_expiry_popup: showExpiryPopup,
      popup_type: popupType,
      popup_title: popupTitle,
      popup_message: popupMessage,
      action_text: actionText,
      annual_price: 5999.00,
      original_price: parseFloat(subscription.original_price || 5999.00),
      final_price: parseFloat(subscription.final_price || 5999.00),
      coupon_code: subscription.coupon_code,
      available_coupons_count: availableCouponsCount
    };
  }

  /**
   * 6. CREATE / GENERATE 8-DIGIT COUPON (Admin / Partner Support)
   */
  async createCoupon({ vendor_id, coupon_code, discount, type = 'flat', start_date, end_date, usage_limit = 1 }) {
    if (!discount || isNaN(discount)) {
      throw new Error('Valid discount number is required');
    }
    const cleanType = String(type || 'flat').toLowerCase();
    if (!['percentage', 'flat'].includes(cleanType)) {
      throw new Error('type must be either "percentage" or "flat"');
    }

    let code = coupon_code ? String(coupon_code).trim().toUpperCase() : null;
    if (!code) {
      code = await generateUniqueCouponCode('DIGI');
    }
    if (code.length !== 8) {
      throw new Error(`Coupon code must be exactly 8 characters (e.g. DIGI5999, SAVE2026). Received: ${code}`);
    }

    const todayStr = this.getTodayIST();
    const startDateStr = start_date || todayStr;
    let endDateStr = end_date;
    if (!endDateStr) {
      const eDate = new Date(startDateStr + 'T00:00:00+05:30');
      eDate.setDate(eDate.getDate() + 30); // 30 days valid by default
      endDateStr = eDate.toISOString().split('T')[0];
    }

    const res = await query(
      `INSERT INTO coupons (coupon_code, vendor_id, discount, type, start_date, end_date, usage_limit, status)
       VALUES (?, ?, ?, ?, ?::date, ?::date, ?, 'unused')
       RETURNING *`,
      [code, vendor_id || null, parseFloat(discount), cleanType, startDateStr, endDateStr, usage_limit || 1]
    );

    return res.rows[0];
  }

  /**
   * 7. CHECK AND SEND SUBSCRIPTION EXPIRY REMINDERS
   * Multi-stage reminder email schedule:
   * - 7 days before expiry ('7_DAYS')
   * - 3 days before expiry ('3_DAYS')
   * - 1 day before expiry ('1_DAY')
   * - On the day of expiry ('0_DAY')
   * - At expiration time ('EXPIRED') -> sets status = 'EXPIRED' and hides store
   */
  async checkAndSendReminders() {
    const todayStr = this.getTodayIST();

    // Fetch all active subscriptions with vendor email and store info
    const subRes = await query(`
      SELECT s.subscription_id, s.vendor_id, s.plan_name,
             TO_CHAR(s.start_date, 'YYYY-MM-DD') as start_date,
             TO_CHAR(s.end_date, 'YYYY-MM-DD') as end_date,
             s.status as sub_status, s.reminders_sent,
             v.vendor_name, v.store_name, v.email, v.phone_number, v.status as vendor_status
      FROM subscriptions s
      JOIN vendors v ON s.vendor_id = v.vendor_id
      WHERE UPPER(s.status) = 'ACTIVE'
        AND s.end_date IS NOT NULL
      ORDER BY s.end_date ASC
    `);

    const subscriptions = subRes.rows || [];
    const report = {
      total_checked: subscriptions.length,
      reminders_sent_7d: 0,
      reminders_sent_3d: 0,
      reminders_sent_1d: 0,
      reminders_sent_0d: 0,
      subscriptions_expired: 0,
      errors: []
    };

    for (const sub of subscriptions) {
      try {
        const daysLeft = this.calculateDaysLeft(sub.end_date);
        let sentStages = Array.isArray(sub.reminders_sent) ? sub.reminders_sent : (typeof sub.reminders_sent === 'string' ? JSON.parse(sub.reminders_sent || '[]') : []);

        const vendorData = {
          vendor_id: sub.vendor_id,
          vendor_name: sub.vendor_name,
          store_name: sub.store_name,
          email: sub.email,
          end_date: sub.end_date
        };

        // 1. 7-Days Before Expiry (Window: 4 to 7 days remaining, sends strictly once)
        if (daysLeft <= 7 && daysLeft > 3 && !sentStages.includes('7_DAYS')) {
          await sendSubscriptionExpiryEmail(vendorData, daysLeft);
          sentStages.push('7_DAYS');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_7d++;
        }
        // 2. 3-Days Before Expiry (Window: 2 to 3 days remaining, sends strictly once)
        else if (daysLeft <= 3 && daysLeft > 1 && !sentStages.includes('3_DAYS')) {
          await sendSubscriptionExpiryEmail(vendorData, daysLeft);
          sentStages.push('3_DAYS');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_3d++;
        }
        // 3. 1-Day Before Expiry (1 day remaining / tomorrow, sends strictly once)
        else if (daysLeft === 1 && !sentStages.includes('1_DAY')) {
          await sendSubscriptionExpiryEmail(vendorData, 1);
          sentStages.push('1_DAY');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_1d++;
        }
        // 4. On the Day of Expiry (0 days remaining / today, sends strictly once)
        else if (daysLeft === 0 && !sentStages.includes('0_DAY')) {
          await sendSubscriptionExpiryEmail(vendorData, 0);
          sentStages.push('0_DAY');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_0d++;
        }
        // 5. At Expiry / Expired (daysLeft < 0, sends strictly once, marks subscription EXPIRED)
        else if (daysLeft < 0 && !sentStages.includes('EXPIRED')) {
          // Transition subscription to EXPIRED
          sentStages.push('EXPIRED');
          await query(
            `UPDATE subscriptions SET status = 'EXPIRED', reminders_sent = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE subscription_id = $2`,
            [JSON.stringify(sentStages), sub.subscription_id]
          );

          // Notify vendor that store is now hidden
          await sendSubscriptionExpiryEmail(vendorData, -1);
          report.subscriptions_expired++;
        }
      } catch (err) {
        console.error(`[SubscriptionService] Reminder check failed for sub #${sub.subscription_id}:`, err.message);
        report.errors.push({ subscription_id: sub.subscription_id, error: err.message });
      }
    }

    if (report.subscriptions_expired > 0) {
      memoryCache.clear();
    }

    return report;
  }
}

module.exports = new SubscriptionService();

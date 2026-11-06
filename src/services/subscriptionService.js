const { query, withTransaction } = require('../models/db');
const { generateUniqueCouponCode } = require('../utils/couponGenerator');
const memoryCache = require('../utils/cache');
const { sendRenewalEmail, sendSubscriptionExpiryEmail } = require('../config/email');
const cashfreeService = require('./cashfreeService');

/**
 * Subscription Service
 * Configurable multi-plan subscription engine, precise unused-credit upgrade arithmetic (in integer paise),
 * server-side Cashfree PG verification, and independent admin approval management.
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
   * Dynamically queries all active plans from database.
   * Billing interval and pricing are completely configurable without hardcoded logic.
   * Checks DIWALI300 campaign eligibility to auto-display discount & original price.
   */
  async getPlans(vendorId = null) {
    const res = await query(
      `SELECT plan_id, plan_code, name, description, price, duration_days, billing_cycle,
              COALESCE(billing_interval, billing_cycle) as billing_interval, features, is_active, sort_order
       FROM plans 
       WHERE is_active = TRUE 
       ORDER BY sort_order ASC, price ASC, plan_id ASC`
    );

    let rows = (res.rows && res.rows.length > 0) ? res.rows : [{
      plan_id: 1,
      plan_code: 'MONTHLY_TEST_2',
      name: 'Monthly Merchant Plan',
      description: '1 Month InPinch Storefront Visibility & Resident Ordering',
      price: 1.00,
      duration_days: 30,
      billing_cycle: 'MONTHLY',
      billing_interval: 'MONTHLY',
      features: [
        'Storefront visible on InPinch user portal',
        'Customers can view and buy products from your store',
        'Vendor panel dashboard & catalog management',
        'Real-time resident order notifications',
        'Priority merchant support'
      ],
      is_active: true
    }];

    // Check DIWALIFEST campaign status (Active, under 30 redemptions, not yet redeemed by this vendor)
    let diwalifestEligible = false;
    const diwalifestRes = await query(
      `SELECT id, usage_limit, COALESCE(times_used, 0) as times_used, status 
       FROM coupons 
       WHERE UPPER(coupon_code) = 'DIWALIFEST' 
         AND LOWER(status) = 'unused' 
         AND COALESCE(times_used, 0) < usage_limit 
         AND start_date <= CURRENT_DATE 
         AND end_date >= CURRENT_DATE 
       LIMIT 1`
    ).catch(() => ({ rows: [] }));

    if (diwalifestRes.rows && diwalifestRes.rows.length > 0) {
      diwalifestEligible = true;
      if (vendorId) {
        const vId = Number(vendorId);
        const redeemed = await query(
          `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALIFEST' AND vendor_id = ? LIMIT 1`,
          [vId]
        ).catch(() => ({ rows: [] }));
        if (redeemed.rows && redeemed.rows.length > 0) {
          diwalifestEligible = false;
        }
      }
    }

    return rows.map(p => {
      const isMonthly = Number(p.duration_days) <= 31 && String(p.billing_cycle || '').toUpperCase() !== 'YEARLY';
      const originalMonthlyPrice = 499.00;
      const basePlanPrice = isMonthly ? originalMonthlyPrice : Number(p.price);

      const mapped = {
        ...p,
        plan_id: Number(p.plan_id),
        price: basePlanPrice,
        original_price: basePlanPrice,
        final_price: basePlanPrice,
        discount_amount: 0.00,
        duration_days: Number(p.duration_days),
        billing_interval: String(p.billing_interval || p.billing_cycle || 'MONTHLY').toUpperCase()
      };

      if (isMonthly && diwalifestEligible) {
        mapped.campaign = {
          promo_code: 'DIWALIFEST',
          coupon_code: 'DIWALIFEST',
          name: 'Diwali Festival Special Promotion',
          description: 'Special Monthly Subscription Promotion: Get 1 Month for ₹1 (Save ₹498)',
          discount_amount: 498.00,
          original_price: 499.00,
          final_price: 1.00,
          auto_applied: true,
          is_free: false,
          billing_duration: 'MONTHLY'
        };
        mapped.original_price = 499.00;
        mapped.discount_amount = 498.00;
        mapped.final_price = 1.00;
        mapped.price = 1.00;
        mapped.auto_applied_coupon = 'DIWALIFEST';
      } else if (isMonthly) {
        // Normal monthly pricing when DIWALIFEST is exhausted or vendor already redeemed
        mapped.original_price = 499.00;
        mapped.price = 499.00;
        mapped.final_price = 499.00;
        mapped.discount_amount = 0.00;
        mapped.campaign = null;
      }

      return mapped;
    });
  }

  /**
   * Helper to retrieve a single active plan by plan_id or plan_code.
   */
  async getPlan(planIdOrCode) {
    let row = null;
    if (!planIdOrCode) {
      // Default to first active plan in database
      const defaultRes = await query(`SELECT * FROM plans WHERE is_active = TRUE ORDER BY sort_order ASC, plan_id ASC LIMIT 1`);
      row = defaultRes.rows?.[0] || null;
    } else {
      const isNumeric = !isNaN(Number(planIdOrCode));
      const sql = isNumeric
        ? `SELECT * FROM plans WHERE plan_id = ? LIMIT 1`
        : `SELECT * FROM plans WHERE UPPER(plan_code) = UPPER(?) LIMIT 1`;
      const res = await query(sql, [isNumeric ? Number(planIdOrCode) : String(planIdOrCode)]);
      row = res.rows?.[0] || null;
    }

    if (row) {
      const isMonthly = Number(row.duration_days) <= 31 && String(row.billing_cycle || '').toUpperCase() !== 'YEARLY';
      if (isMonthly) {
        row.original_price = 499.00;
        row.display_price = 499.00;
      }
    }
    return row;
  }

  /**
   * 2. GET UNUSED ACTIVE COUPONS FOR A VENDOR
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
             usage_limit, COALESCE(times_used, 0) as times_used, status, created_at
      FROM coupons
      WHERE (vendor_id = ? OR vendor_id IS NULL)
        AND LOWER(status) = 'unused'
        AND COALESCE(times_used, 0) < usage_limit
        AND start_date <= ?::date
        AND end_date >= ?::date
      ORDER BY id DESC
    `;

    const res = await query(sql, [vId, today, today]);
    let list = res.rows || [];

    // Check if vendor has already redeemed DIWALIFEST
    const alreadyRedeemedDiwalifest = await query(
      `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALIFEST' AND vendor_id = ? LIMIT 1`,
      [vId]
    ).catch(() => ({ rows: [] }));

    if (alreadyRedeemedDiwalifest.rows && alreadyRedeemedDiwalifest.rows.length > 0) {
      list = list.filter(c => String(c.coupon_code).toUpperCase() !== 'DIWALIFEST');
    }

    // Check if vendor has already redeemed DIWALI300
    const alreadyRedeemedDiwali = await query(
      `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALI300' AND vendor_id = ? LIMIT 1`,
      [vId]
    ).catch(() => ({ rows: [] }));

    if (alreadyRedeemedDiwali.rows && alreadyRedeemedDiwali.rows.length > 0) {
      list = list.filter(c => String(c.coupon_code).toUpperCase() !== 'DIWALI300');
    }

    return list.map(c => {
      const codeUpper = String(c.coupon_code).toUpperCase();
      if (codeUpper === 'DIWALIFEST') {
        return {
          ...c,
          name: 'Diwali Festival Special Promotion',
          description: 'Special Monthly Subscription Promotion: Get 1 Month for ₹1 (Save ₹498)',
          auto_apply: true,
          is_free: false,
          original_price: 499.00,
          discount_amount: 498.00,
          final_price: 1.00,
          eligible_plan: 'Monthly'
        };
      }
      if (codeUpper === 'DIWALI300') {
        return {
          ...c,
          name: 'Diwali 100% Off Promotion',
          description: '1 month subscription completely FREE (Limited to 30 merchants)',
          auto_apply: true,
          is_free: true,
          eligible_plan: 'Monthly'
        };
      }
      return c;
    });
  }

  /**
   * 3. APPLY / VALIDATE COUPON
   */
  async applyCoupon({ vendorId, couponCode, planId }) {
    if (!couponCode) {
      throw new Error('coupon_code is required');
    }
    const cleanCode = String(couponCode).trim().toUpperCase();
    const vId = vendorId ? Number(vendorId) : null;
    const today = this.getTodayIST();

    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Active subscription plan not found');
    }
    const basePrice = Number(plan.price);

    const couponRes = await query(
      `SELECT * FROM coupons WHERE UPPER(coupon_code) = ? LIMIT 1`,
      [cleanCode]
    );

    if (!couponRes.rows || couponRes.rows.length === 0) {
      throw new Error(`Coupon "${cleanCode}" is invalid.`);
    }

    const coupon = couponRes.rows[0];

    const timesUsed = Number(coupon.times_used || 0);
    const usageLimit = Number(coupon.usage_limit || 1);

    if (String(coupon.status).toLowerCase() === 'used' || timesUsed >= usageLimit) {
      throw new Error(`Coupon "${cleanCode}" has reached its maximum usage limit.`);
    }

    if (coupon.vendor_id && vId && Number(coupon.vendor_id) !== vId) {
      throw new Error(`Coupon "${cleanCode}" is not valid for this vendor account.`);
    }

    // Specific business validations for DIWALIFEST Campaign
    if (cleanCode === 'DIWALIFEST') {
      const isMonthly = Number(plan.duration_days) <= 31 && String(plan.billing_cycle || '').toUpperCase() !== 'YEARLY';
      if (!isMonthly) {
        throw new Error('DIWALIFEST promotional campaign is only valid on the Monthly subscription plan.');
      }
      if (vId) {
        const redeemedCheck = await query(
          `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALIFEST' AND vendor_id = ? LIMIT 1`,
          [vId]
        ).catch(() => ({ rows: [] }));
        if (redeemedCheck.rows && redeemedCheck.rows.length > 0) {
          throw new Error('You have already redeemed the DIWALIFEST promotional campaign once.');
        }
      }
      const redCountRes = await query(
        `SELECT COUNT(*) as count FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALIFEST'`
      ).catch(() => ({ rows: [{ count: 0 }] }));
      const totalRedeemed = Number(redCountRes.rows?.[0]?.count || 0);
      if (timesUsed >= usageLimit || totalRedeemed >= usageLimit) {
        throw new Error('The DIWALIFEST promotional campaign has reached its maximum redemption limit of 30 merchants.');
      }
    }

    // Specific business validations for DIWALI300 Campaign
    if (cleanCode === 'DIWALI300') {
      const isMonthly = Number(plan.duration_days) <= 31 && String(plan.billing_cycle || '').toUpperCase() !== 'YEARLY';
      if (!isMonthly) {
        throw new Error('DIWALI300 promotional campaign is only valid on the Monthly subscription plan.');
      }
      if (vId) {
        const redeemedCheck = await query(
          `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALI300' AND vendor_id = ? LIMIT 1`,
          [vId]
        ).catch(() => ({ rows: [] }));
        if (redeemedCheck.rows && redeemedCheck.rows.length > 0) {
          throw new Error('You have already redeemed the DIWALI300 promotional campaign once.');
        }
      }
    }

    const couponStartDate = coupon.start_date instanceof Date ? coupon.start_date.toISOString().split('T')[0] : String(coupon.start_date).split('T')[0];
    const couponEndDate = coupon.end_date instanceof Date ? coupon.end_date.toISOString().split('T')[0] : String(coupon.end_date).split('T')[0];

    if (today < couponStartDate) {
      throw new Error(`Coupon "${cleanCode}" is not active yet (starts on ${couponStartDate}).`);
    }
    if (today > couponEndDate) {
      throw new Error(`Coupon "${cleanCode}" expired on ${couponEndDate}.`);
    }

    const isMonthlyPlan = Number(plan.duration_days) <= 31 && String(plan.billing_cycle || '').toUpperCase() !== 'YEARLY';
    const effectiveBasePrice = isMonthlyPlan ? 499.00 : basePrice;

    const rawDiscount = parseFloat(coupon.discount);
    let discountAmount = 0.00;

    if (cleanCode === 'DIWALIFEST') {
      discountAmount = 498.00;
    } else if (cleanCode === 'DIWALI300' || rawDiscount >= 100) {
      discountAmount = effectiveBasePrice;
    } else if (coupon.type === 'percentage') {
      discountAmount = (effectiveBasePrice * rawDiscount) / 100.0;
    } else {
      discountAmount = rawDiscount;
    }

    discountAmount = Math.min(discountAmount, effectiveBasePrice);
    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalPrice = Math.max(0, Math.round((effectiveBasePrice - discountAmount) * 100) / 100);
    const isFree = finalPrice === 0 || cleanCode === 'DIWALI300';

    let messageText = `Coupon "${cleanCode}" applied successfully! You saved ₹${discountAmount.toFixed(2)}.`;
    if (cleanCode === 'DIWALIFEST') {
      messageText = 'Special Monthly Subscription Promotion: Get 1 Month for ₹1 (Save ₹498).';
    } else if (isFree) {
      messageText = `Diwali promotional offer "${cleanCode}" applied! 1-month subscription is 100% FREE.`;
    }

    return {
      valid: true,
      coupon_id: coupon.id,
      coupon_code: coupon.coupon_code,
      discount_type: coupon.type,
      discount_value: cleanCode === 'DIWALIFEST' ? 498.00 : rawDiscount,
      original_price: effectiveBasePrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      is_free: isFree,
      auto_applied: cleanCode === 'DIWALIFEST' || cleanCode === 'DIWALI300',
      plan_id: plan.plan_id,
      plan_name: plan.name,
      duration_days: plan.duration_days || 30,
      billing_interval: plan.billing_interval || plan.billing_cycle || 'MONTHLY',
      start_date: couponStartDate,
      end_date: couponEndDate,
      usage_limit: usageLimit,
      times_used: timesUsed,
      remaining_uses: Math.max(0, usageLimit - timesUsed),
      message: messageText
    };
  }

  /**
   * 4. CREATE SUBSCRIPTION REAL PAYMENT SESSION (Cashfree PG)
   * Resolves plan price dynamically from database.
   */
  async createSubscriptionPaymentSession({ vendorId, planId, couponCode, returnUrl, notifyUrl, options = {} }) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }

    const vendorRes = await query(`SELECT vendor_id, vendor_name, store_name, email, phone_number, vendor_type, status FROM vendors WHERE vendor_id = ?`, [vId]);
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor #${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];
    const isService = String(vendor.vendor_type || '').toLowerCase() === 'service';

    // Fetch plan details dynamically
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Subscription plan not found or currently inactive');
    }

    const isMonthly = Number(plan.duration_days) <= 31 && String(plan.billing_cycle || '').toUpperCase() !== 'YEARLY';
    let basePrice = isMonthly ? 499.00 : Number(plan.price);
    let discountAmount = 0.00;
    let appliedCoupon = null;

    // Auto-apply DIWALIFEST if no coupon code provided, plan is monthly, and merchant is eligible
    let effectiveCouponCode = couponCode ? String(couponCode).trim().toUpperCase() : null;
    if (!effectiveCouponCode && isMonthly) {
      const promoRes = await query(
        `SELECT id, usage_limit, COALESCE(times_used, 0) as times_used, status 
         FROM coupons 
         WHERE UPPER(coupon_code) = 'DIWALIFEST' 
           AND LOWER(status) = 'unused' 
           AND COALESCE(times_used, 0) < usage_limit 
           AND start_date <= CURRENT_DATE 
           AND end_date >= CURRENT_DATE 
         LIMIT 1`
      ).catch(() => ({ rows: [] }));

      if (promoRes.rows && promoRes.rows.length > 0) {
        const redeemed = await query(
          `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALIFEST' AND vendor_id = ? LIMIT 1`,
          [vId]
        ).catch(() => ({ rows: [] }));

        if (!redeemed.rows || redeemed.rows.length === 0) {
          effectiveCouponCode = 'DIWALIFEST';
        }
      }
    }

    if (effectiveCouponCode) {
      const couponCheck = await this.applyCoupon({ vendorId: vId, couponCode: effectiveCouponCode, planId: plan.plan_id });
      discountAmount = couponCheck.discount_amount;
      appliedCoupon = couponCheck;
      basePrice = couponCheck.original_price;
    }

    const finalPrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

    // If 100% discount / free promo, bypass external PG and activate immediately
    if (finalPrice === 0 || appliedCoupon?.is_free) {
      return await this.activateZeroPaymentSubscription({
        vendorId: vId,
        plan,
        coupon: appliedCoupon,
        notes: `100% Free 1-Month Subscription for ${vendor.store_name} [${plan.name}] (Coupon: ${appliedCoupon?.coupon_code || 'DIWALI300'})`
      });
    }

    // Call Cashfree PG to create checkout session
    const session = await cashfreeService.createSubscriptionPaymentSession({
      vendor_id: vId,
      store_name: vendor.store_name,
      vendor_name: vendor.vendor_name,
      amount: finalPrice,
      plan_id: plan.plan_id,
      coupon_code: appliedCoupon ? appliedCoupon.coupon_code : null,
      email: vendor.email,
      phone_number: vendor.phone_number,
      return_url: returnUrl,
      notify_url: notifyUrl
    }, options);

    if (!session || !session.success || !session.payment_session_id) {
      throw new Error(session?.error || 'Failed to generate Cashfree payment session for subscription');
    }

    // Record PENDING payment audit log in payments table
    await query(
      `INSERT INTO payments (
         order_id, vendor_id, amount, currency, payment_status,
         payment_method, payment_gateway, cashfree_order_id,
         customer_name, customer_phone, customer_email, notes, created_at
       ) VALUES (?, ?, ?, 'INR', 'PENDING', 'CASHFREE', 'CASHFREE', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        session.order_id,
        vId,
        finalPrice,
        session.cf_order_id || session.order_id,
        vendor.vendor_name || vendor.store_name,
        vendor.phone_number,
        vendor.email,
        `Subscription Payment for ${vendor.store_name} [${plan.name}]${appliedCoupon ? ' (Coupon: ' + appliedCoupon.coupon_code + ')' : ''}`
      ]
    ).catch(err => console.warn('Could not pre-insert payment audit log:', err.message));

    return {
      success: true,
      mode: session.mode,
      payment_session_id: session.payment_session_id,
      order_id: session.order_id,
      cf_order_id: session.cf_order_id,
      order_amount: finalPrice,
      order_currency: 'INR',
      original_price: basePrice,
      discount_amount: discountAmount,
      final_price: finalPrice,
      coupon_applied: appliedCoupon ? appliedCoupon.coupon_code : null,
      campaign: appliedCoupon?.coupon_code === 'DIWALIFEST' ? {
        promo_code: 'DIWALIFEST',
        coupon_code: 'DIWALIFEST',
        name: 'Diwali Festival Special Promotion',
        description: 'Special Monthly Subscription Promotion: Get 1 Month for ₹1 (Save ₹498)',
        original_price: 499.00,
        discount_amount: 498.00,
        final_price: 1.00,
        auto_applied: true,
        is_free: false
      } : null,
      payment_url: session.payment_url,
      environment: session.mode === 'live' ? 'PRODUCTION' : 'SANDBOX',
      vendor_id: vId,
      store_name: vendor.store_name,
      plan_id: plan.plan_id,
      plan_name: plan.name,
      billing_interval: plan.billing_interval || plan.billing_cycle || 'MONTHLY',
      cashfree: session
    };
  }

  /**
   * 4.1 SECURE ZERO-PAYMENT SUBSCRIPTION ACTIVATION
   * Activated when a 100% discount promo campaign (e.g., DIWALI300) is applied.
   * Bypasses external PG, executes atomic DB-level limits, prevents duplicate merchant redemptions,
   * creates an ACTIVE 30-day subscription, and records an audit log.
   */
  async activateZeroPaymentSubscription({ vendorId, plan, coupon, notes }) {
    const vId = Number(vendorId);
    const cleanCode = String(coupon?.coupon_code || 'DIWALI300').toUpperCase();

    const vendorRes = await query(
      `SELECT vendor_id, vendor_name, store_name, email, phone_number, status FROM vendors WHERE vendor_id = ?`,
      [vId]
    );
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor #${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];

    const basePrice = Number(plan.price);
    const todayStr = this.getTodayIST();

    // Enforce single use per merchant
    const alreadyRedeemed = await query(
      `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = ? AND vendor_id = ? LIMIT 1`,
      [cleanCode, vId]
    ).catch(() => ({ rows: [] }));

    if (alreadyRedeemed.rows && alreadyRedeemed.rows.length > 0) {
      throw new Error(`You have already redeemed the ${cleanCode} promotional campaign once.`);
    }

    const existingActiveSubRes = await query(
      `SELECT subscription_id, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date, status 
       FROM subscriptions 
       WHERE vendor_id = ? AND UPPER(status) = 'ACTIVE' 
       ORDER BY subscription_id DESC LIMIT 1`,
      [vId]
    );

    let startDateStr = todayStr;
    const activeSub = existingActiveSubRes.rows && existingActiveSubRes.rows[0];
    if (activeSub && activeSub.end_date && activeSub.end_date >= todayStr) {
      startDateStr = activeSub.end_date;
    }

    const durationDays = Number(plan.duration_days || 30);
    const startDateObj = new Date(startDateStr + 'T00:00:00+05:30');
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + durationDays);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const billingInterval = String(plan.billing_interval || plan.billing_cycle || 'MONTHLY').toUpperCase();
    const uniqueOrderId = `${cleanCode}_${vId}_${Date.now()}`;
    const uniqueTxnId = `FREE_${cleanCode}_${Date.now()}`;

    return await withTransaction(async (txQuery) => {
      // 1. Atomically increment usage limit on coupons table. Fails if times_used >= usage_limit!
      const couponUpdate = await txQuery(
        `UPDATE coupons 
         SET times_used = times_used + 1,
             status = CASE WHEN times_used + 1 >= usage_limit THEN 'used' ELSE 'unused' END
         WHERE UPPER(coupon_code) = ? AND times_used < usage_limit
         RETURNING *`,
        [cleanCode]
      );

      if (!couponUpdate.rows || couponUpdate.rows.length === 0) {
        throw new Error(`The ${cleanCode} promotional campaign has reached its maximum redemption limit of 30 merchants.`);
      }

      // 2. Insert subscription record with status 'ACTIVE'
      const subRes = await txQuery(
        `INSERT INTO subscriptions (
           vendor_id, plan_id, plan_name, start_date, end_date, 
           original_price, discount_amount, final_price, coupon_code, 
           payment_method, transaction_id, cashfree_order_id, cashfree_payment_id,
           billing_interval, status, reminders_sent, created_at, updated_at
         ) VALUES (?, ?, ?, ?::date, ?::date, ?, ?, 0.00, ?, 'ZERO_PAYMENT_PROMO', ?, ?, ?, ?, 'ACTIVE', '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          vId,
          plan.plan_id,
          plan.name,
          startDateStr,
          endDateStr,
          basePrice,
          basePrice,
          cleanCode,
          uniqueTxnId,
          uniqueOrderId,
          uniqueTxnId,
          billingInterval
        ]
      );

      const newSubscription = subRes.rows[0];

      // 3. Insert into coupon_redemptions table (strictly unique per merchant)
      await txQuery(
        `INSERT INTO coupon_redemptions (coupon_code, vendor_id, subscription_id, discount_amount, redeemed_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [cleanCode, vId, newSubscription.subscription_id, basePrice]
      );

      // 4. Insert into payments ledger
      await txQuery(
        `INSERT INTO payments (
           order_id, vendor_id, amount, currency, payment_status,
           payment_method, payment_gateway, cashfree_order_id,
           customer_name, customer_phone, customer_email, notes, created_at
         ) VALUES (?, ?, 0.00, 'INR', 'SUCCESS', 'PROMO_CODE', 'INTERNAL', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          uniqueOrderId,
          vId,
          uniqueOrderId,
          vendor.vendor_name || vendor.store_name,
          vendor.phone_number,
          vendor.email,
          notes || `100% Free 1-Month Subscription via ${cleanCode} Campaign`
        ]
      );

      return {
        success: true,
        is_free: true,
        zero_payment: true,
        activated: true,
        message: `Congratulations! The ${cleanCode} promotional offer has been applied. Your 1-month subscription is now active for FREE!`,
        order_id: uniqueOrderId,
        original_price: basePrice,
        discount_amount: basePrice,
        final_price: 0.00,
        coupon_applied: cleanCode,
        subscription: {
          subscription_id: Number(newSubscription.subscription_id),
          vendor_id: vId,
          store_name: vendor.store_name,
          plan_id: plan.plan_id,
          plan_name: plan.name,
          start_date: startDateStr,
          end_date: endDateStr,
          duration_days: durationDays,
          billing_interval: billingInterval,
          status: 'ACTIVE',
          coupon_code: cleanCode,
          is_free: true
        }
      };
    });
  }

  /**
   * 5. VERIFY AND ACTIVATE SUBSCRIPTION REAL PAYMENT (Cashfree PG)
   * Enforces server-side payment verification, idempotency protection against duplicate calls,
   * activates subscription for plan.duration_days, but STRICTLY preserves merchant approval status.
   */
  async verifyAndActivatePayment({ orderId, vendorId, couponCode, planId, transactionId, options = {} }) {
    if (!orderId) {
      throw new Error('order_id is required for payment verification');
    }

    // Resolve vendorId
    let vId = vendorId ? Number(vendorId) : null;
    if (!vId && orderId.startsWith('SUB_')) {
      const parts = orderId.split('_');
      if (parts.length >= 3 && !isNaN(Number(parts[parts.length - 1]))) {
        vId = Number(parts[parts.length - 1]);
      }
    }

    if (!vId) {
      const pCheck = await query(`SELECT vendor_id FROM payments WHERE order_id = ? OR cashfree_order_id = ? LIMIT 1`, [orderId, orderId]);
      if (pCheck.rows.length > 0 && pCheck.rows[0].vendor_id) {
        vId = Number(pCheck.rows[0].vendor_id);
      }
    }

    if (!vId || isNaN(vId)) {
      throw new Error('Unable to resolve vendor_id for subscription payment verification');
    }

    // 1. Idempotency Check: Did this payment order ALREADY activate a subscription?
    const existingSubCheck = await query(
      `SELECT s.*, v.store_name, v.status as vendor_status 
       FROM subscriptions s 
       JOIN vendors v ON s.vendor_id = v.vendor_id 
       WHERE s.cashfree_order_id = ? OR s.transaction_id = ? OR s.transaction_id LIKE ? 
       ORDER BY s.subscription_id DESC LIMIT 1`,
      [orderId, orderId, `%${orderId}%`]
    );

    if (existingSubCheck.rows && existingSubCheck.rows.length > 0) {
      const existingSub = existingSubCheck.rows[0];
      return {
        success: true,
        verified: true,
        already_processed: true,
        message: `Subscription is already active until ${existingSub.end_date instanceof Date ? existingSub.end_date.toISOString().split('T')[0] : existingSub.end_date}.`,
        subscription_id: existingSub.subscription_id,
        vendor_id: vId,
        store_name: existingSub.store_name,
        plan_name: existingSub.plan_name,
        start_date: existingSub.start_date,
        end_date: existingSub.end_date,
        billing_interval: existingSub.billing_interval || 'MONTHLY',
        payment_method: existingSub.payment_method || 'CASHFREE',
        transaction_id: existingSub.transaction_id,
        status: existingSub.status,
        merchant_status: existingSub.vendor_status,
        shop_visible_on_portal: existingSub.vendor_status === 'ACTIVE' && existingSub.status === 'ACTIVE'
      };
    }

    // 2. Query Cashfree PG to verify real payment status server-side
    const verification = await cashfreeService.verifyPaymentStatus(orderId, transactionId, options);

    if (!verification.success || !verification.verified) {
      // Record failed payment in payments ledger
      await query(
        `UPDATE payments SET payment_status = 'FAILED', updated_at = CURRENT_TIMESTAMP WHERE order_id = ? OR cashfree_order_id = ?`,
        [orderId, orderId]
      ).catch(() => {});

      return {
        success: false,
        verified: false,
        payment_status: verification.payment_status || 'FAILED',
        order_id: orderId,
        error: verification.error || 'Payment has not been completed or was declined by Cashfree'
      };
    }

    const verifiedPaymentId = verification.cf_payment_id || transactionId || `CF_PAY_${Date.now()}`;
    const verifiedAmount = Number(verification.payment_amount || 0);

    // 3. Resolve vendor and plan
    const vendorRes = await query(`SELECT vendor_id, vendor_name, store_name, email, phone_number, status FROM vendors WHERE vendor_id = ?`, [vId]);
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor ${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];

    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Active plan not found');
    }

    // 4. Resolve coupon code
    let activeCouponCode = couponCode;
    if (!activeCouponCode) {
      const payMeta = await query(`SELECT notes FROM payments WHERE order_id = ? OR cashfree_order_id = ? LIMIT 1`, [orderId, orderId]);
      if (payMeta.rows?.[0]?.notes && payMeta.rows[0].notes.includes('Coupon: ')) {
        const match = payMeta.rows[0].notes.match(/Coupon:\s*([A-Za-z0-9]+)/);
        if (match && match[1]) activeCouponCode = match[1];
      }
    }

    // 5. Compute subscription dates based on plan.duration_days
    const todayStr = this.getTodayIST();

    const existingActiveSubRes = await query(
      `SELECT subscription_id, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date, status 
       FROM subscriptions 
       WHERE vendor_id = ? AND UPPER(status) = 'ACTIVE' 
       ORDER BY subscription_id DESC LIMIT 1`,
      [vId]
    );

    let startDateStr = todayStr;
    const activeSub = existingActiveSubRes.rows && existingActiveSubRes.rows[0];
    if (activeSub && activeSub.end_date && activeSub.end_date >= todayStr) {
      startDateStr = activeSub.end_date;
    }

    const durationDays = Number(plan.duration_days || 30);
    const startDateObj = new Date(startDateStr + 'T00:00:00+05:30');
    const endDateObj = new Date(startDateObj);
    endDateObj.setDate(endDateObj.getDate() + durationDays);
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const billingInterval = String(plan.billing_interval || plan.billing_cycle || 'MONTHLY').toUpperCase();

    return await withTransaction(async (txQuery) => {
      const cleanActiveCoupon = activeCouponCode ? String(activeCouponCode).trim().toUpperCase() : null;

      if (cleanActiveCoupon === 'DIWALIFEST') {
        // Enforce single use per merchant with row lock
        const redeemedCheck = await txQuery(
          `SELECT id FROM coupon_redemptions WHERE UPPER(coupon_code) = 'DIWALIFEST' AND vendor_id = ? FOR UPDATE`,
          [vId]
        );
        if (redeemedCheck.rows && redeemedCheck.rows.length > 0) {
          throw new Error('You have already redeemed the DIWALIFEST promotional campaign once.');
        }

        // Atomically check and increment times_used with race condition guard
        const couponUpdate = await txQuery(
          `UPDATE coupons 
           SET times_used = times_used + 1,
               status = CASE WHEN times_used + 1 >= usage_limit THEN 'used' ELSE 'unused' END
           WHERE UPPER(coupon_code) = 'DIWALIFEST' AND times_used < usage_limit
           RETURNING *`
        );

        if (!couponUpdate.rows || couponUpdate.rows.length === 0) {
          throw new Error('The DIWALIFEST promotional campaign has reached its maximum redemption limit of 30 merchants.');
        }
      } else if (cleanActiveCoupon) {
        await txQuery(
          `UPDATE coupons 
           SET times_used = COALESCE(times_used, 0) + 1,
               status = CASE WHEN COALESCE(times_used, 0) + 1 >= usage_limit THEN 'used' ELSE 'unused' END
           WHERE UPPER(coupon_code) = ? AND (vendor_id = ? OR vendor_id IS NULL)`,
          [cleanActiveCoupon, vId]
        ).catch(() => {});
      }

      const isMonthly = Number(plan.duration_days) <= 31 && String(plan.billing_cycle || '').toUpperCase() !== 'YEARLY';
      const originalPrice = isMonthly ? 499.00 : Number(plan.price);
      const discountAmount = cleanActiveCoupon === 'DIWALIFEST' ? 498.00 : Math.max(0, originalPrice - verifiedAmount);
      const finalPrice = verifiedAmount;

      const finalTxnIdentifier = `${verifiedPaymentId}_${orderId}`.slice(0, 100);

      // Insert subscription record
      const subRes = await txQuery(
        `INSERT INTO subscriptions (
           vendor_id, plan_id, plan_name, start_date, end_date, 
           original_price, discount_amount, final_price, coupon_code, 
           payment_method, transaction_id, cashfree_order_id, cashfree_payment_id,
           billing_interval, status, reminders_sent, created_at, updated_at
         ) VALUES (?, ?, ?, ?::date, ?::date, ?, ?, ?, ?, 'CASHFREE', ?, ?, ?, ?, 'ACTIVE', '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          vId,
          plan.plan_id,
          plan.name,
          startDateStr,
          endDateStr,
          originalPrice,
          discountAmount,
          finalPrice,
          cleanActiveCoupon || null,
          finalTxnIdentifier,
          orderId,
          verifiedPaymentId,
          billingInterval
        ]
      );

      const newSub = subRes.rows[0];

      if (cleanActiveCoupon === 'DIWALIFEST') {
        await txQuery(
          `INSERT INTO coupon_redemptions (coupon_code, vendor_id, subscription_id, discount_amount, redeemed_at)
           VALUES ('DIWALIFEST', ?, ?, 498.00, CURRENT_TIMESTAMP)`,
          [vId, newSub.subscription_id]
        );
      }

      // CRITICAL SAFEGUARD: Keep merchant admin approval status separate from payment activation!
      // Do NOT mutate vendors.status here. If vendor.status is PENDING, it remains PENDING awaiting admin approval.

      // Update payments ledger
      await txQuery(
        `UPDATE payments 
         SET payment_status = 'SUCCESS',
             payment_method = 'CASHFREE',
             payment_gateway = 'CASHFREE',
             cashfree_payment_id = ?,
             amount = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ? OR cashfree_order_id = ?`,
        [verifiedPaymentId, verifiedAmount, orderId, orderId]
      );

      try {
        if (vendor.email && !vendor.email.includes('@vendor.inpinch') && !vendor.email.includes('@vendor.digilocal')) {
          sendRenewalEmail(vendor.email, vendor.vendor_name, vendor.store_name, endDateStr, verifiedAmount, verifiedPaymentId);
        }
      } catch (mailErr) {
        console.warn('[SubscriptionService] Confirmation email warning:', mailErr.message);
      }

      memoryCache.clear();

      return {
        success: true,
        verified: true,
        message: `Subscription successfully activated until ${endDateStr}!`,
        subscription_id: newSub.subscription_id,
        vendor_id: vId,
        store_name: vendor.store_name,
        plan_name: plan.name,
        start_date: startDateStr,
        end_date: endDateStr,
        billing_interval: billingInterval,
        original_price: originalPrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
        coupon_applied: cleanActiveCoupon || null,
        payment_method: 'CASHFREE',
        transaction_id: verifiedPaymentId,
        cashfree_order_id: orderId,
        status: 'ACTIVE',
        merchant_status: vendor.status,
        shop_visible_on_portal: vendor.status === 'ACTIVE'
      };
    });
  }

  /**
   * 6. GENERIC UPGRADE QUOTE CALCULATION
   * Computes precise unused credit in integer paise based on remaining billing time.
   * Enforces that upgrade is only allowed to a higher-priced plan.
   */
  async calculateUpgradeQuote({ vendorId, toPlanId }) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }
    const targetPlanId = Number(toPlanId);
    if (!targetPlanId || isNaN(targetPlanId)) {
      throw new Error('Valid to_plan_id is required');
    }

    const toPlan = await this.getPlan(targetPlanId);
    if (!toPlan) {
      throw new Error(`Target plan #${targetPlanId} not found.`);
    }
    if (!toPlan.is_active) {
      throw new Error(`Target plan "${toPlan.name}" is currently inactive.`);
    }

    // Fetch latest active subscription
    const subRes = await query(
      `SELECT s.*, p.price as plan_table_price, p.duration_days as plan_duration, p.billing_cycle, p.billing_interval
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.plan_id
       WHERE s.vendor_id = ? AND UPPER(s.status) = 'ACTIVE'
       ORDER BY s.end_date DESC, s.subscription_id DESC LIMIT 1`,
      [vId]
    );

    if (!subRes.rows || subRes.rows.length === 0) {
      throw new Error('No active subscription found to upgrade. Please purchase a subscription first.');
    }

    const currentSub = subRes.rows[0];
    const daysLeft = this.calculateDaysLeft(currentSub.end_date);

    if (daysLeft < 0) {
      throw new Error('Current subscription has expired. Upgrades are only permitted on active subscriptions.');
    }

    const currentPriceRupees = Number(currentSub.original_price || currentSub.plan_table_price || currentSub.final_price || 0);
    const newPriceRupees = Number(toPlan.price || 0);

    const currentPricePaise = Math.round(currentPriceRupees * 100);
    const newPricePaise = Math.round(newPriceRupees * 100);

    // Rule: Reject downgrades and same-price plan selections
    if (newPricePaise <= currentPricePaise) {
      throw new Error(`Upgrades are only permitted to a higher-priced plan. Current plan: ₹${currentPriceRupees.toFixed(2)}, Target plan: ₹${newPriceRupees.toFixed(2)}.`);
    }

    // Time calculations
    const startTs = new Date(currentSub.start_date).getTime();
    const endTs = new Date(currentSub.end_date).getTime();
    const nowTs = Date.now();

    const totalDurationSec = Math.max(1, Math.round((endTs - startTs) / 1000));
    const remainingSec = Math.max(0, Math.min(totalDurationSec, Math.round((endTs - nowTs) / 1000)));

    // Base unused credit on verified amount paid
    const paidAmountRupees = Number(currentSub.final_price !== undefined && currentSub.final_price !== null ? currentSub.final_price : currentPriceRupees);
    const paidPaise = Math.round(paidAmountRupees * 100);

    let unusedCreditPaise = 0;
    if (nowTs <= startTs) {
      unusedCreditPaise = paidPaise; // 100% unused
    } else if (remainingSec <= 0) {
      unusedCreditPaise = 0;
    } else {
      // Documented Rounding Rule: Math.floor on integer paise so credit never exceeds mathematical entitlement
      unusedCreditPaise = Math.floor((paidPaise * remainingSec) / totalDurationSec);
    }

    const eligibleCreditPaise = Math.min(unusedCreditPaise, newPricePaise);
    const payablePaise = Math.max(0, newPricePaise - eligibleCreditPaise);

    const unusedCreditRupees = Number((unusedCreditPaise / 100).toFixed(2));
    const eligibleCreditRupees = Number((eligibleCreditPaise / 100).toFixed(2));
    const payableRupees = Number((payablePaise / 100).toFixed(2));

    return {
      vendor_id: vId,
      current_subscription_id: Number(currentSub.subscription_id),
      from_plan: {
        plan_id: currentSub.plan_id ? Number(currentSub.plan_id) : null,
        plan_name: currentSub.plan_name,
        price: currentPriceRupees,
        amount_paid: paidAmountRupees,
        start_date: currentSub.start_date instanceof Date ? currentSub.start_date.toISOString().split('T')[0] : String(currentSub.start_date).split('T')[0],
        end_date: currentSub.end_date instanceof Date ? currentSub.end_date.toISOString().split('T')[0] : String(currentSub.end_date).split('T')[0],
        days_left: daysLeft,
        billing_interval: currentSub.billing_interval || 'MONTHLY'
      },
      to_plan: {
        plan_id: Number(toPlan.plan_id),
        plan_code: toPlan.plan_code,
        name: toPlan.name,
        price: newPriceRupees,
        duration_days: Number(toPlan.duration_days),
        billing_cycle: toPlan.billing_cycle,
        billing_interval: toPlan.billing_interval || toPlan.billing_cycle || 'MONTHLY'
      },
      calculation: {
        total_duration_seconds: totalDurationSec,
        remaining_seconds: remainingSec,
        unused_ratio: Number((remainingSec / totalDurationSec).toFixed(4)),
        unused_credit_amount: unusedCreditRupees,
        eligible_unused_credit: eligibleCreditRupees,
        payable_amount: payableRupees,
        payable_paise: payablePaise,
        currency: 'INR'
      }
    };
  }

  /**
   * 7. REQUEST PLAN UPGRADE
   * If payable_amount > 0: Creates Cashfree payment session for exact payable amount.
   * If payable_amount == 0: Activates immediately in transaction.
   * Uses row-level lock and idempotency key to prevent concurrent upgrade requests.
   */
  async requestUpgrade({ vendorId, toPlanId, idempotencyKey, returnUrl, notifyUrl, options = {} }) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }

    const cleanKey = String(idempotencyKey || `UPG_IDEM_${vId}_${toPlanId}_${Date.now()}`).trim();

    // Idempotency check
    const existingUpgrade = await query(
      `SELECT * FROM subscription_upgrades WHERE idempotency_key = ?`,
      [cleanKey]
    );
    if (existingUpgrade.rows && existingUpgrade.rows.length > 0) {
      const upg = existingUpgrade.rows[0];
      return {
        success: true,
        already_exists: true,
        status: upg.status,
        upgrade_id: upg.upgrade_id,
        payable_amount: Number(upg.payable_amount),
        cashfree_order_id: upg.cashfree_order_id
      };
    }

    const quote = await this.calculateUpgradeQuote({ vendorId: vId, toPlanId });
    const { calculation, from_plan, to_plan, current_subscription_id } = quote;
    const payableAmount = calculation.payable_amount;

    // Handle zero payable upgrade (100% covered by unused credit)
    if (payableAmount <= 0) {
      return await withTransaction(async (txQuery) => {
        const lockRes = await txQuery(
          `SELECT subscription_id, status FROM subscriptions WHERE subscription_id = ? FOR UPDATE`,
          [current_subscription_id]
        );
        if (!lockRes.rows || lockRes.rows.length === 0 || lockRes.rows[0].status !== 'ACTIVE') {
          throw new Error('Subscription state has changed. Upgrade aborted.');
        }

        const todayStr = this.getTodayIST();
        const durationDays = Number(to_plan.duration_days || 30);
        const startDateObj = new Date(todayStr + 'T00:00:00+05:30');
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + durationDays);
        const endDateStr = endDateObj.toISOString().split('T')[0];

        // Apply upgraded plan with fresh billing cycle starting now
        await txQuery(
          `UPDATE subscriptions 
           SET plan_id = ?, plan_name = ?, start_date = ?::date, end_date = ?::date,
               original_price = ?, discount_amount = ?, final_price = 0.00,
               billing_interval = ?, updated_at = CURRENT_TIMESTAMP
           WHERE subscription_id = ?`,
          [
            to_plan.plan_id,
            to_plan.name,
            todayStr,
            endDateStr,
            to_plan.price,
            calculation.eligible_unused_credit,
            to_plan.billing_interval,
            current_subscription_id
          ]
        );

        // Record upgrade audit record
        const upgRes = await txQuery(
          `INSERT INTO subscription_upgrades (
             vendor_id, subscription_id, from_plan_id, to_plan_id,
             old_plan_price, new_plan_price, unused_credit_amount,
             payable_amount, status, idempotency_key, created_at, activated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, 0.00, 'SUCCESS', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           RETURNING *`,
          [
            vId,
            current_subscription_id,
            from_plan.plan_id,
            to_plan.plan_id,
            from_plan.price,
            to_plan.price,
            calculation.eligible_unused_credit,
            cleanKey
          ]
        );

        memoryCache.clear();

        return {
          success: true,
          status: 'SUCCESS',
          zero_payable: true,
          message: `Upgraded to "${to_plan.name}" successfully! Credit of ₹${calculation.eligible_unused_credit.toFixed(2)} applied.`,
          upgrade_id: upgRes.rows[0]?.upgrade_id,
          vendor_id: vId,
          new_plan: to_plan,
          start_date: todayStr,
          end_date: endDateStr,
          credit_applied: calculation.eligible_unused_credit,
          amount_charged: 0.00
        };
      });
    }

    // Payable amount > 0: Create Cashfree checkout session
    const cfOrderId = `SUB_UPG_${Date.now()}_${vId}`;
    const vendorRes = await query(`SELECT vendor_name, store_name, email, phone_number FROM vendors WHERE vendor_id = ?`, [vId]);
    const vendor = vendorRes.rows[0] || {};

    const session = await cashfreeService.createPaymentSession({
      order_id: cfOrderId,
      order_amount: payableAmount,
      order_currency: 'INR',
      order_note: `InPinch Subscription Upgrade to ${to_plan.name} (Credit: ₹${calculation.eligible_unused_credit})`,
      customer_details: {
        customer_id: String(vId),
        customer_name: vendor.vendor_name || vendor.store_name || 'Merchant Owner',
        customer_email: vendor.email || 'vendor@inpinch.com',
        customer_phone: vendor.phone_number || '9876543210'
      },
      order_meta: {
        return_url: returnUrl || `${(process.env.PUBLIC_API_URL || 'https://services.inpinch.com').replace('http://', 'https://')}/vendor/subscription/verify?order_id={order_id}`,
        notify_url: notifyUrl || `${(process.env.PUBLIC_API_URL || 'https://services.inpinch.com').replace('http://', 'https://')}/api/payments/cashfree/webhook`,
        payment_methods: 'cc,dc,upi,nb,app,paylater'
      },
      order_tags: {
        order_type: 'VENDOR_SUBSCRIPTION_UPGRADE',
        vendor_id: String(vId),
        subscription_id: String(current_subscription_id),
        from_plan_id: String(from_plan.plan_id),
        to_plan_id: String(to_plan.plan_id),
        idempotency_key: cleanKey,
        credit_amount: String(calculation.eligible_unused_credit),
        payable_amount: String(payableAmount)
      }
    }, options);

    if (!session || !session.success || !session.payment_session_id) {
      throw new Error(session?.error || 'Failed to create Cashfree payment session for upgrade');
    }

    // Record PENDING upgrade audit entry
    await query(
      `INSERT INTO subscription_upgrades (
         vendor_id, subscription_id, from_plan_id, to_plan_id,
         old_plan_price, new_plan_price, unused_credit_amount,
         payable_amount, cashfree_order_id, status, idempotency_key, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, CURRENT_TIMESTAMP)`,
      [
        vId,
        current_subscription_id,
        from_plan.plan_id,
        to_plan.plan_id,
        from_plan.price,
        to_plan.price,
        calculation.eligible_unused_credit,
        payableAmount,
        session.order_id,
        cleanKey
      ]
    );

    return {
      success: true,
      status: 'PENDING_PAYMENT',
      payment_session_id: session.payment_session_id,
      order_id: session.order_id,
      cf_order_id: session.cf_order_id,
      payable_amount: payableAmount,
      credit_applied: calculation.eligible_unused_credit,
      payment_url: session.payment_url,
      quote
    };
  }

  /**
   * 8. VERIFY AND ACTIVATE UPGRADE PAYMENT
   */
  async verifyAndActivateUpgrade({ orderId, transactionId, options = {} }) {
    if (!orderId) {
      throw new Error('order_id is required for upgrade verification');
    }

    const upgRes = await query(
      `SELECT u.*, p_to.name as to_plan_name, p_to.duration_days as to_duration, 
              COALESCE(p_to.billing_interval, p_to.billing_cycle) as to_interval
       FROM subscription_upgrades u
       LEFT JOIN plans p_to ON u.to_plan_id = p_to.plan_id
       WHERE u.cashfree_order_id = ?`,
      [orderId]
    );

    if (!upgRes.rows || upgRes.rows.length === 0) {
      throw new Error(`Upgrade record for order #${orderId} not found`);
    }

    const upgradeRecord = upgRes.rows[0];

    // Idempotency check
    if (upgradeRecord.status === 'SUCCESS') {
      return {
        success: true,
        verified: true,
        already_processed: true,
        message: 'Upgrade has already been activated.',
        upgrade_id: upgradeRecord.upgrade_id,
        vendor_id: upgradeRecord.vendor_id
      };
    }

    // Verify Cashfree PG status
    const verification = await cashfreeService.verifyPaymentStatus(orderId, transactionId, options);
    if (!verification.success || !verification.verified) {
      await query(
        `UPDATE subscription_upgrades SET status = 'FAILED' WHERE upgrade_id = ?`,
        [upgradeRecord.upgrade_id]
      ).catch(() => {});

      return {
        success: false,
        verified: false,
        payment_status: verification.payment_status || 'FAILED',
        error: verification.error || 'Upgrade payment verification failed'
      };
    }

    const verifiedPaymentId = verification.cf_payment_id || transactionId || `CF_PAY_${Date.now()}`;
    const verifiedAmount = Number(verification.payment_amount || upgradeRecord.payable_amount);

    return await withTransaction(async (txQuery) => {
      const subRes = await txQuery(
        `SELECT * FROM subscriptions WHERE subscription_id = ? FOR UPDATE`,
        [upgradeRecord.subscription_id]
      );
      if (!subRes.rows || subRes.rows.length === 0) {
        throw new Error('Subscription not found during activation');
      }

      const todayStr = this.getTodayIST();
      const durationDays = Number(upgradeRecord.to_duration || 30);
      const startDateObj = new Date(todayStr + 'T00:00:00+05:30');
      const endDateObj = new Date(startDateObj);
      endDateObj.setDate(endDateObj.getDate() + durationDays);
      const endDateStr = endDateObj.toISOString().split('T')[0];

      // Update active subscription with new plan
      await txQuery(
        `UPDATE subscriptions
         SET plan_id = ?, plan_name = ?, start_date = ?::date, end_date = ?::date,
             original_price = ?, discount_amount = ?, final_price = ?,
             billing_interval = ?, cashfree_order_id = ?, cashfree_payment_id = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE subscription_id = ?`,
        [
          upgradeRecord.to_plan_id,
          upgradeRecord.to_plan_name,
          todayStr,
          endDateStr,
          upgradeRecord.new_plan_price,
          upgradeRecord.unused_credit_amount,
          verifiedAmount,
          upgradeRecord.to_interval || 'MONTHLY',
          orderId,
          verifiedPaymentId,
          upgradeRecord.subscription_id
        ]
      );

      // Mark upgrade SUCCESS
      await txQuery(
        `UPDATE subscription_upgrades
         SET status = 'SUCCESS', cashfree_payment_id = ?, activated_at = CURRENT_TIMESTAMP
         WHERE upgrade_id = ?`,
        [verifiedPaymentId, upgradeRecord.upgrade_id]
      );

      // Record payment in payments ledger
      await txQuery(
        `INSERT INTO payments (
           order_id, vendor_id, amount, currency, payment_status,
           payment_method, payment_gateway, cashfree_order_id, cashfree_payment_id,
           notes, created_at
         ) VALUES (?, ?, ?, 'INR', 'SUCCESS', 'CASHFREE', 'CASHFREE', ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          orderId,
          upgradeRecord.vendor_id,
          verifiedAmount,
          orderId,
          verifiedPaymentId,
          `Subscription Upgrade to ${upgradeRecord.to_plan_name} (Credit: ₹${upgradeRecord.unused_credit_amount})`
        ]
      ).catch(() => {});

      memoryCache.clear();

      return {
        success: true,
        verified: true,
        message: `Subscription successfully upgraded to "${upgradeRecord.to_plan_name}"!`,
        upgrade_id: upgradeRecord.upgrade_id,
        vendor_id: upgradeRecord.vendor_id,
        new_plan_id: upgradeRecord.to_plan_id,
        plan_name: upgradeRecord.to_plan_name,
        start_date: todayStr,
        end_date: endDateStr,
        credit_applied: Number(upgradeRecord.unused_credit_amount),
        amount_paid: verifiedAmount,
        transaction_id: verifiedPaymentId,
        status: 'ACTIVE'
      };
    });
  }

  /**
   * 9. VENDOR PANEL SUBSCRIPTION STATUS
   * Provides current subscription, lifecycle status, billing interval, and renewal/expiry details.
   */
  async getVendorSubscriptionStatus(vendorId) {
    const vId = Number(vendorId);
    if (!vId || isNaN(vId)) {
      throw new Error('Valid vendor_id is required');
    }

    const vendorRes = await query(
      `SELECT vendor_id, vendor_name, store_name, email, phone_number, status, vendor_type FROM vendors WHERE vendor_id = ?`,
      [vId]
    );
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor ${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];
    const isService = String(vendor.vendor_type || '').toLowerCase() === 'service';

    const subRes = await query(
      `SELECT s.subscription_id, s.plan_id, s.plan_name, 
              TO_CHAR(s.start_date, 'YYYY-MM-DD') as start_date, 
              TO_CHAR(s.end_date, 'YYYY-MM-DD') as end_date, 
              s.original_price, s.discount_amount, s.final_price, 
              s.coupon_code, s.payment_method, s.transaction_id,
              s.cashfree_order_id, s.cashfree_payment_id,
              COALESCE(s.billing_interval, p.billing_interval, 'MONTHLY') as billing_interval,
              s.status, s.reminders_sent, s.created_at,
              p.duration_days, p.price as plan_price
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan_id = p.plan_id
       WHERE s.vendor_id = ?
       ORDER BY CASE WHEN UPPER(s.status) = 'ACTIVE' THEN 1 ELSE 2 END, s.end_date DESC, s.subscription_id DESC LIMIT 1`,
      [vId]
    );

    const subscription = (subRes.rows && subRes.rows[0]) || null;
    const todayStr = this.getTodayIST();

    if (!subscription) {
      return {
        vendor_id: vId,
        store_name: vendor.store_name,
        has_subscription: false,
        has_active_subscription: false,
        is_order_eligible: false,
        can_receive_orders: false,
        is_enquiry_eligible: false,
        can_receive_enquiries: false,
        status: 'NONE',
        start_date: null,
        end_date: null,
        billing_interval: 'MONTHLY',
        days_left: 0,
        is_expired: true,
        is_expiring_soon: false,
        merchant_status: vendor.status,
        shop_visible_on_portal: true,
        show_expiry_popup: true,
        popup_type: 'NO_SUBSCRIPTION',
        popup_title: `Subscription Required to ${isService ? 'Accept Enquiries' : 'Accept Orders'}`,
        popup_message: `Subscribe to InPinch merchant plan for ₹1/month to start receiving ${isService ? 'service enquiries' : 'orders'} from local customers.`,
        action_text: 'Subscribe for ₹1/mo'
      };
    }

    const subStatus = String(subscription.status || 'NONE').toUpperCase();
    const daysLeft = this.calculateDaysLeft(subscription.end_date);
    const isExpired = daysLeft < 0 || subStatus === 'EXPIRED';
    const isSubActive = subStatus === 'ACTIVE' && !isExpired;
    const isExpiringSoon = isSubActive && daysLeft >= 0 && daysLeft <= 7;
    const canReceiveOrders = isSubActive && String(vendor.status).toUpperCase() === 'ACTIVE';

    let showExpiryPopup = false;
    let popupType = 'NONE';
    let popupTitle = '';
    let popupMessage = '';
    let actionText = 'Renew Subscription';

    if (isExpired) {
      showExpiryPopup = true;
      popupType = 'EXPIRED';
      popupTitle = 'Subscription Expired';
      popupMessage = `Your InPinch subscription for "${vendor.store_name}" has expired on ${subscription.end_date}. Renew for ₹1/month to keep receiving orders from customers.`;
      actionText = 'Renew for ₹1/mo';
    } else if (subStatus === 'PENDING' || !isSubActive) {
      showExpiryPopup = true;
      popupType = 'NO_SUBSCRIPTION';
      popupTitle = `Subscription Required to ${isService ? 'Accept Enquiries' : 'Accept Orders'}`;
      popupMessage = `Complete your InPinch subscription for ₹1/month to start receiving ${isService ? 'customer enquiries' : 'customer orders'}.`;
      actionText = 'Subscribe for ₹1/mo';
    } else if (daysLeft === 0) {
      showExpiryPopup = true;
      popupType = 'EXPIRING_TODAY';
      popupTitle = 'Subscription Expires Today!';
      popupMessage = `Your InPinch subscription for "${vendor.store_name}" expires TODAY. Renew immediately for ₹1 to ensure uninterrupted ordering.`;
      actionText = 'Renew Today';
    } else if (daysLeft <= 3) {
      showExpiryPopup = true;
      popupType = 'EXPIRING_CRITICAL';
      popupTitle = `Subscription Expiring in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`;
      popupMessage = `Your InPinch subscription for "${vendor.store_name}" will expire on ${subscription.end_date}. Renew for ₹1/month to keep receiving customer orders.`;
      actionText = 'Renew for ₹1/mo';
    }

    return {
      vendor_id: vId,
      store_name: vendor.store_name,
      has_subscription: isSubActive,
      has_active_subscription: isSubActive,
      is_order_eligible: canReceiveOrders,
      can_receive_orders: canReceiveOrders,
      is_enquiry_eligible: canReceiveOrders,
      can_receive_enquiries: canReceiveOrders,
      subscription_id: Number(subscription.subscription_id),
      plan_id: subscription.plan_id ? Number(subscription.plan_id) : null,
      plan_name: subscription.plan_name || 'Monthly Merchant Plan',
      billing_interval: String(subscription.billing_interval || 'MONTHLY').toUpperCase(),
      status: isExpired ? 'EXPIRED' : (isSubActive ? 'ACTIVE' : subscription.status),
      start_date: subscription.start_date,
      end_date: subscription.end_date,
      days_left: Math.max(0, daysLeft),
      raw_days_left: daysLeft,
      is_expired: isExpired,
      is_expiring_soon: isExpiringSoon,
      amount_paid: Number(subscription.final_price || 0),
      original_price: Number(subscription.original_price || 0),
      payment_method: subscription.payment_method || 'CASHFREE',
      payment_reference: subscription.cashfree_payment_id || subscription.transaction_id || null,
      cashfree_order_id: subscription.cashfree_order_id,
      merchant_status: vendor.status,
      shop_visible_on_portal: true,
      show_expiry_popup: showExpiryPopup,
      popup_type: popupType,
      popup_title: popupTitle,
      popup_message: popupMessage,
      action_text: actionText
    };
  }

  /**
   * 10. EXPIRY REMINDER DISPATCHER
   */
  async checkAndSendReminders() {
    const todayStr = this.getTodayIST();

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

        if (daysLeft <= 7 && daysLeft > 3 && !sentStages.includes('7_DAYS')) {
          await sendSubscriptionExpiryEmail(vendorData, daysLeft);
          sentStages.push('7_DAYS');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_7d++;
        } else if (daysLeft <= 3 && daysLeft > 1 && !sentStages.includes('3_DAYS')) {
          await sendSubscriptionExpiryEmail(vendorData, daysLeft);
          sentStages.push('3_DAYS');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_3d++;
        } else if (daysLeft === 1 && !sentStages.includes('1_DAY')) {
          await sendSubscriptionExpiryEmail(vendorData, 1);
          sentStages.push('1_DAY');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_1d++;
        } else if (daysLeft === 0 && !sentStages.includes('0_DAY')) {
          await sendSubscriptionExpiryEmail(vendorData, 0);
          sentStages.push('0_DAY');
          await query(`UPDATE subscriptions SET reminders_sent = $1::jsonb WHERE subscription_id = $2`, [JSON.stringify(sentStages), sub.subscription_id]);
          report.reminders_sent_0d++;
        } else if (daysLeft < 0 && !sentStages.includes('EXPIRED')) {
          sentStages.push('EXPIRED');
          await query(
            `UPDATE subscriptions SET status = 'EXPIRED', reminders_sent = $1::jsonb, updated_at = CURRENT_TIMESTAMP WHERE subscription_id = $2`,
            [JSON.stringify(sentStages), sub.subscription_id]
          );
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

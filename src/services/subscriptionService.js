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
   */
  async getPlans() {
    const res = await query(
      `SELECT plan_id, plan_code, name, description, price, duration_days, billing_cycle,
              COALESCE(billing_interval, billing_cycle) as billing_interval, features, is_active, sort_order
       FROM plans 
       WHERE is_active = TRUE 
       ORDER BY sort_order ASC, price ASC, plan_id ASC`
    );

    if (res.rows && res.rows.length > 0) {
      return res.rows.map(p => ({
        ...p,
        plan_id: Number(p.plan_id),
        price: Number(p.price),
        duration_days: Number(p.duration_days),
        billing_interval: String(p.billing_interval || p.billing_cycle || 'MONTHLY').toUpperCase()
      }));
    }

    // Configurable fallback: Single testing plan (₹2/month)
    return [{
      plan_id: 1,
      plan_code: 'MONTHLY_TEST_2',
      name: 'Monthly Merchant Plan (Testing)',
      description: '1 Month DigiLocal Storefront Visibility & Resident Ordering (Testing Plan)',
      price: 2.00,
      duration_days: 30,
      billing_cycle: 'MONTHLY',
      billing_interval: 'MONTHLY',
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
   * Helper to retrieve a single active plan by plan_id or plan_code.
   */
  async getPlan(planIdOrCode) {
    if (!planIdOrCode) {
      // Default to first active plan in database
      const defaultRes = await query(`SELECT * FROM plans WHERE is_active = TRUE ORDER BY sort_order ASC, plan_id ASC LIMIT 1`);
      return defaultRes.rows?.[0] || null;
    }

    const isNumeric = !isNaN(Number(planIdOrCode));
    const sql = isNumeric
      ? `SELECT * FROM plans WHERE plan_id = ? LIMIT 1`
      : `SELECT * FROM plans WHERE UPPER(plan_code) = UPPER(?) LIMIT 1`;
    const res = await query(sql, [isNumeric ? Number(planIdOrCode) : String(planIdOrCode)]);
    return res.rows?.[0] || null;
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
    return res.rows || [];
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

    const couponStartDate = coupon.start_date instanceof Date ? coupon.start_date.toISOString().split('T')[0] : String(coupon.start_date).split('T')[0];
    const couponEndDate = coupon.end_date instanceof Date ? coupon.end_date.toISOString().split('T')[0] : String(coupon.end_date).split('T')[0];

    if (today < couponStartDate) {
      throw new Error(`Coupon "${cleanCode}" is not active yet (starts on ${couponStartDate}).`);
    }
    if (today > couponEndDate) {
      throw new Error(`Coupon "${cleanCode}" expired on ${couponEndDate}.`);
    }

    const rawDiscount = parseFloat(coupon.discount);
    let discountAmount = 0.00;

    if (coupon.type === 'percentage') {
      discountAmount = (basePrice * rawDiscount) / 100.0;
    } else {
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
      duration_days: plan.duration_days || 30,
      billing_interval: plan.billing_interval || plan.billing_cycle || 'MONTHLY',
      start_date: couponStartDate,
      end_date: couponEndDate,
      usage_limit: usageLimit,
      times_used: timesUsed,
      remaining_uses: Math.max(0, usageLimit - timesUsed),
      message: `Coupon "${cleanCode}" applied successfully! You saved ₹${discountAmount.toFixed(2)}.`
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

    const vendorRes = await query(`SELECT vendor_id, vendor_name, store_name, email, phone_number, status FROM vendors WHERE vendor_id = ?`, [vId]);
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor #${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];

    // Fetch plan details dynamically
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Subscription plan not found or currently inactive');
    }

    const basePrice = Number(plan.price);
    let discountAmount = 0.00;
    let appliedCoupon = null;

    if (couponCode) {
      const couponCheck = await this.applyCoupon({ vendorId: vId, couponCode, planId: plan.plan_id });
      discountAmount = couponCheck.discount_amount;
      appliedCoupon = couponCheck;
    }

    const finalPrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

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
      // Consume coupon if applicable
      if (activeCouponCode) {
        await txQuery(
          `UPDATE coupons 
           SET times_used = COALESCE(times_used, 0) + 1,
               status = CASE WHEN COALESCE(times_used, 0) + 1 >= usage_limit THEN 'used' ELSE 'unused' END
           WHERE UPPER(coupon_code) = ? AND (vendor_id = ? OR vendor_id IS NULL)`,
          [activeCouponCode.toUpperCase(), vId]
        ).catch(() => {});
      }

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
          Number(plan.price),
          Math.max(0, Number(plan.price) - verifiedAmount),
          verifiedAmount,
          activeCouponCode || null,
          finalTxnIdentifier,
          orderId,
          verifiedPaymentId,
          billingInterval
        ]
      );

      const newSub = subRes.rows[0];

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
        if (vendor.email && !vendor.email.includes('@vendor.digilocal')) {
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
        final_price: verifiedAmount,
        coupon_applied: activeCouponCode || null,
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
      order_note: `DigiLocal Subscription Upgrade to ${to_plan.name} (Credit: ₹${calculation.eligible_unused_credit})`,
      customer_details: {
        customer_id: String(vId),
        customer_name: vendor.vendor_name || vendor.store_name || 'Merchant Owner',
        customer_email: vendor.email || 'vendor@digilocal.in',
        customer_phone: vendor.phone_number || '9876543210'
      },
      order_meta: {
        return_url: returnUrl || `${(process.env.PUBLIC_API_URL || 'https://digi-local-backend.onrender.com').replace('http://', 'https://')}/vendor/subscription/verify?order_id={order_id}`,
        notify_url: notifyUrl || `${(process.env.PUBLIC_API_URL || 'https://digi-local-backend.onrender.com').replace('http://', 'https://')}/api/payments/cashfree/webhook`,
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
      `SELECT vendor_id, vendor_name, store_name, email, phone_number, status FROM vendors WHERE vendor_id = ?`,
      [vId]
    );
    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error(`Vendor ${vId} not found.`);
    }
    const vendor = vendorRes.rows[0];

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
        status: 'NONE',
        start_date: null,
        end_date: null,
        billing_interval: 'MONTHLY',
        days_left: 0,
        is_expired: true,
        is_expiring_soon: false,
        merchant_status: vendor.status,
        shop_visible_on_portal: false,
        show_expiry_popup: true,
        popup_type: 'NO_SUBSCRIPTION',
        popup_title: 'Subscription Required',
        popup_message: 'Your store is currently not visible on the DigiLocal user portal. Subscribe to start receiving orders from local residents.',
        action_text: 'Subscribe Now'
      };
    }

    const daysLeft = this.calculateDaysLeft(subscription.end_date);
    const isExpired = daysLeft < 0 || String(subscription.status).toUpperCase() === 'EXPIRED';
    const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;
    const shopVisible = !isExpired && String(vendor.status).toUpperCase() === 'ACTIVE' && String(subscription.status).toUpperCase() === 'ACTIVE';

    let showExpiryPopup = false;
    let popupType = 'NONE';
    let popupTitle = '';
    let popupMessage = '';
    let actionText = 'Renew Subscription';

    if (isExpired) {
      showExpiryPopup = true;
      popupType = 'EXPIRED';
      popupTitle = 'Subscription Expired';
      popupMessage = `Your DigiLocal subscription for "${vendor.store_name}" has expired on ${subscription.end_date}. Your store is currently hidden from resident users. Please renew now to restore storefront visibility.`;
      actionText = 'Renew Now';
    } else if (daysLeft === 0) {
      showExpiryPopup = true;
      popupType = 'EXPIRING_TODAY';
      popupTitle = 'Subscription Expires Today!';
      popupMessage = `Your DigiLocal subscription for "${vendor.store_name}" expires TODAY. Renew immediately to ensure zero disruption to your store visibility.`;
      actionText = 'Renew Today';
    } else if (daysLeft <= 3) {
      showExpiryPopup = true;
      popupType = 'EXPIRING_CRITICAL';
      popupTitle = `Subscription Expiring in ${daysLeft} Day${daysLeft === 1 ? '' : 's'}`;
      popupMessage = `Your DigiLocal subscription for "${vendor.store_name}" will expire on ${subscription.end_date}. Renew now to keep receiving resident orders.`;
      actionText = 'Renew Now';
    }

    return {
      vendor_id: vId,
      store_name: vendor.store_name,
      has_subscription: true,
      subscription_id: Number(subscription.subscription_id),
      plan_id: subscription.plan_id ? Number(subscription.plan_id) : null,
      plan_name: subscription.plan_name || 'Monthly Merchant Plan',
      billing_interval: String(subscription.billing_interval || 'MONTHLY').toUpperCase(),
      status: isExpired ? 'EXPIRED' : subscription.status,
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
      shop_visible_on_portal: shopVisible,
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

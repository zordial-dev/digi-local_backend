const subscriptionService = require('../../services/subscriptionService');

/**
 * Subscription & Coupon Controller
 * Handles ₹5,999/yr plans, 8-character coupons, status/expiry popups, and reminder runs.
 */
class SubscriptionController {

  /**
   * GET /api/subscriptions/plans (also /api/plans)
   * Returns active subscription plans (1-year ₹5,999/year).
   */
  async getPlans(req, res) {
    try {
      const plans = await subscriptionService.getPlans();
      return res.status(200).json({
        success: true,
        message: 'Active subscription plans fetched successfully.',
        data: plans,
        plans: plans
      });
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch subscription plans' });
    }
  }

  /**
   * GET /api/subscriptions/coupons (also /api/coupons, /api/vendorPanel/:vendorId/coupons)
   * Returns only unused and active coupons for a vendor where CURRENT_DATE is between start_date and end_date.
   */
  async getCoupons(req, res) {
    try {
      const vendorId = req.query.vendor_id || req.query.vendorId || req.params.vendorId || req.user?.vendor_id || req.user?.id;
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          error: 'vendor_id is required in query params (?vendor_id=...) or path params (/:vendorId)'
        });
      }

      const coupons = await subscriptionService.getVendorCoupons(vendorId);
      return res.status(200).json({
        success: true,
        total: coupons.length,
        vendor_id: Number(vendorId),
        data: coupons,
        coupons: coupons
      });
    } catch (err) {
      console.error('Error fetching vendor coupons:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch coupons' });
    }
  }

  /**
   * POST /api/subscriptions/apply-coupon (also /api/coupons/apply)
   * Validates coupon code and calculates discounted subscription price.
   */
  async applyCoupon(req, res) {
    try {
      const vendorId = req.body.vendor_id || req.body.vendorId || req.user?.vendor_id || req.user?.id;
      const couponCode = req.body.coupon_code || req.body.couponCode || req.body.code;
      const planId = req.body.plan_id || req.body.planId;

      if (!couponCode) {
        return res.status(400).json({ success: false, error: 'coupon_code is required' });
      }

      const result = await subscriptionService.applyCoupon({
        vendorId,
        couponCode,
        planId
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to apply coupon'
      });
    }
  }

  /**
   * POST /api/subscriptions/subscribe (also /api/vendorPanel/:vendorId/renew, /api/vendorPanel/:vendorId/subscribe)
   * Purchases or renews 1-year ₹5,999 subscription using online payment.
   */
  async subscribe(req, res) {
    try {
      const vendorId = req.body.vendor_id || req.body.vendorId || req.params.vendorId || req.user?.vendor_id || req.user?.id;
      const planId = req.body.plan_id || req.body.planId;
      const couponCode = req.body.coupon_code || req.body.couponCode || req.body.code;
      const paymentMethod = req.body.payment_method || req.body.paymentMethod || 'ONLINE';
      const transactionId = req.body.transaction_id || req.body.transactionId || req.body.payment_id;

      if (!vendorId) {
        return res.status(400).json({ success: false, error: 'vendor_id is required' });
      }

      const result = await subscriptionService.subscribe({
        vendorId,
        planId,
        couponCode,
        paymentMethod,
        transactionId
      });

      return res.status(200).json(result);
    } catch (err) {
      console.error('Error processing subscription:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'Subscription processing failed'
      });
    }
  }

  /**
   * GET /api/vendorPanel/:vendorId/subscription-status (also /api/subscriptions/status/:vendorId, /api/subscriptions/status)
   * Returns current subscription status, days left, and expiry popup data for Web/App frontends.
   */
  async getVendorSubscriptionStatus(req, res) {
    try {
      const vendorId = req.params.vendorId || req.query.vendor_id || req.query.vendorId || req.user?.vendor_id || req.user?.id;
      if (!vendorId) {
        return res.status(400).json({ success: false, error: 'vendor_id is required' });
      }

      const statusData = await subscriptionService.getVendorSubscriptionStatus(vendorId);
      return res.status(200).json({
        success: true,
        data: statusData,
        ...statusData
      });
    } catch (err) {
      console.error('Error fetching subscription status:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to fetch subscription status' });
    }
  }

  /**
   * POST /api/subscriptions/coupons/generate (Admin / Partner Support)
   * Generates an 8-digit coupon (e.g. DIGI5999, SAVE2026).
   */
  async generateCoupon(req, res) {
    try {
      const { vendor_id, coupon_code, discount, type, start_date, end_date, usage_limit } = req.body;
      if (!discount) {
        return res.status(400).json({ success: false, error: 'discount amount or percentage is required' });
      }

      const coupon = await subscriptionService.createCoupon({
        vendor_id,
        coupon_code,
        discount,
        type: type || 'flat',
        start_date,
        end_date,
        usage_limit
      });

      return res.status(201).json({
        success: true,
        message: `8-digit coupon "${coupon.coupon_code}" created successfully!`,
        data: coupon,
        coupon: coupon
      });
    } catch (err) {
      console.error('Error generating coupon:', err);
      return res.status(400).json({ success: false, error: err.message || 'Failed to generate coupon' });
    }
  }

  /**
   * POST /api/subscriptions/trigger-reminders (Internal / Cron / Admin Testing)
   * Runs the 7-day, 3-day, 1-day, 0-day, and expired reminder email dispatcher immediately.
   */
  async triggerReminders(req, res) {
    try {
      const report = await subscriptionService.checkAndSendReminders();
      return res.status(200).json({
        success: true,
        message: 'Subscription expiry reminder check completed successfully.',
        report
      });
    } catch (err) {
      console.error('Error running subscription reminders:', err);
      return res.status(500).json({ success: false, error: err.message || 'Failed to run subscription reminders' });
    }
  }
}

module.exports = new SubscriptionController();

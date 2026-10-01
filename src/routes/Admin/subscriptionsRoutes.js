const express = require('express');
const router = express.Router();
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');

const subscriptionController = require('../../controllers/Subscription/subscriptionController');

/**
 * 5. Subscriptions, Plans, Coupons & Financial Analytics (/api/subscriptions)
 */

// ── Public & Vendor Subscription Endpoints ─────────────────────────
// GET /api/subscriptions/plans - List active 1-year ₹5,999 plans
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// GET /api/subscriptions/coupons - Get active, unused coupons for a vendor (?vendor_id=...)
router.get('/coupons', subscriptionController.getCoupons.bind(subscriptionController));
router.get('/coupons/:vendorId', subscriptionController.getCoupons.bind(subscriptionController));

// POST /api/subscriptions/apply-coupon - Validate 8-digit coupon and calculate discount
router.post('/apply-coupon', subscriptionController.applyCoupon.bind(subscriptionController));

// POST /api/subscriptions/subscribe - Purchase/renew 1-year ₹5,999 subscription (Online payment only)
router.post('/subscribe', subscriptionController.subscribe.bind(subscriptionController));
router.post('/renew', subscriptionController.subscribe.bind(subscriptionController));

// GET /api/subscriptions/status/:vendorId - Check vendor subscription status, days left & popup flag
router.get('/status', subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));
router.get('/status/:vendorId', subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));

// POST /api/subscriptions/coupons/generate - Generate 8-digit coupon code
router.post('/coupons/generate', subscriptionController.generateCoupon.bind(subscriptionController));

// POST /api/subscriptions/trigger-reminders - Run expiry reminder email checks (7d, 3d, 1d, 0d, expired)
router.post('/trigger-reminders', subscriptionController.triggerReminders.bind(subscriptionController));

// ── Admin Subscriptions & Analytics Endpoints ──────────────────────
// GET /api/subscriptions - List Subscription Records
router.get('/', authenticateAdminToken, adminPanelController.listSubscriptions);

// GET /api/subscriptions/stats - Get Financial Analytics Stats
router.get('/stats', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.getFinancialStats);

// POST /api/subscriptions/:subscriptionId/renew - Admin Renew Merchant Subscription
router.post('/:subscriptionId/renew', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.renewSubscription);

// GET /api/subscriptions/:subscriptionId/invoice - Get GST Tax Invoice Preview
router.get('/:subscriptionId/invoice', authenticateAdminToken, adminPanelController.getInvoicePreview);

module.exports = router;


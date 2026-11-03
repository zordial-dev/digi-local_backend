const express = require('express');
const router = express.Router();
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');

const subscriptionController = require('../../controllers/Subscription/subscriptionController');

/**
 * 5. Subscriptions, Plans, Coupons & Financial Analytics (/api/subscriptions)
 */

const { authenticateToken, requireVendorOwner } = require('../../middleware/auth');

// ── Public & Vendor Subscription Endpoints ─────────────────────────
// GET /api/subscriptions/plans - List active 1-year ₹5,999 plans (Public Read)
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// GET /api/subscriptions/coupons - Get active, unused coupons for a vendor (?vendor_id=...)
router.get('/coupons', authenticateToken, requireVendorOwner, subscriptionController.getCoupons.bind(subscriptionController));
router.get('/coupons/:vendorId', authenticateToken, requireVendorOwner, subscriptionController.getCoupons.bind(subscriptionController));

// POST /api/subscriptions/apply-coupon - Validate 8-digit coupon and calculate discount
router.post('/apply-coupon', authenticateToken, requireVendorOwner, subscriptionController.applyCoupon.bind(subscriptionController));

// POST /api/subscriptions/subscribe - Purchase/renew 1-year ₹5,999 subscription (Online payment only)
router.post('/subscribe', authenticateToken, requireVendorOwner, subscriptionController.subscribe.bind(subscriptionController));
router.post('/renew', authenticateToken, requireVendorOwner, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/create-payment-session', authenticateToken, requireVendorOwner, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/create-session', authenticateToken, requireVendorOwner, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/pay', authenticateToken, requireVendorOwner, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/verify-payment', subscriptionController.verifyPayment.bind(subscriptionController));
router.post('/verify', subscriptionController.verifyPayment.bind(subscriptionController));
router.get('/upgrade-quote', authenticateToken, requireVendorOwner, subscriptionController.getUpgradeQuote.bind(subscriptionController));
router.post('/upgrade', authenticateToken, requireVendorOwner, subscriptionController.upgrade.bind(subscriptionController));
router.get('/current', authenticateToken, requireVendorOwner, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));

// GET /api/subscriptions/status/:vendorId - Check vendor subscription status, days left & popup flag
router.get('/status', authenticateToken, requireVendorOwner, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));
router.get('/status/:vendorId', authenticateToken, requireVendorOwner, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));

// POST /api/subscriptions/coupons/generate - Generate 8-digit coupon code (Admin Only)
router.post('/coupons/generate', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), subscriptionController.generateCoupon.bind(subscriptionController));

// POST /api/subscriptions/trigger-reminders - Run expiry reminder email checks (Admin Only)
router.post('/trigger-reminders', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), subscriptionController.triggerReminders.bind(subscriptionController));

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


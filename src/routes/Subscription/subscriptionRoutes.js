const express = require('express');
const router = express.Router();
const subscriptionController = require('../../controllers/Subscription/subscriptionController');
const { authenticateToken, requireVendor } = require('../../middleware/auth');

// 1. Plans Endpoint (Active configurable plans)
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// 2. Coupons Endpoints
router.get('/coupons', authenticateToken, subscriptionController.getCoupons.bind(subscriptionController));
router.get('/coupons/:vendorId', authenticateToken, subscriptionController.getCoupons.bind(subscriptionController));
router.post('/apply-coupon', authenticateToken, subscriptionController.applyCoupon.bind(subscriptionController));
router.post('/coupons/generate', subscriptionController.generateCoupon.bind(subscriptionController));

// 3. Subscription Purchase & Session Endpoints
router.post('/subscribe', authenticateToken, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/renew', authenticateToken, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/create-payment-session', authenticateToken, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/create-session', authenticateToken, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/pay', authenticateToken, subscriptionController.createPaymentSession.bind(subscriptionController));
router.post('/verify-payment', subscriptionController.verifyPayment.bind(subscriptionController));
router.post('/verify', subscriptionController.verifyPayment.bind(subscriptionController));

// 4. Generic Upgrade Flow
router.get('/upgrade-quote', authenticateToken, subscriptionController.getUpgradeQuote.bind(subscriptionController));
router.post('/upgrade', authenticateToken, subscriptionController.upgrade.bind(subscriptionController));

// 5. Vendor Subscription Lifecycle & Status
router.get('/current', authenticateToken, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));
router.get('/status', authenticateToken, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));
router.get('/status/:vendorId', authenticateToken, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));

// 6. Expiry Email Reminders Trigger
router.post('/trigger-reminders', subscriptionController.triggerReminders.bind(subscriptionController));

module.exports = router;

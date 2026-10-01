const express = require('express');
const router = express.Router();
const subscriptionController = require('../../controllers/Subscription/subscriptionController');

// 1. Plans Endpoint (1-Year ₹5,999/yr)
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

// 2. Coupons Endpoints
router.get('/coupons', subscriptionController.getCoupons.bind(subscriptionController));
router.get('/coupons/:vendorId', subscriptionController.getCoupons.bind(subscriptionController));
router.post('/apply-coupon', subscriptionController.applyCoupon.bind(subscriptionController));
router.post('/coupons/generate', subscriptionController.generateCoupon.bind(subscriptionController));

// 3. Subscription Purchase & Renewal (Online Payment Only)
router.post('/subscribe', subscriptionController.subscribe.bind(subscriptionController));
router.post('/renew', subscriptionController.subscribe.bind(subscriptionController));

// 4. Vendor Subscription Status & Expiry Popup Data
router.get('/status', subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));
router.get('/status/:vendorId', subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));

// 5. Expiry Email Reminders Trigger (7d, 3d, 1d, 0d, expired)
router.post('/trigger-reminders', subscriptionController.triggerReminders.bind(subscriptionController));

module.exports = router;

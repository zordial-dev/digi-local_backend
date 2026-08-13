const express = require('express');
const router = express.Router();
const vendorAuthController = require('../../controllers/Vendor/vendorAuthController');
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const vendorPanelController = require('../../controllers/Vendor/vendorPanelController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');
const { loginBruteForceGuard } = require('../../middleware/security');
const { validateRequest } = require('../../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
} = require('../../schemas/authSchema');

/**
 * Vendor Auth & Admin Vendor Management Routes (/api/vendors)
 */

// 4.1 List Vendors (Admin Panel Spec v2.0.0)
router.get('/', (req, res, next) => {
  if (req.query.status || req.query.tier || req.query.search || req.headers.authorization) {
    return adminPanelController.listVendors(req, res, next);
  }
  return res.status(400).json({ error: 'Vendor ID required or specify search/status query params.' });
});

// 4.2 List Pending Merchant Requests
router.get('/pending', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listPendingVendors);

// 4.3 Approve Vendor Application
router.post('/:vendorId/approve', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.approveVendor);

// 4.4 Reject Vendor Application
router.post('/:vendorId/reject', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.rejectVendor);

// 4.5 Update Vendor Status (Block / Unblock with Custom Reason)
router.post('/:vendorId/status', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.updateVendorStatus);

// GET /api/vendors/:id - Fetch Vendor Storefront Profile & Catalog Items
router.get('/:id', vendorAuthController.getVendorPublicProfile);

// DELETE /api/vendors/:vendorId - Delete Vendor Store
router.delete('/:vendorId', vendorPanelController.deleteStore);

// POST /api/vendors/send-otp
router.post('/send-otp', vendorAuthController.sendVendorOtp);

// POST /api/vendors/check-phone, /check-vendor, /check-mobile, /check-user, /verify-phone
router.post('/check-phone', vendorAuthController.checkVendorPhone);
router.post('/check-vendor', vendorAuthController.checkVendorPhone);
router.post('/check-mobile', vendorAuthController.checkVendorPhone);
router.post('/check-user', vendorAuthController.checkVendorPhone);
router.post('/verify-phone', vendorAuthController.checkVendorPhone);

// POST /api/vendors/register
router.post('/register', validateRequest(registerSchema), vendorAuthController.registerVendor);

// POST /api/vendors/login
router.post('/login', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.loginVendor);

// POST /api/vendors/user-login or /api/vendors/login-as-user
router.post('/user-login', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.handleUserLogin);
router.post('/login-as-user', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.handleUserLogin);

// POST /api/vendors/user-register
router.post('/user-register', vendorAuthController.handleUserRegisterCheck);

// POST /api/vendors/refresh
router.post('/refresh', vendorAuthController.refreshToken);

// POST /api/vendors/logout
router.post('/logout', vendorAuthController.logoutVendor);

// POST /api/vendors/forgot-password
router.post('/forgot-password', validateRequest(forgotPasswordSchema), vendorAuthController.forgotPassword);

// POST /api/vendors/verify-otp
router.post('/verify-otp', validateRequest(verifyOtpSchema), vendorAuthController.verifyVendorOtp);

// POST /api/vendors/reset-password
router.post('/reset-password', validateRequest(resetPasswordSchema), vendorAuthController.resetPassword);

// FCM / Expo Push Device Token Endpoints (/api/vendors/push-token & /api/vendors/fcm-token)
router.post('/push-token', vendorPanelController.registerFcmToken);
router.post('/:vendorId/push-token', vendorPanelController.registerFcmToken);
router.delete('/push-token', vendorPanelController.deleteFcmToken);
router.delete('/:vendorId/push-token', vendorPanelController.deleteFcmToken);

router.post('/fcm-token', vendorPanelController.registerFcmToken);
router.post('/:vendorId/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/fcm-token', vendorPanelController.deleteFcmToken);
router.delete('/:vendorId/fcm-token', vendorPanelController.deleteFcmToken);

// Test Push Notification directly from Backend
router.post('/test-push', vendorPanelController.testPushNotification);
router.post('/:vendorId/test-push', vendorPanelController.testPushNotification);

module.exports = router;


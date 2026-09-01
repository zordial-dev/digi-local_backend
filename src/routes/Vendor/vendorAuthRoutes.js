const express = require('express');
const router = express.Router();
const vendorAuthController = require('../../controllers/Vendor/vendorAuthController');
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const vendorPanelController = require('../../controllers/Vendor/vendorPanelController');
const storefrontController = require('../../controllers/Storefront/storefrontController');
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

// 1. Static Storefront & Search Endpoints
router.get('/', adminPanelController.listVendors);
router.get('/search', storefrontController.searchVendorsLocationAware);
router.get('/all', adminPanelController.listVendors);
router.get('/list', adminPanelController.listVendors);
router.get('/public', adminPanelController.listVendors);
router.get('/nearby', adminPanelController.listVendors);
router.get('/storefront', adminPanelController.listVendors);
router.get('/society/:societyId', (req, res, next) => {
  req.query.society_id = req.params.societyId;
  return adminPanelController.listVendors(req, res, next);
});

// 2. Static Admin & Vendor Management Endpoints (Must come BEFORE /:vendorId)
router.get('/pending', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listPendingVendors);
router.get('/on-hold', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listOnHoldVendors);
router.get('/hold', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listOnHoldVendors);
router.get('/locations/suggestions', storefrontController.getLocations);
router.get('/locations', storefrontController.getLocations);
router.get('/status', vendorAuthController.getVendorStatus);
router.put('/payment-details', vendorPanelController.updatePaymentDetails);
router.post('/resubmit', vendorAuthController.resubmitVendorRequest);
router.put('/resubmit', vendorAuthController.resubmitVendorRequest);

// 3. Static Auth Endpoints (Must come BEFORE /:vendorId)
router.post('/send-otp', vendorAuthController.sendVendorOtp);
router.post('/check-coverage', vendorAuthController.checkCoverage);
router.post('/check-phone', vendorAuthController.checkVendorPhone);
router.post('/check-vendor', vendorAuthController.checkVendorPhone);
router.post('/check-mobile', vendorAuthController.checkVendorPhone);
router.post('/check-user', vendorAuthController.checkVendorPhone);
router.post('/verify-phone', vendorAuthController.checkVendorPhone);

router.post('/register', validateRequest(registerSchema), vendorAuthController.registerVendor);
router.post('/login', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.loginVendor);
router.post('/user-login', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.handleUserLogin);
router.post('/login-as-user', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.handleUserLogin);
router.post('/user-register', vendorAuthController.handleUserRegisterCheck);
router.post('/refresh', vendorAuthController.refreshToken);
router.post('/logout', vendorAuthController.logoutVendor);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), vendorAuthController.forgotPassword);
router.post('/verify-otp', validateRequest(verifyOtpSchema), vendorAuthController.verifyVendorOtp);
router.post('/reset-password', validateRequest(resetPasswordSchema), vendorAuthController.resetPassword);

// FCM / Push Token Static Endpoints
router.post('/push-token', vendorPanelController.registerFcmToken);
router.delete('/push-token', vendorPanelController.deleteFcmToken);
router.post('/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/fcm-token', vendorPanelController.deleteFcmToken);

// 4. Parameterized Routes (/:vendorId and /:id)
router.get('/status/:vendorId', vendorAuthController.getVendorStatus);
router.get('/:vendorId/status', vendorAuthController.getVendorStatus);
router.put('/:vendorId/payment-details', vendorPanelController.updatePaymentDetails);
router.put('/:vendorId/coverage', vendorPanelController.updateVendorCoverage);

router.post('/:vendorId/approve', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.approveVendor);
router.post('/:vendorId/reject', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.rejectVendor);
router.post('/:vendorId/hold', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.holdVendor);
router.post('/:vendorId/block', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.blockVendor);
router.post('/:vendorId/status', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.updateVendorStatus);
router.post('/:vendorId/resubmit', vendorAuthController.resubmitVendorRequest);
router.put('/:vendorId/resubmit', vendorAuthController.resubmitVendorRequest);

router.post('/:vendorId/push-token', vendorPanelController.registerFcmToken);
router.delete('/:vendorId/push-token', vendorPanelController.deleteFcmToken);
router.post('/:vendorId/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/:vendorId/fcm-token', vendorPanelController.deleteFcmToken);

router.get('/:id', vendorAuthController.getVendorPublicProfile);
router.delete('/:vendorId', vendorPanelController.deleteStore);

module.exports = router;

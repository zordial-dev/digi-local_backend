const express = require('express');
const router = express.Router();
const vendorAuthController = require('../controllers/vendorAuthController');
const { loginBruteForceGuard } = require('../middleware/security');
const { validateRequest } = require('../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
} = require('../schemas/authSchema');

// GET /api/vendors/:id - Fetch Vendor Storefront Profile & Catalog Items
router.get('/:id', vendorAuthController.getVendorPublicProfile);

// POST /api/vendors/send-otp
router.post('/send-otp', vendorAuthController.sendVendorOtp);

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

module.exports = router;

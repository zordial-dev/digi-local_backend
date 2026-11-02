const express = require('express');
const router = express.Router();
const vendorAuthController = require('../../controllers/Vendor/vendorAuthController');
const otpController = require('../../controllers/otpController');
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const vendorPanelController = require('../../controllers/Vendor/vendorPanelController');
const storefrontController = require('../../controllers/Storefront/storefrontController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');
const { authenticateToken, requireVendor, requireVendorOwner, verifyMerchantToken } = require('../../middleware/auth');
const { loginBruteForceGuard } = require('../../middleware/security');
const { validateRequest } = require('../../middleware/validate');
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
} = require('../../schemas/authSchema');
const { upload, handleMulterError } = require('../../middleware/upload');

/**
 * Vendor Auth & Admin Vendor Management Routes (/api/vendors)
 */

// Helper middleware: enforce ACTIVE status for resident user / public storefront requests.
// Allowed privileged roles are admin/super_admin/sub_admin only — 'vendor' is intentionally
// excluded, so an authenticated vendor token is treated as a forbidden request.
const ALLOWED_ROLES = ['super_admin', 'admin', 'sub_admin'];

function enforceActiveVendorsForUser(req, res, next) {
  const isAdminClient = req.headers['x-platform-client'] === 'admin_dashboard';
  if (!isAdminClient && (!req.headers.authorization || !req.headers.authorization.includes('Bearer '))) {
    // Unauthenticated / public — show only active vendors
    req.query.status = 'ACTIVE';
  } else if (!isAdminClient) {
    try {
      const { verifyJwt } = require('../../utils/auth');
      const authConfig = require('../../config/auth');
      const token = req.headers.authorization.replace('Bearer ', '').trim();
      const decoded = verifyJwt(token, authConfig.jwt.secret);
      const role = String(decoded?.role || '').toLowerCase();

      if (role === 'vendor') {
        // Vendor role is not in ALLOWED_ROLES — deny access
        return res.status(403).json({
          error: 'Forbidden: Vendor accounts are not permitted to access the vendor directory.'
        });
      }

      if (!decoded || !ALLOWED_ROLES.includes(role)) {
        req.query.status = 'ACTIVE';
      }
    } catch (_) {
      req.query.status = 'ACTIVE';
    }
  }
  next();
}

// 1. Static Storefront & Search Endpoints (Active Vendors Only for Users)
router.get('/', enforceActiveVendorsForUser, adminPanelController.listVendors);
router.get('/search', storefrontController.searchVendorsLocationAware);
router.get('/all', enforceActiveVendorsForUser, adminPanelController.listVendors);
router.get('/list', enforceActiveVendorsForUser, adminPanelController.listVendors);
router.get('/public', enforceActiveVendorsForUser, adminPanelController.listVendors);
router.get('/nearby', enforceActiveVendorsForUser, adminPanelController.listVendors);
router.get('/storefront', enforceActiveVendorsForUser, adminPanelController.listVendors);
router.get('/society/:societyId', enforceActiveVendorsForUser, (req, res, next) => {
  req.query.society_id = req.params.societyId;
  return adminPanelController.listVendors(req, res, next);
});

// 2. Static Admin & Vendor Management Endpoints (Must come BEFORE /:vendorId)
router.get('/pending', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listPendingVendors);
router.get('/on-hold', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listOnHoldVendors);
router.get('/hold', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.listOnHoldVendors);
router.get('/locations/suggestions', storefrontController.getLocations);
router.get('/locations', storefrontController.getLocations);
const ratingController = require('../../controllers/Rating/ratingController');

// Vendor Self Ratings & Customer Reviews (Vendor Only)
router.get('/ratings', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.get('/reviews', authenticateToken, requireVendor, ratingController.getVendorSelfRatings);
router.options('/status', (req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept, X-Platform-Client, X-Request-ID, X-Idempotency-Key');
  return res.sendStatus(204);
});
router.get('/status', verifyMerchantToken, vendorAuthController.getVendorStatus);
router.put('/payment-details', authenticateToken, requireVendor, vendorPanelController.updatePaymentDetails);
router.post('/resubmit', authenticateToken, requireVendor, vendorAuthController.resubmitVendorRequest);
router.put('/resubmit', authenticateToken, requireVendor, vendorAuthController.resubmitVendorRequest);

// Middleware: force role='vendor' on vendor-scoped OTP routes so the guard always checks only the vendors table
function injectVendorRole(req, res, next) {
  if (!req.body) req.body = {};
  req.body.role = 'vendor';
  next();
}

// Dedicated Mobile OTP Endpoints
router.post(['/mobile/send-otp', '/mobile/send'], injectVendorRole, otpController.sendMobileOtp);
router.post(['/mobile/verify-otp', '/mobile/verify'], injectVendorRole, (req, res, next) => {
  const isRegister = req.body?.purpose === 'register' || req.body?.mode === 'register' || req.body?.intent === 'register';
  if (isRegister) {
    return otpController.verifyMobileOtp(req, res, next);
  }
  return vendorAuthController.loginVendorWithOtp(req, res, next);
});

// Dedicated Email OTP Endpoints
router.post(['/email/send-otp', '/email/send'], injectVendorRole, otpController.sendEmailOtp);
router.post(['/email/verify-otp', '/email/verify'], injectVendorRole, otpController.verifyEmailOtp);


// 3. Static Auth Endpoints (Must come BEFORE /:vendorId)
router.post(['/send-otp', '/request-otp', '/otp-send'], vendorAuthController.sendVendorOtp);
router.post(['/otp-login', '/login-with-otp', '/login-otp'], loginBruteForceGuard, vendorAuthController.loginVendorWithOtp);
router.post('/check-coverage', vendorAuthController.checkCoverage);
router.post('/check-phone', vendorAuthController.checkVendorPhone);
router.post('/check-email', vendorAuthController.checkVendorPhone);
router.post('/check-vendor', vendorAuthController.checkVendorPhone);
router.post('/check-vendor-phone', vendorAuthController.checkVendorPhone);
router.post('/check-vendor-email', vendorAuthController.checkVendorPhone);
router.post('/check-mobile', vendorAuthController.checkVendorPhone);
router.post('/check-user', vendorAuthController.checkVendorPhone);
router.post('/verify-phone', vendorAuthController.checkVendorPhone);
router.get(['/check-phone', '/check-email', '/check-vendor', '/check-vendor-phone', '/check-vendor-email'], vendorAuthController.checkVendorPhone);

// ── Bank & IFSC Lookup Endpoints (Public) ───────────────
router.get(['/bank-details/:ifsc', '/bank/:ifsc', '/ifsc/:ifsc'], vendorAuthController.getBankDetailsByIfsc);
router.get(['/bank-details', '/bank', '/ifsc'], vendorAuthController.getBankDetailsByIfsc);

router.post('/register', validateRequest(registerSchema), vendorAuthController.registerVendor);
router.post('/login', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.loginVendor);
router.post('/user-login', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.handleUserLogin);
router.post('/login-as-user', loginBruteForceGuard, validateRequest(loginSchema), vendorAuthController.handleUserLogin);
router.post('/user-register', vendorAuthController.handleUserRegisterCheck);
router.post('/refresh', vendorAuthController.refreshToken);
router.post('/logout', vendorAuthController.logoutVendor);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), vendorAuthController.forgotPassword);
router.post(['/verify-otp', '/otp-verify'], (req, res, next) => {
  const isRegister = req.body?.purpose === 'register' || req.body?.mode === 'register' || req.body?.intent === 'register';
  if (isRegister) {
    return otpController.verifyOtp(req, res, next);
  }
  return vendorAuthController.loginVendorWithOtp(req, res, next);
});
router.post('/reset-password', validateRequest(resetPasswordSchema), vendorAuthController.resetPassword);

// FCM / Push Token Static Endpoints (Vendor Only)
router.post('/push-token', authenticateToken, requireVendor, vendorPanelController.registerFcmToken);
router.delete('/push-token', authenticateToken, requireVendor, vendorPanelController.deleteFcmToken);
router.post('/fcm-token', authenticateToken, requireVendor, vendorPanelController.registerFcmToken);
router.delete('/fcm-token', authenticateToken, requireVendor, vendorPanelController.deleteFcmToken);

const ordersController = require('../../controllers/User/ordersController');

// 4. Parameterized Routes (/:vendorId and /:id)
router.get('/status/:vendorId', authenticateToken, requireVendorOwner, vendorAuthController.getVendorStatus);
router.get('/:vendorId/status', authenticateToken, requireVendorOwner, vendorAuthController.getVendorStatus);
router.put('/:vendorId/payment-details', authenticateToken, requireVendorOwner, vendorPanelController.updatePaymentDetails);
router.put('/:vendorId/coverage', authenticateToken, requireVendorOwner, vendorPanelController.updateVendorCoverage);

// Vendor Password Management Endpoints (Vendor Owner Only)
router.put('/:vendorId/password', authenticateToken, requireVendorOwner, vendorAuthController.updateVendorPassword);
router.patch('/:vendorId/password', authenticateToken, requireVendorOwner, vendorAuthController.updateVendorPassword);
router.post('/:vendorId/password', authenticateToken, requireVendorOwner, vendorAuthController.updateVendorPassword);
router.put('/:vendorId/change-password', authenticateToken, requireVendorOwner, vendorAuthController.updateVendorPassword);
router.post('/:vendorId/change-password', authenticateToken, requireVendorOwner, vendorAuthController.updateVendorPassword);
router.put('/password', authenticateToken, requireVendor, vendorAuthController.updateVendorPassword);
router.post('/password', authenticateToken, requireVendor, vendorAuthController.updateVendorPassword);
router.post('/change-password', authenticateToken, requireVendor, vendorAuthController.updateVendorPassword);

router.put(['/:vendorId(\\d+)/settings', '/:vendorId(\\d+)/profile', '/:vendorId(\\d+)'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateSettings);
router.post(['/:vendorId(\\d+)/settings', '/:vendorId(\\d+)/profile', '/:vendorId(\\d+)'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateSettings);
router.patch(['/:vendorId(\\d+)/settings', '/:vendorId(\\d+)/profile', '/:vendorId(\\d+)'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateSettings);

// Vendor Catalog / Items & Products Routes (/api/vendors/:vendorId/items & /products)
router.get(['/:vendorId/items', '/:vendorId/products'], storefrontController.getVendorStorefront);
router.post(['/:vendorId/items', '/:vendorId/products'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.addItem);
router.put(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItem);
router.patch(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItem);
router.post(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.put(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.patch(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.post(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.put(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.patch(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.delete(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], authenticateToken, requireVendorOwner, vendorPanelController.deleteItem);
router.patch(['/:vendorId/items/:itemId/availability', '/:vendorId/products/:itemId/availability'], authenticateToken, requireVendorOwner, vendorPanelController.toggleAvailability);
router.put(['/:vendorId/items/:itemId/availability', '/:vendorId/products/:itemId/availability'], authenticateToken, requireVendorOwner, vendorPanelController.toggleAvailability);

// Vendor Orders Specification Routes (/api/vendors/:vendorId/orders - Vendor Owner Only)
router.get('/:vendorId/orders', authenticateToken, requireVendorOwner, ordersController.getVendorOrders);
router.put('/:vendorId/orders/:orderId/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.patch('/:vendorId/orders/:orderId/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);

// Vendor Payments & Logo Routes
router.get('/:vendorId/payments', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.getVendorPayments);
router.post('/:vendorId/logo', upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateVendorLogo);
router.put('/:vendorId/logo', upload.any(), handleMulterError, authenticateToken, requireVendorOwner, vendorPanelController.updateVendorLogo);

router.post('/:vendorId/approve', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.approveVendor);
router.post('/:vendorId/reject', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.rejectVendor);
router.post('/:vendorId/hold', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.holdVendor);
router.post('/:vendorId/block', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.blockVendor);
router.post(['/:vendorId/unblock', '/:vendorId/unban'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unbanVendor);
router.get(['/:vendorId/strike', '/:vendorId/strikes'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.getVendorStrikesAdmin);
router.post('/:vendorId/strike', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.strikeVendor);
router.delete('/:vendorId/strike', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unstrikeVendor);
router.post('/:vendorId/unstrike', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unstrikeVendor);
router.post('/:vendorId/status', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.updateVendorStatus);
router.post('/:vendorId/resubmit', authenticateToken, requireVendorOwner, vendorAuthController.resubmitVendorRequest);
router.put('/:vendorId/resubmit', authenticateToken, requireVendorOwner, vendorAuthController.resubmitVendorRequest);

router.post('/:vendorId/push-token', authenticateToken, requireVendorOwner, vendorPanelController.registerFcmToken);
router.delete('/:vendorId/push-token', authenticateToken, requireVendorOwner, vendorPanelController.deleteFcmToken);
router.post('/:vendorId/fcm-token', authenticateToken, requireVendorOwner, vendorPanelController.registerFcmToken);
router.delete('/:vendorId/fcm-token', authenticateToken, requireVendorOwner, vendorPanelController.deleteFcmToken);

router.get('/:id', (req, res, next) => {
    if (['categories', 'search', 'locations', 'ratings', 'reviews', 'tickets', 'status'].includes(req.params.id)) return next();
    return storefrontController.getVendorStorefront(req, res, next);
});
router.delete('/:vendorId', authenticateToken, requireVendorOwner, vendorPanelController.deleteStore);

module.exports = router;


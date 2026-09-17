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
const { upload, handleMulterError } = require('../../middleware/upload');

/**
 * Vendor Auth & Admin Vendor Management Routes (/api/vendors)
 */

// Helper middleware: enforce ACTIVE status for resident user / public storefront requests
function enforceActiveVendorsForUser(req, res, next) {
  const isAdminClient = req.headers['x-platform-client'] === 'admin_dashboard';
  if (!isAdminClient && (!req.headers.authorization || !req.headers.authorization.includes('Bearer '))) {
    req.query.status = 'ACTIVE';
  } else if (!isAdminClient) {
    try {
      const { verifyJwt } = require('../../utils/auth');
      const authConfig = require('../../config/auth');
      const token = req.headers.authorization.replace('Bearer ', '').trim();
      const decoded = verifyJwt(token, authConfig.jwt.secret);
      if (!decoded || !['super_admin', 'admin', 'sub_admin'].includes(String(decoded.role || '').toLowerCase())) {
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

// Vendor Self Ratings & Customer Reviews
router.get('/ratings', ratingController.getVendorSelfRatings);
router.get('/reviews', ratingController.getVendorSelfRatings);
router.get('/status', vendorAuthController.getVendorStatus);
router.put('/payment-details', vendorPanelController.updatePaymentDetails);
router.post('/resubmit', vendorAuthController.resubmitVendorRequest);
router.put('/resubmit', vendorAuthController.resubmitVendorRequest);

// 3. Static Auth Endpoints (Must come BEFORE /:vendorId)
router.post(['/send-otp', '/request-otp', '/otp-send'], vendorAuthController.sendVendorOtp);
router.post(['/otp-login', '/login-with-otp', '/login-otp'], loginBruteForceGuard, vendorAuthController.loginVendorWithOtp);
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
router.post('/verify-otp', vendorAuthController.loginVendorWithOtp);
router.post('/reset-password', validateRequest(resetPasswordSchema), vendorAuthController.resetPassword);

// FCM / Push Token Static Endpoints
router.post('/push-token', vendorPanelController.registerFcmToken);
router.delete('/push-token', vendorPanelController.deleteFcmToken);
router.post('/fcm-token', vendorPanelController.registerFcmToken);
router.delete('/fcm-token', vendorPanelController.deleteFcmToken);

const ordersController = require('../../controllers/User/ordersController');

// 4. Parameterized Routes (/:vendorId and /:id)
router.get('/status/:vendorId', vendorAuthController.getVendorStatus);
router.get('/:vendorId/status', vendorAuthController.getVendorStatus);
router.put('/:vendorId/payment-details', vendorPanelController.updatePaymentDetails);
router.put('/:vendorId/coverage', vendorPanelController.updateVendorCoverage);
router.put(['/:vendorId(\\d+)/settings', '/:vendorId(\\d+)/profile', '/:vendorId(\\d+)'], upload.any(), handleMulterError, vendorPanelController.updateSettings);
router.post(['/:vendorId(\\d+)/settings', '/:vendorId(\\d+)/profile', '/:vendorId(\\d+)'], upload.any(), handleMulterError, vendorPanelController.updateSettings);
router.patch(['/:vendorId(\\d+)/settings', '/:vendorId(\\d+)/profile', '/:vendorId(\\d+)'], upload.any(), handleMulterError, vendorPanelController.updateSettings);

// Vendor Catalog / Items & Products Routes (/api/vendors/:vendorId/items & /products)
router.get(['/:vendorId/items', '/:vendorId/products'], storefrontController.getVendorStorefront);
router.post(['/:vendorId/items', '/:vendorId/products'], upload.any(), handleMulterError, vendorPanelController.addItem);
router.put(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], upload.any(), handleMulterError, vendorPanelController.updateItem);
router.patch(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], upload.any(), handleMulterError, vendorPanelController.updateItem);
router.post(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, vendorPanelController.updateItemImage);
router.put(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, vendorPanelController.updateItemImage);
router.patch(['/:vendorId/items/:itemId/image', '/:vendorId/products/:itemId/image'], upload.any(), handleMulterError, vendorPanelController.updateItemImage);
router.post(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, vendorPanelController.updateItemImage);
router.put(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, vendorPanelController.updateItemImage);
router.patch(['/:vendorId/items/:itemId/photo', '/:vendorId/products/:itemId/photo'], upload.any(), handleMulterError, vendorPanelController.updateItemImage);
router.delete(['/:vendorId/items/:itemId', '/:vendorId/products/:itemId'], vendorPanelController.deleteItem);
router.patch(['/:vendorId/items/:itemId/availability', '/:vendorId/products/:itemId/availability'], vendorPanelController.toggleAvailability);
router.put(['/:vendorId/items/:itemId/availability', '/:vendorId/products/:itemId/availability'], vendorPanelController.toggleAvailability);

// Vendor Orders Specification Routes (/api/vendors/:vendorId/orders)
router.get('/:vendorId/orders', ordersController.getVendorOrders);
router.put('/:vendorId/orders/:orderId/status', ordersController.updateOrderStatus);
router.patch('/:vendorId/orders/:orderId/status', ordersController.updateOrderStatus);

// Vendor Payments & Logo Routes
router.get('/:vendorId/payments', adminPanelController.getVendorPayments);
router.post('/:vendorId/logo', upload.any(), handleMulterError, vendorPanelController.updateVendorLogo);
router.put('/:vendorId/logo', upload.any(), handleMulterError, vendorPanelController.updateVendorLogo);

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

router.get('/:id', (req, res, next) => {
    if (['categories', 'search', 'locations', 'ratings', 'reviews', 'tickets'].includes(req.params.id)) return next();
    return storefrontController.getVendorStorefront(req, res, next);
});
router.delete('/:vendorId', vendorPanelController.deleteStore);

module.exports = router;

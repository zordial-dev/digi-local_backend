const express = require('express');
const router = express.Router();
const ordersController = require('../../controllers/User/ordersController');
const cartController = require('../../controllers/User/cartController');
const { authenticateToken, requireRole, requireUser, requireUserOwner, requireVendorOwner, requireAuth } = require('../../middleware/auth');

// Guard: Only vendors and administrators can alter order progress pipeline
const requireVendorOrAdmin = requireRole('vendor', 'merchant', 'admin', 'super_admin', 'superadmin', 'sub_admin');

// GET /api/orders (Query Params: phone, user_id, vendor_id)
router.get('/', authenticateToken, requireAuth, ordersController.getOrdersByQuery);

// Dedicated Refund Status APIs for App & Web Frontends (User Owner Only)
router.get('/user/:userId/refunds', authenticateToken, requireUserOwner, ordersController.getUserRefunds);
router.get('/user/:userId/refund-status', authenticateToken, requireUserOwner, ordersController.getUserRefunds);

// D1. Fetch Resident User Orders (User Owner Only)
router.get('/user/:userId', authenticateToken, requireUserOwner, ordersController.getUserOrders);

// D2. Fetch Vendor Store Orders (Vendor Owner Only)
router.get('/vendor/:vendorId', authenticateToken, requireVendorOwner, ordersController.getVendorOrders);
router.get('/merchant/:vendorId', authenticateToken, requireVendorOwner, ordersController.getVendorOrders);
router.get('/merchant/:merchantId', authenticateToken, requireVendorOwner, ordersController.getVendorOrders);

// Cart Management Endpoints (User Only - requires authentication)
router.post(['/cart/add', '/cart', '/cart/items', '/cart/item'], authenticateToken, requireUser, cartController.addToCart);
router.get(['/cart', '/cart/items'], authenticateToken, requireUser, cartController.getCart);

// Validate Cart Stock & Availability before checkout (Public / Cart Check)
router.post('/check-stock', ordersController.validateCartStock);
router.post('/validate-cart', ordersController.validateCartStock);

// Payment Eligibility Check (Public / Resident Checkout)
router.get('/payment-eligibility', ordersController.getPaymentEligibility);
router.post('/payment-eligibility', ordersController.getPaymentEligibility);

// D3. Create New Order (User Only - redirects/provides WhatsApp URL)
router.post('/', authenticateToken, requireUser, ordersController.createOrder);
router.post('/checkout', authenticateToken, requireUser, ordersController.createOrder);

// Dedicated WhatsApp Order Redirect Endpoints
router.get('/:orderId/whatsapp', ordersController.redirectToWhatsAppOrder);
router.get('/:orderId/whatsapp-redirect', ordersController.redirectToWhatsAppOrder);
router.get('/:orderId/redirect', ordersController.redirectToWhatsAppOrder);

// D4. Update Order Status Pipeline (Restricted to Vendors and Admins)
router.put('/:id/status', authenticateToken, requireVendorOrAdmin, ordersController.updateOrderStatus);
router.post('/:id/status', authenticateToken, requireVendorOrAdmin, ordersController.updateOrderStatus);
router.patch('/:id/status', authenticateToken, requireVendorOrAdmin, ordersController.updateOrderStatus);
router.put('/vendor/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.post('/vendor/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.patch('/vendor/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.put('/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.post('/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.patch('/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.put('/merchant/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.post('/merchant/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);
router.patch('/merchant/:vendorId/orders/:id/status', authenticateToken, requireVendorOwner, ordersController.updateOrderStatus);

// Dedicated Refund Status API for Order
router.get('/:orderId/refund-status', authenticateToken, requireAuth, ordersController.getOrderRefundStatus);
router.get('/:orderId/refund', authenticateToken, requireAuth, ordersController.getOrderRefundStatus);

// GET /api/orders/:orderId - Single order detail lookup
router.get('/:orderId', authenticateToken, requireAuth, ordersController.getOrderById);

// Trigger In-App Push Notification & Firebase/Socket alert to vendor
router.post('/:id/notify', authenticateToken, requireAuth, ordersController.notifyOrderVendor);
router.post('/:id/confirm-whatsapp', authenticateToken, requireAuth, ordersController.notifyOrderVendor); // backward-compatible alias

// D5. Cancel Order & Automatic Refund to User's Original Payment Account
router.post('/:id/cancel', authenticateToken, requireAuth, ordersController.cancelOrder);
router.put('/:id/cancel', authenticateToken, requireAuth, ordersController.cancelOrder);
router.patch('/:id/cancel', authenticateToken, requireAuth, ordersController.cancelOrder);
router.post('/user/:userId/orders/:id/cancel', authenticateToken, requireUserOwner, ordersController.cancelOrder);
router.put('/user/:userId/orders/:id/cancel', authenticateToken, requireUserOwner, ordersController.cancelOrder);

module.exports = router;

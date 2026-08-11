const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

// D1. Fetch Resident User Orders
router.get('/user/:userId', ordersController.getUserOrders);

// D2. Fetch Vendor Store Orders
router.get('/vendor/:vendorId', ordersController.getVendorOrders);

// D3. Create New Order
router.post('/', ordersController.createOrder);

// D4. Update Order Status Pipeline
router.put('/:id/status', ordersController.updateOrderStatus);
router.post('/:id/status', ordersController.updateOrderStatus);
router.patch('/:id/status', ordersController.updateOrderStatus);
router.put('/vendor/:vendorId/orders/:id/status', ordersController.updateOrderStatus);
router.post('/vendor/:vendorId/orders/:id/status', ordersController.updateOrderStatus);
router.patch('/vendor/:vendorId/orders/:id/status', ordersController.updateOrderStatus);
router.put('/:vendorId/orders/:id/status', ordersController.updateOrderStatus);
router.post('/:vendorId/orders/:id/status', ordersController.updateOrderStatus);
router.patch('/:vendorId/orders/:id/status', ordersController.updateOrderStatus);

// GET /api/orders/:orderId - Single order detail lookup
router.get('/:orderId', ordersController.getOrderById);

// Trigger Push Notification & Firebase/Socket alert when user confirms via WhatsApp
router.post('/:id/notify', ordersController.notifyOrderVendor);
router.post('/:id/confirm-whatsapp', ordersController.notifyOrderVendor);

module.exports = router;

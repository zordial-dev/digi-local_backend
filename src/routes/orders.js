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

// GET /api/orders/:orderId - Single order detail lookup
router.get('/:orderId', ordersController.getOrderById);

module.exports = router;

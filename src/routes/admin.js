const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// POST /api/admin/login
router.post('/login', adminController.loginAdmin);

// GET /api/admin/vendors
router.get('/vendors', authenticateToken, requireAdmin, adminController.getAllVendors);

// GET /api/admin/requests
router.get('/requests', authenticateToken, requireAdmin, adminController.getVendorRequests);

// POST /api/admin/requests/:vendorId/approve
router.post('/requests/:vendorId/approve', authenticateToken, requireAdmin, adminController.approveVendorRequest);

// POST /api/admin/requests/:vendorId/reject
router.post('/requests/:vendorId/reject', authenticateToken, requireAdmin, adminController.rejectVendorRequest);

// GET /api/admin/config
router.get('/config', adminController.getConfig);

// PUT & POST /api/admin/config
router.put('/config', authenticateToken, requireAdmin, adminController.updateConfig);
router.post('/config', authenticateToken, requireAdmin, adminController.updateConfig);
router.put('/logo', authenticateToken, requireAdmin, adminController.updateConfig);
router.post('/logo', authenticateToken, requireAdmin, adminController.updateConfig);

module.exports = router;

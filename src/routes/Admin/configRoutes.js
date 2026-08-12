const express = require('express');
const router = express.Router();
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');

/**
 * 6. Platform Branding & Security Config (/api/config)
 */

// GET /api/config - Get Platform Branding Config
router.get('/', adminPanelController.getPlatformConfig);

// PUT /api/config/branding - Update Branding Configuration
router.put('/branding', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateBrandingConfig);

// PUT /api/config/security - Update Administrator Password
router.put('/security', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateAdminSecurity);

module.exports = router;

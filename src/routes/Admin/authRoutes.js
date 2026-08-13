const express = require('express');
const router = express.Router();
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const { authenticateAdminToken } = require('../../middleware/adminAuth');

/**
 * 1. Authentication & Session Management (/api/auth)
 */

// POST /api/auth/login - Super Admin & Sub-Admin Login
router.post('/login', adminPanelController.login);

// POST /api/auth/refresh - JWT Token Refresh
router.post('/refresh', adminPanelController.refreshToken);

// GET /api/auth/me - Get Current User Profile & RBAC Powers
router.get('/me', authenticateAdminToken, adminPanelController.getMe);

module.exports = router;

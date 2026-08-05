const express = require('express');
const router = express.Router();
const adminPanelController = require('../controllers/adminPanelController');
const { authenticateAdminToken, requirePower } = require('../middleware/adminAuth');

/**
 * 2. Sub-Admin Power Delegation & RBAC (/api/sub-admins)
 */

// GET /api/sub-admins - List All Sub-Admin Accounts (Super Admin Only)
router.get('/', authenticateAdminToken, requirePower('SUB_ADMINS'), adminPanelController.listSubAdmins);

// POST /api/sub-admins - Create Sub-Admin Account (Super Admin Only)
router.post('/', authenticateAdminToken, requirePower('SUB_ADMINS'), adminPanelController.createSubAdmin);

// PUT /api/sub-admins/:id/powers - Update Sub-Admin Delegated Powers (Super Admin Only)
router.put('/:id/powers', authenticateAdminToken, requirePower('SUB_ADMINS'), adminPanelController.updateSubAdminPowers);

// DELETE /api/sub-admins/:id - Revoke Sub-Admin Account Access (Super Admin Only)
router.delete('/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), adminPanelController.deleteSubAdmin);

module.exports = router;

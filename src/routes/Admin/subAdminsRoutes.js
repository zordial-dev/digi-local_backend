const express = require('express');
const router = express.Router();
const subAdminsController = require('../../controllers/Admin/subAdminsController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');

/**
 * Sub-Admin Management & Power Delegation Endpoints (/api/v1/admin/subadmins)
 */

// 6.2 GET /admin/subadmins — Fetch All Sub-Admin Accounts
router.get('/', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.get('/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.getSubAdminById);

// 6.3 POST /admin/subadmins — Create Sub-Admin Account
router.post('/', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);

// 6.4 PUT /admin/subadmins/:id — Update Sub-Admin Powers & Delegation Ceiling
router.put('/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.put('/:id/powers', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);

// 6.5 POST /admin/subadmins/:id/toggle-status — Toggle Account Active/Suspended Status
router.post('/:id/toggle-status', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.toggleSubAdminStatus);
router.patch('/:id/toggle-status', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.toggleSubAdminStatus);

// 6.6 DELETE /admin/subadmins/:id — Revoke Sub-Admin Account Access
router.delete('/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.deleteSubAdmin);

module.exports = router;

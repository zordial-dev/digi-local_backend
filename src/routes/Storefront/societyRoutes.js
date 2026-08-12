const express = require('express');
const router = express.Router();
const societiesController = require('../../controllers/Storefront/societiesController');
const adminPanelController = require('../../controllers/Admin/adminPanelController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');

// 3.1 List Societies (Supports Admin Search + Status filtering)
router.get('/', (req, res, next) => {
    if (req.query.status || req.headers.authorization) {
        return adminPanelController.listSocieties(req, res, next);
    }
    return societiesController.getAllSocieties(req, res, next);
});

// 3.2 Register New Society
router.post('/', (req, res, next) => {
    if (req.body.secretary_name || req.body.secretary_mobile) {
        return societiesController.createSociety(req, res, next);
    }
    return adminPanelController.registerSociety(req, res, next);
});

// 3.3 Update Society Details
router.put('/:societyId', authenticateAdminToken, requirePower('SOCIETIES'), adminPanelController.updateSociety);

// Society Approval & Status Update Endpoints (Supports both Admin Panel & Vendor Panel)
router.post('/:societyId/approve', societiesController.approveSociety);
router.put('/:societyId/approve', societiesController.approveSociety);
router.post('/:id/approve', societiesController.approveSociety);
router.put('/:id/approve', societiesController.approveSociety);

// 3.4 Update Society Status (Approve / Block / Unblock)
router.post('/:societyId/status', (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.includes('Bearer ')) {
        return adminPanelController.updateSocietyStatus(req, res, next);
    }
    return societiesController.approveSociety(req, res, next);
});
router.put('/:societyId/status', (req, res, next) => {
    if (req.headers.authorization && req.headers.authorization.includes('Bearer ')) {
        return adminPanelController.updateSocietyStatus(req, res, next);
    }
    return societiesController.approveSociety(req, res, next);
});

// 3.5 Get Society Onboarded Merchants
router.get('/:id/vendors', (req, res, next) => {
    if (req.headers.authorization) {
        return adminPanelController.getSocietyVendors(req, res, next);
    }
    return societiesController.getSocietyVendors(req, res, next);
});

// A2. Get Society Details by ID
router.get('/:id', societiesController.getSocietyById);

module.exports = router;

const express = require('express');
const router = express.Router();
const adminPanelController = require('../controllers/adminPanelController');
const { authenticateAdminToken, requirePower } = require('../middleware/adminAuth');

/**
 * 5. Subscriptions & Financial Analytics (/api/subscriptions)
 */

// GET /api/subscriptions - List Subscription Records
router.get('/', authenticateAdminToken, adminPanelController.listSubscriptions);

// GET /api/subscriptions/stats - Get Financial Analytics Stats
router.get('/stats', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.getFinancialStats);

// POST /api/subscriptions/:subscriptionId/renew - Renew Merchant Subscription
router.post('/:subscriptionId/renew', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.renewSubscription);

// GET /api/subscriptions/:subscriptionId/invoice - Get GST Tax Invoice Preview
router.get('/:subscriptionId/invoice', authenticateAdminToken, adminPanelController.getInvoicePreview);

module.exports = router;

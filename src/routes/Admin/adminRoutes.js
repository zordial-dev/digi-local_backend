const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/Admin/adminController');
const adminPanelController = require('../../controllers/Admin/adminPanelController');

// ── Auth ─────────────────────────────────────────────────────────────
router.post('/login', adminPanelController.login);
router.post('/refresh', adminPanelController.refreshToken);

// ── Societies ────────────────────────────────────────────────────────
router.get('/societies', adminPanelController.listSocieties);
router.post('/societies', adminPanelController.registerSociety);
router.put('/societies/:id', adminPanelController.updateSociety);
router.delete('/societies/:id', adminPanelController.deleteSociety);
router.post('/societies/:id/status', adminPanelController.updateSocietyStatus);

// ── Vendors ──────────────────────────────────────────────────────────
router.get('/vendors', adminPanelController.listVendors);
router.patch('/vendors/:id/status', adminPanelController.updateVendorStatus);
router.post('/vendors/:id/status', adminPanelController.updateVendorStatus);
router.get('/requests', adminPanelController.listPendingVendors);
router.post('/requests/:id/approve', adminPanelController.approveVendor);
router.post('/requests/:id/reject', adminPanelController.rejectVendor);

// ── Users & People Directory ──────────────────────────────────────────
router.get('/users', adminPanelController.listUsers);
router.post('/users/:id/flag', adminPanelController.flagUser);
router.put('/users/:id/status', adminPanelController.updateUserStatus);
router.patch('/users/:id/status', adminPanelController.updateUserStatus);

// ── Subscriptions ────────────────────────────────────────────────────
router.get('/subscriptions', adminPanelController.listSubscriptions);
router.get('/subscriptions/stats', adminPanelController.getFinancialStats);
router.post('/subscriptions/renew', adminPanelController.renewSubscription);
router.post('/subscriptions/:id/renew', adminPanelController.renewSubscription);

// ── Payments & Refunds ───────────────────────────────────────────────
router.get('/payments/transactions', adminPanelController.getPaymentTransactions);
router.post('/payments/refund', adminPanelController.processRefund);

// ── Promotions ───────────────────────────────────────────────────────
router.get('/promotions', adminPanelController.listPromotions);
router.post('/promotions', adminPanelController.createPromotion);
router.put('/promotions/:id', adminPanelController.updatePromotion);
router.delete('/promotions/:id', adminPanelController.deletePromotion);

// ── Sub-Admins ───────────────────────────────────────────────────────
router.get('/sub-admins', adminPanelController.listSubAdmins);
router.post('/sub-admins', adminPanelController.createSubAdmin);
router.put('/sub-admins/:id', adminPanelController.updateSubAdminPowers);
router.delete('/sub-admins/:id', adminPanelController.deleteSubAdmin);

// ── Support Desk ─────────────────────────────────────────────────────
router.get('/support/tickets', adminPanelController.listSupportTickets);
router.get('/support/tickets/:id/messages', adminPanelController.getTicketMessages);
router.post('/support/tickets/:id/messages', adminPanelController.replyToTicket);

// ── Executive Reports & Exports ───────────────────────────────────────
router.get('/reports/executive', adminPanelController.getExecutiveReports);
router.get('/reports/export', adminPanelController.exportReportData);

// ── Real-Time Notifications ──────────────────────────────────────────
router.get('/notifications', adminPanelController.listNotifications);
router.patch('/notifications/read-all', adminPanelController.markAllNotificationsRead);

// ── Audit Logs ───────────────────────────────────────────────────────
router.get('/audit-logs', adminPanelController.listAuditLogs);

// ── Platform Settings & Configuration ────────────────────────────────
router.get('/settings', adminPanelController.getPlatformConfig);
router.put('/settings', adminPanelController.updateBrandingConfig);
router.get('/config', adminPanelController.getPlatformConfig);
router.put('/config', adminPanelController.updateBrandingConfig);
router.post('/config', adminPanelController.updateBrandingConfig);

module.exports = router;

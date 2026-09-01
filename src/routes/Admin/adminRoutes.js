const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/Admin/adminController');
const adminPanelController = require('../../controllers/Admin/adminPanelController');

// ── Auth & Dashboard ──────────────────────────────────────────────────
router.post('/login', adminPanelController.login);
router.post('/refresh', adminPanelController.refreshToken);
router.get('/me', adminPanelController.getMe);
router.post('/logout', adminPanelController.logout);
router.get('/dashboard', adminPanelController.getDashboardData);

// ── Societies ────────────────────────────────────────────────────────
router.get('/societies', adminPanelController.listSocieties);
router.post('/societies', adminPanelController.registerSociety);
router.get('/societies/:id', adminPanelController.getSocietyById);
router.put('/societies/:id', adminPanelController.updateSociety);
router.delete('/societies/:id', adminPanelController.deleteSociety);
router.patch('/societies/:id/status', adminPanelController.updateSocietyStatus);
router.post('/societies/:id/status', adminPanelController.updateSocietyStatus);
router.get('/societies/:id/vendors', adminPanelController.getSocietyVendors);

// ── Vendors ──────────────────────────────────────────────────────────
router.get('/vendors', adminPanelController.listVendors);
router.get(['/vendors/hold/list', '/vendors/hold'], adminPanelController.listOnHoldVendors);
router.post('/vendors', adminPanelController.createVendor);
router.post('/vendors/bulk-action', adminPanelController.bulkVendorAction);
router.get('/vendors/:id', adminPanelController.getVendorById);
router.put('/vendors/:id', adminPanelController.updateVendor);
router.patch('/vendors/:id', adminPanelController.updateVendor);
router.post('/vendors/:id/block', adminPanelController.blockVendor);
router.patch('/vendors/:id/status', adminPanelController.updateVendorStatus);
router.post('/vendors/:id/status', adminPanelController.updateVendorStatus);
router.get('/vendors/:id/payments', adminPanelController.getVendorPayments);
router.get('/requests', adminPanelController.listPendingVendors);
router.post('/requests/:id/approve', adminPanelController.approveVendor);
router.post('/requests/:id/reject', adminPanelController.rejectVendor);
router.post('/requests/:id/hold', adminPanelController.holdVendor);
router.post('/requests/:id/block', adminPanelController.blockVendor);

// ── Users & People Directory ──────────────────────────────────────────
router.get('/users', adminPanelController.listUsers);
router.get('/users/analytics', adminPanelController.getUserAnalytics);
router.get('/users/:id', adminPanelController.getUserById);
router.put('/users/:id', adminPanelController.updateUserAdmin);
router.patch('/users/:id', adminPanelController.updateUserAdmin);
router.get('/users/:id/orders', adminPanelController.getUserOrdersAdmin);
router.get('/users/:id/payments', adminPanelController.getUserPaymentsAdmin);
router.get('/users/:id/timeline', adminPanelController.getUserTimelineAdmin);
router.get('/users/:id/addresses', adminPanelController.getUserAddressesAdmin);
router.get('/users/:id/notifications', adminPanelController.getUserNotificationsAdmin);
router.get('/users/:id/audit-logs', adminPanelController.getUserAuditLogsAdmin);
router.post('/users/:id/flag', adminPanelController.flagUser);
router.delete('/users/:id/flag', adminPanelController.unflagUser);
router.post('/users/:id/block', adminPanelController.blockUser);
router.post('/users/:id/unblock', adminPanelController.unblockUser);
router.put('/users/:id/status', adminPanelController.updateUserStatus);
router.patch('/users/:id/status', adminPanelController.updateUserStatus);
router.post('/users/:id/reset-password', adminPanelController.resetUserPassword);
router.delete('/users/:id', adminPanelController.deleteUser);

// ── Subscriptions ────────────────────────────────────────────────────
router.get('/subscriptions', adminPanelController.listSubscriptions);
router.get('/subscriptions/stats', adminPanelController.getFinancialStats);
router.post('/subscriptions/renew', adminPanelController.renewSubscription);
router.post('/subscriptions/:id/renew', adminPanelController.renewSubscription);
router.post('/subscriptions/cancel', adminPanelController.cancelSubscription);
router.get('/subscriptions/:id/invoice', adminPanelController.getInvoicePreview);

// ── Orders & Payments ────────────────────────────────────────────────
router.get('/orders', adminPanelController.listOrdersAdmin);
router.get('/orders/:id', adminPanelController.getOrderByIdAdmin);
router.post('/orders/:id/flag-audit', adminPanelController.flagOrderAudit);
router.get('/payments/transactions', adminPanelController.getPaymentTransactions);
router.post('/payments/refund', adminPanelController.processRefund);

// ── Promotions ───────────────────────────────────────────────────────
router.get('/promotions', adminPanelController.listPromotions);
router.post('/promotions', adminPanelController.createPromotion);
router.put('/promotions/:id', adminPanelController.updatePromotion);
router.delete('/promotions/:id', adminPanelController.deletePromotion);

// ── Sub-Admins ───────────────────────────────────────────────────────
router.get(['/sub-admins', '/subadmins'], adminPanelController.listSubAdmins);
router.post(['/sub-admins', '/subadmins'], adminPanelController.createSubAdmin);
router.put(['/sub-admins/:id', '/subadmins/:id'], adminPanelController.updateSubAdminPowers);
router.put(['/sub-admins/:id/powers', '/subadmins/:id/powers'], adminPanelController.updateSubAdminPowers);
router.post(['/sub-admins/:id/toggle-status', '/subadmins/:id/toggle-status'], adminPanelController.toggleSubAdminStatus);
router.delete(['/sub-admins/:id', '/subadmins/:id'], adminPanelController.deleteSubAdmin);

// ── Support Desk ─────────────────────────────────────────────────────
router.get('/support/tickets', adminPanelController.listSupportTickets);
router.get('/support/tickets/:id', adminPanelController.getTicketById);
router.get('/support/tickets/:id/messages', adminPanelController.getTicketMessages);
router.post('/support/tickets/:id/reply', adminPanelController.replyToTicket);
router.post('/support/tickets/:id/messages', adminPanelController.replyToTicket);
router.post('/support/tickets/:id/escalate', adminPanelController.escalateTicket);
router.post('/support/tickets/:id/deescalate', adminPanelController.deescalateTicket);
router.post('/support/tickets/:id/followers', adminPanelController.addTicketFollower);
router.post('/support/tickets/:id/merge', adminPanelController.mergeTickets);
router.post('/support/tickets/:id/unmerge', adminPanelController.unmergeTickets);
router.patch('/support/tickets/:id/status', adminPanelController.updateTicketStatus);
router.put('/support/tickets/:id/status', adminPanelController.updateTicketStatus);

// ── Executive Reports & Exports ───────────────────────────────────────
router.get('/reports/telemetry', adminPanelController.getExecutiveReports);
router.get('/reports/executive', adminPanelController.getExecutiveReports);
router.get('/reports/export', adminPanelController.exportReportData);
router.post('/reports/export', adminPanelController.exportReportData);

// ── Real-Time Notifications ──────────────────────────────────────────
router.get('/notifications', adminPanelController.listNotifications);
router.get('/notifications/history', adminPanelController.listNotifications);
router.post('/notifications/broadcast', adminPanelController.broadcastNotification);
router.patch('/notifications/read-all', adminPanelController.markAllNotificationsRead);
router.post('/notifications/read-all', adminPanelController.markAllNotificationsRead);

// ── Audit Logs ───────────────────────────────────────────────────────
router.get('/audit-logs', adminPanelController.listAuditLogs);
router.get('/audit-logs/:id', adminPanelController.listAuditLogs);
router.post('/audit-logs/export', adminPanelController.exportReportData);

// ── Platform Settings & Configuration ────────────────────────────────
router.get('/settings', adminPanelController.getPlatformConfig);
router.put('/settings', adminPanelController.updateBrandingConfig);
router.put('/settings/profile', adminPanelController.updateAdminProfile);
router.post('/settings/change-password', adminPanelController.changeAdminPassword);
router.put('/settings/email', adminPanelController.updateSettingsSection);
router.post('/settings/email/send-test', adminPanelController.sendTestEmail);
router.put('/settings/tax', adminPanelController.updateSettingsSection);
router.put('/settings/subscription-plans', adminPanelController.updateSettingsSection);
router.put('/settings/system', adminPanelController.updateSettingsSection);
router.put('/settings/notifications', adminPanelController.updateSettingsSection);
router.put('/settings/branding', adminPanelController.updateSettingsSection);
router.get('/config', adminPanelController.getPlatformConfig);
router.put('/config', adminPanelController.updateBrandingConfig);
router.post('/config', adminPanelController.updateBrandingConfig);

module.exports = router;

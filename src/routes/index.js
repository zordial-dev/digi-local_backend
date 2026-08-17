const express = require('express');
const router = express.Router();

const healthRoutes = require('./Health/healthRoutes');
const societyRoutes = require('./Storefront/societyRoutes');
const vendorAuthRoutes = require('./Vendor/vendorAuthRoutes');
const storefrontRoutes = require('./Storefront/storefrontRoutes');
const userRoutes = require('./User/userRoutes');
const orderRoutes = require('./User/orderRoutes');
const vendorPanelRoutes = require('./Vendor/vendorPanelRoutes');
const adminRoutes = require('./Admin/adminRoutes');
const authRoutes = require('./Admin/authRoutes');
const subAdminsRoutes = require('./Admin/subAdminsRoutes');
const subscriptionsRoutes = require('./Admin/subscriptionsRoutes');
const configRoutes = require('./Admin/configRoutes');
const otpRoutes = require('./otp');
const cmsRoutes = require('./Cms/cmsRoutes');
const cmsController = require('../controllers/Cms/cmsController');
const adminPanelController = require('../controllers/Admin/adminPanelController');

// ── Health & Observability Routes ───────────────────────────
router.use('/health', healthRoutes);
router.get('/version', (req, res) => res.redirect('/health/version'));

// ── Core Business API Routes ────────────────────────────────
router.use('/api/otp', otpRoutes);                 // MSG91 Mobile/Web OTP Service
router.use('/api/societies', societyRoutes);       // Society management
router.use('/api/vendors', vendorAuthRoutes);        // Vendor auth & Admin Vendor Spec
router.use('/api/stores', vendorAuthRoutes);         // Stores alias for website storefront
router.use('/api/users', userRoutes);               // Resident user auth & profile
router.use('/api/orders', orderRoutes);             // Customer orders & status pipeline
router.use('/api/vendorPanel', vendorPanelRoutes);  // Vendor dashboard & inventory
router.use('/api/admin', adminRoutes);               // Admin portal
router.use('/api/auth', authRoutes);                 // Admin Auth & Profile
router.use('/api/sub-admins', subAdminsRoutes);      // Sub-Admins & RBAC
router.use('/api/subscriptions', subscriptionsRoutes); // Financial Analytics & Subscriptions
router.use('/api/config', configRoutes);             // Platform Configuration
router.use('/api/cms', cmsRoutes);                   // Legal Pages, Help & Support & Contacts

// ── CMS & Legal Content Direct Aliases ────────────────────────
router.get('/api/help-support', cmsController.getHelpSupport);
router.get('/api/about-us', cmsController.getAboutUs);
router.get('/api/privacy-policy', cmsController.getPrivacyPolicy);
router.get('/api/terms-conditions', cmsController.getTermsConditions);
router.get('/api/support/contact-info', cmsController.getSupportContacts);
router.put('/api/admin/cms/pages/:slug', cmsController.updateCmsPageBySlug);
router.put('/api/admin/cms/contacts', cmsController.updateSupportContacts);

// ── Additional Admin Panel Specification Alias Routes ────────
router.all('/api/v1/auth/login', adminPanelController.login);
router.all('/api/v1/auth/me', adminPanelController.getMe);
router.all('/api/v1/admin/users', adminPanelController.listUsers);
router.all('/api/v1/config', adminPanelController.getPlatformConfig);

router.get('/api/people', adminPanelController.listUsers);
router.get('/api/people/analytics', adminPanelController.getUserAnalytics);
router.get('/api/people/:id', adminPanelController.getUserById);
router.post('/api/people', adminPanelController.listUsers);
router.post('/api/people/:id/flag', adminPanelController.flagUser);
router.delete('/api/people/:id/flag', adminPanelController.unflagUser);
router.delete('/api/people/:id/unflag', adminPanelController.unflagUser);
router.post('/api/people/:id/block', adminPanelController.updateUserStatus);
router.post('/api/people/:id/unblock', adminPanelController.unblockUser);
router.put('/api/people/:id/status', adminPanelController.updateUserStatus);
router.patch('/api/people/:id/status', adminPanelController.updateUserStatus);
router.delete('/api/people/:id', adminPanelController.deleteUser);

router.get('/api/payments/transactions', adminPanelController.getPaymentTransactions);
router.get('/api/payments/revenue-dashboard', adminPanelController.getRevenueDashboard);
router.post('/api/payments/refund', adminPanelController.processRefund);
router.post('/api/payments/:id/refund', adminPanelController.processRefund);
router.get('/api/payments/:id/receipt', adminPanelController.downloadPaymentReceipt);
router.get('/api/payments/:id/invoice', adminPanelController.downloadPaymentInvoice);

router.get('/api/promotions', adminPanelController.listPromotions);
router.post('/api/promotions', adminPanelController.createPromotion);
router.put('/api/promotions/:id', adminPanelController.updatePromotion);
router.delete('/api/promotions/:id', adminPanelController.deletePromotion);

router.get('/api/support/tickets', adminPanelController.listSupportTickets);
router.get('/api/support/tickets/:id', adminPanelController.getTicketById);
router.get('/api/support/tickets/:id/messages', adminPanelController.getTicketMessages);
router.post('/api/support/tickets/:id/reply', adminPanelController.replyToTicket);
router.post('/api/support/tickets/:id/messages', adminPanelController.replyToTicket);
router.post('/api/support/tickets/:id/escalate', adminPanelController.escalateTicket);
router.post('/api/support/tickets/:id/deescalate', adminPanelController.deescalateTicket);
router.post('/api/support/tickets/:id/followers', adminPanelController.addTicketFollower);
router.post('/api/support/tickets/:id/merge', adminPanelController.mergeTickets);
router.post('/api/support/tickets/:id/unmerge', adminPanelController.unmergeTickets);
router.patch('/api/support/tickets/:id/status', adminPanelController.updateTicketStatus);
router.put('/api/support/tickets/:id/status', adminPanelController.updateTicketStatus);

router.get('/api/reports/telemetry', adminPanelController.getExecutiveReports);
router.get('/api/reports/executive', adminPanelController.getExecutiveReports);
router.get('/api/reports/export', adminPanelController.exportReportData);
router.post('/api/reports/export', adminPanelController.exportReportData);

router.get('/api/notifications', adminPanelController.listNotifications);
router.get('/api/notifications/history', adminPanelController.listNotifications);
router.post('/api/notifications/broadcast', adminPanelController.broadcastNotification);
router.patch('/api/notifications/read-all', adminPanelController.markAllNotificationsRead);
router.post('/api/notifications/read-all', adminPanelController.markAllNotificationsRead);

router.get('/api/audit-logs', adminPanelController.listAuditLogs);
router.get('/api/audit-logs/:id', adminPanelController.listAuditLogs);
router.post('/api/audit-logs/export', adminPanelController.exportReportData);

router.get('/api/settings', adminPanelController.getPlatformConfig);
router.put('/api/settings', adminPanelController.updateBrandingConfig);
router.put('/api/settings/profile', adminPanelController.updateAdminProfile);
router.post('/api/settings/change-password', adminPanelController.changeAdminPassword);
router.put('/api/settings/email', adminPanelController.updateSettingsSection);
router.post('/api/settings/email/send-test', adminPanelController.sendTestEmail);
router.put('/api/settings/tax', adminPanelController.updateSettingsSection);
router.put('/api/settings/subscription-plans', adminPanelController.updateSettingsSection);
router.put('/api/settings/system', adminPanelController.updateSettingsSection);
router.put('/api/settings/notifications', adminPanelController.updateSettingsSection);
router.put('/api/settings/branding', adminPanelController.updateSettingsSection);

router.get('/api/subadmins', adminPanelController.listSubAdmins);
router.post('/api/subadmins', adminPanelController.createSubAdmin);
router.put('/api/subadmins/:id', adminPanelController.updateSubAdminPowers);

router.use('/api', storefrontRoutes);                // Storefront APIs (vendors/societies)

module.exports = router;

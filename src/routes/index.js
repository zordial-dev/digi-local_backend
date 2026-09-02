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
const enquiryController = require('../controllers/Vendor/enquiryController');
const subAdminsController = require('../controllers/Admin/subAdminsController');
const { authenticateAdminToken, requirePower, requireSuperAdmin } = require('../middleware/adminAuth');

// ── Health & Observability Routes ───────────────────────────
router.use('/health', healthRoutes);
router.get('/version', (req, res) => res.redirect('/health/version'));

// ── Service Vendor Enquiry Direct Routes ────────────────────
router.post('/api/enquiries', enquiryController.createEnquiry);
router.post('/api/vendors/enquiries', enquiryController.createEnquiry);
router.post('/api/vendors/:vendorId/enquiries', enquiryController.createEnquiry);
router.get('/api/vendors/:vendorId/enquiries', enquiryController.getVendorEnquiries);
router.get('/api/user/:userId/enquiries', enquiryController.getUserEnquiries);
router.get('/api/users/:userId/enquiries', enquiryController.getUserEnquiries);
router.patch('/api/enquiries/:enquiryId', enquiryController.updateEnquiryStatus);
router.put('/api/enquiries/:enquiryId', enquiryController.updateEnquiryStatus);
router.patch('/api/vendors/:vendorId/enquiries/:enquiryId', enquiryController.updateEnquiryStatus);

// ── Core Business API Routes ────────────────────────────────
router.use('/api/otp', otpRoutes);                 // MSG91 Mobile/Web OTP Service
router.use('/api/societies', societyRoutes);       // Society management
router.use('/api/vendors', vendorAuthRoutes);        // Vendor auth & Admin Vendor Spec
router.use('/api/vendor', vendorAuthRoutes);         // Singular Vendor alias
router.use('/api/stores', vendorAuthRoutes);         // Stores alias for website storefront
router.use('/api/users', userRoutes);               // Resident user auth & profile
router.use('/api/orders', orderRoutes);             // Customer orders & status pipeline
router.use('/api/vendorPanel', vendorPanelRoutes);  // Vendor dashboard & inventory
router.use('/api/admin', adminRoutes);               // Admin portal
router.use('/api/auth', authRoutes);                 // Admin Auth & Profile
router.use('/api/sub-admins', subAdminsRoutes);      // Sub-Admins & RBAC
router.use('/api/subscriptions', subscriptionsRoutes); // Financial Analytics & Subscriptions
const storefrontController = require('../controllers/Storefront/storefrontController');

// ── Categories & Platform Config Direct Endpoints ──────────
router.get('/api/categories', storefrontController.getCategories);
router.get('/api/vendors/categories', storefrontController.getCategories);
router.get('/api/stores/categories', storefrontController.getCategories);
router.get('/api/platform/config', adminPanelController.getPlatformConfig);
router.get('/api/platform/settings', adminPanelController.getPlatformConfig);

// ── CMS & Legal Content Direct Aliases ────────────────────────
router.get('/api/help-support', cmsController.getHelpSupport);
router.get('/api/about-us', cmsController.getAboutUs);
router.get('/api/privacy-policy', cmsController.getPrivacyPolicy);
router.get('/api/terms-conditions', cmsController.getTermsConditions);
router.get('/api/support/contact-info', cmsController.getSupportContacts);
router.put('/api/admin/cms/pages/:slug', cmsController.updateCmsPageBySlug);
router.put('/api/admin/cms/contacts', cmsController.updateSupportContacts);

// ── Additional Admin Panel Specification Alias Routes ────────
router.get('/api/dashboard', adminPanelController.getDashboardData);
router.get('/api/admin/dashboard', adminPanelController.getDashboardData);
router.get('/api/vendors/:id/payments', adminPanelController.getVendorPayments);

router.all('/api/v1/auth/login', adminPanelController.login);
router.all('/api/v1/auth/me', adminPanelController.getMe);
router.all('/api/v1/admin/users', adminPanelController.listUsers);
router.all('/api/v1/config', adminPanelController.getPlatformConfig);

router.get('/api/people', adminPanelController.listUsers);
router.get('/api/people/analytics', adminPanelController.getUserAnalytics);
router.get('/api/people/:id', adminPanelController.getUserById);
router.get('/api/people/:id/orders', adminPanelController.getUserOrdersAdmin);
router.get('/api/people/:id/payments', adminPanelController.getUserPaymentsAdmin);
router.get('/api/people/:id/timeline', adminPanelController.getUserTimelineAdmin);
router.get('/api/people/:id/addresses', adminPanelController.getUserAddressesAdmin);
router.get('/api/people/:id/notifications', adminPanelController.getUserNotificationsAdmin);
router.get('/api/people/:id/audit-logs', adminPanelController.getUserAuditLogsAdmin);
router.post('/api/people', adminPanelController.listUsers);
router.post('/api/people/:id/flag', adminPanelController.flagUser);
router.delete('/api/people/:id/flag', adminPanelController.unflagUser);
router.delete('/api/people/:id/unflag', adminPanelController.unflagUser);
router.post('/api/people/:id/strike', adminPanelController.strikeUser);
router.delete('/api/people/:id/strike', adminPanelController.unstrikeUser);
router.post('/api/people/:id/unstrike', adminPanelController.unstrikeUser);
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

const supportController = require('../controllers/Support/supportController');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const supportUpload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ── Admin Panel Support Desk (adminMock) ─────────────────────────────────
router.get(['/api/admin/support/tickets', '/api/support/tickets'], supportController.listAdminTickets);
router.get(['/api/admin/support/analytics', '/api/support/analytics'], supportController.getAnalytics);
router.get(['/api/admin/support/sla', '/api/support/sla'], supportController.getSlaConfig);
router.put(['/api/admin/support/sla', '/api/support/sla'], supportController.updateSlaConfig);
router.get(['/api/admin/support/tags', '/api/support/tags'], supportController.getTags);
router.post(['/api/admin/support/tags', '/api/support/tags'], supportController.createTag);
router.delete(['/api/admin/support/tags/:tagId', '/api/support/tags/:tagId'], supportController.deleteTag);

router.get(['/api/admin/support/tickets/:ticketId', '/api/admin/support/tickets/:id', '/api/support/tickets/:ticketId', '/api/support/tickets/:id'], supportController.getTicketById);
router.get(['/api/admin/support/tickets/:ticketId/messages', '/api/admin/support/tickets/:id/messages', '/api/support/tickets/:ticketId/messages', '/api/support/tickets/:id/messages'], supportController.getTicketMessages);
router.post(['/api/admin/support/tickets/:ticketId/reply', '/api/admin/support/tickets/:id/reply', '/api/support/tickets/:ticketId/reply', '/api/support/tickets/:id/reply', '/api/support/tickets/:id/messages'], supportController.replyToTicket);
router.post(['/api/admin/support/tickets/:ticketId/escalate', '/api/support/tickets/:ticketId/escalate', '/api/support/tickets/:id/escalate'], supportController.escalateTicket);
router.post(['/api/admin/support/tickets/:ticketId/deescalate', '/api/support/tickets/:ticketId/deescalate', '/api/support/tickets/:id/deescalate'], supportController.deescalateTicket);
router.post(['/api/admin/support/tickets/:ticketId/followers', '/api/support/tickets/:ticketId/followers', '/api/support/tickets/:id/followers'], supportController.manageFollowers);
router.post(['/api/admin/support/tickets/:ticketId/merge', '/api/support/tickets/:ticketId/merge', '/api/support/tickets/:id/merge'], supportController.mergeTickets);
router.post(['/api/admin/support/tickets/:ticketId/unmerge', '/api/support/tickets/:ticketId/unmerge', '/api/support/tickets/:id/unmerge'], supportController.unmergeTickets);
router.patch(['/api/admin/support/tickets/:ticketId/status', '/api/admin/support/tickets/:id/status', '/api/support/tickets/:ticketId/status', '/api/support/tickets/:id/status'], supportController.updateTicketStatus);
router.put(['/api/admin/support/tickets/:ticketId/status', '/api/admin/support/tickets/:id/status', '/api/support/tickets/:ticketId/status', '/api/support/tickets/:id/status'], supportController.updateTicketStatus);
router.post(['/api/admin/support/tickets/:ticketId/attachments', '/api/support/tickets/:ticketId/attachments', '/api/support/tickets/:id/attachments'], supportUpload.single('file'), supportController.uploadAttachment);

// ── Resident User Mobile App & Website (user-app) ────────────────────────
router.post(['/api/user/tickets', '/api/users/tickets'], supportController.createCustomerTicket);
router.get(['/api/user/tickets', '/api/users/tickets'], supportController.getUserTickets);
router.post(['/api/user/tickets/:ticketId/reply', '/api/user/tickets/:id/reply', '/api/users/tickets/:ticketId/reply', '/api/users/tickets/:id/reply'], supportController.userReplyToTicket);

// ── Merchant Vendor Mobile App & Portal (vendor-portal) ──────────────────
router.post(['/api/vendor/tickets', '/api/vendors/tickets'], supportController.createVendorTicket);
router.get(['/api/vendor/tickets', '/api/vendors/tickets'], supportController.getVendorTickets);

const vendorPanelController = require('../controllers/Vendor/vendorPanelController');
router.get(['/api/vendor/:vendorId/purchases', '/api/vendors/:vendorId/purchases', '/api/vendorPanel/:vendorId/purchases', '/api/vendor/:vendorId/my-orders', '/api/vendors/:vendorId/my-orders', '/api/orders/vendor-purchases/:vendorId'], vendorPanelController.getVendorPurchases);



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

router.get('/api/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.post('/api/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);
router.put('/api/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);

// ── v3.0.0 Sub-Admin RBAC & Audit Ledger Endpoints ──────────

router.post('/api/v1/auth/admin/login', subAdminsController.subAdminLogin);
router.post('/api/auth/admin/login', subAdminsController.subAdminLogin);
router.post('/api/admin/auth/login', subAdminsController.subAdminLogin);

router.get('/api/v1/admin/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.get('/api/v1/admin/sub-admins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.post('/api/v1/admin/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);
router.post('/api/v1/admin/sub-admins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);
router.put('/api/v1/admin/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.put('/api/v1/admin/sub-admins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.post('/api/v1/admin/subadmins/:id/toggle-status', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.toggleSubAdminStatus);
router.post('/api/v1/admin/sub-admins/:id/toggle-status', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.toggleSubAdminStatus);
router.delete('/api/v1/admin/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.deleteSubAdmin);
router.delete('/api/v1/admin/sub-admins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.deleteSubAdmin);

router.post('/api/v1/admin/audit-logs', authenticateAdminToken, subAdminsController.recordAuditLog);
router.post('/api/admin/audit-logs', authenticateAdminToken, subAdminsController.recordAuditLog);
router.get('/api/v1/admin/audit-logs', authenticateAdminToken, requireSuperAdmin, subAdminsController.getAuditLogs);
router.get('/api/admin/audit-logs', authenticateAdminToken, requireSuperAdmin, subAdminsController.getAuditLogs);

const vendorPanelController = require('../controllers/Vendor/vendorPanelController');
router.post('/api/upload', vendorPanelController.uploadImage);
router.post('/api/upload-image', vendorPanelController.uploadImage);
router.post('/api/upload-logo', vendorPanelController.uploadImage);

router.use('/api', storefrontRoutes);                // Storefront APIs (vendors/societies)

module.exports = router;

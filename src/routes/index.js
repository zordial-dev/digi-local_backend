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
const ratingRoutes = require('./Rating/ratingRoutes');
const cmsController = require('../controllers/Cms/cmsController');
const adminPanelController = require('../controllers/Admin/adminPanelController');
const ordersController = require('../controllers/User/ordersController');
const usersController = require('../controllers/User/usersController');
const otpController = require('../controllers/otpController');
const enquiryController = require('../controllers/Vendor/enquiryController');
const serviceController = require('../controllers/Vendor/serviceController');
const subAdminsController = require('../controllers/Admin/subAdminsController');
const vendorPanelController = require('../controllers/Vendor/vendorPanelController');
const vendorAuthController = require('../controllers/Vendor/vendorAuthController');
const { authenticateAdminToken, requirePower, requireSuperAdmin } = require('../middleware/adminAuth');
const { authenticateToken, requireVendor, requireVendorOwner, requireUser, requireUserOwner } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const { query } = require('../models/db');


// ── Health & Observability Routes ───────────────────────────
router.use('/health', healthRoutes);
router.get('/version', (req, res) => res.redirect('/health/version'));
router.get(['/ping', '/api/ping'], (req, res) => res.status(200).json({ status: 'ok', message: 'pong', timestamp: new Date().toISOString() }));

// ── Service Vendor Enquiry Direct Routes ────────────────────
router.post('/api/enquiries', authenticateToken, requireUser, enquiryController.createEnquiry);
router.post('/api/vendors/enquiries', authenticateToken, requireUser, enquiryController.createEnquiry);
router.post('/api/vendors/:vendorId/enquiries', authenticateToken, requireUser, enquiryController.createEnquiry);
router.get('/api/vendors/:vendorId/enquiries', authenticateToken, requireVendorOwner, enquiryController.getVendorEnquiries);
router.get('/api/user/:userId/enquiries', authenticateToken, requireUserOwner, enquiryController.getUserEnquiries);
router.get('/api/users/:userId/enquiries', authenticateToken, requireUserOwner, enquiryController.getUserEnquiries);
router.patch('/api/enquiries/:enquiryId', authenticateToken, requireVendor, enquiryController.updateEnquiryStatus);
router.put('/api/enquiries/:enquiryId', authenticateToken, requireVendor, enquiryController.updateEnquiryStatus);
router.patch('/api/vendors/:vendorId/enquiries/:enquiryId', authenticateToken, requireVendorOwner, enquiryController.updateEnquiryStatus);

// ── Service Vendor Services Direct & Global Routes ───────────
router.get(['/api/services', '/services'], serviceController.getAllServices);
router.post(['/api/vendors/:vendorId/services', '/api/vendor/:vendorId/services'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.addService);
router.get(['/api/vendors/:vendorId/services', '/api/vendor/:vendorId/services'], serviceController.getVendorServices);
router.get(['/api/vendors/:vendorId/services/:serviceId', '/api/services/:serviceId'], serviceController.getServiceById);
router.put(['/api/vendors/:vendorId/services/:serviceId', '/api/vendor/:vendorId/services/:serviceId', '/api/services/:serviceId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.updateService);
router.patch(['/api/vendors/:vendorId/services/:serviceId', '/api/vendor/:vendorId/services/:serviceId', '/api/services/:serviceId'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.updateService);
router.post(['/api/vendors/:vendorId/services/:serviceId', '/api/vendor/:vendorId/services/:serviceId', '/api/services/:serviceId', '/api/services/:serviceId/edit', '/api/services/:serviceId/update'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.updateService);

// Dedicated Service Photo / Image Update Endpoints (Vendor Owner Only)
router.post(['/api/vendors/:vendorId/services/:serviceId/image', '/api/vendors/:vendorId/services/:serviceId/photo', '/api/services/:serviceId/image', '/api/services/:serviceId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.updateServiceImage);
router.put(['/api/vendors/:vendorId/services/:serviceId/image', '/api/vendors/:vendorId/services/:serviceId/photo', '/api/services/:serviceId/image', '/api/services/:serviceId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.updateServiceImage);
router.patch(['/api/vendors/:vendorId/services/:serviceId/image', '/api/vendors/:vendorId/services/:serviceId/photo', '/api/services/:serviceId/image', '/api/services/:serviceId/photo'], upload.any(), handleMulterError, authenticateToken, requireVendorOwner, serviceController.updateServiceImage);

router.patch(['/api/vendors/:vendorId/services/:serviceId/availability', '/api/services/:serviceId/availability'], authenticateToken, requireVendorOwner, serviceController.toggleServiceAvailability);
router.put(['/api/vendors/:vendorId/services/:serviceId/availability', '/api/services/:serviceId/availability'], authenticateToken, requireVendorOwner, serviceController.toggleServiceAvailability);
router.delete(['/api/vendors/:vendorId/services/:serviceId', '/api/services/:serviceId'], authenticateToken, requireVendorOwner, serviceController.deleteService);

// ── Account Pre-Check Route (User / Vendor Existence Check) ────
router.post(['/api/auth/check-account', '/api/auth/check-user', '/api/auth/check-exists', '/api/check-phone', '/auth/check-account', '/api/users/check-account', '/api/users/check-phone'], usersController.checkAccountExists);
router.get(['/api/auth/check-account', '/api/auth/check-user', '/api/auth/check-exists', '/api/check-phone', '/auth/check-account', '/api/users/check-account', '/api/users/check-phone'], usersController.checkAccountExists);

// ── Core Business API Routes ────────────────────────────────
router.use('/api/otp', otpRoutes);                 // Message Central Mobile/Web OTP Service
router.use('/api/societies', societyRoutes);       // Society management
router.use('/api/vendors', vendorAuthRoutes);        // Vendor auth & Admin Vendor Spec
router.use('/api/vendor', vendorAuthRoutes);         // Singular Vendor alias
router.use('/api/stores', vendorAuthRoutes);         // Stores alias for website storefront
router.use('/api/users', userRoutes);               // Resident user auth & profile
router.use('/api/orders', orderRoutes);             // Customer orders & status pipeline
router.use('/api/vendorPanel', vendorPanelRoutes);  // Vendor dashboard & inventory
router.use(['/api/admin', '/api/admin/panel'], adminRoutes);               // Admin portal
router.use('/api/auth', authRoutes);                 // Admin Auth & Profile
router.use('/api/sub-admins', subAdminsRoutes);      // Sub-Admins & RBAC
router.use('/api/subscriptions', subscriptionsRoutes); // Financial Analytics & Subscriptions
router.use('/api/config', configRoutes);               // Platform Branding & Security Config
router.use(ratingRoutes);                                  // Vendor Ratings & Reviews
const storefrontController = require('../controllers/Storefront/storefrontController');

const subscriptionController = require('../controllers/Subscription/subscriptionController');

// ── Plans & Coupons Direct Aliases ─────────────────────────
router.get('/api/plans', subscriptionController.getPlans.bind(subscriptionController));
router.get('/api/coupons', subscriptionController.getCoupons.bind(subscriptionController));
router.post('/api/coupons/apply', subscriptionController.applyCoupon.bind(subscriptionController));

// ── Vendor Subscription Status & Action Direct Aliases ─────
router.get([
  '/api/vendorPanel/:vendorId/subscription-status',
  '/api/vendors/:vendorId/subscription-status',
  '/api/vendor/:vendorId/subscription-status',
  '/api/subscriptions/status/:vendorId',
  '/api/subscriptions/:vendorId/status'
], authenticateToken, requireVendorOwner, subscriptionController.getVendorSubscriptionStatus.bind(subscriptionController));

router.post([
  '/api/vendorPanel/:vendorId/subscribe',
  '/api/vendorPanel/:vendorId/renew',
  '/api/vendors/:vendorId/subscribe',
  '/api/vendors/:vendorId/renew',
  '/api/vendor/:vendorId/subscribe',
  '/api/vendor/:vendorId/renew',
  '/api/subscriptions/subscribe',
  '/api/subscriptions/:vendorId/subscribe',
  '/api/subscriptions/:vendorId/renew'
], authenticateToken, requireVendorOwner, subscriptionController.subscribe.bind(subscriptionController));

router.post([
  '/api/subscriptions/create-payment-session',
  '/api/subscriptions/create-session',
  '/api/subscriptions/pay',
  '/api/subscriptions/:vendorId/create-payment-session',
  '/api/subscriptions/:vendorId/pay',
  '/api/vendorPanel/:vendorId/subscription-session',
  '/api/vendorPanel/:vendorId/create-payment-session',
  '/api/payments/cashfree/subscription-session',
  '/api/payments/cashfree/create-subscription-session'
], authenticateToken, requireVendorOwner, subscriptionController.createPaymentSession.bind(subscriptionController));

router.post([
  '/api/subscriptions/verify-payment',
  '/api/subscriptions/verify',
  '/api/subscriptions/:vendorId/verify-payment',
  '/api/subscriptions/:vendorId/verify',
  '/api/vendorPanel/:vendorId/verify-subscription',
  '/api/vendorPanel/:vendorId/verify-payment',
  '/api/payments/cashfree/verify-subscription',
  '/api/payments/cashfree/verify-subscription-payment'
], authenticateToken, requireVendorOwner, subscriptionController.verifyPayment.bind(subscriptionController));

// ── Categories & Platform Config Direct Endpoints ──────────
router.get('/api/categories', storefrontController.getCategories);
router.get('/api/vendors/categories', storefrontController.getCategories);
router.get('/api/stores/categories', storefrontController.getCategories);
router.get('/api/platform/config', adminPanelController.getPlatformConfig);
router.get('/api/platform/settings', adminPanelController.getPlatformConfig);

// ── Bank & IFSC Lookup Direct Aliases ─────────────────────────
router.get(['/api/bank/:ifsc', '/api/ifsc/:ifsc', '/api/bank-details/:ifsc'], vendorAuthController.getBankDetailsByIfsc);
router.get(['/api/bank', '/api/ifsc', '/api/bank-details'], vendorAuthController.getBankDetailsByIfsc);

// ── CMS & Legal Content Direct Aliases ────────────────────────
router.get('/api/help-support', cmsController.getHelpSupport);
router.get('/api/about-us', cmsController.getAboutUs);
router.get('/api/privacy-policy', cmsController.getPrivacyPolicy);
router.get('/api/terms-conditions', cmsController.getTermsConditions);
router.get('/api/support/contact-info', cmsController.getSupportContacts);
router.put('/api/admin/cms/pages/:slug', authenticateAdminToken, requirePower('SETTINGS'), cmsController.updateCmsPageBySlug);
router.put('/api/admin/cms/contacts', authenticateAdminToken, requirePower('SETTINGS'), cmsController.updateSupportContacts);

// ── Additional Admin Panel Specification Alias Routes (Admin Only) ────
router.get('/api/dashboard', authenticateAdminToken, adminPanelController.getDashboardData);
router.get('/api/admin/dashboard', authenticateAdminToken, adminPanelController.getDashboardData);
router.get('/api/vendors/:id/payments', authenticateAdminToken, requirePower('VENDORS'), adminPanelController.getVendorPayments);

router.all('/api/v1/auth/login', adminPanelController.login);
router.all('/api/v1/auth/me', authenticateAdminToken, adminPanelController.getMe);
router.all('/api/v1/admin/users/strikes', authenticateAdminToken, adminPanelController.listAllUserStrikesAdmin);
router.all('/api/v1/admin/users', authenticateAdminToken, adminPanelController.listUsers);
router.all('/api/v1/config', adminPanelController.getPlatformConfig);

router.get('/api/people', authenticateAdminToken, adminPanelController.listUsers);
router.get('/api/people/analytics', authenticateAdminToken, adminPanelController.getUserAnalytics);
router.get('/api/people/strikes', authenticateAdminToken, adminPanelController.listAllUserStrikesAdmin);
router.get('/api/people/:id', authenticateAdminToken, adminPanelController.getUserById);
router.get('/api/people/:id/orders', authenticateAdminToken, adminPanelController.getUserOrdersAdmin);
router.get('/api/people/:id/payments', authenticateAdminToken, adminPanelController.getUserPaymentsAdmin);
router.get('/api/people/:id/timeline', authenticateAdminToken, adminPanelController.getUserTimelineAdmin);
router.get('/api/people/:id/addresses', authenticateAdminToken, adminPanelController.getUserAddressesAdmin);
router.get('/api/people/:id/notifications', authenticateAdminToken, adminPanelController.getUserNotificationsAdmin);
router.get('/api/people/:id/audit-logs', authenticateAdminToken, adminPanelController.getUserAuditLogsAdmin);
router.get('/api/people/:id/strike', authenticateAdminToken, adminPanelController.getUserStrikesAdmin);
router.get('/api/people/:id/strikes', authenticateAdminToken, adminPanelController.getUserStrikesAdmin);
router.post('/api/people', authenticateAdminToken, adminPanelController.listUsers);
router.post('/api/people/:id/flag', authenticateAdminToken, adminPanelController.flagUser);
router.delete('/api/people/:id/flag', authenticateAdminToken, adminPanelController.unflagUser);
router.delete('/api/people/:id/unflag', authenticateAdminToken, adminPanelController.unflagUser);
router.post('/api/people/:id/strike', authenticateAdminToken, adminPanelController.strikeUser);
router.delete('/api/people/:id/strike', authenticateAdminToken, adminPanelController.unstrikeUser);
router.post('/api/people/:id/unstrike', authenticateAdminToken, adminPanelController.unstrikeUser);
router.post('/api/people/:id/block', authenticateAdminToken, adminPanelController.updateUserStatus);
// Unban / Unblock — resets status to ACTIVE + clears all strikes to 0
router.post('/api/people/:id/unban', authenticateAdminToken, adminPanelController.unbanUser);
router.post('/api/people/:id/unblock', authenticateAdminToken, adminPanelController.unbanUser);
router.delete('/api/people/:id/ban', authenticateAdminToken, adminPanelController.unbanUser);
router.put('/api/people/:id/status', authenticateAdminToken, adminPanelController.updateUserStatus);
router.patch('/api/people/:id/status', authenticateAdminToken, adminPanelController.updateUserStatus);
router.get(['/api/v1/admin/users/:id/strike', '/api/v1/admin/users/:id/strikes'], authenticateAdminToken, adminPanelController.getUserStrikesAdmin);
router.post(['/api/v1/admin/users/:id/strike'], authenticateAdminToken, adminPanelController.strikeUser);
router.delete(['/api/v1/admin/users/:id/strike'], authenticateAdminToken, adminPanelController.unstrikeUser);
router.post(['/api/v1/admin/users/:id/unstrike'], authenticateAdminToken, adminPanelController.unstrikeUser);
// Unban v1 routes
router.post(['/api/v1/admin/users/:id/unban', '/api/v1/admin/users/:id/unblock', '/api/admin/users/:id/unban'], authenticateAdminToken, adminPanelController.unbanUser);
router.delete(['/api/v1/admin/users/:id/ban', '/api/admin/users/:id/ban'], authenticateAdminToken, adminPanelController.unbanUser);
router.all(['/api/v1/admin/users/:id', '/api/v1/users/:id'], authenticateAdminToken, adminPanelController.getUserById);
router.put(['/api/people/:id', '/api/v1/admin/users/:id'], authenticateAdminToken, adminPanelController.updateUserAdmin);
router.patch(['/api/people/:id', '/api/v1/admin/users/:id'], authenticateAdminToken, adminPanelController.updateUserAdmin);
router.delete('/api/people/:id', authenticateAdminToken, adminPanelController.deleteUser);

// Vendor Unban / Unblock & Strikes (Admin Only)
router.post(['/api/vendors/:id/unblock', '/api/vendors/:id/unban', '/api/v1/admin/vendors/:id/unban', '/api/v1/admin/vendors/:id/unblock', '/api/admin/vendors/:id/unblock', '/api/admin/vendors/:id/unban'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unbanVendor);
router.delete(['/api/admin/vendors/:id/ban', '/api/admin/vendors/:id/block', '/api/v1/admin/vendors/:id/ban', '/api/v1/admin/vendors/:id/block'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unbanVendor);
router.get(['/api/vendors/:id/strike', '/api/vendors/:id/strikes', '/api/admin/vendors/:id/strike', '/api/admin/vendors/:id/strikes', '/api/v1/admin/vendors/:id/strike', '/api/v1/admin/vendors/:id/strikes'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.getVendorStrikesAdmin);
router.post(['/api/vendors/:id/strike', '/api/admin/vendors/:id/strike', '/api/v1/admin/vendors/:id/strike'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.strikeVendor);
router.delete(['/api/vendors/:id/strike', '/api/admin/vendors/:id/strike', '/api/v1/admin/vendors/:id/strike'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unstrikeVendor);
router.post(['/api/vendors/:id/unstrike', '/api/admin/vendors/:id/unstrike', '/api/v1/admin/vendors/:id/unstrike'], authenticateAdminToken, requirePower('VENDORS'), adminPanelController.unstrikeVendor);

const cashfreePaymentController = require('../controllers/Payment/cashfreePaymentController');

// ── Cashfree Payment Gateway Routes (PG v3) ───────────────────
router.post([
  '/api/payments/create-order',
  '/api/payments/create-order-session',
  '/api/payments/cashfree/create-order-session',
  '/api/payments/cashfree/create-session',
  '/api/payments/cashfree/create-order'
], cashfreePaymentController.createOrderPaymentSession);

router.post([
  '/api/payments/verify',
  '/api/payments/verify-order',
  '/api/payments/verify-payment',
  '/api/payments/cashfree/verify',
  '/api/payments/cashfree/verify-order'
], cashfreePaymentController.verifyOrderPayment);

router.post([
  '/api/payments/pay-vendor-direct',
  '/api/payments/cashfree/pay-vendor-direct'
], cashfreePaymentController.payVendorDirect);

router.post([
  '/api/payments/verify-direct',
  '/api/payments/cashfree/verify-direct'
], cashfreePaymentController.verifyDirectPayment);

router.post([
  '/api/payments/confirm-direct-upi',
  '/api/payments/cashfree/confirm-direct-upi'
], cashfreePaymentController.confirmDirectUpiPayment);

router.post([
  '/api/payments/webhook',
  '/api/payments/cashfree/webhook'
], cashfreePaymentController.cashfreeWebhook);

router.post([
  '/api/payments/cashfree/refund',
  '/api/payments/cashfree/process-refund'
], cashfreePaymentController.processOrderRefund);

router.get([
  '/api/payments/cashfree/refund-status/:orderId',
  '/api/payments/refund-status/:orderId'
], ordersController.getOrderRefundStatus);

router.post([
  '/api/orders/:id/cancel',
  '/api/orders/:id/user-cancel'
], ordersController.cancelOrder);
router.put([
  '/api/orders/:id/cancel',
  '/api/orders/:id/user-cancel'
], ordersController.cancelOrder);

router.get([
  '/api/vendors/:vendorId/cashfree-payments',
  '/api/vendor/:vendorId/cashfree-payments',
  '/api/vendors/:vendorId/payments'
], cashfreePaymentController.getVendorCashfreePayments);

router.get([
  '/api/admin/payments/cashfree-ledger',
  '/api/admin/payments/ledger',
  '/api/payments/ledger'
], authenticateAdminToken, requirePower('SUBSCRIPTIONS'), cashfreePaymentController.getAdminCashfreeLedger);

router.get('/api/payments/transactions', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.getPaymentTransactions);
router.get('/api/payments/revenue-dashboard', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.getRevenueDashboard);
router.post('/api/payments/refund', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.processRefund);
router.post('/api/payments/:id/refund', authenticateAdminToken, requirePower('SUBSCRIPTIONS'), adminPanelController.processRefund);
router.get('/api/payments/:id/receipt', authenticateAdminToken, adminPanelController.downloadPaymentReceipt);
router.get('/api/payments/:id/invoice', authenticateAdminToken, adminPanelController.downloadPaymentInvoice);

router.get('/api/promotions', adminPanelController.listPromotions);
router.post('/api/promotions', authenticateAdminToken, adminPanelController.createPromotion);
router.put('/api/promotions/:id', authenticateAdminToken, adminPanelController.updatePromotion);
router.delete('/api/promotions/:id', authenticateAdminToken, adminPanelController.deletePromotion);

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

// ── Admin Panel Support Desk (adminMock - Admin Only) ─────────────────────────────────
router.get(['/api/admin/support/tickets', '/api/support/tickets'], authenticateAdminToken, requirePower('SUPPORT'), supportController.listAdminTickets);
router.get(['/api/admin/support/tickets/overdue', '/api/support/tickets/overdue'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getOverdueTickets);
router.get(['/api/admin/support/tickets/sla-summary', '/api/support/tickets/sla-summary'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getSlaSummary);
router.get(['/api/admin/support/analytics', '/api/support/analytics'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getAnalytics);
router.get(['/api/admin/support/sla', '/api/support/sla'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getSlaConfig);
router.put(['/api/admin/support/sla', '/api/support/sla'], authenticateAdminToken, requirePower('SUPPORT'), supportController.updateSlaConfig);
router.get(['/api/admin/support/tags', '/api/support/tags'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getTags);
router.post(['/api/admin/support/tags', '/api/support/tags'], authenticateAdminToken, requirePower('SUPPORT'), supportController.createTag);
router.delete(['/api/admin/support/tags/:tagId', '/api/support/tags/:tagId'], authenticateAdminToken, requirePower('SUPPORT'), supportController.deleteTag);

router.patch(['/api/admin/support/tickets/:ticketId/reset-sla', '/api/support/tickets/:ticketId/reset-sla', '/api/admin/support/tickets/:id/reset-sla', '/api/support/tickets/:id/reset-sla'], authenticateAdminToken, requirePower('SUPPORT'), supportController.resetOrExtendSla);
router.post(['/api/admin/support/tickets/:ticketId/reset-sla', '/api/support/tickets/:ticketId/reset-sla', '/api/admin/support/tickets/:id/reset-sla', '/api/support/tickets/:id/reset-sla'], authenticateAdminToken, requirePower('SUPPORT'), supportController.resetOrExtendSla);
router.get(['/api/admin/support/tickets/:ticketId', '/api/admin/support/tickets/:id', '/api/support/tickets/:ticketId', '/api/support/tickets/:id'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getTicketById);
router.get(['/api/admin/support/tickets/:ticketId/messages', '/api/admin/support/tickets/:id/messages', '/api/support/tickets/:ticketId/messages', '/api/support/tickets/:id/messages'], authenticateAdminToken, requirePower('SUPPORT'), supportController.getTicketMessages);
router.post(['/api/admin/support/tickets/:ticketId/reply', '/api/admin/support/tickets/:id/reply', '/api/support/tickets/:ticketId/reply', '/api/support/tickets/:id/reply', '/api/support/tickets/:id/messages'], authenticateAdminToken, requirePower('SUPPORT'), supportController.replyToTicket);
router.post(['/api/admin/support/tickets/:ticketId/escalate', '/api/support/tickets/:ticketId/escalate', '/api/support/tickets/:id/escalate'], authenticateAdminToken, requirePower('SUPPORT'), supportController.escalateTicket);
router.post(['/api/admin/support/tickets/:ticketId/deescalate', '/api/support/tickets/:ticketId/deescalate', '/api/support/tickets/:id/deescalate'], authenticateAdminToken, requirePower('SUPPORT'), supportController.deescalateTicket);
router.post(['/api/admin/support/tickets/:ticketId/followers', '/api/support/tickets/:ticketId/followers', '/api/support/tickets/:id/followers'], authenticateAdminToken, requirePower('SUPPORT'), supportController.manageFollowers);
router.post(['/api/admin/support/tickets/:ticketId/merge', '/api/support/tickets/:ticketId/merge', '/api/support/tickets/:id/merge'], authenticateAdminToken, requirePower('SUPPORT'), supportController.mergeTickets);
router.post(['/api/admin/support/tickets/:ticketId/unmerge', '/api/support/tickets/:ticketId/unmerge', '/api/support/tickets/:id/unmerge'], authenticateAdminToken, requirePower('SUPPORT'), supportController.unmergeTickets);
router.patch(['/api/admin/support/tickets/:ticketId/status', '/api/admin/support/tickets/:id/status', '/api/support/tickets/:ticketId/status', '/api/support/tickets/:id/status'], authenticateAdminToken, requirePower('SUPPORT'), supportController.updateTicketStatus);
router.put(['/api/admin/support/tickets/:ticketId/status', '/api/admin/support/tickets/:id/status', '/api/support/tickets/:ticketId/status', '/api/support/tickets/:id/status'], authenticateAdminToken, requirePower('SUPPORT'), supportController.updateTicketStatus);
router.post(['/api/admin/support/tickets/:ticketId/attachments', '/api/support/tickets/:ticketId/attachments', '/api/support/tickets/:id/attachments'], authenticateAdminToken, requirePower('SUPPORT'), supportUpload.single('file'), supportController.uploadAttachment);

// ── Resident User Mobile App & Website (user-app - User Only) ────────────────────────
router.post(['/api/user/tickets', '/api/users/tickets'], authenticateToken, requireUser, supportController.createCustomerTicket);
router.get(['/api/user/tickets', '/api/users/tickets'], authenticateToken, requireUser, supportController.getUserTickets);
router.post(['/api/user/tickets/:ticketId/reply', '/api/user/tickets/:id/reply', '/api/users/tickets/:ticketId/reply', '/api/users/tickets/:id/reply'], authenticateToken, requireUser, supportController.userReplyToTicket);

// ── Merchant Vendor Mobile App & Portal (vendor-portal - Vendor Only) ──────────────────
router.post(['/api/vendor/tickets', '/api/vendors/tickets'], authenticateToken, requireVendor, supportController.createVendorTicket);
router.get(['/api/vendor/tickets', '/api/vendors/tickets'], authenticateToken, requireVendor, supportController.getVendorTickets);
router.get(['/api/vendor/:vendorId/purchases', '/api/vendors/:vendorId/purchases', '/api/vendorPanel/:vendorId/purchases', '/api/vendor/:vendorId/my-orders', '/api/vendors/:vendorId/my-orders', '/api/orders/vendor-purchases/:vendorId'], authenticateToken, requireVendorOwner, vendorPanelController.getVendorPurchases);

// ── Executive & Telemetry Reports (Admin Only) ───────────────────────
router.get('/api/reports/telemetry', authenticateAdminToken, adminPanelController.getExecutiveReports);
router.get('/api/reports/executive', authenticateAdminToken, adminPanelController.getExecutiveReports);
router.get('/api/reports/export', authenticateAdminToken, adminPanelController.exportReportData);
router.post('/api/reports/export', authenticateAdminToken, adminPanelController.exportReportData);

// ── Broadcast & Admin Notifications (Admin Only) ─────────────────────
router.get('/api/notifications', authenticateAdminToken, adminPanelController.listNotifications);
router.get('/api/notifications/history', authenticateAdminToken, adminPanelController.listNotifications);
router.post('/api/notifications/broadcast', authenticateAdminToken, adminPanelController.broadcastNotification);
router.patch('/api/notifications/read-all', authenticateAdminToken, adminPanelController.markAllNotificationsRead);
router.post('/api/notifications/read-all', authenticateAdminToken, adminPanelController.markAllNotificationsRead);

// ── Global Audit Ledger (Super Admin Only) ───────────────────────────
router.get('/api/audit-logs', authenticateAdminToken, requireSuperAdmin, adminPanelController.listAuditLogs);
router.get('/api/audit-logs/:id', authenticateAdminToken, requireSuperAdmin, adminPanelController.listAuditLogs);
router.post('/api/audit-logs/export', authenticateAdminToken, requireSuperAdmin, adminPanelController.exportReportData);

// ── Platform Settings & System Configuration (Admin Only) ────────────
router.get('/api/settings', adminPanelController.getPlatformConfig);
router.put('/api/settings', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateBrandingConfig);
router.put('/api/settings/profile', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateAdminProfile);
router.post('/api/settings/change-password', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.changeAdminPassword);
router.get(['/api/email/status', '/api/test/email/status', '/api/settings/email/status'], authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.checkEmailStatus);
router.post(['/api/email/send', '/api/emails/send', '/api/send-email', '/api/test/email/send', '/api/settings/email/send-test', '/api/email/send-test'], authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.sendTestEmail);

// Direct Email OTP Endpoints
router.post(['/api/email/send-otp', '/api/email/otp/send', '/api/email/request-otp'], otpController.sendEmailOtp);
router.post(['/api/email/verify-otp', '/api/email/otp/verify'], otpController.verifyEmailOtp);

// Direct Mobile OTP Endpoints
router.post(['/api/mobile/send-otp', '/api/mobile/otp/send'], otpController.sendMobileOtp);
router.post(['/api/mobile/verify-otp', '/api/mobile/otp/verify'], otpController.verifyMobileOtp);
router.put('/api/settings/tax', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateSettingsSection);
router.get(['/api/settings/subscription-plans', '/api/subscription-plans'], adminPanelController.getSubscriptionPlansAdmin);
router.put(['/api/settings/subscription-plans', '/api/subscription-plans'], authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateSettingsSection);
router.put('/api/settings/system', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateSettingsSection);
router.put('/api/settings/notifications', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateSettingsSection);
router.put('/api/settings/branding', authenticateAdminToken, requirePower('SETTINGS'), adminPanelController.updateSettingsSection);


router.get('/api/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.post('/api/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);
router.put('/api/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);

// ── v3.0.0 Sub-Admin RBAC & Audit Ledger Endpoints ──────────

router.post('/api/v1/auth/admin/login', subAdminsController.subAdminLogin);
router.post('/api/auth/admin/login', subAdminsController.subAdminLogin);
router.post('/api/admin/auth/login', subAdminsController.subAdminLogin);

router.get('/api/v1/admin/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.get('/api/v1/admin/sub-admins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.listSubAdmins);
router.get('/api/v1/admin/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.getSubAdminById);
router.get('/api/v1/admin/sub-admins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.getSubAdminById);
router.post('/api/v1/admin/subadmins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);
router.post('/api/v1/admin/sub-admins', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.createSubAdmin);
router.put('/api/v1/admin/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.put('/api/v1/admin/sub-admins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.put('/api/v1/admin/subadmins/:id/powers', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.put('/api/v1/admin/sub-admins/:id/powers', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.updateSubAdmin);
router.post('/api/v1/admin/subadmins/:id/toggle-status', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.toggleSubAdminStatus);
router.post('/api/v1/admin/sub-admins/:id/toggle-status', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.toggleSubAdminStatus);
router.delete('/api/v1/admin/subadmins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.deleteSubAdmin);
router.delete('/api/v1/admin/sub-admins/:id', authenticateAdminToken, requirePower('SUB_ADMINS'), subAdminsController.deleteSubAdmin);

router.post('/api/v1/admin/audit-logs', authenticateAdminToken, subAdminsController.recordAuditLog);
router.post('/api/admin/audit-logs', authenticateAdminToken, subAdminsController.recordAuditLog);
router.get('/api/v1/admin/audit-logs', authenticateAdminToken, requireSuperAdmin, subAdminsController.getAuditLogs);
router.get('/api/admin/audit-logs', authenticateAdminToken, requireSuperAdmin, subAdminsController.getAuditLogs);

router.post('/api/upload', authenticateToken, requireVendor, vendorPanelController.uploadImage);
router.post('/api/upload-image', authenticateToken, requireVendor, vendorPanelController.uploadImage);
router.post('/api/upload-logo', authenticateToken, requireVendor, vendorPanelController.uploadImage);


// ── Generic /api/products and /api/items Catalog & Entity Lookup Endpoints ───
async function resolveItemVendorId(req, res, next) {
  if (!req.params.vendorId && req.params.itemId) {
    const itemRow = await query('SELECT vendor_id FROM items WHERE item_id = ?', [req.params.itemId]).catch(() => ({ rows: [] }));
    if (itemRow.rows && itemRow.rows[0]) {
      req.params.vendorId = itemRow.rows[0].vendor_id;
    }
  }
  next();
}

router.get(['/api/products', '/api/items', '/products', '/items'], storefrontController.getItems);
router.get(['/api/products/:id', '/api/items/:id', '/products/:id', '/items/:id'], storefrontController.getItemOrProductById);

router.put(['/api/products/:itemId', '/api/items/:itemId', '/products/:itemId', '/items/:itemId'], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItem);
router.patch(['/api/products/:itemId', '/api/items/:itemId', '/products/:itemId', '/items/:itemId'], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItem);
router.post(['/api/products/:itemId/image', '/api/products/:itemId/photo', '/api/items/:itemId/image', '/api/items/:itemId/photo'], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.put(['/api/products/:itemId/image', '/api/products/:itemId/photo', '/api/items/:itemId/image', '/api/items/:itemId/photo'], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);
router.patch(['/api/products/:itemId/image', '/api/products/:itemId/photo', '/api/items/:itemId/image', '/api/items/:itemId/photo'], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItemImage);


// ── Real-Time Inventory & Stock Management Endpoints ─────────────────────────
router.post([
  '/api/orders/check-stock',
  '/api/orders/validate-cart',
  '/api/cart/check-stock',
  '/api/cart/validate'
], ordersController.validateCartStock);

router.get([
  '/api/items/:id/stock',
  '/api/products/:id/stock',
  '/items/:id/stock',
  '/products/:id/stock'
], storefrontController.getItemStock);

router.patch([
  '/api/vendorPanel/:vendorId/items/:itemId/stock',
  '/api/vendors/:vendorId/items/:itemId/stock',
  '/api/items/:itemId/stock',
  '/api/products/:itemId/stock',
  '/items/:itemId/stock',
  '/products/:itemId/stock'
], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItemStock);

router.put([
  '/api/vendorPanel/:vendorId/items/:itemId/stock',
  '/api/vendors/:vendorId/items/:itemId/stock',
  '/api/items/:itemId/stock',
  '/api/products/:itemId/stock',
  '/items/:itemId/stock',
  '/products/:itemId/stock'
], upload.any(), handleMulterError, resolveItemVendorId, authenticateToken, requireVendorOwner, vendorPanelController.updateItemStock);

// ── Root Alias Forwarding for Frontend Clients omitting /api prefix ─────
router.get(['/vendors', '/stores'], (req, res, next) => {
  req.url = '/api/vendors' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  router.handle(req, res, next);
});
router.get(['/vendors/:vendorId', '/stores/:vendorId'], (req, res, next) => {
  req.url = `/api/vendors/${req.params.vendorId}` + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  router.handle(req, res, next);
});

router.use('/api', storefrontRoutes);                // Storefront APIs (vendors/societies)

// ── Cashfree Hosted Checkout Web Bridge (Zero-Crash Native & Web Checkout) ────
router.get(['/payments/cashfree/checkout', '/api/payments/cashfree/checkout'], (req, res) => {
  const sessionId = req.query.session_id || req.query.payment_session_id;
  const isMock = req.query.mock === 'true' || sessionId?.startsWith('CF_ORD_') || sessionId?.startsWith('SUB_');
  const env = (req.query.env || process.env.CASHFREE_ENV || 'PRODUCTION').toUpperCase() === 'SANDBOX' ? 'sandbox' : 'production';

  if (!sessionId) {
    return res.status(400).send('<div style="font-family:sans-serif;padding:30px;text-align:center;"><h2>Missing Payment Session</h2><p>Please initiate payment again from the app.</p></div>');
  }

  if (isMock) {
    return res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DigiLocal Simulation Checkout</title>
  <style>
    body { font-family: sans-serif; background: #0A1428; color: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #16243E; padding: 28px; border-radius: 16px; border: 1px solid #C5A880; max-width: 360px; }
    .btn { background: #10B981; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; margin-top: 16px; border: none; cursor: pointer; }
  </style>
</head>
<body>
  <div class="card">
    <h2>🧪 Test / Sandbox Payment</h2>
    <p>Simulating Cashfree payment for session:</p>
    <code style="word-break:break-all;color:#C5A880;">${sessionId}</code>
    <br/>
    <button class="btn" onclick="window.location.href='/payments/cashfree/return?order_id=${sessionId}&status=SUCCESS'">Complete Test Payment</button>
  </div>
</body>
</html>`);
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>DigiLocal Secure Payment</title>
  <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0; background: #FAF9F6; color: #211A19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; text-align: center;
    }
    .loader {
      border: 4px solid #E5E7EB; width: 44px; height: 44px; border-radius: 50%;
      border-left-color: #541D26; animation: spin 0.9s linear infinite; margin-bottom: 20px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { font-size: 19px; margin: 0 0 8px 0; color: #211A19; }
    p { font-size: 14px; color: #78716C; margin: 0; }
  </style>
</head>
<body>
  <div class="loader"></div>
  <h2>Opening Cashfree Payments...</h2>
  <p>Securely connecting to UPI, Cards & NetBanking.</p>

  <script>
    window.addEventListener('DOMContentLoaded', function() {
      try {
        const cashfree = Cashfree({ mode: "${env}" });
        cashfree.checkout({
          paymentSessionId: "${sessionId}",
          redirectTarget: "_self"
        });
      } catch (err) {
        document.body.innerHTML = '<div style="padding: 24px;"><h2>Checkout Error</h2><p>' + err.message + '</p></div>';
      }
    });
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// ── Payment Return / Callback Helper ──────────────────────────────────────────
router.get(['/payments/cashfree/return', '/payments/cashfree/direct-return', '/vendor/subscription/verify'], (req, res) => {
  const orderId = req.query.order_id || req.query.orderId || '';
  const redirectUrl = req.query.redirect_url || req.query.return_url || '';
  res.setHeader('Content-Type', 'text/html');
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Payment Successful - DigiLocal</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #FAF9F6; color: #211A19; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; padding: 20px; }
    .card { background: #FFFFFF; padding: 36px 28px; border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); max-width: 380px; width: 100%; box-sizing: border-box; }
    .icon { font-size: 48px; margin-bottom: 12px; }
    h2 { color: #15803D; margin: 0 0 10px 0; font-size: 22px; font-weight: 700; }
    p { color: #57534E; font-size: 14px; line-height: 1.5; margin: 0 0 24px 0; }
    .btn { background: #541D26; color: #FFFFFF; padding: 14px 28px; border-radius: 12px; text-decoration: none; font-weight: 600; display: inline-block; cursor: pointer; border: none; font-size: 15px; width: 100%; box-sizing: border-box; }
    .order-ref { font-family: monospace; font-size: 11px; color: #A8A29E; margin-top: 16px; word-break: break-all; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>Payment Successful!</h2>
    <p>Your subscription payment has been processed. Redirecting back to your DigiLocal app...</p>
    <a class="btn" id="returnBtn" href="${redirectUrl || 'digilocalvendor://subscription'}">Return to DigiLocal App</a>
    <div class="order-ref">Order: ${orderId}</div>
  </div>
  <script>
    (function() {
      var target = "${redirectUrl || 'digilocalvendor://subscription'}";
      setTimeout(function() {
        try {
          if (window.opener) {
            window.close();
          } else {
            window.location.href = target;
          }
        } catch(e) {
          window.location.href = target;
        }
      }, 1000);
    })();
  </script>
</body>
</html>`);
});

module.exports = router;

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
const adminPanelController = require('../controllers/Admin/adminPanelController');

// ── Health & Observability Routes ───────────────────────────
router.use('/health', healthRoutes);
router.get('/version', (req, res) => res.redirect('/health/version'));

// ── Core Business API Routes ────────────────────────────────
router.use('/api/otp', otpRoutes);                 // MSG91 Mobile/Web OTP Service
router.use('/api/societies', societyRoutes);       // Society management
router.use('/api/vendors', vendorAuthRoutes);        // Vendor auth & Admin Vendor Spec
router.use('/api/users', userRoutes);               // Resident user auth & profile
router.use('/api/orders', orderRoutes);             // Customer orders & status pipeline
router.use('/api/vendorPanel', vendorPanelRoutes);  // Vendor dashboard & inventory
router.use('/api/admin', adminRoutes);               // Admin portal
router.use('/api/auth', authRoutes);                 // Admin Auth & Profile
router.use('/api/sub-admins', subAdminsRoutes);      // Sub-Admins & RBAC
router.use('/api/subscriptions', subscriptionsRoutes); // Financial Analytics & Subscriptions
router.use('/api/config', configRoutes);             // Platform Configuration

// ── Additional Admin Panel Specification Alias Routes ────────
router.get('/api/people', adminPanelController.listUsers);
router.post('/api/people/:id/flag', adminPanelController.flagUser);
router.put('/api/people/:id/status', adminPanelController.updateUserStatus);
router.patch('/api/people/:id/status', adminPanelController.updateUserStatus);

router.get('/api/payments/transactions', adminPanelController.getPaymentTransactions);
router.post('/api/payments/refund', adminPanelController.processRefund);

router.get('/api/promotions', adminPanelController.listPromotions);
router.post('/api/promotions', adminPanelController.createPromotion);
router.put('/api/promotions/:id', adminPanelController.updatePromotion);
router.delete('/api/promotions/:id', adminPanelController.deletePromotion);

router.get('/api/support/tickets', adminPanelController.listSupportTickets);
router.get('/api/support/tickets/:id/messages', adminPanelController.getTicketMessages);
router.post('/api/support/tickets/:id/messages', adminPanelController.replyToTicket);

router.get('/api/reports/executive', adminPanelController.getExecutiveReports);
router.get('/api/reports/export', adminPanelController.exportReportData);

router.get('/api/notifications', adminPanelController.listNotifications);
router.patch('/api/notifications/read-all', adminPanelController.markAllNotificationsRead);

router.get('/api/audit-logs', adminPanelController.listAuditLogs);

router.get('/api/settings', adminPanelController.getPlatformConfig);
router.put('/api/settings', adminPanelController.updateBrandingConfig);

router.use('/api', storefrontRoutes);                // Storefront APIs (vendors/societies)

module.exports = router;

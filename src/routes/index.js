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

// ── Health & Observability Routes ───────────────────────────
router.use('/health', healthRoutes);
router.get('/version', (req, res) => res.redirect('/health/version'));

// ── Business API Routes ─────────────────────────────────────
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
router.use('/api', storefrontRoutes);                // Storefront APIs (vendors/societies)

module.exports = router;

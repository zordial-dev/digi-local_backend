const express = require('express');
const router = express.Router();
const cmsController = require('../../controllers/Cms/cmsController');
const { authenticateAdminToken, requirePower } = require('../../middleware/adminAuth');

// ── CMS Pages & Legal Content ─────────────────────────────────────────
router.get('/pages', cmsController.getCmsPages);
router.get('/pages/:slug', cmsController.getCmsPageBySlug);
router.put('/pages/:slug', authenticateAdminToken, requirePower('SETTINGS'), cmsController.updateCmsPageBySlug);

// ── Support Contact Information ───────────────────────────────────────
router.get('/contacts', cmsController.getSupportContacts);
router.get('/contact-info', cmsController.getSupportContacts);
router.put('/contacts', authenticateAdminToken, requirePower('SETTINGS'), cmsController.updateSupportContacts);

// ── Direct Section Aliases (Public Read) ──────────────────────────────
router.get('/help-support', cmsController.getHelpSupport);
router.get('/about-us', cmsController.getAboutUs);
router.get('/privacy-policy', cmsController.getPrivacyPolicy);
router.get('/terms-conditions', cmsController.getTermsConditions);

module.exports = router;

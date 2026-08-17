const express = require('express');
const router = express.Router();
const cmsController = require('../../controllers/Cms/cmsController');

// ── CMS Pages & Legal Content ─────────────────────────────────────────
router.get('/pages', cmsController.getCmsPages);
router.get('/pages/:slug', cmsController.getCmsPageBySlug);
router.put('/pages/:slug', cmsController.updateCmsPageBySlug);

// ── Support Contact Information ───────────────────────────────────────
router.get('/contacts', cmsController.getSupportContacts);
router.get('/contact-info', cmsController.getSupportContacts);
router.put('/contacts', cmsController.updateSupportContacts);

// ── Direct Section Aliases ───────────────────────────────────────────
router.get('/help-support', cmsController.getHelpSupport);
router.get('/about-us', cmsController.getAboutUs);
router.get('/privacy-policy', cmsController.getPrivacyPolicy);
router.get('/terms-conditions', cmsController.getTermsConditions);

module.exports = router;

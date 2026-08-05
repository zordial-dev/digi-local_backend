const express = require('express');
const router = express.Router();
const storefrontController = require('../controllers/storefrontController');

// GET /api/societies/:societyId/vendors - List ACTIVE vendors in a society
router.get('/societies/:societyId/vendors', storefrontController.getSocietyVendorsStorefront);

// GET /api/vendors/:vendorId - Vendor storefront details & items
router.get('/vendors/:vendorId', storefrontController.getVendorStorefront);

module.exports = router;

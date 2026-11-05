const express = require('express');
const router = express.Router();
const storefrontController = require('../../controllers/Storefront/storefrontController');

// GET /api/vendors/search - Location-aware storefront vendor discovery & search
router.get('/vendors/search', storefrontController.searchVendorsLocationAware);
router.get('/stores/search', storefrontController.searchVendorsLocationAware);

// GET /api/societies/:societyId/vendors - List ACTIVE vendors in a society
router.get('/societies/:societyId/vendors', storefrontController.getSocietyVendorsStorefront);

// GET /api/vendors/:vendorId - Vendor storefront details, services & items (Public)
router.get([
    '/vendors/:vendorId',
    '/vendors/:vendorId/details',
    '/stores/:vendorId',
    '/stores/:vendorId/details',
    '/merchants/:vendorId',
    '/merchants/:vendorId/details'
], (req, res, next) => {
    if (['pending', 'search', 'categories', 'locations'].includes(req.params.vendorId)) return next();
    return storefrontController.getVendorStorefront(req, res, next);
});

// GET /api/locations - Fetch available locations / areas / cities
router.get('/locations', storefrontController.getLocations);
router.get('/locations/suggestions', storefrontController.getLocations);
router.get('/locations/search', storefrontController.getLocations);
router.get('/locations/autocomplete', storefrontController.getLocations);

module.exports = router;

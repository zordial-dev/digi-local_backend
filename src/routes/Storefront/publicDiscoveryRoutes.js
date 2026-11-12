'use strict';

const express = require('express');
const router = express.Router();
const publicDiscoveryController = require('../../controllers/Storefront/publicDiscoveryController');

// ── City Selection Endpoints ─────────────────────────────────
// GET /api/public/cities - Complete list of Indian cities across all 28 states & 8 UTs
router.get('/cities', publicDiscoveryController.getCities);

// GET /api/public/cities/search - Autocomplete city search
router.get('/cities/search', publicDiscoveryController.searchCities);

// GET /api/public/cities/:cityId/categories - Dynamic categories with active listings in this city
router.get('/cities/:cityId/categories', publicDiscoveryController.getCityAvailableCategories);

// GET /api/public/cities/:cityId - Individual city info by ID or slug
router.get('/cities/:cityId', (req, res, next) => {
  if (req.params.cityId === 'search') return publicDiscoveryController.searchCities(req, res, next);
  return publicDiscoveryController.getCityById(req, res, next);
});

// ── Category Discovery Endpoints ─────────────────────────────
// GET /api/public/categories - All root categories
router.get('/categories', publicDiscoveryController.getCategories);

// GET /api/public/categories/:categoryId/subcategories - Child subcategories
router.get('/categories/:categoryId/subcategories', publicDiscoveryController.getSubcategories);

// ── Unified Discovery Endpoints ──────────────────────────────
// GET /api/public/discover - Search and filter products & services by city, category, subcategory, keyword
router.get('/discover', publicDiscoveryController.discover);

// ── Public Detail Endpoints ──────────────────────────────────
// GET /api/public/products/:id - Product details with merchant and WhatsApp inquiry
router.get(['/products/:id', '/items/:id'], publicDiscoveryController.getProductById);

// GET /api/public/services/:id - Service details with merchant and WhatsApp inquiry
router.get('/services/:id', publicDiscoveryController.getServiceById);

// GET /api/public/merchants/:id - Merchant storefront with items, services, contacts
router.get(['/merchants/:id', '/vendors/:id', '/stores/:id'], publicDiscoveryController.getMerchantById);

module.exports = router;


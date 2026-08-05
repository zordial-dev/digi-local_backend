const express = require('express');
const router = express.Router();
const societiesController = require('../controllers/societiesController');

// A1. List Housing Societies (with Search & Filter)
router.get('/', societiesController.getAllSocieties);

// A2. Get Society Details by ID
router.get('/:id', societiesController.getSocietyById);

// A3. Request / Onboard Unlisted Society
router.post('/', societiesController.createSociety);

// C1. Fetch Approved Vendors for a Housing Society
router.get('/:id/vendors', societiesController.getSocietyVendors);

module.exports = router;

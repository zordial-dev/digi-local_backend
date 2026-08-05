const express = require('express');
const router = express.Router();
const healthController = require('../controllers/healthController');

// GET /health - Full Health Check Report & System Observability
router.get('/', healthController.getHealthStatus);

// GET /health/live - Liveness Probe
router.get('/live', healthController.getLiveness);

// GET /health/ready - Readiness Probe
router.get('/ready', healthController.getReadiness);

// GET /version - Application Metadata
router.get('/version', healthController.getAppVersion);

module.exports = router;

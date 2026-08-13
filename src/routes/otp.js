'use strict';
const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

// POST /api/otp/send-otp (and /api/auth/send-otp)
router.post('/send-otp', otpController.sendOtp);

// POST /api/otp/verify-otp (and /api/auth/verify-otp)
router.post('/verify-otp', otpController.verifyOtp);

module.exports = router;
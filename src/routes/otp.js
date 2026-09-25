'use strict';
const express = require('express');
const router = express.Router();
const otpController = require('../controllers/otpController');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * OTP ROUTING SPECIFICATION
 * Separate routes for Mobile OTP vs Email OTP, plus universal fallbacks.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// 1. Mobile OTP Dedicated Routes (SMS via Message Central)
router.post(['/mobile/send-otp', '/mobile/send', '/send-mobile-otp'], otpController.sendMobileOtp);
router.post(['/mobile/verify-otp', '/mobile/verify', '/verify-mobile-otp'], otpController.verifyMobileOtp);

// 2. Email OTP Dedicated Routes (HTML Email via AWS SES)
router.post(['/email/send-otp', '/email/send', '/send-email-otp'], otpController.sendEmailOtp);
router.post(['/email/verify-otp', '/email/verify', '/verify-email-otp'], otpController.verifyEmailOtp);

// 3. Universal / Legacy Endpoints (Auto-detects email vs phone)
router.post('/send-otp', otpController.sendOtp);
router.post('/verify-otp', otpController.verifyOtp);

module.exports = router;
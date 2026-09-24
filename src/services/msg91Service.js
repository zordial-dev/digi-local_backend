'use strict';
const messageCentralService = require('./messageCentralService');

/**
 * Message Central CPaaS SMS & OTP Service Adapter (formerly msg91Service)
 * All OTP operations now route directly through Message Central VerifyNow API.
 * Dummy OTPs and simulation fallbacks have been permanently removed.
 */

async function sendOTP(phone, countryCode) {
  return await messageCentralService.sendOTP(phone, countryCode);
}

async function verifyOTP(phone, otp, countryCode, verificationId) {
  return await messageCentralService.verifyOTP(phone, otp, countryCode, verificationId);
}

module.exports = {
  formatPhone: messageCentralService.formatPhone,
  sendOTP,
  verifyOTP
};

'use strict';
const { sendOTP, verifyOTP } = require('../services/msg91Service');

/**
 * POST /api/otp/send-otp
 * Sends an OTP SMS via MSG91 to the specified phone number.
 */
const sendOtpController = async (req, res) => {
  try {
    const phone = req.body.phone || req.body.mobile || req.body.phone_number;
    const countryCode = req.body.country_code || req.body.countryCode || req.body.country || req.body.dial_code;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    const cleanedPhone = String(phone).replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Provide a valid 10-digit mobile number.'
      });
    }

    const result = await sendOTP(phone, countryCode);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: result
    });
  } catch (error) {
    console.error('sendOtpController error:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send OTP'
    });
  }
};

/**
 * POST /api/otp/verify-otp
 * Verifies the OTP code submitted by the user via MSG91.
 */
const verifyOtpController = async (req, res) => {
  try {
    const phone = req.body.phone || req.body.mobile || req.body.phone_number;
    const otp = req.body.otp || req.body.otp_code || req.body.code;
    const countryCode = req.body.country_code || req.body.countryCode || req.body.country || req.body.dial_code;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required'
      });
    }

    const result = await verifyOTP(phone, otp, countryCode);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: result
    });
  } catch (error) {
    console.error('verifyOtpController error:', error.message);
    return res.status(400).json({
      success: false,
      message: error.message || 'Invalid or expired OTP'
    });
  }
};

module.exports = {
  sendOtp: sendOtpController,
  verifyOtp: verifyOtpController,
  sendOtpController,
  verifyOtpController
};

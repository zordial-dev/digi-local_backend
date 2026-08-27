'use strict';
const { query } = require('../models/db');
const { sendOTP, verifyOTP } = require('../services/msg91Service');

/**
 * POST /api/otp/send-otp
 * Sends an OTP SMS via MSG91 to the specified phone number.
 */
const sendOtpController = async (req, res) => {
  try {
    const phone = req.body.phone || req.body.mobile || req.body.phone_number || req.body.identifier;
    const countryCode = req.body.country_code || req.body.countryCode || req.body.country || req.body.dial_code;
    const purpose = req.body.purpose || req.body.type || req.body.mode;

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

    const cleanTarget = String(phone).trim();
    const last10 = cleanedPhone.slice(-10);
    const mode = (purpose || '').toLowerCase();
    const isRegistrationIntent = mode === 'register' || mode === 'signup' || mode === 'check_register';

    // Verify account existence in users and vendors table
    const userRes = await query(
      `SELECT user_id FROM users WHERE phone = ? OR phone = ? OR phone = ? OR phone LIKE ?`,
      [cleanTarget, cleanedPhone, last10, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const vendorRes = await query(
      `SELECT vendor_id FROM vendors WHERE phone_number = ? OR phone_number = ? OR phone_number = ? OR phone_number LIKE ?`,
      [cleanTarget, cleanedPhone, last10, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const accountExists = (userRes.rows && userRes.rows.length > 0) || (vendorRes.rows && vendorRes.rows.length > 0);

    if (isRegistrationIntent) {
      if (accountExists) {
        return res.status(400).json({
          success: false,
          exists: true,
          error: 'An account with this mobile number already exists. Please log in instead.',
          message: 'An account with this mobile number already exists. Please log in instead.'
        });
      }
    } else {
      if (!accountExists) {
        console.log(`⚠️ [SEND OTP BLOCKED] Account "${cleanTarget}" not found in database. Disallowing OTP send.`);
        return res.status(404).json({
          success: false,
          exists: false,
          error: 'No account found with this mobile number. Please register your account first.',
          message: 'No account found with this mobile number. Please register your account first.'
        });
      }
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

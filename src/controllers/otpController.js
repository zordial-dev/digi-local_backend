'use strict';
const { query } = require('../models/db');
const { sendOTP: sendCentralOTP, verifyOTP: verifyCentralOTP } = require('../services/messageCentralService');
const { generateOTP, verifyOTP, generateTokens } = require('../utils/auth');
const { sendEmail } = require('../services/emailService');
const { otpTemplate } = require('../templates/emailTemplates');

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. MOBILE OTP CONTROLLERS (SMS via Message Central VerifyNow)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * POST /api/otp/mobile/send-otp (and /api/otp/send-mobile-otp, /api/mobile/send-otp)
 * Sends an OTP SMS via Message Central to the provided phone number.
 */
const sendMobileOtpController = async (req, res) => {
  try {
    const phone = req.body.phone || req.body.mobile || req.body.phone_number || req.body.identifier || req.body.number;
    const countryCode = req.body.country_code || req.body.countryCode || req.body.country || req.body.dial_code;
    const purpose = req.body.purpose || req.body.type || req.body.mode;

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        message: 'Phone number is required'
      });
    }

    // Validate phone number format
    const cleanedPhone = String(phone).replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Provide a valid 10-digit mobile number.',
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
        console.log(`⚠️ [MOBILE OTP BLOCKED] Account "${cleanTarget}" not found in database. Disallowing OTP send.`);
        return res.status(404).json({
          success: false,
          exists: false,
          error: 'No account found with this mobile number. Please register your account first.',
          message: 'No account found with this mobile number. Please register your account first.'
        });
      }
    }

    const otpLength = Number(req.body.otp_length || req.body.otpLength || 6);
    const result = await sendCentralOTP(phone, countryCode, 'SMS', otpLength);

    return res.status(200).json({
      success: true,
      channel: 'mobile_sms',
      provider: 'message_central',
      message: 'Mobile OTP sent successfully via SMS',
      phone: cleanTarget,
      verification_id: result.verificationId,
      verificationId: result.verificationId,
      data: result
    });
  } catch (error) {
    console.error('sendMobileOtpController error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send mobile OTP',
      message: error.message || 'Failed to send mobile OTP'
    });
  }
};

/**
 * POST /api/otp/mobile/verify-otp (and /api/otp/verify-mobile-otp, /api/mobile/verify-otp)
 * Verifies mobile OTP code submitted by the client via Message Central.
 */
const verifyMobileOtpController = async (req, res) => {
  try {
    const phone = req.body.phone || req.body.mobile || req.body.phone_number || req.body.number;
    const otp = req.body.otp || req.body.otp_code || req.body.code;
    const countryCode = req.body.country_code || req.body.countryCode || req.body.country || req.body.dial_code;
    const verificationId = req.body.verification_id || req.body.verificationId;

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP code are required',
        message: 'Phone number and OTP code are required'
      });
    }

    const cleanOtp = String(otp).trim();
    const result = await verifyCentralOTP(phone, cleanOtp, countryCode, verificationId);

    return res.status(200).json({
      success: true,
      verified: true,
      channel: 'mobile_sms',
      provider: 'message_central',
      message: 'Mobile OTP verified successfully',
      phone: String(phone).trim(),
      data: result
    });
  } catch (error) {
    console.error('verifyMobileOtpController error:', error.message);
    return res.status(400).json({
      success: false,
      verified: false,
      error: error.message || 'Invalid or expired mobile OTP code',
      message: error.message || 'Invalid or expired mobile OTP code'
    });
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. EMAIL OTP CONTROLLERS (Transactional Email via AWS SES / Nodemailer)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * POST /api/otp/email/send-otp (and /api/email/send-otp, /api/email/otp/send)
 * Generates and emails an OTP verification code to the target email address.
 */
const sendEmailOtpController = async (req, res) => {
  try {
    const email = req.body.email || req.body.to || req.body.recipient || req.body.identifier;
    const name = req.body.name || req.body.user_name || req.body.vendor_name || 'Valued User';
    const purpose = req.body.purpose || req.body.type || req.body.mode;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email address is required',
        message: 'Email address is required. Please provide "email" in JSON body.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address format',
        message: 'Please provide a valid email address.'
      });
    }

    const mode = (purpose || '').toLowerCase();
    const isRegistrationIntent = mode === 'register' || mode === 'signup' || mode === 'check_register';

    // Verify existence in database
    const userRes = await query(`SELECT user_id, name FROM users WHERE LOWER(email) = ?`, [cleanEmail]).catch(() => ({ rows: [] }));
    const vendorRes = await query(`SELECT vendor_id, store_name, vendor_name FROM vendors WHERE LOWER(email) = ?`, [cleanEmail]).catch(() => ({ rows: [] }));

    const accountExists = (userRes.rows && userRes.rows.length > 0) || (vendorRes.rows && vendorRes.rows.length > 0);

    if (isRegistrationIntent) {
      if (accountExists) {
        return res.status(400).json({
          success: false,
          exists: true,
          error: 'An account with this email address already exists. Please log in instead.',
          message: 'An account with this email address already exists. Please log in instead.'
        });
      }
    } else if (mode === 'login' || mode === 'reset_password') {
      if (!accountExists) {
        console.log(`⚠️ [EMAIL OTP BLOCKED] Account "${cleanEmail}" not found in database.`);
        return res.status(404).json({
          success: false,
          exists: false,
          error: 'No account found with this email address. Please register your account first.',
          message: 'No account found with this email address. Please register your account first.'
        });
      }
    }

    // Determine greeting name
    const greetingName = (userRes.rows[0]?.name) || (vendorRes.rows[0]?.vendor_name) || name;

    // Generate 6-digit cryptographic OTP (10 min TTL)
    const code = generateOTP(cleanEmail);

    // Build responsive HTML template
    const emailHtml = otpTemplate({
      name: greetingName,
      otp: code,
      ttlMinutes: 10
    });

    // Send email via AWS SES / Nodemailer
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: `🔐 ${code} is your DigiLocal Verification Code`,
      html: emailHtml
    });

    if (!emailResult.sent) {
      return res.status(502).json({
        success: false,
        error: `Failed to deliver email: ${emailResult.reason || 'SMTP failure'}`,
        message: 'Failed to send OTP to email. Please verify SMTP configuration.'
      });
    }

    return res.status(200).json({
      success: true,
      channel: 'email',
      provider: 'aws_ses',
      message: `OTP verification code sent to ${cleanEmail}`,
      email: cleanEmail,
      expires_in_seconds: 600,
      ttl_minutes: 10
    });
  } catch (error) {
    console.error('sendEmailOtpController error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal error dispatching email OTP',
      message: error.message || 'Internal error dispatching email OTP'
    });
  }
};

/**
 * POST /api/otp/email/verify-otp (and /api/email/verify-otp, /api/email/otp/verify)
 * Verifies email OTP code. If purpose === 'login', automatically returns JWT auth tokens!
 */
const verifyEmailOtpController = async (req, res) => {
  try {
    const email = req.body.email || req.body.to || req.body.recipient || req.body.identifier;
    const otp = req.body.otp || req.body.code || req.body.otp_code;
    const purpose = (req.body.purpose || req.body.type || '').toLowerCase();

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email address and OTP code are required',
        message: 'Both "email" and "otp" fields are required in JSON body.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // Verify OTP against in-memory hash store
    const verifyResult = verifyOTP(cleanEmail, cleanOtp);

    if (!verifyResult || !verifyResult.valid) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: verifyResult?.reason || 'Invalid or expired OTP code',
        message: verifyResult?.reason || 'Invalid or expired OTP code'
      });
    }

    const responsePayload = {
      success: true,
      verified: true,
      channel: 'email',
      message: 'Email OTP verified successfully',
      email: cleanEmail
    };

    // If login intent or account exists, issue authentication credentials
    if (purpose === 'login' || req.body.include_token) {
      const userRes = await query(`SELECT * FROM users WHERE LOWER(email) = ?`, [cleanEmail]).catch(() => ({ rows: [] }));
      const vendorRes = await query(`SELECT * FROM vendors WHERE LOWER(email) = ?`, [cleanEmail]).catch(() => ({ rows: [] }));

      if (userRes.rows && userRes.rows.length > 0) {
        const u = userRes.rows[0];
        const tokens = generateTokens(u, 'user');
        responsePayload.token = tokens.accessToken;
        responsePayload.accessToken = tokens.accessToken;
        responsePayload.refreshToken = tokens.refreshToken;
        responsePayload.user = {
          user_id: u.user_id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          role: 'user'
        };
      } else if (vendorRes.rows && vendorRes.rows.length > 0) {
        const v = vendorRes.rows[0];
        const tokens = generateTokens(v, 'vendor');
        responsePayload.token = tokens.accessToken;
        responsePayload.accessToken = tokens.accessToken;
        responsePayload.refreshToken = tokens.refreshToken;
        responsePayload.vendor = {
          vendor_id: v.vendor_id,
          vendor_name: v.vendor_name,
          store_name: v.store_name,
          email: v.email,
          phone_number: v.phone_number,
          status: v.status,
          role: 'vendor'
        };
      }
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('verifyEmailOtpController error:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      error: error.message || 'Internal error verifying email OTP',
      message: error.message || 'Internal error verifying email OTP'
    });
  }
};

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. UNIVERSAL / BACKWARD-COMPATIBLE OTP CONTROLLERS
 * Auto-detects whether the client passed a phone number or an email address!
 * ─────────────────────────────────────────────────────────────────────────────
 */

const sendOtpController = async (req, res) => {
  const target = req.body.email || req.body.phone || req.body.mobile || req.body.identifier || req.body.phone_number;
  if (target && String(target).includes('@')) {
    return sendEmailOtpController(req, res);
  }
  return sendMobileOtpController(req, res);
};

const verifyOtpController = async (req, res) => {
  const target = req.body.email || req.body.phone || req.body.mobile || req.body.identifier || req.body.phone_number;
  if (target && String(target).includes('@')) {
    return verifyEmailOtpController(req, res);
  }
  return verifyMobileOtpController(req, res);
};

module.exports = {
  // Dedicated Mobile OTP
  sendMobileOtp: sendMobileOtpController,
  verifyMobileOtp: verifyMobileOtpController,
  sendMobileOtpController,
  verifyMobileOtpController,

  // Dedicated Email OTP
  sendEmailOtp: sendEmailOtpController,
  verifyEmailOtp: verifyEmailOtpController,
  sendEmailOtpController,
  verifyEmailOtpController,

  // Universal fallback
  sendOtp: sendOtpController,
  verifyOtp: verifyOtpController,
  sendOtpController,
  verifyOtpController
};

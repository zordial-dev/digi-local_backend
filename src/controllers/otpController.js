'use strict';
const { query } = require('../models/db');
const { sendOTP: sendCentralOTP, verifyOTP: verifyCentralOTP, formatSmsErrorResponse } = require('../services/messageCentralService');
const { generateOTP, verifyOTP, generateTokens } = require('../utils/auth');
const { sendEmail } = require('../services/emailService');
const { otpTemplate } = require('../templates/emailTemplates');
const { checkCooldown, recordOtpSent, resetCooldown, getCooldownStatus } = require('../utils/otpCooldown');

/**
 * Helper: Searches database for account by phone number.
 */
async function findAccountByPhone(phone, targetRole = null) {
  const cleanTarget = String(phone || '').trim();
  const cleanedDigits = cleanTarget.replace(/\D/g, '');
  const last10 = cleanedDigits.slice(-10);

  let user = null;
  let vendor = null;

  if (!targetRole || targetRole === 'vendor') {
    const vendorRes = await query(
      `SELECT * FROM vendors WHERE phone_number = ? OR phone_number = ? OR phone_number = ? OR phone_number LIKE ?`,
      [cleanTarget, cleanedDigits, last10, `%${last10}`]
    ).catch(() => ({ rows: [] }));
    if (vendorRes.rows && vendorRes.rows.length > 0) {
      vendor = vendorRes.rows[0];
    }
  }

  if (!targetRole || targetRole === 'user') {
    const userRes = await query(
      `SELECT * FROM users WHERE phone = ? OR phone = ? OR phone = ? OR phone LIKE ?`,
      [cleanTarget, cleanedDigits, last10, `%${last10}`]
    ).catch(() => ({ rows: [] }));
    if (userRes.rows && userRes.rows.length > 0) {
      user = userRes.rows[0];
    }
  }

  return { user, vendor, exists: !!(user || vendor) };
}

/**
 * Helper: Searches database for account by email.
 */
async function findAccountByEmail(email, targetRole = null) {
  const cleanEmail = String(email || '').trim().toLowerCase();

  let user = null;
  let vendor = null;

  if (!targetRole || targetRole === 'vendor') {
    const vendorRes = await query(
      `SELECT * FROM vendors WHERE LOWER(email) = ?`,
      [cleanEmail]
    ).catch(() => ({ rows: [] }));
    if (vendorRes.rows && vendorRes.rows.length > 0) {
      vendor = vendorRes.rows[0];
    }
  }

  if (!targetRole || targetRole === 'user') {
    const userRes = await query(
      `SELECT * FROM users WHERE LOWER(email) = ?`,
      [cleanEmail]
    ).catch(() => ({ rows: [] }));
    if (userRes.rows && userRes.rows.length > 0) {
      user = userRes.rows[0];
    }
  }

  return { user, vendor, exists: !!(user || vendor), cleanEmail };
}

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
    const role = (req.body.role || req.body.portal || req.body.user_type || '').toLowerCase();

    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required',
        message: 'Phone number is required'
      });
    }

    const cleanedPhone = String(phone).replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid phone number format. Provide a valid 10-digit mobile number.',
        message: 'Invalid phone number format. Provide a valid 10-digit mobile number.'
      });
    }

    const cleanTarget = String(phone).trim();

    // Progressive Exponential Cooldown Check (10s, 20s, 40s, 80s...)
    const cooldownCheck = checkCooldown(cleanTarget);
    if (!cooldownCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Please wait ${cooldownCheck.retryAfter} seconds before requesting a new OTP.`,
        message: `Please wait ${cooldownCheck.retryAfter} seconds before requesting a new OTP.`,
        retry_after: cooldownCheck.retryAfter,
        cooldown_seconds: cooldownCheck.cooldownSeconds,
        attempt: cooldownCheck.attempt
      });
    }

    const mode = (purpose || '').toLowerCase();
    const isRegistrationIntent = mode === 'register' || mode === 'signup' || mode === 'check_register';

    // For login intent, role MUST be specified to prevent cross-table leakage
    if (!isRegistrationIntent && !['vendor', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '"role" is required for login. Pass role: "vendor" or role: "user".',
        message: '"role" is required for login. Pass role: "vendor" or role: "user".'
      });
    }

    // Verify account existence in database (role is guaranteed non-null for login)
    const { user, vendor, exists: accountExists } = await findAccountByPhone(cleanTarget, role || null);

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
      // Login or Default: ONLY registered phone numbers can receive OTP!
      if (!accountExists) {
        const portalLabel = role === 'vendor' ? 'vendor store ' : role === 'user' ? 'user ' : '';
        console.log(`⚠️ [MOBILE OTP BLOCKED] Unregistered ${portalLabel}account "${cleanTarget}". Disallowing OTP send.`);
        return res.status(404).json({
          success: false,
          exists: false,
          error: `No ${portalLabel}account found with this mobile number. Please register your account first.`,
          message: `No ${portalLabel}account found with this mobile number. Please register your account first.`
        });
      }
    }

    const otpLength = Number(req.body.otp_length || req.body.otpLength || 6);
    const result = await sendCentralOTP(phone, countryCode, 'SMS', otpLength);

    // Record progressive cooldown entry upon successful dispatch
    const cooldownInfo = recordOtpSent(cleanTarget);

    return res.status(200).json({
      success: true,
      channel: 'mobile_sms',
      provider: 'message_central',
      message: 'Mobile OTP sent successfully via SMS',
      phone: cleanTarget,
      verification_id: result.verificationId,
      verificationId: result.verificationId,
      retry_after: cooldownInfo.retryAfter,
      cooldown_seconds: cooldownInfo.cooldownSeconds,
      resend_available_in_seconds: cooldownInfo.retryAfter,
      attempt: cooldownInfo.attempt,
      data: result
    });
  } catch (error) {
    console.error('sendMobileOtpController error:', error.message);
    const { statusCode, body } = formatSmsErrorResponse(error);
    return res.status(statusCode).json(body);
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
    const purpose = (req.body.purpose || req.body.type || req.body.mode || '').toLowerCase();
    const role = (req.body.role || req.body.portal || req.body.user_type || '').toLowerCase();
    const isRegistrationIntent = purpose === 'register' || purpose === 'signup' || purpose === 'check_register';

    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP code are required',
        message: 'Phone number and OTP code are required'
      });
    }

    const cleanOtp = String(otp).trim();
    const cleanPhone = String(phone).trim();

    // 1. Verify OTP code with Message Central
    const result = await verifyCentralOTP(phone, cleanOtp, countryCode, verificationId);

    // For login intent, role MUST be specified to prevent cross-table leakage
    if (!isRegistrationIntent && !['vendor', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '"role" is required for login. Pass role: "vendor" or role: "user".',
        message: '"role" is required for login. Pass role: "vendor" or role: "user".'
      });
    }

    if (isRegistrationIntent) {
      resetCooldown(cleanPhone);
      return res.status(200).json({
        success: true,
        verified: true,
        channel: 'mobile_sms',
        provider: 'message_central',
        message: 'Mobile OTP verified successfully',
        phone: cleanPhone,
        data: result
      });
    }

    // 2. For Login / Default: ONLY registered phone numbers can log in!
    const { user, vendor, exists: accountExists } = await findAccountByPhone(cleanPhone, role || null);

    if (!accountExists) {
      const portalLabel = role === 'vendor' ? 'vendor store ' : role === 'user' ? 'user ' : '';
      return res.status(404).json({
        success: false,
        verified: false,
        exists: false,
        error: `No ${portalLabel}account found with this mobile number. Please register your account first.`,
        message: `No ${portalLabel}account found with this mobile number. Please register your account first.`
      });
    }

    resetCooldown(cleanPhone);

    const responsePayload = {
      success: true,
      verified: true,
      channel: 'mobile_sms',
      provider: 'message_central',
      message: 'Mobile OTP verified successfully. Login successful.',
      phone: cleanPhone,
      data: result
    };

    // Return authenticated tokens and respective account payload
    if (role === 'vendor' || (vendor && !user)) {
      const statusLower = (vendor.status || 'pending').toLowerCase();
      if (statusLower === 'blocked') {
        return res.status(403).json({
          success: false,
          error: 'Your vendor account has been blocked by admin.',
          message: 'Your vendor store account has been blocked. Please contact customer support.'
        });
      }
      const tokens = generateTokens(vendor, 'vendor');
      const vendorPublicId = vendor.public_id || ('vnd@' + String(vendor.vendor_id).padStart(4, '0'));
      responsePayload.token = tokens.accessToken;
      responsePayload.accessToken = tokens.accessToken;
      responsePayload.refreshToken = tokens.refreshToken;
      responsePayload.vendor_id = Number(vendor.vendor_id);
      responsePayload.public_id = vendorPublicId;
      responsePayload.role = 'vendor';
      responsePayload.vendor = {
        vendor_id: Number(vendor.vendor_id),
        public_id: vendorPublicId,
        store_name: vendor.store_name,
        vendor_name: vendor.vendor_name,
        email: vendor.email,
        phone_number: vendor.phone_number,
        status: statusLower,
        role: 'vendor'
      };
    } else {
      const u = user || vendor;
      const userStatusLower = (u.status || 'active').toLowerCase();
      if (userStatusLower === 'blocked' || userStatusLower === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'Your resident account has been blocked by admin.',
          message: 'Your account has been blocked. Please contact customer support.'
        });
      }
      const tokens = generateTokens(u, 'user');
      responsePayload.token = tokens.accessToken;
      responsePayload.accessToken = tokens.accessToken;
      responsePayload.refreshToken = tokens.refreshToken;
      responsePayload.role = 'user';
      responsePayload.user = {
        user_id: u.user_id || `usr_v_${u.vendor_id}`,
        name: u.name || u.vendor_name,
        email: u.email,
        phone: u.phone || u.phone_number,
        role: 'user'
      };
    }

    return res.status(200).json(responsePayload);
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
    const role = (req.body.role || req.body.portal || req.body.user_type || '').toLowerCase();

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

    // For login intent, role MUST be specified to prevent cross-table leakage
    if (!isRegistrationIntent && !['vendor', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '"role" is required for login. Pass role: "vendor" or role: "user".',
        message: '"role" is required for login. Pass role: "vendor" or role: "user".'
      });
    }

    // Verify existence in database (role is guaranteed non-null for login)
    const { user, vendor, exists: accountExists } = await findAccountByEmail(cleanEmail, role || null);

    if (isRegistrationIntent) {
      if (accountExists) {
        return res.status(400).json({
          success: false,
          exists: true,
          error: 'An account with this email address already exists. Please log in instead.',
          message: 'An account with this email address already exists. Please log in instead.'
        });
      }
    } else {
      // Login or Default: ONLY registered emails can receive OTP!
      if (!accountExists) {
        const portalLabel = role === 'vendor' ? 'vendor store ' : role === 'user' ? 'user ' : '';
        console.log(`⚠️ [EMAIL OTP BLOCKED] Unregistered ${portalLabel}account "${cleanEmail}". Disallowing OTP send.`);
        return res.status(404).json({
          success: false,
          exists: false,
          error: `No ${portalLabel}account found with this email address. Please register your account first.`,
          message: `No ${portalLabel}account found with this email address. Please register your account first.`
        });
      }
    }

    // Determine greeting name
    const greetingName = user?.name || vendor?.vendor_name || vendor?.store_name || name;

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
 * Verifies email OTP code. Authenticates only registered accounts!
 */
const verifyEmailOtpController = async (req, res) => {
  try {
    const email = req.body.email || req.body.to || req.body.recipient || req.body.identifier;
    const otp = req.body.otp || req.body.code || req.body.otp_code;
    const purpose = (req.body.purpose || req.body.type || req.body.mode || '').toLowerCase();
    const role = (req.body.role || req.body.portal || req.body.user_type || '').toLowerCase();
    const isRegistrationIntent = purpose === 'register' || purpose === 'signup' || purpose === 'check_register';

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email address and OTP code are required',
        message: 'Both "email" and "otp" fields are required in JSON body.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    // 1. Verify OTP against in-memory hash store
    const verifyResult = verifyOTP(cleanEmail, cleanOtp);

    if (!verifyResult || !verifyResult.valid) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: verifyResult?.reason || 'Invalid or expired OTP code',
        message: verifyResult?.reason || 'Invalid or expired OTP code'
      });
    }

    // For login intent, role MUST be specified to prevent cross-table leakage
    if (!isRegistrationIntent && !['vendor', 'user'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: '"role" is required for login. Pass role: "vendor" or role: "user".',
        message: '"role" is required for login. Pass role: "vendor" or role: "user".'
      });
    }

    if (isRegistrationIntent) {
      return res.status(200).json({
        success: true,
        verified: true,
        channel: 'email',
        message: 'Email OTP verified successfully',
        email: cleanEmail
      });
    }

    // 2. For Login / Default: ONLY registered emails can log in!
    const { user, vendor, exists: accountExists } = await findAccountByEmail(cleanEmail, role || null);

    if (!accountExists) {
      const portalLabel = role === 'vendor' ? 'vendor store ' : role === 'user' ? 'user ' : '';
      return res.status(404).json({
        success: false,
        verified: false,
        exists: false,
        error: `No ${portalLabel}account found with this email address. Please register your account first.`,
        message: `No ${portalLabel}account found with this email address. Please register your account first.`
      });
    }

    const responsePayload = {
      success: true,
      verified: true,
      channel: 'email',
      message: 'Email OTP verified successfully. Login successful.',
      email: cleanEmail
    };

    // Return tokens and account data matching role
    if (role === 'vendor' || (vendor && !user)) {
      const statusLower = (vendor.status || 'pending').toLowerCase();
      if (statusLower === 'blocked') {
        return res.status(403).json({
          success: false,
          error: 'Your vendor account has been blocked by admin.',
          message: 'Your vendor store account has been blocked. Please contact customer support.'
        });
      }
      const tokens = generateTokens(vendor, 'vendor');
      const vendorPublicId = vendor.public_id || ('vnd@' + String(vendor.vendor_id).padStart(4, '0'));
      responsePayload.token = tokens.accessToken;
      responsePayload.accessToken = tokens.accessToken;
      responsePayload.refreshToken = tokens.refreshToken;
      responsePayload.vendor_id = Number(vendor.vendor_id);
      responsePayload.public_id = vendorPublicId;
      responsePayload.role = 'vendor';
      responsePayload.vendor = {
        vendor_id: Number(vendor.vendor_id),
        public_id: vendorPublicId,
        store_name: vendor.store_name,
        vendor_name: vendor.vendor_name,
        email: vendor.email,
        phone_number: vendor.phone_number,
        status: statusLower,
        role: 'vendor'
      };
    } else {
      const u = user || vendor;
      const userStatusLower = (u.status || 'active').toLowerCase();
      if (userStatusLower === 'blocked' || userStatusLower === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'Your resident account has been blocked by admin.',
          message: 'Your account has been blocked. Please contact customer support.'
        });
      }
      const tokens = generateTokens(u, 'user');
      responsePayload.token = tokens.accessToken;
      responsePayload.accessToken = tokens.accessToken;
      responsePayload.refreshToken = tokens.refreshToken;
      responsePayload.role = 'user';
      responsePayload.user = {
        user_id: u.user_id || `usr_v_${u.vendor_id}`,
        name: u.name || u.vendor_name,
        email: u.email,
        phone: u.phone || u.phone_number,
        role: 'user'
      };
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


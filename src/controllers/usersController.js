const { query } = require('../models/db');
const { hashPassword, comparePassword, generateTokens, generateOTP, verifyOTP, verifyFirebaseToken, normalizePhone } = require('../utils/auth');
const logger = require('../utils/logger');

/**
 * B0. Send OTP to Resident User Phone or Email
 * POST /api/users/send-otp
 */
/**
 * B0. Send OTP Information Route
 * POST /api/users/send-otp
 */
async function sendOtp(req, res) {
  try {
    const { identifier, phone, email, purpose, type } = req.body;
    const target = identifier || phone || email;

    if (!target) {
      return res.status(400).json({ error: 'Phone number or email is required' });
    }

    const cleanTarget = String(target).trim().replace(/[^0-9+]/g, '');
    const last10 = cleanTarget.slice(-10);
    const mode = purpose || type;

    if (mode === 'login' || mode === 'check_login') {
      const userRes = await query(
        `SELECT user_id FROM users WHERE phone = ? OR phone = ? OR phone LIKE ?`,
        [cleanTarget, last10, `%${last10}`]
      );
      if (!userRes.rows || userRes.rows.length === 0) {
        return res.status(404).json({
          exists: false,
          error: 'No account found with this mobile number. Please register your account first.'
        });
      }
    } else if (mode === 'register' || mode === 'check_register') {
      const userRes = await query(
        `SELECT user_id FROM users WHERE phone = ? OR phone = ? OR phone LIKE ?`,
        [cleanTarget, last10, `%${last10}`]
      );
      if (userRes.rows && userRes.rows.length > 0) {
        return res.status(400).json({
          exists: true,
          error: 'An account with this mobile number already exists. Please log in instead.'
        });
      }
    }

    console.log(`🔥 [FIREBASE PHONE AUTH] Send OTP Request Received`);
    console.log(`   ├─ Target: ${cleanTarget}`);
    console.log(`   ├─ Purpose: ${mode || 'general'}`);

    const generatedOtpCode = generateOTP(cleanTarget);
    logger.auth(`OTP generated for target: ${cleanTarget}`, { target: cleanTarget, method: 'sendOtp' });

    res.status(200).json({
      exists: true,
      message: 'OTP dispatch initiated. Please enter the verification code or complete Firebase auth.',
      target: String(target),
      otp: generatedOtpCode,
      simulationOtp: generatedOtpCode,
      debug_otp: generatedOtpCode,
      provider: 'firebase'
    });
  } catch (err) {
    console.error('❌ [OTP ERROR] Error handling send OTP:', err.message);
    logger.error('Error in send OTP route:', { error: err.message });
    res.status(500).json({ error: 'Failed to process OTP request' });
  }
}

/**
 * B0.2 Check if Resident User Phone is Registered
 * POST /api/users/check-phone
 */
async function checkPhone(req, res) {
  try {
    const { phone, identifier, mobile, phone_number } = req.body;
    const rawTarget = String(phone || identifier || mobile || phone_number || '').trim();

    if (!rawTarget) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const cleanPhone = rawTarget.replace(/[^0-9+]/g, '');
    const last10 = cleanPhone.slice(-10);

    const userRes = await query(
      `SELECT user_id, name, phone FROM users WHERE phone = ? OR phone = ? OR phone LIKE ?`,
      [cleanPhone, last10, `%${last10}`]
    );

    const exists = userRes.rows && userRes.rows.length > 0;

    res.status(200).json({
      exists,
      phone: cleanPhone,
      message: exists ? 'Account found' : 'No account found with this mobile number'
    });
  } catch (err) {
    console.error('Error checking user phone:', err);
    res.status(500).json({ error: 'Failed to check phone registration' });
  }
}

/**
 * B0.1 Verify Firebase Phone Auth ID Token or Standard OTP
 * POST /api/users/verify-otp
 */
async function verifyOtp(req, res) {
  try {
    const { firebase_token, idToken, otp, phone, mobile, identifier, phone_number } = req.body;
    const token = firebase_token || idToken;

    if (token) {
      console.log('🔍 [FIREBASE VERIFY] Verifying Firebase ID Token...');
      const fbResult = await verifyFirebaseToken(token);
      console.log('✅ [FIREBASE VERIFY SUCCESS] Verified Phone:', fbResult.phone_number, '| UID:', fbResult.uid);

      return res.status(200).json({
        message: 'Firebase Phone Token verified successfully',
        valid: true,
        firebase_uid: fbResult.uid,
        phone_number: fbResult.phone_number
      });
    }

    const target = String(phone || mobile || identifier || phone_number || '').trim();
    const cleanOtp = otp ? String(otp).trim() : '';

    if (target && cleanOtp) {
      console.log(`🔍 [OTP VERIFY] Verifying OTP ${cleanOtp} for target ${target}...`);
      const otpRes = verifyOTP(target, cleanOtp);
      if (otpRes.valid) {
        return res.status(200).json({
          message: 'OTP verified successfully',
          valid: true,
          phone_number: target
        });
      }

      return res.status(400).json({ error: otpRes.reason || 'Invalid OTP code. Please double check your verification code.' });
    }

    return res.status(400).json({ error: 'firebase_token, idToken, or mobile number and otp are required for OTP verification' });
  } catch (err) {
    console.error('❌ [FIREBASE VERIFY ERROR]:', err.message);
    res.status(400).json({ error: err.message || 'Firebase token verification failed' });
  }
}

/**
 * B1. Resident User Login (Password, OTP, or Firebase Phone Token)
 * POST /api/users/login
 */
async function loginUser(req, res) {
  try {
    const { phone, mobile, phone_number, mobile_number, identifier, password, firebase_token, idToken, otp } = req.body;
    const fbToken = firebase_token || idToken;

    let userPhone = String(phone || mobile || phone_number || mobile_number || identifier || '').trim();

    // 1. Firebase Token Auth Flow
    if (fbToken) {
      console.log('🔐 [LOGIN ATTEMPT] Authenticating via Firebase ID Token...');
      const fbResult = await verifyFirebaseToken(fbToken);
      const rawPhone = fbResult.phone_number || '';
      userPhone = normalizePhone(rawPhone) || userPhone;

      if (!userPhone) {
        return res.status(400).json({ error: 'Firebase token does not contain a verified phone number' });
      }
    } else if (otp) {
      // 2. OTP Verification Auth Flow
      if (!userPhone) {
        return res.status(400).json({ error: 'Mobile number is required for OTP login' });
      }
      console.log(`🔐 [LOGIN ATTEMPT] Authenticating ${userPhone} via OTP`);
      const otpRes = verifyOTP(userPhone, otp);
      if (!otpRes.valid) {
        return res.status(400).json({ error: otpRes.reason || 'Invalid OTP code. Please enter the correct verification code.' });
      }
    } else if (password) {
      // 3. Password Auth Flow
      if (!userPhone) {
        return res.status(400).json({ error: 'Mobile number is required for password login' });
      }
      console.log(`🔐 [LOGIN ATTEMPT] Authenticating ${userPhone} via Password`);
    } else {
      return res.status(400).json({ error: 'Either password, OTP, or firebase_token is required for login' });
    }

    // 4. Database Lookup / Auto-Registration for Verified Phone Numbers
    let userRes = await query(
      `SELECT u.*, s.society_name 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.phone = ? OR u.phone = ? OR u.phone LIKE ?`,
      [userPhone, userPhone.slice(-10), `%${userPhone.slice(-10)}`]
    );

    let user;

    if (userRes.rows.length === 0) {
      if (fbToken || otp) {
        // Auto-register user verified via Firebase Phone Auth or OTP
        const userName = `Resident ${userPhone.slice(-4)}`;
        const userId = `usr_${Date.now().toString().slice(-6)}`;
        await query(
          `INSERT INTO users (user_id, name, phone, society_id, flat, joined_date, avatar)
           VALUES (?, ?, ?, 1, 'Tower A-402', 'August 2026', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200')`,
          [userId, userName, userPhone]
        );
        userRes = await query(`SELECT * FROM users WHERE user_id = ?`, [userId]);
        user = userRes.rows[0];
      } else {
        return res.status(401).json({ error: 'Invalid mobile number or account does not exist' });
      }
    } else {
      user = userRes.rows[0];
    }

    if (password && !fbToken && !otp) {
      const matchRes = await comparePassword(password, user.password_hash);
      if (!matchRes.matches) {
        return res.status(401).json({ error: 'Invalid mobile number or password' });
      }
    }

    const tokenPayload = { id: user.user_id, role: 'user', phone: user.phone };
    const tokens = generateTokens(tokenPayload, 'user');

    logger.auth(`User login successful for phone ${user.phone} (ID: ${user.user_id}) via ${fbToken ? 'Firebase Token' : otp ? 'OTP' : 'Password'}`, {
      userId: user.user_id,
      phone: user.phone,
      method: fbToken ? 'firebase' : otp ? 'otp' : 'password'
    });

    res.status(200).json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        user_id: String(user.user_id),
        name: user.name,
        email: user.email,
        phone: user.phone,
        society_id: user.society_id ? String(user.society_id) : '1',
        society_name: user.society_name || 'Omaxe Greenwood Residency',
        flat: user.flat || 'Tower A-402',
        joined_date: user.joined_date || 'August 2026',
        avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
      }
    });
  } catch (err) {
    logger.error('Error during resident user login:', { error: err.message });
    res.status(500).json({ error: err.message || 'User login failed due to a server error' });
  }
}

/**
 * B2. Resident User Registration (Mobile Number Primary)
 * POST /api/users/register
 */
async function registerUser(req, res) {
  try {
    const { name, email, phone, mobile, phone_number, mobile_number, identifier, password, society_id, flat, otp, firebase_token, idToken } = req.body;
    const fbToken = firebase_token || idToken;

    let userPhone = String(phone || mobile || phone_number || mobile_number || identifier || '').trim();
    const userName = String(name || 'Resident User').trim();
    const regMethod = fbToken ? 'Firebase Token' : otp ? `OTP (${otp})` : 'Password';

    console.log(`📝 [REGISTRATION ATTEMPT] Name: ${userName} | Mobile: ${userPhone || 'Token-only'} | Auth Method: ${regMethod}`);

    if (fbToken) {
      console.log('📝 [REGISTRATION ATTEMPT] Verifying Firebase Phone Token...');
      const fbResult = await verifyFirebaseToken(fbToken);
      const rawPhone = fbResult.phone_number || '';
      userPhone = normalizePhone(rawPhone) || userPhone;
    } else {
      console.log(`📝 [REGISTRATION ATTEMPT] Registering ${userName} (${userPhone}) with password`);
    }

    if (!userPhone) {
      return res.status(400).json({ error: 'Mobile number or firebase_token is required for user registration' });
    }

    const existing = await query(`SELECT user_id FROM users WHERE phone = ?`, [userPhone]);
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this mobile number already exists' });
    }

    const userId = `usr_${Date.now().toString().slice(-6)}`;
    const pwdHash = password ? await hashPassword(password) : await hashPassword('UserDefaultPass123!');
    const socId = society_id ? parseInt(society_id, 10) : 1;

    await query(
      `INSERT INTO users (user_id, name, email, phone, password_hash, society_id, flat, joined_date, avatar)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'August 2026', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200')`,
      [userId, userName, email || `${userId}@digilocal.internal`, userPhone, pwdHash, socId, flat || 'Tower A-402']
    );

    const socRes = await query(`SELECT society_name FROM societies WHERE society_id = ?`, [socId]);
    const societyName = socRes.rows[0]?.society_name || 'Omaxe Greenwood Residency';

    const tokens = generateTokens({ id: userId, role: 'user', phone: userPhone }, 'user');

    logger.auth(`User registered successfully: ${userName} (${userPhone})`, {
      userId,
      phone: userPhone,
      method: fbToken ? 'firebase' : otp ? 'otp' : 'password'
    });

    res.status(201).json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        user_id: userId,
        name: userName,
        phone: userPhone,
        society_id: String(socId),
        society_name: societyName,
        flat: flat || 'Tower A-402'
      }
    });
  } catch (err) {
    logger.error('Error during resident user registration:', { error: err.message });
    res.status(500).json({ error: 'User registration failed due to a server error' });
  }
}

/**
 * B3. Fetch Resident User Orders by User ID or Phone Number
 * GET /api/users/:userId/orders
 */
async function getUserOrders(req, res) {
  try {
    const { userId } = req.params;
    const isPhone = /^\d{10}$/.test(userId);

    let userObjId = userId;
    if (isPhone) {
      const uRes = await query(`SELECT user_id FROM users WHERE phone = ? LIMIT 1`, [userId]);
      if (uRes.rows && uRes.rows.length > 0) {
        userObjId = uRes.rows[0].user_id;
      }
    }

    const ordersRes = await query(
      `SELECT o.order_id, o.user_id, o.vendor_id, v.store_name, o.total_amount, o.status, 
              COALESCE(o.created_at, o.order_timestamp) as created_at, s.society_name, o.delivery_address
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
       LEFT JOIN societies s ON o.society_id = s.society_id
       LEFT JOIN users u ON o.user_id = u.user_id
       WHERE o.user_id = ? OR u.phone = ? OR o.user_id = ?
       ORDER BY o.order_id DESC`,
      [userId, userId, userObjId]
    );

    const orders = [];
    for (const ord of (ordersRes.rows || [])) {
      const detailsRes = await query(
        `SELECT item_name, quantity, COALESCE(price, unit_price, 0) as price FROM order_details WHERE order_id = ?`,
        [ord.order_id]
      ).catch(() => ({ rows: [] }));

      orders.push({
        order_id: String(ord.order_id),
        user_id: String(ord.user_id),
        vendor_id: Number(ord.vendor_id),
        store_name: ord.store_name || 'FreshMart Grocery & Organic',
        total_amount: Number(ord.total_amount || 0),
        status: ord.status || 'PENDING',
        created_at: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
        society_name: ord.society_name || 'Omaxe Greenwood Residency',
        delivery_address: ord.delivery_address || 'Tower A-402',
        items: (detailsRes.rows || []).map(i => ({
          item_name: i.item_name || 'Item',
          quantity: Number(i.quantity || 1),
          price: Number(i.price || 0)
        }))
      });
    }

    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
}

/**
 * GET /api/users/profile - Fetch Resident User Profile
 */
async function getUserProfile(req, res) {
  try {
    const userId = req.user?.id || req.params.userId || req.query.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized user' });

    const userRes = await query(
      `SELECT u.*, s.society_name 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ?`,
      [userId, String(userId)]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    res.status(200).json({
      user_id: String(user.user_id),
      name: user.name,
      email: user.email,
      phone: user.phone,
      society_id: user.society_id ? String(user.society_id) : '1',
      society_name: user.society_name || 'Omaxe Greenwood Residency',
      flat: user.flat || 'Tower A-402',
      joined_date: user.joined_date || 'August 2026',
      avatar: user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  checkPhone,
  loginUser,
  registerUser,
  getUserOrders,
  getUserProfile
};

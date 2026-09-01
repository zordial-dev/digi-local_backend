const { query } = require('../../models/db');
const { hashPassword, comparePassword, generateTokens, generateOTP, verifyOTP, normalizePhone } = require('../../utils/auth');
const { formatISTISO } = require('../../utils/time');
const { sendOTP: sendMsg91OTP, verifyOTP: verifyMsg91OTP } = require('../../services/msg91Service');
const logger = require('../../utils/logger');

/**
 * B0. Send OTP to Resident User Phone via MSG91
 * POST /api/users/send-otp
 */
async function sendOtp(req, res) {
  try {
    const { identifier, phone, mobile, phone_number, email, purpose, type, country_code, countryCode } = req.body;
    const target = identifier || phone || mobile || phone_number || email;

    if (!target) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const cleanTarget = String(target).trim();
    const cleanPhoneDigits = cleanTarget.replace(/[^0-9]/g, '');
    const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
    const mode = (purpose || type || '').toLowerCase();

    const isRegistrationIntent = mode === 'register' || mode === 'signup' || mode === 'check_register';

    // Verify user/vendor account existence in database
    const userRes = await query(
      `SELECT user_id FROM users WHERE phone = ? OR phone = ? OR phone = ? OR phone LIKE ?`,
      [cleanTarget, cleanPhoneDigits, last10, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const vendorRes = await query(
      `SELECT vendor_id FROM vendors WHERE phone_number = ? OR phone_number = ? OR phone_number = ? OR phone_number LIKE ?`,
      [cleanTarget, cleanPhoneDigits, last10, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const userExists = (userRes.rows && userRes.rows.length > 0) || (vendorRes.rows && vendorRes.rows.length > 0);

    if (isRegistrationIntent) {
      if (userExists) {
        return res.status(400).json({
          success: false,
          exists: true,
          error: 'An account with this mobile number already exists. Please log in instead.'
        });
      }
    } else {
      // Default / Login intent: Must verify account exists in DB before sending OTP
      if (!userExists) {
        console.log(`⚠️ [SEND OTP BLOCKED] Account "${cleanTarget}" not found in database. Disallowing OTP send.`);
        return res.status(404).json({
          success: false,
          exists: false,
          error: 'No account found with this mobile number. Please register your account first.'
        });
      }
    }

    const msg91Result = await sendMsg91OTP(cleanTarget, country_code || countryCode);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      target: cleanTarget,
      provider: 'msg91',
      data: msg91Result
    });
  } catch (err) {
    console.error('❌ [MSG91 OTP ERROR] Error handling send OTP:', err.message);
    logger.error('Error in send OTP route:', { error: err.message });
    res.status(500).json({ success: false, message: err.message || 'Failed to send OTP via MSG91' });
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
    const cleanPhoneDigits = rawTarget.replace(/[^0-9]/g, '');
    const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;

    const userRes = await query(
      `SELECT user_id, name, phone FROM users WHERE phone = ? OR phone = ? OR phone = ? OR phone LIKE ?`,
      [rawTarget, cleanPhone, last10, `%${last10}`]
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
 * B0.1 Verify MSG91 SMS OTP
 * POST /api/users/verify-otp
 */
async function verifyOtp(req, res) {
  try {
    const { otp, code, otp_code, phone, mobile, identifier, phone_number, country_code, countryCode } = req.body;
    const cleanOtp = String(otp || code || otp_code || '').trim();
    const target = String(phone || mobile || identifier || phone_number || '').trim();

    if (!target || !cleanOtp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP code are required'
      });
    }

    const msg91Result = await verifyMsg91OTP(target, cleanOtp, country_code || countryCode);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      valid: true,
      data: msg91Result,
      phone_number: target
    });
  } catch (err) {
    console.error('❌ [MSG91 VERIFY ERROR]:', err.message);
    res.status(400).json({
      success: false,
      message: err.message || 'Invalid or expired OTP'
    });
  }
}


async function getAllVendors(Req, res) {

}

/**
 * B1. Resident User Login (Password or MSG91 SMS OTP)
 * POST /api/users/login
 */
async function loginUser(req, res) {
  try {
    const { phone, mobile, phone_number, mobile_number, identifier, password, otp, code, otp_code } = req.body;
    const loginOtp = otp || code || otp_code;

    let userPhone = String(phone || mobile || phone_number || mobile_number || identifier || '').trim();

    if (loginOtp) {
      if (!userPhone) {
        return res.status(400).json({ error: 'Mobile number is required for OTP login' });
      }
      console.log(`🔐 [LOGIN ATTEMPT] Authenticating ${userPhone} via MSG91 OTP`);
      const msg91Res = await verifyMsg91OTP(userPhone, loginOtp).catch(() => null);
      if (!msg91Res) {
        return res.status(400).json({ error: 'Invalid or expired OTP code. Please enter the correct verification code.' });
      }
    } else if (password) {
      if (!userPhone) {
        return res.status(400).json({ error: 'Mobile number is required for password login' });
      }
      console.log(`🔐 [LOGIN ATTEMPT] Authenticating ${userPhone} via Password`);
    } else {
      return res.status(400).json({ error: 'Either password or OTP is required for login' });
    }

    const cleanPhoneDigits = userPhone.replace(/[^0-9]/g, '');
    const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;

    // Database Lookup for Phone Number in users table
    let userRes = await query(
      `SELECT u.*, s.society_name 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.phone = ? OR u.phone = ? OR u.phone = ? OR u.phone LIKE ? OR u.phone LIKE ? OR REPLACE(REPLACE(REPLACE(u.phone, '+', ''), ' ', ''), '-', '') LIKE ?`,
      [userPhone, cleanPhoneDigits, last10, `%${last10}`, `+91${last10}`, `%${last10}`]
    );

    let user = userRes.rows[0];

    // Fallback: Check vendors table if mobile number not yet in users table (allows vendor to act as Resident User)
    if (!user) {
      const vendorUserRes = await query(
        `SELECT v.*, s.society_name 
         FROM vendors v 
         LEFT JOIN societies s ON v.society_id = s.society_id 
         WHERE v.phone_number = ? OR v.phone_number = ? OR v.phone_number = ? OR v.phone_number LIKE ? OR v.phone_number LIKE ?`,
        [userPhone, cleanPhoneDigits, last10, `%${last10}`, `+91${last10}`]
      );

      if (vendorUserRes.rows && vendorUserRes.rows.length > 0) {
        const v = vendorUserRes.rows[0];
        // Vendor acting as Resident User: customer capabilities are ACTIVE regardless of vendor store status (PENDING/REJECTED/BLOCKED/HOLD)
        user = {
          user_id: `usr_v_${v.vendor_id}`,
          name: v.vendor_name || v.store_name,
          email: v.email,
          phone: v.phone_number,
          password_hash: v.password_hash || v.password,
          password: v.password,
          society_id: v.society_id,
          society_name: v.society_name || v.area || '',
          flat: v.shop_number || '',
          status: 'ACTIVE'
        };

        // Auto-persist in users table for seamless future user API calls
        await query(
          `INSERT INTO users (user_id, name, email, phone, password_hash, society_id, society_name, flat, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
          [user.user_id, user.name, user.email, user.phone, user.password_hash || user.password, user.society_id, user.society_name, user.flat]
        ).catch(() => {});
      }
    }

    if (!user) {
      return res.status(404).json({
        exists: false,
        error: `No user account found with mobile number ${userPhone}. Please register your account first.`
      });
    }
    const userStatusLower = String(user.status || 'active').toLowerCase();

    if (userStatusLower === 'blocked' || userStatusLower === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your resident user account has been blocked by admin.',
        code: 'USER_BLOCKED',
        is_blocked: true,
        block_reason: user.block_reason || 'Policy violation / Admin restriction',
        message: 'Your account is blocked. Please contact customer support for assistance.'
      });
    }

    if (password && !loginOtp) {
      const matchRes = await comparePassword(password, user.password_hash || user.password);
      if (!matchRes || !matchRes.matches) {
        return res.status(401).json({ error: 'Incorrect password. Please check your password and try again.' });
      }
    }

    const tokenPayload = { id: user.user_id, role: 'user', phone: user.phone };
    const tokens = generateTokens(tokenPayload, 'user');

    logger.auth(`User login successful for phone ${user.phone} (ID: ${user.user_id}) via ${loginOtp ? 'MSG91 OTP' : 'Password'}`, {
      userId: user.user_id,
      phone: user.phone,
      method: loginOtp ? 'msg91_otp' : 'password'
    });

    res.status(200).json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        user_id: String(user.user_id),
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        status: userStatusLower,
        is_blocked: false,
        society_id: user.society_id ? String(user.society_id) : '',
        society_name: user.society_name || user.area || '',
        area: user.area || user.society_name || '',
        flat: user.flat || '',
        city: user.city || '',
        pincode: user.pincode || '',
        address: user.address || ''
      }
    });
  } catch (err) {
    logger.error('Error during resident user login:', { error: err.message });
    res.status(500).json({ error: err.message || 'User login failed due to a server error' });
  }
}

/**
 * B2. Resident User Registration (Mobile Number Primary with MSG91 OTP or Password)
 * POST /api/users/register
 */
async function registerUser(req, res) {
  try {
    const { name, email, phone, mobile, phone_number, mobile_number, identifier, password, society_id, flat, area, location, city, pincode, address, otp, code, otp_code } = req.body;
    const inputOtp = otp || code || otp_code;

    let userPhone = String(phone || mobile || phone_number || mobile_number || identifier || '').trim();
    const userName = String(name || 'Resident User').trim();

    if (inputOtp) {
      if (!userPhone) {
        return res.status(400).json({ error: 'Mobile number is required for OTP verification' });
      }
      const msg91Res = await verifyMsg91OTP(userPhone, inputOtp).catch(() => null);
      if (!msg91Res) {
        return res.status(400).json({ error: 'Invalid or expired OTP code for registration' });
      }
    }

    if (!userPhone) {
      return res.status(400).json({ error: 'Mobile number is required for user registration' });
    }

    const cleanPhoneDigits = userPhone.replace(/[^0-9]/g, '');
    const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;

    const existing = await query(
      `SELECT user_id FROM users WHERE phone = ? OR phone = ? OR phone = ? OR phone LIKE ?`,
      [userPhone, cleanPhoneDigits, last10, `%${last10}`]
    );
    if (existing.rows && existing.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this mobile number already exists' });
    }

    const userId = `usr_${Date.now().toString().slice(-6)}`;
    const pwdHash = password ? await hashPassword(password) : await hashPassword('UserDefaultPass123!');
    const socId = (society_id !== undefined && society_id !== null && !isNaN(parseInt(society_id, 10))) ? parseInt(society_id, 10) : null;
    const userArea = String(area || location || req.body.society_name || '').trim();
    const userFlat = String(flat || req.body.unit || req.body.house_number || '').trim();
    const userCity = String(city || '').trim();
    const userPincode = String(pincode || '').trim();
    const userAddress = String(address || '').trim();
    const userEmail = String(email || '').trim();

    await query(
      `INSERT INTO users (user_id, name, email, phone, password_hash, society_id, society_name, area, flat, city, pincode, address, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [userId, userName, userEmail, userPhone, pwdHash, socId, userArea, userArea, userFlat, userCity, userPincode, userAddress]
    ).catch(async () => {
      // Fallback if city/pincode/address columns missing in Postgres schema
      return query(
        `INSERT INTO users (user_id, name, email, phone, password_hash, society_id, society_name, flat, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
        [userId, userName, userEmail, userPhone, pwdHash, socId, userArea, userFlat]
      );
    });

    let societyName = userArea;
    if (socId) {
      const socRes = await query(`SELECT society_name FROM societies WHERE society_id = ?`, [socId]).catch(() => ({ rows: [] }));
      societyName = socRes.rows[0]?.society_name || userArea;
    }

    // Dispatch welcome email asynchronously if email provided
    if (userEmail) {
      const { sendAccountRegistrationEmail } = require('../../templates/accountRegistrationEmail');
      sendAccountRegistrationEmail('user', {
        name: userName,
        email: userEmail,
        phone: userPhone,
        society_name: societyName,
        flat: userFlat
      });
    }

    const tokens = generateTokens({ id: userId, role: 'user', phone: userPhone }, 'user');

    logger.auth(`User registered successfully: ${userName} (${userPhone})`, {
      userId,
      phone: userPhone,
      method: inputOtp ? 'msg91_otp' : 'password'
    });

    res.status(201).json({
      success: true,
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        user_id: String(userId),
        name: userName,
        email: userEmail,
        phone: userPhone,
        status: 'active',
        is_blocked: false,
        society_id: socId ? String(socId) : '',
        society_name: societyName,
        area: userArea,
        flat: userFlat,
        city: userCity,
        pincode: userPincode,
        address: userAddress
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
    const cleanPhone = String(userId).trim().replace(/[^0-9]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const uRes = await query(
      `SELECT user_id FROM users WHERE user_id = ? OR phone = ? OR phone LIKE ?`,
      [userId, userId, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const matchedUserIds = Array.from(new Set([
      userId,
      ...(uRes.rows || []).map(r => r.user_id)
    ]));

    const placeholders = matchedUserIds.map(() => '?').join(',');
    const ordersRes = await query(
      `SELECT o.order_id, o.user_id, o.vendor_id, v.store_name, o.total_amount, o.status, 
              COALESCE(o.created_at, o.order_timestamp) as created_at, s.society_name, o.delivery_address
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
       LEFT JOIN societies s ON o.society_id = s.society_id
       LEFT JOIN users u ON o.user_id = u.user_id
       WHERE o.user_id IN (${placeholders}) OR u.phone = ? OR u.phone LIKE ?
       ORDER BY o.order_id DESC`,
      [...matchedUserIds, userId, `%${last10}`]
    );

    const orders = [];
    for (const ord of (ordersRes.rows || [])) {
      const detailsRes = await query(
        `SELECT item_id, item_name, quantity, COALESCE(price, unit_price, 0) as price, COALESCE(unit_price, price, 0) as unit_price FROM order_details WHERE order_id = ?`,
        [ord.order_id]
      ).catch(() => ({ rows: [] }));

      const mappedItems = (detailsRes.rows || []).map(i => ({
        item_id: Number(i.item_id || 1),
        item_name: i.item_name || 'Item',
        quantity: Number(i.quantity || 1),
        unit_price: Number(i.unit_price || i.price || 0),
        price: Number(i.price || i.unit_price || 0),
        menuItem: {
          name: i.item_name || 'Item',
          price: Number(i.price || i.unit_price || 0)
        }
      }));

      const statusUpper = String(ord.status || 'PLACED').toUpperCase();

      orders.push({
        order_id: String(ord.order_id),
        id: String(ord.order_id),
        user_id: String(ord.user_id),
        customer_name: ord.customer_name || 'Aarushi',
        phone: ord.phone || ord.customer_phone || '+919784319840',
        user_phone: ord.phone || ord.customer_phone || '+919784319840',
        vendor_id: Number(ord.vendor_id),
        store_name: ord.store_name || 'FreshMart Grocery & Organic',
        store_logo: ord.store_logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&auto=format&fit=crop&q=80',
        society_name: ord.society_name || 'Greenwood Residency',
        delivery_address: ord.delivery_address || 'Tower A-402',
        status: statusUpper,
        status_label: statusUpper === 'DELIVERED' || statusUpper === 'COMPLETED' ? 'Order Delivered' : 'Order Paid & Out for Delivery',
        payment_status: ord.payment_status || 'PAID',
        payment_method: ord.payment_method || 'COD / WhatsApp',
        total_amount: Number(ord.total_amount || 0),
        date: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
        created_at: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
        items: mappedItems
      });
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      total: orders.length,
      data: orders,
      orders: orders
    });
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
    const statusLower = String(user.status || 'active').toLowerCase();
    if (statusLower === 'blocked' || statusLower === 'suspended') {
      return res.status(403).json({
        success: false,
        error: 'Your resident user account has been blocked by admin.',
        code: 'USER_BLOCKED',
        is_blocked: true,
        action: 'logout',
        message: 'Account is blocked. Please log out and contact support.'
      });
    }

    res.status(200).json({
      user_id: String(user.user_id),
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      status: statusLower,
      is_blocked: false,
      society_id: user.society_id ? String(user.society_id) : '',
      society_name: user.society_name || user.area || '',
      area: user.area || user.society_name || '',
      flat: user.flat || '',
      city: user.city || '',
      pincode: user.pincode || '',
      address: user.address || '',
      created_at: formatISTISO(user.created_at)
    });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * GET /api/users/status or /api/users/status/:userId - Check Resident User Status
 */
async function getUserStatus(req, res) {
  try {
    let userId = req.params.userId || req.params.id || req.user?.id || req.user?.user_id || req.query.userId || req.query.user_id || req.query.phone;

    if (!userId && req.headers['authorization']) {
      try {
        const token = req.headers['authorization'].replace('Bearer ', '').trim();
        const { verifyJwt } = require('../../utils/auth');
        const authConfig = require('../../config/auth');
        const payload = verifyJwt(token, authConfig.jwt.secret);
        if (payload) userId = payload.user_id || payload.id;
      } catch (_) {}
    }

    if (!userId) return res.status(400).json({ error: 'User ID or Authorization Bearer token is required to fetch status.' });

    const result = await query(
      `SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`,
      [userId, String(userId), String(userId)]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: `User ID "${userId}" not found.` });
    }

    const u = result.rows[0];
    const statusLower = String(u.status || 'active').toLowerCase();
    const isBlocked = statusLower === 'blocked' || statusLower === 'suspended';

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        user_id: String(u.user_id),
        status: 'blocked',
        code: 'USER_BLOCKED',
        is_blocked: true,
        action: 'logout',
        error: 'Resident user account has been blocked by administrator.',
        message: 'Your resident user account has been blocked. Please log out and contact customer support.',
        recommended_ui_text: 'Your user account has been blocked by admin. Access denied.'
      });
    }

    return res.status(200).json({
      success: true,
      user_id: String(u.user_id),
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      status: 'active',
      is_blocked: false,
      society_id: u.society_id ? String(u.society_id) : '',
      society_name: u.society_name || u.area || '',
      area: u.area || u.society_name || '',
      flat: u.flat || '',
      city: u.city || '',
      pincode: u.pincode || '',
      address: u.address || '',
      message: 'User account is active.',
      recommended_ui_text: 'Your account is active.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch user status.' });
  }
}

/**
 * DELETE /api/users/profile, /api/users/me, or /api/users/:userId - Delete Resident User Account
 */
async function deleteAccount(req, res) {
  try {
    const target = req.params.userId || req.params.id || req.user?.id || req.user?.user_id || req.user?.phone || req.query.userId || req.query.id || req.query.phone || req.body?.user_id || req.body?.userId || req.body?.phone || req.body?.mobile;

    let user = null;

    if (target) {
      const cleanTarget = String(target).trim();
      const cleanPhoneDigits = cleanTarget.replace(/[^0-9]/g, '');
      const last10 = cleanPhoneDigits.length >= 10 ? cleanPhoneDigits.slice(-10) : cleanPhoneDigits;
      const cleanEmail = cleanTarget.toLowerCase();

      const userRes = await query(
        `SELECT user_id, name, phone, email FROM users 
         WHERE user_id = ? 
            OR CAST(user_id AS TEXT) = ? 
            OR phone = ? 
            OR phone = ? 
            OR phone LIKE ? 
            OR (LOWER(email) = ? AND email != '')`,
        [cleanTarget, cleanTarget, cleanTarget, cleanPhoneDigits, `%${last10}`, cleanEmail]
      );
      user = userRes.rows[0];
    }

    // Fallback: Check req.user authenticated user profile if target parameter wasn't explicitly provided
    if (!user && req.user) {
      const authUserId = req.user.id || req.user.user_id;
      const authPhone = req.user.phone || req.user.phone_number;
      if (authUserId || authPhone) {
        const userRes = await query(
          `SELECT user_id, name, phone, email FROM users 
           WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`,
          [String(authUserId), String(authUserId), String(authPhone)]
        );
        user = userRes.rows[0];
      }
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found or already deleted.'
      });
    }

    const userIdStr = String(user.user_id);

    // 1. Delete associated dependent records to avoid Foreign Key constraint errors
    await query(`DELETE FROM enquiries WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`, [user.user_id, userIdStr]).catch(() => {});
    await query(`DELETE FROM orders WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`, [user.user_id, userIdStr]).catch(() => {});
    await query(`DELETE FROM push_tokens WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`, [user.user_id, userIdStr]).catch(() => {});

    // 2. Permanently delete user account record from database
    await query(
      `DELETE FROM users 
       WHERE user_id = ? 
          OR CAST(user_id AS TEXT) = ? 
          OR phone = ? 
          OR (LOWER(email) = ? AND email != '')`,
      [user.user_id, userIdStr, user.phone, (user.email || '').toLowerCase()]
    );

    // Clear memory cache
    const memoryCache = require('../../utils/cache');
    memoryCache.clear();

    logger.auth(`User account permanently deleted: ${user.name} (ID: ${user.user_id}, Phone: ${user.phone})`, { userId: user.user_id });

    return res.status(200).json({
      success: true,
      message: `Resident user account for "${user.name}" (ID: ${user.user_id}, Phone: ${user.phone}) deleted permanently.`,
      user_id: userIdStr,
      deleted_at: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error deleting user account:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete user account: ' + (err.message || 'Database error')
    });
  }
}

/**
 * B2.3 Update Resident User Profile & Address
 * PUT/POST/PATCH /api/users/profile, /api/users/address, or /api/users/:userId/address
 */
async function updateUserProfile(req, res) {
  try {
    const userId = req.body?.user_id || req.body?.userId || req.params?.userId || req.params?.id || req.user?.id || req.user?.user_id || req.body?.phone;
    if (!userId) {
      return res.status(400).json({ error: 'User ID or authenticated session is required to update profile/address.' });
    }

    const { name, email, flat, house_number, unit, area, location, society_name, city, pincode, address, full_address } = req.body;

    const userRes = await query(
      `SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`,
      [String(userId), String(userId), String(userId)]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return res.status(404).json({ error: `User "${userId}" not found.` });
    }

    const existingUser = userRes.rows[0];

    const newName = name !== undefined ? String(name).trim() : existingUser.name;
    const newEmail = email !== undefined ? String(email).trim() : existingUser.email;
    const newFlat = (flat !== undefined ? flat : (house_number !== undefined ? house_number : unit)) !== undefined ? String(flat || house_number || unit).trim() : (existingUser.flat || '');
    const newArea = (area !== undefined ? area : (location !== undefined ? location : society_name)) !== undefined ? String(area || location || society_name).trim() : (existingUser.area || existingUser.society_name || '');
    const newCity = city !== undefined ? String(city).trim() : (existingUser.city || '');
    const newPincode = pincode !== undefined ? String(pincode).trim() : (existingUser.pincode || '');
    const newFullAddress = (address !== undefined ? address : full_address) !== undefined ? String(address || full_address).trim() : (existingUser.address || [newFlat, newArea, newCity, newPincode].filter(Boolean).join(', '));

    await query(`
      UPDATE users 
      SET name = ?,
          email = ?,
          flat = ?,
          area = ?,
          society_name = ?,
          city = ?,
          pincode = ?,
          address = ?
      WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
    `, [newName, newEmail, newFlat, newArea, newArea, newCity, newPincode, newFullAddress, String(userId), String(userId), String(userId)]).catch(async () => {
      // Fallback if city/pincode/address columns missing in older Postgres instances
      return query(`
        UPDATE users 
        SET name = ?, email = ?, flat = ?, society_name = ?
        WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
      `, [newName, newEmail, newFlat, newArea, String(userId), String(userId), String(userId)]);
    });

    const updatedUser = {
      user_id: String(existingUser.user_id),
      name: newName,
      email: newEmail,
      phone: existingUser.phone,
      status: (existingUser.status || 'ACTIVE').toLowerCase(),
      is_blocked: false,
      area: newArea || '',
      society_name: newArea || '',
      flat: newFlat || '',
      city: newCity || '',
      pincode: newPincode || '',
      address: newFullAddress || ''
    };

    return res.status(200).json({
      success: true,
      message: 'User profile and address updated successfully in database.',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating user profile/address:', err);
    return res.status(500).json({ error: 'Failed to update user profile/address.' });
  }
}

module.exports = {
  sendOtp,
  verifyOtp,
  checkPhone,
  loginUser,
  registerUser,
  getUserOrders,
  getUserProfile,
  getUserStatus,
  updateUserProfile,
  deleteAccount
};

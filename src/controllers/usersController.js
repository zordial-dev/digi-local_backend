const { query } = require('../models/db');
const { hashPassword, comparePassword, generateTokens, generateOTP, verifyOTP } = require('../utils/auth');

/**
 * B0. Send OTP to Resident User Phone or Email
 * POST /api/users/send-otp
 */
async function sendOtp(req, res) {
  try {
    const { identifier, phone, email } = req.body;
    const target = identifier || phone || email;

    if (!target) {
      return res.status(400).json({ error: 'Phone number or email is required to send OTP' });
    }

    const otp = generateOTP(target);
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(200).json({
      message: 'OTP sent successfully',
      target: String(target),
      simulationOtp: isProduction ? undefined : otp
    });
  } catch (err) {
    console.error('Error sending OTP:', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
}

/**
 * B0.1 Verify Resident User OTP
 * POST /api/users/verify-otp
 */
async function verifyOtp(req, res) {
  try {
    const { identifier, phone, email, otp } = req.body;
    const target = identifier || phone || email;

    if (!target || !otp) {
      return res.status(400).json({ error: 'Identifier (phone/email) and OTP are required' });
    }

    const result = verifyOTP(target, otp);
    if (!result.valid) {
      return res.status(400).json({ error: result.reason || 'Invalid OTP' });
    }

    res.status(200).json({ message: 'OTP verified successfully', valid: true });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
}

/**
 * B1. Resident User Login (Mobile Number Only)
 * POST /api/users/login
 */
async function loginUser(req, res) {
  try {
    const { phone, mobile, phone_number, mobile_number, identifier, password, otp } = req.body;
    const userPhone = String(phone || mobile || phone_number || mobile_number || identifier || '').trim();

    if (!userPhone) {
      return res.status(400).json({ error: 'Mobile number is required for user login' });
    }

    // 1. Direct OTP Login Flow
    if (otp) {
      const otpRes = verifyOTP(userPhone, otp);
      if (!otpRes.valid) {
        return res.status(400).json({ error: otpRes.reason || 'Invalid OTP code' });
      }
    } else if (process.env.OTP_VERIFICATION_MODE === 'strict' && !password) {
      return res.status(400).json({ error: 'OTP verification is required for login' });
    }

    // 2. Mobile Number Password Authentication
    const userRes = await query(
      `SELECT u.*, s.society_name 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.phone = ? OR u.phone = ?`,
      [userPhone, userPhone.slice(-10)]
    );

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid mobile number or account does not exist' });
    }

    const user = userRes.rows[0];

    if (password) {
      const matchRes = await comparePassword(password, user.password_hash);
      if (!matchRes.matches && !otp) {
        return res.status(401).json({ error: 'Invalid mobile number or password' });
      }
    }

    const tokenPayload = { id: user.user_id, role: 'user', phone: user.phone };
    const tokens = generateTokens(tokenPayload, 'user');

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
    console.error('Error during resident user login:', err);
    res.status(500).json({ error: 'User login failed due to a server error' });
  }
}

/**
 * B2. Resident User Registration (Mobile Number Primary)
 * POST /api/users/register
 */
async function registerUser(req, res) {
  try {
    const { name, email, phone, mobile, phone_number, mobile_number, identifier, password, society_id, flat, otp } = req.body;
    const userPhone = String(phone || mobile || phone_number || mobile_number || identifier || '').trim();
    const userName = String(name || 'Resident User').trim();

    if (!userPhone) {
      return res.status(400).json({ error: 'Mobile number is required for user registration' });
    }

    if (otp) {
      const otpRes = verifyOTP(userPhone, otp);
      if (!otpRes.valid) {
        return res.status(400).json({ error: otpRes.reason || 'Invalid OTP code' });
      }
    } else if (process.env.OTP_VERIFICATION_MODE === 'strict') {
      return res.status(400).json({ error: 'OTP verification is required for registration' });
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
    console.error('Error during resident user registration:', err);
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

module.exports = {
  sendOtp,
  verifyOtp,
  loginUser,
  registerUser,
  getUserOrders
};

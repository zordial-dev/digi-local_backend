const { query } = require('../models/db');
const {
    hashPassword,
    comparePassword,
    generateTokens,
    revokeToken,
    generateOTP,
    verifyOTP
} = require('../utils/auth');
const { recordFailedAttempt, resetFailedAttempts } = require('../middleware/security');
const { sendEmail } = require('../services/emailService');
const { vendorWelcomeEmail } = require('../templates/vendorWelcomeEmail');

const { normalizeImageUrl } = require('../utils/imageUtils');

/**
 * GET /api/vendors/:id - Fetch Vendor Storefront Profile & Catalog Items
 */
async function getVendorPublicProfile(req, res) {
    try {
        const { id } = req.params;
        const vendorRes = await query(
            `SELECT * FROM vendors 
             WHERE (CAST(vendor_id AS TEXT) = ? OR public_id = ? OR LOWER(email) = LOWER(?)) AND status = 'ACTIVE'`,
            [id, id, id]
        );
        if (vendorRes.rows.length === 0) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        const vendor = vendorRes.rows[0];

        const itemsRes = await query(
            `SELECT item_id, item_name, price, category, description, image_url, in_stock 
             FROM items 
             WHERE vendor_id = ? OR vendor_id IN (SELECT vendor_id FROM vendors WHERE LOWER(email) = LOWER(?))
             ORDER BY item_id ASC`,
            [vendor.vendor_id, vendor.email]
        );

        const items = itemsRes.rows.map(item => ({
            item_id: Number(item.item_id),
            item_name: item.item_name,
            price: Number(item.price),
            category: item.category || 'General',
            description: item.description || '',
            image_url: normalizeImageUrl(item.image_url),
            in_stock: Boolean(item.in_stock === 1 || item.in_stock === true)
        }));

        res.status(200).json({
            vendor_id: Number(vendor.vendor_id),
            store_name: vendor.store_name,
            vendor_name: vendor.vendor_name,
            email: vendor.email,
            phone_number: vendor.phone_number,
            opening_time: vendor.opening_time || vendor.opening_timing || '08:00 AM',
            closing_time: vendor.closing_time || vendor.closing_timing || '10:00 PM',
            logo: vendor.logo || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200',
            description: vendor.description,
            society_id: Number(vendor.society_id),
            status: vendor.status,
            items
        });
    } catch (err) {
        console.error('Error fetching vendor details:', err);
        res.status(500).json({ error: 'Failed to fetch vendor details' });
    }
}

/**
 * POST /api/vendors/send-otp
 */
async function sendVendorOtp(req, res) {
    try {
        const { email, phone, mobile, identifier } = req.body;
        const target = email || phone || mobile || identifier;

        if (!target) {
            return res.status(400).json({ error: 'Email or mobile number is required to send OTP' });
        }

        const otp = generateOTP(target);

        res.status(200).json({
            message: 'OTP sent successfully',
            target: String(target),
            simulationOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
    } catch (err) {
        console.error('Error sending vendor OTP:', err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
}

/**
 * POST /api/vendors/register
 */
async function registerVendor(req, res) {
    try {
        const body = req.body || {};

        const vendor_name = String(
            body.vendor_name || body.owner_name || body.ownerName ||
            body.vendorName || body.name || body.owner || 'Vendor Owner'
        ).trim();

        const store_name = String(
            body.store_name || body.shop_name || body.business_name ||
            body.storeName || body.shopName || body.businessName || 'My Store'
        ).trim();

        const email = String(
            body.email || body.email_address || body.emailAddress || ''
        ).trim();

        const password = String(
            body.password || body.pass || body.create_password || ''
        );

        const phone_number = String(
            body.phone_number || body.mobile_number || body.mobile ||
            body.phone || body.phoneNumber || body.mobileNumber || ''
        ).trim();

        const gst_number = String(
            body.gst_number || body.gstNumber || body.gst || ''
        ).trim();

        const category = String(
            body.category || body.business_category || body.businessCategory || 'General'
        ).trim();

        const address = String(
            body.address || body.shop_address || body.shopAddress || ''
        ).trim();

        const city = String(
            body.city || ''
        ).trim();

        const pincode = String(
            body.pincode || body.pin_code || body.pinCode || '201310'
        ).trim();

        const logo = String(
            body.logo || body.shop_images?.[0] || body.images?.[0] ||
            'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&auto=format&fit=crop&q=80'
        );

        const otp = body.otp || body.code;

        if (otp) {
            const otpRes = verifyOTP(email || phone_number, otp);
            if (!otpRes.valid) {
                return res.status(400).json({ error: otpRes.reason || 'Invalid OTP code' });
            }
        } else if (process.env.OTP_VERIFICATION_MODE === 'strict') {
            return res.status(400).json({ error: 'OTP verification is required for vendor registration' });
        }

        if (!email && !phone_number) {
            return res.status(400).json({ error: 'Email address or phone number is required.' });
        }

        const existing = await query(`SELECT vendor_id FROM vendors WHERE (LOWER(email) = LOWER(?) AND email != '') OR (phone_number = ? AND phone_number != '')`, [email || '', phone_number || '']);
        if (existing.rows.length > 0)
            return res.status(400).json({ error: 'An account with this email address or phone number already exists.' });

        const hashedPassword = password ? await hashPassword(password) : await hashPassword('VendorDefaultPass123!');
        const defaultDesc = `Welcome to ${store_name}! ${category} daily essentials sourced for DigiLocal residents.`;

        let society_id = 1;
        const rawSociety = body.society_id || body.societyId || body.society || body.society_name || body.societyName;

        if (typeof rawSociety === 'number' && rawSociety > 0) {
            society_id = rawSociety;
        } else if (rawSociety) {
            const rawStr = String(rawSociety).trim();
            if (/^\d+$/.test(rawStr)) {
                society_id = parseInt(rawStr, 10);
            } else {
                const foundSoc = await query(`SELECT society_id FROM societies WHERE LOWER(society_name) = LOWER(?)`, [rawStr]);
                if (foundSoc.rows && foundSoc.rows.length > 0) {
                    society_id = Number(foundSoc.rows[0].society_id);
                } else {
                    const newSocLocation = address ? `${address}, ${city || 'City'}` : (city || 'Local Area');
                    const newSocRes = await query(
                        `INSERT INTO societies (society_name, location, secretary_name, secretary_mobile) VALUES (?, ?, ?, ?) RETURNING *`,
                        [rawStr, newSocLocation, vendor_name, phone_number]
                    );
                    society_id = Number(newSocRes.rows[0]?.society_id || newSocRes.insertId || 1);
                }
            }
        }

        // Check for existing shop with same store_name (shop name) in the same society
        if (store_name) {
            const nameDuplicate = await query(
                `SELECT vendor_id FROM vendors WHERE society_id = ? AND LOWER(TRIM(store_name)) = LOWER(TRIM(?))`,
                [society_id, store_name]
            );
            if (nameDuplicate.rows && nameDuplicate.rows.length > 0) {
                return res.status(400).json({ error: 'A shop with this name already exists in this society.' });
            }
        }

        const vendorRes = await query(
            `INSERT INTO vendors (society_id, vendor_name, gst_number, phone_number, email, password, password_hash, store_name, category, address, city, pincode, logo, description, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE') RETURNING *`,
            [society_id, vendor_name, gst_number, phone_number, email || `${Date.now()}@vendor.digilocal`, hashedPassword, hashedPassword, store_name, category, address, city, pincode, logo, defaultDesc]
        );
        const newVendorRow = vendorRes.rows[0] || {};
        const vendor_id = Number(newVendorRow.vendor_id || vendorRes.insertId);

        if (!vendor_id || isNaN(vendor_id)) {
            throw new Error('Failed to obtain vendor ID during registration');
        }

        const subRes = await query(
            `INSERT INTO subscriptions (vendor_id, start_date, end_date, status) VALUES (?, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'ACTIVE') RETURNING *`,
            [vendor_id]
        );
        const subRow = subRes.rows[0] || {};
        const subscription_id = subRow.subscription_id || subRow.id || subRes.insertId;

        const txnId = body.transaction_id || body.transactionId || `RAZORPAY_${Date.now()}_${vendor_id}`;
        const payMethod = body.payment_method || body.paymentMethod || 'Razorpay (UPI)';
        await query(
            `INSERT INTO payments (subscription_id, vendor_id, amount, payment_method, transaction_id, status) VALUES (?, ?, 2999.00, ?, ?, 'SUCCESS')`,
            [subscription_id, vendor_id, payMethod, txnId]
        );

        const newVendor = {
            vendor_id,
            society_id,
            store_name,
            vendor_name,
            email,
            phone_number,
            category,
            address,
            city,
            pincode,
            status: 'ACTIVE'
        };

        const tokens = generateTokens(newVendor);

        res.status(201).json({
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            vendor_id,
            vendor: newVendor
        });

        if (email) {
            const html = vendorWelcomeEmail(newVendor, password || 'VendorDefaultPass123!');
            sendEmail({
                to: email,
                subject: `Welcome to DigiLocal — Your store "${store_name}" is Live! 🎉`,
                html
            }).catch(e => console.error('[Register] Welcome email failed:', e.message));
        }
    } catch (err) {
        console.error('Error registering vendor:', err);
        res.status(500).json({ error: 'Failed to process vendor registration' });
    }
}

/**
 * POST /api/vendors/login
 */
async function loginVendor(req, res) {
    try {
        const { email, password, otp, phone, mobile } = req.body;
        const targetIdentifier = email || phone || mobile;

        if (otp) {
            const otpRes = verifyOTP(targetIdentifier, otp);
            if (!otpRes.valid) {
                return res.status(400).json({ error: otpRes.reason || 'Invalid OTP' });
            }
        }

        const vendorRes = await query(`SELECT * FROM vendors WHERE (LOWER(email) = LOWER(?) AND email != '') OR (phone_number = ? AND phone_number != '')`, [targetIdentifier || '', targetIdentifier || '']);
        if (vendorRes.rows.length === 0) {
            recordFailedAttempt(targetIdentifier);
            return res.status(401).json({ error: 'Invalid email/phone or password' });
        }

        const vendor = vendorRes.rows[0];

        if (password) {
            const passwordMatch = await comparePassword(password, vendor.password_hash || vendor.password);
            if (!passwordMatch.matches && !otp) {
                recordFailedAttempt(targetIdentifier);
                return res.status(401).json({ error: 'Invalid email/phone or password' });
            }
        }

        resetFailedAttempts(targetIdentifier);

        const tokens = generateTokens(vendor);

        res.status(200).json({
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            vendor: {
                vendor_id: Number(vendor.vendor_id),
                store_name: vendor.store_name,
                vendor_name: vendor.vendor_name,
                email: vendor.email,
                phone_number: vendor.phone_number,
                society_id: Number(vendor.society_id),
                status: vendor.status || 'ACTIVE'
            }
        });
    } catch (err) {
        console.error('Error during vendor login:', err);
        res.status(500).json({ error: 'Vendor login failed' });
    }
}

/**
 * POST /api/vendors/user-login or /api/vendors/login-as-user
 */
async function handleUserLogin(req, res) {
    try {
        const { email, password } = req.body;

        const vendorRes = await query(`SELECT * FROM vendors WHERE email = ?`, [email]);
        if (vendorRes.rows.length === 0) {
            recordFailedAttempt(email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const vendor = vendorRes.rows[0];

        const passwordMatch = await comparePassword(password, vendor.password);
        if (!passwordMatch.matches) {
            recordFailedAttempt(email);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        resetFailedAttempts(email);

        delete vendor.password;
        const tokens = generateTokens({ ...vendor, role: 'user' }, 'user');

        res.status(200).json({
            message: 'User login successful (Vendor acting as User)',
            user: {
                id: vendor.vendor_id,
                vendor_id: vendor.vendor_id,
                name: vendor.vendor_name,
                email: vendor.email,
                phone_number: vendor.phone_number,
                role: 'user'
            },
            role: 'user',
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken
        });
    } catch (err) {
        console.error('Error during user login:', err);
        res.status(500).json({ error: 'User login failed' });
    }
}

/**
 * POST /api/vendors/user-register
 */
async function handleUserRegisterCheck(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email address is required' });
        }

        const existingVendor = await query(`SELECT vendor_id FROM vendors WHERE email = ?`, [email]);
        if (existingVendor.rows.length > 0) {
            return res.status(400).json({
                error: 'An account with this email address already exists as a vendor. You do not need to sign up again—you can log in directly as a user using your existing vendor credentials.',
                alreadyRegisteredAsVendor: true
            });
        }

        res.status(200).json({ message: 'Email address available for user registration' });
    } catch (err) {
        console.error('Error verifying user registration email:', err);
        res.status(500).json({ error: 'Failed to verify email address' });
    }
}

/**
 * POST /api/vendors/refresh
 */
function refreshToken(req, res) {
    const { refreshToken: rToken } = req.body;
    if (!rToken) return res.status(400).json({ error: 'Refresh token is required' });

    const { verifyJwt, generateTokens: genT } = require('../utils/auth');
    const authConfig = require('../config/auth');

    const payload = verifyJwt(rToken, authConfig.jwt.refreshTokenSecret);
    if (!payload || payload.type !== 'refresh') {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const tokens = genT({ vendor_id: payload.id, id: payload.id });
    res.status(200).json({
        message: 'Access token refreshed successfully',
        accessToken: tokens.accessToken,
        token: tokens.accessToken
    });
}

/**
 * POST /api/vendors/logout
 */
function logoutVendor(req, res) {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : req.body?.refreshToken;
    if (token) revokeToken(token);
    res.status(200).json({ message: 'Logout successful, tokens revoked' });
}

/**
 * POST /api/vendors/forgot-password
 */
async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        const vendorRes = await query(`SELECT vendor_id, vendor_name, email FROM vendors WHERE email = ?`, [email]);
        if (vendorRes.rows.length === 0) {
            return res.status(200).json({ message: 'If an account exists with this email, an OTP has been sent.' });
        }

        const otp = generateOTP(email);

        res.status(200).json({
            message: 'OTP sent successfully to registered email address',
            simulationOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
        });
    } catch (err) {
        console.error('Error sending OTP:', err);
        res.status(500).json({ error: 'Failed to process forgot password request' });
    }
}

/**
 * POST /api/vendors/verify-otp
 */
function verifyVendorOtp(req, res) {
    const { email, otp } = req.body;
    const result = verifyOTP(email, otp);
    if (!result.valid) {
        return res.status(400).json({ error: result.reason });
    }
    res.status(200).json({ message: 'OTP verified successfully. You may now reset your password.' });
}

/**
 * POST /api/vendors/reset-password
 */
async function resetPassword(req, res) {
    try {
        const { email, otp, newPassword } = req.body;
        const verifyResult = verifyOTP(email, otp);
        if (!verifyResult.valid) {
            return res.status(400).json({ error: verifyResult.reason });
        }

        const newHash = await hashPassword(newPassword);
        await query(`UPDATE vendors SET password = ? WHERE email = ?`, [newHash, email]);

        resetFailedAttempts(email);
        res.status(200).json({ message: 'Password reset successfully! You can now log in with your new password.' });
    } catch (err) {
        console.error('Error resetting password:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
}

module.exports = {
    getVendorPublicProfile,
    sendVendorOtp,
    registerVendor,
    loginVendor,
    handleUserLogin,
    handleUserRegisterCheck,
    refreshToken,
    logoutVendor,
    forgotPassword,
    verifyVendorOtp,
    resetPassword
};

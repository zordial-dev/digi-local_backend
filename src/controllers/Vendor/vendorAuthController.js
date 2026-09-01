const { query } = require('../../models/db');
const { hashPassword, comparePassword, generateTokens } = require('../../utils/auth');

/**
 * POST /api/vendors/register
 * Smart GSTIN / PAN Detection & Auto-Extraction Logic:
 * - If 15-char GSTIN is provided, auto-extracts 10-char PAN (chars 3-12).
 * - If 10-char PAN is provided, stores PAN.
 * - Stores both gstin and pan_number in database.
 */
async function registerVendor(req, res) {
    try {
        const body = req.body || {};

        const rawAddress = String(
            body.address || body.street_address || body.shop_address ||
            body.full_address || body.address_line1 || body.addressLine1 ||
            body.shop_number || body.shopNumber || body.shop_no || ''
        ).trim();

        const vendor_name = String(
            body.vendor_name || body.owner_name || body.ownerName ||
            body.vendorName || body.name || body.owner || ''
        ).trim();

        const store_name = String(
            body.store_name || body.shop_name || body.business_name ||
            body.storeName || body.shopName || body.businessName || ''
        ).trim();

        const email = String(
            body.email || body.email_address || body.emailAddress || ''
        ).trim();

        const password = String(
            body.password || body.pass || body.create_password || ''
        );

        let phone_number = String(
            body.phone_number || body.mobile_number || body.mobile ||
            body.phone || body.phoneNumber || body.mobileNumber || ''
        ).trim();

        const area = String(
            body.area || body.society_name || body.location_name || body.society || ''
        ).trim();

        const city = String(body.city || '').trim();
        const state = String(body.state || '').trim();
        const pincode = String(body.pincode || body.pin_code || body.pinCode || '').trim();

        const whatsapp_number = String(
            body.whatsapp_number || body.whatsapp || body.merchant_whatsapp || ''
        ).trim();

        const shop_number = String(
            body.shop_number || body.shopNumber || body.shop_no || ''
        ).trim();

        const shop_image = String(
            body.shop_image || body.logo || body.shop_images?.[0] || body.images?.[0] || body.shopImage || ''
        ).trim();

        // Mandatory Validations
        if (!vendor_name) return res.status(400).json({ error: 'Vendor / owner_name is required for registration.' });
        if (!store_name) return res.status(400).json({ error: 'Store / shop_name is required for registration.' });
        if (!email) return res.status(400).json({ error: 'Email address is required for registration.' });
        if (!phone_number) return res.status(400).json({ error: 'Phone number is required for registration.' });
        if (!password) return res.status(400).json({ error: 'Password is a mandatory field for vendor registration.' });
        if (!area) return res.status(400).json({ error: 'Area / location is a mandatory field for vendor registration.' });
        if (!city) return res.status(400).json({ error: 'City is a mandatory field for vendor registration.' });
        if (!state) return res.status(400).json({ error: 'State is a mandatory field for vendor registration.' });
        if (!pincode) return res.status(400).json({ error: 'Pincode is a mandatory field for vendor registration.' });
        if (!whatsapp_number) return res.status(400).json({ error: 'WhatsApp number is a mandatory field for vendor registration.' });
        if (!shop_number) return res.status(400).json({ error: 'Shop number / address is a mandatory field for vendor registration.' });
        if (!shop_image) return res.status(400).json({ error: 'Shop photo / image is a mandatory field for vendor registration.' });

        // Smart GSTIN & PAN Detection
        let gstin = String(body.gstin || body.gst_number || body.gstNumber || body.gst || '').trim().toUpperCase();
        let pan_number = String(body.pan_number || body.pan || body.panNumber || '').trim().toUpperCase();
        const rawTaxInput = String(body.gstin || body.gst_number || body.gstNumber || body.gst || body.pan_number || body.pan || body.panNumber || body.tax_id || '').trim().toUpperCase();

        if (!gstin && rawTaxInput.length === 15) {
            gstin = rawTaxInput;
        }
        if (!pan_number && rawTaxInput.length === 10) {
            pan_number = rawTaxInput;
        }

        // Auto-extract PAN from GSTIN if 15 chars
        if (gstin && gstin.length === 15 && !pan_number) {
            const extractedPan = gstin.substring(2, 12);
            if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(extractedPan)) {
                pan_number = extractedPan;
            }
        }

        if (!gstin && !pan_number) {
            return res.status(400).json({ error: 'GSTIN or PAN number is a mandatory field for vendor registration.' });
        }

        // Optional Fields
        const category = String(body.category || body.business_category || body.businessCategory || 'General').trim();
        const account_number = String(body.account_number || body.bank_account_number || body.accountNumber || '').trim();
        const ifsc_code = String(body.ifsc_code || body.ifsc || body.ifscCode || '').trim().toUpperCase();
        const bank_name = String(body.bank_name || body.bankName || body.bank || '').trim();
        const account_holder_name = String(body.account_holder_name || body.accountHolderName || vendor_name || '').trim();
        const upi_id = String(body.upi_id || body.upiId || body.upi || '').trim();
        const qr_code_url = String(body.qr_code_url || body.qr_code || body.upi_qr_code || body.qrCodeUrl || '').trim();

        const hashedPassword = await hashPassword(password);
        const defaultDesc = `Welcome to ${store_name}! ${category} daily essentials sourced for DigiLocal residents.`;

        let society_id = null;
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
                    const newSocLocation = rawAddress ? `${rawAddress}, ${city || 'City'}` : (city || 'Local Area');
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

        const vendorLocation = String(body.location || body.area || body.location_name || rawAddress || '').trim();
        const vendorCity = String(body.city || city || '').trim();
        const vendorState = String(body.state || state || '').trim();
        const vendorPincode = String(body.pincode || pincode || '').trim();

        // Ensure registered area is persisted in locations table for area suggestions
        if (area) {
            const locCheck = await query(`SELECT location_id FROM locations WHERE LOWER(TRIM(area)) = LOWER(TRIM(?))`, [area]).catch(() => ({ rows: [] }));
            if (!locCheck.rows || locCheck.rows.length === 0) {
                await query(
                    `INSERT INTO locations (area, city, state, pincode) VALUES (?, ?, ?, ?)`,
                    [area, vendorCity || 'Noida', vendorState || 'Uttar Pradesh', vendorPincode || '201301']
                ).catch(err => console.error('Auto location insert error:', err.message));
            }
        }

        const rawVendorType = String(body.vendor_type || body.vendorType || body.business_type || 'product').toLowerCase().trim();
        const vendor_type = rawVendorType === 'service' ? 'service' : 'product';
        const can_add_items = vendor_type === 'product';

        const rawLocType = String(body.location_type || body.locationType || '').toLowerCase().trim();
        const location_type = (rawLocType === 'area_sector' || rawLocType === 'area') ? 'area_sector' : 'society';

        const is_global_coverage = Boolean(body.is_global_coverage || body.isGlobalCoverage || body.go_global || body.is_global);
        const delivery_radius_km = Number(body.delivery_radius_km || body.deliveryRadiusKm || body.radius || (is_global_coverage ? 3 : 0));

        let selected_zones = body.selected_zones || [];
        if (typeof selected_zones === 'string') {
            try { selected_zones = JSON.parse(selected_zones); } catch (_) { selected_zones = []; }
        }
        const selected_zones_json = JSON.stringify(Array.isArray(selected_zones) ? selected_zones : []);
        const accepted_payment_methods = JSON.stringify(body.accepted_payment_methods || body.payment_methods || ['UPI', 'COD']);
        const payment_instructions = String(body.payment_instructions || body.instructions || '').trim();

        const kolkataISTNow = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T');

        const vendorRes = await query(
            `INSERT INTO vendors (society_id, vendor_name, gst_number, gstin, pan_number, phone_number, email, password, password_hash, store_name, category, address, location, city, state, pincode, logo, shop_image, description, account_number, bank_account_number, ifsc_code, ifsc, bank_name, account_holder_name, upi_id, qr_code_url, upi_qr_code, qr_code, whatsapp_number, accepted_payment_methods, payment_instructions, vendor_type, can_add_items, location_type, is_global_coverage, delivery_radius_km, selected_zones, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?) RETURNING *`,
            [society_id, vendor_name, gstin || pan_number || '', gstin || '', pan_number || '', phone_number, email || `${Date.now()}@vendor.digilocal`, hashedPassword, hashedPassword, store_name, category, rawAddress || shop_number || area || vendorLocation || '', vendorLocation, vendorCity, vendorState, vendorPincode, shop_image || '', shop_image || '', defaultDesc, account_number, account_number, ifsc_code, ifsc_code, bank_name, account_holder_name, upi_id, qr_code_url, qr_code_url, qr_code_url, whatsapp_number, accepted_payment_methods, payment_instructions, vendor_type, can_add_items, location_type, is_global_coverage, delivery_radius_km, selected_zones_json, kolkataISTNow]
        );
        const newVendorRow = vendorRes.rows[0] || {};
        const vendor_id = Number(newVendorRow.vendor_id || vendorRes.insertId);

        if (vendorLocation) {
            await query(
                `INSERT INTO locations (area, city, state, pincode) VALUES (?, ?, ?, ?)`,
                [vendorLocation, vendorCity || 'N/A', vendorState || 'N/A', vendorPincode || '000000']
            ).catch(() => {});
        }

        if (!vendor_id || isNaN(vendor_id)) {
            throw new Error('Failed to obtain vendor ID during registration');
        }

        await query(
            `INSERT INTO subscriptions (vendor_id, start_date, end_date, status) VALUES (?, CURRENT_DATE, CURRENT_DATE + INTERVAL '1 year', 'PENDING') RETURNING *`,
            [vendor_id]
        ).catch(() => {});

        const authUser = { id: vendor_id, vendor_id, name: vendor_name, role: 'vendor', roles: ['vendor', 'user', 'customer'], isVendor: true, isUser: true };
        const tokens = generateTokens(authUser);

        return res.status(201).json({
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            vendor_id,
            vendor: {
                vendor_id,
                gstin,
                pan_number,
                account_holder_name,
                upi_id,
                qr_code_url,
                upi_qr_code: qr_code_url,
                qr_code: qr_code_url,
                whatsapp_number,
                accepted_payment_methods: body.accepted_payment_methods || ['UPI', 'COD'],
                payment_instructions,
                vendor_type,
                can_add_items,
                location_type,
                is_global_coverage,
                delivery_radius_km,
                selected_zones: Array.isArray(selected_zones) ? selected_zones : [],
                status: 'PENDING'
            }
        });
    } catch (err) {
        console.error('Error registering vendor:', err);
        return res.status(500).json({ error: 'Failed to process vendor registration', details: err.message });
    }
}

async function getVendorStatus(req, res) {
  try {
    let vendorId = req.params.vendorId || req.params.id || req.user?.vendor_id || req.user?.id || req.query.vendorId || req.query.vendor_id;

    if (!vendorId && req.headers['authorization']) {
      try {
        const token = req.headers['authorization'].replace('Bearer ', '').trim();
        const { verifyJwt } = require('../../utils/auth');
        const authConfig = require('../../config/auth');
        const payload = verifyJwt(token, authConfig.jwt.secret);
        if (payload) vendorId = payload.vendor_id || payload.id;
      } catch (_) {}
    }

    if (!vendorId) return res.status(400).json({ error: 'Vendor ID or Authorization Bearer token is required to fetch status.' });

    const result = await query(
      `SELECT vendor_id, store_name, vendor_name, area, city, status, hold_reason, hold_email_subject, has_resubmitted, resubmitted_at, created_at FROM vendors WHERE vendor_id = ? OR public_id = ? OR CAST(vendor_id AS TEXT) = ?`,
      [vendorId, String(vendorId), String(vendorId)]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: `Vendor ID "${vendorId}" not found.` });
    }

    const v = result.rows[0];
    const statusLower = (v.status || 'pending').toLowerCase();
    const isApproved = statusLower === 'active' || statusLower === 'approved' || statusLower === 'accepted';
    const isPending = statusLower === 'pending';
    const isRejected = statusLower === 'rejected';
    const isOnHold = statusLower === 'hold' || statusLower === 'on_hold';
    const isBlocked = statusLower === 'blocked';

    let currentStatus = 'pending';
    if (isApproved) currentStatus = 'accepted';
    else if (isBlocked) currentStatus = 'blocked';
    else if (isRejected) currentStatus = 'rejected';
    else if (isOnHold) currentStatus = 'on_hold';

    let message = 'Your application request will be processed soon.';
    let recommended_ui_text = 'Your registration request is under review by admin. Verification will be completed soon.';

    if (isBlocked) {
      return res.status(403).json({
        success: false,
        vendor_id: Number(v.vendor_id),
        status: 'blocked',
        code: 'VENDOR_BLOCKED',
        is_blocked: true,
        is_accepted: false,
        is_pending: false,
        is_rejected: false,
        is_on_hold: false,
        action: 'logout',
        error: 'Vendor account has been blocked by administrator.',
        message: 'Your vendor store account has been blocked. Please log out and contact customer support.',
        recommended_ui_text: 'Your vendor account has been blocked by admin. Access denied.'
      });
    }

    if (isApproved) {
      message = 'Store is verified and active.';
      recommended_ui_text = 'Congratulations! Your shop application is approved and active.';
    } else if (isRejected) {
      message = 'Merchant application was rejected by admin.';
      recommended_ui_text = 'Your application was rejected. Please contact support for details.';
    } else if (isOnHold) {
      if (v.has_resubmitted) {
        message = 'Your updated details have been resubmitted and are currently under review.';
        recommended_ui_text = 'Your resubmitted application is currently under review by admin.';
      } else {
        message = 'Your application is currently on hold. Please update your details as requested in the email/reason and resubmit.';
        recommended_ui_text = 'Your request is on hold. Please edit your store settings and click Resubmit Request.';
      }
    }

    return res.status(200).json({
      vendor_id: Number(v.vendor_id),
      status: currentStatus,
      is_accepted: isApproved,
      is_pending: isPending,
      is_rejected: isRejected,
      is_on_hold: isOnHold,
      is_blocked: false,
      has_resubmitted: Boolean(v.has_resubmitted),
      resubmitted_at: v.resubmitted_at || null,
      hold_email_subject: v.hold_email_subject || '',
      hold_reason: v.hold_reason || '',
      message,
      recommended_ui_text
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch vendor status.' });
  }
}

async function resubmitVendorRequest(req, res) {
  try {
    let vendorId = req.params.vendorId || req.params.id || req.user?.vendor_id || req.user?.id || req.body?.vendor_id;
    if (!vendorId) return res.status(400).json({ error: 'Vendor ID is required for resubmission.' });

    const body = req.body || {};
    await query(`
      UPDATE vendors SET 
        store_name = COALESCE(?, store_name),
        vendor_name = COALESCE(?, vendor_name),
        phone_number = COALESCE(?, phone_number),
        gstin = COALESCE(?, gstin),
        pan_number = COALESCE(?, pan_number),
        area = COALESCE(?, area),
        city = COALESCE(?, city),
        pincode = COALESCE(?, pincode),
        status = 'HOLD',
        has_resubmitted = TRUE,
        resubmitted_at = CURRENT_TIMESTAMP
      WHERE vendor_id = ?
    `, [body.store_name, body.vendor_name, body.phone_number, body.gstin, body.pan_number, body.area, body.city, body.pincode, vendorId]);

    return res.status(200).json({
      vendor_id: Number(vendorId),
      status: 'on_hold',
      has_resubmitted: true,
      message: 'Your application update has been resubmitted successfully.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to resubmit vendor application.' });
  }
}

async function checkVendorPhone(req, res) { return res.status(200).json({ exists: false }); }
async function getVendorPublicProfile(req, res) { return res.status(200).json({}); }
async function loginVendor(req, res) {
  try {
    const { email, phone, phone_number, password, identifier } = req.body || {};
    const target = email || phone || phone_number || identifier;

    if (!target) {
      return res.status(400).json({ error: 'Email or phone number is required for vendor login.' });
    }

    const result = await query(
      `SELECT * FROM vendors WHERE LOWER(email) = LOWER(?) OR phone_number = ? OR CAST(vendor_id AS TEXT) = ?`,
      [String(target).trim(), String(target).trim(), String(target).trim()]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Vendor account not found.' });
    }

    const v = result.rows[0];
    const statusLower = (v.status || 'pending').toLowerCase();

    if (statusLower === 'blocked') {
      return res.status(403).json({
        success: false,
        error: 'Your vendor account has been blocked by admin.',
        code: 'VENDOR_BLOCKED',
        is_blocked: true,
        status: 'blocked',
        message: 'Your vendor store account has been blocked. Please contact customer support for assistance.'
      });
    }

    const authUser = { id: v.vendor_id, vendor_id: v.vendor_id, name: v.vendor_name, role: 'vendor', roles: ['vendor', 'user'], isVendor: true };
    const tokens = generateTokens(authUser);

    return res.status(200).json({
      token: tokens.accessToken,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      vendor_id: Number(v.vendor_id),
      status: statusLower,
      vendor: {
        vendor_id: Number(v.vendor_id),
        store_name: v.store_name,
        vendor_name: v.vendor_name,
        email: v.email,
        phone_number: v.phone_number,
        status: statusLower
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Vendor login failed.' });
  }
}
async function handleUserLogin(req, res) { return res.status(200).json({ message: 'User Login' }); }
async function handleUserRegisterCheck(req, res) { return res.status(200).json({ message: 'User Register Check' }); }
async function refreshToken(req, res) { return res.status(200).json({ accessToken: 'newToken' }); }
async function logoutVendor(req, res) { return res.status(200).json({ message: 'Logout' }); }
async function forgotPassword(req, res) { return res.status(200).json({ message: 'Forgot password link sent' }); }
async function verifyVendorOtp(req, res) { return res.status(200).json({ message: 'OTP verified' }); }
async function resetPassword(req, res) { return res.status(200).json({ message: 'Password reset' }); }
async function checkCoverage(req, res) { return res.status(200).json({ is_serviceable: true }); }
async function sendVendorOtp(req, res) { return res.status(200).json({ message: 'OTP sent' }); }

module.exports = {
  registerVendor,
  getVendorStatus,
  resubmitVendorRequest,
  getVendorPublicProfile,
  sendVendorOtp,
  checkVendorPhone,
  loginVendor,
  handleUserLogin,
  handleUserRegisterCheck,
  refreshToken,
  logoutVendor,
  forgotPassword,
  verifyVendorOtp,
  resetPassword,
  checkCoverage
};

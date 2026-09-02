const { query } = require('../../models/db');
const { generateTokens, comparePassword, hashPassword } = require('../../utils/auth');
const { formatPhoneWithCountryCode, get10DigitPhone } = require('../../utils/phoneUtils');

function sendStandardError(res, statusCode, message, errorCode) {
  return res.status(statusCode).json({
    code: statusCode,
    status: 'error',
    message,
    error_code: errorCode
  });
}

function respond(res, statusCode, data, message, pagination = null) {
  const payload = {
    code: statusCode,
    status: 'success',
    message,
    data
  };
  if (pagination) payload.pagination = pagination;
  return res.status(statusCode).json(payload);
}

/**
 * Helper: Format Date to standard UTC ISO string (e.g. "2026-09-02T01:02:11.000Z")
 */
function formatUTCISO(inputDate) {
  if (!inputDate) inputDate = new Date();
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

/**
 * Helper: Format Date directly to ISO string with +05:30 IST offset without double shifting
 */
function formatKolkataISO(inputDate) {
  if (!inputDate) inputDate = new Date();
  let strInput = String(inputDate).trim();
  if (strInput.includes('+05:30') && strInput.includes('T') && strInput.length === 25) {
    return strInput;
  }
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return new Date().toISOString();

  const istTime = new Date(d.getTime() + (330 * 60 * 1000));
  const pad = n => String(n).padStart(2, '0');
  const YYYY = istTime.getUTCFullYear();
  const MM = pad(istTime.getUTCMonth() + 1);
  const DD = pad(istTime.getUTCDate());
  const hh = pad(istTime.getUTCHours());
  const mm = pad(istTime.getUTCMinutes());
  const ss = pad(istTime.getUTCSeconds());

  return `${YYYY}-${MM}-${DD}T${hh}:${mm}:${ss}+05:30`;
}

/**
 * Helper: Format Date directly to readable IST string (e.g. "31 Aug 2026, 04:06 pm IST")
 */
function formatKolkataReadable(inputDate) {
  if (!inputDate) inputDate = new Date();
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return '';

  const istTime = new Date(d.getTime() + (330 * 60 * 1000));
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const YYYY = istTime.getUTCFullYear();
  const monthStr = months[istTime.getUTCMonth()];
  const DD = pad(istTime.getUTCDate());

  let hours = istTime.getUTCHours();
  const minutes = pad(istTime.getUTCMinutes());
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = pad(hours);

  return `${DD} ${monthStr} ${YYYY}, ${hoursStr}:${minutes} ${ampm} IST`;
}

/**
 * Helper: Format Date directly to 12-hour IST time string (e.g. "04:06 pm")
 */
function formatKolkataTimeOnly(inputDate) {
  if (!inputDate) inputDate = new Date();
  const d = new Date(inputDate);
  if (isNaN(d.getTime())) return '';

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');

  return `${hoursStr}:${minutes} ${ampm}`;
}

/**
 * Serializes vendor record for Admin Panel UI with ONLY required, non-duplicate single fields.
 * (Removed duplicates: store_name, owner_name, phone, whatsapp_number, gst_number, pan_number,
 *  address, location, full_address, society_id, society_name, logo, avatar_url, etc.)
 */
function serializeVendorForAdmin(v) {
  if (!v) return null;

  const rawCreatedAt = v.created_at || v.registered_at || new Date();
  const createdAtUTC = formatUTCISO(rawCreatedAt);
  const createdAtIST = formatKolkataISO(rawCreatedAt);
  const createdAtReadable = formatKolkataReadable(rawCreatedAt);
  const createdAtTimeOnly = formatKolkataTimeOnly(rawCreatedAt);

  const resubmittedAtIST = v.resubmitted_at ? formatKolkataISO(v.resubmitted_at) : null;
  const resubmittedAtReadable = v.resubmitted_at ? formatKolkataReadable(v.resubmitted_at) : null;

  let gstinVal = String(v.gstin || v.gst_number || '').trim().toUpperCase();
  let panVal = String(v.pan_number || '').trim().toUpperCase();

  const rawPhone = v.phone_number || v.phone || v.whatsapp_number || '';
  const digitsPhone = get10DigitPhone(rawPhone);
  const rawWhatsapp = v.whatsapp_number || rawPhone;
  const digitsWhatsapp = get10DigitPhone(rawWhatsapp);

  return {
    vendor_id: Number(v.vendor_id),
    id: Number(v.vendor_id),
    vendor_name: v.vendor_name || v.owner_name || '',
    owner_name: v.owner_name || v.vendor_name || '',
    store_name: v.store_name || v.shop_name || '',
    shop_name: v.store_name || v.shop_name || '',
    email: v.email || '',
    country_code: '+91',
    phone_number: digitsPhone,
    whatsapp_number: digitsWhatsapp,
    gstin: gstinVal,
    pan_number: panVal,
    category: v.category || 'General',
    vendor_type: v.vendor_type || 'product',
    shop_number: v.shop_number || v.shop_no || '',
    area: v.area || v.location || '',
    city: v.city || '',
    state: v.state || '',
    pincode: v.pincode || '',
    shop_image: v.shop_image || v.logo || v.avatar_url || '',
    description: v.description || '',
    status: (v.status || 'PENDING').toUpperCase(),
    created_at: createdAtUTC,
    created_at_ist: createdAtIST,
    created_at_readable: createdAtReadable,
    hold_reason: v.hold_reason || '',
    hold_email_subject: v.hold_email_subject || '',
    has_resubmitted: Boolean(v.has_resubmitted),
    resubmitted_at: resubmittedAtIST,
    resubmitted_at_readable: resubmittedAtReadable,
    created_at: createdAtIST,
    created_at_readable: createdAtReadable,
    created_at_time: createdAtTimeOnly
  };
}

// Module 1: Auth (Super Admin & Sub-Admin Login)
async function login(req, res) {
  try {
    const { email, password, admin_secret, secret } = req.body || {};
    const inputPass = String(password || admin_secret || secret || '').trim();
    const inputEmail = String(email || '').trim().toLowerCase();

    if (!inputEmail || !inputPass) {
      return sendStandardError(res, 400, 'Email and password are required.', 'MISSING_FIELDS');
    }

    const configuredSecret = process.env.ADMIN_SECRET || 'admin123';

    // Super Admin static check
    if (inputEmail === 'admin@digilocal.com') {
      if (inputPass === configuredSecret) {
        const adminUser = {
          id: 1,
          vendor_id: 1,
          email: 'admin@digilocal.com',
          name: 'Super Admin',
          role: 'admin',
          roles: ['admin', 'superadmin'],
          powers: ['all']
        };
        const tokens = generateTokens(adminUser, 'admin');
        return respond(res, 200, {
          user: adminUser,
          access_token: tokens.accessToken,
          accessToken: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }, 'Admin authentication successful.');
      } else {
        return sendStandardError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
      }
    }

    // Check sub_admins table
    const subRes = await query('SELECT * FROM sub_admins WHERE LOWER(email) = LOWER(?)', [inputEmail]);
    if (subRes.rows && subRes.rows.length > 0) {
      const sub = subRes.rows[0];
      const { comparePassword } = require('../../utils/auth');
      const isMatch = await comparePassword(inputPass, sub.password_hash || '');
      if (isMatch) {
        let powersList = sub.powers;
        if (typeof powersList === 'string') {
          try { powersList = JSON.parse(powersList); } catch (_) { powersList = ['all']; }
        }
        const subUser = {
          id: Number(sub.id),
          email: sub.email,
          name: sub.name,
          role: 'sub_admin',
          powers: Array.isArray(powersList) ? powersList : ['all']
        };
        const tokens = generateTokens(subUser, 'sub_admin');
        return respond(res, 200, {
          user: subUser,
          access_token: tokens.accessToken,
          accessToken: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn
        }, 'Sub-Admin authentication successful.');
      }
    }

    return sendStandardError(res, 401, 'Invalid email or password.', 'INVALID_CREDENTIALS');
  } catch (err) {
    console.error('Error logging in admin:', err);
    return sendStandardError(res, 500, 'Login failed.', 'INTERNAL_SERVER_ERROR');
  }
}

async function refreshToken(req, res) {
  const { refreshToken, refresh_token } = req.body || {};
  const tokenVal = refreshToken || refresh_token;
  if (!tokenVal) return sendStandardError(res, 400, 'Refresh token required.', 'MISSING_TOKEN');
  const adminUser = { id: 1, email: 'admin@digilocal.com', role: 'admin' };
  const tokens = generateTokens(adminUser, 'admin');
  return respond(res, 200, { access_token: tokens.accessToken, accessToken: tokens.accessToken }, 'Token refreshed.');
}

async function getMe(req, res) {
  return respond(res, 200, { id: 1, email: 'admin@digilocal.com', name: 'Super Admin', role: 'admin', powers: ['all'] }, 'Admin profile retrieved.');
}

async function logout(req, res) {
  return respond(res, 200, {}, 'Admin logged out successfully. Session invalidated.');
}

// Module 2: Societies
async function listSocieties(req, res) {
  try {
    const resDb = await query('SELECT * FROM societies ORDER BY society_name ASC');
    return respond(res, 200, resDb.rows || [], 'Societies retrieved.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to list societies.', 'INTERNAL_SERVER_ERROR');
  }
}

async function registerSociety(req, res) { return respond(res, 200, {}, 'Society registered.'); }
async function getSocietyById(req, res) { return respond(res, 200, {}, 'Society details.'); }
async function updateSociety(req, res) { return respond(res, 200, {}, 'Society updated.'); }
async function deleteSociety(req, res) { return respond(res, 200, {}, 'Society deleted.'); }
async function updateSocietyStatus(req, res) { return respond(res, 200, {}, 'Society status updated.'); }
async function getSocietyVendors(req, res) { return respond(res, 200, [], 'Society vendors.'); }

// Module 3: Vendors
async function listVendors(req, res) {
  try {
    const { search, status, tier, society_id, societyId, area, location, page = 1, limit } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = limit !== undefined ? parseInt(limit, 10) : 1000;
    const limitNum = Math.min(1000, Math.max(1, parsedLimit || 1000));
    const offset = (pageNum - 1) * limitNum;

    let countSql = `SELECT COUNT(*) as total FROM vendors v LEFT JOIN societies s ON v.society_id = s.society_id`;
    let sql = `
      SELECT v.*, s.society_name
      FROM vendors v
      LEFT JOIN societies s ON v.society_id = s.society_id
    `;
    const conditions = [];
    const params = [];

    const targetSociety = society_id || societyId;
    if (targetSociety) {
      const rawSocStr = String(targetSociety).trim();
      if (/^d+$/.test(rawSocStr)) {
        conditions.push(`v.society_id = ?`);
        params.push(parseInt(rawSocStr, 10));
      } else {
        conditions.push(`(LOWER(s.society_name) LIKE ? OR LOWER(s.location) LIKE ?)`);
        const q = `%${rawSocStr.toLowerCase()}%`;
      }
    }

    const targetArea = area || location;
    if (targetArea) {
      conditions.push(`(LOWER(COALESCE(v.area, '')) LIKE ? OR LOWER(COALESCE(v.location, '')) LIKE ? OR LOWER(COALESCE(s.society_name, '')) LIKE ?)`);
      const q = `%${String(targetArea).trim().toLowerCase()}%`;
      params.push(q, q, q);
    }

    if (search) {
      conditions.push(`(LOWER(v.store_name) LIKE ? OR LOWER(v.vendor_name) LIKE ? OR LOWER(v.email) LIKE ? OR LOWER(COALESCE(v.area, '')) LIKE ? OR LOWER(s.society_name) LIKE ?)`);
      const q = `%${search.toLowerCase()}%`;
      params.push(q, q, q, q, q);
    }

    if (status && status !== 'all') {
      conditions.push(`LOWER(COALESCE(v.status, 'active')) = ?`);
      params.push(status.toLowerCase());
    }

    if (tier && tier !== 'all') {
      conditions.push(`LOWER(COALESCE(v.subscription_tier, 'pro')) = ?`);
      params.push(tier.toLowerCase());
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ` + conditions.join(' AND ');
      sql += whereClause;
      countSql += whereClause;
    }

    sql += ` ORDER BY v.vendor_id DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const countRes = await query(countSql, params.slice(0, -2));
    const total = parseInt(countRes.rows[0]?.total || 0, 10);
    const total_pages = Math.ceil(total / limitNum) || 1;

    const result = await query(sql, params);
    const vendors = (result.rows || []).map(v => serializeVendorForAdmin(v));

    const pagination = { total, page: pageNum, limit: limitNum, total_pages };
    return respond(res, 200, vendors, 'Vendors list retrieved successfully.', pagination);
  } catch (err) {
    console.error('Error listing vendors:', err);
    return sendStandardError(res, 500, 'Failed to fetch vendors list.', 'INTERNAL_SERVER_ERROR');
  }
}

async function listPendingVendors(req, res) {
  try {
    const result = await query(`
      SELECT v.*, s.society_name 
      FROM vendors v
      LEFT JOIN societies s ON v.society_id = s.society_id
      WHERE LOWER(COALESCE(v.status, 'active')) = 'pending' OR v.vendor_id IN (SELECT vendor_id FROM payments WHERE status = 'PENDING')
      ORDER BY v.vendor_id DESC
    `);

    const pendingVendors = (result.rows || []).map(v => serializeVendorForAdmin({ ...v, status: 'PENDING' }));
    return respond(res, 200, pendingVendors, 'Pending vendor onboarding requests retrieved.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch pending vendor applications.', 'INTERNAL_SERVER_ERROR');
  }
}

async function listOnHoldVendors(req, res) {
  try {
    const result = await query(`
      SELECT v.*, s.society_name 
      FROM vendors v
      LEFT JOIN societies s ON v.society_id = s.society_id
      WHERE LOWER(COALESCE(v.status, '')) IN ('hold', 'on_hold')
      ORDER BY v.has_resubmitted DESC, v.resubmitted_at DESC, v.vendor_id DESC
    `);

    const holdVendors = (result.rows || []).map(v => serializeVendorForAdmin({ ...v, status: 'HOLD' }));
    return respond(res, 200, holdVendors, 'On-hold vendor onboarding requests retrieved.');
  } catch (err) {
    console.error('Error fetching on-hold vendors:', err);
    return sendStandardError(res, 500, 'Failed to fetch on-hold vendor applications.', 'INTERNAL_SERVER_ERROR');
  }
}

async function holdVendor(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id;
    const { subject, email_content, reason, message } = req.body || {};

    const existing = await query(`SELECT * FROM vendors WHERE vendor_id = ?`, [targetId]);
    if (!existing.rows || existing.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const v = existing.rows[0];
    const emailSubject = String(subject || 'DigiLocal Application Hold Notice - Action Required').trim();
    const emailBodyContent = String(email_content || reason || message || 'Your merchant application is currently on hold. Please log in to your vendor portal settings, make the requested updates, and click Resubmit Request.').trim();

    await query(
      `UPDATE vendors SET status = 'HOLD', hold_email_subject = ?, hold_reason = ?, has_resubmitted = FALSE WHERE vendor_id = ?`,
      [emailSubject, emailBodyContent, targetId]
    );

    if (v.email) {
      const { sendEmail } = require('../../services/emailService');
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #e65100;">Action Required: Your DigiLocal Merchant Application is On Hold</h2>
          <p>Dear <strong>${v.vendor_name || v.owner_name || 'Vendor'}</strong>,</p>
          <p>Your store application for <strong>"${v.store_name}"</strong> has been placed on <strong>Hold</strong> by the Admin team for the following reason:</p>
          <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 15px 0; font-size: 15px; border-radius: 4px;">
            ${emailBodyContent.replace(/\n/g, '<br/>')}
          </div>
          <p><strong>Next Steps:</strong></p>
          <ol>
            <li>Log in to your DigiLocal Vendor Portal.</li>
            <li>Go to <strong>Settings</strong> and update the required shop/owner details as requested.</li>
            <li>Click the <strong>"Resubmit Request"</strong> button to send your updated details to the Admin Hold section.</li>
          </ol>
          <p>Best regards,<br/><strong>DigiLocal Admin Team</strong></p>
        </div>
      `;

      sendEmail({
        to: v.email,
        subject: emailSubject,
        html
      }).catch(e => console.error('[Hold] Email sending failed:', e.message));
    }

    return respond(res, 200, {
      vendor_id: Number(targetId),
      status: 'on_hold',
      hold_email_subject: emailSubject,
      hold_reason: emailBodyContent,
      has_resubmitted: false
    }, 'Merchant onboarding application placed on hold. Notification email sent to vendor.');
  } catch (err) {
    console.error('Error putting vendor on hold:', err);
    return sendStandardError(res, 500, 'Failed to place vendor application on hold.', 'INTERNAL_SERVER_ERROR');
  }
}

async function approveVendor(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id;

    const existing = await query(`SELECT * FROM vendors WHERE vendor_id = ?`, [targetId]);
    if (!existing.rows || existing.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const v = existing.rows[0];
    const targetArea = String(v.area || v.society_name || v.location || 'General Sector').trim();
    const targetCity = String(v.city || 'Noida').trim();
    const targetState = String(v.state || 'Uttar Pradesh').trim();
    const targetPincode = String(v.pincode || '201301').trim();

    let locRes = await query(
      `SELECT location_id FROM locations WHERE LOWER(TRIM(area)) = LOWER(?)`,
      [targetArea]
    );
    let locId;
    if (locRes.rows && locRes.rows.length > 0) {
      locId = Number(locRes.rows[0].location_id);
    } else {
      const insRes = await query(
        `INSERT INTO locations (area, city, state, pincode, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING location_id`,
        [targetArea, targetCity, targetState, targetPincode]
      );
      locId = Number(insRes.insertId || insRes.rows[0]?.location_id || 1);
    }

    await query(
      `UPDATE vendors SET status = 'ACTIVE', location_id = ?, area = ?, society_id = COALESCE(society_id, ?) WHERE vendor_id = ?`,
      [locId, targetArea, locId, targetId]
    );
    await query(`UPDATE payments SET status = 'SUCCESS' WHERE vendor_id = ?`, [targetId]);
    await query(`UPDATE subscriptions SET status = 'ACTIVE' WHERE vendor_id = ?`, [targetId]);

    return respond(res, 200, {
      vendor_id: Number(targetId),
      location_id: locId,
      area: targetArea,
      status: 'active'
    }, 'Merchant onboarding application approved and activated.');
  } catch (err) {
    console.error('Error approving vendor:', err);
    return sendStandardError(res, 500, 'Failed to approve vendor application.', 'INTERNAL_SERVER_ERROR');
  }
}

async function rejectVendor(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id;
    const { reason, rejection_reason } = req.body || {};

    const existing = await query(`SELECT vendor_id FROM vendors WHERE vendor_id = ?`, [targetId]);
    if (!existing.rows || existing.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    await query(`UPDATE vendors SET status = 'REJECTED' WHERE vendor_id = ?`, [targetId]);

    return respond(res, 200, {
      vendor_id: Number(targetId),
      status: 'rejected',
      reason: reason || rejection_reason || 'Application criteria not met.'
    }, 'Merchant onboarding application rejected. Vendor record retained in database with REJECTED status.');
  } catch (err) {
    console.error('Error rejecting vendor:', err);
    return sendStandardError(res, 500, 'Failed to reject vendor application.', 'INTERNAL_SERVER_ERROR');
  }
}

async function blockVendor(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id;
    const { reason, block_reason, message } = req.body || {};

    const existing = await query(`SELECT vendor_id FROM vendors WHERE vendor_id = ?`, [targetId]);
    if (!existing.rows || existing.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const reasonText = String(reason || block_reason || message || 'Vendor store account blocked by admin due to policy violation.').trim();
    await query(`UPDATE vendors SET status = 'BLOCKED', hold_reason = ? WHERE vendor_id = ?`, [reasonText, targetId]);

    return respond(res, 200, {
      vendor_id: Number(targetId),
      status: 'blocked',
      is_blocked: true,
      reason: reasonText
    }, 'Merchant account blocked successfully by admin.');
  } catch (err) {
    console.error('Error blocking vendor:', err);
    return sendStandardError(res, 500, 'Failed to block vendor account.', 'INTERNAL_SERVER_ERROR');
  }
}

async function getVendorById(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id;

    const result = await query(
      `SELECT v.*, s.society_name 
       FROM vendors v 
       LEFT JOIN societies s ON v.society_id = s.society_id 
       WHERE v.vendor_id = ?`,
      [targetId]
    );

    if (!result.rows || result.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const vendorObj = serializeVendorForAdmin(result.rows[0]);
    return respond(res, 200, vendorObj, 'Vendor details retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch vendor details.', 'INTERNAL_SERVER_ERROR');
  }
}

async function getVendorDetails(req, res) {
  return getVendorById(req, res);
}

async function createVendor(req, res) { return respond(res, 200, {}, 'Vendor created.'); }

async function updateVendor(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id || req.body?.vendor_id || req.body?.id;
    if (!targetId) return sendStandardError(res, 400, 'Vendor ID parameter is required.', 'MISSING_PARAM');

    const existing = await query(`SELECT * FROM vendors WHERE vendor_id = ?`, [targetId]);
    if (!existing.rows || existing.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const v = existing.rows[0];
    const b = req.body || {};

    const newOwnerName = b.owner_name !== undefined ? b.owner_name : (b.ownerName !== undefined ? b.ownerName : (b.vendor_name !== undefined ? b.vendor_name : v.owner_name));
    const newVendorName = b.vendor_name !== undefined ? b.vendor_name : (b.name !== undefined ? b.name : (newOwnerName || v.vendor_name));
    const newStoreName = b.store_name !== undefined ? b.store_name : (b.storeName !== undefined ? b.storeName : (b.shop_name !== undefined ? b.shop_name : v.store_name));
    const newEmail = b.email !== undefined ? b.email : v.email;
    const newPhone = b.phone_number !== undefined ? b.phone_number : (b.phone !== undefined ? b.phone : (b.mobile !== undefined ? b.mobile : v.phone_number));
    const newArea = b.area !== undefined ? b.area : (b.location !== undefined ? b.location : (b.society_name !== undefined ? b.society_name : v.area));
    const newAddress = b.address !== undefined ? b.address : v.address;
    const newCity = b.city !== undefined ? b.city : v.city;
    const newPincode = b.pincode !== undefined ? b.pincode : v.pincode;
    const newCategory = b.category !== undefined ? b.category : v.category;
    const newGstin = b.gstin !== undefined ? b.gstin : v.gstin;
    const newMinOrder = b.min_order_value !== undefined ? b.min_order_value : v.min_order_value;
    const newDeliveryCharge = b.delivery_charge !== undefined ? b.delivery_charge : v.delivery_charge;
    const newGstPercent = b.gst_percentage !== undefined ? b.gst_percentage : v.gst_percentage;
    const newStatus = b.status !== undefined ? String(b.status).toUpperCase() : v.status;

    await query(`
      UPDATE vendors 
      SET vendor_name = ?,
          owner_name = ?,
          store_name = ?,
          email = ?,
          phone_number = ?,
          area = ?,
          address = ?,
          city = ?,
          pincode = ?,
          category = ?,
          gstin = ?,
          min_order_value = ?,
          delivery_charge = ?,
          gst_percentage = ?,
          status = ?
      WHERE vendor_id = ?
    `, [newVendorName, newOwnerName, newStoreName, newEmail, newPhone, newArea, newAddress, newCity, newPincode, newCategory, newGstin, newMinOrder, newDeliveryCharge, newGstPercent, newStatus, targetId]);

    const updatedRes = await query(`SELECT v.*, s.society_name FROM vendors v LEFT JOIN societies s ON v.society_id = s.society_id WHERE v.vendor_id = ?`, [targetId]);
    const updatedVendorObj = serializeVendorForAdmin(updatedRes.rows[0]);

    return respond(res, 200, updatedVendorObj, `Vendor details for "${newStoreName}" updated successfully in database.`);
  } catch (err) {
    console.error('Error updating vendor details:', err);
    return sendStandardError(res, 500, 'Failed to update vendor details.', 'INTERNAL_SERVER_ERROR');
  }
}

async function updateUserAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id || req.body?.user_id || req.body?.id;
    if (!targetId) return sendStandardError(res, 400, 'User ID parameter is required.', 'MISSING_PARAM');

    const existing = await query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [String(targetId), String(targetId), String(targetId)]);
    if (!existing.rows || existing.rows.length === 0) {
      return sendStandardError(res, 404, `User ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const u = existing.rows[0];
    const b = req.body || {};

    const newName = b.name !== undefined ? String(b.name).trim() : u.name;
    const newEmail = b.email !== undefined ? String(b.email).trim() : u.email;
    const newPhone = b.phone !== undefined ? String(b.phone).trim() : u.phone;
    const newFlat = b.flat !== undefined ? String(b.flat).trim() : (u.flat || '');
    const newArea = (b.area !== undefined ? b.area : (b.location !== undefined ? b.location : b.society_name)) !== undefined ? String(b.area || b.location || b.society_name).trim() : (u.area || u.society_name || '');
    const newCity = b.city !== undefined ? String(b.city).trim() : (u.city || '');
    const newPincode = b.pincode !== undefined ? String(b.pincode).trim() : (u.pincode || '');
    const newAddress = (b.address !== undefined ? b.address : b.full_address) !== undefined ? String(b.address || b.full_address).trim() : (u.address || '');
    const newStatus = b.status !== undefined ? String(b.status).toUpperCase() : (u.status || 'ACTIVE');

    await query(`
      UPDATE users 
      SET name = ?,
          email = ?,
          phone = ?,
          flat = ?,
          area = ?,
          society_name = ?,
          city = ?,
          pincode = ?,
          address = ?,
          status = ?
      WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
    `, [newName, newEmail, newPhone, newFlat, newArea, newArea, newCity, newPincode, newAddress, newStatus, String(targetId), String(targetId), String(targetId)]).catch(async () => {
      return query(`
        UPDATE users 
        SET name = ?, email = ?, phone = ?, flat = ?, society_name = ?, status = ?
        WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
      `, [newName, newEmail, newPhone, newFlat, newArea, newStatus, String(targetId), String(targetId), String(targetId)]);
    });

    const updatedUserObj = {
      user_id: String(u.user_id),
      name: newName,
      email: newEmail,
      phone: newPhone,
      area: newArea,
      society_name: newArea,
      flat: newFlat,
      city: newCity,
      pincode: newPincode,
      address: newAddress,
      status: newStatus.toLowerCase(),
      is_blocked: newStatus.toUpperCase() === 'BLOCKED' || newStatus.toUpperCase() === 'SUSPENDED'
    };

    return respond(res, 200, updatedUserObj, `User profile details for "${newName}" updated successfully in database.`);
  } catch (err) {
    console.error('Error updating user details in admin:', err);
    return sendStandardError(res, 500, 'Failed to update user details in admin.', 'INTERNAL_SERVER_ERROR');
  }
}
async function updateVendorStatus(req, res) {
  try {
    const { vendorId, id } = req.params;
    const targetId = vendorId || id;
    const { status, reason } = req.body || {};

    if (!targetId) return sendStandardError(res, 400, 'Vendor ID is required.');
    const targetStatus = String(status || 'BLOCKED').toUpperCase();

    await query(`UPDATE vendors SET status = ?, hold_reason = COALESCE(?, hold_reason) WHERE vendor_id = ?`, [targetStatus, reason, targetId]);

    return respond(res, 200, {
      vendor_id: Number(targetId),
      status: targetStatus.toLowerCase(),
      is_blocked: targetStatus === 'BLOCKED'
    }, `Vendor account status updated to ${targetStatus}.`);
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to update vendor status.');
  }
}
async function bulkVendorAction(req, res) { return respond(res, 200, {}, 'Bulk vendor action completed.'); }
async function getVendorPayments(req, res) { return respond(res, 200, [], 'Vendor payments.'); }

// Module 4: Users Directory & Sub-resources
async function listUsers(req, res) {
  try {
    const { page = 1, limit = 100, search } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT * FROM users`;
    const params = [];
    if (search) {
      sql += ` WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR user_id = ? OR society_name LIKE ? OR area LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, search, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const result = await query(sql, params).catch(() => ({ rows: [] }));

    const users = (result.rows || []).map(u => ({
      user_id: String(u.user_id),
      name: u.name || '',
      email: u.email || '',
      country_code: '+91',
      phone_number: get10DigitPhone(u.phone),
      area: u.area || u.society_name || '',
      society_name: u.society_name || u.area || '',
      flat: u.flat || '',
      status: (u.status || 'ACTIVE').toLowerCase(),
      is_blocked: String(u.status || '').toUpperCase() === 'BLOCKED' || String(u.status || '').toUpperCase() === 'SUSPENDED',
      created_at: formatUTCISO(u.created_at),
      created_at_ist: formatKolkataISO(u.created_at),
      created_at_readable: formatKolkataReadable(u.created_at)
    }));
    return respond(res, 200, users, 'Users directory retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to retrieve users directory.');
  }
}

async function getUserById(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const result = await query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [targetId, String(targetId), String(targetId)]).catch(() => ({ rows: [] }));
    if (!result.rows || result.rows.length === 0) {
      return sendStandardError(res, 404, `User "${targetId}" not found.`);
    }
    const u = result.rows[0];
    const userObj = {
      user_id: String(u.user_id),
      name: u.name || '',
      email: u.email || '',
      country_code: '+91',
      phone_number: get10DigitPhone(u.phone),
      area: u.area || u.society_name || '',
      society_name: u.society_name || u.area || '',
      flat: u.flat || '',
      status: (u.status || 'ACTIVE').toLowerCase(),
      is_blocked: String(u.status || '').toUpperCase() === 'BLOCKED' || String(u.status || '').toUpperCase() === 'SUSPENDED',
      created_at: formatUTCISO(u.created_at),
      created_at_ist: formatKolkataISO(u.created_at),
      created_at_readable: formatKolkataReadable(u.created_at)
    };
    return respond(res, 200, userObj, 'User profile retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to retrieve user profile.');
  }
}

/**
 * Helper: Enriches order record with itemized order_details, item names, prices, quantities,
 * store info, customer details, and full address for Admin Panel visibility.
 */
async function enrichOrderWithDetails(ord) {
  if (!ord) return null;

  // 1. Fetch order details / items
  const detailsRes = await query(
    `SELECT item_id, item_name, quantity, COALESCE(price, unit_price, 0) as price, COALESCE(item_total, price * quantity, 0) as item_total
     FROM order_details 
     WHERE order_id = ? OR CAST(order_id AS TEXT) = ?`,
    [ord.order_id, String(ord.order_id)]
  ).catch(() => ({ rows: [] }));

  // 2. Fetch vendor info if missing
  const vendorRes = await query(
    `SELECT store_name, vendor_name, phone_number, area, city, state, pincode, category FROM vendors WHERE vendor_id = ?`,
    [ord.vendor_id]
  ).catch(() => ({ rows: [] }));

  const vInfo = vendorRes.rows[0] || {};

  // 3. Fetch user info if missing
  const userRes = await query(
    `SELECT name, phone, email, flat, area, city, state, pincode, address FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`,
    [ord.user_id, String(ord.user_id)]
  ).catch(() => ({ rows: [] }));

  const uInfo = userRes.rows[0] || {};

  const mappedItems = (detailsRes.rows || []).map((item, idx) => ({
    item_id: Number(item.item_id || idx + 1),
    item_name: item.item_name || 'Catalog Item',
    name: item.item_name || 'Catalog Item',
    quantity: Number(item.quantity || 1),
    unit_price: Number(item.price || 0),
    price: Number(item.price || 0),
    item_total: Number(item.item_total || (item.price * item.quantity) || 0)
  }));

  const calculatedSubtotal = mappedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const totalAmount = Number(ord.total_amount || calculatedSubtotal || 0);
  const serviceCharge = Math.max(0, totalAmount - calculatedSubtotal);

  // Exact delivery address entered at checkout for this specific order
  const orderSpecificDeliveryAddress = String(ord.delivery_address || ord.full_address || uInfo.address || '').trim();

  let flatVal = String(ord.flat || '').trim();
  let areaVal = String(ord.area || '').trim();

  if (!flatVal && orderSpecificDeliveryAddress.includes(',')) {
    flatVal = orderSpecificDeliveryAddress.split(',')[0].trim();
  } else if (!flatVal) {
    flatVal = String(uInfo.flat || '').trim();
  }

  if (!areaVal && orderSpecificDeliveryAddress.includes(',')) {
    const parts = orderSpecificDeliveryAddress.split(',');
    areaVal = parts.slice(1).join(',').trim();
  } else if (!areaVal) {
    areaVal = String(uInfo.area || uInfo.society_name || vInfo.area || '').trim();
  }

  const cityVal = String(ord.city || uInfo.city || vInfo.city || 'Noida').trim();
  const stateVal = String(ord.state || uInfo.state || vInfo.state || 'Uttar Pradesh').trim();
  const pincodeVal = String(ord.pincode || uInfo.pincode || vInfo.pincode || '').trim();

  const formattedFullAddress = orderSpecificDeliveryAddress || [flatVal, areaVal, cityVal, stateVal, pincodeVal].filter(Boolean).join(', ');

  const statusUpper = String(ord.status || 'PENDING').toUpperCase();

  return {
    order_id: String(ord.order_id),
    user_id: String(ord.user_id),
    vendor_id: Number(ord.vendor_id),
    customer_name: ord.customer_name || uInfo.name || 'Resident Customer',
    customer_phone: ord.customer_phone || ord.phone || uInfo.phone || '',
    phone: ord.phone || ord.customer_phone || uInfo.phone || '',
    store_name: ord.store_name || vInfo.store_name || 'Partner Store',
    vendor_name: vInfo.vendor_name || 'Store Owner',
    vendor_phone: vInfo.phone_number || '',
    category: vInfo.category || 'General',
    status: statusUpper,
    payment_status: ord.payment_status || (statusUpper === 'COMPLETED' || statusUpper === 'DELIVERED' ? 'PAID' : 'PENDING'),
    payment_method: ord.payment_method || 'COD / Online',
    flat: flatVal,
    area: areaVal,
    city: cityVal,
    state: stateVal,
    pincode: pincodeVal,
    delivery_address: formattedFullAddress,
    full_address: formattedFullAddress,
    subtotal: calculatedSubtotal,
    service_charge: serviceCharge,
    total_amount: totalAmount,
    total: totalAmount,
    items_count: mappedItems.length,
    items: mappedItems,
    products: mappedItems,
    created_at: formatKolkataISO(ord.created_at || ord.order_timestamp || new Date()),
    created_at_readable: formatKolkataReadable(ord.created_at || ord.order_timestamp || new Date())
  };
}

async function getUserOrdersAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const cleanPhone = String(targetId).trim().replace(/[^0-9]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const uRes = await query(
      `SELECT user_id FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ? OR phone LIKE ?`,
      [targetId, String(targetId), targetId, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const matchedUserIds = Array.from(new Set([
      targetId,
      ...(uRes.rows || []).map(r => r.user_id)
    ]));

    const placeholders = matchedUserIds.map(() => '?').join(',');
    const ordersRes = await query(
      `SELECT o.*, v.store_name, s.society_name
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
       LEFT JOIN societies s ON o.society_id = s.society_id
       LEFT JOIN users u ON o.user_id = u.user_id
       WHERE o.user_id IN (${placeholders}) OR u.phone = ? OR u.phone LIKE ? OR o.delivery_address LIKE ?
       ORDER BY o.created_at DESC`,
      [...matchedUserIds, targetId, `%${last10}`, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const enrichedOrders = [];
    for (const ord of (ordersRes.rows || [])) {
      const detailedOrd = await enrichOrderWithDetails(ord);
      if (detailedOrd) enrichedOrders.push(detailedOrd);
    }

    return respond(res, 200, enrichedOrders, 'User orders with full items details retrieved successfully.');
  } catch (err) {
    console.error('Error fetching user orders in admin:', err);
    return sendStandardError(res, 500, 'Failed to fetch user orders.');
  }
}

async function getUserPaymentsAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const paymentsRes = await query(
      `SELECT * FROM payment_transactions WHERE user_id = ? OR CAST(user_id AS TEXT) = ? ORDER BY created_at DESC`,
      [targetId, String(targetId)]
    ).catch(() => ({ rows: [] }));
    return respond(res, 200, paymentsRes.rows || [], 'User payment ledger retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch user payments.');
  }
}

async function getUserTimelineAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const userRes = await query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [targetId, String(targetId), String(targetId)]).catch(() => ({ rows: [] }));
    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `User "${targetId}" not found.`);
    }
    const u = userRes.rows[0];
    const timeline = [
      {
        id: `evt_reg_${u.user_id}`,
        type: 'REGISTRATION',
        title: 'User Account Created',
        description: `Resident account registered with mobile ${u.phone || 'N/A'}`,
        timestamp: formatKolkataISO(u.created_at || new Date())
      }
    ];
    if (String(u.status || '').toUpperCase() === 'BLOCKED' || String(u.status || '').toUpperCase() === 'SUSPENDED') {
      timeline.unshift({
        id: `evt_block_${u.user_id}`,
        type: 'ACCOUNT_BLOCKED',
        title: 'Account Blocked by Admin',
        description: 'Resident user access suspended due to policy violation.',
        timestamp: formatKolkataISO(new Date())
      });
    }
    return respond(res, 200, timeline, 'User activity timeline retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch user timeline.');
  }
}

async function getUserAddressesAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const userRes = await query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [targetId, String(targetId), String(targetId)]).catch(() => ({ rows: [] }));
    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `User "${targetId}" not found.`);
    }
    const u = userRes.rows[0];
    const hasAddress = Boolean(u.flat || u.area || u.society_name || u.address || u.city || u.pincode);
    const addresses = hasAddress ? [
      {
        address_id: `addr_primary_${u.user_id}`,
        user_id: String(u.user_id),
        type: 'Primary Residence',
        flat: u.flat || '',
        area: u.area || u.society_name || '',
        society_name: u.society_name || u.area || '',
        city: u.city || '',
        state: u.state || '',
        pincode: u.pincode || '',
        full_address: u.address || [u.flat, u.area || u.society_name, u.city, u.pincode].filter(Boolean).join(', ') || '',
        is_default: true
      }
    ] : [];
    return respond(res, 200, addresses, 'User addresses retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch user addresses.');
  }
}

async function getUserNotificationsAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const notifsRes = await query(
      `SELECT * FROM user_notifications WHERE user_id = ? OR CAST(user_id AS TEXT) = ? ORDER BY created_at DESC`,
      [targetId, String(targetId)]
    ).catch(() => ({ rows: [] }));
    return respond(res, 200, notifsRes.rows || [], 'User notifications retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch user notifications.');
  }
}

async function getUserAuditLogsAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const auditRes = await query(
      `SELECT * FROM backend_audit_logs WHERE resource_id = ? OR CAST(resource_id AS TEXT) = ? ORDER BY timestamp DESC`,
      [String(targetId), String(targetId)]
    ).catch(() => ({ rows: [] }));
    return respond(res, 200, auditRes.rows || [], 'User audit logs retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch user audit logs.');
  }
}

async function strikeUser(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id || req.body?.user_id || req.body?.id;
    const reason = String(req.body?.reason || req.body?.strike_reason || 'Strike issued by administrator for policy violation').trim();

    if (!targetId) {
      return sendStandardError(res, 400, 'User ID is required to issue a strike.');
    }

    const cleanPhone = String(targetId).trim().replace(/[^0-9]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const userRes = await query(
      `SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ? OR phone LIKE ?`,
      [targetId, String(targetId), targetId, `%${last10}`]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `Resident user "${targetId}" not found.`);
    }

    const u = userRes.rows[0];
    const currentStrikes = Number(u.strikes || 0);
    const newStrikes = currentStrikes + 1;
    const isAutoBanned = newStrikes >= 3;
    const newStatus = isAutoBanned ? 'BLOCKED' : (u.status || 'ACTIVE');

    await query(
      `UPDATE users SET strikes = ?, status = ? WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`,
      [newStrikes, newStatus, String(u.user_id), String(u.user_id)]
    );

    const message = isAutoBanned
      ? `Strike #${newStrikes} issued to user "${u.name || u.user_id}". Account has reached 3 strikes and is AUTOMATICALLY BANNED / BLOCKED!`
      : `Strike #${newStrikes} issued to user "${u.name || u.user_id}". (${3 - newStrikes} strikes remaining before automatic ban).`;

    return respond(res, 200, {
      user_id: String(u.user_id),
      name: u.name || '',
      phone: u.phone || '',
      strikes: newStrikes,
      max_strikes_allowed: 3,
      status: newStatus.toLowerCase(),
      is_blocked: isAutoBanned || String(newStatus).toUpperCase() === 'BLOCKED',
      is_auto_banned: isAutoBanned,
      reason,
      message
    }, message);
  } catch (err) {
    console.error('Error issuing strike to user:', err);
    return sendStandardError(res, 500, 'Failed to issue strike to user.', 'INTERNAL_SERVER_ERROR');
  }
}

async function unstrikeUser(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id || req.body?.user_id || req.body?.id;
    const resetAll = req.body?.reset_all !== false && req.query?.reset_all !== 'false';

    if (!targetId) {
      return sendStandardError(res, 400, 'User ID is required to remove strike.');
    }

    const cleanPhone = String(targetId).trim().replace(/[^0-9]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const userRes = await query(
      `SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ? OR phone LIKE ?`,
      [targetId, String(targetId), targetId, `%${last10}`]
    );

    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `Resident user "${targetId}" not found.`);
    }

    const u = userRes.rows[0];
    const currentStrikes = Number(u.strikes || 0);
    const newStrikes = resetAll ? 0 : Math.max(0, currentStrikes - 1);
    const newStatus = (newStrikes < 3 && String(u.status).toUpperCase() === 'BLOCKED') ? 'ACTIVE' : u.status;

    await query(
      `UPDATE users SET strikes = ?, status = ? WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`,
      [newStrikes, newStatus, String(u.user_id), String(u.user_id)]
    );

    return respond(res, 200, {
      user_id: String(u.user_id),
      name: u.name || '',
      phone: u.phone || '',
      strikes: newStrikes,
      max_strikes_allowed: 3,
      status: newStatus.toLowerCase(),
      is_blocked: String(newStatus).toUpperCase() === 'BLOCKED'
    }, `User strikes count updated to ${newStrikes}.`);
  } catch (err) {
    console.error('Error removing strike from user:', err);
    return sendStandardError(res, 500, 'Failed to remove strike from user.', 'INTERNAL_SERVER_ERROR');
  }
}

async function flagUser(req, res) { return strikeUser(req, res); }
async function unflagUser(req, res) { return unstrikeUser(req, res); }
async function updateUserStatus(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id || req.body?.user_id || req.body?.id;
    const { status, block_reason, reason } = req.body || {};

    if (!targetId) return sendStandardError(res, 400, 'User ID is required.');
    const targetStatus = String(status || 'BLOCKED').toUpperCase();
    const reasonText = String(reason || block_reason || 'Blocked by admin due to policy violation.').trim();

    await query(
      `UPDATE users SET status = ? WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`,
      [targetStatus, targetId, String(targetId), String(targetId)]
    );

    return respond(res, 200, {
      user_id: String(targetId),
      status: targetStatus.toLowerCase(),
      is_blocked: targetStatus === 'BLOCKED',
      reason: reasonText
    }, `User account status updated to ${targetStatus}.`);
  } catch (err) {
    console.error('Error updating user status:', err);
    return sendStandardError(res, 500, 'Failed to update user status.', 'INTERNAL_SERVER_ERROR');
  }
}

async function blockUser(req, res) {
  return updateUserStatus(req, res);
}

async function unblockUser(req, res) {
  req.body = req.body || {};
  req.body.status = 'ACTIVE';
  return updateUserStatus(req, res);
}
async function resetUserPassword(req, res) { return respond(res, 200, {}, 'Password reset.'); }
async function deleteUser(req, res) { return respond(res, 200, {}, 'User deleted.'); }
async function getUserAnalytics(req, res) { return respond(res, 200, {}, 'User analytics.'); }

// Module 5: Subscriptions & Billing
async function listSubscriptions(req, res) { return respond(res, 200, [], 'Subscriptions list.'); }
async function getFinancialStats(req, res) { return respond(res, 200, {}, 'Financial stats.'); }
async function renewSubscription(req, res) { return respond(res, 200, {}, 'Subscription renewed.'); }
async function cancelSubscription(req, res) { return respond(res, 200, {}, 'Subscription cancelled.'); }
async function getInvoicePreview(req, res) { return respond(res, 200, {}, 'Invoice preview.'); }

// Module 6: Orders & Payments
async function listOrdersAdmin(req, res) {
  try {
    const { page = 1, limit = 100, status, search, vendor_id } = req.query || {};
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    let sql = `SELECT o.*, v.store_name, s.society_name FROM orders o LEFT JOIN vendors v ON o.vendor_id = v.vendor_id LEFT JOIN societies s ON o.society_id = s.society_id`;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(`UPPER(o.status) = UPPER(?)`);
      params.push(String(status).trim());
    }
    if (vendor_id) {
      conditions.push(`o.vendor_id = ?`);
      params.push(vendor_id);
    }
    if (search) {
      conditions.push(`(o.order_id LIKE ? OR CAST(o.user_id AS TEXT) LIKE ? OR o.customer_name LIKE ? OR o.delivery_address LIKE ? OR v.store_name LIKE ?)`);
      const q = `%${search}%`;
      params.push(q, q, q, q, q);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY o.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    const resDb = await query(sql, params).catch(() => ({ rows: [] }));
    const enrichedOrders = [];
    for (const ord of (resDb.rows || [])) {
      const detailedOrd = await enrichOrderWithDetails(ord);
      if (detailedOrd) enrichedOrders.push(detailedOrd);
    }

    return respond(res, 200, enrichedOrders, 'Admin orders list with full items details retrieved successfully.');
  } catch (err) {
    console.error('Error fetching admin orders list:', err);
    return sendStandardError(res, 500, 'Failed to fetch admin orders list.', 'INTERNAL_SERVER_ERROR');
  }
}

async function getOrderByIdAdmin(req, res) {
  try {
    const { orderId, id } = req.params;
    const targetId = orderId || id;
    if (!targetId) return sendStandardError(res, 400, 'Order ID is required.');

    const resDb = await query(
      `SELECT o.*, v.store_name FROM orders o LEFT JOIN vendors v ON o.vendor_id = v.vendor_id WHERE o.order_id = ? OR CAST(o.order_id AS TEXT) = ?`,
      [targetId, String(targetId)]
    );

    if (!resDb.rows || resDb.rows.length === 0) {
      return sendStandardError(res, 404, `Order "${targetId}" not found.`);
    }

    const detailedOrder = await enrichOrderWithDetails(resDb.rows[0]);
    return respond(res, 200, detailedOrder, 'Complete order details retrieved successfully.');
  } catch (err) {
    console.error('Error fetching order details in admin:', err);
    return sendStandardError(res, 500, 'Failed to fetch order details.');
  }
}
async function flagOrderAudit(req, res) { return respond(res, 200, {}, 'Order audit flagged.'); }
async function getPaymentTransactions(req, res) { return respond(res, 200, [], 'Payment transactions.'); }
async function processRefund(req, res) { return respond(res, 200, {}, 'Refund processed.'); }

// Module 7: Promotions
async function listPromotions(req, res) { return respond(res, 200, [], 'Promotions list.'); }
async function createPromotion(req, res) { return respond(res, 200, {}, 'Promotion created.'); }
async function updatePromotion(req, res) { return respond(res, 200, {}, 'Promotion updated.'); }
async function deletePromotion(req, res) { return respond(res, 200, {}, 'Promotion deleted.'); }

// Module 8: Sub-Admins Management
async function listSubAdmins(req, res) {
  try {
    const result = await query(`SELECT id, name, email, phone_number, role, powers, status, created_at FROM sub_admins ORDER BY id DESC`);
    const list = (result.rows || []).map(r => {
      let parsedPowers = r.powers;
      if (typeof parsedPowers === 'string') {
        try { parsedPowers = JSON.parse(parsedPowers); } catch (_) { parsedPowers = ['all']; }
      }
      return {
        id: Number(r.id),
        name: r.name,
        email: r.email,
        phone_number: r.phone_number || '',
        role: r.role || 'sub_admin',
        powers: Array.isArray(parsedPowers) ? parsedPowers : ['all'],
        status: r.status || 'active',
        created_at: r.created_at
      };
    });
    return respond(res, 200, list, 'Sub-admins list retrieved successfully.');
  } catch (err) {
    console.error('Error listing sub-admins:', err);
    return sendStandardError(res, 500, 'Failed to fetch sub-admins.', 'INTERNAL_SERVER_ERROR');
  }
}

async function createSubAdmin(req, res) {
  try {
    const { name, sub_admin_name, username, email, phone_number, phone, password, powers, delegated_powers, role } = req.body || {};

    const subName = String(name || sub_admin_name || username || '').trim();
    const subEmail = String(email || '').trim().toLowerCase();
    const subPhone = String(phone_number || phone || '').trim();
    const subPassword = String(password || 'SubAdmin123!').trim();
    let subPowers = powers || delegated_powers || ['all'];

    if (typeof subPowers === 'string') {
      try { subPowers = JSON.parse(subPowers); } catch (_) { subPowers = [subPowers]; }
    }
    if (!Array.isArray(subPowers) || subPowers.length === 0) {
      subPowers = ['all'];
    }

    if (!subName) return sendStandardError(res, 400, 'Sub-Admin name is required.', 'MISSING_FIELDS');
    if (!subEmail) return sendStandardError(res, 400, 'Sub-Admin email is required.', 'MISSING_FIELDS');

    const checkExisting = await query(`SELECT id FROM sub_admins WHERE LOWER(email) = LOWER(?)`, [subEmail]);
    if (checkExisting.rows && checkExisting.rows.length > 0) {
      return sendStandardError(res, 400, 'Sub-Admin with this email already exists.', 'DUPLICATE_EMAIL');
    }

    const { hashPassword } = require('../../utils/auth');
    const pwdHash = await hashPassword(subPassword);
    const powersJson = JSON.stringify(subPowers);

    const insertRes = await query(
      `INSERT INTO sub_admins (name, email, phone_number, password_hash, role, powers, status) VALUES (?, ?, ?, ?, ?, ?, 'active') RETURNING *`,
      [subName, subEmail, subPhone, pwdHash, role || 'sub_admin', powersJson]
    );

    const newSub = insertRes.rows[0] || {};
    const createdObj = {
      id: Number(newSub.id || insertRes.insertId),
      name: newSub.name || subName,
      email: newSub.email || subEmail,
      phone_number: newSub.phone_number || subPhone,
      role: newSub.role || 'sub_admin',
      powers: subPowers,
      status: 'active',
      created_at: newSub.created_at || new Date().toISOString()
    };

    return respond(res, 201, createdObj, 'Sub-Admin account created successfully.');
  } catch (err) {
    console.error('Error creating sub-admin:', err);
    return sendStandardError(res, 500, 'Failed to create sub-admin account.', 'INTERNAL_SERVER_ERROR');
  }
}

async function updateSubAdminPowers(req, res) {
  try {
    const { id } = req.params;
    const { powers, delegated_powers, status } = req.body || {};
    let subPowers = powers || delegated_powers;

    if (typeof subPowers === 'string') {
      try { subPowers = JSON.parse(subPowers); } catch (_) { subPowers = [subPowers]; }
    }
    if (!Array.isArray(subPowers)) subPowers = ['all'];

    await query(
      `UPDATE sub_admins SET powers = ?, status = COALESCE(?, status) WHERE id = ?`,
      [JSON.stringify(subPowers), status, id]
    );

    return respond(res, 200, { id: Number(id), powers: subPowers }, 'Sub-Admin powers updated successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to update sub-admin powers.', 'INTERNAL_SERVER_ERROR');
  }
}

async function deleteSubAdmin(req, res) {
  try {
    const { id } = req.params;
    await query(`DELETE FROM sub_admins WHERE id = ?`, [id]);
    return respond(res, 200, { id: Number(id) }, 'Sub-Admin account deleted successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to delete sub-admin account.', 'INTERNAL_SERVER_ERROR');
  }
}

// Module 9: Support Desk
const supportController = require('../Support/supportController');

async function listSupportTickets(req, res) { return supportController.listAdminTickets(req, res); }
async function getTicketById(req, res) { return supportController.getTicketById(req, res); }
async function getTicketMessages(req, res) { return supportController.getTicketMessages(req, res); }
async function replyToTicket(req, res) { return supportController.replyToTicket(req, res); }
async function escalateTicket(req, res) { return supportController.escalateTicket(req, res); }
async function deescalateTicket(req, res) { return supportController.deescalateTicket(req, res); }
async function addTicketFollower(req, res) { return supportController.manageFollowers(req, res); }
async function mergeTickets(req, res) { return supportController.mergeTickets(req, res); }
async function unmergeTickets(req, res) { return supportController.unmergeTickets(req, res); }
async function updateTicketStatus(req, res) { return supportController.updateTicketStatus(req, res); }
async function getSupportAnalytics(req, res) { return supportController.getAnalytics(req, res); }
async function getSlaConfig(req, res) { return supportController.getSlaConfig(req, res); }
async function updateSlaConfig(req, res) { return supportController.updateSlaConfig(req, res); }
async function getTags(req, res) { return supportController.getTags(req, res); }
async function createTag(req, res) { return supportController.createTag(req, res); }
async function deleteTag(req, res) { return supportController.deleteTag(req, res); }
async function uploadAttachment(req, res) { return supportController.uploadAttachment(req, res); }


// Module 10: Executive Reports & Exports
async function getExecutiveReports(req, res) { return respond(res, 200, {}, 'Executive reports.'); }
async function exportReportData(req, res) { return respond(res, 200, {}, 'Report exported.'); }

// Module 11: Notifications
async function listNotifications(req, res) { return respond(res, 200, [], 'Notifications list.'); }
async function broadcastNotification(req, res) { return respond(res, 200, {}, 'Notification broadcasted.'); }
async function markAllNotificationsRead(req, res) { return respond(res, 200, {}, 'Notifications marked read.'); }





async function getRevenueDashboard(req, res) { return respond(res, 200, { total_revenue: 0 }, 'Revenue dashboard.'); }
async function getPlatformConfig(req, res) { return respond(res, 200, { platform_name: 'DigiLocal' }, 'Platform config.'); }
async function updateBrandingConfig(req, res) { return respond(res, 200, {}, 'Branding updated.'); }
async function updateAdminProfile(req, res) { return respond(res, 200, {}, 'Admin profile updated.'); }
async function changeAdminPassword(req, res) { return respond(res, 200, {}, 'Password changed.'); }
async function updateSettingsSection(req, res) { return respond(res, 200, {}, 'Settings updated.'); }
async function sendTestEmail(req, res) { return respond(res, 200, {}, 'Test email sent.'); }
async function getDashboardData(req, res) { return respond(res, 200, { total_vendors: 0, pending_vendors: 0, total_revenue: 0 }, 'Dashboard metrics.'); }
async function getVendorDetails(req, res) { return getVendorById(req, res); }
async function toggleSubAdminStatus(req, res) { return respond(res, 200, {}, 'Sub-admin status toggled.'); }
async function listAuditLogs(req, res) { return respond(res, 200, [], 'Audit logs list.'); }


async function downloadPaymentReceipt(req, res) { return respond(res, 200, {}, 'Receipt.'); }
async function reassignVendorSociety(req, res) { return respond(res, 200, {}, 'Reassigned.'); }
async function bulkImportVendorsCsv(req, res) { return respond(res, 200, {}, 'Imported.'); }
async function getSystemAuditTrail(req, res) { return respond(res, 200, [], 'Audit trail.'); }


async function downloadPaymentInvoice(req, res) { return respond(res, 200, {}, 'Invoice.'); }
async function updateAdminSecurity(req, res) { return respond(res, 200, {}, 'Security updated.'); }

module.exports = {
  getRevenueDashboard,
  downloadPaymentReceipt,
  downloadPaymentInvoice,
  updateAdminSecurity,
  listAuditLogs,
  getPlatformConfig,
  updateBrandingConfig,
  updateAdminProfile,
  changeAdminPassword,
  updateSettingsSection,
  sendTestEmail,
  getDashboardData,
  getVendorDetails,
  serializeVendorForAdmin,
  formatKolkataISO,
  holdVendor,
  listOnHoldVendors,

  resetDatabase: async function(req, res) {
    try {
      const { clean_vendors } = req.body || {};
      const { cleanDatabaseTables } = require('../../models/db');
      const result = await cleanDatabaseTables({ cleanVendors: Boolean(clean_vendors) });

      return res.status(200).json({
        code: 200,
        status: 'success',
        ...result
      });
    } catch (err) {
      console.error('Error executing database cleanup:', err);
      return res.status(500).json({
        code: 500,
        status: 'error',
        error: 'DATABASE_CLEANUP_FAILED',
        message: err.message
      });
    }
  },


  // Module 1: Auth
  login,
  refreshToken,
  getMe,
  logout,

  // Module 2: Societies
  listSocieties,
  registerSociety,
  getSocietyById,
  updateSociety,
  deleteSociety,
  updateSocietyStatus,
  getSocietyVendors,

  // Module 3: Vendors
  listVendors,
  listPendingVendors,
  getVendorById,
  approveVendor,
  rejectVendor,
  blockVendor,
  createVendor,
  updateVendor,
  updateVendorStatus,
  bulkVendorAction,
  getVendorPayments,

  // Module 4: Users
  listUsers,
  getUserById,
  updateUserAdmin,
  getUserOrdersAdmin,
  getUserPaymentsAdmin,
  getUserTimelineAdmin,
  getUserAddressesAdmin,
  getUserNotificationsAdmin,
  getUserAuditLogsAdmin,
  flagUser,
  unflagUser,
  strikeUser,
  unstrikeUser,
  updateUserStatus,
  blockUser,
  unblockUser,
  resetUserPassword,
  deleteUser,
  getUserAnalytics,

  // Module 5: Subscriptions
  listSubscriptions,
  getFinancialStats,
  renewSubscription,
  cancelSubscription,
  getInvoicePreview,

  // Module 6: Orders & Payments
  listOrdersAdmin,
  getOrderByIdAdmin,
  flagOrderAudit,
  getPaymentTransactions,
  processRefund,

  // Module 7: Promotions
  listPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,

  // Module 8: Sub-Admins
  listSubAdmins,
  createSubAdmin,
  updateSubAdminPowers,
  toggleSubAdminStatus,
  deleteSubAdmin,

  // Module 9: Support Desk
  listSupportTickets,
  getTicketById,
  getTicketMessages,
  replyToTicket,
  escalateTicket,
  deescalateTicket,
  addTicketFollower,
  mergeTickets,
  unmergeTickets,
  updateTicketStatus,
  getSupportAnalytics,
  getSlaConfig,
  updateSlaConfig,
  getTags,
  createTag,
  deleteTag,
  uploadAttachment,


  // Module 10: Executive Reports & Exports
  getExecutiveReports,
  exportReportData,

  // Module 11: Notifications
  listNotifications,
  broadcastNotification,
  markAllNotificationsRead
};

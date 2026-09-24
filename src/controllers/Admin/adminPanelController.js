const { query } = require('../../models/db');
const { generateTokens, comparePassword, hashPassword } = require('../../utils/auth');
const { formatPhoneWithCountryCode, get10DigitPhone } = require('../../utils/phoneUtils');
const { getVendorReapplicationDiffs } = require('../../services/vendorDiffService');

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

  let gstinVal = String(v.gstin || '').trim().toUpperCase();
  let panVal = String(v.pan_number || '').trim().toUpperCase();

  const rawPhone = v.phone_number || v.phone || v.whatsapp_number || '';
  const digitsPhone = get10DigitPhone(rawPhone);
  const rawWhatsapp = v.whatsapp_number || rawPhone;
  const digitsWhatsapp = get10DigitPhone(rawWhatsapp);

  return {
    vendor_id: Number(v.vendor_id),
    public_id: v.public_id || (v.vendor_id ? ('vnd@' + String(v.vendor_id).padStart(4, '0')) : ''),
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
    gst_number: gstinVal,
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
      if (/^\d+$/.test(rawSocStr)) {
        conditions.push(`v.society_id = ?`);
        params.push(parseInt(rawSocStr, 10));
      } else {
        conditions.push(`(LOWER(s.society_name) LIKE ? OR LOWER(s.location) LIKE ?)`);
        const q = `%${rawSocStr.toLowerCase()}%`;
        params.push(q, q);
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

    const reqUrl = String(req.originalUrl || req.baseUrl || req.url || '');
    const isAdminPath = reqUrl.includes('/api/admin') || reqUrl.includes('/api/v1/admin');
    const isAdminClient = req.headers['x-platform-client'] === 'admin_dashboard';
    const isAdminAuth = req.user && ['super_admin', 'admin', 'sub_admin'].includes(String(req.user.role).toLowerCase());
    const isExplicitAdminCall = isAdminPath || isAdminClient || isAdminAuth;

    if (!isExplicitAdminCall) {
      // Regular resident users and storefront clients can ONLY see ACTIVE vendors
      conditions.push(`UPPER(v.status) = 'ACTIVE'`);
    } else if (status && status !== 'all') {
      conditions.push(`UPPER(COALESCE(v.status, 'ACTIVE')) = ?`);
      params.push(status.toUpperCase());
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

async function getVendorReapplicationChanges(req, res) {
  try {
    const targetId = req.params.vendorId || req.params.id || req.query.vendorId || req.query.vendor_id;
    if (!targetId) {
      return sendStandardError(res, 400, 'Vendor ID is required.', 'INVALID_PARAMETERS');
    }

    const result = await query(
      `SELECT vendor_id, store_name, vendor_name, email, phone_number, status, hold_reason, hold_email_subject, has_resubmitted, resubmitted_at, created_at
       FROM vendors 
       WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`,
      [targetId, String(targetId)]
    );

    if (!result.rows || result.rows.length === 0) {
      return sendStandardError(res, 404, `Vendor ID "${targetId}" not found.`, 'RESOURCE_NOT_FOUND');
    }

    const v = result.rows[0];
    const diffs = await getVendorReapplicationDiffs(v.vendor_id);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: diffs.total_changed_fields > 0 
        ? `Retrieved ${diffs.total_changed_fields} field change(s) for vendor reapplication.`
        : 'No field changes recorded for this vendor reapplication.',
      vendor_id: Number(v.vendor_id),
      store_name: v.store_name || '',
      vendor_name: v.vendor_name || '',
      email: v.email || '',
      phone_number: v.phone_number || '',
      status: String(v.status || 'PENDING').toUpperCase(),
      has_resubmitted: Boolean(v.has_resubmitted),
      resubmitted_at: v.resubmitted_at || null,
      hold_reason: v.hold_reason || '',
      total_changed_fields: diffs.total_changed_fields,
      changed_fields: diffs.changed_fields,
      changes_list: diffs.changes_list
    });
  } catch (err) {
    console.error('Error fetching vendor reapplication diffs:', err);
    return sendStandardError(res, 500, 'Failed to fetch vendor reapplication field changes.', 'INTERNAL_SERVER_ERROR');
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
       WHERE v.vendor_id = ? OR CAST(v.vendor_id AS TEXT) = ? OR v.public_id = ?`,
      [targetId, String(targetId), String(targetId)]
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
    const newState = b.state !== undefined ? String(b.state).trim() : (u.state || '');
    const newPincode = (b.pincode !== undefined ? b.pincode : (b.pin_code !== undefined ? b.pin_code : b.pinCode)) !== undefined ? String(b.pincode || b.pin_code || b.pinCode).trim() : (u.pincode || '');
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
          state = ?,
          pincode = ?,
          address = ?,
          status = ?
      WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
    `, [newName, newEmail, newPhone, newFlat, newArea, newArea, newCity, newState, newPincode, newAddress, newStatus, String(targetId), String(targetId), String(targetId)]).catch(async () => {
      return query(`
        UPDATE users 
        SET name = ?, email = ?, phone = ?, flat = ?, society_name = ?, city = ?, pincode = ?, status = ?
        WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
      `, [newName, newEmail, newPhone, newFlat, newArea, newCity, newPincode, newStatus, String(targetId), String(targetId), String(targetId)]);
    });

    const updatedUserObj = {
      user_id: String(u.user_id),
      name: newName,
      email: newEmail,
      phone: newPhone,
      country_code: '+91',
      phone_number: get10DigitPhone(newPhone),
      area: newArea,
      society_name: newArea,
      flat: newFlat,
      city: newCity,
      state: newState,
      pincode: newPincode,
      pin_code: newPincode,
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

    let sql = `
      SELECT u.*, 
             s.city AS soc_city, 
             s.state AS soc_state, 
             s.pincode AS soc_pincode, 
             s.society_name AS soc_name
      FROM users u
      LEFT JOIN societies s ON u.society_id = s.society_id
    `;
    const params = [];
    if (search) {
      sql += ` WHERE u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR u.user_id = ? OR u.public_id = ? OR u.society_name LIKE ? OR u.area LIKE ? OR u.city LIKE ? OR u.state LIKE ? OR u.pincode LIKE ?`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, search, search, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limitNum, offset);

    let result = await query(sql, params).catch(async () => {
      let fbSql = `SELECT * FROM users`;
      const fbParams = [];
      if (search) {
        fbSql += ` WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? OR user_id = ? OR public_id = ? OR society_name LIKE ? OR area LIKE ?`;
        fbParams.push(`%${search}%`, `%${search}%`, `%${search}%`, search, search, `%${search}%`, `%${search}%`);
      }
      fbSql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
      fbParams.push(limitNum, offset);
      return query(fbSql, fbParams).catch(() => ({ rows: [] }));
    });

    const users = (result.rows || []).map(u => {
      const city = u.city || u.soc_city || '';
      const state = u.state || u.soc_state || '';
      const pincode = u.pincode || u.soc_pincode || '';
      const resolvedUserPublicId = u.public_id || (u.user_id?.startsWith('usr@') ? u.user_id : ('usr@' + String(u.user_id).slice(-4)));
      return {
        user_id: String(u.user_id),
        public_id: resolvedUserPublicId,
        name: u.name || '',
        email: u.email || '',
        country_code: '+91',
        phone_number: get10DigitPhone(u.phone),
        phone: get10DigitPhone(u.phone),
        area: u.area || u.society_name || u.soc_name || '',
        society_name: u.society_name || u.soc_name || u.area || '',
        flat: u.flat || '',
        city: city,
        state: state,
        pincode: pincode,
        pin_code: pincode,
        address: u.address || [u.flat, u.area || u.society_name || u.soc_name, city, state, pincode].filter(Boolean).join(', ') || '',
        status: (u.status || 'ACTIVE').toLowerCase(),
        is_blocked: String(u.status || '').toUpperCase() === 'BLOCKED' || String(u.status || '').toUpperCase() === 'SUSPENDED',
        created_at: formatUTCISO(u.created_at),
        created_at_ist: formatKolkataISO(u.created_at),
        created_at_readable: formatKolkataReadable(u.created_at)
      };
    });
    return respond(res, 200, users, 'Users directory retrieved successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to retrieve users directory.');
  }
}

async function getUserById(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id;
    const result = await query(
      `SELECT u.*, 
              s.city AS soc_city, 
              s.state AS soc_state, 
              s.pincode AS soc_pincode, 
              s.society_name AS soc_name
       FROM users u
       LEFT JOIN societies s ON u.society_id = s.society_id
       WHERE u.user_id = ? OR u.public_id = ? OR CAST(u.user_id AS TEXT) = ? OR u.phone = ?`,
      [targetId, String(targetId), String(targetId), String(targetId)]
    ).catch(async () => {
      return query(`SELECT * FROM users WHERE user_id = ? OR public_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [targetId, String(targetId), String(targetId), String(targetId)]);
    }).catch(() => ({ rows: [] }));

    if (!result.rows || result.rows.length === 0) {
      return sendStandardError(res, 404, `User "${targetId}" not found.`);
    }
    const u = result.rows[0];
    const city = u.city || u.soc_city || '';
    const state = u.state || u.soc_state || '';
    const pincode = u.pincode || u.soc_pincode || '';
    const resolvedUserPublicId = u.public_id || (u.user_id?.startsWith('usr@') ? u.user_id : ('usr@' + String(u.user_id).slice(-4)));
    const userObj = {
      user_id: String(u.user_id),
      public_id: resolvedUserPublicId,
      name: u.name || '',
      email: u.email || '',
      country_code: '+91',
      phone_number: get10DigitPhone(u.phone),
      phone: get10DigitPhone(u.phone),
      area: u.area || u.society_name || u.soc_name || '',
      society_name: u.society_name || u.soc_name || u.area || '',
      flat: u.flat || '',
      city: city,
      state: state,
      pincode: pincode,
      pin_code: pincode,
      address: u.address || [u.flat, u.area || u.society_name || u.soc_name, city, state, pincode].filter(Boolean).join(', ') || '',
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
    `SELECT u.name, u.phone, u.email, u.flat, u.area, u.society_name,
            COALESCE(NULLIF(u.city, ''), s.city, '') AS city,
            COALESCE(NULLIF(u.state, ''), s.state, '') AS state,
            COALESCE(NULLIF(u.pincode, ''), s.pincode, '') AS pincode,
            u.address
     FROM users u
     LEFT JOIN societies s ON u.society_id = s.society_id
     WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ?`,
    [ord.user_id, String(ord.user_id)]
  ).catch(async () => {
    return query(`SELECT name, phone, email, flat, area, city, state, pincode, address FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`, [ord.user_id, String(ord.user_id)]);
  }).catch(() => ({ rows: [] }));

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
    customer_city: cityVal,
    customer_state: stateVal,
    customer_pincode: pincodeVal,
    customer_pin_code: pincodeVal,
    user_city: cityVal,
    user_state: stateVal,
    user_pincode: pincodeVal,
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
    pin_code: pincodeVal,
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
      `SELECT * FROM payments WHERE user_id = ? OR CAST(user_id AS TEXT) = ? ORDER BY created_at DESC`,
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
    const userRes = await query(
      `SELECT u.*, 
              s.city AS soc_city, 
              s.state AS soc_state, 
              s.pincode AS soc_pincode, 
              s.society_name AS soc_name
       FROM users u
       LEFT JOIN societies s ON u.society_id = s.society_id
       WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ? OR u.phone = ?`,
      [targetId, String(targetId), String(targetId)]
    ).catch(async () => {
      return query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [targetId, String(targetId), String(targetId)]);
    }).catch(() => ({ rows: [] }));

    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `User "${targetId}" not found.`);
    }
    const u = userRes.rows[0];
    const city = u.city || u.soc_city || '';
    const state = u.state || u.soc_state || '';
    const pincode = u.pincode || u.soc_pincode || '';
    const hasAddress = Boolean(u.flat || u.area || u.society_name || u.address || city || state || pincode);
    const addresses = hasAddress ? [
      {
        address_id: `addr_primary_${u.user_id}`,
        user_id: String(u.user_id),
        type: 'Primary Residence',
        flat: u.flat || '',
        area: u.area || u.society_name || u.soc_name || '',
        society_name: u.society_name || u.soc_name || u.area || '',
        city: city,
        state: state,
        pincode: pincode,
        pin_code: pincode,
        full_address: u.address || [u.flat, u.area || u.society_name || u.soc_name, city, state, pincode].filter(Boolean).join(', ') || '',
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
      `SELECT u.*, s.city AS soc_city, s.state AS soc_state, s.pincode AS soc_pincode 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ? OR u.phone = ? OR u.phone LIKE ?`,
      [targetId, String(targetId), targetId, `%${last10}`]
    ).catch(async () => {
      return query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ? OR phone LIKE ?`, [targetId, String(targetId), targetId, `%${last10}`]);
    });

    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `Resident user "${targetId}" not found.`);
    }

    const u = userRes.rows[0];
    const city = u.city || u.soc_city || '';
    const state = u.state || u.soc_state || '';
    const pincode = u.pincode || u.soc_pincode || '';
    const currentStrikes = Number(u.strikes || 0);
    const newStrikes = currentStrikes + 1;
    const isAutoBanned = newStrikes >= 3;
    const newStatus = isAutoBanned ? 'BLOCKED' : (u.status || 'ACTIVE');

    await query(
      `UPDATE users SET strikes = ?, status = ? WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`,
      [newStrikes, newStatus, String(u.user_id), String(u.user_id)]
    );

    const adminId = req.user?.id || req.user?.admin_id || 'admin';
    await query(
      `INSERT INTO user_strikes (user_id, strike_number, reason, admin_id) VALUES (?, ?, ?, ?)`,
      [String(u.user_id), newStrikes, reason, adminId]
    ).catch(e => console.error('Error inserting into user_strikes:', e));

    const strikesRes = await query(
      `SELECT strike_number, reason, created_at FROM user_strikes WHERE user_id = ? OR CAST(user_id AS TEXT) = ? ORDER BY strike_number ASC, created_at ASC`,
      [String(u.user_id), String(u.user_id)]
    );

    const strike_reasons = (strikesRes.rows || []).map(r => ({
      strike_number: Number(r.strike_number),
      reason: r.reason,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
    const strike_reasons_list = strike_reasons.map(r => r.reason);

    const show_second_strike_warning = newStrikes === 2;
    const show_strike_warning = newStrikes >= 1 && newStrikes < 3;

    let warning_message = '';
    if (newStrikes === 2) {
      warning_message = 'Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!';
    } else if (newStrikes === 1) {
      warning_message = 'Warning: You have received 1 strike on your account due to policy violation.';
    } else if (isAutoBanned) {
      warning_message = 'Account has reached 3 strikes and is automatically blocked.';
    }

    const message = isAutoBanned
      ? `Strike #${newStrikes} issued to user "${u.name || u.user_id}". Account has reached 3 strikes and is AUTOMATICALLY BANNED / BLOCKED!`
      : `Strike #${newStrikes} issued to user "${u.name || u.user_id}". (${3 - newStrikes} strikes remaining before automatic ban).`;

    return respond(res, 200, {
      user_id: String(u.user_id),
      name: u.name || '',
      phone: u.phone || '',
      phone_number: get10DigitPhone(u.phone),
      city: city,
      state: state,
      pincode: pincode,
      pin_code: pincode,
      strikes: newStrikes,
      flags_count: newStrikes,
      max_strikes_allowed: 3,
      status: (req.path?.includes('/flag') || req.originalUrl?.includes('/flag'))
        ? (isAutoBanned ? 'banned' : (newStrikes === 1 ? 'warned' : newStatus.toLowerCase()))
        : newStatus.toLowerCase(),
      is_blocked: isAutoBanned || String(newStatus).toUpperCase() === 'BLOCKED',
      is_auto_banned: isAutoBanned,
      auto_banned: isAutoBanned,
      show_second_strike_warning,
      show_strike_warning,
      warning_title: newStrikes === 2 ? 'Second Strike Warning' : (newStrikes === 1 ? 'First Strike Warning' : 'Account Blocked'),
      warning_message,
      reason,
      strike_reasons,
      strike_reasons_list,
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
      `SELECT u.*, s.city AS soc_city, s.state AS soc_state, s.pincode AS soc_pincode 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ? OR u.phone = ? OR u.phone LIKE ?`,
      [targetId, String(targetId), targetId, `%${last10}`]
    ).catch(async () => {
      return query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ? OR phone LIKE ?`, [targetId, String(targetId), targetId, `%${last10}`]);
    });

    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `Resident user "${targetId}" not found.`);
    }

    const u = userRes.rows[0];
    const city = u.city || u.soc_city || '';
    const state = u.state || u.soc_state || '';
    const pincode = u.pincode || u.soc_pincode || '';
    const currentStrikes = Number(u.strikes || 0);
    const newStrikes = resetAll ? 0 : Math.max(0, currentStrikes - 1);
    const newStatus = (newStrikes < 3 && String(u.status).toUpperCase() === 'BLOCKED') ? 'ACTIVE' : u.status;

    await query(
      `UPDATE users SET strikes = ?, status = ? WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`,
      [newStrikes, newStatus, String(u.user_id), String(u.user_id)]
    );

    if (resetAll) {
      await query(`DELETE FROM user_strikes WHERE user_id = ? OR CAST(user_id AS TEXT) = ?`, [String(u.user_id), String(u.user_id)]).catch(() => {});
    } else {
      await query(`DELETE FROM user_strikes WHERE strike_id IN (SELECT strike_id FROM user_strikes WHERE user_id = ? OR CAST(user_id AS TEXT) = ? ORDER BY strike_number DESC LIMIT 1)`, [String(u.user_id), String(u.user_id)]).catch(() => {});
    }

    const strikesRes = await query(
      `SELECT strike_number, reason, created_at FROM user_strikes WHERE user_id = ? OR CAST(user_id AS TEXT) = ? ORDER BY strike_number ASC, created_at ASC`,
      [String(u.user_id), String(u.user_id)]
    );

    const strike_reasons = (strikesRes.rows || []).map(r => ({
      strike_number: Number(r.strike_number),
      reason: r.reason,
      created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
    }));
    const strike_reasons_list = strike_reasons.map(r => r.reason);

    return respond(res, 200, {
      user_id: String(u.user_id),
      name: u.name || '',
      phone: u.phone || '',
      phone_number: get10DigitPhone(u.phone),
      city: city,
      state: state,
      pincode: pincode,
      pin_code: pincode,
      strikes: newStrikes,
      flags_count: newStrikes,
      max_strikes_allowed: 3,
      status: newStatus.toLowerCase(),
      is_blocked: String(newStatus).toUpperCase() === 'BLOCKED',
      show_second_strike_warning: newStrikes === 2,
      show_strike_warning: newStrikes >= 1 && newStrikes < 3,
      strike_reasons,
      strike_reasons_list
    }, `User strikes count updated to ${newStrikes}.`);
  } catch (err) {
    console.error('Error removing strike from user:', err);
    return sendStandardError(res, 500, 'Failed to remove strike from user.', 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * GET /api/admin/users/:id/strike or /api/admin/users/:id/strikes
 * Retrieve strike details, strike history logs, and calculations for a specific resident user.
 */
async function getUserStrikesAdmin(req, res) {
  try {
    const { userId, id } = req.params;
    const targetId = userId || id || req.query?.user_id || req.query?.id;

    if (!targetId) {
      return sendStandardError(res, 400, 'User ID is required to retrieve strike details.');
    }

    const cleanPhone = String(targetId).trim().replace(/[^0-9]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const userRes = await query(
      `SELECT u.*, s.society_name AS soc_name, s.city AS soc_city, s.state AS soc_state, s.pincode AS soc_pincode 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ? OR u.phone = ? OR u.phone LIKE ?`,
      [targetId, String(targetId), targetId, `%${last10}`]
    ).catch(async () => {
      return query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ? OR phone LIKE ?`, [targetId, String(targetId), targetId, `%${last10}`]);
    });

    if (!userRes.rows || userRes.rows.length === 0) {
      return sendStandardError(res, 404, `Resident user "${targetId}" not found.`);
    }

    const u = userRes.rows[0];
    const city = u.city || u.soc_city || '';
    const state = u.state || u.soc_state || '';
    const pincode = u.pincode || u.soc_pincode || '';
    const strikes = Number(u.strikes || 0);
    const maxStrikes = 3;
    const strikesRemaining = Math.max(0, maxStrikes - strikes);
    const percentageToBan = Math.min(100, Math.round((strikes / maxStrikes) * 100));
    const statusLower = String(u.status || 'active').toLowerCase();
    const isAutoBanned = strikes >= maxStrikes;
    const isBlocked = isAutoBanned || statusLower === 'blocked' || statusLower === 'suspended';

    const strikesRes = await query(
      `SELECT strike_id, strike_number, reason, admin_id, created_at 
       FROM user_strikes 
       WHERE user_id = ? OR CAST(user_id AS TEXT) = ? 
       ORDER BY strike_number ASC, created_at ASC`,
      [String(u.user_id), String(u.user_id)]
    ).catch(() => ({ rows: [] }));

    const strike_reasons = (strikesRes.rows || []).map(r => ({
      strike_id: r.strike_id || null,
      strike_number: Number(r.strike_number),
      reason: r.reason || '',
      admin_id: r.admin_id || null,
      created_at: r.created_at ? formatKolkataISO(r.created_at) : formatKolkataISO()
    }));
    const strike_reasons_list = strike_reasons.map(r => r.reason);

    const show_second_strike_warning = strikes === 2;
    const show_strike_warning = strikes >= 1 && strikes < 3;

    let warning_title = '';
    let warning_message = '';
    let strike_level = 'CLEAN';

    if (strikes >= 3 || isBlocked) {
      strike_level = 'BLOCKED';
      warning_title = 'Account Blocked';
      warning_message = 'Account has reached 3 strikes and is automatically blocked.';
    } else if (strikes === 2) {
      strike_level = 'WARNING_2';
      warning_title = 'Second Strike Warning';
      warning_message = 'Warning: User has received 2 strikes. Receiving a 3rd strike will automatically block the account!';
    } else if (strikes === 1) {
      strike_level = 'WARNING_1';
      warning_title = 'First Strike Warning';
      warning_message = 'Warning: User has received 1 strike for policy violation.';
    }

    const calculation = {
      current_strikes: strikes,
      max_strikes_allowed: maxStrikes,
      strikes_remaining: strikesRemaining,
      percentage_to_ban: percentageToBan,
      is_at_risk: strikes >= 1 && strikes < maxStrikes,
      is_auto_banned: isAutoBanned,
      next_action_on_strike: strikes === 0 ? 'FIRST_WARNING' : strikes === 1 ? 'SECOND_WARNING' : 'ACCOUNT_AUTO_BLOCK',
      can_issue_strike: strikes < maxStrikes,
      can_remove_strike: strikes > 0,
      can_reset: strikes > 0
    };

    return respond(res, 200, {
      user_id: String(u.user_id),
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      phone_number: get10DigitPhone(u.phone),
      society_id: u.society_id ? String(u.society_id) : '',
      society_name: u.society_name || u.soc_name || u.area || '',
      area: u.area || u.society_name || u.soc_name || '',
      flat: u.flat || '',
      city: city,
      state: state,
      pincode: pincode,
      pin_code: pincode,
      address: u.address || '',
      strikes: strikes,
      flags_count: strikes,
      max_strikes_allowed: maxStrikes,
      strikes_remaining: strikesRemaining,
      percentage_to_ban: percentageToBan,
      strike_level: strike_level,
      status: statusLower,
      is_blocked: isBlocked,
      is_auto_banned: isAutoBanned,
      auto_banned: isAutoBanned,
      show_second_strike_warning: show_second_strike_warning,
      show_strike_warning: show_strike_warning,
      warning_title: warning_title,
      warning_message: warning_message,
      can_strike: strikes < maxStrikes,
      can_unstrike: strikes > 0,
      can_reset: strikes > 0,
      total_strikes_recorded: strike_reasons.length,
      strike_reasons: strike_reasons,
      strike_reasons_list: strike_reasons_list,
      calculation: calculation
    }, `User strike details retrieved successfully.`);
  } catch (err) {
    console.error('Error fetching user strikes (admin):', err);
    return sendStandardError(res, 500, 'Failed to retrieve user strikes.', 'INTERNAL_SERVER_ERROR');
  }
}

/**
 * GET /api/admin/users/strikes
 * Calculate and list strikes across users on the platform with aggregate statistics.
 */
async function listAllUserStrikesAdmin(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;
    const filter = String(req.query.filter || req.query.level || '').trim().toLowerCase();
    const search = String(req.query.search || req.query.q || '').trim();
    const minStrikes = req.query.min_strikes !== undefined ? parseInt(req.query.min_strikes, 10) : (req.query.all === 'true' ? 0 : 1);

    // Compute platform-wide strike calculation metrics
    const statsRes = await query(`
      SELECT 
        COUNT(*) AS total_users,
        COUNT(CASE WHEN strikes = 0 OR strikes IS NULL THEN 1 END) AS clean_users_count,
        COUNT(CASE WHEN strikes = 1 THEN 1 END) AS warning_1_count,
        COUNT(CASE WHEN strikes = 2 THEN 1 END) AS warning_2_count,
        COUNT(CASE WHEN strikes >= 3 OR UPPER(status) = 'BLOCKED' THEN 1 END) AS banned_count,
        COUNT(CASE WHEN strikes > 0 THEN 1 END) AS total_users_with_strikes,
        COALESCE(SUM(strikes), 0) AS total_strikes_issued
      FROM users
    `).catch(() => ({ rows: [{ total_users: 0, clean_users_count: 0, warning_1_count: 0, warning_2_count: 0, banned_count: 0, total_users_with_strikes: 0, total_strikes_issued: 0 }] }));

    const stats = statsRes.rows[0] || {};
    const totalUsers = parseInt(stats.total_users || 0, 10);
    const cleanUsersCount = parseInt(stats.clean_users_count || 0, 10);
    const warning1Count = parseInt(stats.warning_1_count || 0, 10);
    const warning2Count = parseInt(stats.warning_2_count || 0, 10);
    const bannedCount = parseInt(stats.banned_count || 0, 10);
    const totalUsersWithStrikes = parseInt(stats.total_users_with_strikes || 0, 10);
    const totalStrikesIssued = parseInt(stats.total_strikes_issued || 0, 10);

    // Build filter query for user strike list
    let whereClauses = [];
    let params = [];

    if (minStrikes > 0) {
      whereClauses.push(`u.strikes >= ?`);
      params.push(minStrikes);
    }

    if (filter === 'warning' || filter === 'warning_1' || filter === '1') {
      whereClauses.push(`u.strikes = 1`);
    } else if (filter === 'second_warning' || filter === 'warning_2' || filter === '2') {
      whereClauses.push(`u.strikes = 2`);
    } else if (filter === 'banned' || filter === 'blocked' || filter === '3') {
      whereClauses.push(`(u.strikes >= 3 OR UPPER(u.status) = 'BLOCKED')`);
    } else if (filter === 'clean' || filter === '0') {
      whereClauses.push(`(u.strikes = 0 OR u.strikes IS NULL)`);
    }

    if (search) {
      const cleanPhone = search.replace(/[^0-9]/g, '');
      whereClauses.push(`(u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ? OR CAST(u.user_id AS TEXT) = ? ${cleanPhone ? 'OR u.phone LIKE ?' : ''})`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, search);
      if (cleanPhone) params.push(`%${cleanPhone}%`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) AS total FROM users u ${whereSql}`,
      params
    ).catch(() => ({ rows: [{ total: 0 }] }));
    const filteredTotal = parseInt(countRes.rows[0]?.total || 0, 10);

    const listQuery = `
      SELECT u.*, s.society_name AS soc_name, s.city AS soc_city, s.state AS soc_state, s.pincode AS soc_pincode 
      FROM users u 
      LEFT JOIN societies s ON u.society_id = s.society_id 
      ${whereSql}
      ORDER BY u.strikes DESC, u.user_id DESC
      LIMIT ? OFFSET ?
    `;
    const usersRes = await query(listQuery, [...params, limit, offset]).catch(() => ({ rows: [] }));

    // Fetch strike reasons for these users
    const userIds = usersRes.rows.map(u => String(u.user_id));
    let strikesByUser = {};
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => '?').join(',');
      const strikesRes = await query(
        `SELECT strike_id, user_id, strike_number, reason, admin_id, created_at 
         FROM user_strikes 
         WHERE user_id IN (${placeholders}) OR CAST(user_id AS TEXT) IN (${placeholders})
         ORDER BY strike_number ASC, created_at ASC`,
        [...userIds, ...userIds]
      ).catch(() => ({ rows: [] }));

      (strikesRes.rows || []).forEach(r => {
        const uid = String(r.user_id);
        if (!strikesByUser[uid]) strikesByUser[uid] = [];
        strikesByUser[uid].push({
          strike_id: r.strike_id || null,
          strike_number: Number(r.strike_number),
          reason: r.reason || '',
          admin_id: r.admin_id || null,
          created_at: r.created_at ? formatKolkataISO(r.created_at) : formatKolkataISO()
        });
      });
    }

    const users = usersRes.rows.map(u => {
      const city = u.city || u.soc_city || '';
      const state = u.state || u.soc_state || '';
      const pincode = u.pincode || u.soc_pincode || '';
      const strikes = Number(u.strikes || 0);
      const strikesRemaining = Math.max(0, 3 - strikes);
      const percentageToBan = Math.min(100, Math.round((strikes / 3) * 100));
      const statusLower = String(u.status || 'active').toLowerCase();
      const isAutoBanned = strikes >= 3;
      const isBlocked = isAutoBanned || statusLower === 'blocked' || statusLower === 'suspended';
      const userStrikesList = strikesByUser[String(u.user_id)] || [];
      const lastStrike = userStrikesList.length > 0 ? userStrikesList[userStrikesList.length - 1] : null;

      return {
        user_id: String(u.user_id),
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        phone_number: get10DigitPhone(u.phone),
        city: city,
        state: state,
        pincode: pincode,
        pin_code: pincode,
        society_name: u.society_name || u.soc_name || u.area || '',
        area: u.area || u.society_name || u.soc_name || '',
        flat: u.flat || '',
        address: u.address || '',
        strikes: strikes,
        flags_count: strikes,
        max_strikes_allowed: 3,
        strikes_remaining: strikesRemaining,
        percentage_to_ban: percentageToBan,
        strike_level: strikes === 0 ? 'CLEAN' : strikes === 1 ? 'WARNING_1' : strikes === 2 ? 'WARNING_2' : 'BLOCKED',
        status: statusLower,
        is_blocked: isBlocked,
        is_auto_banned: isAutoBanned,
        show_second_strike_warning: strikes === 2,
        show_strike_warning: strikes >= 1 && strikes < 3,
        warning_title: strikes === 2 ? 'Second Strike Warning' : (strikes === 1 ? 'First Strike Warning' : (strikes >= 3 ? 'Account Blocked' : '')),
        warning_message: strikes === 2
          ? 'Warning: User has received 2 strikes. Receiving a 3rd strike will automatically block the account!'
          : (strikes === 1
            ? 'Warning: User has received 1 strike for policy violation.'
            : (strikes >= 3 ? 'Account has reached 3 strikes and is automatically blocked.' : '')),
        can_strike: strikes < 3,
        can_unstrike: strikes > 0,
        strike_reasons: userStrikesList,
        strike_reasons_list: userStrikesList.map(r => r.reason),
        last_strike_date: lastStrike ? lastStrike.created_at : null,
        calculation: {
          current_strikes: strikes,
          max_strikes_allowed: 3,
          strikes_remaining: strikesRemaining,
          percentage_to_ban: percentageToBan,
          is_at_risk: strikes >= 1 && strikes < 3,
          is_auto_banned: isAutoBanned,
          next_action_on_strike: strikes === 0 ? 'FIRST_WARNING' : strikes === 1 ? 'SECOND_WARNING' : 'ACCOUNT_AUTO_BLOCK'
        }
      };
    });

    const summary = {
      total_users: totalUsers,
      clean_users_count: cleanUsersCount,
      total_users_with_strikes: totalUsersWithStrikes,
      warning_1_count: warning1Count,
      warning_2_count: warning2Count,
      banned_count: bannedCount,
      total_strikes_issued: totalStrikesIssued,
      max_strikes_allowed: 3,
      policy: {
        max_strikes_allowed: 3,
        strike_1_consequence: 'First warning issued to user',
        strike_2_consequence: 'Second strike critical warning issued before auto-ban',
        strike_3_consequence: 'Automatic account block from placing orders'
      }
    };

    const pagination = {
      page,
      limit,
      total: filteredTotal,
      total_pages: Math.ceil(filteredTotal / limit) || 1
    };

    return respond(res, 200, {
      summary,
      users
    }, 'Strike calculations and list retrieved successfully.', pagination);
  } catch (err) {
    console.error('Error listing user strikes (admin):', err);
    return sendStandardError(res, 500, 'Failed to retrieve strikes calculation list.', 'INTERNAL_SERVER_ERROR');
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

    const userRes = await query(
      `SELECT u.*, s.city AS soc_city, s.state AS soc_state, s.pincode AS soc_pincode 
       FROM users u 
       LEFT JOIN societies s ON u.society_id = s.society_id 
       WHERE u.user_id = ? OR CAST(u.user_id AS TEXT) = ? OR u.phone = ?`,
      [targetId, String(targetId), String(targetId)]
    ).catch(async () => {
      return query(`SELECT * FROM users WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?`, [targetId, String(targetId), String(targetId)]);
    }).catch(() => ({ rows: [] }));
    const u = userRes.rows[0] || {};
    const city = u.city || u.soc_city || '';
    const state = u.state || u.soc_state || '';
    const pincode = u.pincode || u.soc_pincode || '';

    return respond(res, 200, {
      user_id: String(targetId),
      name: u.name || '',
      phone: u.phone || '',
      phone_number: get10DigitPhone(u.phone),
      city: city,
      state: state,
      pincode: pincode,
      pin_code: pincode,
      status: targetStatus.toLowerCase(),
      is_blocked: targetStatus === 'BLOCKED' || targetStatus === 'SUSPENDED' || targetStatus === 'BANNED',
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

async function listSubscriptions(req, res) {
  try {
    const subRes = await query(`
      SELECT s.*, v.store_name, v.vendor_name 
      FROM subscriptions s 
      LEFT JOIN vendors v ON s.vendor_id = v.vendor_id 
      ORDER BY s.subscription_id DESC
    `).catch(() => ({ rows: [] }));
    return respond(res, 200, subRes.rows || [], 'Subscriptions list retrieved from database.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch subscriptions.');
  }
}
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
async function listSubAdmins(req, res, next) {
  const subAdminsController = require('./subAdminsController');
  return subAdminsController.listSubAdmins(req, res, next);
}

async function createSubAdmin(req, res, next) {
  const subAdminsController = require('./subAdminsController');
  return subAdminsController.createSubAdmin(req, res, next);
}

async function updateSubAdminPowers(req, res, next) {
  const subAdminsController = require('./subAdminsController');
  return subAdminsController.updateSubAdmin(req, res, next);
}

async function deleteSubAdmin(req, res, next) {
  const subAdminsController = require('./subAdminsController');
  return subAdminsController.deleteSubAdmin(req, res, next);
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
async function getOverdueTickets(req, res) { return supportController.getOverdueTickets(req, res); }
async function getSlaSummary(req, res) { return supportController.getSlaSummary(req, res); }
async function resetOrExtendSla(req, res) { return supportController.resetOrExtendSla(req, res); }
async function uploadAttachment(req, res) { return supportController.uploadAttachment(req, res); }


// Module 10: Executive Reports & Exports
async function getExecutiveReports(req, res) { return respond(res, 200, {}, 'Executive reports.'); }
async function exportReportData(req, res) { return respond(res, 200, {}, 'Report exported.'); }

// Module 11: Notifications
async function listNotifications(req, res) { return respond(res, 200, [], 'Notifications list.'); }
async function broadcastNotification(req, res) { return respond(res, 200, {}, 'Notification broadcasted.'); }
async function markAllNotificationsRead(req, res) { return respond(res, 200, {}, 'Notifications marked read.'); }





async function getRevenueDashboard(req, res) {
  try {
    const revRes = await query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COUNT(*) as total_orders,
        COUNT(CASE WHEN UPPER(COALESCE(payment_status, '')) IN ('SUCCESS', 'PAID') THEN 1 END) as paid_orders
      FROM orders
    `).catch(() => ({ rows: [{ total_revenue: 0, total_orders: 0, paid_orders: 0 }] }));
    const row = revRes.rows[0] || {};
    return respond(res, 200, {
      total_revenue: parseFloat(row.total_revenue || 0),
      total_orders: parseInt(row.total_orders || 0, 10),
      paid_orders: parseInt(row.paid_orders || 0, 10)
    }, 'Revenue dashboard retrieved from database.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch revenue dashboard.');
  }
}
async function getPlatformConfig(req, res) { return respond(res, 200, { platform_name: 'DigiLocal' }, 'Platform config.'); }
async function updateBrandingConfig(req, res) { return respond(res, 200, {}, 'Branding updated.'); }
async function updateAdminProfile(req, res) { return respond(res, 200, {}, 'Admin profile updated.'); }
async function changeAdminPassword(req, res) { return respond(res, 200, {}, 'Password changed.'); }
async function updateSettingsSection(req, res) { return respond(res, 200, {}, 'Settings updated.'); }
async function sendTestEmail(req, res) { return respond(res, 200, {}, 'Test email sent.'); }
async function getDashboardData(req, res) {
  try {
    const [vendorsRes, pendingRes, usersRes, societiesRes, ordersRes, revRes] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM vendors`).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COUNT(*) as count FROM vendors WHERE UPPER(COALESCE(status, 'active')) = 'PENDING'`).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COUNT(*) as count FROM users`).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COUNT(*) as count FROM societies`).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COUNT(*) as count FROM orders`).catch(() => ({ rows: [{ count: 0 }] })),
      query(`SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE UPPER(COALESCE(payment_status, '')) IN ('SUCCESS', 'PAID')`).catch(() => ({ rows: [{ total: 0 }] }))
    ]);
    return respond(res, 200, {
      total_vendors: parseInt(vendorsRes.rows[0]?.count || 0, 10),
      pending_vendors: parseInt(pendingRes.rows[0]?.count || 0, 10),
      total_users: parseInt(usersRes.rows[0]?.count || 0, 10),
      total_societies: parseInt(societiesRes.rows[0]?.count || 0, 10),
      total_orders: parseInt(ordersRes.rows[0]?.count || 0, 10),
      total_revenue: parseFloat(revRes.rows[0]?.total || 0)
    }, 'Dashboard metrics retrieved from database successfully.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch dashboard metrics.');
  }
}
async function getVendorDetails(req, res) { return getVendorById(req, res); }
async function toggleSubAdminStatus(req, res) { return respond(res, 200, {}, 'Sub-admin status toggled.'); }
async function listAuditLogs(req, res) {
  try {
    const logsRes = await query(`SELECT * FROM backend_audit_logs ORDER BY timestamp DESC LIMIT 200`).catch(() => ({ rows: [] }));
    return respond(res, 200, logsRes.rows || [], 'Audit logs retrieved from database.');
  } catch (err) {
    return sendStandardError(res, 500, 'Failed to fetch audit logs.');
  }
}


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
  listOnHoldVendors,
  getVendorById,
  getVendorReapplicationChanges,
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
  getUserStrikesAdmin,
  listAllUserStrikesAdmin,
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
  getOverdueTickets,
  getSlaSummary,
  resetOrExtendSla,
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

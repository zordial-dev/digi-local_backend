const { query } = require('../models/db');
const memoryCache = require('../utils/cache');
const { generateTokens } = require('../utils/auth');
const { sendEmail } = require('../services/emailService');

/**
 * POST /api/admin/login - Admin Login with ADMIN_SECRET
 */
function loginAdmin(req, res) {
    const { admin_secret, secret, password, email } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Username and Password is required" });
    }

    const configuredSecret = process.env.ADMIN_SECRET || 'admin123';
    const inputSecret = admin_secret || secret || password;

    if (inputSecret === configuredSecret) {
        const adminUser = { id: 1, email: email || 'admin@digilocal.com', role: 'admin' };
        const tokens = generateTokens(adminUser);
        return res.status(200).json({
            message: 'Admin authentication successful',
            role: 'admin',
            token: tokens.accessToken,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: tokens.expiresIn
        });
    }
    res.status(401).json({ error: 'Invalid admin credentials' });
}

/**
 * GET /api/admin/vendors - All vendors with payment/subscription info
 */
async function getAllVendors(req, res) {
    try {
        const { search, page = 1, limit = 50, society_id, societyId } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
        const offset = (pageNum - 1) * limitNum;

        let sql = `
            SELECT v.vendor_id, v.society_id, v.vendor_name, v.gst_number, v.phone_number, v.email, 
                   v.store_name, v.logo, v.description, v.status, v.created_at as vendor_created_at,
                   s.society_name, s.location,
                   sub.subscription_id, sub.start_date, sub.end_date, sub.status as subscription_status
            FROM vendors v
            JOIN societies s ON v.society_id = s.society_id
            LEFT JOIN subscriptions sub ON sub.subscription_id = (
                SELECT subscription_id FROM subscriptions 
                WHERE vendor_id = v.vendor_id 
                ORDER BY subscription_id DESC 
                LIMIT 1
            )
        `;
        const conditions = [];
        const params = [];

        const targetSociety = society_id || societyId;
        if (targetSociety) {
            conditions.push(`v.society_id = ?`);
            params.push(targetSociety);
        }

        if (search) {
            conditions.push(`(LOWER(v.vendor_name) LIKE ? OR LOWER(s.society_name) LIKE ? OR LOWER(v.store_name) LIKE ?)`);
            const q = `%${search.toLowerCase()}%`;
            params.push(q, q, q);
        }

        if (conditions.length > 0) {
            sql += ` WHERE ` + conditions.join(' AND ');
        }

        sql += ` ORDER BY v.vendor_id DESC LIMIT ${limitNum} OFFSET ${offset}`;

        const result = await query(sql, params);
        const vendors = result.rows;

        if (vendors.length > 0) {
            const vendorIds = vendors.map(v => v.vendor_id);
            const placeholders = vendorIds.map(() => '?').join(',');
            const payRes = await query(`SELECT * FROM payments WHERE vendor_id IN (${placeholders}) ORDER BY payment_id DESC`, vendorIds);

            const paymentMap = new Map();
            payRes.rows.forEach(p => {
                if (!paymentMap.has(p.vendor_id)) paymentMap.set(p.vendor_id, []);
                paymentMap.get(p.vendor_id).push(p);
            });

            for (let vendor of vendors) {
                vendor.payments = paymentMap.get(vendor.vendor_id) || [];
                vendor.package_placement = 'Standard Annual Vendor Subscription (1 Year)';
            }
        }

        res.status(200).json(vendors);
    } catch (err) {
        console.error('Error fetching admin vendors:', err);
        res.status(500).json({ error: 'Failed to fetch vendors for admin' });
    }
}

/**
 * GET /api/admin/requests - Pending vendor requests
 */
async function getVendorRequests(req, res) {
    try {
        const result = await query(`
            SELECT v.*, s.society_name, s.location, p.payment_method, p.transaction_id, p.amount as paid_amount
            FROM vendors v
            JOIN societies s ON v.society_id = s.society_id
            LEFT JOIN payments p ON v.vendor_id = p.vendor_id
            WHERE v.status = 'PENDING'
            ORDER BY v.vendor_id DESC
        `);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching vendor requests:', err);
        res.status(500).json({ error: 'Failed to fetch vendor requests' });
    }
}

/**
 * POST /api/admin/requests/:vendorId/approve - Approve vendor request
 */
async function approveVendorRequest(req, res) {
    try {
        const { vendorId } = req.params;

        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        const startDateStr = today.toISOString().split('T')[0];
        const endDateStr = nextYear.toISOString().split('T')[0];

        await query(`UPDATE vendors SET status = 'ACTIVE' WHERE vendor_id = ?`, [vendorId]);

        const subCheck = await query(`SELECT subscription_id FROM subscriptions WHERE vendor_id = ?`, [vendorId]);
        if (subCheck.rows.length > 0) {
            await query(
                `UPDATE subscriptions SET status = 'ACTIVE', start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP WHERE vendor_id = ?`,
                [startDateStr, endDateStr, vendorId]
            );
        } else {
            await query(
                `INSERT INTO subscriptions (vendor_id, start_date, end_date, status) VALUES (?, ?, ?, 'ACTIVE')`,
                [vendorId, startDateStr, endDateStr]
            );
        }

        memoryCache.clear();

        res.status(200).json({
            message: 'Vendor request approved successfully! Vendor is now active with 1-Year Subscription.',
            vendor_id: vendorId,
            start_date: startDateStr,
            end_date: endDateStr
        });
    } catch (err) {
        console.error('Error approving vendor request:', err);
        res.status(500).json({ error: 'Failed to approve vendor request' });
    }
}

/**
 * POST /api/admin/requests/:vendorId/reject - Reject vendor request
 */
async function rejectVendorRequest(req, res) {
    try {
        const { vendorId } = req.params;
        await query(`UPDATE vendors SET status = 'REJECTED' WHERE vendor_id = ?`, [vendorId]);
        await query(`UPDATE subscriptions SET status = 'CANCELLED' WHERE vendor_id = ?`, [vendorId]);
        memoryCache.clear();
        res.status(200).json({ message: 'Vendor request rejected', vendor_id: vendorId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject vendor request' });
    }
}

/**
 * GET /api/admin/config - Get platform config
 */
async function getConfig(req, res) {
    try {
        const cacheKey = 'admin_config';
        const cachedConfig = memoryCache.get(cacheKey);
        if (cachedConfig) {
            return res.status(200).json(cachedConfig);
        }

        const result = await query(`SELECT config_key, config_value FROM platform_config`);
        const config = { platform_logo: 'https://imgh.in/host/ucila6', platform_name: 'DigiLocal' };
        (result.rows || []).forEach(row => { config[row.config_key] = row.config_value; });

        memoryCache.set(cacheKey, config, 120000);
        res.status(200).json(config);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch platform config' });
    }
}

/**
 * PUT & POST /api/admin/config - Update platform config
 */
async function updateConfig(req, res) {
    try {
        const { platform_logo, platform_name } = req.body;
        if (platform_logo) {
            const check = await query(`SELECT * FROM platform_config WHERE config_key = 'platform_logo'`);
            if (check.rows.length === 0)
                await query(`INSERT INTO platform_config (config_key, config_value) VALUES ('platform_logo', ?)`, [platform_logo]);
            else
                await query(`UPDATE platform_config SET config_value = ? WHERE config_key = 'platform_logo'`, [platform_logo]);
        }
        if (platform_name) {
            const check = await query(`SELECT * FROM platform_config WHERE config_key = 'platform_name'`);
            if (check.rows.length === 0)
                await query(`INSERT INTO platform_config (config_key, config_value) VALUES ('platform_name', ?)`, [platform_name]);
            else
                await query(`UPDATE platform_config SET config_value = ? WHERE config_key = 'platform_name'`, [platform_name]);
        }
        memoryCache.del('admin_config');
        res.status(200).json({ message: 'Platform configuration updated successfully', platform_logo, platform_name });
    } catch (err) {
        console.error('Error updating config:', err);
        res.status(500).json({ error: 'Failed to update platform configuration' });
    }
}

/**
 * POST /api/admin/vendors/:vendorId/status - Block/Suspend or Unblock Vendor
 */
async function updateVendorStatus(req, res) {
    try {
        const { vendorId } = req.params;
        const { status, custom_message } = req.body;

        if (!status || (status.toLowerCase() !== 'suspended' && status.toLowerCase() !== 'active')) {
            return res.status(400).json({ success: false, error_code: 'INVALID_STATUS', message: 'Status must be suspended or active.' });
        }

        const uppercaseStatus = status.toUpperCase();

        const vendorRes = await query(`SELECT * FROM vendors WHERE vendor_id = ?`, [vendorId]);
        if (vendorRes.rows.length === 0) {
            return res.status(404).json({ success: false, error_code: 'VENDOR_NOT_FOUND', message: 'No vendor account exists with the provided vendor_id.' });
        }

        const vendor = vendorRes.rows[0];

        await query(`UPDATE vendors SET status = ? WHERE vendor_id = ?`, [uppercaseStatus, vendorId]);
        memoryCache.clear();

        if (custom_message && vendor.email) {
            const subject = uppercaseStatus === 'SUSPENDED' ? 'Vendor Account Suspended' : 'Vendor Account Reactivated';
            const html = `
                <h3>Hello ${vendor.vendor_name || 'Vendor'},</h3>
                <p>Your store <strong>${vendor.store_name || 'DigiLocal Store'}</strong> has been <strong>${uppercaseStatus}</strong>.</p>
                <p><strong>Admin Message:</strong><br/>${custom_message}</p>
                <p>Please contact DigiLocal Admin support for more information.</p>
            `;
            sendEmail({ to: vendor.email, subject, html }).catch(err => console.error('Failed to send suspension email:', err));
        }

        res.status(200).json({
            message: `Vendor status updated to ${uppercaseStatus}`,
            vendor_id: Number(vendorId),
            status: status.toLowerCase()
        });
    } catch (err) {
        console.error('Error updating vendor status:', err);
        res.status(500).json({ success: false, message: 'Failed to update vendor status' });
    }
}

module.exports = {
    loginAdmin,
    getAllVendors,
    getVendorRequests,
    approveVendorRequest,
    rejectVendorRequest,
    getConfig,
    updateConfig,
    updateVendorStatus
};

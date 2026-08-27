const { query } = require('../../models/db');

/**
 * POST /api/enquiries
 * Resident service enquiry submission endpoint.
 */
async function createEnquiry(req, res) {
    try {
        const body = req.body || {};
        const vendor_id = body.vendor_id || body.vendorId;
        const user_name = String(body.user_name || body.userName || body.name || '').trim();
        const user_phone = String(body.user_phone || body.userPhone || body.phone || body.mobile || '').trim();
        const user_id = body.user_id || body.userId || null;
        const society_id = body.society_id || body.societyId || null;
        const society_name = String(body.society_name || body.societyName || '').trim();
        const sector = String(body.sector || body.area || '').trim();
        const service_type = String(body.service_type || body.serviceType || body.subject || 'General Service Request').trim();
        const preferred_time = String(body.preferred_time || body.preferredTime || body.time_slot || 'As soon as possible').trim();
        const description = String(body.description || body.notes || body.issue || '').trim();
        let issue_photos = body.issue_photos || body.photos || body.images || [];

        if (typeof issue_photos === 'string') {
            issue_photos = [issue_photos];
        }

        if (!vendor_id) {
            return res.status(400).json({ error: 'vendor_id is required to submit a service enquiry' });
        }

        if (!user_name || !user_phone) {
            return res.status(400).json({ error: 'user_name and user_phone are required fields for service enquiry' });
        }

        // Verify vendor exists
        const vendorCheck = await query(
            `SELECT vendor_id, vendor_name, store_name, phone_number, whatsapp_number, vendor_type FROM vendors WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`,
            [vendor_id, String(vendor_id)]
        );

        if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
            return res.status(404).json({ error: `Vendor with ID "${vendor_id}" not found` });
        }

        const vendor = vendorCheck.rows[0];
        const targetVendorId = Number(vendor.vendor_id);

        const result = await query(
            `INSERT INTO enquiries (vendor_id, user_id, user_name, user_phone, society_id, society_name, sector, service_type, preferred_time, description, issue_photos, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW') RETURNING *`,
            [targetVendorId, user_id, user_name, user_phone, society_id ? Number(society_id) : null, society_name, sector, service_type, preferred_time, description, issue_photos]
        );

        const newEnquiry = result.rows[0] || {};
        const enquiry_id = Number(newEnquiry.enquiry_id || result.insertId);

        // Build direct contact action URLs for resident response
        const cleanVendorPhone = (vendor.whatsapp_number || vendor.phone_number || '').replace(/[^0-9]/g, '');
        const whatsapp_link = cleanVendorPhone ? `https://wa.me/${cleanVendorPhone.length === 10 ? '91' + cleanVendorPhone : cleanVendorPhone}?text=${encodeURIComponent(`Hi ${vendor.store_name}, I have submitted a service request #${enquiry_id} for ${service_type}.`)}` : null;
        const call_link = cleanVendorPhone ? `tel:${cleanVendorPhone}` : null;

        res.status(201).json({
            success: true,
            message: 'Service enquiry submitted successfully!',
            enquiry: {
                enquiry_id,
                vendor_id: targetVendorId,
                vendor_name: vendor.vendor_name,
                store_name: vendor.store_name,
                user_name,
                user_phone,
                user_id,
                society_id,
                society_name,
                sector,
                service_type,
                preferred_time,
                description,
                issue_photos,
                status: 'NEW',
                created_at: newEnquiry.created_at || new Date().toISOString(),
                direct_actions: {
                    whatsapp_link,
                    call_link
                }
            }
        });
    } catch (err) {
        console.error('Error creating service enquiry:', err);
        res.status(500).json({ error: err.message || 'Failed to submit service enquiry' });
    }
}

/**
 * GET /api/vendors/:vendorId/enquiries
 * Fetch service enquiries for a specific vendor. Supports filtering by status.
 */
async function getVendorEnquiries(req, res) {
    try {
        const { vendorId } = req.params;
        const { status } = req.query;

        if (!vendorId) {
            return res.status(400).json({ error: 'vendorId is required' });
        }

        const vendorCheck = await query(
            `SELECT vendor_id FROM vendors WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`,
            [vendorId, String(vendorId)]
        );

        if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
            return res.status(404).json({ error: `Vendor with ID "${vendorId}" not found` });
        }

        const actualVendorId = Number(vendorCheck.rows[0].vendor_id);

        let sql = `SELECT * FROM enquiries WHERE vendor_id = ?`;
        const params = [actualVendorId];

        if (status) {
            sql += ` AND LOWER(status) = LOWER(?)`;
            params.push(String(status).trim());
        }

        sql += ` ORDER BY enquiry_id DESC`;

        const enquiriesRes = await query(sql, params);

        const enquiries = (enquiriesRes.rows || []).map(row => ({
            enquiry_id: Number(row.enquiry_id),
            vendor_id: Number(row.vendor_id),
            user_id: row.user_id,
            user_name: row.user_name,
            user_phone: row.user_phone,
            society_id: row.society_id ? Number(row.society_id) : null,
            society_name: row.society_name,
            sector: row.sector,
            service_type: row.service_type,
            preferred_time: row.preferred_time,
            description: row.description,
            issue_photos: row.issue_photos || [],
            status: row.status || 'NEW',
            created_at: row.created_at,
            updated_at: row.updated_at
        }));

        res.status(200).json({
            success: true,
            vendor_id: actualVendorId,
            total_enquiries: enquiries.length,
            enquiries
        });
    } catch (err) {
        console.error('Error fetching vendor enquiries:', err);
        res.status(500).json({ error: 'Failed to fetch service enquiries' });
    }
}

/**
 * PATCH /api/enquiries/:enquiryId or /api/vendors/:vendorId/enquiries/:enquiryId
 * Update service enquiry status (NEW, CONTACTED, SCHEDULED, COMPLETED, CANCELLED).
 */
async function updateEnquiryStatus(req, res) {
    try {
        const enquiryId = req.params.enquiryId || req.params.id;
        const { status } = req.body || {};

        if (!enquiryId) {
            return res.status(400).json({ error: 'enquiryId is required' });
        }

        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        const validStatuses = ['NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED'];
        const newStatusNorm = String(status).toUpperCase().trim();

        if (!validStatuses.includes(newStatusNorm)) {
            return res.status(400).json({
                error: `Invalid status "${status}". Allowed values: ${validStatuses.join(', ')}`
            });
        }

        const enquiryCheck = await query(`SELECT * FROM enquiries WHERE enquiry_id = ? OR CAST(enquiry_id AS TEXT) = ?`, [enquiryId, String(enquiryId)]);
        if (!enquiryCheck.rows || enquiryCheck.rows.length === 0) {
            return res.status(404).json({ error: `Service enquiry with ID "${enquiryId}" not found` });
        }

        await query(
            `UPDATE enquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE enquiry_id = ?`,
            [newStatusNorm, enquiryCheck.rows[0].enquiry_id]
        );

        res.status(200).json({
            success: true,
            message: `Enquiry status updated to ${newStatusNorm}`,
            enquiry_id: Number(enquiryCheck.rows[0].enquiry_id),
            status: newStatusNorm
        });
    } catch (err) {
        console.error('Error updating service enquiry status:', err);
        res.status(500).json({ error: err.message || 'Failed to update service enquiry status' });
    }
}

/**
 * GET /api/user/:userId/enquiries & /api/users/:userId/enquiries
 * Retrieve service enquiry history for a resident user.
 */
async function getUserEnquiries(req, res) {
    try {
        const userId = req.params.userId || req.params.id;
        if (!userId) {
            return res.status(400).json({ error: 'userId is required' });
        }

        const cleanPhone = String(userId).trim().replace(/[^0-9]/g, '');
        const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

        const uRes = await query(
            `SELECT user_id, phone FROM users WHERE user_id = ? OR phone = ? OR phone LIKE ?`,
            [userId, userId, `%${last10}`]
        ).catch(() => ({ rows: [] }));

        const matchedUserIds = Array.from(new Set([
            userId,
            ...(uRes.rows || []).map(r => r.user_id)
        ]));

        const placeholders = matchedUserIds.map(() => '?').join(',');
        const enquiriesRes = await query(
            `SELECT e.*, v.store_name, v.vendor_name, v.phone_number as vendor_phone, v.whatsapp_number as vendor_whatsapp
             FROM enquiries e
             LEFT JOIN vendors v ON e.vendor_id = v.vendor_id
             WHERE e.user_id IN (${placeholders}) OR e.user_phone = ? OR e.user_phone LIKE ?
             ORDER BY e.enquiry_id DESC`,
            [...matchedUserIds, userId, `%${last10}`]
        );

        const enquiries = (enquiriesRes.rows || []).map(row => {
            const cleanVendorPhone = (row.vendor_whatsapp || row.vendor_phone || '').replace(/[^0-9]/g, '');
            const whatsapp_link = cleanVendorPhone
                ? `https://wa.me/${cleanVendorPhone.length === 10 ? '91' + cleanVendorPhone : cleanVendorPhone}?text=${encodeURIComponent(`Hi ${row.store_name || 'Vendor'}, regarding my service request #${row.enquiry_id} for ${row.service_type || 'service'}...`)}`
                : null;
            const call_link = cleanVendorPhone ? `tel:${cleanVendorPhone}` : null;

            return {
                enquiry_id: Number(row.enquiry_id),
                vendor_id: Number(row.vendor_id),
                store_name: row.store_name || 'Service Vendor',
                vendor_name: row.vendor_name || 'Service Provider',
                user_id: row.user_id,
                user_name: row.user_name,
                user_phone: row.user_phone,
                society_id: row.society_id ? Number(row.society_id) : null,
                society_name: row.society_name,
                sector: row.sector,
                service_type: row.service_type,
                preferred_time: row.preferred_time,
                description: row.description,
                issue_photos: row.issue_photos || [],
                status: row.status || 'NEW',
                created_at: row.created_at,
                updated_at: row.updated_at,
                direct_actions: {
                    whatsapp_link,
                    call_link
                }
            };
        });

        res.status(200).json({
            success: true,
            user_id: userId,
            total_enquiries: enquiries.length,
            enquiries
        });
    } catch (err) {
        console.error('Error fetching resident user enquiries:', err);
        res.status(500).json({ error: 'Failed to fetch user service enquiries' });
    }
}

module.exports = {
    createEnquiry,
    getVendorEnquiries,
    updateEnquiryStatus,
    getUserEnquiries
};

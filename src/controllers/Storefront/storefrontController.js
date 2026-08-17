const { query } = require('../../models/db');
const { performance } = require('perf_hooks');

/**
 * GET /api/societies/:societyId/vendors - List ACTIVE vendors in a society
 */
async function getSocietyVendorsStorefront(req, res) {
    try {
        const { societyId } = req.params;
        const { search, page, limit } = req.query;
        const isPaginated = page !== undefined || limit !== undefined;

        const pageNum = parseInt(page || 1, 10);
        const limitNum = parseInt(limit || 25, 10);
        const offset = (pageNum - 1) * limitNum;

        const startTime = performance.now();
        const isAll = !societyId || String(societyId).toLowerCase() === 'all' || societyId === '0';

        let sql = `SELECT v.vendor_id, v.society_id, v.vendor_name, v.gst_number, v.phone_number, v.email,
                          v.store_name, v.logo, v.description, v.status, s.society_name 
                   FROM vendors v
                   LEFT JOIN societies s ON v.society_id = s.society_id
                   WHERE v.status = 'ACTIVE'`;
        const params = [];

        if (!isAll) {
            sql += ` AND v.society_id = ?`;
            params.push(societyId);
        }

        if (search) {
            sql += ` AND (LOWER(v.store_name) LIKE ? OR LOWER(v.vendor_name) LIKE ? OR LOWER(v.description) LIKE ? OR LOWER(s.society_name) LIKE ?)`;
            const q = `%${search.toLowerCase()}%`;
            params.push(q, q, q, q);
        }

        const countSql = `SELECT COUNT(*) as total FROM (${sql}) sub`;
        const countRes = await query(countSql, params);
        const total_records = parseInt(countRes.rows[0]?.total || 0, 10);

        sql += ` ORDER BY v.store_name ASC`;

        if (isPaginated) {
            sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
        }

        const result = await query(sql, params);

        const endTime = performance.now();
        if (search) {
            console.log(`vendors search query time: ${endTime - startTime}`);
            console.log(`shop search query time: ${endTime - startTime}`);
        } else {
            console.log(`vendors query time: ${endTime - startTime}`);
        }

        if (isPaginated) {
            const total_pages = Math.ceil(total_records / limitNum) || 1;
            return res.status(200).json({
                success: true,
                data: result.rows,
                meta: {
                    total_records,
                    total_pages,
                    current_page: pageNum,
                    page_size: limitNum,
                    has_next: pageNum < total_pages,
                    has_prev: pageNum > 1
                }
            });
        }

        res.status(200).json(result.rows);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'DB query failed: Unable to fetch vendors' });
    }
}

/**
 * GET /api/vendors/:vendorId - Vendor storefront details & items
 */
async function getVendorStorefront(req, res) {
    try {
        const { vendorId } = req.params;
        const startTime = performance.now();
        const vendorResult = await query(
            `SELECT v.*, s.society_name, s.location 
             FROM vendors v 
             LEFT JOIN societies s ON v.society_id = s.society_id 
             WHERE (CAST(v.vendor_id AS TEXT) = ? OR v.public_id = ? OR LOWER(v.email) = LOWER(?)) AND v.status = 'ACTIVE'`,
            [vendorId, vendorId, vendorId]
        );
        const endTime = performance.now();
        console.log(`vendor storefront query time: ${endTime - startTime}`);

        if (vendorResult.rows.length === 0)
            return res.status(404).json({ error: 'Vendor not found' });

        const vendor = vendorResult.rows[0];
        delete vendor.password;

        const itemsResult = await query(
            `SELECT * FROM items 
             WHERE vendor_id = ? OR vendor_id IN (SELECT vendor_id FROM vendors WHERE LOWER(email) = LOWER(?))
             ORDER BY category ASC, item_name ASC`,
            [vendor.vendor_id, vendor.email]
        );

        res.status(200).json({ vendor, items: itemsResult.rows });
    } catch (err) {
        console.error('Error fetching vendor storefront:', err);
        res.status(500).json({ error: 'DB query failed' });
    }
}

module.exports = {
    getSocietyVendorsStorefront,
    getVendorStorefront
};

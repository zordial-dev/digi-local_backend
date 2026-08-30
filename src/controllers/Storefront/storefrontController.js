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
        const limitNum = parseInt(limit || 24, 10);
        const offset = (pageNum - 1) * limitNum;

        const startTime = performance.now();
        const isAll = !societyId || String(societyId).toLowerCase() === 'all' || societyId === '0';

        let sql = `SELECT v.vendor_id, v.society_id, v.vendor_name, v.gst_number, v.phone_number, v.email,
                          v.store_name, v.logo, v.description, v.status, v.account_number, v.ifsc_code,
                          v.bank_name, v.account_holder_name, v.upi_id, v.qr_code_url, v.upi_qr_code, v.qr_code,
                          v.whatsapp_number, v.accepted_payment_methods, v.payment_instructions,
                          v.vendor_type, v.can_add_items, v.location_type, v.is_global_coverage, v.delivery_radius_km, v.selected_zones,
                          s.society_name 
                   FROM vendors v
                   LEFT JOIN societies s ON v.society_id = s.society_id
                   WHERE v.status = 'ACTIVE'`;
        const params = [];

        if (!isAll) {
            const socIdStr = String(societyId);
            sql += ` AND (v.society_id = ? OR (v.is_global_coverage = TRUE AND (v.selected_zones::text LIKE ? OR v.selected_zones::text LIKE ?)))`;
            params.push(societyId, `%"zone_id":${socIdStr}%`, `%"zone_id":"${socIdStr}"%`);
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
        const { calculateHaversineDistance } = require('../../utils/geoUtils');
        const { vendorId } = req.params;
        const { user_lat, user_lng, lat, lng, user_society_id, societyId, society_id, sector, user_sector } = req.query;

        const startTime = performance.now();
        const vendorResult = await query(
            `SELECT v.*, s.society_name, s.location, s.latitude as society_latitude, s.longitude as society_longitude 
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

        // Check User Location Access Restriction if user location query params are provided
        const targetSocId = societyId || society_id || user_society_id ? String(societyId || society_id || user_society_id) : null;
        /*
        // [OLD LOCATION GUARD COMMENTED OUT PER USER DIRECTIVE]
        // Old feature: Restricting storefront access based on user GPS latitude/longitude and Go Global 10km radius.
        if (targetSocId || targetSector || (uLat !== null && uLng !== null)) {
            let isServicable = false;
            // ...
        }
        */

        const itemsResult = await query(
            `SELECT item_id, vendor_id, item_name, price, category, description, image_url, in_stock, created_at
             FROM items WHERE vendor_id = ? AND in_stock = TRUE ORDER BY created_at DESC`,
            [actualVendorId]
        );

        return res.status(200).json({
            success: true,
            vendor: {
                ...vendor,
                vendor_id: Number(vendor.vendor_id),
                society_id: Number(vendor.society_id),
                vendor_type: vendor.vendor_type || 'product',
                can_add_items: vendor.can_add_items !== false && (vendor.vendor_type || 'product') === 'product',
                location: vendor.location || vendor.location_address || '',
                city: vendor.city || '',
                state: vendor.state || '',
                pincode: vendor.pincode || '',
                is_servicable: true
            },
            items: itemsResult.rows || []
        });
    } catch (err) {
        console.error('Error fetching vendor storefront:', err);
        res.status(500).json({ error: 'DB query failed' });
    }
}

/**
 * GET /api/vendors/search
 * Area & City/State filtering vendor search endpoint.
 * (Old Go Global map radius and user GPS location distance checks are commented out per user directive).
 */
async function searchVendorsLocationAware(req, res) {
    try {
        const {
            area, location, sector, sectorId, sector_id, user_sector,
            city, state, pincode,
            type, vendor_type,
            search, q,
            page, limit
        } = req.query;

        const targetArea = String(area || location || sector || sectorId || sector_id || user_sector || search || q || '').trim();
        const targetCity = String(city || '').trim().toLowerCase();
        const targetState = String(state || '').trim().toLowerCase();
        const targetPincode = String(pincode || '').trim();
        const targetType = String(type || vendor_type || '').trim().toLowerCase();

        const isPaginated = page !== undefined || limit !== undefined;
        const pageNum = parseInt(page || 1, 10);
        const limitNum = parseInt(limit || 24, 10);
        const offset = (pageNum - 1) * limitNum;

        let sql = `SELECT v.vendor_id, v.society_id, v.vendor_name, v.gst_number, v.phone_number, v.email,
                          v.store_name, v.logo, v.description, v.status, v.account_number, v.ifsc_code,
                          v.bank_name, v.account_holder_name, v.upi_id, v.qr_code_url, v.upi_qr_code, v.qr_code,
                          v.whatsapp_number, v.accepted_payment_methods, v.payment_instructions,
                          v.vendor_type, v.can_add_items, v.location_address, v.location, v.city, v.state, v.pincode,
                          v.latitude, v.longitude,
                          s.society_name, s.location as society_location
                   FROM vendors v
                   LEFT JOIN societies s ON v.society_id = s.society_id
                   WHERE LOWER(COALESCE(v.status, 'active')) IN ('active', 'approved')`;
        const params = [];

        if (targetType === 'product' || targetType === 'service') {
            sql += ` AND LOWER(COALESCE(v.vendor_type, 'product')) = ?`;
            params.push(targetType);
        }

        // New Workflow: Area text matching (e.g. "sitapura" matches "A, sitapura" or "B, sitapura")
        if (targetArea) {
            const kw = `%${targetArea.toLowerCase()}%`;
            sql += ` AND (LOWER(COALESCE(v.location, '')) LIKE ? OR LOWER(COALESCE(v.location_address, '')) LIKE ? OR LOWER(COALESCE(v.address, '')) LIKE ? OR LOWER(COALESCE(s.society_name, '')) LIKE ? OR LOWER(COALESCE(v.store_name, '')) LIKE ?)`;
            params.push(kw, kw, kw, kw, kw);
        }

        // City Filter
        if (targetCity) {
            sql += ` AND LOWER(COALESCE(v.city, '')) = ?`;
            params.push(targetCity);
        }

        // State Filter
        if (targetState) {
            sql += ` AND LOWER(COALESCE(v.state, '')) = ?`;
            params.push(targetState);
        }

        // Pincode Filter
        if (targetPincode) {
            sql += ` AND COALESCE(v.pincode, '') = ?`;
            params.push(targetPincode);
        }

        sql += ` ORDER BY v.created_at DESC`;

        const vendorRes = await query(sql, params);
        const vendors = vendorRes.rows || [];

        /*
        // [OLD GO GLOBAL RADIUS & USER GPS HAVERSINE DISTANCE FILTERING COMMENTED OUT PER USER DIRECTIVE]
        // Old feature: Calculating Haversine distance from user_lat, user_lng and filtering vendors by delivery_radius_km (1-10km max).
        // ...
        */

        const formattedVendors = vendors.map(v => ({
            ...v,
            vendor_id: Number(v.vendor_id),
            society_id: Number(v.society_id),
            vendor_type: v.vendor_type || 'product',
            can_add_items: v.can_add_items !== false && (v.vendor_type || 'product') === 'product',
            location: v.location || v.location_address || v.address || '',
            city: v.city || '',
            state: v.state || '',
            pincode: v.pincode || '',
            coverage_badge: v.location ? `Location: ${v.location}` : 'Servicable Store'
        }));

        if (isPaginated) {
            const total_pages = Math.ceil(formattedVendors.length / limitNum) || 1;
            const paginatedItems = formattedVendors.slice(offset, offset + limitNum);
            return res.status(200).json({
                success: true,
                data: paginatedItems,
                meta: {
                    total_records: formattedVendors.length,
                    total_pages,
                    current_page: pageNum,
                    page_size: limitNum,
                    has_next: pageNum < total_pages,
                    has_prev: pageNum > 1
                }
            });
        }

        return res.status(200).json(formattedVendors);
    } catch (err) {
        console.error('Error searching vendors:', err);
        res.status(500).json({ error: 'DB query failed' });
    }
}

/**
 * GET /api/locations
 * Returns list of registered areas, cities, and states for location autocompletion and filtering.
 */
async function getLocations(req, res) {
    try {
        const { search, q, area, city, state } = req.query;
        const kw = String(search || q || area || '').trim().toLowerCase();

        let sql = `SELECT location_id, area, city, state, pincode, created_at FROM locations WHERE 1=1`;
        const params = [];

        if (kw) {
            sql += ` AND (LOWER(area) LIKE ? OR LOWER(city) LIKE ? OR LOWER(state) LIKE ? OR pincode LIKE ?)`;
            const searchKw = `%${kw}%`;
            params.push(searchKw, searchKw, searchKw, searchKw);
        }

        if (city) {
            sql += ` AND LOWER(city) = LOWER(?)`;
            params.push(String(city).trim());
        }

        if (state) {
            sql += ` AND LOWER(state) = LOWER(?)`;
            params.push(String(state).trim());
        }

        sql += ` ORDER BY area ASC LIMIT 100`;

        const locRes = await query(sql, params).catch(() => ({ rows: [] }));
        let locations = locRes.rows || [];

        // If locations table is empty or sparse, also fallback/union with distinct vendor locations
        if (locations.length === 0) {
            let vSql = `SELECT DISTINCT location as area, city, state, pincode FROM vendors WHERE location IS NOT NULL AND location != ''`;
            const vParams = [];
            if (kw) {
                vSql += ` AND (LOWER(location) LIKE ? OR LOWER(city) LIKE ? OR LOWER(state) LIKE ?)`;
                const searchKw = `%${kw}%`;
                vParams.push(searchKw, searchKw, searchKw);
            }
            vSql += ` LIMIT 50`;
            const vRes = await query(vSql, vParams).catch(() => ({ rows: [] }));
            locations = (vRes.rows || []).map((r, idx) => ({ location_id: idx + 1, ...r }));
        }

        return res.status(200).json({
            success: true,
            total: locations.length,
            data: locations
        });
    } catch (err) {
        console.error('Error fetching locations:', err);
        res.status(500).json({ error: 'Failed to fetch locations' });
    }
}

module.exports = {
    getSocietyVendorsStorefront,
    getVendorStorefront,
    searchVendorsLocationAware,
    getLocations
};

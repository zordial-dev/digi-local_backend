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
                          v.vendor_type, v.can_add_items,
                          v.area, s.society_name 
                   FROM vendors v
                   LEFT JOIN societies s ON v.society_id = s.society_id
                   WHERE v.status = 'ACTIVE'`;
        const params = [];

        if (!isAll) {
            sql += ` AND v.society_id = ?`;
            params.push(societyId);
        }

        if (search) {
            sql += ` AND (LOWER(v.store_name) LIKE ? OR LOWER(v.vendor_name) LIKE ? OR LOWER(v.description) LIKE ? OR LOWER(COALESCE(v.area, '')) LIKE ? OR LOWER(s.society_name) LIKE ?)`;
            const q = `%${search.toLowerCase()}%`;
            params.push(q, q, q, q, q);
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
        const vendorIdParam = req.params.vendorId || req.params.id || req.query.vendorId || req.query.id;
        if (!vendorIdParam) return res.status(400).json({ error: 'Vendor ID is required' });

        const startTime = performance.now();
        let vendorResult = await query(
            `SELECT v.*, s.society_name, s.location, s.latitude as society_latitude, s.longitude as society_longitude 
             FROM vendors v 
             LEFT JOIN societies s ON v.society_id = s.society_id 
             WHERE (CAST(v.vendor_id AS TEXT) = ? OR v.public_id = ? OR LOWER(v.email) = LOWER(?)) AND LOWER(COALESCE(v.status, 'active')) IN ('active', 'approved')`,
            [String(vendorIdParam), String(vendorIdParam), String(vendorIdParam)]
        );

        if (!vendorResult.rows || vendorResult.rows.length === 0) {
            // Fallback query if vendor status is pending/hold/blocked or numerical lookup
            vendorResult = await query(
                `SELECT v.*, s.society_name, s.location 
                 FROM vendors v 
                 LEFT JOIN societies s ON v.society_id = s.society_id 
                 WHERE CAST(v.vendor_id AS TEXT) = ? OR v.public_id = ? OR LOWER(v.email) = LOWER(?)`,
                [String(vendorIdParam), String(vendorIdParam), String(vendorIdParam)]
            );
        }

        const endTime = performance.now();

        if (!vendorResult.rows || vendorResult.rows.length === 0) {
            return res.status(404).json({ error: `Vendor ID "${vendorIdParam}" not found.` });
        }

        const vendor = vendorResult.rows[0];
        delete vendor.password;
        delete vendor.password_hash;

        const itemsResult = await query(
            `SELECT item_id, vendor_id, item_name, price, category, description, image_url, in_stock, created_at
             FROM items WHERE vendor_id = ? AND in_stock = TRUE ORDER BY created_at DESC`,
            [vendor.vendor_id]
        ).catch(() => ({ rows: [] }));

        const itemsList = (itemsResult.rows || []).map(i => ({
            ...i,
            item_id: Number(i.item_id),
            vendor_id: Number(i.vendor_id),
            price: Number(i.price || 0),
            unit_price: Number(i.price || 0),
            name: i.item_name,
            in_stock: Boolean(i.in_stock)
        }));

        const cleanVendorObj = {
            ...vendor,
            vendor_id: Number(vendor.vendor_id),
            id: Number(vendor.vendor_id),
            store_name: vendor.store_name || vendor.shop_name || 'DigiLocal Partner Store',
            vendor_name: vendor.vendor_name || vendor.owner_name || 'Store Manager',
            owner_name: vendor.vendor_name || vendor.owner_name || 'Store Manager',
            email: vendor.email || '',
            phone: vendor.phone_number || vendor.phone || '',
            phone_number: vendor.phone_number || vendor.phone || '',
            category: vendor.category || 'General',
            society_id: vendor.society_id ? Number(vendor.society_id) : 1,
            society_name: vendor.society_name || 'Local Society',
            vendor_type: vendor.vendor_type || 'product',
            can_add_items: vendor.can_add_items !== false && (vendor.vendor_type || 'product') === 'product',
            area: vendor.area || vendor.location || vendor.address || '',
            location: vendor.area || vendor.location || vendor.address || '',
            city: vendor.city || '',
            state: vendor.state || '',
            pincode: vendor.pincode || '',
            shop_image: vendor.shop_image || vendor.logo || '',
            logo: vendor.logo || vendor.shop_image || '',
            status: String(vendor.status || 'ACTIVE').toLowerCase(),
            is_servicable: true
        };

        return res.status(200).json({
            success: true,
            ...cleanVendorObj,
            vendor: cleanVendorObj,
            data: {
                vendor: cleanVendorObj,
                items: itemsList
            },
            items: itemsList,
            products: itemsList,
            catalog: itemsList
        });
    } catch (err) {
        console.error('Error fetching vendor storefront:', err);
        return res.status(500).json({ error: 'Failed to fetch vendor details' });
    }
}

/**
 * GET /api/categories - Platform & Storefront Product/Service Categories
 */
async function getCategories(req, res) {
    try {
        const vendorCatResult = await query(
            `SELECT DISTINCT category FROM vendors WHERE LOWER(COALESCE(status, 'active')) = 'active' AND category IS NOT NULL AND category != ''`
        ).catch(() => ({ rows: [] }));

        const itemCatResult = await query(
            `SELECT DISTINCT category FROM items WHERE in_stock = TRUE AND category IS NOT NULL AND category != ''`
        ).catch(() => ({ rows: [] }));

        const defaultCategories = [
            'Grocery & Staples',
            'Dairy & Milk',
            'Bakery & Sweets',
            'Fruits & Vegetables',
            'Beverages & Drinks',
            'Snacks & Packaged Food',
            'Personal Care & Hygiene',
            'Household Essentials',
            'Electronics & Accessories',
            'Pharmacy & Health',
            'Services & Repairs'
        ];

        const combinedNames = Array.from(new Set([
            ...defaultCategories,
            ...(vendorCatResult.rows || []).map(r => r.category),
            ...(itemCatResult.rows || []).map(r => r.category)
        ])).filter(Boolean);

        const categoriesList = combinedNames.map((name, idx) => ({
            id: idx + 1,
            category_id: idx + 1,
            name,
            title: name,
            category_name: name,
            slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            icon: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=120',
            active: true
        }));

        return res.status(200).json({
            success: true,
            total: categoriesList.length,
            count: categoriesList.length,
            data: categoriesList,
            categories: categoriesList
        });
    } catch (err) {
        console.error('Error fetching categories:', err);
        return res.status(500).json({ error: 'Failed to fetch categories' });
    }
}

/**
 * GET /api/vendors/search
 * Area & City/State filtering vendor search endpoint.
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
                          v.latitude, v.longitude, v.area,
                          s.society_name, s.location as society_location
                   FROM vendors v
                   LEFT JOIN societies s ON v.society_id = s.society_id
                   WHERE LOWER(COALESCE(v.status, 'active')) IN ('active', 'approved')`;
        const params = [];

        if (targetType === 'product' || targetType === 'service') {
            sql += ` AND LOWER(COALESCE(v.vendor_type, 'product')) = ?`;
            params.push(targetType);
        }

        // Area text matching (e.g. "Sector 62" or "sitapura" matches v.area, v.location, etc.)
        if (targetArea) {
            const kw = `%${targetArea.toLowerCase()}%`;
            sql += ` AND (LOWER(COALESCE(v.area, '')) LIKE ? OR LOWER(COALESCE(v.location, '')) LIKE ? OR LOWER(COALESCE(v.location_address, '')) LIKE ? OR LOWER(COALESCE(v.address, '')) LIKE ? OR LOWER(COALESCE(s.society_name, '')) LIKE ? OR LOWER(COALESCE(v.store_name, '')) LIKE ?)`;
            params.push(kw, kw, kw, kw, kw, kw);
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

        const formattedVendors = vendors.map(v => ({
            ...v,
            vendor_id: Number(v.vendor_id),
            society_id: Number(v.society_id),
            vendor_type: v.vendor_type || 'product',
            can_add_items: v.can_add_items !== false && (v.vendor_type || 'product') === 'product',
            area: v.area || v.location || v.location_address || v.address || '',
            location: v.area || v.location || v.location_address || v.address || '',
            city: v.city || '',
            state: v.state || '',
            pincode: v.pincode || '',
            coverage_badge: v.area ? `Area: ${v.area}` : 'Servicable Store'
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
 * GET /api/locations/suggestions
 * GET /api/vendors/locations/suggestions
 * Area Autocomplete & Location Suggestions API for Vendor Registration & Frontend Search.
 * Strictly queries locations table ONLY by area/city/pincode and returns matching location suggestions.
 */
async function getLocations(req, res) {
    try {
        const { search, q, query: qParam, area, term, input, city, state } = req.query;
        const kw = String(search || q || qParam || area || term || input || '').trim().toLowerCase();

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
        const locations = locRes.rows || [];

        // Distinct area names from locations table ONLY
        const areaSuggestions = Array.from(
            new Set(locations.map(l => String(l.area || '').trim()).filter(Boolean))
        );

        return res.status(200).json({
            success: true,
            total: locations.length,
            query: kw,
            suggestions: areaSuggestions,
            areas: areaSuggestions,
            data: locations.map(l => ({
                location_id: Number(l.location_id || 0),
                area: l.area || '',
                city: l.city || '',
                state: l.state || '',
                pincode: l.pincode || ''
            }))
        });
    } catch (err) {
        console.error('Error fetching location suggestions:', err);
        res.status(500).json({ error: 'Failed to fetch location suggestions' });
    }
}

module.exports = {
    getSocietyVendorsStorefront,
    getVendorStorefront,
    searchVendorsLocationAware,
    getLocations,
    getCategories
};

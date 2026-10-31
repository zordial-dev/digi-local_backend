const { query } = require('../../models/db');
const { performance } = require('perf_hooks');
const { normalizeImageUrl, DEFAULT_PRODUCT_SERVICE_IMAGE } = require('../../utils/imageUtils');
const { maskAccountNumber, getVendorPaymentEligibility } = require('../../services/paymentEligibilityService');

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
                          v.store_name, v.logo, v.shop_image, v.description, v.status, v.account_number, v.ifsc_code,
                          v.bank_name, v.account_holder_name, v.upi_id, v.qr_code,
                          v.whatsapp_number, v.accepted_payment_methods,
                          v.vendor_type, v.can_add_items,
                          v.area, s.society_name 
                    FROM vendors v
                    LEFT JOIN societies s ON v.society_id = s.society_id
                    WHERE UPPER(v.status) = 'ACTIVE'
                      AND (
                        NOT EXISTS (SELECT 1 FROM subscriptions sub WHERE sub.vendor_id = v.vendor_id)
                        OR EXISTS (
                          SELECT 1 FROM subscriptions sub 
                          WHERE sub.vendor_id = v.vendor_id 
                            AND UPPER(sub.status) = 'ACTIVE' 
                            AND sub.end_date >= CURRENT_DATE
                        )
                      )`;
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

        const formattedRows = (result.rows || []).map(v => {
            const rawImg = v.logo || v.shop_image || null;
            const finalImg = rawImg ? (typeof normalizeImageUrl === 'function' ? normalizeImageUrl(rawImg) : rawImg) : null;
            const eligibility = getVendorPaymentEligibility(v);
            return {
                ...v,
                account_number: maskAccountNumber(v.account_number),
                bank_account_number: maskAccountNumber(v.bank_account_number || v.account_number),
                payment_eligibility: eligibility,
                is_online_eligible: eligibility.is_online_eligible,
                logo: finalImg,
                shop_image: finalImg,
                logo_url: finalImg
            };
        });

        if (isPaginated) {
            const total_pages = Math.ceil(total_records / limitNum) || 1;
            return res.status(200).json({
                success: true,
                data: formattedRows,
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

        res.status(200).json(formattedRows);
    } catch (err) {
        console.error('Error fetching vendors:', err);
        res.status(500).json({ error: 'DB query failed: Unable to fetch vendors' });
    }
}

/**
 * GET /api/vendors/:vendorId - Vendor storefront details & items (ACTIVE vendors only for users)
 */
async function getVendorStorefront(req, res) {
    try {
        const vendorIdParam = req.params.vendorId || req.params.id || req.query.vendorId || req.query.id;
        if (!vendorIdParam) return res.status(400).json({ error: 'Vendor ID is required' });

        let vendorResult = await query(
            `SELECT v.*, s.society_name, COALESCE(NULLIF(v.location, ''), NULLIF(v.area, ''), s.location) as location, s.latitude as society_latitude, s.longitude as society_longitude 
             FROM vendors v 
             LEFT JOIN societies s ON v.society_id = s.society_id 
             WHERE (CAST(v.vendor_id AS TEXT) = ? OR v.public_id = ? OR LOWER(v.email) = LOWER(?)) AND UPPER(v.status) = 'ACTIVE'`,
            [String(vendorIdParam), String(vendorIdParam), String(vendorIdParam)]
        );

        const endTime = performance.now();

        if (!vendorResult.rows || vendorResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Vendor "${vendorIdParam}" not found or is currently inactive.`,
                message: `Vendor "${vendorIdParam}" not found or is currently inactive.`
            });
        }

        const vendor = vendorResult.rows[0];
        delete vendor.password;
        delete vendor.password_hash;
        const vendorEligibility = getVendorPaymentEligibility(vendor);
        vendor.account_number = maskAccountNumber(vendor.account_number);
        vendor.bank_account_number = maskAccountNumber(vendor.bank_account_number || vendor.account_number);

        // Verify active subscription (hide expired shops from user portal)
        const subCheck = await query(
            `SELECT subscription_id, status, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date 
             FROM subscriptions 
             WHERE vendor_id = ? 
             ORDER BY subscription_id DESC LIMIT 1`,
            [vendor.vendor_id]
        );
        const sub = subCheck.rows && subCheck.rows[0];
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        if (sub && (String(sub.status).toUpperCase() === 'EXPIRED' || sub.end_date < todayStr)) {
            return res.status(403).json({
                success: false,
                error: `Store "${vendor.store_name}" is currently unavailable as its annual subscription has expired.`,
                message: `Store "${vendor.store_name}" is currently unavailable as its annual subscription has expired.`,
                subscription_expired: true
            });
        }

        const itemsResult = await query(
            `SELECT item_id, vendor_id, item_name, price, category, description, image_url, in_stock, stock, unit, is_available, created_at
             FROM items WHERE vendor_id = ? ORDER BY created_at DESC`,
            [vendor.vendor_id]
        ).catch(() => ({ rows: [] }));

        const itemsList = (itemsResult.rows || []).map(i => {
            const finalImg = typeof normalizeImageUrl === 'function' ? normalizeImageUrl(i.image_url, DEFAULT_PRODUCT_SERVICE_IMAGE) : (i.image_url || DEFAULT_PRODUCT_SERVICE_IMAGE);
            const stockNum = i.stock !== null && i.stock !== undefined ? Math.max(0, Number(i.stock)) : 0;
            const isAvail = (i.is_available === true || i.is_available === 1 || i.is_available === '1' || i.is_available === null || i.is_available === undefined);
            const inStock = Boolean(i.in_stock) && stockNum > 0 && isAvail;
            return {
                ...i,
                item_id: Number(i.item_id),
                merchant_id: Number(i.vendor_id),
                vendor_id: Number(i.vendor_id),
                price: Number(i.price || 0),
                unit_price: Number(i.price || 0),
                name: i.item_name,
                stock: stockNum,
                available_quantity: stockNum,
                max_quantity: stockNum,
                unit: i.unit || 'piece',
                in_stock: inStock,
                is_available: inStock,
                image_url: finalImg,
                image: finalImg,
                imageUrl: finalImg,
                photo_url: finalImg,
                photo: finalImg,
                images: finalImg ? [finalImg] : []
            };
        });

        let servicesList = [];
        try {
            const servicesResult = await query(
                `SELECT * FROM services WHERE vendor_id = ? ORDER BY service_id ASC`,
                [vendor.vendor_id]
            );
            servicesList = (servicesResult.rows || []).map(s => {
                const finalSImg = typeof normalizeImageUrl === 'function' ? normalizeImageUrl(s.image_url, DEFAULT_PRODUCT_SERVICE_IMAGE) : (s.image_url || DEFAULT_PRODUCT_SERVICE_IMAGE);
                const isAvail = s.is_available === true || s.is_available === 1 || s.is_available === '1';
                return {
                    service_id: Number(s.service_id),
                    id: Number(s.service_id),
                    merchant_id: Number(s.vendor_id),
                    vendor_id: Number(s.vendor_id),
                    service_name: s.service_name,
                    name: s.service_name,
                    title: s.service_name,
                    category: s.category || 'General Services',
                    price: parseFloat(s.price || 0),
                    visiting_charge: parseFloat(s.visiting_charge || 0),
                    estimated_duration: s.estimated_duration || '1 hour',
                    duration: s.estimated_duration || '1 hour',
                    service_location: s.service_location || "At Customer's Doorstep",
                    location: s.service_location || "At Customer's Doorstep",
                    description: s.description || '',
                    image_url: finalSImg,
                    imageUrl: finalSImg,
                    image: finalSImg,
                    photo_url: finalSImg,
                    photoUrl: finalSImg,
                    photo: finalSImg,
                    service_image: finalSImg,
                    service_photo: finalSImg,
                    images: finalSImg ? [finalSImg] : [],
                    is_available: isAvail,
                    isAvailable: isAvail,
                    created_at: s.created_at,
                    updated_at: s.updated_at
                };
            });
        } catch (sErr) {
            servicesList = [];
        }

        const rawImage = vendor.logo || vendor.shop_image || null;
        const finalImage = rawImage ? (typeof normalizeImageUrl === 'function' ? normalizeImageUrl(rawImage) : rawImage) : null;

        vendor.logo = finalImage;
        vendor.shop_image = finalImage;
        vendor.logo_url = finalImage;

        const hasBankDetails = Boolean(String(vendor.account_number || vendor.bank_account_number || '').trim() && String(vendor.ifsc_code || '').trim());
        const acceptedPaymentMethods = hasBankDetails ? ['COD', 'ONLINE', 'UPI'] : ['COD'];

        const cleanVendorObj = {
            ...vendor,
            has_bank_details: hasBankDetails,
            online_payment_available: hasBankDetails,
            accepted_payment_methods: acceptedPaymentMethods,
            payment_methods: acceptedPaymentMethods,
            merchant_id: Number(vendor.vendor_id),
            vendor_id: Number(vendor.vendor_id),
            public_id: vendor.public_id || (vendor.vendor_id ? ('vnd@' + String(vendor.vendor_id).padStart(4, '0')) : ''),
            shop_id: String(vendor.vendor_id),
            id: Number(vendor.vendor_id),

            store_name: vendor.store_name || vendor.shop_name || 'DigiLocal Partner Store',
            merchant_name: vendor.vendor_name || vendor.owner_name || 'Store Manager',
            vendor_name: vendor.vendor_name || vendor.owner_name || 'Store Manager',
            owner_name: vendor.vendor_name || vendor.owner_name || 'Store Manager',
            email: vendor.email || '',
            phone: vendor.phone_number || vendor.phone || '',
            phone_number: vendor.phone_number || vendor.phone || '',
            gstin: String(vendor.gstin || '').trim().toUpperCase(),
            gst_number: String(vendor.gstin || '').trim().toUpperCase(),
            pan_number: String(vendor.pan_number || '').trim().toUpperCase(),
            category: vendor.category || 'General',

            society_id: vendor.society_id ? Number(vendor.society_id) : null,
            society_name: vendor.society_name || vendor.area || '',
            vendor_type: vendor.vendor_type || 'product',
            can_add_items: vendor.can_add_items !== false && (vendor.vendor_type || 'product') === 'product',
            shop_number: vendor.shop_number || vendor.shop_no || '',
            shop_no: vendor.shop_number || vendor.shop_no || '',
            address: vendor.address || '',
            area: vendor.area || vendor.location || vendor.address || '',
            location: vendor.area || vendor.location || vendor.address || '',
            city: vendor.city || '',
            state: vendor.state || '',
            pincode: vendor.pincode || '',
            shop_image: finalImage,
            logo: finalImage,
            logo_url: finalImage,
            status: String(vendor.status || 'ACTIVE').toLowerCase(),
            is_servicable: true,
            account_number: maskAccountNumber(vendor.account_number),
            bank_account_number: maskAccountNumber(vendor.bank_account_number || vendor.account_number),
            payment_eligibility: vendorEligibility,
            is_online_eligible: vendorEligibility.is_online_eligible
        };

        return res.status(200).json({
            success: true,
            ...cleanVendorObj,
            merchant: cleanVendorObj,
            vendor: cleanVendorObj,
            data: {
                merchant: cleanVendorObj,
                vendor: cleanVendorObj,
                items: itemsList,
                services: servicesList
            },
            items: itemsList,
            products: itemsList,
            catalog: itemsList,
            services: servicesList
        });
    } catch (err) {
        console.error('Error fetching vendor storefront:', err);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch vendor details',
            message: err.message
        });
    }
}

/**
 * GET /api/categories - Platform & Storefront Product/Service Categories
 */
async function getCategories(req, res) {
    try {
        const vendorCatResult = await query(
            `SELECT DISTINCT category FROM vendors WHERE UPPER(status) = 'ACTIVE' AND category IS NOT NULL AND category != ''`
        ).catch(() => ({ rows: [] }));

        const itemCatResult = await query(
            `SELECT DISTINCT category FROM items WHERE in_stock = TRUE AND category IS NOT NULL AND category != ''`
        ).catch(() => ({ rows: [] }));

        const combinedNames = Array.from(new Set([
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
                          v.store_name, v.logo, v.shop_image, v.description, v.status, v.account_number, v.ifsc_code,
                          v.bank_name, v.account_holder_name, v.upi_id, v.qr_code,
                          v.whatsapp_number, v.accepted_payment_methods,
                          v.vendor_type, v.can_add_items, v.location_address, v.location, v.city, v.state, v.pincode,
                          s.latitude, s.longitude, v.area,
                          s.society_name, s.location as society_location
                   FROM vendors v
                   LEFT JOIN societies s ON v.society_id = s.society_id
                   WHERE UPPER(v.status) = 'ACTIVE'
                     AND (
                       NOT EXISTS (SELECT 1 FROM subscriptions sub WHERE sub.vendor_id = v.vendor_id)
                       OR EXISTS (
                         SELECT 1 FROM subscriptions sub 
                         WHERE sub.vendor_id = v.vendor_id 
                           AND UPPER(sub.status) = 'ACTIVE' 
                           AND sub.end_date >= CURRENT_DATE
                       )
                     )`;
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

        const formattedVendors = vendors.map(v => {
            const rawImg = v.logo || v.shop_image || null;
            const finalImg = rawImg ? (typeof normalizeImageUrl === 'function' ? normalizeImageUrl(rawImg) : rawImg) : null;
            const hasBankDetails = Boolean(String(v.account_number || v.bank_account_number || '').trim() && String(v.ifsc_code || '').trim());
            const acceptedPaymentMethods = hasBankDetails ? ['COD', 'ONLINE', 'UPI'] : ['COD'];
            return {
                ...v,
                has_bank_details: hasBankDetails,
                online_payment_available: hasBankDetails,
                accepted_payment_methods: acceptedPaymentMethods,
                payment_methods: acceptedPaymentMethods,
                merchant_id: Number(v.vendor_id),
                merchant_name: v.vendor_name || '',
                vendor_id: Number(v.vendor_id),
                society_id: Number(v.society_id),
                logo: finalImg,
                shop_image: finalImg,
                logo_url: finalImg,
                vendor_type: v.vendor_type || 'product',
                can_add_items: v.can_add_items !== false && (v.vendor_type || 'product') === 'product',
                area: v.area || v.location || v.location_address || v.address || '',
                location: v.area || v.location || v.location_address || v.address || '',
                city: v.city || '',
                state: v.state || '',
                pincode: v.pincode || '',
                coverage_badge: v.area ? `Area: ${v.area}` : 'Servicable Store'
            };
        });

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
        // Prevent browser 304 Not Modified caching so frontend always gets real-time DB state
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

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

        // Distinct area names from DB entries ONLY (locations table)
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

/**
 * GET /api/items & /api/products & /items & /products
 * Retrieves list of catalog items / products with filters & pagination
 */
async function getItems(req, res) {
    try {
        const { vendor_id, vendorId, category, search, page, limit } = req.query || {};
        const targetVendorId = vendor_id || vendorId;
        const isPaginated = page !== undefined || limit !== undefined;
        const pageNum = Math.max(1, parseInt(page || 1, 10));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit || 50, 10)));
        const offset = (pageNum - 1) * limitNum;

        let sql = `
            SELECT i.item_id, i.vendor_id, i.item_name, i.price, i.category, i.description, 
                   i.image_url, i.in_stock, i.stock, i.unit, i.is_available, i.created_at,
                   v.store_name, v.vendor_name, v.category as vendor_category, v.status as vendor_status
            FROM items i
            LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
            WHERE i.in_stock = TRUE AND (v.status IS NULL OR UPPER(v.status) = 'ACTIVE')
        `;
        const params = [];

        if (targetVendorId) {
            sql += ` AND (i.vendor_id = ? OR CAST(i.vendor_id AS TEXT) = ?)`;
            params.push(targetVendorId, String(targetVendorId));
        }

        if (category && String(category).toLowerCase() !== 'all') {
            sql += ` AND LOWER(i.category) = LOWER(?)`;
            params.push(String(category).trim());
        }

        if (search) {
            sql += ` AND (LOWER(i.item_name) LIKE ? OR LOWER(COALESCE(i.description, '')) LIKE ?)`;
            const q = `%${String(search).trim().toLowerCase()}%`;
            params.push(q, q);
        }

        const countSql = `SELECT COUNT(*) as total FROM (${sql}) sub`;
        const countRes = await query(countSql, params).catch(() => ({ rows: [{ total: 0 }] }));
        const total = parseInt(countRes.rows[0]?.total || 0, 10);

        sql += ` ORDER BY i.item_id DESC`;
        if (isPaginated) {
            sql += ` LIMIT ${limitNum} OFFSET ${offset}`;
        }

        const result = await query(sql, params).catch(() => ({ rows: [] }));
        const itemsList = (result.rows || []).map(i => {
            const finalImg = typeof normalizeImageUrl === 'function' ? normalizeImageUrl(i.image_url, DEFAULT_PRODUCT_SERVICE_IMAGE) : (i.image_url || DEFAULT_PRODUCT_SERVICE_IMAGE);
            const stockNum = i.stock !== null && i.stock !== undefined ? Math.max(0, Number(i.stock)) : 0;
            const isAvail = (i.is_available === true || i.is_available === 1 || i.is_available === '1' || i.is_available === null || i.is_available === undefined);
            const inStock = Boolean(i.in_stock) && stockNum > 0 && isAvail;
            return {
                ...i,
                item_id: Number(i.item_id),
                id: Number(i.item_id),
                vendor_id: Number(i.vendor_id),
                price: Number(i.price || 0),
                unit_price: Number(i.price || 0),
                name: i.item_name,
                stock: stockNum,
                available_quantity: stockNum,
                max_quantity: stockNum,
                unit: i.unit || 'piece',
                in_stock: inStock,
                is_available: inStock,
                image_url: finalImg,
                image: finalImg,
                imageUrl: finalImg,
                photo_url: finalImg,
                photo: finalImg,
                images: finalImg ? [finalImg] : []
            };
        });

        const totalPages = Math.ceil(total / limitNum) || 1;
        return res.status(200).json({
            success: true,
            total,
            count: itemsList.length,
            items: itemsList,
            products: itemsList,
            data: itemsList,
            pagination: {
                total,
                total_pages: totalPages,
                current_page: pageNum,
                limit: limitNum,
                has_next: pageNum < totalPages,
                has_prev: pageNum > 1
            }
        });
    } catch (err) {
        console.error('Error fetching items/products:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch items', message: err.message });
    }
}

/**
 * GET /api/items/:id & /api/products/:id & /items/:id & /products/:id
 * Resolves by item_id (single product) or vendor_id (returns vendor catalog)
 */
async function getItemOrProductById(req, res, next) {
    try {
        const idParam = req.params.id || req.params.itemId || req.params.productId;
        if (!idParam) return res.status(400).json({ success: false, error: 'ID is required' });

        // 1. First, check if this ID is an item in the items table
        const itemRes = await query(
            `SELECT i.*, v.store_name, v.vendor_name, v.phone_number as vendor_phone, v.address as vendor_address, v.status as vendor_status
             FROM items i
             LEFT JOIN vendors v ON i.vendor_id = v.vendor_id
             WHERE i.item_id = ? OR CAST(i.item_id AS TEXT) = ?`,
            [idParam, String(idParam)]
        ).catch(() => ({ rows: [] }));

        if (itemRes.rows && itemRes.rows.length > 0) {
            const i = itemRes.rows[0];
            const finalImg = typeof normalizeImageUrl === 'function' ? normalizeImageUrl(i.image_url, DEFAULT_PRODUCT_SERVICE_IMAGE) : (i.image_url || DEFAULT_PRODUCT_SERVICE_IMAGE);
            const stockNum = i.stock !== null && i.stock !== undefined ? Math.max(0, Number(i.stock)) : 0;
            const isAvail = (i.is_available === true || i.is_available === 1 || i.is_available === '1' || i.is_available === null || i.is_available === undefined);
            const inStock = Boolean(i.in_stock) && stockNum > 0 && isAvail;
            const cleanItem = {
                ...i,
                item_id: Number(i.item_id),
                id: Number(i.item_id),
                vendor_id: Number(i.vendor_id),
                price: Number(i.price || 0),
                unit_price: Number(i.price || 0),
                name: i.item_name,
                stock: stockNum,
                available_quantity: stockNum,
                max_quantity: stockNum,
                unit: i.unit || 'piece',
                in_stock: inStock,
                is_available: inStock,
                image_url: finalImg,
                image: finalImg,
                imageUrl: finalImg,
                photo_url: finalImg,
                photo: finalImg,
                images: finalImg ? [finalImg] : []
            };
            return res.status(200).json({
                success: true,
                item: cleanItem,
                product: cleanItem,
                data: cleanItem
            });
        }

        // 2. If not found in items, check if this ID is a vendor ID!
        // Many frontend clients call /products/:vendorId or /items/:vendorId to fetch vendor catalog!
        const vendorCheck = await query(
            `SELECT vendor_id FROM vendors WHERE vendor_id = ? OR public_id = ? OR CAST(vendor_id AS TEXT) = ?`,
            [idParam, String(idParam), String(idParam)]
        ).catch(() => ({ rows: [] }));

        if (vendorCheck.rows && vendorCheck.rows.length > 0) {
            req.params.vendorId = vendorCheck.rows[0].vendor_id;
            return getVendorStorefront(req, res);
        }

        return res.status(404).json({
            success: false,
            error: `Item or Entity with ID "${idParam}" not found`
        });
    } catch (err) {
        console.error('Error fetching item/product by ID:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch item details', message: err.message });
    }
}

/**
 * GET /api/items/:id/stock or /api/products/:id/stock
 * Lightweight endpoint to quickly check the real-time stock of a single item
 */
async function getItemStock(req, res) {
    try {
        const itemId = req.params.id || req.params.itemId || req.params.productId;
        if (!itemId) {
            return res.status(400).json({ success: false, error: 'Item ID is required' });
        }

        const itemRes = await query(
            `SELECT item_id, vendor_id, item_name, price, stock, unit, in_stock, is_available FROM items WHERE item_id = ?`,
            [itemId]
        );

        if (!itemRes.rows || itemRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Item #${itemId} not found` });
        }

        const item = itemRes.rows[0];
        const stockNum = item.stock !== null && item.stock !== undefined ? Math.max(0, Number(item.stock)) : 0;
        const isAvail = (item.is_available === true || item.is_available === 1 || item.is_available === '1' || item.is_available === null || item.is_available === undefined);
        const inStock = Boolean(item.in_stock) && stockNum > 0 && isAvail;

        return res.status(200).json({
            success: true,
            item_id: Number(item.item_id),
            item_name: item.item_name,
            vendor_id: Number(item.vendor_id),
            price: Number(item.price || 0),
            unit: item.unit || 'piece',
            stock: stockNum,
            available_quantity: stockNum,
            max_quantity: stockNum,
            in_stock: inStock,
            is_available: inStock
        });
    } catch (err) {
        console.error('Error fetching item stock:', err);
        return res.status(500).json({ success: false, error: 'Failed to fetch item stock', message: err.message });
    }
}

module.exports = {
    getSocietyVendorsStorefront,
    getVendorStorefront,
    searchVendorsLocationAware,
    getLocations,
    getCategories,
    getItems,
    getItemOrProductById,
    getItemStock
};

const vendorService = require('../../services/vendorService');
const { query } = require('../../models/db');
const { normalizeImageUrl, resolveImageUrl, DEFAULT_PRODUCT_SERVICE_IMAGE } = require('../../utils/imageUtils');
const { recordVendorFieldChanges } = require('../../services/vendorDiffService');
const {
    validateBankDetailsPayload,
    maskAccountNumber,
    getVendorPaymentEligibility
} = require('../../services/paymentEligibilityService');

const fs = require('fs');
const path = require('path');

/**
 * Helper: Resolve backend base URL, strictly enforcing HTTPS on Render / Production
 */
function getBaseUrl(req) {
    const host = req.get('host') || '';
    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https' || host.includes('onrender.com');
    const proto = isHttps ? 'https' : (req.protocol || 'http');
    return `${proto}://${host}`;
}

/**
 * Helper: Save Base64 Image payload to public/uploads directory and return hosted image URL
 */
function processBase64Upload(req) {
    const body = req.body || {};
    let rawBase64 = body.base64 || body.image_base64 || body.file_base64 || body.logo_base64 || body.data;

    if (!rawBase64) {
        const candidate = body.image || body.logo || body.file || body.logo_url || body.image_url;
        if (typeof candidate === 'string' && candidate.length > 100 && !candidate.startsWith('http://') && !candidate.startsWith('https://')) {
            rawBase64 = candidate;
        }
    }

    if (!rawBase64 || typeof rawBase64 !== 'string') {
        return null;
    }

    let cleanBase64 = rawBase64.trim();
    let mimeType = body.fileType || body.filetype || body.mimetype || body.mime_type || 'image/jpeg';
    let filenameHint = body.filename || body.original_name || body.name || '';
    let ext = 'jpg';

    // Data URI format: e.g. data:image/png;base64,iVBORw0KGgo...
    const dataUriMatch = cleanBase64.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/i);
    if (dataUriMatch) {
        mimeType = dataUriMatch[1];
        cleanBase64 = dataUriMatch[2];
        ext = mimeType.split('/')[1] || 'jpg';
        if (ext === 'jpeg') ext = 'jpg';
    } else {
        if (filenameHint && filenameHint.includes('.')) {
            ext = filenameHint.split('.').pop().toLowerCase();
        } else if (mimeType) {
            ext = mimeType.split('/')[1] || 'jpg';
            if (ext === 'jpeg') ext = 'jpg';
        }
    }

    // Sanitize extension - React Native natively supports jpg, png, webp, gif. Map avif/heic/heif to jpg
    const validExts = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (ext === 'avif' || ext === 'heic' || ext === 'heif' || !validExts.includes(ext)) {
        ext = 'jpg';
    }
    if (ext === 'jpeg') ext = 'jpg';

    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 10000);
    const savedFilename = `upload-${timestamp}-${randomSuffix}.${ext}`;

    const uploadDir = path.join(__dirname, '../../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, savedFilename);
    const buffer = Buffer.from(cleanBase64, 'base64');
    fs.writeFileSync(filePath, buffer);

    const baseUrl = getBaseUrl(req);
    const imageUrl = `${baseUrl}/uploads/${savedFilename}`;

    return {
        filename: savedFilename,
        image_url: imageUrl,
        logo_url: imageUrl,
        logo: imageUrl,
        size: buffer.length,
        mimetype: mimeType,
        original_name: filenameHint || savedFilename
    };
}

/**
 * POST /api/vendorPanel/upload-image - Upload item / shop logo image
 * Supports: 
 * 1. Multipart form-data file uploads (camera, gallery, files)
 * 2. Base64 JSON payloads ({ base64, fileType, filename } or { image_base64 })
 * 3. Direct image_url / logo_url string
 */
function uploadImage(req, res) {
    // 1. Check multipart form-data file
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (file) {
        const baseUrl = getBaseUrl(req);
        const imageUrl = `${baseUrl}/uploads/${file.filename}`;
        return res.json({
            success: true,
            image_url: imageUrl,
            logo_url: imageUrl,
            logo: imageUrl,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            original_name: file.originalname || 'shop_logo'
        });
    }

    // 2. Check base64 string payload in req.body
    const base64Result = processBase64Upload(req);
    if (base64Result) {
        return res.json({
            success: true,
            ...base64Result
        });
    }

    // 3. Check direct image_url / logo_url string
    const bodyUrl = req.body?.image_url || req.body?.logo_url || req.body?.logo || req.body?.image;
    if (bodyUrl && typeof bodyUrl === 'string' && (bodyUrl.startsWith('http://') || bodyUrl.startsWith('https://') || bodyUrl.startsWith('/uploads/'))) {
        return res.json({
            success: true,
            image_url: bodyUrl,
            logo_url: bodyUrl,
            logo: bodyUrl
        });
    }

    return res.status(400).json({
        error: 'No image file, base64 payload, or URL received.',
        hint: 'Send a file via multipart form-data, a base64 string (JSON key base64, image_base64, or image), or image_url.',
        code: 'NO_FILE_RECEIVED'
    });
}

/**
 * POST/PUT /api/vendorPanel/:vendorId/logo or /api/vendors/:vendorId/logo - Directly upload & set shop logo
 */
async function updateVendorLogo(req, res) {
    try {
        const vendorId = req.params.vendorId || req.user?.vendor_id || req.user?.id;
        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID is required' });
        }

        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        let logoUrl = null;

        if (file) {
            const baseUrl = getBaseUrl(req);
            logoUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const base64Result = processBase64Upload(req);
            if (base64Result) {
                logoUrl = base64Result.logo_url;
            } else {
                logoUrl = req.body?.logo_url || req.body?.logo || req.body?.image_url || req.body?.image;
            }
        }

        if (!logoUrl) {
            return res.status(400).json({ error: 'Please provide a logo image file (multipart form-data), base64 string, or logo_url string' });
        }

        await query(`UPDATE vendors SET logo = ?, shop_image = ? WHERE vendor_id = ? OR public_id = ?`, [logoUrl, logoUrl, vendorId, String(vendorId)]);
        const memoryCache = require('../../utils/cache');
        memoryCache.clear();

        res.status(200).json({
            success: true,
            message: 'Shop logo updated successfully!',
            vendor_id: vendorId,
            logo: logoUrl,
            logo_url: logoUrl,
            shop_image: logoUrl
        });
    } catch (err) {
        console.error('Error updating vendor logo:', err);
        res.status(500).json({ error: err.message || 'Failed to update shop logo' });
    }
}

/**
 * GET /api/vendorPanel/:vendorId - Full vendor dashboard data
 */
async function getDashboard(req, res) {
    try {
        const { vendorId } = req.params;
        const dashboardData = await vendorService.getVendorDashboard(vendorId);

        if (!dashboardData) {
            return res.status(404).json({ error: 'Vendor not found' });
        }

        res.status(200).json(dashboardData);
    } catch (err) {
        console.error('Error fetching vendor panel:', err);
        res.status(500).json({ error: 'Failed to fetch vendor panel data' });
    }
}

/**
 * GET /api/vendorPanel/:vendorId/purchases & /my-orders - Vendor B2B / B2C purchases from other vendors
 */
async function getVendorPurchases(req, res) {
    try {
        const vendorId = req.params.vendorId || req.params.id;
        const purchases = await vendorService.getVendorPurchases(vendorId);

        res.status(200).json({
            code: 200,
            status: 'success',
            message: 'Vendor purchases retrieved successfully.',
            data: purchases
        });
    } catch (err) {
        console.error('Error fetching vendor purchases:', err);
        res.status(500).json({ code: 500, status: 'error', error: 'Failed to fetch vendor purchases', details: err.message });
    }
}


/**
 * POST /api/vendorPanel/:vendorId/items - Add item
 */
async function addItem(req, res) {
    try {
        const { vendorId } = req.params;

        // Verify if vendor is allowed to add catalog items (Product vs Service split)
        const vendorCheck = await query(`SELECT vendor_type, can_add_items FROM vendors WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`, [vendorId, String(vendorId)]);
        if (vendorCheck.rows && vendorCheck.rows.length > 0) {
            const v = vendorCheck.rows[0];
            if (v.can_add_items === false || v.vendor_type === 'service') {
                return res.status(403).json({
                    error: 'Item catalog is disabled for Service Providers. Service requests are managed via the Service Enquiries panel.',
                    can_add_items: false,
                    vendor_type: v.vendor_type
                });
            }
        }

        const { item_name, description, price, stock, category, unit, is_available } = req.body || {};
        const rawImg = req.body?.image_url || req.body?.imageUrl || req.body?.image || req.body?.item_image || req.body?.itemImage || req.body?.photo || req.body?.photo_url;

        // Check if file was uploaded via multipart/form-data (camera/gallery)
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        let uploadedUrl = null;
        if (file) {
            const baseUrl = getBaseUrl(req);
            uploadedUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const base64Result = processBase64Upload(req);
            if (base64Result) {
                uploadedUrl = base64Result.image_url;
            }
        }

        const avail = (is_available === false || is_available === 0 || is_available === 'false' || is_available === '0') ? 0 : 1;
        const candidateImg = uploadedUrl || rawImg;

        // Use async resolveImageUrl with DEFAULT_PRODUCT_SERVICE_IMAGE fallback
        const normalizedImg = await resolveImageUrl(candidateImg, DEFAULT_PRODUCT_SERVICE_IMAGE);

        const result = await query(
            `INSERT INTO items (vendor_id, item_name, description, price, stock, category, unit, is_available, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING item_id, image_url`,
            [vendorId, item_name, description || '', price, stock || 50, category || 'General', unit || 'piece', avail, normalizedImg]
        );

        const insertedId = result.rows && result.rows[0] ? result.rows[0].item_id : result.insertId;
        const savedImg = result.rows && result.rows[0] ? result.rows[0].image_url : normalizedImg;

        res.status(201).json({
            success: true,
            message: 'Item added successfully',
            item_id: insertedId,
            image_url: savedImg
        });
    } catch (err) {
        console.error('Error adding item:', err);
        res.status(500).json({ error: 'Failed to add item', details: err.message });
    }
}

/**
 * PUT /api/vendorPanel/:vendorId/items/:itemId - Edit item or toggle availability or update photo
 */
async function updateItem(req, res) {
    try {
        const { vendorId, itemId } = req.params;
        const { item_name, description, price, stock, category, unit, is_available } = req.body || {};
        const rawImg = req.body?.image_url || req.body?.imageUrl || req.body?.image || req.body?.item_image || req.body?.itemImage || req.body?.photo || req.body?.photo_url;

        // Check if file was uploaded via multipart/form-data (camera/gallery)
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        let uploadedUrl = null;
        if (file) {
            const baseUrl = getBaseUrl(req);
            uploadedUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const base64Result = processBase64Upload(req);
            if (base64Result) {
                uploadedUrl = base64Result.image_url;
            }
        }

        const candidateImg = uploadedUrl || rawImg;
        const normalizedImg = candidateImg !== undefined ? await resolveImageUrl(candidateImg, DEFAULT_PRODUCT_SERVICE_IMAGE) : undefined;

        // Dynamic SQL builder to update ONLY provided fields
        const fields = [];
        const params = [];

        if (item_name !== undefined) {
            fields.push('item_name = ?');
            params.push(item_name);
        }
        if (description !== undefined) {
            fields.push('description = ?');
            params.push(description);
        }
        if (price !== undefined) {
            fields.push('price = ?');
            params.push(price);
        }
        if (stock !== undefined) {
            const stockVal = Math.max(0, parseInt(stock, 10) || 0);
            fields.push('stock = ?');
            params.push(stockVal);
            if (is_available === undefined) {
                const autoAvail = stockVal > 0 ? 1 : 0;
                fields.push('is_available = ?');
                params.push(autoAvail);
                fields.push('in_stock = ?');
                params.push(stockVal > 0);
            }
        }
        if (category !== undefined) {
            fields.push('category = ?');
            params.push(category);
        }
        if (unit !== undefined) {
            fields.push('unit = ?');
            params.push(unit);
        }
        if (is_available !== undefined) {
            const availVal = (is_available === true || is_available === 1 || is_available === 'true' || is_available === '1') ? 1 : 0;
            fields.push('is_available = ?');
            params.push(availVal);
        }
        if (normalizedImg !== undefined) {
            fields.push('image_url = ?');
            params.push(normalizedImg);
        }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update' });
        }

        params.push(itemId, vendorId, String(vendorId));
        const updateSql = `UPDATE items SET ${fields.join(', ')} WHERE item_id = ? AND (vendor_id = ? OR CAST(vendor_id AS TEXT) = ?) RETURNING *`;

        const updateRes = await query(updateSql, params);

        if (updateRes.rows && updateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found for this vendor' });
        }

        const updatedItem = updateRes.rows ? updateRes.rows[0] : null;

        res.status(200).json({
            success: true,
            message: 'Item updated successfully',
            image_url: updatedItem?.image_url || normalizedImg,
            item: updatedItem
        });
    } catch (err) {
        console.error('Error updating item:', err);
        res.status(500).json({ error: 'Failed to update item', details: err.message });
    }
}

/**
 * POST/PUT /api/vendorPanel/:vendorId/items/:itemId/image or /photo
 * Dedicated endpoint for uploading or updating an item's photo directly from camera or gallery
 */
async function updateItemImage(req, res) {
    try {
        const { vendorId, itemId } = req.params;

        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        let imageUrl = null;

        if (file) {
            const baseUrl = getBaseUrl(req);
            imageUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const base64Result = processBase64Upload(req);
            if (base64Result) {
                imageUrl = base64Result.image_url;
            } else {
                imageUrl = req.body?.image_url || req.body?.imageUrl || req.body?.image || req.body?.photo || req.body?.photo_url;
            }
        }

        if (!imageUrl) {
            return res.status(400).json({
                error: 'No image provided. Please send a file via multipart form-data (field: file, image, or photo), base64 string, or image_url string.',
                code: 'NO_IMAGE_PROVIDED'
            });
        }

        const normalizedImg = await resolveImageUrl(imageUrl, DEFAULT_PRODUCT_SERVICE_IMAGE);

        const updateRes = await query(
            `UPDATE items SET image_url = ? WHERE item_id = ? AND (vendor_id = ? OR CAST(vendor_id AS TEXT) = ?) RETURNING *`,
            [normalizedImg, itemId, vendorId, String(vendorId)]
        );

        if (updateRes.rows && updateRes.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found for this vendor' });
        }

        res.status(200).json({
            success: true,
            message: 'Item photo updated successfully',
            vendor_id: vendorId,
            item_id: itemId,
            image_url: normalizedImg,
            item: updateRes.rows ? updateRes.rows[0] : undefined
        });
    } catch (err) {
        console.error('Error updating item photo:', err);
        res.status(500).json({ error: 'Failed to update item photo', details: err.message });
    }
}

/**
 * POST /api/vendorPanel/items/upload-image - Standalone image upload for mobile app
 */
async function uploadItemImage(req, res) {
    try {
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        let imageUrl = null;
        if (file) {
            const baseUrl = getBaseUrl(req);
            imageUrl = `${baseUrl}/uploads/${file.filename}`;
        } else {
            const base64Result = processBase64Upload(req);
            if (base64Result) {
                imageUrl = base64Result.image_url;
            } else {
                imageUrl = req.body?.image_url || req.body?.imageUrl || req.body?.image || req.body?.photo;
            }
        }
        if (!imageUrl) {
            return res.status(400).json({ error: 'No image provided', code: 'NO_IMAGE_PROVIDED' });
        }
        res.status(200).json({
            success: true,
            imageUrl,
            image_url: imageUrl,
            message: 'Image uploaded successfully'
        });
    } catch (err) {
        console.error('Error uploading item image:', err);
        res.status(500).json({ error: 'Failed to upload image', details: err.message });
    }
}

/**
 * DELETE /api/vendorPanel/:vendorId/items/:itemId - Delete item
 */
async function deleteItem(req, res) {
    try {
        const { vendorId, itemId } = req.params;
        await query(`DELETE FROM items WHERE item_id = ? AND vendor_id = ?`, [itemId, vendorId]);
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete item' });
    }
}

/**
 * PATCH/PUT /api/vendorPanel/items/:itemId/availability
 */
async function toggleAvailability(req, res) {
    try {
        const itemId = req.params.itemId;
        const vendorId = req.params.vendorId || req.user?.id;
        const in_stock = req.body.in_stock !== undefined ? req.body.in_stock : req.body.is_available;
        const availVal = (in_stock === true || in_stock === 1 || in_stock === 'true') ? true : false;

        if (vendorId) {
            await query(`UPDATE items SET in_stock = ?, is_available = ? WHERE item_id = ? AND vendor_id = ?`, [availVal, availVal ? 1 : 0, itemId, vendorId]);
        } else {
            await query(`UPDATE items SET in_stock = ?, is_available = ? WHERE item_id = ?`, [availVal, availVal ? 1 : 0, itemId]);
        }

        res.status(200).json({ message: 'Availability status updated successfully' });
    } catch (err) {
        console.error('Error toggling item availability:', err);
        res.status(500).json({ error: 'Failed to update item availability' });
    }
}

/**
 * PUT /api/vendorPanel/:vendorId/settings & /profile - Update store settings / profile
 */
async function updateSettings(req, res) {
    try {
        const { vendorId } = req.params;
        const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
        if (file) {
            const baseUrl = getBaseUrl(req);
            const uploadedUrl = `${baseUrl}/uploads/${file.filename}`;
            req.body = req.body || {};
            req.body.logo = uploadedUrl;
            req.body.logo_url = uploadedUrl;
            req.body.shop_image = uploadedUrl;
        }
        const result = await vendorService.updateStoreSettings(vendorId, req.body);
        res.status(200).json({
            message: 'Store profile & settings updated successfully',
            success: true,
            logo: result.logo,
            logo_url: result.logo,
            shop_image: result.logo,
            vendor: result.vendor,
            data: result.vendor
        });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: err.message || 'Failed to update store settings' });
    }
}

/**
 * POST /api/vendorPanel/:vendorId/renew - Renew vendor subscription (₹5,999/yr, online payment only, coupons)
 */
async function renewSubscription(req, res) {
    try {
        const { vendorId } = req.params;
        const { payment_method, transaction_id } = req.body;

        const result = await vendorService.renewSubscription(vendorId, payment_method, transaction_id, req.body);

        res.status(200).json({
            success: true,
            message: 'Subscription renewed successfully for 1 year!',
            start_date: result.startDateStr,
            end_date: result.endDateStr,
            final_price: result.final_price,
            discount_amount: result.discount_amount,
            coupon_applied: result.coupon_applied
        });
    } catch (err) {
        console.error('Error renewing subscription:', err);
        res.status(400).json({ success: false, error: err.message || 'Failed to renew subscription' });
    }
}

/**
 * POST /api/vendorPanel/:vendorId/fcm-token or /api/vendors/fcm-token
 */
async function registerFcmToken(req, res) {
    try {
        const vendorId = req.params.vendorId || req.user?.vendor_id || req.user?.id || req.body?.vendor_id;
        const pushToken = req.body?.push_token || req.body?.pushToken || req.body?.fcm_token || req.body?.fcmToken || req.body?.device_token || req.body?.deviceToken;
        const platform = req.body?.platform || 'android';

        if (!pushToken) {
            return res.status(400).json({ success: false, error: 'push_token is required' });
        }

        const notificationService = require('../../services/notificationService');
        await notificationService.registerVendorFcmToken(vendorId, pushToken, platform);

        res.status(200).json({ success: true, message: 'Push token updated successfully', vendor_id: vendorId, push_token: pushToken });
    } catch (err) {
        console.error('Error registering push token:', err);
        res.status(500).json({ success: false, error: 'Failed to register push token: ' + err.message });
    }
}


/**
 * DELETE /api/vendorPanel/:vendorId/fcm-token or /api/vendors/fcm-token
 */
async function deleteFcmToken(req, res) {
    try {
        const vendorId = req.params.vendorId || req.user?.vendor_id || req.user?.id;
        const notificationService = require('../../services/notificationService');
        await notificationService.unregisterVendorFcmToken(vendorId);

        res.status(200).json({ message: 'FCM token removed successfully' });
    } catch (err) {
        console.error('Error removing FCM token:', err);
        res.status(500).json({ error: 'Failed to remove FCM token' });
    }
}

/**
 * POST /api/vendors/test-push
 * Test push notification pipeline for a vendor from backend
 */
async function testPushNotification(req, res) {
    try {
        const vendorId = req.body?.vendor_id || req.params?.vendorId || req.user?.vendor_id || 1;
        const customToken = req.body?.push_token || req.body?.pushToken;

        const notificationService = require('../../services/notificationService');

        if (customToken) {
            await notificationService.registerVendorFcmToken(vendorId, customToken);
        }

        const result = await notificationService.notifyVendorNewOrder({
            vendor_id: vendorId,
            order_id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
            total_amount: 150.00,
            customer_name: 'Test Resident',
            items_count: 1,
            items: [{ item_name: 'Test Milk Pouch', price: 150.00, quantity: 1 }]
        });

        res.status(200).json({
            success: result.success !== false,
            vendor_id: vendorId,
            push_result: result
        });
    } catch (err) {
        console.error('Error executing test push:', err);
        res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * DELETE /api/vendorPanel/:vendorId or /api/vendorPanel/:vendorId/store - Delete vendor store
 */
async function deleteStore(req, res) {
    try {
        const vendorId = req.params.vendorId || req.user?.vendor_id || req.user?.id;
        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID is required' });
        }

        const result = await vendorService.deleteVendorStore(vendorId);

        res.status(200).json({
            success: true,
            message: `Vendor store "${result.store_name}" (ID: ${result.vendor_id}) and associated items deleted successfully.`,
            vendor_id: result.vendor_id
        });
    } catch (err) {
        console.error('Error deleting vendor store:', err);
        const status = err.message === 'Vendor store not found' ? 404 : 500;
        res.status(status).json({ error: err.message || 'Failed to delete vendor store' });
    }
}


/**
 * PUT /api/vendorPanel/:vendorId/coverage or /api/vendors/:vendorId/coverage
 * Updates vendor baseline location type, global coverage toggle, delivery radius, and zone selections.
 */
async function updateVendorCoverage(req, res) {
    try {
        const vendorId = req.params.vendorId || req.params.id || req.user?.vendor_id || req.user?.id;
        if (!vendorId) {
            return res.status(400).json({ error: 'Vendor ID is required' });
        }

        const { location_address, address, location, area, city, state, pincode } = req.body;

        const vendorCheck = await query(`SELECT vendor_id FROM vendors WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`, [vendorId, String(vendorId)]);
        if (!vendorCheck.rows || vendorCheck.rows.length === 0) {
            return res.status(404).json({ error: `Vendor with ID "${vendorId}" not found` });
        }
        const actualVendorId = vendorCheck.rows[0].vendor_id;

        const updateFields = [];
        const updateParams = [];

        const newLoc = String(location || area || location_address || address || '').trim();
        if (newLoc) {
            updateFields.push('location = ?');
            updateParams.push(newLoc);
            updateFields.push('area = ?');
            updateParams.push(newLoc);
            updateFields.push('location_address = ?');
            updateParams.push(newLoc);
        }

        if (city !== undefined) {
            updateFields.push('city = ?');
            updateParams.push(String(city).trim());
        }

        if (state !== undefined) {
            updateFields.push('state = ?');
            updateParams.push(String(state).trim());
        }

        if (pincode !== undefined) {
            updateFields.push('pincode = ?');
            updateParams.push(String(pincode).trim());
        }

        if (updateFields.length > 0) {
            updateParams.push(actualVendorId);
            await query(`UPDATE vendors SET ${updateFields.join(', ')} WHERE vendor_id = ?`, updateParams);
        }

        const memoryCache = require('../../utils/cache');
        memoryCache.clear();

        const updatedVendorRes = await query(
            `SELECT vendor_id, location, area, city, state, pincode, location_address FROM vendors WHERE vendor_id = ?`,
            [actualVendorId]
        );
        const v = updatedVendorRes.rows[0] || {};

        res.status(200).json({
            success: true,
            message: 'Vendor location settings updated successfully',
            vendor_id: Number(v.vendor_id),
            area: v.area || v.location || '',
            location: v.location || v.area || '',
            city: v.city || '',
            state: v.state || '',
            pincode: v.pincode || '',
            location_address: v.location_address || ''
        });
    } catch (err) {
        console.error('Error updating vendor location:', err);
        res.status(500).json({ error: err.message || 'Failed to update vendor location settings' });
    }
}


async function updatePaymentDetails(req, res) {
    try {
        const authVendorId = req.user?.vendor_id || req.user?.id || req.user?.vendorId;
        const requestedId = req.params.vendorId || req.body.vendor_id || req.body.vendorId || authVendorId;
        const body = req.body || {};

        if (!requestedId) {
            return res.status(400).json({ error: 'Vendor ID is required to update payment details.' });
        }

        // IDOR Authorization verification
        const isAdmin = ['admin', 'super_admin', 'sub_admin'].includes(String(req.user?.role || '').toLowerCase());
        if (authVendorId && !isAdmin && String(authVendorId) !== String(requestedId)) {
            return res.status(403).json({
                success: false,
                error: 'Forbidden: You do not have permission to modify another vendor\'s payment details (IDOR Protection)',
                code: 'VENDOR_IDOR_VIOLATION',
                error_code: 'FORBIDDEN_VENDOR_ACCESS'
            });
        }

        const existing = await query(`SELECT * FROM vendors WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?`, [requestedId, String(requestedId)]);
        if (!existing.rows || existing.rows.length === 0) {
            return res.status(404).json({ error: `Vendor ID "${requestedId}" not found.` });
        }

        const currentVendor = existing.rows[0];
        const actualVendorId = Number(currentVendor.vendor_id);
        await recordVendorFieldChanges(actualVendorId, currentVendor, body);

        const hasAccountInBody = body.account_number !== undefined || body.bank_account_number !== undefined || body.accountNumber !== undefined;
        const hasIfscInBody = body.ifsc_code !== undefined || body.ifsc !== undefined || body.ifscCode !== undefined;
        const hasHolderInBody = body.account_holder_name !== undefined || body.accountHolderName !== undefined;
        const hasBankNameInBody = body.bank_name !== undefined || body.bankName !== undefined;

        let finalAccountNumber = currentVendor.account_number;
        let finalIfscCode = currentVendor.ifsc_code;
        let finalBankName = currentVendor.bank_name;
        let finalHolderName = currentVendor.account_holder_name;

        // Check if vendor is explicitly clearing / removing bank details
        const isClearingBank = (
            (hasAccountInBody && !String(body.account_number || body.bank_account_number || body.accountNumber || '').trim()) &&
            (hasIfscInBody && !String(body.ifsc_code || body.ifsc || body.ifscCode || '').trim())
        );

        if (isClearingBank) {
            finalAccountNumber = null;
            finalIfscCode = null;
            finalBankName = null;
            finalHolderName = null;
        } else if (hasAccountInBody || hasIfscInBody) {
            const rawAccount = body.account_number !== undefined ? body.account_number : (body.bank_account_number !== undefined ? body.bank_account_number : (body.accountNumber !== undefined ? body.accountNumber : currentVendor.account_number));
            const rawIfsc = body.ifsc_code !== undefined ? body.ifsc_code : (body.ifsc !== undefined ? body.ifsc : (body.ifscCode !== undefined ? body.ifscCode : currentVendor.ifsc_code));
            const rawHolder = body.account_holder_name !== undefined ? body.account_holder_name : (body.accountHolderName !== undefined ? body.accountHolderName : currentVendor.account_holder_name);
            const rawBank = body.bank_name !== undefined ? body.bank_name : (body.bankName !== undefined ? body.bankName : currentVendor.bank_name);

            const validation = validateBankDetailsPayload({
                account_number: rawAccount,
                ifsc_code: rawIfsc,
                account_holder_name: rawHolder,
                bank_name: rawBank
            });

            if (validation.hasBankDetails && !validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: validation.errors[0],
                    errors: validation.errors,
                    code: 'INVALID_BANK_DETAILS',
                    error_code: 'INVALID_BANK_DETAILS'
                });
            }

            finalAccountNumber = validation.normalized.account_number;
            finalIfscCode = validation.normalized.ifsc_code;
            finalBankName = validation.normalized.bank_name || currentVendor.bank_name;
            finalHolderName = validation.normalized.account_holder_name || currentVendor.account_holder_name || currentVendor.vendor_name;
        } else {
            if (hasHolderInBody) finalHolderName = String(body.account_holder_name || body.accountHolderName || '').trim() || null;
            if (hasBankNameInBody) finalBankName = String(body.bank_name || body.bankName || '').trim() || null;
        }

        const upi_id = body.upi_id !== undefined ? String(body.upi_id || '').trim() : (body.upi !== undefined ? String(body.upi || '').trim() : currentVendor.upi_id);
        const qr_code = body.qr_code !== undefined ? String(body.qr_code || '').trim() : (body.qr_code_url !== undefined ? String(body.qr_code_url || '').trim() : currentVendor.qr_code);

        const newAcc = account_number || currentVendor.account_number;
        const newIfsc = ifsc_code || currentVendor.ifsc_code;
        const hasBankNow = Boolean(String(newAcc || '').trim() && String(newIfsc || '').trim());
        const updatedMethods = JSON.stringify(hasBankNow ? ['COD', 'ONLINE', 'UPI'] : ['COD']);

        await query(
            `UPDATE vendors SET 
        account_number = COALESCE(NULLIF(?, ''), account_number),
        bank_account_number = COALESCE(NULLIF(?, ''), bank_account_number),
        ifsc_code = COALESCE(NULLIF(?, ''), ifsc_code),
        bank_name = COALESCE(NULLIF(?, ''), bank_name),
        account_holder_name = COALESCE(NULLIF(?, ''), account_holder_name),
        upi_id = COALESCE(NULLIF(?, ''), upi_id),
        qr_code = COALESCE(NULLIF(?, ''), qr_code),
        accepted_payment_methods = ?
      WHERE vendor_id = ?`,
            [account_number, account_number, ifsc_code, bank_name, account_holder_name, upi_id, qr_code, updatedMethods, vendorId]
        );

        // Recalculate live payment eligibility immediately after update
        const eligibility = await getVendorPaymentEligibility(actualVendorId);

        return res.status(200).json({
            success: true,
            message: 'Bank account and payment details updated successfully.',
            has_bank_details: hasBankNow,
            online_payment_available: hasBankNow,
            accepted_payment_methods: hasBankNow ? ['COD', 'ONLINE', 'UPI'] : ['COD'],
            payment_methods: hasBankNow ? ['COD', 'ONLINE', 'UPI'] : ['COD'],
            data: {
                vendor_id: Number(vendorId),
                account_number: newAcc,
                ifsc_code: newIfsc,
                bank_name,
                account_holder_name,
                upi_id,
                qr_code,
                qr_code_url: qr_code,
                has_bank_details: hasBankNow,
                online_payment_available: hasBankNow,
                accepted_payment_methods: hasBankNow ? ['COD', 'ONLINE', 'UPI'] : ['COD']
            }
        });
    } catch (err) {
        console.error('Error updating payment details:', err);
        return res.status(500).json({ error: 'Failed to update payment details.', details: err.message });
    }
}

/**
 * PATCH /api/vendorPanel/:vendorId/items/:itemId/stock
 * PUT /api/vendorPanel/:vendorId/items/:itemId/stock
 * Dedicated, lightweight endpoint for updating or adjusting an item's inventory stock count
 */
async function updateItemStock(req, res) {
    try {
        const { vendorId, itemId } = req.params;
        const rawStock = req.body.stock !== undefined ? req.body.stock : req.body.quantity;
        const stockChange = req.body.stock_change !== undefined ? req.body.stock_change : req.body.delta;

        if (rawStock === undefined && stockChange === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Either "stock" (absolute value) or "stock_change" (increment/decrement delta) is required'
            });
        }

        // Lookup item
        const itemRes = await query(
            `SELECT item_id, vendor_id, item_name, price, stock, in_stock, is_available FROM items WHERE item_id = ?`,
            [itemId]
        );

        if (!itemRes.rows || itemRes.rows.length === 0) {
            return res.status(404).json({ success: false, error: `Item #${itemId} not found` });
        }

        const item = itemRes.rows[0];
        if (vendorId && Number(item.vendor_id) !== Number(vendorId)) {
            return res.status(403).json({ success: false, error: 'Unauthorized: Item does not belong to this vendor' });
        }

        const currentStock = item.stock !== null && item.stock !== undefined ? Math.max(0, Number(item.stock)) : 0;
        let newStock = currentStock;

        if (rawStock !== undefined) {
            newStock = Math.max(0, parseInt(rawStock, 10) || 0);
        } else if (stockChange !== undefined) {
            newStock = Math.max(0, currentStock + (parseInt(stockChange, 10) || 0));
        }

        const autoInStock = newStock > 0;
        const autoAvail = newStock > 0 ? 1 : 0;

        await query(
            `UPDATE items 
       SET stock = ?,
           in_stock = ?,
           is_available = ?
       WHERE item_id = ?`,
            [newStock, autoInStock, autoAvail, itemId]
        );

        return res.status(200).json({
            success: true,
            message: `Stock updated successfully from ${currentStock} to ${newStock}`,
            item_id: Number(itemId),
            item_name: item.item_name,
            previous_stock: currentStock,
            stock: newStock,
            available_quantity: newStock,
            max_quantity: newStock,
            in_stock: autoInStock,
            is_available: autoInStock
        });
    } catch (err) {
        console.error('Error updating item stock:', err);
        return res.status(500).json({ success: false, error: 'Failed to update item stock', message: err.message });
    }
}

module.exports = {
    updatePaymentDetails,
    uploadImage,
    updateVendorLogo,
    getDashboard,
    getVendorPurchases,
    addItem,
    updateItem,
    updateItemImage,
    uploadItemImage,
    updateItemStock,
    deleteItem,
    updateSettings,
    renewSubscription,
    toggleAvailability,
    registerFcmToken,
    deleteFcmToken,
    testPushNotification,
    deleteStore,
    updateVendorCoverage
};

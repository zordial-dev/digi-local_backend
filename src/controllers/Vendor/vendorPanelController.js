const vendorService = require('../../services/vendorService');
const { query } = require('../../models/db');
const { normalizeImageUrl, resolveImageUrl } = require('../../utils/imageUtils');

/**
 * POST /api/vendorPanel/upload-image - Upload item image
 * Supports: camera photos (JPEG, HEIC, no-extension), gallery picks, file picker
 */
function uploadImage(req, res) {
    if (!req.file) {
        // Check if no file was sent at all vs. multer silently skipped it
        const contentType = req.headers['content-type'] || '';
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({
                error: 'Request must be multipart/form-data with field name "image"',
                hint: 'Set Content-Type: multipart/form-data and use field name "image" for the file',
                code: 'WRONG_CONTENT_TYPE'
            });
        }
        return res.status(400).json({
            error: 'No image file received. Send the photo with field name: image',
            hint: 'Make sure the field name is exactly "image" (not "photo", "file", "img", etc.)',
            code: 'NO_FILE_RECEIVED'
        });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.json({
        success: true,
        image_url: imageUrl,
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype,
        original_name: req.file.originalname || 'camera_photo'
    });
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
 * POST /api/vendorPanel/:vendorId/items - Add item
 */
async function addItem(req, res) {
    try {
        const { vendorId } = req.params;
        const { item_name, description, price, stock, category, unit, is_available } = req.body;
        const rawImg = req.body.image_url || req.body.imageUrl || req.body.image || req.body.item_image || req.body.itemImage || req.body.photo || req.body.photo_url;

        const avail = (is_available === false || is_available === 0) ? 0 : 1;

        // Use async resolveImageUrl so share.google, photos.app.goo.gl, etc. work correctly
        const normalizedImg = await resolveImageUrl(rawImg);

        const result = await query(
            `INSERT INTO items (vendor_id, item_name, description, price, stock, category, unit, is_available, image_url) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [vendorId, item_name, description || '', price, stock || 50, category || 'General', unit || 'piece', avail, normalizedImg]
        );

        res.status(201).json({ message: 'Item added successfully', item_id: result.insertId, image_url: normalizedImg });
    } catch (err) {
        console.error('Error adding item:', err);
        res.status(500).json({ error: 'Failed to add item' });
    }
}

/**
 * PUT /api/vendorPanel/:vendorId/items/:itemId - Edit item or toggle availability
 */
async function updateItem(req, res) {
    try {
        const { vendorId, itemId } = req.params;
        const { item_name, description, price, stock, category, unit, is_available } = req.body;
        const rawImg = req.body.image_url || req.body.imageUrl || req.body.image || req.body.item_image || req.body.itemImage || req.body.photo || req.body.photo_url;

        if (is_available !== undefined && item_name === undefined && !rawImg) {
            const availVal = (is_available === true || is_available === 1) ? 1 : 0;
            await query(`UPDATE items SET is_available = ? WHERE item_id = ? AND vendor_id = ?`, [availVal, itemId, vendorId]);
            return res.status(200).json({ message: 'Availability status updated successfully' });
        }

        const availVal = (is_available === true || is_available === 1) ? 1 : 0;

        // Use async resolveImageUrl so share.google, photos.app.goo.gl, etc. work correctly
        const normalizedImg = rawImg ? await resolveImageUrl(rawImg) : undefined;

        let sql = `UPDATE items SET item_name = ?, description = ?, price = ?, stock = ?, category = ?, unit = ?, is_available = ?`;
        const params = [item_name, description, price, stock, category, unit, availVal];

        if (normalizedImg) {
            sql += `, image_url = ?`;
            params.push(normalizedImg);
        }

        sql += ` WHERE item_id = ? AND vendor_id = ?`;
        params.push(itemId, vendorId);

        await query(sql, params);

        res.status(200).json({ message: 'Item updated successfully', image_url: normalizedImg });
    } catch (err) {
        console.error('Error updating item:', err);
        res.status(500).json({ error: 'Failed to update item' });
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
 * PUT /api/vendorPanel/:vendorId/settings - Update store settings
 */
async function updateSettings(req, res) {
    try {
        const { vendorId } = req.params;
        const result = await vendorService.updateStoreSettings(vendorId, req.body);
        res.status(200).json({ message: 'Store settings updated successfully', logo: result.logo });
    } catch (err) {
        console.error('Error updating settings:', err);
        res.status(500).json({ error: 'Failed to update store settings' });
    }
}

/**
 * POST /api/vendorPanel/:vendorId/renew - Renew vendor subscription
 */
async function renewSubscription(req, res) {
    try {
        const { vendorId } = req.params;
        const { payment_method, transaction_id } = req.body;

        const result = await vendorService.renewSubscription(vendorId, payment_method, transaction_id);

        res.status(200).json({
            message: 'Subscription renewed successfully for 1 year!',
            start_date: result.startDateStr,
            end_date: result.endDateStr
        });
    } catch (err) {
        console.error('Error renewing subscription:', err);
        res.status(500).json({ error: err.message || 'Failed to renew subscription' });
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

        res.status(200).json({ success: true, message: 'Push token updated successfully' });
    } catch (err) {
        console.error('Error registering push token:', err);
        res.status(500).json({ success: false, error: 'Failed to register push token' });
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

module.exports = {
    uploadImage,
    getDashboard,
    addItem,
    updateItem,
    deleteItem,
    updateSettings,
    renewSubscription,
    toggleAvailability,
    registerFcmToken,
    deleteFcmToken,
    deleteStore
};

const vendorService = require('../../services/vendorService');
const { query } = require('../../models/db');
const { normalizeImageUrl, resolveImageUrl } = require('../../utils/imageUtils');
const { recordVendorFieldChanges } = require('../../services/vendorDiffService');

/**
 * POST /api/vendorPanel/upload-image - Upload item image
 * Supports: camera photos (JPEG, HEIC, no-extension), gallery picks, file picker
 */
function uploadImage(req, res) {
    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);
    if (!file) {
        const bodyUrl = req.body?.image_url || req.body?.logo_url || req.body?.logo || req.body?.image;
        if (bodyUrl) {
            return res.json({
                success: true,
                image_url: bodyUrl,
                logo_url: bodyUrl,
                logo: bodyUrl
            });
        }
        return res.status(400).json({
            error: 'No image file or URL received.',
            hint: 'Upload camera/gallery photo via multipart form-data or pass image_url string.',
            code: 'NO_FILE_RECEIVED'
        });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const imageUrl = `${baseUrl}/uploads/${file.filename}`;

    res.json({
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
        let logoUrl = req.body?.logo_url || req.body?.logo || req.body?.image_url || req.body?.image;

        if (file) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            logoUrl = `${baseUrl}/uploads/${file.filename}`;
        }

        if (!logoUrl) {
            return res.status(400).json({ error: 'Please provide a logo image file (camera photo/gallery file) or logo_url string' });
        }

        await query(`UPDATE vendors SET logo = ? WHERE vendor_id = ? OR public_id = ?`, [logoUrl, vendorId, String(vendorId)]);
        const memoryCache = require('../../utils/cache');
        memoryCache.clear();

        res.status(200).json({
            success: true,
            message: 'Shop logo updated successfully!',
            vendor_id: vendorId,
            logo: logoUrl,
            logo_url: logoUrl
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
    const vendorId = req.params.vendorId || req.user?.vendorId || req.body.vendor_id || req.body.vendorId;
    const body = req.body || {};

    const account_number = String(body.account_number || body.bank_account_number || body.accountNumber || '').trim();
    const ifsc_code = String(body.ifsc_code || body.ifsc || body.ifscCode || '').trim().toUpperCase();
    const bank_name = String(body.bank_name || body.bankName || body.bank || '').trim();
    const account_holder_name = String(body.account_holder_name || body.accountHolderName || '').trim();
    const upi_id = String(body.upi_id || body.upiId || body.upi || '').trim();
    const qr_code_url = String(body.qr_code_url || body.qrCodeUrl || body.qr_code || '').trim();

    if (!vendorId) {
      return res.status(400).json({ error: 'Vendor ID is required to update payment details.' });
    }

    const existing = await query(`SELECT * FROM vendors WHERE vendor_id = ?`, [vendorId]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: `Vendor ID "${vendorId}" not found.` });
    }

    const currentVendor = existing.rows[0];
    await recordVendorFieldChanges(vendorId, currentVendor, body);

    await query(
      `UPDATE vendors SET 
        account_number = COALESCE(NULLIF(?, ''), account_number),
        bank_account_number = COALESCE(NULLIF(?, ''), bank_account_number),
        ifsc_code = COALESCE(NULLIF(?, ''), ifsc_code),
        ifsc = COALESCE(NULLIF(?, ''), ifsc),
        bank_name = COALESCE(NULLIF(?, ''), bank_name),
        account_holder_name = COALESCE(NULLIF(?, ''), account_holder_name),
        upi_id = COALESCE(NULLIF(?, ''), upi_id),
        qr_code_url = COALESCE(NULLIF(?, ''), qr_code_url)
      WHERE vendor_id = ?`,
      [account_number, account_number, ifsc_code, ifsc_code, bank_name, account_holder_name, upi_id, qr_code_url, vendorId]
    );

    return res.status(200).json({
      success: true,
      message: 'Bank account and payment details updated successfully.',
      data: {
        vendor_id: Number(vendorId),
        account_number,
        ifsc_code,
        bank_name,
        account_holder_name,
        upi_id,
        qr_code_url
      }
    });
  } catch (err) {
    console.error('Error updating payment details:', err);
    return res.status(500).json({ error: 'Failed to update payment details.', details: err.message });
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

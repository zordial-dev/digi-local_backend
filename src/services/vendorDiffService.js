const { query } = require('../models/db');

/**
 * Mapping of database/payload field names to human-readable labels for Admin Panel UI.
 */
const FIELD_LABELS = {
    gstin: 'GSTIN Number',
    pan_number: 'PAN Card Number',
    store_name: 'Store / Shop Name',
    vendor_name: 'Owner / Vendor Name',
    email: 'Email Address',
    phone_number: 'Mobile / Phone Number',
    area: 'Area / Locality / Society',
    city: 'City',
    state: 'State',
    pincode: 'Pincode',
    shop_number: 'Shop Number / Unit',
    address: 'Full Shop Address',
    shop_image: 'Shop Photo / Logo',
    category: 'Store Category',
    account_number: 'Bank Account Number',
    ifsc_code: 'Bank IFSC Code',
    bank_name: 'Bank Name',
    account_holder_name: 'Account Holder Name',
    upi_id: 'UPI ID',
    qr_code_url: 'UPI QR Code Image',
    whatsapp_number: 'WhatsApp Number',
    vendor_type: 'Vendor Type',
    accepted_payment_methods: 'Accepted Payment Methods',
    payment_instructions: 'Payment Instructions'
};

/**
 * Normalizes input value for robust comparison (handles null, undefined, whitespace, numbers, objects).
 */
function normalizeValue(val) {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val).trim();
}

/**
 * Compares old vendor record with incoming new data and logs modified fields to `vendor_reapplication_changes`.
 * 
 * @param {number|string} vendorId - Vendor ID
 * @param {Object} oldData - Previous vendor record object from database
 * @param {Object} newData - Incoming update payload object
 * @param {string} [batchId] - Optional batch identifier (defaults to ISO timestamp)
 * @returns {Promise<Array>} List of changed field objects logged
 */
async function recordVendorFieldChanges(vendorId, oldData = {}, newData = {}, batchId = null) {
    if (!vendorId) return [];

    const effectiveBatchId = batchId || new Date().toISOString();
    const changesDetected = [];

    const fieldKeys = Object.keys(FIELD_LABELS);

    for (const key of fieldKeys) {
        // Map alias keys if present in newData
        let newVal = newData[key];
        if (newVal === undefined) {
            if (key === 'vendor_name') newVal = newData.owner_name || newData.ownerName || newData.vendorName || newData.name;
            else if (key === 'store_name') newVal = newData.shop_name || newData.business_name || newData.storeName || newData.shopName;
            else if (key === 'phone_number') newVal = newData.mobile_number || newData.mobile || newData.phone || newData.phoneNumber;
            else if (key === 'gstin') newVal = newData.gst_number || newData.gstNumber || newData.gst;
            else if (key === 'pan_number') newVal = newData.pan || newData.panNumber;
            else if (key === 'area') newVal = newData.society_name || newData.location_name || newData.society;
            else if (key === 'shop_number') newVal = newData.shopNumber || newData.shop_no;
            else if (key === 'shop_image') newVal = newData.logo || newData.shopImage;
            else if (key === 'pincode') newVal = newData.pin_code || newData.pinCode;
            else if (key === 'whatsapp_number') newVal = newData.whatsapp || newData.merchant_whatsapp;
            else if (key === 'account_number') newVal = newData.bank_account_number || newData.accountNumber;
            else if (key === 'ifsc_code') newVal = newData.ifsc || newData.ifscCode;
            else if (key === 'bank_name') newVal = newData.bankName || newData.bank;
            else if (key === 'account_holder_name') newVal = newData.accountHolderName;
            else if (key === 'upi_id') newVal = newData.upiId || newData.upi;
            else if (key === 'qr_code_url') newVal = newData.qr_code || newData.upi_qr_code || newData.qrCodeUrl;
        }

        // If field was not provided in update payload, skip comparing it
        if (newVal === undefined) continue;

        let oldVal = oldData[key];

        // Format GSTIN / PAN to uppercase for accurate comparison
        if (key === 'gstin' || key === 'pan_number' || key === 'ifsc_code') {
            oldVal = String(oldVal || '').toUpperCase();
            newVal = String(newVal || '').toUpperCase();
        }

        const oldNorm = normalizeValue(oldVal);
        const newNorm = normalizeValue(newVal);

        // Compare old value with new value
        if (oldNorm !== newNorm) {
            const label = FIELD_LABELS[key] || key;
            changesDetected.push({
                field_name: key,
                field_label: label,
                old_value: oldNorm,
                new_value: newNorm,
                batch_id: effectiveBatchId
            });

            // Insert into vendor_reapplication_changes table
            await query(
                `INSERT INTO vendor_reapplication_changes (vendor_id, field_name, field_label, old_value, new_value, batch_id) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [vendorId, key, label, oldNorm, newNorm, effectiveBatchId]
            ).catch(err => {
                console.error(`Failed to log vendor diff for field ${key}:`, err.message);
            });
        }
    }

    return changesDetected;
}

/**
 * Retrieves vendor reapplication field changes from database.
 * 
 * @param {number|string} vendorId 
 * @returns {Promise<Object>} Formatted changed_fields map and changes_list array
 */
async function getVendorReapplicationDiffs(vendorId) {
    if (!vendorId) return { total_changed_fields: 0, changed_fields: {}, changes_list: [] };

    const res = await query(
        `SELECT change_id, vendor_id, field_name, field_label, old_value, new_value, changed_at, batch_id
         FROM vendor_reapplication_changes
         WHERE vendor_id = ? OR CAST(vendor_id AS TEXT) = ?
         ORDER BY changed_at DESC, change_id DESC`,
        [vendorId, String(vendorId)]
    );

    const rows = res.rows || [];

    // Group by field_name to get the most recent change for each field
    const changedFieldsMap = {};
    const changesList = [];
    const seenFields = new Set();

    for (const r of rows) {
        if (!seenFields.has(r.field_name)) {
            seenFields.add(r.field_name);

            changedFieldsMap[r.field_name] = {
                field_name: r.field_name,
                field_label: r.field_label,
                old_value: r.old_value || '',
                new_value: r.new_value || '',
                changed_at: r.changed_at,
                batch_id: r.batch_id
            };

            changesList.push({
                change_id: Number(r.change_id),
                field_name: r.field_name,
                field_label: r.field_label,
                old_value: r.old_value || '',
                new_value: r.new_value || '',
                changed_at: r.changed_at,
                batch_id: r.batch_id
            });
        }
    }

    return {
        total_changed_fields: changesList.length,
        changed_fields: changedFieldsMap,
        changes_list: changesList
    };
}

module.exports = {
    FIELD_LABELS,
    recordVendorFieldChanges,
    getVendorReapplicationDiffs
};

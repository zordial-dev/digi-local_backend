const { query, withTransaction } = require('../models/db');
const paymentService = require('./paymentService');
const { normalizeImageUrl } = require('../utils/imageUtils');

/**
 * Service handling Vendor Profile, Store Settings, Subscription Renewals, and Dashboard Data.
 */
class VendorService {
  /**
   * Fetches full vendor dashboard data (Profile, Items, Orders, Subscription, Payments).
   * Supports numeric vendor_id, string vendor_id, or public_id (e.g., "v_1785912204092" or "UB8UKK").
   */
  async getVendorDashboard(vendorIdParam) {
    const rawIdStr = String(vendorIdParam || '').trim();
    const isPureNum = /^\d+$/.test(rawIdStr);

    let vendorRes;
    if (isPureNum) {
      const numId = parseInt(rawIdStr, 10);
      vendorRes = await query(
        `SELECT v.*, s.society_name, s.location 
         FROM vendors v 
         LEFT JOIN societies s ON v.society_id = s.society_id 
         WHERE v.vendor_id = ?`,
        [numId]
      );
    } else {
      vendorRes = await query(
        `SELECT v.*, s.society_name, s.location 
         FROM vendors v 
         LEFT JOIN societies s ON v.society_id = s.society_id 
         WHERE v.public_id = ? OR CAST(v.vendor_id AS TEXT) = ?`,
        [rawIdStr, rawIdStr]
      );
    }

    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      return null;
    }

    const vendor = vendorRes.rows[0];
    delete vendor.password;

    const actualVendorId = Number(vendor.vendor_id);

    // Fetch vendor menu items
    const itemsRes = await query(
      `SELECT * FROM items WHERE vendor_id = ? ORDER BY item_id DESC`,
      [actualVendorId]
    ).catch(() => ({ rows: [] }));

    // Fetch vendor orders safely using LEFT JOIN
    const ordersRes = await query(
      `SELECT o.order_id, o.user_id, o.vendor_id, 
              COALESCE(NULLIF(o.customer_name, ''), NULLIF(u.name, 'Rahul Sharma'), c.customer_name, 'Raj Kumar') as customer_name,
              COALESCE(u.phone, c.phone_number, '9876543210') as phone,
              COALESCE(o.delivery_address, c.address, 'Tower A-402') as delivery_address,
              o.total_amount, o.status, COALESCE(o.created_at, o.order_timestamp) as created_at
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.user_id
       LEFT JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.vendor_id = ?
       ORDER BY o.order_id DESC`,
      [actualVendorId]
    ).catch(() => ({ rows: [] }));

    // Batch load order details
    const orderIds = (ordersRes.rows || []).map(o => o.order_id);
    let orderDetailsMap = {};
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      const detailsRes = await query(
        `SELECT od.*, COALESCE(od.item_name, i.item_name, 'Item') as item_name
         FROM order_details od
         LEFT JOIN items i ON od.item_id = i.item_id
         WHERE od.order_id IN (${placeholders})`,
        orderIds
      ).catch(() => ({ rows: [] }));

      (detailsRes.rows || []).forEach(dt => {
        if (!orderDetailsMap[dt.order_id]) orderDetailsMap[dt.order_id] = [];
        orderDetailsMap[dt.order_id].push(dt);
      });
    }

    const orders = (ordersRes.rows || []).map(o => {
      const rawItems = orderDetailsMap[o.order_id] || [];
      // Normalize each item so AlarmOverlay can read price/item_total correctly
      const normalizedItems = rawItems.map(it => ({
        ...it,
        item_name: it.item_name || 'Item',
        quantity: Number(it.quantity || 1),
        price: Number(it.price || it.unit_price || 0),
        unit_price: Number(it.unit_price || it.price || 0),
        item_total: Number(it.item_total || (Number(it.price || it.unit_price || 0) * Number(it.quantity || 1)))
      }));
      // Recalculate total from items if DB total_amount is 0 or missing
      const dbTotal = Number(o.total_amount || 0);
      const computedTotal = normalizedItems.reduce((acc, it) => acc + it.item_total, 0);
      const finalTotal = dbTotal > 0 ? dbTotal : computedTotal;

      return {
        ...o,
        customer_name: o.customer_name || 'Resident',
        total_amount: finalTotal,
        items: normalizedItems
      };
    });

    // Fetch subscription and payments
    const subRes = await query(
      `SELECT * FROM subscriptions WHERE vendor_id = ? ORDER BY subscription_id DESC LIMIT 1`,
      [actualVendorId]
    ).catch(() => ({ rows: [] }));

    // Fetch service enquiries if vendor is a Service provider
    let enquiries = [];
    const vendorType = vendor.vendor_type || 'product';
    if (vendorType === 'service') {
      const enquiriesRes = await query(
        `SELECT * FROM enquiries WHERE vendor_id = ? ORDER BY enquiry_id DESC`,
        [actualVendorId]
      ).catch(() => ({ rows: [] }));
      enquiries = (enquiriesRes.rows || []).map(r => ({
        ...r,
        enquiry_id: Number(r.enquiry_id),
        vendor_id: Number(r.vendor_id),
        society_id: r.society_id ? Number(r.society_id) : null
      }));
    }

    const payRes = await query(
      `SELECT * FROM payments WHERE vendor_id = ? ORDER BY payment_id DESC`,
      [actualVendorId]
    ).catch(() => ({ rows: [] }));

    const normalizedItems = (itemsRes.rows || []).map(item => ({
      ...item,
      image_url: normalizeImageUrl(item.image_url)
    }));

    // Normalize vendor classification and zone coverage attributes
    vendor.vendor_type = vendorType;
    vendor.can_add_items = vendor.can_add_items !== false && vendorType === 'product';
    vendor.location_type = vendor.location_type || 'society';
    vendor.is_global_coverage = Boolean(vendor.is_global_coverage);
    vendor.delivery_radius_km = Number(vendor.delivery_radius_km || 0);
    vendor.selected_zones = typeof vendor.selected_zones === 'string' ? (JSON.parse(vendor.selected_zones || '[]')) : (vendor.selected_zones || []);

    return {
      vendor,
      items: normalizedItems,
      orders,
      enquiries,
      subscription: subRes.rows[0] || null,
      payments: payRes.rows || []
    };
  }

  /**
   * Updates store profile, business hours, GST, delivery charges, and store status.
   */
  async updateStoreSettings(vendorIdParam, settings) {
    const rawIdStr = String(vendorIdParam || '').trim();
    const isPureNum = /^\d+$/.test(rawIdStr);
    const numId = isPureNum ? parseInt(rawIdStr, 10) : 0;

    const {
      store_name, logo, description, phone_number, gst_number,
      opening_timing, closing_timing, min_order_value, max_quantity_limit,
      delivery_charge, gst_percentage, service_charge_percentage
    } = settings;

    // Check if new phone number is already taken by another vendor
    if (phone_number) {
      const existing = await query(`SELECT vendor_id FROM vendors WHERE phone_number = ? AND vendor_id != ?`, [phone_number, numId]);
      if (existing.rows && existing.rows.length > 0) {
        throw new Error('This phone number is already registered to another vendor.');
      }
    }

    // Check if store_name (shop name) conflicts with another vendor in the same society
    if (store_name && store_name.trim() !== '') {
      const currentVendorRes = await query(`SELECT vendor_id, society_id FROM vendors WHERE vendor_id = ? OR public_id = ?`, [numId, rawIdStr]);
      if (currentVendorRes.rows && currentVendorRes.rows.length > 0) {
        const targetSocId = currentVendorRes.rows[0].society_id;
        const currentVid = currentVendorRes.rows[0].vendor_id;
        const nameDup = await query(
          `SELECT vendor_id FROM vendors WHERE society_id = ? AND vendor_id != ? AND LOWER(TRIM(store_name)) = LOWER(TRIM(?))`,
          [targetSocId, currentVid, store_name]
        );
        if (nameDup.rows && nameDup.rows.length > 0) {
          throw new Error('A shop with this name already exists in this society.');
        }
      }
    }

    const defaultLogo = 'https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=200&auto=format&fit=crop&q=80';
    const logoUrl = logo && logo.trim() !== '' ? logo : defaultLogo;

    await query(
      `UPDATE vendors 
       SET store_name = COALESCE(NULLIF(?, ''), store_name), 
           logo = ?, 
           description = ?, 
           phone_number = COALESCE(NULLIF(?, ''), phone_number), 
           gst_number = ?,
           opening_timing = ?, 
           closing_timing = ?, 
           min_order_value = ?, 
           max_quantity_limit = ?,
           delivery_charge = ?, 
           gst_percentage = ?, 
           service_charge_percentage = ?
       WHERE vendor_id = ? OR public_id = ?`,
      [
        store_name || '', logoUrl, description || '', phone_number || '', gst_number || '',
        opening_timing || '08:00 AM', closing_timing || '10:00 PM', min_order_value || 0,
        max_quantity_limit || 10, delivery_charge || 0, gst_percentage || 5, service_charge_percentage || 0,
        numId, rawIdStr
      ]
    );
    return { logo: logoUrl };
  }

  /**
   * Processes subscription renewal safely via PaymentService signature verification.
   */
  async renewSubscription(vendorId, paymentMethod, transactionId, extraPaymentDetails = {}) {
    const paymentResult = await paymentService.verifyAndProcessPayment({
      vendor_id: vendorId,
      amount: 2999.00,
      payment_method: paymentMethod || 'Razorpay (UPI)',
      transaction_id: transactionId,
      razorpay_order_id: extraPaymentDetails.razorpay_order_id,
      razorpay_payment_id: extraPaymentDetails.razorpay_payment_id || transactionId,
      razorpay_signature: extraPaymentDetails.razorpay_signature
    });

    return {
      startDateStr: paymentResult.start_date,
      endDateStr: paymentResult.end_date
    };
  }

  /**
   * Deletes vendor store and associated catalog items from database.
   */
  async deleteVendorStore(vendorIdParam) {
    const rawIdStr = String(vendorIdParam || '').trim();
    const isPureNum = /^\d+$/.test(rawIdStr);

    let vendorRes;
    if (isPureNum) {
      const numId = parseInt(rawIdStr, 10);
      vendorRes = await query(`SELECT vendor_id, store_name FROM vendors WHERE vendor_id = ?`, [numId]);
    } else {
      vendorRes = await query(`SELECT vendor_id, store_name FROM vendors WHERE public_id = ? OR CAST(vendor_id AS TEXT) = ?`, [rawIdStr, rawIdStr]);
    }

    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      throw new Error('Vendor store not found');
    }

    const actualVendorId = Number(vendorRes.rows[0].vendor_id);

    // Delete associated catalog items and items
    await query(`DELETE FROM items WHERE vendor_id = ?`, [actualVendorId]).catch(() => {});
    await query(`DELETE FROM catalog_items WHERE vendor_id = ?`, [actualVendorId]).catch(() => {});
    
    // Delete vendor record
    await query(`DELETE FROM vendors WHERE vendor_id = ?`, [actualVendorId]);

    // Clear cache
    const memoryCache = require('../utils/cache');
    memoryCache.clear();

    return { vendor_id: actualVendorId, store_name: vendorRes.rows[0].store_name };
  }
}

module.exports = new VendorService();


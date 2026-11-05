const { query } = require('../../models/db');

/**
 * Enterprise Cart Controller for Customer App & Web Storefront.
 * Enforces mandatory resident user authentication on all Cart modifications.
 */

/**
 * POST /api/cart/add (also /api/cart, /api/cart/items, /api/orders/cart/add)
 * Add item to cart with authoritative server-side stock and vendor subscription checks.
 * Requires authenticated resident user.
 */
async function addToCart(req, res) {
  try {
    const body = req.body || {};
    const rawItemId = body.item_id || body.itemId || body.id;
    const rawVendorId = body.vendor_id || body.merchant_id || body.vendorId || body.merchantId;
    const quantity = Number(body.quantity || body.qty || 1);

    if (!rawItemId) {
      return res.status(400).json({
        success: false,
        error: 'item_id is required to add an item to cart.',
        message: 'item_id is required to add an item to cart.'
      });
    }

    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive integer greater than or equal to 1.',
        message: 'Quantity must be a positive integer greater than or equal to 1.'
      });
    }

    // 1. Fetch Authoritative Item from Database
    const itemRes = await query(
      `SELECT item_id, vendor_id, item_name, price, stock, in_stock, is_available, image_url, category, unit
       FROM items 
       WHERE item_id = ?`,
      [rawItemId]
    );

    if (!itemRes.rows || itemRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Item #${rawItemId} was not found in the store catalog.`,
        message: `Item #${rawItemId} was not found in the store catalog.`
      });
    }

    const item = itemRes.rows[0];
    const vendorId = item.vendor_id;

    if (rawVendorId && Number(rawVendorId) !== Number(vendorId)) {
      return res.status(400).json({
        success: false,
        error: `Item #${rawItemId} does not belong to vendor #${rawVendorId}.`,
        message: `Item #${rawItemId} does not belong to vendor #${rawVendorId}.`
      });
    }

    // 2. Verify Vendor exists and is ACTIVE
    const vendorRes = await query(
      `SELECT vendor_id, store_name, vendor_name, status, whatsapp_number, phone_number
       FROM vendors 
       WHERE vendor_id = ?`,
      [vendorId]
    );

    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Vendor for item #${rawItemId} was not found.`,
        message: `Vendor for item #${rawItemId} was not found.`
      });
    }

    const vendor = vendorRes.rows[0];
    if (String(vendor.status || '').toUpperCase() !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        error: `Store "${vendor.store_name || 'Vendor'}" is currently not active. Items cannot be added to cart.`,
        message: `Store "${vendor.store_name || 'Vendor'}" is currently not active. Items cannot be added to cart.`
      });
    }

    // 3. Verify Active Vendor Subscription for Cart / Order Eligibility
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const subCheck = await query(
      `SELECT subscription_id, status, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date 
       FROM subscriptions 
       WHERE vendor_id = ? AND UPPER(status) = 'ACTIVE' AND end_date >= ?
       ORDER BY end_date DESC, subscription_id DESC LIMIT 1`,
      [vendorId, todayStr]
    );

    const hasActiveSub = Boolean(subCheck.rows && subCheck.rows.length > 0);
    if (!hasActiveSub) {
      return res.status(403).json({
        success: false,
        error: `Cannot add item to cart: Store "${vendor.store_name || 'this merchant'}" does not have an active subscription to receive orders.`,
        message: `Cannot add item to cart: Store "${vendor.store_name || 'this merchant'}" does not have an active subscription to receive orders.`,
        code: 'MERCHANT_SUBSCRIPTION_INACTIVE',
        order_eligible: false,
        subscription_active: false
      });
    }

    // 4. Verify Stock & Item Availability
    const currentStock = item.stock !== null && item.stock !== undefined ? Number(item.stock) : 0;
    const isAvail = (item.is_available === true || item.is_available === 1 || item.is_available === '1' || item.is_available === null || item.is_available === undefined);
    const inStock = Boolean(item.in_stock) && currentStock > 0 && isAvail;

    if (!inStock || currentStock <= 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot add '${item.item_name}' to cart: This item is currently out of stock.`,
        message: `Cannot add '${item.item_name}' to cart: This item is currently out of stock.`,
        out_of_stock: true,
        item_id: Number(item.item_id),
        available_stock: currentStock
      });
    }

    if (quantity > currentStock) {
      return res.status(400).json({
        success: false,
        error: `Only ${currentStock} '${item.item_name}' available in stock, but ${quantity} requested. Please reduce quantity.`,
        message: `Only ${currentStock} '${item.item_name}' available in stock, but ${quantity} requested. Please reduce quantity.`,
        insufficient_stock: true,
        item_id: Number(item.item_id),
        available_stock: currentStock,
        requested_quantity: quantity,
        max_allowed: currentStock
      });
    }

    const price = Number(item.price || 0);
    const totalPrice = price * quantity;

    return res.status(200).json({
      success: true,
      message: `'${item.item_name}' added to cart successfully.`,
      data: {
        item_id: Number(item.item_id),
        item_name: item.item_name,
        vendor_id: Number(item.vendor_id),
        merchant_id: Number(item.vendor_id),
        store_name: vendor.store_name,
        price,
        unit_price: price,
        quantity,
        total_price: totalPrice,
        category: item.category || 'General',
        unit: item.unit || 'piece',
        image_url: item.image_url || null,
        stock: currentStock,
        available_stock: currentStock,
        in_stock: true,
        user_id: req.user?.user_id || req.user?.id || null
      }
    });
  } catch (err) {
    console.error('Error adding item to cart:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to add item to cart: ' + err.message
    });
  }
}

/**
 * GET /api/cart
 * Returns user cart context.
 * Requires authenticated resident user.
 */
async function getCart(req, res) {
  try {
    const userId = req.user?.user_id || req.user?.id;
    return res.status(200).json({
      success: true,
      user_id: userId,
      message: 'Cart active for authenticated user',
      cart: {
        items: [],
        total_items: 0,
        total_amount: 0
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve cart: ' + err.message
    });
  }
}

module.exports = {
  addToCart,
  getCart
};


const { query } = require('../../models/db');
const { formatISTISO, formatISTReadable, formatISTTimeOnly } = require('../../utils/time');
const cashfreeService = require('../../services/cashfreeService');
const notificationService = require('../../services/notificationService');

/**
 * D1. Fetch Resident User Orders (Strictly Filtered by User ID)
 * GET /api/orders/user/:userId
 */
async function getUserOrders(req, res) {
  try {
    const { userId } = req.params;
    const cleanPhone = String(userId).trim().replace(/[^0-9]/g, '');
    const last10 = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;

    const uRes = await query(
      `SELECT user_id FROM users WHERE user_id = ? OR phone = ? OR phone LIKE ?`,
      [userId, userId, `%${last10}`]
    ).catch(() => ({ rows: [] }));

    const matchedUserIds = Array.from(new Set([
      userId,
      ...(uRes.rows || []).map(r => r.user_id)
    ]));

    const placeholders = matchedUserIds.map(() => '?').join(',');
    const ordersRes = await query(
      `SELECT o.order_id, o.user_id, o.vendor_id, o.customer_name, o.customer_phone,
              v.store_name, v.logo as store_logo, o.total_amount, o.status, 
              o.payment_status, o.refund_id, o.refund_amount, o.refund_status, o.refunded_at,
              COALESCE(o.created_at, o.order_timestamp) as created_at, s.society_name, o.delivery_address,
              COALESCE(o.remarks, '') as remarks,
              u.name as user_name, u.phone as user_phone,
              u.address as user_saved_address, u.flat as user_flat, u.area as user_area, u.society_name as user_soc
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
       LEFT JOIN societies s ON o.society_id = s.society_id
       LEFT JOIN users u ON o.user_id = u.user_id
       WHERE o.user_id IN (${placeholders}) OR u.phone = ? OR u.phone LIKE ? OR o.customer_phone = ? OR o.customer_phone LIKE ?
       ORDER BY o.order_id DESC`,
      [...matchedUserIds, userId, `%${last10}`, userId, `%${last10}`]
    );

    const orders = [];
    for (const ord of (ordersRes.rows || [])) {
      const detailsRes = await query(
        `SELECT item_name, quantity, COALESCE(price, unit_price, 0) as price FROM order_details WHERE order_id = ?`,
        [ord.order_id]
      ).catch(() => ({ rows: [] }));

      const mappedItems = (detailsRes.rows || []).map(i => ({
        item_id: Number(i.item_id || 1),
        item_name: i.item_name || 'Item',
        quantity: Number(i.quantity || 1),
        unit_price: Number(i.unit_price || i.price || 0),
        price: Number(i.price || i.unit_price || 0),
        menuItem: {
          name: i.item_name || 'Item',
          price: Number(i.price || i.unit_price || 0)
        }
      }));

      const subtotal = mappedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const total = Number(ord.total_amount || 0);
      const serviceCharge = Math.max(0, total - subtotal);

      // Prefer user's live profile address over whatever was stored at order creation time.
      // Stored delivery_address may have been set to just the society name during a creation-time bug.
      const profileAddress = [
        String(ord.user_flat || '').trim(),
        String(ord.user_soc || ord.user_area || '').trim()
      ].filter(Boolean).join(', ');

      const fullDeliveryAddress =
        profileAddress ||
        String(ord.delivery_address || '').trim() ||
        String(ord.user_saved_address || '').trim();

      let flatNumber = String(ord.user_flat || '').trim();
      let buildingNumber = String(ord.user_soc || ord.user_area || '').trim();

      if (fullDeliveryAddress.includes(',')) {
        const parts = fullDeliveryAddress.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length > 0) flatNumber = parts[0];
        if (parts.length > 1) buildingNumber = parts[1];
      } else if (fullDeliveryAddress && !flatNumber) {
        flatNumber = fullDeliveryAddress;
      }
      if (!flatNumber) flatNumber = 'Unknown';
      if (!buildingNumber) buildingNumber = '-';

      let finalSociety = '';
      if (buildingNumber && buildingNumber !== '-' && buildingNumber !== 'Unknown') {
        finalSociety = buildingNumber;
      } else if (ord.user_soc && String(ord.user_soc).trim()) {
        finalSociety = String(ord.user_soc).trim();
      } else if (ord.user_area && String(ord.user_area).trim()) {
        finalSociety = String(ord.user_area).trim();
      } else if (ord.society_name && !['arg ananta', 'ag ananta', 'arg anantra', 'ag anantra'].includes(String(ord.society_name).trim().toLowerCase())) {
        finalSociety = String(ord.society_name).trim();
      } else {
        finalSociety = (buildingNumber !== '-' ? buildingNumber : '') || ord.user_soc || ord.user_area || '';
      }

      const statusUpper = String(ord.status || 'PLACED').toUpperCase();

      let statusLabel = 'Order Placed';
      if (statusUpper === 'DELIVERED' || statusUpper === 'COMPLETED') {
        statusLabel = 'Order Delivered';
      } else if (statusUpper === 'ACCEPTED' || statusUpper === 'PREPARING') {
        statusLabel = 'Order Accepted';
      } else if (statusUpper === 'IN_PROGRESS' || statusUpper === 'OUT_FOR_DELIVERY') {
        statusLabel = 'Out for Delivery';
      } else if (statusUpper === 'CANCELLED') {
        if (ord.payment_status === 'REFUND_IN_PROGRESS' || (ord.refund_status && ord.refund_status !== 'SUCCESS')) {
          statusLabel = 'Order Cancelled (Refund in Progress)';
        } else if (ord.payment_status === 'REFUNDED' || ord.refund_status === 'SUCCESS') {
          statusLabel = 'Order Cancelled (Refunded)';
        } else {
          statusLabel = 'Order Cancelled';
        }
      } else if (ord.payment_status === 'PAID') {
        statusLabel = 'Order Placed (Paid)';
      } else {
        statusLabel = 'Order Placed';
      }

      orders.push({
        id: String(ord.order_id),
        order_id: String(ord.order_id),
        user_id: ord.user_id ? String(ord.user_id) : '',
        customer_name: ord.customer_name || ord.user_name || 'Customer',
        phone: ord.customer_phone || ord.phone || ord.user_phone || '',
        user_phone: ord.customer_phone || ord.phone || ord.user_phone || '',
        vendor_id: Number(ord.vendor_id),
        store_name: ord.store_name || '',
        store_logo: ord.store_logo || '',
        society_name: finalSociety,
        society: finalSociety,
        societyName: finalSociety,
        delivery_address: fullDeliveryAddress,
        address: fullDeliveryAddress,
        full_address: fullDeliveryAddress,
        shipping_address: fullDeliveryAddress,
        flatNumber: flatNumber,
        buildingNumber: buildingNumber,
        flat: flatNumber,
        building: buildingNumber,
        subtotal: subtotal,
        tax: 0,
        deliveryCharge: 0,
        serviceCharge: serviceCharge,
        total: total,
        total_amount: total,
        status: statusUpper,
        status_label: statusLabel,
        payment_status: ord.payment_status || 'PAID',
        refund_status: ord.refund_status || null,
        refund_status_label: ord.refund_status
          ? (ord.refund_status === 'SUCCESS' ? 'Refund Completed' : 'Refund in Progress (Crediting back to original payment source)')
          : (ord.payment_status === 'REFUND_IN_PROGRESS' ? 'Refund in Progress (Crediting back to original payment source)' : (ord.payment_status === 'REFUNDED' ? 'Refund Completed' : null)),
        is_refund_in_progress: Boolean(
          ord.payment_status === 'REFUND_IN_PROGRESS' ||
          (ord.refund_status && ord.refund_status !== 'SUCCESS')
        ),
        refund_id: ord.refund_id || null,
        refund_amount: ord.refund_amount ? Number(ord.refund_amount) : null,
        refunded_at: ord.refunded_at || null,
        remarks: ord.remarks || '',
        notes: ord.remarks || '',
        instructions: ord.remarks || '',
        delivery_instructions: ord.remarks || '',
        date: formatISTISO(ord.created_at),
        timestamp: formatISTTimeOnly(ord.created_at),
        createdAt: formatISTISO(ord.created_at),
        created_at: formatISTISO(ord.created_at),
        created_at_readable: formatISTReadable(ord.created_at),
        items: mappedItems
      });
    }

    res.status(200).json({
      success: true,
      count: orders.length,
      total: orders.length,
      data: orders,
      orders: orders
    });
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: 'Failed to fetch user orders: ' + err.message });
  }
}

/**
 * D2. Fetch Vendor Store Orders
 * GET /api/orders/vendor/:vendorId
 */
async function getVendorOrders(req, res) {
  try {
    const { vendorId } = req.params;

    const ordersRes = await query(
      `SELECT o.order_id, o.user_id,
              COALESCE(NULLIF(o.customer_name, ''), NULLIF(u.name, ''), 'Resident') as customer_name,
              COALESCE(NULLIF(o.customer_phone, ''), NULLIF(u.phone, ''), '') as phone, 
              COALESCE(NULLIF(o.delivery_address, ''), NULLIF(u.address, ''), '') as delivery_address,
              COALESCE(o.remarks, '') as remarks,
              o.total_amount, o.status, o.created_at,
              COALESCE(NULLIF(o.payment_method, ''), 'COD') as payment_method
       FROM orders o
       LEFT JOIN users u ON o.user_id = u.user_id
       WHERE o.vendor_id = ?
       ORDER BY o.order_id DESC`,
      [vendorId]
    );

    const orders = [];
    for (const ord of (ordersRes.rows || [])) {
      const detailsRes = await query(
        `SELECT item_name, quantity, COALESCE(price, unit_price, 0) as price FROM order_details WHERE order_id = ?`,
        [ord.order_id]
      ).catch(() => ({ rows: [] }));

      const mappedItems = (detailsRes.rows || []).map(i => ({
        quantity: Number(i.quantity || 1),
        item_name: i.item_name || 'Item',
        price: Number(i.price || i.unit_price || 0),
        unit_price: Number(i.unit_price || i.price || 0),
        item_total: Number(i.item_total || (Number(i.price || i.unit_price || 0) * Number(i.quantity || 1))),
        menuItem: {
          name: i.item_name || 'Item',
          price: Number(i.price || i.unit_price || 0)
        }
      }));

      const subtotal = mappedItems.reduce((acc, item) => acc + item.item_total, 0);
      const dbTotal = Number(ord.total_amount || 0);
      const total = dbTotal > 0 ? dbTotal : subtotal;
      const serviceCharge = Math.max(0, total - subtotal);

      let flatNumber = ord.delivery_address || 'Unknown';
      let buildingNumber = '-';
      if (flatNumber.includes(',')) {
        const parts = flatNumber.split(',');
        flatNumber = parts[0].trim();
        buildingNumber = parts.length > 1 ? parts[1].trim() : '-';
      }

      orders.push({
        id: String(ord.order_id), // Expo expects 'id'
        order_id: String(ord.order_id), // Backward compat
        user_id: ord.user_id ? String(ord.user_id) : '',
        customer_name: ord.customer_name || 'Resident',
        phone: ord.phone || '',
        delivery_address: ord.delivery_address || '',
        flatNumber: flatNumber,
        buildingNumber: buildingNumber,
        subtotal: subtotal,
        tax: 0,
        deliveryCharge: 0,
        serviceCharge: serviceCharge,
        total: total,
        total_amount: total, // Backward compat
        remarks: ord.remarks || '',
        notes: ord.remarks || '',
        instructions: ord.remarks || '',
        delivery_instructions: ord.remarks || '',
        status: (ord.status || 'PENDING').toLowerCase(),
        payment_method: ord.payment_method || 'COD',
        payment_mode: ord.payment_method || 'COD', // Alias for frontend compatibility
        timestamp: formatISTTimeOnly(ord.created_at),
        createdAt: formatISTISO(ord.created_at),
        created_at: formatISTISO(ord.created_at),
        created_at_readable: formatISTReadable(ord.created_at),
        items: mappedItems
      });
    }

    res.status(200).json(orders);
  } catch (err) {
    console.error('Error fetching vendor orders:', err);
    res.status(500).json({ error: 'Failed to fetch vendor orders: ' + err.message });
  }
}

/**
 * D3. Create New Order
 * POST /api/orders
 */
async function createOrder(req, res) {
  try {
    const user_id = req.body.user_id || req.body.userId;
    const vendor_id = req.body.vendor_id || req.body.vendorId;
    const society_id = req.body.society_id || req.body.societyId;
    const total_amount = req.body.total_amount || req.body.totalAmount || req.body.total;
    const delivery_address = req.body.delivery_address || req.body.deliveryAddress || req.body.address || req.body.full_address || req.body.shipping_address;
    const items = req.body.items || req.body.order_items;

    if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order fields or items array' });
    }

    // Enforce active vendor subscription: users cannot buy from an expired store
    const subCheck = await query(
      `SELECT subscription_id, status, TO_CHAR(end_date, 'YYYY-MM-DD') as end_date 
       FROM subscriptions 
       WHERE vendor_id = ? 
       ORDER BY subscription_id DESC LIMIT 1`,
      [vendor_id]
    );
    const sub = subCheck.rows && subCheck.rows[0];
    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    if (sub && (String(sub.status).toUpperCase() === 'EXPIRED' || sub.end_date < todayStr)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot place order: This store is currently unavailable due to an expired subscription. Please order from another active merchant.',
        subscription_expired: true
      });
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = formatISTISO();
    const populatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      const rawItemId = item.item_id || item.itemId || item.id;
      const itemQty = Number(item.quantity || item.qty || 1);

      if (!rawItemId) {
        return res.status(400).json({
          success: false,
          error: 'Each item in order must include a valid item_id'
        });
      }

      if (isNaN(itemQty) || itemQty <= 0) {
        return res.status(400).json({
          success: false,
          error: `Invalid quantity '${item.quantity || item.qty}' for item #${rawItemId}. Quantity must be at least 1.`
        });
      }

      // Query database for authoritative item data: name, price, stock, in_stock, is_available, vendor_id
      const dbItemRes = await query(
        `SELECT item_id, vendor_id, item_name, price, stock, in_stock, is_available FROM items WHERE item_id = ?`,
        [rawItemId]
      );

      if (!dbItemRes.rows || dbItemRes.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: `Item ID ${rawItemId} was not found in the store catalog.`,
          item_id: rawItemId
        });
      }

      const dbItem = dbItemRes.rows[0];

      // Validate vendor ownership if vendor_id specified
      if (vendor_id && Number(dbItem.vendor_id) !== Number(vendor_id)) {
        return res.status(400).json({
          success: false,
          error: `Item '${dbItem.item_name}' does not belong to vendor #${vendor_id}.`,
          item_id: rawItemId
        });
      }

      const currentStock = dbItem.stock !== null && dbItem.stock !== undefined ? Number(dbItem.stock) : 0;
      const isItemAvailable = (dbItem.in_stock !== false && dbItem.is_available !== false && dbItem.is_available !== 0);

      // Check if out of stock
      if (currentStock <= 0 || !isItemAvailable) {
        return res.status(400).json({
          success: false,
          error: `Cannot order '${dbItem.item_name}': This item is currently out of stock.`,
          message: `Cannot order '${dbItem.item_name}': This item is currently out of stock.`,
          out_of_stock: true,
          item_id: Number(dbItem.item_id),
          item_name: dbItem.item_name,
          available_stock: currentStock,
          requested_quantity: itemQty
        });
      }

      // Check if requested quantity exceeds available stock
      if (itemQty > currentStock) {
        return res.status(400).json({
          success: false,
          error: `Only ${currentStock} '${dbItem.item_name}' available in stock, but you requested ${itemQty}. Please reduce the quantity.`,
          message: `Only ${currentStock} '${dbItem.item_name}' available in stock, but you requested ${itemQty}. Please reduce the quantity.`,
          insufficient_stock: true,
          item_id: Number(dbItem.item_id),
          item_name: dbItem.item_name,
          available_stock: currentStock,
          requested_quantity: itemQty,
          max_allowed: currentStock
        });
      }

      let itemPrice = Number(item.price || item.unit_price || item.unitPrice);
      if (isNaN(itemPrice) || itemPrice <= 0) {
        itemPrice = Number(dbItem.price) || 0;
      }
      const itemName = item.item_name || item.itemName || item.name || dbItem.item_name || 'Item';

      populatedItems.push({
        item_id: Number(dbItem.item_id),
        _resolvedItemId: Number(dbItem.item_id),
        item_name: itemName,
        quantity: itemQty,
        price: itemPrice,
        stock_before: currentStock,
        stock_remaining: currentStock - itemQty
      });

      subtotal += itemPrice * itemQty;
    }

    const numTotal = Number(total_amount) ? Number(total_amount) : subtotal;

    // Resolve customer name properly without defaulting to Rahul Sharma
    const rawCustomerName = req.body.customer_name || req.body.customerName || req.body.name || req.body.user_name || req.body.userName;
    const rawPhone = req.body.phone || req.body.mobile || req.body.phone_number || req.body.user_phone;

    let resolvedUserId = user_id || null;
    let resolvedCustomerName = rawCustomerName || null;
    let userDbAddress = '';

    if (resolvedUserId || rawPhone) {
      const uLookup = await query(
        `SELECT user_id, name, address, flat, area, society_name, city, state, pincode FROM users WHERE user_id = ? OR phone = ? OR phone = ? LIMIT 1`,
        [resolvedUserId || '', rawPhone || '', (rawPhone || '').replace(/\D/g, '')]
      ).catch(() => ({ rows: [] }));

      if (uLookup.rows.length > 0) {
        resolvedUserId = uLookup.rows[0].user_id;
        if (!resolvedCustomerName && uLookup.rows[0].name && uLookup.rows[0].name !== 'Rahul Sharma') {
          resolvedCustomerName = uLookup.rows[0].name;
        }
        const uRow = uLookup.rows[0];
        userDbAddress = String(
          uRow.address ||
          [uRow.flat, uRow.society_name || uRow.area, uRow.city, uRow.state, uRow.pincode].filter(Boolean).join(', ') ||
          ''
        ).trim();
      }
    }

    const orderFlat = String(req.body.flat || req.body.house_number || req.body.unit || '').trim();
    const orderArea = String(req.body.area || req.body.location || req.body.society_name || '').trim();
    const orderCity = String(req.body.city || '').trim();
    const orderPincode = String(req.body.pincode || req.body.zip || '').trim();
    const rawDeliveryAddress = String(delivery_address || [orderFlat, orderArea, orderCity, orderPincode].filter(Boolean).join(', ') || '').trim();
    const finalDeliveryAddress = rawDeliveryAddress || userDbAddress || '';

    if (!resolvedCustomerName) {
      resolvedCustomerName = rawCustomerName || 'Resident Customer';
    }

    const rawMethod = String(req.body.payment_method || req.body.paymentMethod || req.body.payment_mode || 'COD').trim().toUpperCase();
    const isCashfree = rawMethod === 'CASHFREE' || rawMethod === 'ONLINE' || rawMethod === 'ONLINE_PAYMENT' || rawMethod === 'CARD' || rawMethod === 'UPI';
    const paymentMethod = isCashfree ? 'CASHFREE' : 'COD';
    const paymentStatus = 'PENDING';
    const orderStatus = 'PLACED';

    const rawRemarks = String(
      req.body.remarks || req.body.remark || req.body.notes || req.body.note ||
      req.body.instructions || req.body.delivery_instructions || req.body.special_instructions ||
      req.body.order_notes || req.body.order_note || req.body.comment || ''
    ).trim();

    await query(
      `INSERT INTO orders (
         order_id, user_id, vendor_id, society_id, total_amount, status,
         payment_status, payment_method, customer_phone, delivery_address, created_at, customer_name,
         remarks
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        resolvedUserId || 'usr_anonymous',
        vendor_id,
        society_id || null,
        numTotal,
        orderStatus,
        paymentStatus,
        paymentMethod,
        rawPhone || null,
        finalDeliveryAddress,
        createdAt,
        resolvedCustomerName,
        rawRemarks
      ]
    ).catch(async () => {
      return query(
        `INSERT INTO orders (order_id, user_id, vendor_id, society_id, total_amount, status, delivery_address, created_at, customer_name, remarks)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          resolvedUserId || 'usr_anonymous',
          vendor_id,
          society_id || null,
          numTotal,
          orderStatus,
          finalDeliveryAddress,
          createdAt,
          resolvedCustomerName,
          rawRemarks
        ]
      ).catch(async () => {
        return query(
          `INSERT INTO orders (order_id, user_id, vendor_id, society_id, total_amount, status, delivery_address, created_at, customer_name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            resolvedUserId || 'usr_anonymous',
            vendor_id,
            society_id || null,
            numTotal,
            orderStatus,
            finalDeliveryAddress,
            createdAt,
            resolvedCustomerName
          ]
        );
      });
    });

    // ── Save last address entered by user to database ─────────────────────────────
    if (resolvedUserId || rawPhone) {
      const targetIdentifier = resolvedUserId || rawPhone;
      await query(`
        UPDATE users 
        SET flat = COALESCE(NULLIF(?, ''), flat),
            society_name = COALESCE(NULLIF(?, ''), society_name),
            area = COALESCE(NULLIF(?, ''), area),
            city = COALESCE(NULLIF(?, ''), city),
            pincode = COALESCE(NULLIF(?, ''), pincode),
            address = COALESCE(NULLIF(?, ''), address)
        WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
      `, [
        orderFlat,
        orderArea,
        orderArea,
        orderCity,
        orderPincode,
        finalDeliveryAddress,
        String(targetIdentifier),
        String(targetIdentifier),
        String(targetIdentifier)
      ]).catch(() => {
        // Fallback for schemas without city/pincode/address columns
        return query(`
          UPDATE users 
          SET flat = COALESCE(NULLIF(?, ''), flat),
              society_name = COALESCE(NULLIF(?, ''), society_name)
          WHERE user_id = ? OR CAST(user_id AS TEXT) = ? OR phone = ?
        `, [orderFlat, orderArea, String(targetIdentifier), String(targetIdentifier), String(targetIdentifier)]).catch(() => { });
      });
    }

    for (const pItem of populatedItems) {
      const validItemId = pItem._resolvedItemId || Number(pItem.item_id);

      await query(
        `INSERT INTO order_details (order_id, item_id, item_name, quantity, price, unit_price, item_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          validItemId,
          pItem.item_name,
          pItem.quantity,
          pItem.price,
          pItem.price,
          pItem.price * pItem.quantity
        ]
      ).catch((err) => console.error('Error inserting order detail:', err.message));
    }

    // ── Deduct stock atomically for each ordered item ──────────────────────────
    for (const pItem of populatedItems) {
      const deductId = pItem._resolvedItemId || Number(pItem.item_id);
      const deductQty = Number(pItem.quantity) || 1;
      if (!deductId) continue;

      const deductRes = await query(
        `UPDATE items 
         SET stock = stock - ?,
             in_stock = CASE WHEN (stock - ?) <= 0 THEN FALSE ELSE in_stock END
         WHERE item_id = ? AND stock >= ?
         RETURNING stock, in_stock`,
        [deductQty, deductQty, deductId, deductQty]
      ).catch(() => ({ rows: [] }));

      if (deductRes.rows && deductRes.rows.length > 0) {
        pItem.stock_remaining = Number(deductRes.rows[0].stock);
      } else {
        // Fallback update in case of concurrency or driver differences
        await query(
          `UPDATE items 
           SET stock = GREATEST(0, stock - ?),
               in_stock = CASE WHEN stock <= ? THEN FALSE ELSE in_stock END
           WHERE item_id = ?`,
          [deductQty, deductQty, deductId]
        ).catch((err) => console.warn(`[Stock] Could not deduct stock for item ${deductId}:`, err.message));
      }
    }


    // Fetch vendor & society details for app order context
    const vendorRes = await query(`SELECT store_name, phone_number FROM vendors WHERE vendor_id = ?`, [vendor_id]);
    const societyRes = await query(`SELECT society_name FROM societies WHERE society_id = ?`, [society_id || 1]);

    const storeName = vendorRes.rows[0]?.store_name || 'Vendor Store';
    const rawDbSocName = societyRes.rows[0]?.society_name || '';
    const societyName = orderArea || (rawDbSocName && !['arg ananta', 'ag ananta'].includes(rawDbSocName.toLowerCase()) ? rawDbSocName : (orderArea || 'Society Name'));

    const finalCustomerName = resolvedCustomerName || 'Resident Customer';
    const itemsCount = populatedItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

    // Initialize Cashfree session if user chose online payment
    let cashfreeSession = null;
    if (isCashfree) {
      const cashfreeService = require('../../services/cashfreeService');
      const cleanPhone = (rawPhone || '').replace(/\D/g, '');
      cashfreeSession = await cashfreeService.createUserToVendorPaymentSession({
        order_id: orderId,
        vendor_id: vendor_id,
        store_name: storeName,
        amount: numTotal,
        customer_id: resolvedUserId || `CUST_${cleanPhone || Date.now()}`,
        customer_name: finalCustomerName,
        customer_email: req.body.customer_email || req.body.email || 'customer@digilocal.in',
        customer_phone: cleanPhone || '9876543210',
        return_url: req.body.return_url,
        notify_url: req.body.notify_url
      }, {
        env: req.body.env,
        app_id: req.body.app_id,
        secret_key: req.body.secret_key
      }).catch(cfErr => ({ success: false, error: cfErr.message }));

      if (cashfreeSession && cashfreeSession.success && cashfreeSession.payment_session_id) {
        await query(
          `UPDATE orders SET cashfree_order_id = ?, payment_method = 'CASHFREE' WHERE order_id = ?`,
          [cashfreeSession.order_id, orderId]
        ).catch(() => { });
      }
    }

    // Trigger instant Expo Push Notification & Socket alert to vendor app (for confirmed COD orders)
    // For online payments (Cashfree), notification is triggered upon successful payment verification
    if (req.body.skip_notification !== true && !isCashfree) {
      const notificationService = require('../../services/notificationService');
      notificationService.notifyVendorNewOrder({
        vendor_id,
        order_id: orderId,
        total_amount: numTotal,
        customer_name: finalCustomerName,
        items_count: itemsCount,
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        remarks: rawRemarks,
        delivery_address: finalDeliveryAddress,
        items: populatedItems
      }).catch(err => console.error('[Order Push Notification Error]:', err.message));
    }

    const responsePayload = {
      success: true,
      message: isCashfree
        ? (cashfreeSession?.success ? 'Order created. Please complete payment via Cashfree.' : 'Order created, but Cashfree payment session failed to initialize.')
        : 'Order placed successfully via Cash on Delivery.',
      order_id: orderId,
      total_amount: numTotal,
      status: orderStatus,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      remarks: rawRemarks,
      notes: rawRemarks,
      delivery_instructions: rawRemarks,
      societyName: societyName,
      society_name: societyName,
      society: societyName,
      delivery_address: finalDeliveryAddress || userDbAddress || '',
      address: finalDeliveryAddress || userDbAddress || '',
      full_address: finalDeliveryAddress || userDbAddress || '',
      shipping_address: finalDeliveryAddress || userDbAddress || '',
      flatNumber: orderFlat || 'Unknown',
      buildingNumber: orderArea || societyName || '-',
      flat: orderFlat || 'Unknown',
      building: orderArea || societyName || '-',
      created_at: createdAt,
      order: {
        order_id: orderId,
        vendor_id: Number(vendor_id),
        user_id: resolvedUserId || (req.user?.id ? String(req.user.id) : ''),
        customer_name: finalCustomerName,
        phone_number: rawPhone || (req.user?.phone ? String(req.user.phone) : ''),
        delivery_address: finalDeliveryAddress || userDbAddress || '',
        address: finalDeliveryAddress || userDbAddress || '',
        full_address: finalDeliveryAddress || userDbAddress || '',
        shipping_address: finalDeliveryAddress || userDbAddress || '',
        society_name: societyName,
        society: societyName,
        societyName: societyName,
        flatNumber: orderFlat || 'Unknown',
        buildingNumber: orderArea || societyName || '-',
        flat: orderFlat || 'Unknown',
        building: orderArea || societyName || '-',
        remarks: rawRemarks,
        notes: rawRemarks,
        delivery_instructions: rawRemarks,
        status: orderStatus,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        cashfree_order_id: cashfreeSession?.order_id || null,
        date: createdAt,
        created_at: createdAt,
        total_amount: numTotal,
        items: populatedItems.map(i => ({
          item_id: Number(i.item_id || 1),
          item_name: i.item_name || 'Item',
          quantity: Number(i.quantity || 1),
          unit_price: Number(i.price || 0),
          price: Number(i.price || 0),
          stock_remaining: i.stock_remaining !== undefined ? i.stock_remaining : null
        }))
      }
    };

    if (isCashfree && cashfreeSession) {
      responsePayload.payment_session_id = cashfreeSession.payment_session_id;
      responsePayload.payment_url = cashfreeSession.payment_url;
      responsePayload.cashfree = cashfreeSession;
      if (!cashfreeSession.success) {
        responsePayload.payment_error = cashfreeSession.error || 'Failed to initialize Cashfree payment session';
      }
    }

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(400).json({ error: err.message || 'Failed to place order' });
  }
}

/**
 * D4. Update Order Status Pipeline
 * PUT /api/orders/:id/status
 */
async function updateOrderStatus(req, res) {
  try {
    const id = req.params.id || req.params.orderId;
    let rawStatus = req.body.status || req.body.orderStatus || req.query.status;

    if (!rawStatus) {
      return res.status(400).json({ error: 'Order status is required in request body or query params' });
    }

    const norm = String(rawStatus).toUpperCase().trim();

    let targetStatus = norm;
    if (['COMPLETED', 'COMPLETE', 'DELIVERED', 'FULFILLED', 'DONE'].includes(norm)) {
      targetStatus = 'COMPLETED';
    } else if (['ACCEPT', 'ACCEPTED', 'PREPARING'].includes(norm)) {
      targetStatus = 'ACCEPTED';
    } else if (['CONFIRMED', 'PLACED'].includes(norm)) {
      targetStatus = 'PLACED';
    } else if (['CANCELLED', 'CANCELED', 'REJECTED', 'DECLINED'].includes(norm)) {
      targetStatus = 'CANCELLED';
    } else if (['IN_PROGRESS', 'PROCESSING', 'OUT_FOR_DELIVERY'].includes(norm)) {
      targetStatus = 'IN_PROGRESS';
    }

    const allowedStatuses = [
      'PLACED', 'PENDING', 'CONFIRMED', 'ACCEPTED', 'IN_PROGRESS',
      'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED',
      'COMPLETED', 'COMPLETE', 'FULFILLED', 'DONE',
      'CANCELLED', 'CANCELED', 'REJECTED', 'DECLINED'
    ];

    if (!allowedStatuses.includes(norm)) {
      return res.status(400).json({
        error: `Invalid order status '${rawStatus}'. Allowed statuses: PLACED, PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED`,
        allowedStatuses
      });
    }

    const orderCheck = await query(`SELECT * FROM orders WHERE order_id = ?`, [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: `Order ID '${id}' not found` });
    }

    const order = orderCheck.rows[0];
    let refundInfo = null;

    if (targetStatus === 'CANCELLED') {
      const isOnlinePaid = (order.payment_status === 'PAID' || order.payment_status === 'SUCCESS' || order.payment_method === 'CASHFREE') &&
        (order.paid_at || order.cashfree_order_id || order.cashfree_payment_id || order.payment_status === 'PAID');
      const alreadyRefunded = order.payment_status === 'REFUNDED' || order.refund_status === 'SUCCESS';

      if (isOnlinePaid && !alreadyRefunded) {
        const refundAmount = Number(order.total_amount || 0);
        const cfOrderId = order.cashfree_order_id || order.order_id;
        const refundId = `REF_${order.order_id}_${Date.now()}`;
        const refundReason = req.body?.reason || req.body?.refund_note || req.body?.cancel_reason || 'Order cancelled';

        console.log(`[AUTO-REFUND ON STATUS UPDATE] Order #${id} cancelled. Initiating refund of ₹${refundAmount} to user original payment account...`);
        const refundResult = await cashfreeService.createRefund(cfOrderId, refundAmount, refundId, refundReason);

        const rawRefundStatus = String(refundResult.refund_status || '').toUpperCase();
        const isSuccess = rawRefundStatus === 'SUCCESS' || rawRefundStatus === 'COMPLETED';
        const finalRefundStatus = isSuccess ? 'COMPLETED' : 'IN_PROGRESS';
        const finalPaymentStatus = isSuccess ? 'REFUND_COMPLETED' : 'REFUND_IN_PROGRESS';
        const refundStatusLabel = isSuccess
          ? 'Refund Completed'
          : 'Refund in Progress (Crediting back to original payment source)';

        if (refundResult.success) {
          refundInfo = {
            ...refundResult,
            refund_status: finalRefundStatus,
            refund_status_label: refundStatusLabel,
            is_refund_in_progress: !isSuccess
          };

          await query(
            `UPDATE orders 
             SET status = 'CANCELLED',
                 payment_status = ?,
                 refund_id = ?,
                 refund_amount = ?,
                 refund_status = ?,
                 refunded_at = CURRENT_TIMESTAMP
             WHERE order_id = ?`,
            [finalPaymentStatus, refundResult.refund_id, refundAmount, finalRefundStatus, id]
          );

          await query(
            `UPDATE payments 
             SET payment_status = ?,
                 refund_id = ?,
                 refund_amount = ?,
                 refunded_at = CURRENT_TIMESTAMP
             WHERE order_id = ? OR cashfree_order_id = ?`,
            [finalPaymentStatus, refundResult.refund_id, refundAmount, id, cfOrderId]
          ).catch(() => { });
        } else {
          await query(
            `UPDATE orders 
             SET status = 'CANCELLED',
                 refund_status = 'FAILED'
             WHERE order_id = ?`,
            [id]
          );
        }
      } else {
        await query(`UPDATE orders SET status = ? WHERE order_id = ?`, [targetStatus, id]);
      }

      // ── Restore stock for cancelled orders ──────────────────────────────────
      const cancelledItemsRes = await query(
        `SELECT item_id, quantity FROM order_details WHERE order_id = ?`,
        [id]
      ).catch(() => ({ rows: [] }));
      for (const ci of (cancelledItemsRes.rows || [])) {
        if (!ci.item_id || !ci.quantity) continue;
        await query(
          `UPDATE items SET stock = stock + ?, in_stock = TRUE WHERE item_id = ?`,
          [Number(ci.quantity), Number(ci.item_id)]
        ).catch(e => console.warn(`[Stock] Could not restore stock for item ${ci.item_id} on cancel:`, e.message));
      }

    } else {
      await query(`UPDATE orders SET status = ? WHERE order_id = ?`, [targetStatus, id]);
    }

    // Real-Time Socket.IO broadcast to order room, user room, and vendor room
    try {
      const { getIO } = require('../../socket');
      const io = getIO();
      if (io) {
        const socketPayload = {
          order_id: String(id),
          status: targetStatus,
          previous_status: order.status,
          payment_status: refundInfo ? (refundInfo.is_refund_in_progress ? 'REFUND_IN_PROGRESS' : 'REFUND_COMPLETED') : order.payment_status,
          refund_status: refundInfo ? refundInfo.refund_status : (order.refund_status || null),
          refund_status_label: refundInfo ? refundInfo.refund_status_label : null,
          is_refund_in_progress: refundInfo ? refundInfo.is_refund_in_progress : false,
          refund_amount: refundInfo ? refundInfo.refund_amount : (order.refund_amount || null),
          reason: req.body?.reason || req.body?.cancel_reason || null,
          cancelled_by: targetStatus === 'CANCELLED' ? 'VENDOR' : null,
          timestamp: new Date().toISOString()
        };

        io.to(`order_${id}`).emit('ORDER_STATUS_UPDATED', socketPayload);
        io.to(String(id)).emit('ORDER_STATUS_UPDATED', socketPayload);

        if (targetStatus === 'CANCELLED') {
          io.to(`order_${id}`).emit('ORDER_CANCELLED', socketPayload);
          io.to(String(id)).emit('ORDER_CANCELLED', socketPayload);
        }

        if (order.user_id) {
          io.to(`user_${order.user_id}`).emit('ORDER_STATUS_UPDATED', socketPayload);
          io.to(String(order.user_id)).emit('ORDER_STATUS_UPDATED', socketPayload);
          if (targetStatus === 'CANCELLED') {
            io.to(`user_${order.user_id}`).emit('ORDER_CANCELLED', socketPayload);
            io.to(String(order.user_id)).emit('ORDER_CANCELLED', socketPayload);
          }
        }

        if (order.vendor_id) {
          io.to(`vendor_${order.vendor_id}`).emit('ORDER_STATUS_UPDATED', socketPayload);
        }
      }
    } catch (_) { }

    res.status(200).json({
      success: true,
      message: refundInfo
        ? (refundInfo.is_refund_in_progress
          ? `Order status updated to CANCELLED. Refund of ₹${refundInfo.refund_amount} is in progress to customer original account.`
          : `Order status updated to CANCELLED. Refund of ₹${refundInfo.refund_amount} initiated to customer original account.`)
        : 'Order status updated successfully',
      order_id: String(id),
      status: targetStatus,
      payment_status: refundInfo ? (refundInfo.is_refund_in_progress ? 'REFUND_IN_PROGRESS' : 'REFUND_COMPLETED') : order.payment_status,
      refund_status: refundInfo ? refundInfo.refund_status : (order.refund_status || null),
      refund_status_label: refundInfo ? refundInfo.refund_status_label : null,
      is_refund_in_progress: refundInfo ? refundInfo.is_refund_in_progress : false,
      raw_status: rawStatus,
      refund: refundInfo
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

/**
 * D5. Cancel Order & Automatic Online Refund
 * POST /api/orders/:id/cancel
 * When an online-paid order is cancelled by the user, initiates a refund back
 * to the original payment source (bank account / UPI / card).
 */
async function cancelOrder(req, res) {
  try {
    const id = req.params.id || req.params.orderId || req.body?.order_id || req.body?.orderId;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    const orderRes = await query(`SELECT * FROM orders WHERE order_id = ?`, [id]);
    if (!orderRes.rows || orderRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order ID '${id}' not found` });
    }

    const order = orderRes.rows[0];

    // Check if order is already cancelled
    if (order.status === 'CANCELLED' || order.status === 'CANCELED' || order.status === 'REJECTED') {
      return res.status(400).json({
        success: false,
        error: 'Order is already cancelled',
        order_id: String(id),
        status: order.status,
        payment_status: order.payment_status
      });
    }

    // Check if order is completed / delivered
    if (['COMPLETED', 'COMPLETE', 'DELIVERED', 'FULFILLED', 'DONE'].includes(String(order.status).toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel an order that has already been delivered or completed',
        order_id: String(id),
        status: order.status
      });
    }

    const reason = String(req.body?.reason || req.body?.cancel_reason || req.body?.note || 'Cancelled by customer').trim();
    const isOnlinePaid = (order.payment_status === 'PAID' || order.payment_status === 'SUCCESS' || order.payment_method === 'CASHFREE') &&
      (order.paid_at || order.cashfree_order_id || order.cashfree_payment_id || order.payment_status === 'PAID');
    const alreadyRefunded = order.payment_status === 'REFUNDED' || order.refund_status === 'SUCCESS';

    let refundData = null;

    if (isOnlinePaid && !alreadyRefunded) {
      const refundAmount = Number(order.total_amount || 0);
      const cfOrderId = order.cashfree_order_id || order.order_id;
      const refundId = `REF_${order.order_id}_${Date.now()}`;

      console.log(`[AUTO-REFUND ON CANCEL] Order #${id} was paid online (₹${refundAmount}). Processing refund to user original payment account...`);
      const refundResult = await cashfreeService.createRefund(cfOrderId, refundAmount, refundId, reason);

      if (refundResult.success) {
        const rawRefundStatus = String(refundResult.refund_status || '').toUpperCase();
        const isSuccess = rawRefundStatus === 'SUCCESS' || rawRefundStatus === 'COMPLETED';
        const finalRefundStatus = isSuccess ? 'COMPLETED' : 'IN_PROGRESS';
        const finalPaymentStatus = isSuccess ? 'REFUND_COMPLETED' : 'REFUND_IN_PROGRESS';
        const refundStatusLabel = isSuccess
          ? 'Refund Completed'
          : 'Refund in Progress (Crediting back to original payment source)';

        refundData = {
          refund_initiated: true,
          refund_id: refundResult.refund_id,
          cf_refund_id: refundResult.cf_refund_id,
          refund_amount: refundAmount,
          refund_currency: 'INR',
          refund_status: finalRefundStatus,
          refund_status_label: refundStatusLabel,
          is_refund_in_progress: !isSuccess,
          destination: 'Original Payment Source (Bank Account / UPI / Card)',
          note: reason
        };

        await query(
          `UPDATE orders 
           SET status = 'CANCELLED',
               payment_status = ?,
               refund_id = ?,
               refund_amount = ?,
               refund_status = ?,
               refunded_at = CURRENT_TIMESTAMP
           WHERE order_id = ?`,
          [finalPaymentStatus, refundResult.refund_id, refundAmount, finalRefundStatus, id]
        );

        await query(
          `UPDATE payments 
           SET payment_status = ?,
               refund_id = ?,
               refund_amount = ?,
               refunded_at = CURRENT_TIMESTAMP
           WHERE order_id = ? OR cashfree_order_id = ?`,
          [finalPaymentStatus, refundResult.refund_id, refundAmount, id, cfOrderId]
        ).catch(() => { });
      } else {
        console.error(`[REFUND PENDING] Cashfree refund could not be completed immediately:`, refundResult.error);
        await query(
          `UPDATE orders 
           SET status = 'CANCELLED',
               payment_status = 'REFUND_IN_PROGRESS',
               refund_status = 'PENDING_MANUAL_REVIEW'
           WHERE order_id = ?`,
          [id]
        );

        return res.status(200).json({
          success: true,
          message: 'Order cancelled. Refund initiation is in progress.',
          order_id: String(id),
          status: 'CANCELLED',
          payment_status: 'REFUND_IN_PROGRESS',
          refund_status: 'IN_PROGRESS',
          refund_status_label: 'Refund in Progress (Pending Verification)',
          is_refund_in_progress: true,
          refund_error: refundResult.error
        });
      }
    } else {
      // Cash On Delivery (COD) or unpaid order
      await query(
        `UPDATE orders 
         SET status = 'CANCELLED',
             payment_status = CASE WHEN payment_status = 'PENDING' THEN 'CANCELLED' ELSE payment_status END
         WHERE order_id = ?`,
        [id]
      );
    }

    // ── Restore stock for cancelled order items ───────────────────────────────
    const cancelledItemsRes = await query(
      `SELECT item_id, quantity FROM order_details WHERE order_id = ?`,
      [id]
    ).catch(() => ({ rows: [] }));
    for (const ci of (cancelledItemsRes.rows || [])) {
      if (!ci.item_id || !ci.quantity) continue;
      await query(
        `UPDATE items 
         SET stock = stock + ?,
             in_stock = TRUE
         WHERE item_id = ?`,
        [Number(ci.quantity), Number(ci.item_id)]
      ).catch(e => console.warn(`[Stock] Could not restore stock for item ${ci.item_id} on customer cancel:`, e.message));
    }

    // Notify vendor
    try {
      if (order.vendor_id) {
        notificationService.sendVendorFcmNotification(order.vendor_id, {
          title: `Order Cancelled: #${id}`,
          body: `Order #${id} was cancelled by customer. ${refundData ? `Refund of ₹${refundData.refund_amount} initiated.` : ''}`,
          data: { orderId: String(id), status: 'CANCELLED' }
        }).catch(() => { });
      }
    } catch (_) { }

    // Real-Time Socket.IO broadcast on customer cancellation
    try {
      const { getIO } = require('../../socket');
      const io = getIO();
      if (io) {
        const socketPayload = {
          order_id: String(id),
          status: 'CANCELLED',
          previous_status: order.status,
          payment_status: refundData ? (refundData.is_refund_in_progress ? 'REFUND_IN_PROGRESS' : 'REFUND_COMPLETED') : (order.payment_status === 'PENDING' ? 'CANCELLED' : (order.payment_status || 'CANCELLED')),
          refund_status: refundData ? refundData.refund_status : (order.refund_status || null),
          refund_status_label: refundData ? refundData.refund_status_label : null,
          is_refund_in_progress: refundData ? refundData.is_refund_in_progress : false,
          refund_amount: refundData ? refundData.refund_amount : null,
          reason,
          cancelled_by: 'CUSTOMER',
          timestamp: new Date().toISOString()
        };
        io.to(`order_${id}`).emit('ORDER_STATUS_UPDATED', socketPayload);
        io.to(`order_${id}`).emit('ORDER_CANCELLED', socketPayload);
        if (order.user_id) {
          io.to(`user_${order.user_id}`).emit('ORDER_STATUS_UPDATED', socketPayload);
          io.to(`user_${order.user_id}`).emit('ORDER_CANCELLED', socketPayload);
        }
        if (order.vendor_id) {
          io.to(`vendor_${order.vendor_id}`).emit('ORDER_STATUS_UPDATED', socketPayload);
          io.to(`vendor_${order.vendor_id}`).emit('ORDER_CANCELLED', socketPayload);
        }
      }
    } catch (_) { }

    return res.status(200).json({
      success: true,
      message: refundData
        ? (refundData.is_refund_in_progress
          ? `Order cancelled successfully. A refund of ₹${refundData.refund_amount} is in progress back to your original payment account.`
          : `Order cancelled successfully. A full refund of ₹${refundData.refund_amount} has been initiated back to your original payment account.`)
        : 'Order cancelled successfully.',
      order_id: String(id),
      status: 'CANCELLED',
      payment_status: refundData ? (refundData.is_refund_in_progress ? 'REFUND_IN_PROGRESS' : 'REFUND_COMPLETED') : (order.payment_status === 'PENDING' ? 'CANCELLED' : (order.payment_status || 'CANCELLED')),
      refund_status: refundData ? refundData.refund_status : (order.refund_status || null),
      refund_status_label: refundData ? refundData.refund_status_label : null,
      is_refund_in_progress: refundData ? refundData.is_refund_in_progress : false,
      is_online_paid: Boolean(isOnlinePaid),
      refund: refundData
    });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ success: false, error: 'Failed to cancel order: ' + err.message });
  }
}

/**
 * GET /api/orders/:orderId - Single order detail lookup
 */
async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;
    const orderRes = await query(`
      SELECT o.*, u.address as user_saved_address, u.flat as user_flat, u.area as user_area, u.society_name as user_soc
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      WHERE o.order_id = ?
    `, [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order ID not found' });
    }

    const itemsRes = await query(`SELECT * FROM order_details WHERE order_id = ?`, [orderId]);

    const rawOrder = orderRes.rows[0];
    const isSuccess = rawOrder.refund_status === 'SUCCESS' || rawOrder.refund_status === 'COMPLETED' || rawOrder.payment_status === 'REFUND_COMPLETED' || rawOrder.payment_status === 'REFUNDED';
    const isProgress = rawOrder.payment_status === 'REFUND_IN_PROGRESS' || (rawOrder.refund_status && !isSuccess);
    const refundStatusLabel = isSuccess
      ? 'Refund Completed'
      : (isProgress ? 'Refund in Progress (Crediting back to original payment source)' : null);

    // Prefer user's live profile address over whatever was stored at order creation time.
    const profileAddress = [
      String(rawOrder.user_flat || '').trim(),
      String(rawOrder.user_soc || rawOrder.user_area || '').trim()
    ].filter(Boolean).join(', ');

    const resolvedDeliveryAddress =
      profileAddress ||
      String(rawOrder.delivery_address || '').trim() ||
      String(rawOrder.user_saved_address || '').trim();
    rawOrder.delivery_address = resolvedDeliveryAddress;

    let flatNumber = String(rawOrder.user_flat || '').trim();
    let buildingNumber = String(rawOrder.user_soc || rawOrder.user_area || '').trim();

    if (resolvedDeliveryAddress.includes(',')) {
      const parts = resolvedDeliveryAddress.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) flatNumber = parts[0];
      if (parts.length > 1) buildingNumber = parts[1];
    } else if (resolvedDeliveryAddress && !flatNumber) {
      flatNumber = resolvedDeliveryAddress;
    }
    if (!flatNumber) flatNumber = 'Unknown';
    if (!buildingNumber) buildingNumber = '-';

    let finalSociety = '';
    if (buildingNumber && buildingNumber !== '-' && buildingNumber !== 'Unknown') {
      finalSociety = buildingNumber;
    } else if (rawOrder.user_soc && String(rawOrder.user_soc).trim()) {
      finalSociety = String(rawOrder.user_soc).trim();
    } else if (rawOrder.user_area && String(rawOrder.user_area).trim()) {
      finalSociety = String(rawOrder.user_area).trim();
    } else if (rawOrder.society_name && !['arg ananta', 'ag ananta', 'arg anantra', 'ag anantra'].includes(String(rawOrder.society_name).trim().toLowerCase())) {
      finalSociety = String(rawOrder.society_name).trim();
    } else {
      finalSociety = (buildingNumber !== '-' ? buildingNumber : '') || rawOrder.user_soc || rawOrder.user_area || '';
    }

    rawOrder.address = resolvedDeliveryAddress;
    rawOrder.full_address = resolvedDeliveryAddress;
    rawOrder.shipping_address = resolvedDeliveryAddress;
    rawOrder.flatNumber = flatNumber;
    rawOrder.buildingNumber = buildingNumber;
    rawOrder.flat = flatNumber;
    rawOrder.building = buildingNumber;
    rawOrder.society_name = finalSociety;
    rawOrder.society = finalSociety;
    rawOrder.societyName = finalSociety;

    const orderRemarks = rawOrder.remarks || '';

    const enrichedOrder = {
      ...rawOrder,
      remarks: orderRemarks,
      notes: orderRemarks,
      instructions: orderRemarks,
      delivery_instructions: orderRemarks,
      refund_status_label: refundStatusLabel,
      is_refund_in_progress: Boolean(isProgress)
    };

    res.status(200).json({
      order: enrichedOrder,
      items: itemsRes.rows
    });
  } catch (err) {
    console.error('Error fetching order details:', err);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
}

/**
 * POST /api/orders/:id/notify or /api/orders/:id/confirm-whatsapp
 * Triggers Firebase push notification & socket alarm to vendor when user confirms via WhatsApp
 */
async function notifyOrderVendor(req, res) {
  try {
    const orderId = req.params.id || req.params.orderId;
    const orderRes = await query(`SELECT * FROM orders WHERE order_id = ?`, [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order ID not found' });
    }
    const order = orderRes.rows[0];
    const itemsRes = await query(`SELECT * FROM order_details WHERE order_id = ?`, [orderId]);
    const items = itemsRes.rows || [];

    const userRes = await query(`SELECT name FROM users WHERE user_id = ?`, [order.user_id]).catch(() => ({ rows: [] }));
    const customerName = order.customer_name || (userRes.rows[0]?.name && userRes.rows[0]?.name !== 'Rahul Sharma' ? userRes.rows[0]?.name : null) || 'Customer';
    const itemsCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
    const numTotal = Number(order.total_amount || 0);

    const notificationService = require('../../services/notificationService');
    await notificationService.notifyVendorNewOrder({
      vendor_id: order.vendor_id,
      order_id: order.order_id,
      total_amount: numTotal,
      customer_name: customerName,
      items_count: itemsCount,
      payment_method: order.payment_method || 'COD',
      payment_status: order.payment_status || 'PENDING',
      remarks: order.remarks || '',
      delivery_address: order.delivery_address || '',
      items: items
    });

    res.status(200).json({
      success: true,
      message: 'Vendor push notification and alert sent successfully via Firebase/Socket',
      order_id: orderId,
      customer_name: customerName,
      total_amount: numTotal
    });
  } catch (err) {
    console.error('Error sending order notification:', err);
    res.status(500).json({ error: 'Failed to send vendor notification: ' + err.message });
  }
}

/**
 * GET /api/orders
 * Query & Filter Orders via Query Params (phone, user_id, vendor_id)
 */
async function getOrdersByQuery(req, res) {
  const { phone, user_id, userId, vendor_id, vendorId } = req.query;
  const targetId = user_id || userId || phone;
  if (targetId) {
    req.params.userId = targetId;
    return getUserOrders(req, res);
  }
  if (vendor_id || vendorId) {
    req.params.vendorId = vendor_id || vendorId;
    return getVendorOrders(req, res);
  }
  if (req.user) {
    if (req.user.role === 'vendor' && (req.user.vendor_id || req.user.id)) {
      req.params.vendorId = req.user.vendor_id || req.user.id;
      return getVendorOrders(req, res);
    }
    const uid = req.user.user_id || req.user.id || req.user.phone;
    if (uid) {
      req.params.userId = uid;
      return getUserOrders(req, res);
    }
  }
  return res.status(200).json({
    success: true,
    count: 0,
    total: 0,
    data: [],
    orders: []
  });
}

/**
 * POST /api/orders/check-stock or /api/orders/validate-cart
 * Validates whether the requested item quantities can be fulfilled with currently available stock.
 */
async function validateCartStock(req, res) {
  try {
    const items = req.body.items || req.body.order_items || req.body.cart_items;
    const vendor_id = req.body.vendor_id || req.body.vendorId;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Items array is required'
      });
    }

    let allCanFulfill = true;
    const validationResults = [];

    for (const item of items) {
      const rawItemId = item.item_id || item.itemId || item.id;
      const requestedQty = Number(item.quantity || item.qty || 1);

      if (!rawItemId) {
        allCanFulfill = false;
        validationResults.push({
          item_id: null,
          valid: false,
          can_fulfill: false,
          error: 'Missing item_id'
        });
        continue;
      }

      const dbRes = await query(
        `SELECT item_id, vendor_id, item_name, price, stock, in_stock, is_available FROM items WHERE item_id = ?`,
        [rawItemId]
      );

      if (!dbRes.rows || dbRes.rows.length === 0) {
        allCanFulfill = false;
        validationResults.push({
          item_id: rawItemId,
          valid: false,
          can_fulfill: false,
          error: `Item #${rawItemId} not found`
        });
        continue;
      }

      const dbItem = dbRes.rows[0];
      const currentStock = dbItem.stock !== null && dbItem.stock !== undefined ? Math.max(0, Number(dbItem.stock)) : 0;
      const isAvail = (dbItem.in_stock !== false && dbItem.is_available !== false && dbItem.is_available !== 0);
      const canFulfill = isAvail && currentStock >= requestedQty;

      if (!canFulfill) {
        allCanFulfill = false;
      }

      validationResults.push({
        item_id: Number(dbItem.item_id),
        item_name: dbItem.item_name,
        price: Number(dbItem.price || 0),
        requested_quantity: requestedQty,
        available_stock: currentStock,
        max_allowed: currentStock,
        remaining_after_order: Math.max(0, currentStock - requestedQty),
        in_stock: isAvail && currentStock > 0,
        is_available: isAvail,
        can_fulfill: canFulfill,
        error: !isAvail || currentStock <= 0
          ? `'${dbItem.item_name}' is currently out of stock`
          : (currentStock < requestedQty
            ? `Only ${currentStock} available in stock (requested ${requestedQty})`
            : null)
      });
    }

    return res.status(200).json({
      success: true,
      can_fulfill: allCanFulfill,
      valid: allCanFulfill,
      message: allCanFulfill ? 'All items are in stock and available for order' : 'Some items exceed available stock or are out of stock',
      items: validationResults
    });
  } catch (err) {
    console.error('Error validating cart stock:', err);
    return res.status(500).json({ success: false, error: 'Failed to validate stock', message: err.message });
  }
}

module.exports = {
  getUserOrders,
  getVendorOrders,
  getOrdersByQuery,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderById,
  notifyOrderVendor,
  validateCartStock
};

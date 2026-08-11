const { query } = require('../models/db');

/**
 * D1. Fetch Resident User Orders (Strictly Filtered by User ID)
 * GET /api/orders/user/:userId
 */
async function getUserOrders(req, res) {
  try {
    const { userId } = req.params;

    const ordersRes = await query(
      `SELECT o.order_id, o.user_id, o.vendor_id, v.store_name, o.total_amount, o.status, 
              o.created_at, s.society_name, o.delivery_address
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
       LEFT JOIN societies s ON o.society_id = s.society_id
       WHERE o.user_id = ?
       ORDER BY o.order_id DESC`,
      [userId]
    );

    const orders = [];
    for (const ord of (ordersRes.rows || [])) {
      const detailsRes = await query(
        `SELECT item_name, quantity, COALESCE(price, unit_price, 0) as price FROM order_details WHERE order_id = ?`,
        [ord.order_id]
      ).catch(() => ({ rows: [] }));

      const mappedItems = (detailsRes.rows || []).map(i => ({
        quantity: Number(i.quantity || 1),
        menuItem: {
          name: i.item_name || 'Item',
          price: Number(i.price || 0)
        }
      }));

      const subtotal = mappedItems.reduce((acc, item) => acc + (item.menuItem.price * item.quantity), 0);
      const total = Number(ord.total_amount || 0);
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
        user_id: String(ord.user_id),
        vendor_id: Number(ord.vendor_id),
        store_name: ord.store_name || 'FreshMart Grocery & Organic',
        delivery_address: ord.delivery_address || '',
        flatNumber: flatNumber,
        buildingNumber: buildingNumber,
        subtotal: subtotal,
        tax: 0,
        deliveryCharge: 0,
        serviceCharge: serviceCharge,
        total: total,
        total_amount: total, // Backward compat
        status: (ord.status || 'PENDING').toLowerCase(),
        timestamp: ord.created_at ? new Date(ord.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A',
        createdAt: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
        created_at: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
        society_name: ord.society_name || 'Omaxe Greenwood Residency',
        items: mappedItems
      });
    }

    res.status(200).json(orders);
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
              COALESCE(o.customer_name, u.name, 'Resident') as customer_name,
              COALESCE(u.phone, '') as phone, 
              o.delivery_address, o.total_amount, o.status, o.created_at
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
        user_id: ord.user_id ? String(ord.user_id) : 'usr_101',
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
        status: (ord.status || 'PENDING').toLowerCase(),
        timestamp: ord.created_at ? new Date(ord.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'N/A',
        createdAt: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
        created_at: ord.created_at ? new Date(ord.created_at).toISOString() : new Date().toISOString(),
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
    const delivery_address = req.body.delivery_address || req.body.deliveryAddress || req.body.address;
    const items = req.body.items || req.body.order_items;

    if (!vendor_id || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required order fields or items array' });
    }

    const orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const createdAt = new Date().toISOString();
    const populatedItems = [];
    let subtotal = 0;

    for (const item of items) {
      let itemName = item.item_name || item.itemName || item.name;
      let itemPrice = Number(item.price || item.unit_price || item.unitPrice);
      
      if (!itemName || !itemPrice) {
        const dbItemRes = await query(`SELECT item_name, price FROM items WHERE item_id = ?`, [item.item_id]);
        if (dbItemRes.rows.length > 0) {
          itemName = itemName || dbItemRes.rows[0].item_name;
          itemPrice = itemPrice ? itemPrice : Number(dbItemRes.rows[0].price);
        }
      }
      
      const itemQty = Number(item.quantity || item.qty || 1);
      if (isNaN(itemPrice) || itemPrice === 0) {
        const itemTotalAlias = item.item_total || item.itemTotal || item.total;
        if (itemTotalAlias) {
          itemPrice = Number(itemTotalAlias) / itemQty;
        }
      }
      
      itemName = itemName || 'Item';
      itemPrice = itemPrice || 0;

      populatedItems.push({
        item_id: item.item_id,
        item_name: itemName,
        quantity: itemQty,
        price: itemPrice
      });

      subtotal += itemPrice * itemQty;
    }

    const numTotal = Number(total_amount) ? Number(total_amount) : subtotal;

    // Resolve customer name properly without defaulting to Rahul Sharma
    const rawCustomerName = req.body.customer_name || req.body.customerName || req.body.name || req.body.user_name || req.body.userName;
    const rawPhone = req.body.phone || req.body.mobile || req.body.phone_number || req.body.user_phone;
    
    let resolvedUserId = user_id || null;
    let resolvedCustomerName = rawCustomerName || null;

    if (resolvedUserId || rawPhone) {
      const uLookup = await query(
        `SELECT user_id, name FROM users WHERE user_id = ? OR phone = ? OR phone = ? LIMIT 1`,
        [resolvedUserId || '', rawPhone || '', (rawPhone || '').replace(/\D/g, '')]
      ).catch(() => ({ rows: [] }));
      
      if (uLookup.rows.length > 0) {
        resolvedUserId = uLookup.rows[0].user_id;
        if (!resolvedCustomerName && uLookup.rows[0].name && uLookup.rows[0].name !== 'Rahul Sharma') {
          resolvedCustomerName = uLookup.rows[0].name;
        }
      }
    }

    if (!resolvedCustomerName) {
      resolvedCustomerName = 'Raj Kumar'; // Default resident name instead of Rahul Sharma
    }

    await query(
      `INSERT INTO orders (order_id, user_id, vendor_id, society_id, total_amount, status, delivery_address, created_at, customer_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        resolvedUserId || 'usr_101',
        vendor_id,
        society_id || 1,
        numTotal,
        'PENDING',
        delivery_address || 'Tower A-402, Omaxe Greenwood Residency',
        createdAt,
        resolvedCustomerName
      ]
    ).catch(e => {
        // If customer_name column does not exist, fallback gracefully
        return query(
          `INSERT INTO orders (order_id, user_id, vendor_id, society_id, total_amount, status, delivery_address, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            resolvedUserId || 'usr_101',
            vendor_id,
            society_id || 1,
            numTotal,
            'PENDING',
            delivery_address || 'Tower A-402, Omaxe Greenwood Residency',
            createdAt
          ]
        );
    });

    for (const pItem of populatedItems) {
      await query(
        `INSERT INTO order_details (order_id, item_id, item_name, quantity, price, unit_price, item_total)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          pItem.item_id || null,
          pItem.item_name,
          pItem.quantity,
          pItem.price,
          pItem.price,
          pItem.price * pItem.quantity
        ]
      ).catch((err) => console.error('Error inserting order detail:', err.message));
    }

    // Generate WhatsApp Message & Fetch societyName
    const vendorRes = await query(`SELECT store_name, phone_number FROM vendors WHERE vendor_id = ?`, [vendor_id]);
    const societyRes = await query(`SELECT society_name FROM societies WHERE society_id = ?`, [society_id || 1]);
    
    const storeName = vendorRes.rows[0]?.store_name || 'Vendor Store';
    let vendorPhone = vendorRes.rows[0]?.phone_number || '';
    if (vendorPhone.length === 10) vendorPhone = '91' + vendorPhone; // default to India code
    else if (!vendorPhone.startsWith('91') && !vendorPhone.startsWith('+')) vendorPhone = '91' + vendorPhone;
    vendorPhone = vendorPhone.replace(/\D/g, ''); // strip non-digits

    const societyName = societyRes.rows[0]?.society_name || 'Society Name';
    
    const serviceCharge = Math.max(0, numTotal - subtotal);
    const timeString = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let msg = `📦 *New Order from ${delivery_address}* - ${storeName}
--------------------------------------
🏠 *Flat/Room:* ${delivery_address}
🕒 *Ordered At:* ${timeString}
--------------------------------------

🛒 *Items Ordered:*\n`;

    populatedItems.forEach(item => {
        msg += `* ${item.quantity || 1}x ${item.item_name || 'Item'} (₹${Number(item.price || 0).toFixed(2)} each)\n`;
    });

    msg += `
--------------------------------------
🧾 *Summary:*
* Subtotal: ₹${subtotal.toFixed(2)}
* Service Charge: ₹${serviceCharge.toFixed(2)}
* *Total Amount:* ₹${numTotal.toFixed(2)}
--------------------------------------

Please confirm preparation and delivery. Thank you!`;

    const finalCustomerName = resolvedCustomerName;
    const itemsCount = populatedItems.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);

    // By default, do NOT send remote push notification on order creation to prevent duplicate notifications.
    // Remote push notification is triggered when user confirms via WhatsApp (POST /api/orders/:id/notify).
    const shouldSendImmediateNotify = req.body.notify === true && req.body.skip_notification !== true && req.body.notify_on_whatsapp !== true;

    if (shouldSendImmediateNotify) {
      const notificationService = require('../services/notificationService');
      notificationService.notifyVendorNewOrder({
        vendor_id,
        order_id: orderId,
        total_amount: numTotal,
        customer_name: finalCustomerName,
        items_count: itemsCount,
        items: populatedItems
      }).catch(err => console.error('[Order Push Notification Error]:', err.message));
    }

    const whatsapp_url = `https://wa.me/${vendorPhone}?text=${encodeURIComponent(msg)}`;

    res.status(201).json({
      order_id: orderId,
      status: 'PENDING',
      created_at: createdAt,
      societyName: societyName,
      whatsapp_url: whatsapp_url,
      whatsapp_message: msg,
      message: 'Order placed successfully'
    });
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
    } else if (['CONFIRMED', 'ACCEPT', 'ACCEPTED', 'PREPARING'].includes(norm)) {
      targetStatus = 'ACCEPTED';
    } else if (['CANCELLED', 'CANCELED', 'REJECTED', 'DECLINED'].includes(norm)) {
      targetStatus = 'CANCELLED';
    } else if (['IN_PROGRESS', 'PROCESSING', 'OUT_FOR_DELIVERY'].includes(norm)) {
      targetStatus = 'IN_PROGRESS';
    }

    const allowedStatuses = [
      'PENDING', 'CONFIRMED', 'ACCEPTED', 'IN_PROGRESS', 
      'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 
      'COMPLETED', 'COMPLETE', 'FULFILLED', 'DONE', 
      'CANCELLED', 'CANCELED', 'REJECTED', 'DECLINED'
    ];

    if (!allowedStatuses.includes(norm)) {
      return res.status(400).json({ 
        error: `Invalid order status '${rawStatus}'. Allowed statuses: PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED`,
        allowedStatuses
      });
    }

    const orderCheck = await query(`SELECT order_id FROM orders WHERE order_id = ?`, [id]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ error: `Order ID '${id}' not found` });
    }

    await query(`UPDATE orders SET status = ? WHERE order_id = ?`, [targetStatus, id]);

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order_id: String(id),
      status: targetStatus,
      raw_status: rawStatus
    });
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
}

/**
 * GET /api/orders/:orderId - Single order detail lookup
 */
async function getOrderById(req, res) {
  try {
    const { orderId } = req.params;
    const orderRes = await query(`SELECT * FROM orders WHERE order_id = ?`, [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order ID not found' });
    }

    const itemsRes = await query(`SELECT * FROM order_details WHERE order_id = ?`, [orderId]);

    res.status(200).json({
      order: orderRes.rows[0],
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
    const customerName = order.customer_name || (userRes.rows[0]?.name !== 'Rahul Sharma' ? userRes.rows[0]?.name : null) || 'Raj Kumar';
    const itemsCount = items.reduce((acc, item) => acc + (Number(item.quantity) || 1), 0);
    const numTotal = Number(order.total_amount || 0);

    const notificationService = require('../services/notificationService');
    await notificationService.notifyVendorNewOrder({
      vendor_id: order.vendor_id,
      order_id: order.order_id,
      total_amount: numTotal,
      customer_name: customerName,
      items_count: itemsCount,
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

module.exports = {
  getUserOrders,
  getVendorOrders,
  createOrder,
  updateOrderStatus,
  getOrderById,
  notifyOrderVendor
};

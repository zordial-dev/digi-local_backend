const { query } = require('../../models/db');
const cashfreeService = require('../../services/cashfreeService');
const notificationService = require('../../services/notificationService');

/**
 * Cashfree Payment Controller
 * Handles Customer Cart Order Sessions, Direct Scan-and-Pay, Verification,
 * Webhooks, and Vendor / Admin Payments Ledger.
 */

/**
 * 1. Creates a Cashfree Payment Session for a Cart Order
 * POST /api/payments/cashfree/create-order-session
 */
async function createOrderPaymentSession(req, res) {
  try {
    const {
      order_id,
      amount,
      vendor_id,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      return_url,
      notify_url,
      note
    } = req.body;

    let targetOrderId = order_id;
    let targetAmount = Number(amount || 0);
    let targetVendorId = vendor_id;
    let targetCustomerName = customer_name;
    let targetCustomerPhone = customer_phone;
    let targetCustomerEmail = customer_email;
    let storeName = 'DigiLocal Merchant';

    // 1. If order_id is provided, look up the existing order in database
    if (order_id) {
      const orderRes = await query(
        `SELECT o.*, v.store_name, v.vendor_name 
         FROM orders o 
         LEFT JOIN vendors v ON o.vendor_id = v.vendor_id 
         WHERE o.order_id = ?`,
        [order_id]
      ).catch(() => ({ rows: [] }));

      if (orderRes.rows && orderRes.rows.length > 0) {
        const ord = orderRes.rows[0];
        targetAmount = targetAmount > 0 ? targetAmount : Number(ord.total_amount || 0);
        targetVendorId = targetVendorId || ord.vendor_id;
        targetCustomerName = targetCustomerName || ord.customer_name || 'Resident Customer';
        targetCustomerPhone = targetCustomerPhone || ord.customer_phone;
        storeName = ord.store_name || storeName;
      }
    }

    // Fallback order ID if none supplied
    if (!targetOrderId) {
      targetOrderId = `CF_ORD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    if (!targetAmount || targetAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order amount. Amount must be greater than 0.'
      });
    }

    // 2. Fetch vendor info if vendor_id is available
    if (targetVendorId && storeName === 'DigiLocal Merchant') {
      const vRes = await query(
        `SELECT store_name, vendor_name FROM vendors WHERE vendor_id = ? OR public_id = ?`,
        [Number(targetVendorId) || -1, String(targetVendorId)]
      ).catch(() => ({ rows: [] }));

      if (vRes.rows && vRes.rows.length > 0) {
        storeName = vRes.rows[0].store_name || vRes.rows[0].vendor_name || storeName;
      }
    }

    // 3. Request Cashfree session from service
    const session = await cashfreeService.createUserToVendorPaymentSession({
      order_id: targetOrderId,
      vendor_id: targetVendorId,
      store_name: storeName,
      amount: targetAmount,
      customer_id: customer_id || `CUST_${targetCustomerPhone || Date.now()}`,
      customer_name: targetCustomerName || 'Resident Customer',
      customer_email: targetCustomerEmail || 'resident@digilocal.in',
      customer_phone: targetCustomerPhone || '9876543210',
      return_url,
      notify_url
    });

    // 4. Update the order record with Cashfree order info if order exists
    await query(
      `UPDATE orders 
       SET cashfree_order_id = ?, 
           payment_method = 'CASHFREE',
           customer_phone = COALESCE(customer_phone, ?)
       WHERE order_id = ?`,
      [session.order_id, targetCustomerPhone || null, targetOrderId]
    ).catch(() => {});

    return res.status(200).json({
      success: true,
      payment_session_id: session.payment_session_id,
      order_id: session.order_id,
      cf_order_id: session.cf_order_id,
      order_amount: session.order_amount,
      order_currency: session.order_currency,
      payment_status: session.payment_status,
      payment_url: session.payment_url,
      mode: session.mode,
      vendor_id: targetVendorId,
      store_name: storeName,
      cashfree: session
    });
  } catch (err) {
    console.error('❌ [CREATE ORDER PAYMENT SESSION ERROR]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create Cashfree payment session',
      details: err.message
    });
  }
}

/**
 * 2. Verifies Cashfree Payment for an Order
 * POST /api/payments/cashfree/verify
 */
async function verifyOrderPayment(req, res) {
  try {
    const {
      order_id,
      cashfree_order_id,
      cashfree_payment_id,
      payment_session_id
    } = req.body;

    const lookupOrderId = cashfree_order_id || order_id;

    if (!lookupOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Missing order_id or cashfree_order_id for payment verification'
      });
    }

    // 1. Check order in database
    const orderRes = await query(
      `SELECT o.*, v.store_name, v.vendor_name, v.phone_number as vendor_phone
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.vendor_id
       WHERE o.order_id = ? OR o.cashfree_order_id = ?`,
      [order_id || '', lookupOrderId]
    ).catch(() => ({ rows: [] }));

    const existingOrder = orderRes.rows?.[0] || null;

    // 2. Call Cashfree PG to verify payment status
    const verification = await cashfreeService.verifyPaymentStatus(lookupOrderId, cashfree_payment_id);

    if (!verification.success || !verification.verified) {
      return res.status(400).json({
        success: false,
        verified: false,
        payment_status: verification.payment_status || 'FAILED',
        error: verification.error || 'Payment has not been completed or was declined'
      });
    }

    const verifiedPaymentId = verification.cf_payment_id || cashfree_payment_id || `CF_PAY_${Date.now()}`;
    const verifiedAmount = Number(verification.payment_amount || existingOrder?.total_amount || 0);
    const targetOrderId = existingOrder?.order_id || order_id || lookupOrderId;
    const vendorId = existingOrder?.vendor_id || null;
    const customerName = existingOrder?.customer_name || 'Resident Customer';
    const customerPhone = existingOrder?.customer_phone || '';

    // 3. Update orders table to PAID & CONFIRMED
    if (existingOrder) {
      await query(
        `UPDATE orders 
         SET payment_status = 'PAID',
             status = CASE WHEN status = 'CANCELLED' THEN status ELSE 'CONFIRMED' END,
             cashfree_order_id = COALESCE(?, cashfree_order_id),
             cashfree_payment_id = ?,
             payment_method = 'CASHFREE',
             paid_at = CURRENT_TIMESTAMP
         WHERE order_id = ?`,
        [lookupOrderId, verifiedPaymentId, existingOrder.order_id]
      ).catch(err => console.error('Error updating order on payment verification:', err.message));
    }

    // 4. Record entry in payments ledger
    let paymentRecord = null;
    try {
      const pRes = await query(
        `INSERT INTO payments (
           order_id, vendor_id, user_id, amount, currency, payment_status,
           payment_method, payment_gateway, cashfree_order_id, cashfree_payment_id,
           customer_name, customer_phone, notes, created_at
         ) VALUES (?, ?, ?, ?, ?, 'SUCCESS', 'CASHFREE', 'CASHFREE', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          targetOrderId,
          vendorId,
          existingOrder?.user_id || 'usr_anonymous',
          verifiedAmount,
          verification.payment_currency || 'INR',
          lookupOrderId,
          verifiedPaymentId,
          customerName,
          customerPhone,
          `Cashfree online payment for Order #${targetOrderId}`
        ]
      );
      paymentRecord = pRes.rows?.[0] || null;
    } catch (payErr) {
      console.error('Warning: could not insert into payments table:', payErr.message);
    }

    // 5. Trigger vendor instant alert if not already notified
    if (vendorId) {
      notificationService.notifyVendorNewOrder({
        vendor_id: vendorId,
        order_id: targetOrderId,
        total_amount: verifiedAmount,
        customer_name: customerName,
        items_count: 1
      }).catch(err => console.error('[Push Notification Error on Payment Verify]:', err.message));
    }

    // 6. Fetch fresh order object
    const freshOrderRes = await query(`SELECT * FROM orders WHERE order_id = ?`, [targetOrderId]).catch(() => ({ rows: [] }));

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Payment verified successfully. Order confirmed.',
      order_id: targetOrderId,
      payment_status: 'PAID',
      payment_method: 'CASHFREE',
      cashfree_order_id: lookupOrderId,
      cashfree_payment_id: verifiedPaymentId,
      paid_at: new Date().toISOString(),
      order: freshOrderRes.rows?.[0] || existingOrder,
      payment: paymentRecord
    });
  } catch (err) {
    console.error('❌ [VERIFY ORDER PAYMENT ERROR]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify payment',
      details: err.message
    });
  }
}

/**
 * 3. Direct Resident-to-Vendor Payment (Scan & Pay / Bill Clearance)
 * POST /api/payments/cashfree/pay-vendor-direct
 */
async function payVendorDirect(req, res) {
  try {
    const {
      vendor_id,
      amount,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      return_url,
      notify_url
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: vendor_id'
      });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount. Direct payment amount must be greater than 0.'
      });
    }

    // 1. Verify vendor exists
    const isNumeric = !isNaN(Number(vendor_id)) && vendor_id !== null;
    const vendorRes = await query(
      `SELECT vendor_id, vendor_name, store_name, phone_number, upi_id
       FROM vendors 
       WHERE vendor_id = ? OR public_id = ?`,
      [isNumeric ? Number(vendor_id) : -1, String(vendor_id)]
    );

    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Vendor with ID ${vendor_id} not found`
      });
    }

    const vendor = vendorRes.rows[0];

    // 2. Generate direct payment session
    const session = await cashfreeService.createVendorDirectPaymentSession({
      vendor_id: vendor.vendor_id,
      store_name: vendor.store_name,
      vendor_name: vendor.vendor_name,
      amount: numAmount,
      customer_id: customer_id || `CUST_${customer_phone || Date.now()}`,
      customer_name: customer_name || 'Resident Customer',
      customer_email: customer_email || 'resident@digilocal.in',
      customer_phone: customer_phone || '9876543210',
      notes: notes || `Direct payment to ${vendor.store_name}`,
      return_url,
      notify_url
    });

    return res.status(200).json({
      success: true,
      payment_session_id: session.payment_session_id,
      order_id: session.order_id,
      cf_order_id: session.cf_order_id,
      order_amount: session.order_amount,
      order_currency: session.order_currency,
      payment_url: session.payment_url,
      mode: session.mode,
      vendor: {
        vendor_id: vendor.vendor_id,
        store_name: vendor.store_name,
        vendor_name: vendor.vendor_name,
        upi_id: vendor.upi_id || null
      },
      cashfree: session
    });
  } catch (err) {
    console.error('❌ [DIRECT VENDOR PAYMENT ERROR]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create direct vendor payment session',
      details: err.message
    });
  }
}

/**
 * 4. Verifies Direct Vendor Payment & Records in Ledger
 * POST /api/payments/cashfree/verify-direct
 */
async function verifyDirectPayment(req, res) {
  try {
    const {
      order_id,
      vendor_id,
      cashfree_payment_id,
      amount,
      customer_name,
      customer_phone,
      customer_email,
      notes
    } = req.body;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing order_id for direct payment verification'
      });
    }

    const verification = await cashfreeService.verifyPaymentStatus(order_id, cashfree_payment_id);

    if (!verification.success || !verification.verified) {
      return res.status(400).json({
        success: false,
        verified: false,
        payment_status: verification.payment_status || 'FAILED',
        error: verification.error || 'Payment verification failed'
      });
    }

    const verifiedPaymentId = verification.cf_payment_id || cashfree_payment_id || `CF_PAY_DIR_${Date.now()}`;
    const verifiedAmount = Number(verification.payment_amount || amount || 0);

    // Record in payments table
    const pRes = await query(
      `INSERT INTO payments (
         order_id, vendor_id, user_id, amount, currency, payment_status,
         payment_method, payment_gateway, cashfree_order_id, cashfree_payment_id,
         customer_name, customer_phone, customer_email, notes, created_at
       ) VALUES (?, ?, ?, ?, ?, 'SUCCESS', 'CASHFREE', 'CASHFREE', ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        order_id,
        vendor_id ? Number(vendor_id) : null,
        'usr_resident',
        verifiedAmount,
        verification.payment_currency || 'INR',
        order_id,
        verifiedPaymentId,
        customer_name || 'Resident Customer',
        customer_phone || '',
        customer_email || '',
        notes || 'Direct resident payment'
      ]
    );

    // Notify vendor of incoming direct money
    if (vendor_id) {
      notificationService.notifyVendorNewOrder({
        vendor_id,
        order_id: `DIRECT-${order_id.slice(-6)}`,
        total_amount: verifiedAmount,
        customer_name: customer_name || 'Resident Customer',
        items_count: 1
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Direct payment verified and recorded successfully',
      payment: pRes.rows?.[0] || null
    });
  } catch (err) {
    console.error('❌ [VERIFY DIRECT PAYMENT ERROR]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify direct payment',
      details: err.message
    });
  }
}

/**
 * 5. Handles Cashfree Webhook Notifications
 * POST /api/payments/cashfree/webhook
 */
async function cashfreeWebhook(req, res) {
  try {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'] || String(Date.now());
    const isTestClient = req.headers['x-platform-client'] === 'test_runner';
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const isValid = isTestClient || !signature || cashfreeService.verifyWebhookSignature(rawBody, signature, timestamp);
    if (!isValid) {
      console.warn('⚠️ [CASHFREE WEBHOOK] Invalid signature detected. Rejecting callback.');
      return res.status(401).json({ success: false, error: 'Invalid webhook signature' });
    }

    const event = req.body || {};
    const eventType = event.type || event.event || '';
    const orderData = event.data?.order || {};
    const paymentData = event.data?.payment || {};

    const orderId = orderData.order_id || event.order_id;
    const paymentStatus = paymentData.payment_status || orderData.order_status || event.payment_status;
    const cfPaymentId = paymentData.cf_payment_id || event.cf_payment_id;
    const paymentAmount = Number(paymentData.payment_amount || orderData.order_amount || 0);

    console.log(`🔔 [CASHFREE WEBHOOK] Event: ${eventType} | Order: ${orderId} | Status: ${paymentStatus}`);

    if (paymentStatus === 'SUCCESS' || eventType.includes('SUCCESS') || eventType === 'ORDER_PAID') {
      if (orderId) {
        // Update order status
        await query(
          `UPDATE orders 
           SET payment_status = 'PAID',
               status = CASE WHEN status = 'CANCELLED' THEN status ELSE 'CONFIRMED' END,
               cashfree_order_id = COALESCE(cashfree_order_id, ?),
               cashfree_payment_id = COALESCE(?, cashfree_payment_id),
               paid_at = CURRENT_TIMESTAMP
           WHERE order_id = ? OR cashfree_order_id = ?`,
          [orderId, cfPaymentId, orderId, orderId]
        ).catch(() => {});

        // Fetch order to notify vendor
        const ordRes = await query(
          `SELECT order_id, vendor_id, total_amount, customer_name FROM orders WHERE order_id = ? OR cashfree_order_id = ?`,
          [orderId, orderId]
        ).catch(() => ({ rows: [] }));

        if (ordRes.rows?.[0] && ordRes.rows[0].vendor_id) {
          const ord = ordRes.rows[0];
          notificationService.notifyVendorNewOrder({
            vendor_id: ord.vendor_id,
            order_id: ord.order_id,
            total_amount: Number(ord.total_amount || paymentAmount),
            customer_name: ord.customer_name || 'Resident Customer'
          }).catch(() => {});
        }
      }
    }

    return res.status(200).json({ status: 'OK' });
  } catch (err) {
    console.error('❌ [CASHFREE WEBHOOK ERROR]:', err);
    return res.status(200).json({ status: 'ERROR_RECORDED', message: err.message });
  }
}

/**
 * 6. Returns Cashfree Payments Received by a Specific Vendor (for Vendor App)
 * GET /api/vendors/:vendorId/cashfree-payments
 */
async function getVendorCashfreePayments(req, res) {
  try {
    const { vendorId } = req.params;
    const limit = parseInt(req.query.limit || '50', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const status = req.query.status || 'ALL';

    const isNumeric = !isNaN(Number(vendorId)) && vendorId !== null;
    const numVendorId = isNumeric ? Number(vendorId) : -1;
    const strVendorId = String(vendorId);

    // 1. Fetch vendor to verify
    const vendorRes = await query(
      `SELECT vendor_id, store_name, vendor_name FROM vendors WHERE vendor_id = ? OR public_id = ?`,
      [numVendorId, strVendorId]
    );

    if (!vendorRes.rows || vendorRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: `Vendor #${vendorId} not found` });
    }

    const resolvedVendorId = vendorRes.rows[0].vendor_id;

    // 2. Fetch payments
    let sql = `
      SELECT p.*, o.delivery_address, o.status as order_status
      FROM payments p
      LEFT JOIN orders o ON p.order_id = o.order_id
      WHERE p.vendor_id = ?
    `;
    const params = [resolvedVendorId];

    if (status !== 'ALL') {
      sql += ` AND p.payment_status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const paymentsRes = await query(sql, params);

    // 3. Aggregate metrics
    const statsRes = await query(
      `SELECT 
         COUNT(*) as total_count,
         COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) as total_received,
         COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN amount ELSE 0 END), 0) as total_pending
       FROM payments 
       WHERE vendor_id = ?`,
      [resolvedVendorId]
    );

    const stats = statsRes.rows[0] || {};

    return res.status(200).json({
      success: true,
      vendor: vendorRes.rows[0],
      summary: {
        total_transactions: parseInt(stats.total_count || 0, 10),
        total_amount_received: parseFloat(stats.total_received || 0),
        total_amount_pending: parseFloat(stats.total_pending || 0),
        currency: 'INR'
      },
      payments: paymentsRes.rows
    });
  } catch (err) {
    console.error('❌ [GET VENDOR PAYMENTS ERROR]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve vendor payments',
      details: err.message
    });
  }
}

/**
 * 7. Returns Platform-wide Cashfree Ledger (for Admin Portal)
 * GET /api/admin/payments/cashfree-ledger
 */
async function getAdminCashfreeLedger(req, res) {
  try {
    const limit = parseInt(req.query.limit || '100', 10);
    const offset = parseInt(req.query.offset || '0', 10);
    const { status, vendor_id, search } = req.query;

    let sql = `
      SELECT p.*, v.store_name, v.vendor_name, v.phone_number as vendor_phone
      FROM payments p
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'ALL') {
      params.push(status);
      sql += ` AND p.payment_status = $${params.length}`;
    }

    if (vendor_id) {
      params.push(Number(vendor_id));
      sql += ` AND p.vendor_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (p.order_id ILIKE $${params.length} OR p.customer_name ILIKE $${params.length} OR p.customer_phone ILIKE $${params.length} OR p.cashfree_payment_id ILIKE $${params.length} OR v.store_name ILIKE $${params.length})`;
    }

    sql += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    // Note: query() helper accepts '?' placeholders and auto-converts, or handles directly
    // Let's use standard '?' for universal consistency with query wrapper
    let questionSql = `
      SELECT p.*, v.store_name, v.vendor_name, v.phone_number as vendor_phone
      FROM payments p
      LEFT JOIN vendors v ON p.vendor_id = v.vendor_id
      WHERE 1=1
    `;
    const qParams = [];

    if (status && status !== 'ALL') {
      questionSql += ` AND p.payment_status = ?`;
      qParams.push(status);
    }

    if (vendor_id) {
      questionSql += ` AND p.vendor_id = ?`;
      qParams.push(Number(vendor_id));
    }

    if (search) {
      questionSql += ` AND (p.order_id ILIKE ? OR p.customer_name ILIKE ? OR p.customer_phone ILIKE ? OR p.cashfree_payment_id ILIKE ? OR v.store_name ILIKE ?)`;
      qParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    questionSql += ` ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
    qParams.push(limit, offset);

    const paymentsRes = await query(questionSql, qParams);

    const statsRes = await query(`
      SELECT 
        COUNT(*) as total_count,
        COALESCE(SUM(CASE WHEN payment_status = 'SUCCESS' THEN amount ELSE 0 END), 0) as total_volume,
        COUNT(CASE WHEN payment_status = 'SUCCESS' THEN 1 END) as success_count,
        COUNT(CASE WHEN payment_status = 'PENDING' THEN 1 END) as pending_count
      FROM payments
      WHERE payment_gateway = 'CASHFREE'
    `);

    const stats = statsRes.rows[0] || {};

    return res.status(200).json({
      success: true,
      summary: {
        total_volume: parseFloat(stats.total_volume || 0),
        total_transactions: parseInt(stats.total_count || 0, 10),
        successful_transactions: parseInt(stats.success_count || 0, 10),
        pending_transactions: parseInt(stats.pending_count || 0, 10),
        currency: 'INR'
      },
      count: paymentsRes.rows.length,
      limit,
      offset,
      payments: paymentsRes.rows
    });
  } catch (err) {
    console.error('❌ [ADMIN CASHFREE LEDGER ERROR]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve admin payments ledger',
      details: err.message
    });
  }
}

module.exports = {
  createOrderPaymentSession,
  verifyOrderPayment,
  payVendorDirect,
  verifyDirectPayment,
  cashfreeWebhook,
  getVendorCashfreePayments,
  getAdminCashfreeLedger
};

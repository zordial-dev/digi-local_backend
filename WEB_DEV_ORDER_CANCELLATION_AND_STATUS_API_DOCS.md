# DigiLocal Web Developer: Order Cancellation & Status Sync API Docs
**Target Audience:** Web Frontend Developers (User Resident Website & Vendor Web Portal)  
**Base URL:** `https://digi-local-backend.onrender.com` (Production) / `http://localhost:5000` (Local)  
**Real-Time Engine:** Socket.IO Client v4.x (`socket.io-client`)  

---

## 📌 Executive Summary

1. **Vendor Web Action**: When a vendor clicks "Reject" or "Cancel Order" on the Vendor Web Portal, the backend updates the order status to `CANCELLED`.
2. **Automated Online Refund**: If the customer paid online via Cashfree (UPI / Card / NetBanking), the backend **automatically triggers a full refund** to the customer's original payment source without manual intervention.
3. **Instant User Web Reflection**: The backend broadcasts real-time WebSocket events (`ORDER_CANCELLED` and `ORDER_STATUS_UPDATED`). The User Website immediately transitions the order card to **Cancelled** and shows the refund status without requiring a page reload.

---

# PART 1: Vendor Web Portal (Cancelling an Order)

### Endpoint: Update Order Status to CANCELLED
- **Method:** `PUT` (also accepts `PATCH` or `POST`)
- **URL:** `/api/orders/:orderId/status`  
  *(Alternative alias: `/api/vendors/:vendorId/orders/:orderId/status`)*
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

### Request Body:
```json
{
  "status": "CANCELLED",
  "reason": "Out of stock / Store closing early"
}
```

> **Note on Accepted Statuses:** The backend accepts `"CANCELLED"`, `"CANCELED"`, `"REJECTED"`, or `"DECLINED"`. All map canonically to **`"CANCELLED"`**.

---

### Response Payloads

#### A. For Online-Paid Orders (Cashfree / UPI / Card):
```json
{
  "success": true,
  "message": "Order status updated to CANCELLED. Refund of ₹350 is in progress to customer original account.",
  "order_id": "ORD-5421",
  "status": "CANCELLED",
  "payment_status": "REFUND_IN_PROGRESS",
  "refund_status": "COMPLETED",
  "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
  "is_refund_in_progress": true,
  "refund": {
    "refund_id": "REF_ORD-5421_1727784000123",
    "cf_refund_id": "cf_ref_987654321",
    "refund_amount": 350.00,
    "destination": "Original Payment Source (Bank Account / UPI / Card)",
    "note": "Out of stock / Store closing early"
  }
}
```

#### B. For Cash on Delivery (COD) Orders:
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order_id": "ORD-5421",
  "status": "CANCELLED",
  "payment_status": "CANCELLED",
  "refund_status": null,
  "refund_status_label": null,
  "is_refund_in_progress": false,
  "refund": null
}
```

---

### Vendor Web Code Example (React / Next.js / Axios)

```javascript
import axios from 'axios';

const API_BASE = 'https://digi-local-backend.onrender.com';

export async function cancelOrderByVendor(orderId, vendorToken, cancelReason = 'Store unable to fulfill') {
  try {
    const response = await axios.put(
      `${API_BASE}/api/orders/${orderId}/status`,
      {
        status: 'CANCELLED',
        reason: cancelReason
      },
      {
        headers: {
          'Authorization': `Bearer ${vendorToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
}
```

---

# PART 2: User Resident Website (Displaying Cancelled Status & Refund)

The customer website displays the cancelled state through two complementary mechanisms:
1. **Real-Time via Socket.IO** (Instant UI update on live screen)
2. **REST API Lookup** (On page reload or order history view)

---

### 1. Real-Time Synchronization via Socket.IO

The backend runs a Socket.IO server at `https://digi-local-backend.onrender.com`.

#### Step 1: Connect and Join the Order Room
```javascript
import { io } from 'socket.io-client';

const socket = io('https://digi-local-backend.onrender.com', {
  transports: ['websocket', 'polling']
});

// When customer views the order tracking page:
const orderId = 'ORD-5421';
socket.emit('join_order_room', orderId);

// Also join the customer's personal user channel:
const userId = '105'; // Customer user_id
socket.emit('join_user_room', userId);
```

#### Step 2: Listen for the Cancellation Event
```javascript
// Listen for immediate cancellation
socket.on('ORDER_CANCELLED', (payload) => {
  console.log('Order cancelled by merchant:', payload);

  /*
    payload object:
    {
      order_id: "ORD-5421",
      status: "CANCELLED",
      cancelled_by: "VENDOR",
      reason: "Out of stock / Store closing early",
      payment_status: "REFUND_IN_PROGRESS",
      refund_status: "COMPLETED",
      refund_status_label: "Refund in Progress (Crediting back to original payment source)",
      is_refund_in_progress: true,
      refund_amount: 350.00,
      timestamp: "2026-10-01T12:00:00.000Z"
    }
  */

  // Update React state:
  setOrderStatus('CANCELLED');
  setCancelReason(payload.reason || 'Merchant was unable to fulfill this order');
  if (payload.is_refund_in_progress) {
    setRefundInfo({
      amount: payload.refund_amount,
      label: payload.refund_status_label
    });
  }
});
```

---

### 2. REST API: Single Order Lookup (Initial Load & Refresh)

- **Method:** `GET`
- **URL:** `/api/orders/:orderId`
- **Headers:** `Authorization: Bearer <USER_TOKEN>`

#### Response (`200 OK`):
```json
{
  "order": {
    "order_id": "ORD-5421",
    "status": "CANCELLED",
    "payment_method": "CASHFREE",
    "payment_status": "REFUND_IN_PROGRESS",
    "refund_status": "COMPLETED",
    "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
    "is_refund_in_progress": true,
    "refund_amount": 350.00,
    "total_amount": 350.00,
    "customer_name": "Pooja Sharma",
    "delivery_address": "Flat 402, Tower B",
    "created_at": "2026-10-01T11:45:00.000Z"
  },
  "items": [
    {
      "item_id": 45,
      "item_name": "Fresh Milk 500ml",
      "quantity": 2,
      "price": 27.00
    }
  ]
}
```

---

### 3. REST API: Customer Order History List

- **Method:** `GET`
- **URL:** `/api/orders/user/:userId` *(or `/api/orders?phone=9876543210`)*
- **Response Fields per Order**:
  - `status`: `"CANCELLED"`
  - `status_label`: `"Order Cancelled (Refund in Progress)"` / `"Order Cancelled (Refunded)"`
  - `is_refund_in_progress`: `true` / `false`
  - `refund_amount`: `350.00`

---

### User Web Component Implementation (React / Next.js)

```jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = 'https://digi-local-backend.onrender.com';

export default function OrderTrackingPage({ orderId, userToken }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial REST API Fetch
  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        setOrder(res.data.order);
      } catch (err) {
        console.error('Failed to load order:', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderId, userToken]);

  // 2. Real-Time Socket Subscription
  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ['websocket', 'polling'] });

    socket.emit('join_order_room', orderId);

    socket.on('ORDER_CANCELLED', (data) => {
      setOrder((prev) => ({
        ...prev,
        status: 'CANCELLED',
        cancel_reason: data.reason,
        payment_status: data.payment_status,
        refund_status_label: data.refund_status_label,
        is_refund_in_progress: data.is_refund_in_progress,
        refund_amount: data.refund_amount
      }));
    });

    return () => socket.disconnect();
  }, [orderId]);

  if (loading) return <div>Loading order...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div style={{ maxWidth: '600px', margin: '20px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Order #{order.order_id}</h2>

      {order.status === 'CANCELLED' ? (
        <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: '8px', padding: '16px' }}>
          <h3 style={{ color: '#B91C1C', margin: 0 }}>❌ Order Cancelled by Merchant</h3>
          <p style={{ color: '#7F1D1D', marginTop: '6px' }}>
            {order.cancel_reason || 'Store was unable to fulfill this order.'}
          </p>

          {order.is_refund_in_progress ? (
            <div style={{ color: '#065F46', background: '#D1FAE5', padding: '10px', borderRadius: '6px', marginTop: '10px' }}>
              💳 <strong>Refund Initiated:</strong> A full refund of ₹{order.refund_amount || order.total_amount} will be credited directly back to your original payment source (UPI/Card/Bank).
            </div>
          ) : (
            <div style={{ color: '#6B7280', fontSize: '13px', marginTop: '6px' }}>
              Cash on Delivery order — No payment was deducted.
            </div>
          )}
        </div>
      ) : (
        <div style={{ color: '#1E40AF', background: '#DBEAFE', padding: '12px', borderRadius: '6px' }}>
          Status: <strong>{order.status}</strong>
        </div>
      )}
    </div>
  );
}
```

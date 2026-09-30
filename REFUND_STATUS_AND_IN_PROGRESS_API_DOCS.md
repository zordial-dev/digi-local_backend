# DigiLocal Order Refund Lifecycle & API Documentation
## Complete Integration Guide for Frontend App (React Native / Flutter / Expo) & Web Developers

> Production Base URL: https://digi-local-backend.onrender.com  
> Local Base URL: http://localhost:5000  
> Webhook Endpoint: https://digi-local-backend.onrender.com/api/payments/cashfree/webhook  

---

## 1. Overview of the Refund Lifecycle

When an order paid online via Cashfree PG (UPI, Debit Card, Credit Card, or Net Banking) is cancelled by either the customer or the vendor:

1. **Stage 1 — Refund in Progress (`REFUND_IN_PROGRESS` / `IN_PROGRESS`)**:
   - The backend communicates with Cashfree PG to initiate the refund back to the customer's original payment instrument.
   - Cashfree accepts the request and dispatches the credit instruction to the banking partner network.
   - Status values returned:
     - `payment_status`: `"REFUND_IN_PROGRESS"`
     - `refund_status`: `"IN_PROGRESS"`
     - `is_refund_in_progress`: `true`
     - `refund_status_label`: `"Refund in Progress (Crediting back to original payment source)"`

2. **Stage 2 — Refund Completed (`REFUND_COMPLETED` / `COMPLETED`)**:
   - The customer's issuing bank finishes clearing and credits the money back to the original UPI VPA, bank account, or card.
   - Cashfree notifies the backend via the refund webhook callback.
   - Status values returned:
     - `payment_status`: `"REFUND_COMPLETED"`
     - `refund_status`: `"COMPLETED"`
     - `is_refund_in_progress`: `false`
     - `refund_status_label`: `"Refund Completed"`

---

## 2. Order Status & Payment Status Matrix

| Order Status | Payment Status | Refund Status | `is_refund_in_progress` | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `CANCELLED` | `REFUND_IN_PROGRESS` | `IN_PROGRESS` | `true` | Order cancelled. Refund is currently processing with the bank. |
| `CANCELLED` | `REFUND_COMPLETED` | `COMPLETED` | `false` | Order cancelled. Refund has been successfully credited. |
| `CANCELLED` | `CANCELLED` | `null` | `false` | Order was Cash on Delivery (COD) or unpaid. No payment refund needed. |

---

## 3. API Endpoints Specification

### 3.1 Resident User Cancels Order
- **Method**: `POST` (or `PUT`)
- **Path**: `/api/orders/:orderId/cancel`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <user_token> (optional)
  ```
- **Request Body** *(Optional)*:
  ```json
  {
    "reason": "Changed my mind"
  }
  ```

#### Response A: Refund In Progress (`200 OK`)
```json
{
  "success": true,
  "message": "Order cancelled successfully. A refund of 350.00 is in progress back to your original payment account.",
  "order_id": "ORD-5481",
  "status": "CANCELLED",
  "payment_status": "REFUND_IN_PROGRESS",
  "refund_status": "IN_PROGRESS",
  "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
  "is_refund_in_progress": true,
  "is_online_paid": true,
  "refund": {
    "refund_initiated": true,
    "refund_id": "REF_ORD-5481_1790762496594",
    "cf_refund_id": "cf_ref_827181",
    "refund_amount": 350.00,
    "refund_currency": "INR",
    "refund_status": "IN_PROGRESS",
    "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
    "is_refund_in_progress": true,
    "destination": "Original Payment Source (Bank Account / UPI / Card)",
    "note": "Changed my mind"
  }
}
```

#### Response B: Refund Completed (`200 OK`)
```json
{
  "success": true,
  "message": "Order cancelled successfully. A full refund of 350.00 has been initiated back to your original payment account.",
  "order_id": "ORD-5481",
  "status": "CANCELLED",
  "payment_status": "REFUND_COMPLETED",
  "refund_status": "COMPLETED",
  "refund_status_label": "Refund Completed",
  "is_refund_in_progress": false,
  "is_online_paid": true,
  "refund": {
    "refund_initiated": true,
    "refund_id": "REF_ORD-5481_1790762496594",
    "cf_refund_id": "cf_ref_827181",
    "refund_amount": 350.00,
    "refund_currency": "INR",
    "refund_status": "COMPLETED",
    "refund_status_label": "Refund Completed",
    "is_refund_in_progress": false,
    "destination": "Original Payment Source (Bank Account / UPI / Card)",
    "note": "Changed my mind"
  }
}
```

#### Response C: Cash on Delivery / Unpaid Order (`200 OK`)
```json
{
  "success": true,
  "message": "Order cancelled successfully.",
  "order_id": "ORD-5482",
  "status": "CANCELLED",
  "payment_status": "CANCELLED",
  "is_online_paid": false,
  "refund": null
}
```

---

### 3.2 Vendor Rejects or Cancels Order
- **Method**: `PUT` (or `POST`)
- **Path**: `/api/orders/:orderId/status`
- **Request Body**:
  ```json
  {
    "status": "CANCELLED",
    "reason": "Item out of stock"
  }
  ```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Order status updated to CANCELLED. Refund of 350.00 is in progress to customer original account.",
  "order_id": "ORD-5481",
  "status": "CANCELLED",
  "payment_status": "REFUND_IN_PROGRESS",
  "refund_status": "IN_PROGRESS",
  "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
  "is_refund_in_progress": true,
  "raw_status": "CANCELLED",
  "refund": {
    "refund_id": "REF_ORD-5481_1790762496594",
    "cf_refund_id": "cf_ref_827181",
    "refund_amount": 350.00,
    "refund_status": "IN_PROGRESS",
    "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
    "is_refund_in_progress": true
  }
}
```

---

### 3.3 Single Order Detail Lookup (Order Tracking View)
- **Method**: `GET`
- **Path**: `/api/orders/:orderId`

#### Response (`200 OK`):
```json
{
  "order": {
    "order_id": "ORD-5481",
    "status": "CANCELLED",
    "payment_status": "REFUND_COMPLETED",
    "refund_status": "COMPLETED",
    "refund_status_label": "Refund Completed",
    "is_refund_in_progress": false,
    "refund_id": "REF_ORD-5481_1790762496594",
    "refund_amount": 350.00,
    "refunded_at": "2026-09-30T15:30:00.000Z",
    "total_amount": 350.00,
    "customer_name": "Aarushi",
    "phone": "+919784319840",
    "delivery_address": "Tower A-402, Greenwood Residency"
  },
  "items": [
    {
      "item_name": "Cold Coffee Large",
      "quantity": 2,
      "price": 175.00
    }
  ]
}
```

---

### 3.4 Resident User Order History (Orders List View)
- **Method**: `GET`
- **Path**: `/api/orders/user/:userId`

#### Response Array Item:
```json
{
  "id": "ORD-5481",
  "order_id": "ORD-5481",
  "status": "CANCELLED",
  "status_label": "Order Cancelled (Refund Completed)",
  "payment_status": "REFUND_COMPLETED",
  "refund_status": "COMPLETED",
  "refund_status_label": "Refund Completed",
  "is_refund_in_progress": false,
  "refund_id": "REF_ORD-5481_1790762496594",
  "refund_amount": 350.00,
  "refunded_at": "2026-09-30T15:30:00.000Z",
  "total": 350,
  "date": "2026-09-30T15:30:00.000+05:30"
}
```

---

## 4. Frontend Implementation Guide (React Native / Flutter / Web)

### 4.1 Conditionals Using `is_refund_in_progress`

Frontend developers can easily render UI states without parsing status strings:

```jsx
// React / React Native UI logic
if (order.status === 'CANCELLED') {
  if (order.is_refund_in_progress || order.payment_status === 'REFUND_IN_PROGRESS') {
    // Show Refund In Progress badge/banner
    return <RefundInProgressBanner amount={order.refund_amount || order.total} />;
  }

  if (order.payment_status === 'REFUND_COMPLETED') {
    // Show Refund Completed badge/banner
    return <RefundCompletedBanner amount={order.refund_amount || order.total} />;
  }

  // Cash On Delivery / unpaid order cancelled
  return <OrderCancelledBanner />;
}
```

---

### 4.2 React Native / Mobile Component Example

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function OrderRefundStatusBadge({ order }) {
  if (order.status !== 'CANCELLED') return null;

  if (order.is_refund_in_progress || order.payment_status === 'REFUND_IN_PROGRESS') {
    return (
      <View style={[styles.card, styles.cardPending]}>
        <Text style={styles.titlePending}>
          Refund in Progress (Rs. {order.refund_amount || order.total})
        </Text>
        <Text style={styles.subtitle}>
          Crediting back to your original payment account. Most UPI refunds reflect within 15 mins to 2 hours.
        </Text>
      </View>
    );
  }

  if (order.payment_status === 'REFUND_COMPLETED') {
    return (
      <View style={[styles.card, styles.cardSuccess]}>
        <Text style={styles.titleSuccess}>
          Refund Completed (Rs. {order.refund_amount || order.total})
        </Text>
        <Text style={styles.subtitle}>
          Successfully credited to your original payment source.
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  card: { padding: 12, borderRadius: 8, marginVertical: 6, borderWidth: 1 },
  cardPending: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  cardSuccess: { backgroundColor: '#F0FDF4', borderColor: '#22C55E' },
  titlePending: { color: '#C2410C', fontWeight: '700', fontSize: 14 },
  titleSuccess: { color: '#15803D', fontWeight: '700', fontSize: 14 },
  subtitle: { fontSize: 12, color: '#4B5563', marginTop: 4 }
});
```

---

### 4.3 Web Component Example (React / Next.js)

```tsx
export function OrderRefundBanner({ order }: { order: any }) {
  if (order.status !== 'CANCELLED') return null;

  if (order.is_refund_in_progress || order.payment_status === 'REFUND_IN_PROGRESS') {
    return (
      <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-900">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Refund in Progress</span>
          <span className="text-xs bg-orange-200 px-2.5 py-0.5 rounded-full font-bold">
            Rs. {order.refund_amount || order.total}
          </span>
        </div>
        <p className="text-xs text-orange-700 mt-1">
          Your refund has been initiated and is being credited back to your original payment account.
        </p>
      </div>
    );
  }

  if (order.payment_status === 'REFUND_COMPLETED') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">Refund Completed</span>
          <span className="text-xs bg-green-200 px-2.5 py-0.5 rounded-full font-bold">
            Rs. {order.refund_amount || order.total}
          </span>
        </div>
        <p className="text-xs text-green-700 mt-1">
          Full refund of Rs. {order.refund_amount} has been credited to your original payment source.
        </p>
      </div>
    );
  }

  return null;
}
```

---

### 4.4 Cancel Order Action with Confirmation Modal

```javascript
async function handleOrderCancellation(orderId, isOnlinePaid, totalAmount) {
  const confirmText = isOnlinePaid
    ? `Cancel order? Rs. ${totalAmount} will be refunded back to your original payment account.`
    : `Cancel this order?`;

  if (!window.confirm(confirmText)) return;

  try {
    const res = await fetch(`https://digi-local-backend.onrender.com/api/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer requested cancellation' })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || 'Failed to cancel order');
      return;
    }

    if (data.is_refund_in_progress) {
      alert(`Order cancelled. A refund of Rs. ${data.refund.refund_amount} is in progress back to your payment account.`);
    } else if (data.payment_status === 'REFUND_COMPLETED') {
      alert(`Order cancelled. Full refund of Rs. ${data.refund.refund_amount} completed.`);
    } else {
      alert('Order cancelled successfully.');
    }

    // Refresh view
    loadOrderDetails(orderId);
  } catch (err) {
    alert('Network error while cancelling order.');
  }
}
```

---

## 5. Expected Turnaround Time Reference

| Payment Mode | Typical Time to Credit | Description |
| :--- | :--- | :--- |
| **UPI (GPay / PhonePe / Paytm / BHIM)** | **15 minutes to 2 hours** | Immediate transfer via IMPS/UPI banking rails |
| **Debit / Credit Card** | **2 to 5 business days** | Standard card network clearing turnaround |
| **Net Banking** | **2 to 4 business days** | Varies by issuing bank |

---

## 6. Summary of Fields Provided to Frontend

| Field | Data Type | Possible Values | Notes |
| :--- | :--- | :--- | :--- |
| `status` | string | `"CANCELLED"` | Standard order status |
| `payment_status` | string | `"REFUND_IN_PROGRESS"`, `"REFUND_COMPLETED"`, `"CANCELLED"` | Primary financial state |
| `refund_status` | string | `"IN_PROGRESS"`, `"COMPLETED"` | Gateway refund state |
| `refund_status_label` | string | Human-readable banner label | Ready to display directly in the UI |
| `is_refund_in_progress` | boolean | `true` or `false` | Convenience flag for frontend rendering |
| `refund_id` | string | `"REF_ORD-..."` | Unique refund reference string |
| `refund_amount` | number | e.g. `350.00` | Numeric refund amount |
| `refunded_at` | string | ISO timestamp | Date and time refund was initiated |

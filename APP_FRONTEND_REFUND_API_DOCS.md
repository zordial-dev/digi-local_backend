# DigiLocal Mobile App Frontend — Refund Status API Documentation
> **Target Audience:** Mobile App Frontend Developers (React Native / Flutter / Android / iOS / Expo)  
> **Backend Base URLs:**  
> - **Production:** `https://digi-local-backend.onrender.com`  
> - **Local Development:** `http://localhost:5000`  
> - **Authentication:** Standard JWT Bearer token in headers: `Authorization: Bearer <user_token>` (optional for public read)

---

## 1. Overview for Mobile App Developers

When an online-paid order (UPI, Cards, Net Banking via Cashfree PG) is cancelled, a refund is automatically initiated to the user's original payment source (bank account / UPI VPA).

The Mobile App needs to know:
1. **Whether the refund has completed** (`is_refund_completed: true`).
2. **Whether the refund is currently in progress** (`is_refund_in_progress: true`).
3. **The refunded amount, refund ID, and timestamp** (`refund_amount`, `refund_id`, `refunded_at`).
4. **Where the money is going** (`destination`: "Original Payment Source (Bank Account / UPI / Card)").

---

## 2. Primary APIs for Checking Refund Status

### API 1: Dedicated Order Refund Status (Lightweight)
Use this endpoint when displaying the **Order Details Screen**, **Order Tracking Screen**, or **Refund Status Bottom Sheet**.

- **HTTP Method:** `GET`
- **Route:** `/api/orders/:orderId/refund-status`
- **Alias:** `/api/orders/:orderId/refund` or `/api/payments/cashfree/refund-status/:orderId`

#### Case A: Refund Completed (`is_refund_completed: true`)
Returned when the banking network and Cashfree have confirmed credit back to the user's account.

```http
GET /api/orders/ORD-8921/refund-status HTTP/1.1
Host: digi-local-backend.onrender.com
Accept: application/json
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "order_id": "ORD-8921",
  "user_id": "usr_4821",
  "vendor_id": 14,
  "store_name": "Daily Fresh Mart",
  "order_status": "CANCELLED",
  "is_refund_completed": true,
  "is_refund_in_progress": false,
  "refund_status": "COMPLETED",
  "refund_status_label": "Refund Completed",
  "payment_status": "REFUND_COMPLETED",
  "payment_method": "CASHFREE",
  "total_amount": 350.00,
  "refund_amount": 350.00,
  "refund_id": "REF_ORD-8921_1728384910291",
  "refunded_at": "2026-10-08T10:30:00.000Z",
  "destination": "Original Payment Source (Bank Account / UPI / Card)",
  "estimated_settlement": "Completed",
  "message": "Refund has been completed successfully and credited back to the original payment source."
}
```

---

#### Case B: Refund In Progress (`is_refund_in_progress: true`)
Returned while the payment gateway and customer's bank are processing the transfer.

**Response (`200 OK`):**
```json
{
  "success": true,
  "order_id": "ORD-8922",
  "user_id": "usr_4821",
  "vendor_id": 14,
  "store_name": "Daily Fresh Mart",
  "order_status": "CANCELLED",
  "is_refund_completed": false,
  "is_refund_in_progress": true,
  "refund_status": "IN_PROGRESS",
  "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
  "payment_status": "REFUND_IN_PROGRESS",
  "payment_method": "CASHFREE",
  "total_amount": 280.00,
  "refund_amount": 280.00,
  "refund_id": "REF_ORD-8922_1728384992144",
  "refunded_at": "2026-10-08T10:32:00.000Z",
  "destination": "Original Payment Source (Bank Account / UPI / Card)",
  "estimated_settlement": "5-7 business days",
  "message": "Refund has been initiated and is currently being processed by the banking network."
}
```

---

#### Case C: Cash On Delivery / Unpaid (No Refund Applicable)
Returned when an order was placed via COD or cancelled before payment was captured.

**Response (`200 OK`):**
```json
{
  "success": true,
  "order_id": "ORD-8923",
  "user_id": "usr_4821",
  "vendor_id": 14,
  "store_name": "Daily Fresh Mart",
  "order_status": "CANCELLED",
  "is_refund_completed": false,
  "is_refund_in_progress": false,
  "refund_status": "NOT_APPLICABLE",
  "refund_status_label": "No Refund Applicable (Cash on Delivery or Unpaid)",
  "payment_status": "CANCELLED",
  "payment_method": "COD",
  "total_amount": 150.00,
  "refund_amount": 0,
  "refund_id": null,
  "refunded_at": null,
  "destination": null,
  "estimated_settlement": null,
  "message": "Order was Cash on Delivery or unpaid. No payment was deducted, so no refund is needed."
}
```

---

### API 2: User Refunds List (My Refunds Tab / Screen)
Use this endpoint to populate a dedicated **"My Refunds"** screen or tab in the app profile.

- **HTTP Method:** `GET`
- **Route:** `/api/orders/user/:userId/refunds`

**Response (`200 OK`):**
```json
{
  "success": true,
  "count": 2,
  "refunds": [
    {
      "order_id": "ORD-8921",
      "user_id": "usr_4821",
      "vendor_id": 14,
      "store_name": "Daily Fresh Mart",
      "order_status": "CANCELLED",
      "is_refund_completed": true,
      "is_refund_in_progress": false,
      "refund_status": "COMPLETED",
      "refund_status_label": "Refund Completed",
      "payment_status": "REFUND_COMPLETED",
      "payment_method": "CASHFREE",
      "total_amount": 350.00,
      "refund_amount": 350.00,
      "refund_id": "REF_ORD-8921_1728384910291",
      "refunded_at": "2026-10-08T10:30:00.000Z",
      "destination": "Original Payment Source (Bank Account / UPI / Card)",
      "created_at": "2026-10-08T09:15:00.000Z"
    },
    {
      "order_id": "ORD-8922",
      "user_id": "usr_4821",
      "vendor_id": 14,
      "store_name": "Daily Fresh Mart",
      "order_status": "CANCELLED",
      "is_refund_completed": false,
      "is_refund_in_progress": true,
      "refund_status": "IN_PROGRESS",
      "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
      "payment_status": "REFUND_IN_PROGRESS",
      "payment_method": "CASHFREE",
      "total_amount": 280.00,
      "refund_amount": 280.00,
      "refund_id": "REF_ORD-8922_1728384992144",
      "refunded_at": "2026-10-08T10:32:00.000Z",
      "destination": "Original Payment Source (Bank Account / UPI / Card)",
      "created_at": "2026-10-08T09:20:00.000Z"
    }
  ]
}
```

---

### API 3: Existing Order Details & Order List (Already Enriched)
If your app already calls `GET /api/orders/:orderId` or `GET /api/orders/user/:userId`, you do **NOT** have to make a second network request. These existing endpoints already return:
- `order.is_refund_in_progress` (boolean)
- `order.refund_status_label` (string)
- `order.refund_status` ("COMPLETED" | "IN_PROGRESS")
- `order.payment_status` ("REFUND_COMPLETED" | "REFUND_IN_PROGRESS")
- `order.refund_amount` (number)
- `order.refund_id` (string)
- `order.refunded_at` (string ISO timestamp)

---

## 3. Mobile UI Display Guidelines

| Boolean Condition | UI Badge Color | UI Badge Text | Subtitle / Explanatory Text |
| :--- | :--- | :--- | :--- |
| `is_refund_completed === true` | 🟢 Green | **Refund Completed** | *"₹{amount} credited back to your original payment account."* |
| `is_refund_in_progress === true` | 🟠 Orange / Amber | **Refund in Progress** | *"₹{amount} is being processed. Usually reflects within 2 hours to 5 days depending on your bank."* |
| `order_status === 'CANCELLED' && !is_refund_completed && !is_refund_in_progress` | ⚪ Gray | **Cancelled (COD)** | *"No amount was charged for this order."* |

---

## 4. Mobile Component Examples

### 4.1 React Native Component (Badge & Tracking Card)

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RefundInfo {
  is_refund_completed: boolean;
  is_refund_in_progress: boolean;
  refund_status_label?: string;
  refund_amount?: number;
  refund_id?: string;
  refunded_at?: string;
  destination?: string;
}

export const RefundStatusCard: React.FC<{ refund: RefundInfo }> = ({ refund }) => {
  if (refund.is_refund_completed) {
    return (
      <View style={[styles.card, styles.completedCard]}>
        <View style={styles.headerRow}>
          <Text style={styles.completedBadge}>● REFUND COMPLETED</Text>
          <Text style={styles.amountText}>₹{refund.refund_amount?.toFixed(2)}</Text>
        </View>
        <Text style={styles.messageText}>
          Amount credited back to your original payment source ({refund.destination || 'Bank / UPI'}).
        </Text>
        {refund.refund_id ? (
          <Text style={styles.metaText}>Ref ID: {refund.refund_id}</Text>
        ) : null}
      </View>
    );
  }

  if (refund.is_refund_in_progress) {
    return (
      <View style={[styles.card, styles.inProgressCard]}>
        <View style={styles.headerRow}>
          <Text style={styles.inProgressBadge}>⏳ REFUND IN PROGRESS</Text>
          <Text style={styles.amountText}>₹{refund.refund_amount?.toFixed(2)}</Text>
        </View>
        <Text style={styles.messageText}>
          Refund initiated. Crediting back to your original payment account (usually reflects in 15 mins to 2 hours for UPI).
        </Text>
        {refund.refund_id ? (
          <Text style={styles.metaText}>Ref ID: {refund.refund_id}</Text>
        ) : null}
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
  },
  completedCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  inProgressCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  completedBadge: {
    color: '#15803D',
    fontWeight: '700',
    fontSize: 13,
  },
  inProgressBadge: {
    color: '#B45309',
    fontWeight: '700',
    fontSize: 13,
  },
  amountText: {
    fontWeight: '800',
    fontSize: 15,
    color: '#1F2937',
  },
  messageText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  metaText: {
    marginTop: 6,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
});
```

---

### 4.2 Flutter Widget Example

```dart
import 'package:flutter/material.dart';

class RefundStatusWidget extends StatelessWidget {
  final bool isRefundCompleted;
  final bool isRefundInProgress;
  final double refundAmount;
  final String? refundId;

  const RefundStatusWidget({
    Key? key,
    required this.isRefundCompleted,
    required this.isRefundInProgress,
    required this.refundAmount,
    this.refundId,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (isRefundCompleted) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFF0FDF4),
          border: Border.all(color: const Color(0xFF86EFAC)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('● Refund Completed',
                    style: TextStyle(color: Color(0xFF15803D), fontWeight: FontWeight.bold)),
                Text('₹${refundAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 4),
            const Text('Amount successfully credited to your original payment source.',
                style: TextStyle(fontSize: 12, color: Color(0xFF4B5563))),
          ],
        ),
      );
    } else if (isRefundInProgress) {
      return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: const Color(0xFFFFFBEB),
          border: Border.all(color: const Color(0xFFFDE68A)),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('⏳ Refund in Progress',
                    style: TextStyle(color: Color(0xFFB45309), fontWeight: FontWeight.bold)),
                Text('₹${refundAmount.toStringAsFixed(2)}',
                    style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 4),
            const Text('Refund initiated. Crediting back to original payment account.',
                style: TextStyle(fontSize: 12, color: Color(0xFF4B5563))),
          ],
        ),
      );
    }
    return const SizedBox.shrink();
  }
}
```

---

## 5. Summary Cheat Sheet for Mobile App Dev

- To check status of a single order: `GET /api/orders/:orderId/refund-status`
- Key flag to render green tick: `res.data.is_refund_completed === true`
- Key flag to render progress spinner: `res.data.is_refund_in_progress === true`
- To list all refunds for the logged-in user: `GET /api/orders/user/:userId/refunds`

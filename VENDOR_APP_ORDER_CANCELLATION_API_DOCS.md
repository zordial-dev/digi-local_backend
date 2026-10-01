# DigiLocal Vendor Mobile App: Order Cancellation & Rejection API Docs
**Target Audience:** Vendor Mobile App Frontend Engineers (React Native / Flutter / Android Kotlin / iOS Swift)  
**Base URL:** `https://digi-local-backend.onrender.com` (Production) / `http://localhost:5000` (Local)  
**Authentication:** Bearer Token in `Authorization: Bearer <VENDOR_JWT_TOKEN>` header  

---

## 📌 1. Overview for Vendor App Developers

When a new order arrives or is pending, a merchant may need to **Reject or Cancel** it (e.g., items out of stock, store closing, unable to deliver).

### What the Backend Handles Automatically:
1. **Automatic Online Refund**: If the customer paid online (UPI / Card / NetBanking via Cashfree), the backend **automatically triggers a full refund** to the customer's original payment method via Cashfree API. The vendor does **not** need to process refunds or handle bank transfers.
2. **Real-Time Customer Alert**: The backend broadcasts an instant WebSocket alert and push notification directly to the resident customer's app, showing them the cancellation reason and refund progress.
3. **Safety Protection**: Already completed/delivered orders cannot be cancelled (returns `400 Bad Request`).

---

## 2. API Endpoint Specification

### Primary Endpoint: Reject / Cancel Order
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
  "reason": "Item out of stock"
}
```

> **Accepted Status Strings:** `"CANCELLED"`, `"CANCELED"`, `"REJECTED"`, or `"DECLINED"`. All are accepted and mapped to **`"CANCELLED"`**.

---

### Alternative Dedicated Cancel Endpoint:
- **Method:** `POST`
- **URL:** `/api/orders/:orderId/cancel`
- **Headers:**
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "reason": "Store is closing early today"
  }
  ```

---

## 3. Request Attributes

| Parameter | Type | Required | Description | Common Pre-set Options |
|---|---|---|---|---|
| `status` | `string` | **Yes** (for `/status` endpoint) | Target status: `"CANCELLED"` or `"REJECTED"` | `"CANCELLED"` |
| `reason` | `string` | Recommended | Human-readable explanation shown to customer | `"Item out of stock"`, `"Store closed"`, `"Delivery partner unavailable"`, `"High demand / Kitchen busy"` |
| `cancel_reason` | `string` | Optional | Alias for `reason` | `"Item out of stock"` |

---

## 4. Response Payloads

### A. When Order Was Paid Online (Cashfree / UPI / Card):
HTTP Status: `200 OK`
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
    "success": true,
    "refund_id": "REF_ORD-5421_1727784000123",
    "cf_refund_id": "cf_ref_987654321",
    "refund_amount": 350.00,
    "refund_currency": "INR",
    "destination": "Original Payment Source (Bank Account / UPI / Card)",
    "note": "Item out of stock"
  }
}
```

### B. When Order Was Cash on Delivery (COD) / Unpaid:
HTTP Status: `200 OK`
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order_id": "ORD-5421",
  "status": "CANCELLED",
  "payment_status": "CANCELLED",
  "refund_status": null,
  "is_refund_in_progress": false,
  "refund": null
}
```

---

## 5. Mobile App Implementation Code Examples

### A. React Native / Expo (JavaScript / TypeScript)

```typescript
interface RejectOrderParams {
  orderId: string;
  vendorToken: string;
  reason: string;
}

export async function rejectOrder({ orderId, vendorToken, reason }: RejectOrderParams) {
  try {
    const response = await fetch(`https://digi-local-backend.onrender.com/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${vendorToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'CANCELLED',
        reason: reason || 'Item out of stock'
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel order');
    }

    return data;
  } catch (error: any) {
    console.error('Error rejecting order:', error.message);
    throw error;
  }
}
```

---

### B. Flutter / Dart

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<Map<String, dynamic>> cancelOrder({
  required String orderId,
  required String vendorToken,
  required String reason,
}) async {
  final url = Uri.parse('https://digi-local-backend.onrender.com/api/orders/$orderId/status');

  final response = await http.put(
    url,
    headers: {
      'Authorization': 'Bearer $vendorToken',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'status': 'CANCELLED',
      'reason': reason,
    }),
  );

  final data = jsonDecode(response.body);

  if (response.statusCode == 200) {
    return data;
  } else {
    throw Exception(data['error'] ?? 'Failed to cancel order');
  }
}
```

---

## 6. UI / UX Best Practices for the Vendor App

1. **Confirmation Modal with Reasons**:
   - Provide a quick bottom sheet modal with pre-defined radio buttons:
     - 🔘 *Items out of stock*
     - 🔘 *Store closing early*
     - 🔘 *Cannot deliver to this location*
     - 🔘 *Other reason (custom text)*
2. **Toast / Banner Feedback**:
   - On success: Display `"Order #ORD-5421 cancelled. Customer has been refunded."`
3. **Remove from Active Queue**:
   - Once cancelled, update the vendor's local order list immediately by moving the order to the "Past / Cancelled" tab.

---

## 7. Error Codes

| Status Code | Error Message | Action Needed |
|---|---|---|
| `400 Bad Request` | `"Order is already cancelled"` | The order was already cancelled. Refresh order details. |
| `400 Bad Request` | `"Cannot cancel an order that has already been delivered or completed"` | Cannot cancel a completed delivery. Disable button. |
| `401 Unauthorized` | `"Invalid token or token expired"` | Session expired. Prompt vendor to log in again. |
| `404 Not Found` | `"Order ID '...' not found"` | Invalid order ID. |

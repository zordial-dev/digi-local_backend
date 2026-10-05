# Mobile App Developer Documentation: Order Remarks & Account Check Fixes

This documentation is specifically tailored for **Mobile App Developers** (React Native / Expo / Flutter / Android / iOS) working on the **Customer App** and **Vendor App**.

---

## 1. Quick Summary of Updates

1. **Customer Order Remarks**:
   - Customer app can now send delivery instructions / cooking notes (e.g. *"Less spicy, ring the bell twice"*) when placing an order.
   - Remarks are automatically forwarded to the Vendor App via **Expo/FCM Push Notifications** and real-time **Socket.IO `NEW_ORDER_ALERT`**.
2. **`/api/auth/check-account` Timeout Fixed**:
   - The 8000ms timeout during mobile phone number verification has been resolved. Lookups now resolve in <5ms.

---

## 2. Customer Mobile App: Placing an Order with Remarks

### Endpoint
`POST /api/orders`

### Headers
```http
Content-Type: application/json
Authorization: Bearer <user_jwt_token> (Optional if user_id is provided)
```

### Request Body Schema

Pass remarks using `remarks` (or any alias like `delivery_instructions`, `notes`, `instructions`):

```json
{
  "vendor_id": 12,
  "user_id": "usr_482910",
  "customer_name": "Aarav Patel",
  "phone": "9876543210",
  "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
  "payment_method": "COD",
  "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "items": [
    {
      "item_id": 105,
      "quantity": 2,
      "price": 80
    }
  ]
}
```

### Response (`201 Created`)
```json
{
  "success": true,
  "message": "Order placed successfully via Cash on Delivery.",
  "order_id": "ORD-7429",
  "total_amount": 160,
  "status": "PLACED",
  "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "order": {
    "order_id": "ORD-7429",
    "vendor_id": 12,
    "user_id": "usr_482910",
    "customer_name": "Aarav Patel",
    "phone_number": "9876543210",
    "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
    "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "status": "PLACED",
    "total_amount": 160,
    "items": [
      {
        "item_id": 105,
        "item_name": "Veg Grilled Sandwich",
        "quantity": 2,
        "unit_price": 80,
        "price": 80
      }
    ]
  }
}
```

---

## 3. Vendor Mobile App: Real-Time Alerts & Alarms

When a new order arrives, the backend alerts the Vendor App through two channels:

### A. Real-Time Socket.IO Event (Foreground Alarm)
- **Event Name:** `NEW_ORDER_ALERT`
- **Room:** `vendor_<vendor_id>`

#### Payload Received:
```json
{
  "order_id": "ORD-7429",
  "vendor_id": "12",
  "total_amount": "160.00",
  "customer_name": "Aarav Patel",
  "items_count": 2,
  "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
  "timestamp": "2026-10-05T09:30:00.000Z",
  "sound": "new_order_alert_sound"
}
```

### B. Push Notification (Expo / FCM)
- **Title:** `NEW ORDER #ORD-7429!`
- **Body:** `Customer: Aarav Patel • Total: ₹160.00 • Note: "Please pack separately. Extra spicy and deliver before 7:30 PM."`
- **Data Payload:**
  - `remarks`: `"Please pack separately. Extra spicy and deliver before 7:30 PM."`
  - `delivery_instructions`: `"Please pack separately. Extra spicy and deliver before 7:30 PM."`
  - `delivery_address`: `"Flat 402, Tower B, Sunshine Residency, Jaipur"`

---

## 4. Vendor Mobile App: Orders List & Details

### Endpoints
- **Vendor Orders List:** `GET /api/orders/vendor/:vendorId`
- **Single Order Details:** `GET /api/orders/:orderId`

### Order Object Schema (Extract):
```json
{
  "id": "ORD-7429",
  "order_id": "ORD-7429",
  "customer_name": "Aarav Patel",
  "phone": "9876543210",
  "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
  "flatNumber": "Flat 402",
  "buildingNumber": "Tower B",
  "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "subtotal": 160,
  "total": 160,
  "status": "placed",
  "createdAt": "2026-10-05T15:00:00+05:30",
  "items": [
    {
      "quantity": 2,
      "item_name": "Veg Grilled Sandwich",
      "price": 80,
      "item_total": 160
    }
  ]
}
```

---

## 5. UI Guidelines for Vendor Mobile App

In your order card or alarm modal (`AlarmOverlay.jsx` / `OrderCard.tsx`):

```tsx
{order.remarks ? (
  <View style={{
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8
  }}>
    <Text style={{ fontWeight: '700', color: '#92400E', fontSize: 13 }}>
      Customer Instructions / Remarks:
    </Text>
    <Text style={{ color: '#78350F', fontSize: 14, marginTop: 2 }}>
      "{order.remarks}"
    </Text>
  </View>
) : null}
```

---

## 6. Mobile App: Account Verification Check (`/api/auth/check-account`)

### Endpoint
`POST /api/auth/check-account` (or `GET /api/auth/check-account?phone=...`)

### Request
```json
{
  "phone": "9876543210"
}
```

### Response (`200 OK`, <5ms):
```json
{
  "success": true,
  "exists": true,
  "account_type": "user",
  "user_id": "usr_482910",
  "name": "Aarav Patel",
  "phone": "9876543210"
}
```
*(If phone doesn't exist: `{"success": true, "exists": false, "message": "No account found"}`)*

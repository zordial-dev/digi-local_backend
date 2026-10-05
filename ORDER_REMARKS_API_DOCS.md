# Order Remarks & Special Instructions API Documentation

This documentation is for frontend developers (Customer Web, Customer App, Vendor App, and Admin Panel) to implement and display order remarks and delivery instructions.

---

## 1. Overview & Problem Resolved

### Issues Fixed:
1. **Remarks not reaching the vendor**:
   - Customer remarks/instructions are now captured during checkout and stored in the database.
   - Remarks are included in vendor order endpoints, real-time Socket.IO alarm chimes, and FCM/Expo push notifications.
2. **`/api/auth/check-account` 8000ms Timeout**:
   - The phone & email lookup queries were running slow full-table scans with unindexed wildcard matching and no `LIMIT 1`.
   - We added B-Tree indexes, exact candidate matching with `IN (...)`, `LIMIT 1`, and parallel lookup execution (`Promise.all`), bringing response times down to <5ms.

---

## 2. Placing an Order with Remarks

### Endpoint
`POST /api/orders`

### Headers
```http
Content-Type: application/json
Authorization: Bearer <user_jwt_token>  (optional if user_id is provided)
```

### Request Body Schema

Frontend can pass the customer instructions under `remarks` (recommended) or any of the supported alias fields:

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vendor_id` | Integer / String | **Yes** | ID of the merchant / vendor store |
| `items` | Array of Objects | **Yes** | Array of items being ordered |
| `remarks` | String | *Optional* | **Customer remarks / instructions for vendor (e.g. "Less spicy, please add extra napkins")** |
| `delivery_address` | String | *Optional* | Complete delivery address |
| `payment_method` | String | *Optional* | `COD` (default) or `CASHFREE` / `ONLINE` |
| `customer_name` | String | *Optional* | Name of the customer |
| `phone` | String | *Optional* | 10-digit phone number of customer |

> **Supported Aliases for `remarks`:**  
> For maximum compatibility with existing frontend code, any of these field names in `req.body` will automatically be recognized and saved:  
> `remarks`, `remark`, `notes`, `note`, `instructions`, `delivery_instructions`, `special_instructions`, `order_notes`.

### Example Request Body
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

### Example Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Order placed successfully via Cash on Delivery.",
  "order_id": "ORD-7429",
  "total_amount": 160,
  "status": "PLACED",
  "payment_method": "COD",
  "payment_status": "PENDING",
  "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
  "societyName": "Sunshine Residency",
  "created_at": "2026-10-05T15:00:00+05:30",
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
    "payment_status": "PENDING",
    "payment_method": "COD",
    "total_amount": 160,
    "items": [
      {
        "item_id": 105,
        "item_name": "Veg Grilled Sandwich",
        "quantity": 2,
        "unit_price": 80,
        "price": 80,
        "stock_remaining": 18
      }
    ]
  }
}
```

---

## 3. Vendor Orders Retrieval (Vendor App & Vendor Panel)

### Endpoints
- `GET /api/orders/vendor/:vendorId`
- `GET /api/vendor-panel/:vendorId/orders`
- `GET /api/orders?vendor_id=:vendorId`

### Example Response (`200 OK`)
```json
[
  {
    "id": "ORD-7429",
    "order_id": "ORD-7429",
    "user_id": "usr_482910",
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
]
```

---

## 4. Single Order Detail API

### Endpoint
`GET /api/orders/:orderId`

### Example Response (`200 OK`)
```json
{
  "order": {
    "order_id": "ORD-7429",
    "vendor_id": 12,
    "user_id": "usr_482910",
    "customer_name": "Aarav Patel",
    "customer_phone": "9876543210",
    "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
    "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "total_amount": 160,
    "status": "PLACED",
    "payment_method": "COD",
    "payment_status": "PENDING"
  },
  "items": [
    {
      "item_id": 105,
      "item_name": "Veg Grilled Sandwich",
      "quantity": 2,
      "price": 80,
      "item_total": 160
    }
  ]
}
```

---

## 5. Real-Time Push & Socket Alerts for Vendor App

### A. Socket.IO Real-Time Alarm Event
- **Event Name:** `NEW_ORDER_ALERT`
- **Room:** `vendor_<vendor_id>`

#### Socket Payload:
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

### B. Push Notification (FCM / Expo)
- **Title:** `NEW ORDER #ORD-7429!`
- **Body:** `Customer: Aarav Patel • Total: ₹160.00 • Note: "Please pack separately. Extra spicy and deliver before 7:30 PM."`
- **Data Payload:**
  - `remarks`: `"Please pack separately. Extra spicy and deliver before 7:30 PM."`
  - `notes`: `"Please pack separately. Extra spicy and deliver before 7:30 PM."`
  - `delivery_instructions`: `"Please pack separately. Extra spicy and deliver before 7:30 PM."`
  - `delivery_address`: `"Flat 402, Tower B, Sunshine Residency, Jaipur"`

---

## 6. Frontend UI Recommendations for Vendor App

1. **Vendor Alarm Screen / Popup:**
   - Display a distinct **"Customer Note / Remarks"** block highlighted with an amber or blue badge if `order.remarks` is present and non-empty.
   - Example UI snippet:
     ```jsx
     {order.remarks ? (
       <View style={{ backgroundColor: '#FFFBEB', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 8 }}>
         <Text style={{ fontWeight: 'bold', color: '#B45309' }}>Customer Note / Remarks:</Text>
         <Text style={{ color: '#78350F', marginTop: 2 }}>{order.remarks}</Text>
       </View>
     ) : null}
     ```
2. **Order Receipt / Print / Kitchen Ticket:**
   - Ensure `order.remarks` prints at the bottom of the order ticket so chefs and delivery staff do not miss custom requirements.

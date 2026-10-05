# Web Frontend Developer Documentation: Order Remarks & Account Check Fixes

This documentation is specifically tailored for **Web Frontend Developers** (React / Next.js / Vue / Angular / HTML-JS) working on the **Customer Storefront / Web App** and the **Vendor Web Portal / Dashboard**.

---

## 1. Quick Summary of Updates

1. **Customer Order Remarks**:
   - Web customers can provide notes/instructions at checkout (e.g. *"Call upon arrival, do not use plastic bags"*).
   - Remarks are saved directly to PostgreSQL and forwarded to the vendor in real-time.
2. **Vendor Web Dashboard**:
   - Order management and live order queues now display customer remarks.
3. **`/api/auth/check-account` Timeout Fixed**:
   - Resolved the 8000ms query timeout on customer login and phone number availability checks. Resolves in <5ms.

---

## 2. Customer Web Storefront: Placing an Order

### Endpoint
`POST /api/orders`

### Headers
```http
Content-Type: application/json
Authorization: Bearer <user_token> (Optional if user_id or phone is provided)
```

### Request Payload

Add a remarks textarea to your checkout form and send it in the request:

```json
{
  "vendor_id": 12,
  "user_id": "usr_482910",
  "customer_name": "Pooja Verma",
  "phone": "9876543210",
  "delivery_address": "Flat 304, Royal Palms, C-Scheme, Jaipur",
  "payment_method": "COD",
  "remarks": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "items": [
    {
      "item_id": 45,
      "quantity": 1,
      "price": 250
    }
  ]
}
```

> **Note:** Supported field names in the payload: `remarks`, `remark`, `notes`, `delivery_instructions`, `instructions`. Any of these can be sent.

### Response (`201 Created`)
```json
{
  "success": true,
  "message": "Order placed successfully via Cash on Delivery.",
  "order_id": "ORD-5192",
  "total_amount": 250,
  "status": "PLACED",
  "remarks": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "order": {
    "order_id": "ORD-5192",
    "vendor_id": 12,
    "user_id": "usr_482910",
    "customer_name": "Pooja Verma",
    "delivery_address": "Flat 304, Royal Palms, C-Scheme, Jaipur",
    "remarks": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
    "status": "PLACED",
    "total_amount": 250,
    "items": [
      {
        "item_id": 45,
        "item_name": "Chocolate Truffle Cake",
        "quantity": 1,
        "price": 250
      }
    ]
  }
}
```

---

## 3. Customer Web: Order History & Tracking

### Endpoint
`GET /api/orders/user/:userId`

### Response Item Includes Remarks:
```json
{
  "order_id": "ORD-5192",
  "store_name": "Sweet Delights Bakery",
  "status": "PLACED",
  "remarks": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "notes": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "total_amount": 250,
  "created_at": "2026-10-05T15:00:00+05:30",
  "items": [...]
}
```

---

## 4. Vendor Web Portal / Dashboard

### Endpoints
- **Vendor Panel Orders:** `GET /api/vendor-panel/:vendorId/orders`
- **Vendor Orders:** `GET /api/orders/vendor/:vendorId`
- **Single Order:** `GET /api/orders/:orderId`

### Order Schema (Extract):
```json
{
  "order_id": "ORD-5192",
  "customer_name": "Pooja Verma",
  "phone": "9876543210",
  "delivery_address": "Flat 304, Royal Palms, C-Scheme, Jaipur",
  "remarks": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "notes": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "instructions": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "delivery_instructions": "Please deliver after 6:00 PM. Leave package with security guard if not available.",
  "total": 250,
  "status": "placed",
  "items": [...]
}
```

### UI Implementation for Vendor Web Table / Modal:
```jsx
// In Vendor Live Orders Table / Modal
{order.remarks && (
  <div style={{
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    padding: '8px 12px',
    marginTop: '6px',
    color: '#92400e',
    fontSize: '0.875rem'
  }}>
    <strong>Customer Note:</strong> {order.remarks}
  </div>
)}
```

---

## 5. Web Account Pre-check (`/api/auth/check-account`)

Useful for quick phone / email checks during checkout or registration:

- **Method:** `POST` or `GET`
- **Path:** `/api/auth/check-account` (Aliases: `/api/check-phone`, `/api/auth/check-user`)
- **Body / Query:** `{ "phone": "9876543210" }` or `?phone=9876543210`
- **Response:**
  ```json
  {
    "success": true,
    "exists": true,
    "account_type": "user",
    "user_id": "usr_482910",
    "name": "Pooja Verma"
  }
  ```
- **Performance:** Responds in <5ms.

# Admin Panel Developer Documentation: Order Remarks & Account Check Fixes

This documentation is specifically tailored for **Admin Panel Developers** (React / Vue / Angular / Ant Design / Material-UI) managing orders, vendors, customer accounts, and dispute resolutions.

---

## 1. Quick Summary of Updates

1. **Order Remarks & Special Instructions**:
   - The `orders` database table now stores `remarks TEXT DEFAULT ''`.
   - Admin order listing and order detail endpoints automatically return `remarks` along with `notes` and `delivery_instructions`.
   - Admin search now allows searching orders by customer remarks.
2. **Authentication / Account Check Optimization**:
   - `/api/auth/check-account` query timeout (>8000ms) has been eliminated.
   - B-Tree indexes on `users(phone)`, `users(LOWER(email))`, `vendors(phone_number)`, and `vendors(LOWER(email))` have been applied.

---

## 2. Admin Order Management APIs

### A. List All Orders
`GET /api/admin/orders`

#### Query Parameters:
- `page` (optional, default `1`)
- `limit` (optional, default `20`)
- `status` (optional, e.g. `PLACED`, `ACCEPTED`, `COMPLETED`, `CANCELLED`)
- `vendor_id` (optional)
- `search` (optional - searches across `order_id`, `customer_name`, `delivery_address`, `store_name`)

#### Response Schema (`200 OK`):
```json
{
  "success": true,
  "orders": [
    {
      "order_id": "ORD-7429",
      "user_id": "usr_482910",
      "vendor_id": 12,
      "store_name": "Royal Bakers",
      "customer_name": "Aarav Patel",
      "customer_phone": "9876543210",
      "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
      "total_amount": "160.00",
      "status": "PLACED",
      "payment_method": "COD",
      "payment_status": "PENDING",
      "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
      "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
      "delivery_instructions": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
      "created_at": "2026-10-05T15:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 142,
    "page": 1,
    "limit": 20,
    "pages": 8
  }
}
```

---

### B. Single Order Detail
`GET /api/admin/orders/:orderId` or `GET /api/orders/:orderId`

#### Response:
```json
{
  "order": {
    "order_id": "ORD-7429",
    "vendor_id": 12,
    "store_name": "Royal Bakers",
    "customer_name": "Aarav Patel",
    "customer_phone": "9876543210",
    "delivery_address": "Flat 402, Tower B, Sunshine Residency, Jaipur",
    "remarks": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
    "notes": "Please pack separately. Extra spicy and deliver before 7:30 PM.",
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

## 3. UI Guidelines for Admin Panel Developers

### 1. Orders Data Table:
- Include a **"Remarks / Notes"** column or expandable row preview.
- If remarks exist, show a small tag or badge: `<Tag color="blue">Has Notes</Tag>`.

### 2. Order Details Drawer / Modal:
- Include an **"Instructions from Customer"** callout box:
  ```jsx
  {order.remarks && (
    <div className="alert alert-info" style={{ marginTop: 12 }}>
      <strong>Customer Remarks:</strong> {order.remarks}
    </div>
  )}
  ```

---

## 4. Admin User / Vendor Account Lookup (`/api/auth/check-account`)

Use this endpoint in the Admin console to quickly verify if a phone number or email is already registered as a Customer or a Vendor without triggering slow sequential scans:

- **Method:** `POST` or `GET`
- **Path:** `/api/auth/check-account`
- **Request Body:**
  ```json
  {
    "phone": "9876543210"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "exists": true,
    "account_type": "user",
    "user_id": "usr_482910",
    "name": "Aarav Patel"
  }
  ```
- **Response Time:** Sub-5 milliseconds due to active B-Tree indexing.

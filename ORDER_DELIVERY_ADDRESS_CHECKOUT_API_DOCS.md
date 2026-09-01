# 📄 Frontend Developer Guide — Order Delivery Address on Checkout

> **Document Version**: `v3.4.0 (Order Delivery Address Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Website Developers, Resident App Developers, Admin Panel Developers  

---

## 📋 Summary of Address Behavior

When a user places an order, the **checkout delivery address entered for that specific order** is preserved independently from the user's saved account profile address.

1. **Order Specific Address (`delivery_address`)**:
   - Entered during checkout (e.g., `"wtp second floor"` or `"Office Desk 4B, Tower C"`).
   - Stored directly in the `orders` table under the `delivery_address` column.
   - Returned across all Admin Panel & Vendor App order inspection APIs.

2. **Saved User Profile Address**:
   - The user's default residence saved under account settings (`flat`, `area`, `city`, `pincode`, `address`).
   - Automatically updated when the user changes their primary saved profile address in account settings.

---

## 📡 Order Checkout API Request Schema (`POST /api/orders`)

When placing an order, frontend applications **MUST** send the custom delivery address in the order payload under `delivery_address` or `full_address`:

### Endpoint: `POST /api/orders`

```json
{
  "user_id": "usr_079501",
  "vendor_id": 1216,
  "customer_name": "Garvit",
  "phone": "7568021054",
  "delivery_address": "wtp second floor, Jaipur, Rajasthan, 302001",
  "flat": "wtp second floor",
  "area": "Bais Godam",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302001",
  "items": [
    {
      "item_id": 1717,
      "item_name": "iphone 17 pro",
      "quantity": 1,
      "price": 135000
    }
  ],
  "total_amount": 135000
}
```

---

## 📦 Admin & Vendor Order Response Payload (`HTTP 200 OK`)

### Applicable Endpoints:
- `GET /api/admin/orders`
- `GET /api/admin/users/:userId/orders`
- `GET /api/admin/orders/:orderId`
- `GET /api/vendors/:vendorId/orders`

```json
{
  "order_id": "ORD-6692",
  "user_id": "usr_079501",
  "vendor_id": 1216,
  "customer_name": "Garvit",
  "customer_phone": "7568021054",
  "store_name": "Flower's Point",
  "status": "COMPLETED",
  "flat": "wtp second floor",
  "area": "Bais Godam",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302001",
  "delivery_address": "wtp second floor, Jaipur, Rajasthan, 302001",
  "full_address": "wtp second floor, Jaipur, Rajasthan, 302001",
  "total_amount": 135000,
  "items": [
    {
      "item_id": 1717,
      "item_name": "iphone 17 pro",
      "quantity": 1,
      "price": 135000
    }
  ],
  "created_at": "2026-09-01T17:49:46+05:30",
  "created_at_readable": "01 Sep 2026, 05:49 pm IST"
}
```

---

## 🛠️ Actions Required by Frontend Teams

1. **Website & Resident App Checkout UI**:
   - Ensure the delivery address entered by the user during checkout is passed under `delivery_address` or `full_address` in the `POST /api/orders` body.
   - Do NOT overwrite the order checkout input field with the user's default saved profile address if the user enters a different delivery location (e.g. office/mall address).

2. **Admin Panel UI (`adminMock`)**:
   - Display `order.delivery_address` / `order.full_address` on order cards and modals.

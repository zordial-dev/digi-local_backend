# 🚀 Resident User Address Persistence & Single ID Specification

> **Document Version**: `v1.0.0 (Production Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Resident User App / Website Frontend Developers, Admin Panel Frontend Developers  
> **Protocol**: RESTful HTTP / JSON over TLS 1.3  

---

## 📋 Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Unified `user_id` Primary Identifier](#2-unified-user_id-primary-identifier)
3. [User Registration Behavior — No Dummy Defaults](#3-user-registration-behavior--no-dummy-defaults)
4. [Automatic Address Persistence on Order Placement](#4-automatic-address-persistence-on-order-placement)
5. [Admin Panel Real Data Integration](#5-admin-panel-real-data-integration)
6. [Frontend Integration Code Examples](#6-frontend-integration-code-examples)

---

## 1. Executive Summary

This specification defines the strict backend rules for **Resident User Data**, **Address Persistence**, and **ID Standardization**:
- **Zero Dummy Data**: No dummy address strings (e.g. `'Omaxe Greenwood Residency'`, `'Tower A-402'`) or dummy fallback orders are allocated during registration or user listing.
- **Unified `user_id` Identifier**: All user responses standardize on the `user_id` property.
- **Automatic Address Persistence**: Whenever a user submits a checkout order on the website or mobile app, the entered delivery address is automatically saved to their profile in the database.

---

## 2. Unified `user_id` Primary Identifier

To eliminate ambiguity between `id` and `user_id`, all User endpoints strictly return `user_id`:

```json
{
  "user_id": "usr_948102",
  "name": "Aarushi Sharma",
  "phone": "9876543210",
  "email": "aarushi@example.com",
  "status": "active"
}
```

> ⚠️ **Note for Frontend Developers**: Use `user.user_id` across your application state, local storage, and API requests.

---

## 3. User Registration Behavior — No Dummy Defaults

When a user registers without providing an address, fields default to empty strings (`""`) instead of dummy mock values.

### `POST /api/users/register` Request Payload:
```json
{
  "name": "Jane Doe",
  "phone": "9988776655",
  "password": "Password123!"
}
```

### `HTTP 201 Created` Response Body:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_746201",
    "name": "Jane Doe",
    "email": "",
    "phone": "9988776655",
    "status": "active",
    "area": "",
    "society_name": "",
    "flat": "",
    "city": "",
    "pincode": "",
    "address": ""
  }
}
```

---

## 4. Automatic Address Persistence on Order Placement

Whenever a user places an order on the website or mobile app via `POST /api/orders`, the backend automatically extracts the delivery address and updates the user's record in the database.

### `POST /api/orders` Checkout Request Payload:
```json
{
  "user_id": "usr_746201",
  "vendor_id": 1217,
  "flat": "Flat 402, Block B",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "delivery_address": "Flat 402, Block B, Sector 62 Commercial Area, Noida, 201301",
  "items": [
    { "item_id": 1, "quantity": 2, "price": 150 }
  ],
  "total_amount": 300
}
```

### Backend Execution:
Upon order creation, the backend updates the `users` table:
```sql
UPDATE users 
SET flat = 'Flat 402, Block B',
    area = 'Sector 62 Commercial Area',
    society_name = 'Sector 62 Commercial Area',
    city = 'Noida',
    pincode = '201301',
    address = 'Flat 402, Block B, Sector 62 Commercial Area, Noida, 201301'
WHERE user_id = 'usr_746201';
```

---

## 5. Admin Panel Real Data Integration

For Admin Panel developers (`C:\Users\LENOVO\Desktop\adminMock`):
- `GET /api/admin/users/:id/addresses`: Returns the user's saved residence address. If the user has not placed an order or entered an address yet, it returns an empty array `[]` (no dummy addresses generated).
- `GET /api/admin/users/:id/orders`: Returns the user's real orders from the database. If the user has 0 orders, it returns `[]` (no dummy order allocated).

---

## 6. Frontend Integration Code Examples

### Checkout Address Auto-Save Flow (React / Web):
```typescript
import axios from 'axios';

export async function checkoutAndPlaceOrder(orderData: {
  userId: string;
  vendorId: number;
  flat: string;
  area: string;
  city: string;
  pincode: string;
  items: Array<{ item_id: number; quantity: number; price: number }>;
  totalAmount: number;
}) {
  const fullAddress = `${orderData.flat}, ${orderData.area}, ${orderData.city} ${orderData.pincode}`;

  const response = await axios.post('/api/orders', {
    user_id: orderData.userId,
    vendor_id: orderData.vendorId,
    flat: orderData.flat,
    area: orderData.area,
    city: orderData.city,
    pincode: orderData.pincode,
    delivery_address: fullAddress,
    items: orderData.items,
    total_amount: orderData.totalAmount
  });

  // The backend automatically saves flat, area, city, pincode, fullAddress 
  // into the user's database record upon order creation!
  return response.data;
}
```

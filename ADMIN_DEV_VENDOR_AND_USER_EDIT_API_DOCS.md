# 🛠️ Admin Panel Developer API Guide — Vendor, User & Orders Management

> **Document Version**: `v2.6.0 (Admin Developer Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Admin Panel Frontend Developers (`C:\Users\LENOVO\Desktop\adminMock`), Integration Engineers  
> **Production Base URL**: `https://digi-local-backend.onrender.com`  
> **Local Base URL**: `http://localhost:5000`  

---

## 📋 Table of Contents
1. [Overview](#1-overview)
2. [Editing Vendor Merchant Details](#2-editing-vendor-merchant-details)
3. [Editing Resident User Details](#3-editing-resident-user-details)
4. [User Directory & Sub-Resources](#4-user-directory--sub-resources)
5. [TypeScript Integration Code Examples](#5-typescript-integration-code-examples)

---

## 1. Overview

This document provides full specifications for Admin Panel developers to execute **Edit Vendor**, **Edit User**, and **Full Order Details Inspection** operations directly from the Admin Panel UI.

---

## 2. Editing Vendor Merchant Details

### Endpoints
- `PUT /api/admin/vendors/:id`
- `PATCH /api/admin/vendors/:id`

#### Request Payload Schema:
```json
{
  "store_name": "FreshMart Super Store",
  "owner_name": "Lovely Merchant",
  "vendor_name": "Lovely Merchant",
  "email": "freshmart@gmail.com",
  "phone_number": "9509512187",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "category": "Grocery & Daily Needs",
  "gstin": "07AAAAA0000A1Z5",
  "min_order_value": 0,
  "delivery_charge": 20,
  "status": "ACTIVE"
}
```

---

## 3. Editing Resident User Details

### Endpoints
- `PUT /api/admin/users/:id`
- `PATCH /api/admin/users/:id`

#### Request Payload Schema:
```json
{
  "name": "Shivin",
  "email": "shivin@example.com",
  "phone": "+918005625999",
  "flat": "Flat 505, Tower B",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301",
  "status": "ACTIVE"
}
```

---

## 4. User Directory & Sub-Resources

- **Fetch Single User**: `GET /api/admin/users/:id`
- **Fetch User Addresses**: `GET /api/admin/users/:id/addresses`
- **Fetch User Orders (Complete Details)**: `GET /api/admin/users/:id/orders`

---

## 5. Complete Admin Orders APIs (With Items & Details)

All Admin Panel order endpoints return complete itemized arrays (`items`), store name, customer name, phone number, subtotal, and full delivery address.

### Endpoints:
- `GET /api/admin/orders` (Global orders list)
- `GET /api/admin/orders/:id` (Single order details)
- `GET /api/admin/users/:id/orders` (User orders history)

#### Complete Order Response JSON (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User orders with full items details retrieved successfully.",
  "data": [
    {
      "order_id": "ORD-7360",
      "id": "ORD-7360",
      "user_id": "usr_456434",
      "vendor_id": 1217,
      "customer_name": "Shivin",
      "customer_phone": "+918005625999",
      "phone": "+918005625999",
      "store_name": "FreshMart Super Store",
      "vendor_name": "Lovely Merchant",
      "vendor_phone": "9509512187",
      "category": "Grocery & Daily Needs",
      "status": "PLACED",
      "payment_status": "PAID",
      "payment_method": "COD / Online",
      "flat": "Flat 505, Tower B",
      "area": "Sector 62 Commercial Area",
      "delivery_address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301",
      "subtotal": 599,
      "service_charge": 0,
      "total_amount": 599,
      "items_count": 1,
      "items": [
        {
          "item_id": 1716,
          "item_name": "Lily bouquet",
          "name": "Lily bouquet",
          "quantity": 1,
          "unit_price": 599,
          "price": 599,
          "item_total": 599
        }
      ],
      "created_at": "2026-09-01T16:45:00+05:30",
      "created_at_readable": "01 Sep 2026, 04:45 pm IST"
    }
  ]
}
```

---

## 6. TypeScript Integration Code Examples

```typescript
import axios from 'axios';

const ADMIN_API_BASE = 'https://digi-local-backend.onrender.com';

// 1. Fetch User Orders with Items in Admin Panel
export async function getUserOrdersWithItems(userId: string) {
  const response = await axios.get(`${ADMIN_API_BASE}/api/admin/users/${userId}/orders`);
  return response.data; // Includes full items array & prices
}

// 2. Fetch Single Order Details with Items
export async function getOrderDetails(orderId: string) {
  const response = await axios.get(`${ADMIN_API_BASE}/api/admin/orders/${orderId}`);
  return response.data;
}
```

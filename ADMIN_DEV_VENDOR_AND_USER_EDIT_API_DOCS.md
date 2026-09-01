# 🛠️ Admin Panel Developer API Guide — Vendor & User Management

> **Document Version**: `v2.5.0 (Admin Developer Specification)`  
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

This document provides full specifications for Admin Panel developers to execute **Edit Vendor** and **Edit User** operations directly from the Admin Panel UI.

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

#### Response Body (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor details for \"FreshMart Super Store\" updated successfully in database.",
  "data": {
    "vendor_id": "1217",
    "store_name": "FreshMart Super Store",
    "owner_name": "Lovely Merchant",
    "email": "freshmart@gmail.com",
    "phone": "9509512187",
    "area": "Sector 62 Commercial Area",
    "status": "active"
  }
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

#### Response Body (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User profile details for \"Shivin\" updated successfully in database.",
  "data": {
    "user_id": "usr_456434",
    "name": "Shivin",
    "email": "shivin@example.com",
    "phone": "+918005625999",
    "flat": "Flat 505, Tower B",
    "area": "Sector 62 Commercial Area",
    "city": "Noida",
    "pincode": "201301",
    "address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301",
    "status": "active"
  }
}
```

---

## 4. User Directory & Sub-Resources

- **Fetch Single User**: `GET /api/admin/users/:id`
- **Fetch User Addresses**: `GET /api/admin/users/:id/addresses`
- **Fetch User Orders**: `GET /api/admin/users/:id/orders`

---

## 5. TypeScript Integration Code Examples

```typescript
import axios from 'axios';

const ADMIN_API_BASE = 'https://digi-local-backend.onrender.com';

// 1. Edit Vendor Details in Admin Panel
export async function editVendor(vendorId: string | number, vendorData: any) {
  const response = await axios.put(`${ADMIN_API_BASE}/api/admin/vendors/${vendorId}`, vendorData);
  return response.data;
}

// 2. Edit User Details in Admin Panel
export async function editUser(userId: string, userData: any) {
  const response = await axios.put(`${ADMIN_API_BASE}/api/admin/users/${userId}`, userData);
  return response.data;
}
```

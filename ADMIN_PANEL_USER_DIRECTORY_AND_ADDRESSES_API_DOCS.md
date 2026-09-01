# 🚀 Admin Panel — User Directory & Sub-Resource APIs Specification

> **Document Version**: `v2.0.0 (Production Admin Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Admin Panel Frontend Developers (`C:\Users\LENOVO\Desktop\adminMock`), Lead Engineers  
> **Protocol**: RESTful HTTP / JSON over TLS 1.3  
> **Production Base URL**: `https://digi-local-backend.onrender.com`  
> **Local Base URL**: `http://localhost:5000`  

---

## 📋 Table of Contents
1. [Overview & Data Principles](#1-overview--data-principles)
2. [User Directory List API (`GET /api/admin/users`)](#2-user-directory-list-api-get-apiadminusers)
3. [User Profile Details API (`GET /api/admin/users/:id`)](#3-user-profile-details-api-get-apiadminusersid)
4. [User Addresses Sub-Resource API (`GET /api/admin/users/:id/addresses`)](#4-user-addresses-sub-resource-api-get-apiadminusersidaddresses)
5. [User Orders Sub-Resource API (`GET /api/admin/users/:id/orders`)](#5-user-orders-sub-resource-api-get-apiadminusersidorders)
6. [User Payments Sub-Resource API (`GET /api/admin/users/:id/payments`)](#6-user-payments-sub-resource-api-get-apiadminusersidpayments)
7. [User Timeline Sub-Resource API (`GET /api/admin/users/:id/timeline`)](#7-user-timeline-sub-resource-api-get-apiadminusersidtimeline)
8. [Admin Panel Integration TypeScript Code Examples](#8-admin-panel-integration-typescript-code-examples)

---

## 1. Overview & Data Principles

The **Admin Panel User Subsystem** provides complete visibility into resident user accounts, address records, order history, and account activity timelines.

### Key Backend Architectural Guarantees:
- **Real Database Data Only**: Returns actual data from the PostgreSQL `users` table. If a user registered without entering address details, fields default to empty strings `""` and the address endpoint returns an empty array `[]` (no dummy addresses or mock orders generated).
- **Single `user_id` Primary Key**: Use `user_id` consistently across all state variables, route parameters, and API requests.
- **Area-Based Location Model**: Uses `area` (with optional `society_name`) without rigid society ID dependencies.

---

## 2. User Directory List API (`GET /api/admin/users`)

- **Endpoints**: `GET /api/admin/users` (or `/api/people`)
- **Query Parameters**:
  - `search` *(string, optional)*: Filter by user name, phone, email, ID, flat, or area.
  - `page` *(number, optional, default: `1`)*: Page number.
  - `limit` *(number, optional, default: `100`)*: Number of users per page.

#### Sample Response (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Users directory retrieved successfully.",
  "data": [
    {
      "user_id": "usr_708296",
      "name": "uzer",
      "email": "",
      "phone": "+918585858585",
      "area": "Sector 62 Commercial Area",
      "society_name": "Sector 62 Commercial Area",
      "flat": "Flat 505, Tower B",
      "status": "active",
      "is_blocked": false,
      "created_at": "2026-09-01T05:35:08.634Z"
    }
  ]
}
```

---

## 3. User Profile Details API (`GET /api/admin/users/:id`)

- **Endpoints**: `GET /api/admin/users/:id` (or `/api/people/:id`)

#### Sample Response (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User profile retrieved successfully.",
  "data": {
    "user_id": "usr_708296",
    "name": "uzer",
    "email": "",
    "phone": "+918585858585",
    "area": "Sector 62 Commercial Area",
    "society_name": "Sector 62 Commercial Area",
    "flat": "Flat 505, Tower B",
    "status": "active",
    "is_blocked": false,
    "created_at": "2026-09-01T05:35:08.634Z"
  }
}
```

---

## 4. User Addresses Sub-Resource API (`GET /api/admin/users/:id/addresses`)

- **Endpoints**: `GET /api/admin/users/:id/addresses` (or `/api/people/:id/addresses`)

#### Response (`HTTP 200 OK` — When User Has Saved Address):
```json
{
  "code": 200,
  "status": "success",
  "message": "User addresses retrieved successfully.",
  "data": [
    {
      "address_id": "addr_primary_usr_708296",
      "user_id": "usr_708296",
      "type": "Primary Residence",
      "flat": "Flat 505, Tower B",
      "area": "Sector 62 Commercial Area",
      "society_name": "Sector 62 Commercial Area",
      "city": "Noida",
      "state": "",
      "pincode": "201301",
      "full_address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301",
      "is_default": true
    }
  ]
}
```

#### Response (`HTTP 200 OK` — When User Has NOT Entered Address Yet):
```json
{
  "code": 200,
  "status": "success",
  "message": "User addresses retrieved successfully.",
  "data": []
}
```

---

## 5. User Orders Sub-Resource API (`GET /api/admin/users/:id/orders`)

- **Endpoints**: `GET /api/admin/users/:id/orders` (or `/api/people/:id/orders`)

#### Response (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User orders retrieved successfully.",
  "data": [
    {
      "order_id": "ORD-7492",
      "user_id": "usr_708296",
      "vendor_id": 1217,
      "total_amount": 136.00,
      "status": "PENDING",
      "delivery_address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301",
      "created_at": "2026-09-01T15:40:00.000Z"
    }
  ]
}
```

---

## 6. User Payments Sub-Resource API (`GET /api/admin/users/:id/payments`)

- **Endpoints**: `GET /api/admin/users/:id/payments` (or `/api/people/:id/payments`)

#### Response (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User payment ledger retrieved successfully.",
  "data": []
}
```

---

## 7. User Timeline Sub-Resource API (`GET /api/admin/users/:id/timeline`)

- **Endpoints**: `GET /api/admin/users/:id/timeline` (or `/api/people/:id/timeline`)

#### Response (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User activity timeline retrieved successfully.",
  "data": [
    {
      "id": "evt_reg_usr_708296",
      "type": "REGISTRATION",
      "title": "User Account Created",
      "description": "Resident account registered with mobile +918585858585",
      "timestamp": "2026-09-01T05:35:08.634Z"
    }
  ]
}
```

---

## 8. Admin Panel Integration TypeScript Code Examples

```typescript
import axios from 'axios';

const ADMIN_API_BASE = 'https://digi-local-backend.onrender.com';

// 1. Fetch User Profile for Admin Drawer
export async function fetchAdminUserProfile(userId: string) {
  const response = await axios.get(`${ADMIN_API_BASE}/api/admin/users/${userId}`);
  return response.data.data;
}

// 2. Fetch User Residence Addresses for Admin Drawer
export async function fetchAdminUserAddresses(userId: string) {
  const response = await axios.get(`${ADMIN_API_BASE}/api/admin/users/${userId}/addresses`);
  return response.data.data; // Returns Array of addresses or [] if none
}

// 3. Fetch User Orders History for Admin Drawer
export async function fetchAdminUserOrders(userId: string) {
  const response = await axios.get(`${ADMIN_API_BASE}/api/admin/users/${userId}/orders`);
  return response.data.data; // Returns Array of orders or [] if none
}
```

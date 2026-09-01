# 🌐 Website & Resident User App Developer API Guide

> **Document Version**: `v2.5.0 (Production Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Website Developers, Resident Mobile App Developers  
> **Production Base URL**: `https://digi-local-backend.onrender.com`  
> **Local Base URL**: `http://localhost:5000`  

---

## 📋 Table of Contents
1. [User Profile & Status Response Payloads](#1-user-profile--status-response-payloads)
2. [Saving & Updating Address from Website Settings](#2-saving--updating-address-from-website-settings)
3. [Automatic Checkout Address Auto-Save](#3-automatic-checkout-address-auto-save)
4. [TypeScript Integration Code Examples](#4-typescript-integration-code-examples)

---

## 1. User Profile & Status Response Payloads

All user authentication, profile, and status check endpoints now return complete address fields (`flat`, `area`, `society_name`, `city`, `pincode`, `address`).

### Applicable Endpoints:
- `GET /api/users/profile`
- `GET /api/users/status/:userId`
- `POST /api/users/login`
- `POST /api/users/register`
- `PUT /api/users/profile`

#### Sample Response Body (`HTTP 200 OK`):
```json
{
  "success": true,
  "user_id": "usr_708296",
  "name": "uzer",
  "email": "uzer@example.com",
  "phone": "+918585858585",
  "status": "active",
  "is_blocked": false,
  "society_id": "",
  "society_name": "Sector 62 Commercial Area",
  "area": "Sector 62 Commercial Area",
  "flat": "Suite 1001, Tower C",
  "city": "Noida",
  "pincode": "201301",
  "address": "Suite 1001, Tower C, Sector 62 Commercial Area, Noida, 201301"
}
```

---

## 2. Saving & Updating Address from Website Settings

### Endpoints
- `PUT /api/users/profile`
- `PUT /api/users/address`

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Request Payload Schema
```json
{
  "user_id": "usr_708296",
  "flat": "Suite 1001, Tower C",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "address": "Suite 1001, Tower C, Sector 62 Commercial Area, Noida, 201301"
}
```

---

## 3. Automatic Checkout Address Auto-Save

Placing an order on the website automatically persists the entered delivery address into the user's database profile.

### Endpoint: `POST /api/orders`

```json
{
  "user_id": "usr_708296",
  "vendor_id": 1217,
  "customer_name": "uzer",
  "phone": "8585858585",
  "flat": "Suite 1001, Tower C",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "delivery_address": "Suite 1001, Tower C, Sector 62 Commercial Area, Noida, 201301",
  "items": [
    { "item_id": 101, "quantity": 1, "price": 100 }
  ],
  "total_amount": 100
}
```

---

## 4. TypeScript Integration Code Examples

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://digi-local-backend.onrender.com';

// 1. Fetch User Profile with Address
export async function getUserProfile(userId: string) {
  const response = await axios.get(`${API_BASE_URL}/api/users/status/${userId}`);
  return response.data; // Contains flat, area, city, pincode, address
}

// 2. Save User Address in Account Settings
export async function updateUserAddress(addressData: {
  userId: string;
  flat: string;
  area: string;
  city: string;
  pincode: string;
}) {
  const fullAddress = `${addressData.flat}, ${addressData.area}, ${addressData.city}, ${addressData.pincode}`;

  const response = await axios.put(`${API_BASE_URL}/api/users/profile`, {
    user_id: addressData.userId,
    flat: addressData.flat,
    area: addressData.area,
    city: addressData.city,
    pincode: addressData.pincode,
    address: fullAddress
  });

  return response.data;
}
```

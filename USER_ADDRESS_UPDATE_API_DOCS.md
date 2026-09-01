# 🚀 Resident User Address Persistence & Update API Specification

> **Document Version**: `v1.5.0 (Production Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Website Frontend Developers, Mobile App Developers, Backend Integration Engineers  
> **Protocol**: RESTful HTTP / JSON over TLS 1.3  
> **Production Base URL**: `https://digi-local-backend.onrender.com`  
> **Local Base URL**: `http://localhost:5000`  

---

## 📋 Overview

Users can add or update their delivery address in the database through **two simple methods**:
1. **Direct Profile/Address Update API**: `PUT /api/users/profile` or `PUT /api/users/address` (Used when the user edits their profile or address on the website/app).
2. **Automatic Checkout Address Auto-Save**: `POST /api/orders` (Whenever a user places an order, the entered delivery address is automatically saved to their profile in the database).

---

## Method 1: Save/Update Address via Profile API

### Endpoints
- `PUT /api/users/profile`
- `PUT /api/users/address`
- `POST /api/users/address`

### Request Headers
```http
Content-Type: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### Request Body Schema
| Field Name | Type | Required | Description | Accepted Aliases |
|---|---|---|---|---|
| `user_id` | `string` | **Yes** (or via JWT) | User ID or mobile number | `userId`, `phone` |
| `flat` | `string` | Optional | House number, flat number, or unit | `house_number`, `unit` |
| `area` | `string` | Optional | Sector, commercial area, or locality | `location`, `society_name` |
| `city` | `string` | Optional | City name | - |
| `pincode` | `string` | Optional | 6-digit postal pincode | `zip` |
| `address` | `string` | Optional | Full formatted address string | `full_address` |

#### Sample Request Body:
```json
{
  "user_id": "usr_708296",
  "flat": "Flat 505, Tower B",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301"
}
```

#### Sample `HTTP 200 OK` Response Body:
```json
{
  "success": true,
  "message": "User profile and address updated successfully in database.",
  "user": {
    "user_id": "usr_708296",
    "name": "uzer",
    "email": "uzer@example.com",
    "phone": "+918585858585",
    "status": "active",
    "is_blocked": false,
    "area": "Sector 62 Commercial Area",
    "society_name": "Sector 62 Commercial Area",
    "flat": "Flat 505, Tower B",
    "city": "Noida",
    "pincode": "201301",
    "address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301"
  }
}
```

---

## Method 2: Automatic Address Auto-Save During Checkout

Whenever a user places an order on the website via `POST /api/orders`, the backend automatically extracts the delivery address and updates the `users` database table.

### Endpoint: `POST /api/orders`

#### Sample Request Body:
```json
{
  "user_id": "usr_708296",
  "vendor_id": 1217,
  "customer_name": "uzer",
  "phone": "8585858585",
  "flat": "Flat 505, Tower B",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "delivery_address": "Flat 505, Tower B, Sector 62 Commercial Area, Noida, 201301",
  "items": [
    { "item_id": 101, "quantity": 1, "price": 100 }
  ],
  "total_amount": 100
}
```

---

## 💻 Website Frontend Integration Code (TypeScript / React)

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://digi-local-backend.onrender.com';

// 1. Save / Update User Address from User Account Settings
export async function saveUserAddress(addressData: {
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

// 2. Fetch Saved Address for User Profile / Checkout Auto-Fill
export async function fetchUserProfile(userId: string) {
  const response = await axios.get(`${API_BASE_URL}/api/users/status/${userId}`);
  return response.data;
}
```

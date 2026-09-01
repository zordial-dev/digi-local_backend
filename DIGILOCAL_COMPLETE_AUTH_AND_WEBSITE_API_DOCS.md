# 🚀 DigiLocal — Complete User, Vendor & Website API Documentation

> **Document Version**: `v3.0.0 (Production Master Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Website Developers, Resident Mobile App Developers, Vendor Merchant App Developers, Integration Leads  
> **Protocol**: RESTful HTTP / JSON over TLS 1.3  
> **Production Base URL**: `https://digi-local-backend.onrender.com`  
> **Local Base URL**: `http://localhost:5000`  

---

## 📋 Table of Contents
1. [Overview & Security Architecture](#1-overview--security-architecture)
2. [Mandatory Request Headers](#2-mandatory-request-headers)
3. [Section A: Resident User Authentication APIs](#3-section-a-resident-user-authentication-apis)
   - [A1. Check Mobile Number Registration (`POST /api/users/check-phone`)](#a1-check-mobile-number-registration-post-apiuserscheck-phone)
   - [A2. Send MSG91 SMS OTP (`POST /api/users/send-otp`)](#a2-send-msg91-sms-otp-post-apiuserssend-otp)
   - [A3. Verify SMS OTP (`POST /api/users/verify-otp`)](#a3-verify-sms-otp-post-apiusersverify-otp)
   - [A4. Resident User Registration (`POST /api/users/register`)](#a4-resident-user-registration-post-apiusersregister)
   - [A5. Resident User Login (`POST /api/users/login`)](#a5-resident-user-login-post-apiuserslogin)
   - [A6. Fetch User Profile (`GET /api/users/profile`)](#a6-fetch-user-profile-get-apiusersprofile)
   - [A7. Delete Resident User Account (`DELETE /api/users/profile`)](#a7-delete-resident-user-account-delete-apiusersprofile)
4. [Section B: Vendor Merchant Authentication APIs](#4-section-b-vendor-merchant-authentication-apis)
   - [B1. Vendor Store Login (`POST /api/vendors/login`)](#b1-vendor-store-login-post-apivendorslogin)
   - [B2. Refresh Access Token (`POST /api/vendors/refresh-token`)](#b2-refresh-access-token-post-apivendorsrefresh-token)
   - [B3. Vendor Store Logout (`POST /api/vendors/logout`)](#b3-vendor-store-logout-post-apivendorslogout)
5. [Section C: Website Storefront & Ordering Pipeline APIs](#5-section-c-website-storefront--ordering-pipeline-apis)
   - [C1. Browse Societies / Areas (`GET /api/societies`)](#c1-browse-societies--areas-get-apisocieties)
   - [C2. Browse Local Merchants / Stores (`GET /api/stores`)](#c2-browse-local-merchants--stores-get-apistores)
   - [C3. Fetch Store Details & Catalog Items (`GET /api/stores/:id`)](#c3-fetch-store-details--catalog-items-get-apistoresid)
   - [C4. Place Order & Auto-Persist Address (`POST /api/orders`)](#c4-place-order--auto-persist-address-post-apiorders)
   - [C5. Fetch User Order History (`GET /api/users/:userId/orders`)](#c5-fetch-user-order-history-get-apiusersuseridorders)
6. [Frontend Integration Code Examples](#6-frontend-integration-code-examples)

---

## 1. Overview & Security Architecture

The DigiLocal platform powers real-time local commerce across three connected entities:
- **Resident Users**: Browse local stores, order groceries/goods, track orders, and manage saved delivery addresses.
- **Vendor Merchants**: Manage storefront catalog items, process incoming customer orders, and manage merchant profiles.
- **Admin Portal**: Platform governance, sub-admin delegation, society onboarding, and audit logging.

### Core Technical Guarantees:
- **Zero Dummy Data**: No dummy address strings (`'Omaxe Greenwood Residency'`, `'Tower A-402'`) or mock orders are generated.
- **Unified `user_id` Identifier**: Single primary identifier key `user_id` across all payloads.
- **Automatic Address Persistence**: Placing an order on the website via `POST /api/orders` automatically persists the entered delivery address into the user's database record.
- **Password Security**: Passwords are verified via bcrypt/scrypt. Wrong passwords return `401 Unauthorized` (`"Incorrect password..."`) rather than confusing "user not found" messages.

---

## 2. Mandatory Request Headers

All API HTTP requests MUST supply:

```http
Content-Type: application/json
Accept: application/json
```

For authenticated requests (User or Vendor profile, order placement):
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 3. Section A: Resident User Authentication APIs

### A1. Check Mobile Number Registration (`POST /api/users/check-phone`)

Checks whether a resident user account already exists for the mobile number before triggering login or registration.

#### Request Body:
```json
{
  "phone": "8005625999"
}
```

#### Response (`HTTP 200 OK` — Found):
```json
{
  "exists": true,
  "phone": "8005625999",
  "message": "Account found"
}
```

#### Response (`HTTP 200 OK` — Not Found):
```json
{
  "exists": false,
  "phone": "8005625999",
  "message": "No account found with this mobile number"
}
```

---

### A2. Send MSG91 SMS OTP (`POST /api/users/send-otp` or `POST /api/otp/send-otp`)

Sends a 4/6 digit SMS OTP verification code to the target mobile number.

#### Request Body (Login Intent):
```json
{
  "phone": "8005625999",
  "purpose": "login"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "target": "8005625999",
  "provider": "msg91"
}
```

#### Error Response (`HTTP 404 Not Found` — Account Not Found for Login Intent):
```json
{
  "success": false,
  "error": "No account found with this mobile number. Please register your account first."
}
```

---

### A3. Verify SMS OTP (`POST /api/users/verify-otp` or `POST /api/otp/verify-otp`)

#### Request Body:
```json
{
  "phone": "8005625999",
  "otp": "123456"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "valid": true
}
```

---

### A4. Resident User Registration (`POST /api/users/register`)

Registers a new resident user. If address fields are omitted, they are initialized to empty strings `""` (no dummy values allocated).

#### Request Body:
```json
{
  "name": "Shivin",
  "phone": "8005625999",
  "email": "shivin@example.com",
  "password": "UserSecretPass123!",
  "area": "Sector 62 Commercial Area",
  "flat": "Flat 402, Block B",
  "city": "Noida",
  "pincode": "201301"
}
```

#### Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_456434",
    "name": "Shivin",
    "email": "shivin@example.com",
    "phone": "8005625999",
    "status": "active",
    "is_blocked": false,
    "area": "Sector 62 Commercial Area",
    "flat": "Flat 402, Block B",
    "city": "Noida",
    "pincode": "201301",
    "address": "Flat 402, Block B, Sector 62 Commercial Area, Noida, 201301"
  }
}
```

---

### A5. Resident User Login (`POST /api/users/login`)

Authenticates a resident user via password or SMS OTP code.

#### Request Body (Password Login):
```json
{
  "phone": "8005625999",
  "password": "UserSecretPass123!"
}
```

#### Request Body (OTP Login):
```json
{
  "phone": "8005625999",
  "otp": "123456"
}
```

#### Response (`HTTP 200 OK` — Success):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_456434",
    "name": "Shivin",
    "email": "shivin@example.com",
    "phone": "8005625999",
    "status": "active",
    "is_blocked": false,
    "area": "Sector 62 Commercial Area",
    "flat": "Flat 402, Block B",
    "city": "Noida",
    "pincode": "201301"
  }
}
```

#### Error (`HTTP 401 Unauthorized` — Wrong Password):
```json
{
  "error": "Incorrect password. Please check your password and try again."
}
```

#### Error (`HTTP 404 Not Found` — Unregistered Phone):
```json
{
  "error": "No user account found with mobile number 8005625999. Please register your account first."
}
```

---

### A6. Fetch User Profile (`GET /api/users/profile` or `GET /api/users/me`)

#### Headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Response (`HTTP 200 OK`):
```json
{
  "user_id": "usr_456434",
  "name": "Shivin",
  "email": "shivin@example.com",
  "phone": "8005625999",
  "status": "active",
  "is_blocked": false,
  "area": "Sector 62 Commercial Area",
  "flat": "Flat 402, Block B",
  "city": "Noida",
  "pincode": "201301"
}
```

---

### A7. Delete Resident User Account (`DELETE /api/users/profile`)

Permanent removal of user account and associated credentials.

#### Headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "User account permanently deleted successfully."
}
```

---

## 4. Section B: Vendor Merchant Authentication APIs

### B1. Vendor Store Login (`POST /api/vendors/login`)

#### Request Body:
```json
{
  "email": "freshmart@gmail.com",
  "password": "StorePassword123!"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 1217,
  "status": "active",
  "vendor": {
    "vendor_id": 1217,
    "store_name": "FreshMart Grocery",
    "vendor_name": "Lovely Merchant",
    "email": "freshmart@gmail.com",
    "phone_number": "9509512187",
    "status": "active"
  }
}
```

#### Error (`HTTP 401 Unauthorized` — Wrong Password):
```json
{
  "error": "Incorrect password. Please check your password and try again."
}
```

---

### B2. Refresh Access Token (`POST /api/vendors/refresh-token`)

```json
{
  "refreshToken": "<REFRESH_TOKEN>"
}
```

---

### B3. Vendor Store Logout (`POST /api/vendors/logout`)

```http
Authorization: Bearer <ACCESS_TOKEN>
```

---

## 5. Section C: Website Storefront & Ordering Pipeline APIs

### C1. Browse Societies / Areas (`GET /api/societies`)

Returns list of active commercial areas/societies.

#### Response (`HTTP 200 OK`):
```json
[
  {
    "society_id": 1,
    "society_name": "Sector 62 Commercial Area",
    "city": "Noida",
    "pincode": "201301"
  }
]
```

---

### C2. Browse Local Merchants / Stores (`GET /api/stores` or `GET /api/vendors`)

Query parameters: `area`, `search`, `category`.

#### Response (`HTTP 200 OK`):
```json
[
  {
    "vendor_id": 1217,
    "store_name": "FreshMart Grocery",
    "category": "Grocery & Daily Needs",
    "area": "Sector 62 Commercial Area",
    "is_open": true
  }
]
```

---

### C3. Fetch Store Details & Catalog Items (`GET /api/stores/:id`)

#### Response (`HTTP 200 OK`):
```json
{
  "vendor_id": 1217,
  "store_name": "FreshMart Grocery",
  "area": "Sector 62 Commercial Area",
  "items": [
    {
      "item_id": 101,
      "item_name": "Organic Whole Milk 1L",
      "price": 68,
      "category": "Dairy"
    }
  ]
}
```

---

### C4. Place Order & Auto-Persist Address (`POST /api/orders`)

Places an order from the website checkout. **The backend automatically updates and saves the entered delivery address into the user's database profile**.

#### Request Body:
```json
{
  "user_id": "usr_456434",
  "vendor_id": 1217,
  "customer_name": "Shivin",
  "phone": "8005625999",
  "flat": "Flat 402, Block B",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "pincode": "201301",
  "delivery_address": "Flat 402, Block B, Sector 62 Commercial Area, Noida, 201301",
  "items": [
    { "item_id": 101, "quantity": 2, "price": 68 }
  ],
  "total_amount": 136,
  "payment_method": "COD"
}
```

#### Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "message": "Order created successfully",
  "order_id": "ORD-7492",
  "order": {
    "order_id": "ORD-7492",
    "user_id": "usr_456434",
    "vendor_id": 1217,
    "total_amount": 136,
    "status": "PENDING",
    "delivery_address": "Flat 402, Block B, Sector 62 Commercial Area, Noida, 201301"
  }
}
```

---

### C5. Fetch User Order History (`GET /api/users/:userId/orders`)

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "order_id": "ORD-7492",
      "user_id": "usr_456434",
      "store_name": "FreshMart Grocery",
      "total_amount": 136,
      "status": "PENDING",
      "delivery_address": "Flat 402, Block B, Sector 62 Commercial Area, Noida, 201301",
      "items": [
        { "item_name": "Organic Whole Milk 1L", "quantity": 2, "price": 68 }
      ]
    }
  ]
}
```

---

## 6. Frontend Integration Code Examples

### Full Website Checkout Flow (TypeScript / React):

```typescript
import axios from 'axios';

const API_BASE = 'https://digi-local-backend.onrender.com';

export async function checkoutCart(cart: {
  userId: string;
  vendorId: number;
  customerName: string;
  phone: string;
  flat: string;
  area: string;
  city: string;
  pincode: string;
  items: Array<{ item_id: number; quantity: number; price: number }>;
  totalAmount: number;
}) {
  const fullAddress = `${cart.flat}, ${cart.area}, ${cart.city} ${cart.pincode}`;

  const response = await axios.post(`${API_BASE}/api/orders`, {
    user_id: cart.userId,
    vendor_id: cart.vendorId,
    customer_name: cart.customerName,
    phone: cart.phone,
    flat: cart.flat,
    area: cart.area,
    city: cart.city,
    pincode: cart.pincode,
    delivery_address: fullAddress,
    items: cart.items,
    total_amount: cart.totalAmount
  });

  // The backend automatically saves flat, area, city, pincode, delivery_address 
  // to the user's database record upon order creation!
  return response.data;
}
```

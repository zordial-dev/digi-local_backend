# 🚀 DigiLocal Backend Platform — Exhaustive REST API Specification

Complete, production-ready API documentation covering **all 30+ REST endpoints**, expected request bodies, headers, parameters, and JSON response contracts for Resident Mobile App, Vendor Mobile App, and Admin Web Portal developers.

---

## 🌐 Base Server URL & Environments

| Environment | Base URL |
| :--- | :--- |
| **Local Environment** | `http://localhost:5000` |
| **Android Emulator** | `http://10.0.2.2:5000` |
| **Physical Mobile Device (Wi-Fi)** | `http://<your-ip-address>:5000` |
| **Production PostgreSQL Database (Render)** | `https://digilocal-backend-mock.onrender.com` |

- **Interactive Swagger OpenAPI UI:** `http://localhost:5000/api-docs`
- **Raw OpenAPI 3.1 Specification:** `http://localhost:5000/openapi.json`

---

## 🔐 Authentication & Header Conventions

Protected endpoints require a Bearer token in the HTTP `Authorization` header:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 📋 Table of Contents

1. [System & Health APIs](#1-system--health-apis)
2. [Housing Societies & Storefront APIs](#2-housing-societies--storefront-apis)
3. [Resident User Authentication APIs](#3-resident-user-authentication-apis)
4. [Vendor Authentication & OTP Account APIs](#4-vendor-authentication--otp-account-apis)
5. [Vendor Dashboard & Catalog Management APIs](#5-vendor-dashboard--catalog-management-apis)
6. [Customer & Vendor Order Pipeline APIs](#6-customer--vendor-order-pipeline-apis)
7. [Admin Portal Management APIs](#7-admin-portal-management-apis)

---

## 1. System & Health APIs

### 1.1 Server Health & Status
- **Method & Path:** `GET /health`
- **Auth:** Public
- **Request Body:** None
- **Response `200 OK`:**
```json
{
  "status": "UP",
  "environment": "development",
  "version": "1.0.0",
  "database": {
    "status": "UP",
    "engine": "POSTGRES"
  }
}
```

### 1.2 System Version Redirect
- **Method & Path:** `GET /version`
- **Auth:** Public
- **Request Body:** None
- **Response `302 Found`:** Redirects to `/health`.

### 1.3 OpenAPI 3.1 JSON Specification
- **Method & Path:** `GET /openapi.json`
- **Auth:** Public
- **Response `200 OK`:** Returns full OpenAPI 3.1 JSON schema document.

### 1.4 Interactive Swagger Documentation UI
- **Method & Path:** `GET /api-docs`
- **Auth:** Public
- **Response `200 OK`:** HTML Swagger UI page.

---

## 2. Housing Societies & Storefront APIs

### 2.1 List Housing Societies
- **Method & Path:** `GET /api/societies`
- **Auth:** Public
- **Query Params:** `?search=omaxe` (Optional)
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "location": "Sector Greenwood, Omega II, Greater Noida",
    "pincode": "201310",
    "total_flats": 850,
    "rwa_phone": "9876543210",
    "vendor_count": 2,
    "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800",
    "banner_image": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200"
  }
]
```

### 2.2 Get Society Details by ID
- **Method & Path:** `GET /api/societies/:id`
- **Auth:** Public
- **Request Body:** None
- **Response `200 OK`:**
```json
{
  "society_id": 1,
  "society_name": "Omaxe Greenwood Residency",
  "location": "Sector Greenwood, Omega II, Greater Noida",
  "pincode": "201310",
  "total_flats": 850,
  "rwa_phone": "9876543210",
  "image_url": "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800"
}
```

### 2.3 Onboard New Housing Society
- **Method & Path:** `POST /api/societies`
- **Auth:** Public
- **Request Body:**
```json
{
  "society_name": "Godrej Woods Community",
  "location": "Sector 43, Noida",
  "pincode": "201301",
  "total_flats": 450,
  "rwa_phone": "9876543210"
}
```
- **Response `201 Created`:**
```json
{
  "message": "Society onboarding request created successfully",
  "society_id": 5,
  "society": {
    "society_id": 5,
    "society_name": "Godrej Woods Community",
    "location": "Sector 43, Noida",
    "status": "APPROVED"
  }
}
```

### 2.4 List Active Vendors in a Housing Society
- **Method & Path:** `GET /api/societies/:societyId/vendors`
- **Auth:** Public
- **Query Params:** `?search=grocery` (Optional)
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "vendor_id": 1,
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "vendor_name": "Rajesh Sharma",
    "store_name": "FreshMart Grocery & Organic",
    "email": "vendor@digilocal.com",
    "phone_number": "9876543210",
    "gst_number": "07AAACR12341Z5",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
    "description": "Quality goods & daily essentials delivered within society via WhatsApp.",
    "status": "ACTIVE"
  }
]
```

### 2.5 Storefront Vendor Details & Menu Catalog
- **Method & Path:** `GET /api/vendors/:vendorId`
- **Auth:** Public
- **Request Body:** None
- **Response `200 OK`:**
```json
{
  "vendor": {
    "vendor_id": 1,
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "location": "Sector Greenwood, Greater Noida",
    "vendor_name": "Rajesh Sharma",
    "store_name": "FreshMart Grocery & Organic",
    "email": "vendor@digilocal.com",
    "phone_number": "9876543210",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "status": "ACTIVE"
  },
  "items": [
    {
      "item_id": 101,
      "vendor_id": 1,
      "item_name": "Fresh Organic Milk (1L)",
      "description": "Pure farm fresh whole cow milk pouch.",
      "price": 68.00,
      "stock": 50,
      "category": "Dairy & Milk",
      "unit": "1 Litre",
      "is_available": true,
      "in_stock": true,
      "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"
    }
  ]
}
```

---

## 3. Resident User Authentication APIs

### 3.1 Send OTP (Email or Phone)
- **Method & Path:** `POST /api/users/send-otp`
- **Auth:** Public
- **Request Body:** `{ "identifier": "9876543210" }` or `{ "phone": "9876543210" }` or `{ "email": "rahul.sharma@gmail.com" }`
- **Response `200 OK`:** `{ "message": "OTP sent successfully", "target": "9876543210", "simulationOtp": "102272" }`

### 3.2 Verify OTP (Email, Phone, or Firebase ID Token)
- **Method & Path:** `POST /api/users/verify-otp`
- **Auth:** Public
- **Request Body:** `{ "identifier": "9876543210", "otp": "102272" }` OR `{ "firebaseToken": "eyJhbGciOiJSUzI1Ni..." }`
- **Response `200 OK`:** `{ "message": "OTP verified successfully", "valid": true }`

### 3.3 Resident Registration
- **Method & Path:** `POST /api/users/register`
- **Auth:** Public
- **Request Body:**
```json
{
  "name": "Rahul Sharma",
  "email": "rahul.sharma@gmail.com",
  "phone": "9876543210",
  "password": "UserPassword123",
  "society_id": 1,
  "flat": "Tower A-402"
}
```
- **Response `201 Created`:**
```json
{
  "message": "User registered successfully",
  "user": {
    "user_id": "usr_101",
    "name": "Rahul Sharma",
    "email": "rahul.sharma@gmail.com",
    "phone": "9876543210",
    "society_id": 1,
    "flat": "Tower A-402"
  },
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

### 3.2 Resident Login
- **Method & Path:** `POST /api/users/login`
- **Auth:** Public
- **Request Body:**
```json
{
  "email": "rahul.sharma@gmail.com",
  "password": "UserPassword123"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Login successful",
  "user": {
    "user_id": "usr_101",
    "name": "Rahul Sharma",
    "email": "rahul.sharma@gmail.com",
    "phone": "9876543210",
    "society_id": "1",
    "society_name": "Omaxe Greenwood Residency",
    "flat": "Tower A-402",
    "joined_date": "August 2026",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
  },
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

### 3.3 Resident User Orders History
- **Method & Path:** `GET /api/users/:userId/orders` (or `GET /api/orders/user/:userId`)
- **Auth:** Public / Resident Token
- **Description:** Returns past orders for a resident user. Supports user ID (`"usr_101"`) or user phone number (`"9784319840"`).
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "order_id": "ORD-9843",
    "user_id": "usr_101",
    "vendor_id": 1,
    "store_name": "FreshMart Grocery & Organic",
    "total_amount": 180.00,
    "status": "CONFIRMED",
    "created_at": "2026-08-05T00:57:24.552Z",
    "society_name": "Omaxe Greenwood Residency",
    "delivery_address": "Tower A-402",
    "items": [
      { "item_name": "Fresh Butter 500g", "quantity": 1, "price": 180.00 }
    ]
  }
]
```

---

## 4. Vendor Authentication & OTP Account APIs

### 4.1 Vendor Registration (Mobile App Flexible)
- **Method & Path:** `POST /api/vendors/register`
- **Auth:** Public
- **Request Body (Supports all mobile app field aliases):**
```json
{
  "owner_name": "Lovely Sethiya",
  "shop_name": "ResinReverie",
  "mobile": "9509512187",
  "email": "lovelysethia@gmail.com",
  "password": "#23Lovely",
  "shop_number": "Black A 12",
  "business_category": "Resin Art & Handicrafts",
  "shop_address": "Anupam Apartment",
  "society": "Anupam apartment",
  "pincode": "302033",
  "city": "Jaipur"
}
```
- **Response `201 Created`:**
```json
{
  "token": "eyJhbGciOiJIUzI1Ni...",
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni...",
  "vendor_id": 21,
  "vendor": {
    "vendor_id": 21,
    "society_id": 22,
    "store_name": "ResinReverie",
    "vendor_name": "Lovely Sethiya",
    "email": "lovelysethia@gmail.com",
    "phone_number": "9509512187",
    "shop_no": "Black A 12",
    "category": "Resin Art & Handicrafts",
    "address": "Anupam Apartment",
    "city": "Jaipur",
    "pincode": "302033",
    "status": "ACTIVE"
  }
}
```

### 4.2 Vendor Login
- **Method & Path:** `POST /api/vendors/login`
- **Auth:** Public (Rate-limited against brute-force)
- **Request Body:**
```json
{
  "email": "lovelysethia@gmail.com",
  "password": "#23Lovely"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Login successful",
  "vendor": {
    "vendor_id": 21,
    "society_id": 22,
    "vendor_name": "Lovely Sethiya",
    "store_name": "ResinReverie",
    "email": "lovelysethia@gmail.com",
    "status": "ACTIVE"
  },
  "accessToken": "eyJhbGciOiJIUzI1Ni...",
  "refreshToken": "eyJhbGciOiJIUzI1Ni..."
}
```

### 4.3 Refresh JWT Access Token
- **Method & Path:** `POST /api/vendors/refresh`
- **Auth:** Public
- **Request Body:** `{ "refreshToken": "<stored_refresh_token>" }`
- **Response `200 OK`:** `{ "message": "Access token refreshed successfully", "accessToken": "eyJhbGciOiJIUzI1Ni..." }`

### 4.4 Vendor Logout
- **Method & Path:** `POST /api/vendors/logout`
- **Auth:** Bearer Token (`Authorization: Bearer <accessToken>`)
- **Request Body:** `{ "refreshToken": "<stored_refresh_token>" }`
- **Response `200 OK`:** `{ "message": "Logout successful, tokens revoked" }`

### 4.5 Request Password Reset OTP
- **Method & Path:** `POST /api/vendors/forgot-password`
- **Auth:** Public
- **Request Body:** `{ "email": "lovelysethia@gmail.com" }`
- **Response `200 OK`:**
```json
{
  "message": "OTP sent successfully to registered email address",
  "simulationOtp": "849201"
}
```

### 4.6 Verify OTP
- **Method & Path:** `POST /api/vendors/verify-otp`
- **Auth:** Public
- **Request Body:** `{ "email": "lovelysethia@gmail.com", "otp": "849201" }`
- **Response `200 OK`:** `{ "message": "OTP verified successfully" }`

### 4.7 Reset Password
- **Method & Path:** `POST /api/vendors/reset-password`
- **Auth:** Public
- **Request Body:** `{ "email": "lovelysethia@gmail.com", "otp": "849201", "newPassword": "NewStrongPassword123" }`
- **Response `200 OK`:** `{ "message": "Password reset successfully. You can now log in with your new password." }`

---

## 5. Vendor Dashboard & Catalog Management APIs

### 5.1 Fetch Full Vendor Panel Dashboard
- **Method & Path:** `GET /api/vendorPanel/:vendorId`
- **Auth:** Bearer Token (`Authorization: Bearer <accessToken>`)
- **Description:** Returns store profile, full catalog array, and incoming customer orders. Supports numeric or string IDs.
- **Request Body:** None
- **Response `200 OK`:**
```json
{
  "vendor": {
    "vendor_id": 1,
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "vendor_name": "Rajesh Sharma",
    "store_name": "FreshMart Grocery & Organic",
    "email": "vendor@digilocal.com",
    "phone_number": "9876543210",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "status": "ACTIVE"
  },
  "items": [
    {
      "item_id": 101,
      "vendor_id": 1,
      "item_name": "Fresh Organic Milk (1L)",
      "description": "Pure farm fresh whole cow milk pouch.",
      "price": 68.00,
      "stock": 50,
      "category": "Dairy & Milk",
      "unit": "1 Litre",
      "is_available": true,
      "in_stock": true,
      "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"
    }
  ],
  "orders": [
    {
      "order_id": "ORD-9843",
      "user_id": "usr_101",
      "customer_name": "Rahul Sharma",
      "phone": "9876543210",
      "delivery_address": "Tower A-402",
      "total_amount": 180.00,
      "status": "PENDING",
      "items": [
        { "item_name": "Fresh Butter 500g", "quantity": 1, "price": 180.00 }
      ]
    }
  ]
}
```

### 5.2 Add New Catalog Product Item
- **Method & Path:** `POST /api/vendors/:vendorId/items` (or `POST /api/vendorPanel/:vendorId/items`)
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "item_name": "Fresh Paneer 200g",
  "description": "Soft fresh dairy cottage cheese block",
  "price": 90.00,
  "category": "Dairy & Milk",
  "stock": 30,
  "unit": "200g",
  "is_available": true,
  "image_url": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400"
}
```
- **Response `201 Created`:**
```json
{
  "message": "Item added successfully",
  "item_id": 106,
  "item": {
    "item_id": 106,
    "item_name": "Fresh Paneer 200g",
    "price": 90.00,
    "in_stock": true
  }
}
```

### 5.3 Update Catalog Product or Toggle In-Stock Status
- **Method & Path:** `PUT /api/vendorPanel/:vendorId/items/:itemId`
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "price": 95.00,
  "stock": 20,
  "is_available": false
}
```
- **Response `200 OK`:** `{ "message": "Item updated successfully" }`

### 5.4 Delete Catalog Product Item
- **Method & Path:** `DELETE /api/vendorPanel/:vendorId/items/:itemId`
- **Auth:** Bearer Token
- **Request Body:** None
- **Response `200 OK`:** `{ "message": "Item deleted successfully" }`

### 5.5 Update Store Profile Settings
- **Method & Path:** `PUT /api/vendorPanel/:vendorId/settings`
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "store_name": "FreshMart Supermarket & Organic",
  "phone_number": "9876543210",
  "opening_timing": "07:30 AM",
  "closing_timing": "10:30 PM",
  "description": "Quality goods & daily essentials delivered warm to your flat."
}
```
- **Response `200 OK`:** `{ "message": "Store settings updated successfully", "logo": "..." }`

### 5.6 Renew Annual Vendor Subscription
- **Method & Path:** `POST /api/vendorPanel/:vendorId/renew`
- **Auth:** Bearer Token
- **Request Body:**
```json
{
  "payment_method": "Razorpay (UPI)",
  "transaction_id": "RAZORPAY_RENEW_881923"
}
```
- **Response `200 OK`:**
```json
{
  "message": "Subscription renewed successfully for 1 year!",
  "start_date": "2026-08-05",
  "end_date": "2027-08-05"
}
```

---

## 6. Customer & Vendor Order Pipeline APIs

### 6.1 Place Customer Order
- **Method & Path:** `POST /api/orders`
- **Auth:** Public / Resident
- **Description:** Places an order. Server recalculates prices authoritatively from PostgreSQL to prevent client pricing tampering.
- **Request Body:**
```json
{
  "user_id": "usr_101",
  "vendor_id": 1,
  "society_id": 1,
  "total_amount": 180.00,
  "delivery_address": "Tower A-402, Omaxe Greenwood Residency",
  "items": [
    {
      "item_id": 102,
      "item_name": "Fresh Butter 500g",
      "quantity": 1,
      "price": 180.00
    }
  ]
}
```
- **Response `201 Created`:**
```json
{
  "order_id": "ORD-3000",
  "status": "PENDING",
  "created_at": "2026-08-05T08:00:00Z",
  "message": "Order placed successfully"
}
```

### 6.2 Fetch Resident User Orders
- **Method & Path:** `GET /api/orders/user/:userId`
- **Auth:** Resident Token
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "order_id": "ORD-9843",
    "user_id": "usr_101",
    "vendor_id": 1,
    "store_name": "FreshMart Grocery & Organic",
    "total_amount": 180.00,
    "status": "CONFIRMED",
    "created_at": "2026-08-05T00:57:24.552Z",
    "society_name": "Omaxe Greenwood Residency",
    "delivery_address": "Tower A-402",
    "items": [
      { "item_name": "Fresh Butter 500g", "quantity": 1, "price": 180.00 }
    ]
  }
]
```

### 6.3 Fetch Vendor Incoming Orders
- **Method & Path:** `GET /api/orders/vendor/:vendorId`
- **Auth:** Vendor Token
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "order_id": "ORD-9843",
    "user_id": "usr_101",
    "customer_name": "Rahul Sharma",
    "phone": "9876543210",
    "delivery_address": "Tower A-402",
    "total_amount": 180.00,
    "status": "PENDING",
    "created_at": "2026-08-05T00:57:24.552Z",
    "items": [
      { "item_name": "Fresh Butter 500g", "quantity": 1, "price": 180.00 }
    ]
  }
]
```

### 6.4 Update Order Status
- **Method & Path:** `PUT /api/orders/:id/status`
- **Auth:** Vendor Token
- **Request Body:** `{ "status": "CONFIRMED" }`
- **Allowed Status Options:** `"CONFIRMED"`, `"ACCEPTED"`, `"OUT_FOR_DELIVERY"`, `"DELIVERED"`, `"CANCELLED"`.
- **Response `200 OK`:**
```json
{
  "message": "Order status updated successfully",
  "order_id": "ORD-9843",
  "status": "CONFIRMED"
}
```

---

## 7. Admin Portal Management APIs

### 7.1 Admin Portal Login
- **Method & Path:** `POST /api/admin/login`
- **Auth:** Public (Secret protected)
- **Request Body:** `{ "secret": "admin123", "email": "admin@digilocal.com" }`
- **Response `200 OK`:**
```json
{
  "message": "Admin login successful",
  "admin": {
    "id": 1,
    "email": "admin@digilocal.com",
    "role": "admin"
  },
  "accessToken": "eyJhbGciOiJIUzI1Ni..."
}
```

### 7.2 Admin List All Vendors
- **Method & Path:** `GET /api/admin/vendors`
- **Auth:** Admin Token (`Authorization: Bearer <adminToken>`)
- **Query Params:** `?status=PENDING` (Optional)
- **Request Body:** None
- **Response `200 OK`:**
```json
[
  {
    "vendor_id": 1,
    "store_name": "FreshMart Grocery & Organic",
    "vendor_name": "Rajesh Sharma",
    "email": "vendor@digilocal.com",
    "phone_number": "9876543210",
    "status": "ACTIVE",
    "society_name": "Omaxe Greenwood Residency"
  }
]
```

### 7.3 Admin Update Vendor Approval Status
- **Method & Path:** `PUT /api/admin/vendors/:id/status`
- **Auth:** Admin Token (`Authorization: Bearer <adminToken>`)
- **Request Body:** `{ "status": "ACTIVE" }` *(Allowed: `"ACTIVE"`, `"PENDING"`, `"REJECTED"`)*
- **Response `200 OK`:**
```json
{
  "message": "Vendor status updated successfully",
  "vendor_id": 1,
  "status": "ACTIVE"
}
```

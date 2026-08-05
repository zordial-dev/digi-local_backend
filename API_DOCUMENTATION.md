# DigiLocal Backend — Exhaustive REST API Reference & Payload Specifications
**Version:** 2.0.0  
**Base URL:** `http://localhost:5000/api` (Production: `https://digi-local-backend.onrender.com/api`)  
**Authentication:** Bearer `<JWT_TOKEN>` in HTTP Request Header `Authorization: Bearer <TOKEN>`

---

## 📋 Complete Table of Contents
- [1. User Panel (Resident App) APIs](#1-user-panel-resident-app-apis)
  - [1.1 Send User Mobile/Email OTP (`POST /api/users/send-otp`)](#11-send-user-mobileemail-otp-post-apiuserssend-otp)
  - [1.2 Verify User Mobile/Email OTP (`POST /api/users/verify-otp`)](#12-verify-user-mobileemail-otp-post-apiusersverify-otp)
  - [1.3 Resident User Registration (`POST /api/users/register`)](#13-resident-user-registration-post-apiusersregister)
  - [1.4 Resident User Login (`POST /api/users/login`)](#14-resident-user-login-post-apiuserslogin)
  - [1.5 Get Resident Profile (`GET /api/users/profile`)](#15-get-resident-profile-get-apiusersprofile)
  - [1.6 Create Customer Order (`POST /api/orders`)](#16-create-customer-order-post-apiorders)
  - [1.7 List User Orders (`GET /api/users/:userId/orders`)](#17-list-user-orders-get-apiusersuseridorders)
  - [1.8 Get Order Details (`GET /api/orders/:orderId`)](#18-get-order-details-get-apiordersorderid)
- [2. Vendor Panel (Merchant App) APIs](#2-vendor-panel-merchant-app-apis)
  - [2.1 Send Vendor OTP (`POST /api/vendors/send-otp`)](#21-send-vendor-otp-post-apivendorssend-otp)
  - [2.2 Verify Vendor OTP (`POST /api/vendors/verify-otp`)](#22-verify-vendor-otp-post-apivendorsverify-otp)
  - [2.3 Merchant Vendor Registration (`POST /api/vendors/register`)](#23-merchant-vendor-registration-post-apivendorsregister)
  - [2.4 Merchant Vendor Login (`POST /api/vendors/login`)](#24-merchant-vendor-login-post-apivendorslogin)
  - [2.5 Vendor User-Login Alias (`POST /api/vendors/user-login`)](#25-vendor-user-login-alias-post-apivendorsuser-login)
  - [2.6 Refresh JWT Access Token (`POST /api/vendors/refresh`)](#26-refresh-jwt-access-token-post-apivendorsrefresh)
  - [2.7 Merchant Logout (`POST /api/vendors/logout`)](#27-merchant-logout-post-apivendorslogout)
  - [2.8 Forgot Password Request (`POST /api/vendors/forgot-password`)](#28-forgot-password-request-post-apivendorsforgot-password)
  - [2.9 Reset Password (`POST /api/vendors/reset-password`)](#29-reset-password-post-apivendorsreset-password)
  - [2.10 Get Vendor Dashboard (`GET /api/vendorPanel/:vendorId`)](#210-get-vendor-dashboard-get-apivendorpanelvendorid)
  - [2.11 Upload Product Image File (`POST /api/vendorPanel/upload-image`)](#211-upload-product-image-file-post-apivendorpanelupload-image)
  - [2.12 Add Product Item (`POST /api/vendorPanel/:vendorId/items`)](#212-add-product-item-post-apivendorpanelvendoriditems)
  - [2.13 Update Product Item (`PUT /api/vendorPanel/:vendorId/items/:itemId`)](#213-update-product-item-put-apivendorpanelvendoriditemsitemid)
  - [2.14 Delete Product Item (`DELETE /api/vendorPanel/:vendorId/items/:itemId`)](#214-delete-product-item-delete-apivendorpanelvendoriditemsitemid)
  - [2.15 Toggle Stock Availability (`PATCH /api/vendorPanel/items/:itemId/availability`)](#215-toggle-stock-availability-patch-apivendorpanelitemsitemidavailability)
  - [2.16 Update Store Settings (`PUT /api/vendorPanel/:vendorId/settings`)](#216-update-store-settings-put-apivendorpanelvendoridsettings)
  - [2.17 Renew Merchant Subscription (`POST /api/vendorPanel/:vendorId/renew`)](#217-renew-merchant-subscription-post-apivendorpanelvendoridrenew)
  - [2.18 Fetch Store Orders (`GET /api/orders/vendor/:vendorId`)](#218-fetch-store-orders-get-apiordersvendorvendorid)
  - [2.19 Update Order Status Pipeline (`PUT /api/orders/:id/status`)](#219-update-order-status-pipeline-put-apiordersidstatus)
- [3. Storefront & Housing Societies APIs](#3-storefront--housing-societies-apis)
  - [3.1 List Housing Societies (`GET /api/societies`)](#31-list-housing-societies-get-apisocieties)
  - [3.2 Get Society Details by ID (`GET /api/societies/:id`)](#32-get-society-details-by-id-get-apisocietiesid)
  - [3.3 Onboard New Society (`POST /api/societies`)](#33-onboard-new-society-post-apisocieties)
  - [3.4 Approve Housing Society (`POST /api/societies/:societyId/approve`)](#34-approve-housing-society-post-apisocietiessocietyidapprove)
  - [3.5 List Society Onboarded Merchants (`GET /api/societies/:societyId/vendors`)](#35-list-society-onboarded-merchants-get-apisocietiessocietyidvendors)
  - [3.6 Get Vendor Storefront Profile & Catalog (`GET /api/vendors/:id`)](#36-get-vendor-storefront-profile--catalog-get-apivendorsid)
- [4. Super Admin Panel APIs (v2.0.0)](#4-super-admin-panel-apis-v200)

---

## 1. User Panel (Resident App) APIs

### 1.1 Send User Mobile/Email OTP (`POST /api/users/send-otp`)
Generates a 6-digit numeric OTP code sent to user phone or email.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/send-otp`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "phone": "9571240742"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "OTP sent successfully to phone number",
    "phone": "9571240742"
  }
  ```

---

### 1.2 Verify User Mobile/Email OTP (`POST /api/users/verify-otp`)
Verifies the 6-digit OTP code.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/verify-otp`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "mobile": "9571240742",
    "otp": "123456"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "OTP verified successfully",
    "mobile": "9571240742"
  }
  ```

---

### 1.3 Resident User Registration (`POST /api/users/register`)
Registers a new resident user using mobile number as primary identifier.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/register`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Rohan Mehta",
    "mobile": "9571240742",
    "password": "UserPassword123!",
    "society_id": 1,
    "flat": "Tower A-402"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": "usr-1785934500",
      "name": "Rohan Mehta",
      "phone": "9571240742",
      "society_id": "1",
      "society_name": "Omaxe Greenwood Residency",
      "flat": "Tower A-402"
    }
  }
  ```

---

### 1.4 Resident User Login (`POST /api/users/login`)
Authenticates a resident user via mobile number & password.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/login`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "mobile": "9571240742",
    "password": "UserPassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "User login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": "usr-1785934500",
      "name": "Rohan Mehta",
      "phone": "9571240742",
      "society_id": "1",
      "society_name": "Omaxe Greenwood Residency",
      "flat": "Tower A-402"
    }
  }
  ```

---

### 1.5 Get Resident Profile (`GET /api/users/profile`)
Fetches profile details for the logged-in resident user.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/users/profile`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "user_id": "usr-1785934500",
    "name": "Rohan Mehta",
    "phone": "9571240742",
    "society_id": "1",
    "society_name": "Omaxe Greenwood Residency",
    "flat": "Tower A-402"
  }
  ```

---

### 1.6 Create Customer Order (`POST /api/orders`)
Places a new purchase order with a vendor.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/orders`
- **Auth Required:** Optional / Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "vendor_id": 13,
    "delivery_address": "Tower A, Flat 402, Greenwood Residency",
    "items": [
      { "item_id": 15, "quantity": 1, "price": 500.00 },
      { "item_id": 18, "quantity": 2, "price": 75.00 }
    ]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Order created successfully",
    "order_id": "ORD-1785936000",
    "total_amount": 650.00,
    "status": "PENDING"
  }
  ```

---

### 1.7 List User Orders (`GET /api/users/:userId/orders`)
Lists past and active orders for a user.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/users/:userId/orders` (or `/api/orders/user/:userId`)
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  [
    {
      "order_id": "ORD-1785936000",
      "vendor_id": 13,
      "store_name": "FreshMart Grocery & Organic",
      "total_amount": 650.00,
      "status": "PENDING",
      "created_at": "2026-08-05T12:00:00.000Z"
    }
  ]
  ```

---

### 1.8 Get Order Details (`GET /api/orders/:orderId`)
Fetches single order breakdown with item details.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/orders/:orderId`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "order_id": "ORD-1785936000",
    "vendor_id": 13,
    "store_name": "FreshMart Grocery & Organic",
    "total_amount": 650.00,
    "delivery_address": "Tower A, Flat 402, Greenwood Residency",
    "status": "PENDING",
    "created_at": "2026-08-05T12:00:00.000Z",
    "items": [
      { "item_id": 15, "item_name": "Cake", "quantity": 1, "price": 500.00 },
      { "item_id": 18, "item_name": "Bread", "quantity": 2, "price": 75.00 }
    ]
  }
  ```

---

## 2. Vendor Panel (Merchant App) APIs

### 2.1 Send Vendor OTP (`POST /api/vendors/send-otp`)
Generates a 6-digit OTP code sent via SMS/Email for merchant verification.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/send-otp`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "phone_number": "9876543210"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "OTP sent successfully to phone number",
    "phone_number": "9876543210"
  }
  ```

---

### 2.2 Verify Vendor OTP (`POST /api/vendors/verify-otp`)
Verifies vendor registration OTP code.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/verify-otp`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "phone_number": "9876543210",
    "otp": "123456"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Vendor OTP verified successfully"
  }
  ```

---

### 2.3 Merchant Vendor Registration (`POST /api/vendors/register`)
Registers a new merchant vendor account & creates store profile.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/register`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "vendor_name": "Rajesh Sharma",
    "store_name": "FreshMart Grocery & Organic",
    "phone_number": "9876543210",
    "email": "freshmart@gmail.com",
    "password": "VendorPassword123!",
    "gst_number": "07AAACR12341Z5",
    "society_id": 1,
    "category": "Grocery"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Vendor registered successfully",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "vendor": {
      "vendor_id": 13,
      "public_id": "5BFHDR",
      "store_name": "FreshMart Grocery & Organic",
      "vendor_name": "Rajesh Sharma",
      "email": "freshmart@gmail.com",
      "phone_number": "9876543210",
      "society_id": 1,
      "status": "ACTIVE"
    }
  }
  ```

---

### 2.4 Merchant Vendor Login (`POST /api/vendors/login`)
Authenticates merchant vendor credentials via email/phone and password.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/login`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "freshmart@gmail.com",
    "password": "VendorPassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Vendor login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "vendor": {
      "vendor_id": 13,
      "public_id": "5BFHDR",
      "store_name": "FreshMart Grocery & Organic",
      "vendor_name": "Rajesh Sharma",
      "status": "ACTIVE"
    }
  }
  ```

---

### 2.5 Vendor User-Login Alias (`POST /api/vendors/user-login`)
Allows merchant vendor account to log in under user panel context.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/user-login` (or `/api/vendors/login-as-user`)
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "freshmart@gmail.com",
    "password": "VendorPassword123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "User login successful",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "user_id": "13",
      "name": "Rajesh Sharma",
      "phone": "9876543210"
    }
  }
  ```

---

### 2.6 Refresh JWT Access Token (`POST /api/vendors/refresh`)
Issues a fresh 24-hour access token using a valid refresh token.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/refresh`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "24h"
  }
  ```

---

### 2.7 Merchant Logout (`POST /api/vendors/logout`)
Revokes access and refresh tokens.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/logout`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "message": "Logout successful, tokens revoked"
  }
  ```

---

### 2.8 Forgot Password Request (`POST /api/vendors/forgot-password`)
Triggers password reset OTP code sent to merchant email.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/forgot-password`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "freshmart@gmail.com"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Password reset OTP sent to email",
    "email": "freshmart@gmail.com"
  }
  ```

---

### 2.9 Reset Password (`POST /api/vendors/reset-password`)
Resets vendor password using verified OTP code.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/reset-password`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "freshmart@gmail.com",
    "otp": "123456",
    "new_password": "NewVendorPassword456!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Password reset successfully. You can now login with your new password."
  }
  ```

---

### 2.10 Get Vendor Dashboard (`GET /api/vendorPanel/:vendorId`)
Fetches merchant store profile, catalog items, and order requests.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/vendorPanel/:vendorId`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "vendor_id": 13,
    "public_id": "5BFHDR",
    "store_name": "FreshMart Grocery & Organic",
    "vendor_name": "Rajesh Sharma",
    "phone_number": "9876543210",
    "email": "freshmart@gmail.com",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
    "items": [
      {
        "item_id": 15,
        "item_name": "Cake",
        "price": 500.00,
        "category": "Grocery",
        "in_stock": true
      }
    ]
  }
  ```

---

### 2.11 Upload Product Image File (`POST /api/vendorPanel/upload-image`)
Uploads a binary image file (`jpg`, `png`, `webp`) via multipart form data.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendorPanel/upload-image`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: multipart/form-data`
- **Form Data Field:** `image` (File binary)
- **Response (200 OK):**
  ```json
  {
    "message": "Image uploaded successfully",
    "image_url": "http://localhost:5000/uploads/item_1785934000.png"
  }
  ```

---

### 2.12 Add Product Item (`POST /api/vendorPanel/:vendorId/items`)
Adds a product item to vendor catalog. Supports multi-alias Google Image URLs.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendorPanel/:vendorId/items`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "item_name": "Organic Honey 500g",
    "price": 250.00,
    "category": "Grocery",
    "description": "Pure unheated wildflower honey",
    "image_url": "https://lh3.googleusercontent.com/d/1ABC123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Item added successfully",
    "item_id": 22,
    "image_url": "https://lh3.googleusercontent.com/d/1ABC123"
  }
  ```

---

### 2.13 Update Product Item (`PUT /api/vendorPanel/:vendorId/items/:itemId`)
Updates an existing product item in catalog.
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/vendorPanel/:vendorId/items/:itemId`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "item_name": "Organic Wild Honey 500g",
    "price": 270.00,
    "category": "Grocery",
    "description": "Pure raw wildflower honey jar",
    "image_url": "https://lh3.googleusercontent.com/d/1ABC123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Item updated successfully",
    "image_url": "https://lh3.googleusercontent.com/d/1ABC123"
  }
  ```

---

### 2.14 Delete Product Item (`DELETE /api/vendorPanel/:vendorId/items/:itemId`)
Deletes a product item from merchant catalog.
- **HTTP Method:** `DELETE`
- **Endpoint:** `/api/vendorPanel/:vendorId/items/:itemId`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "message": "Item deleted successfully"
  }
  ```

---

### 2.15 Toggle Stock Availability (`PATCH /api/vendorPanel/items/:itemId/availability`)
Toggles item in-stock status (`in_stock: true/false`).
- **HTTP Method:** `PATCH`
- **Endpoint:** `/api/vendorPanel/items/:itemId/availability`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "in_stock": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Availability status updated successfully"
  }
  ```

---

### 2.16 Update Store Settings (`PUT /api/vendorPanel/:vendorId/settings`)
Updates store details, operating hours, and logo URL.
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/vendorPanel/:vendorId/settings`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "store_name": "FreshMart Grocery & Organic",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "description": "Neighborhood fresh fruits & organic dairy essentials."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Store settings updated successfully"
  }
  ```

---

### 2.17 Renew Merchant Subscription (`POST /api/vendorPanel/:vendorId/renew`)
Renews vendor 1-year merchant subscription.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendorPanel/:vendorId/renew`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "message": "Vendor subscription renewed successfully for 1 year",
    "vendor_id": 13,
    "renewal_date": "2027-12-31T00:00:00.000Z"
  }
  ```

---

### 2.18 Fetch Store Orders (`GET /api/orders/vendor/:vendorId`)
Lists orders placed by residents at the merchant's store.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/orders/vendor/:vendorId`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  [
    {
      "order_id": "ORD-1785936000",
      "user_id": "usr-1785934500",
      "user_name": "Rohan Mehta",
      "phone": "9571240742",
      "total_amount": 650.00,
      "delivery_address": "Tower A, Flat 402, Greenwood Residency",
      "status": "PENDING",
      "created_at": "2026-08-05T12:00:00.000Z"
    }
  ]
  ```

---

### 2.19 Update Order Status Pipeline (`PUT /api/orders/:id/status`)
Updates order processing status (`PENDING` -> `ACCEPTED` -> `COMPLETED` / `CANCELLED`).
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/orders/:id/status`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "status": "ACCEPTED"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Order status updated successfully to ACCEPTED",
    "order_id": "ORD-1785936000",
    "status": "ACCEPTED"
  }
  ```

---

## 3. Storefront & Housing Societies APIs

### 3.1 List Housing Societies (`GET /api/societies`)
Lists all onboarded residential societies.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies`
- **Auth Required:** No
- **Query Params:** `search` (optional string, e.g. `Greenwood`)
- **Response (200 OK):**
  ```json
  [
    {
      "society_id": 1,
      "society_name": "Omaxe Greenwood Residency",
      "location": "Jaipur, Rajasthan",
      "secretary_name": "Rajesh Varma",
      "secretary_mobile": "9876543210",
      "public_id": "SOC-1",
      "status": "active"
    }
  ]
  ```

---

### 3.2 Get Society Details by ID (`GET /api/societies/:id`)
Fetches single society enclave details.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies/:id`
- **Auth Required:** No
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "location": "Jaipur, Rajasthan",
    "secretary_name": "Rajesh Varma",
    "secretary_mobile": "9876543210",
    "public_id": "SOC-1",
    "status": "active"
  }
  ```

---

### 3.3 Onboard New Society (`POST /api/societies`)
Registers a new residential enclave with 4 mandatory fields.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/societies`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "society_name": "Royal Garden Enclave",
    "location": "Viman Nagar, Sector 4, Pune, Maharashtra",
    "secretary_name": "Vikram Mehta",
    "secretary_mobile": "9876543210"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Society onboarded successfully",
    "society_id": 105,
    "society": {
      "society_id": 105,
      "society_name": "Royal Garden Enclave",
      "location": "Viman Nagar, Sector 4, Pune, Maharashtra",
      "secretary_name": "Vikram Mehta",
      "secretary_mobile": "9876543210"
    }
  }
  ```

---

### 3.4 Approve Housing Society (`POST /api/societies/:societyId/approve`)
Approves a residential society enclave from Vendor Panel or Admin Panel.
- **HTTP Method:** `POST` or `PUT`
- **Endpoint:** `/api/societies/:societyId/approve` (or `/api/societies/:societyId/status`)
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "status": "active"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Society approved successfully",
    "society_id": 105,
    "status": "active"
  }
  ```

---

### 3.5 List Society Onboarded Merchants (`GET /api/societies/:societyId/vendors`)
Lists active merchant vendors servicing a housing society.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies/:societyId/vendors`
- **Auth Required:** No
- **Response (200 OK):**
  ```json
  [
    {
      "vendor_id": 13,
      "store_name": "FreshMart Grocery & Organic",
      "vendor_name": "Rajesh Sharma",
      "email": "freshmart@gmail.com",
      "phone_number": "9876543210",
      "opening_time": "08:00 AM",
      "closing_time": "10:00 PM",
      "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
      "description": "Quality goods & daily essentials delivered within society via WhatsApp.",
      "society_id": 1
    }
  ]
  ```

---

### 3.6 Get Vendor Storefront Profile & Catalog (`GET /api/vendors/:id`)
Fetches vendor storefront profile & catalog items by `vendor_id` (numeric), `public_id` (alphanumeric, e.g. `5BFHDR`), or `email` (`freshmart@gmail.com`).
- **HTTP Method:** `GET`
- **Endpoint:** `/api/vendors/:id`
- **Auth Required:** No
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "vendor_id": 13,
    "public_id": "5BFHDR",
    "store_name": "FreshMart Grocery & Organic",
    "vendor_name": "Rajesh Sharma",
    "email": "freshmart@gmail.com",
    "phone_number": "9876543210",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
    "description": "Your neighborhood fresh fruits & organic dairy essentials.",
    "status": "ACTIVE",
    "items": [
      {
        "item_id": 15,
        "item_name": "Cake",
        "price": 500.00,
        "category": "Grocery",
        "description": "Special baked cake",
        "image_url": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
        "in_stock": true
      }
    ]
  }
  ```

---

## 4. Super Admin Panel APIs (v2.0.0)

| Endpoint | Method | Power Guard | Description |
|---|---|---|---|
| `/api/auth/login` | `POST` | Public | Super Admin & Sub-Admin Email Login |
| `/api/auth/me` | `GET` | Bearer Token | Fetch active admin profile & delegated powers |
| `/api/sub-admins` | `GET` / `POST` | `SUB_ADMINS` | List & Create delegated sub-admins |
| `/api/sub-admins/:id/powers` | `PUT` | `SUB_ADMINS` | Update delegated power sections |
| `/api/sub-admins/:id` | `DELETE` | `SUB_ADMINS` | Revoke sub-admin account |
| `/api/vendors/pending` | `GET` | `VENDORS` | List merchant onboarding applications |
| `/api/vendors/:vendorId/approve` | `POST` | `VENDORS` | Approve merchant application |
| `/api/vendors/:vendorId/reject` | `POST` | `VENDORS` | Reject merchant application |
| `/api/subscriptions/stats` | `GET` | `SUBSCRIPTIONS` | Financial analytics & gross revenue |
| `/api/subscriptions/:id/invoice` | `GET` | `SUBSCRIPTIONS` | GST Tax invoice calculation (CGST 9% + SGST 9%) |
| `/api/config/branding` | `PUT` | `SETTINGS` | Update platform title & header logo URL |
| `/api/config/security` | `PUT` | `SETTINGS` | Update administrator password |

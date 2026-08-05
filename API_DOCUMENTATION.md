# DigiLocal Backend — Complete REST API Documentation & Payload Reference
**Version:** 2.0.0  
**Base URL:** `http://localhost:5000/api` (Production: `https://digi-local-backend.onrender.com/api`)  
**Authentication:** Bearer `<JWT_TOKEN>` in HTTP Request Header `Authorization: Bearer <TOKEN>`

---

## 📋 Table of Contents
1. [User Panel (Resident App) APIs (`/api/users` & `/api/orders`)](#1-user-panel-resident-app-apis-apiusers--apiorders)
2. [Vendor Panel (Merchant App) APIs (`/api/vendors` & `/api/vendorPanel`)](#2-vendor-panel-merchant-app-apis-apivendors--apivendorpanel)
3. [Storefront & Housing Societies APIs (`/api/societies` & `/api/vendors`)](#3-storefront--housing-societies-apis-apisocieties--apivendors)
4. [Super Admin Panel APIs (v2.0.0)](#4-super-admin-panel-apis-v200)

---

## 1. User Panel (Resident App) APIs (`/api/users` & `/api/orders`)

### 1.1 Send / Verify User Mobile OTP — `POST /api/users/verify-otp`
Sends an OTP to the user's mobile number or verifies an existing 6-digit OTP code.
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

### 1.2 User Registration — `POST /api/users/register`
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

### 1.3 User Login — `POST /api/users/login`
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

### 1.4 Get User Profile — `GET /api/users/profile`
Fetches active user details and housing society information.
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

### 1.5 Create Customer Order — `POST /api/orders`
Places a new order for catalog items with a vendor.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/orders`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
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

### 1.6 List User Orders — `GET /api/users/orders`
Fetches order history for the logged-in resident user.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/users/orders`
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

## 2. Vendor Panel (Merchant App) APIs (`/api/vendors` & `/api/vendorPanel`)

### 2.1 Send Vendor OTP — `POST /api/vendors/send-otp`
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

### 2.2 Register Vendor — `POST /api/vendors/register`
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

### 2.3 Vendor Login — `POST /api/vendors/login`
Authenticates merchant vendor credentials.
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

### 2.4 Get Vendor Dashboard — `GET /api/vendorPanel/:vendorId`
Fetches merchant store profile, catalog items, and orders.
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

### 2.5 Add Product Item — `POST /api/vendorPanel/:vendorId/items`
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

### 2.6 Toggle Item Stock Availability — `PATCH /api/vendorPanel/items/:itemId/availability`
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

### 2.7 Update Vendor Store Settings — `PUT /api/vendorPanel/:vendorId/settings`
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

## 3. Storefront & Housing Societies APIs (`/api/societies` & `/api/vendors`)

### 3.1 List Housing Societies — `GET /api/societies`
Lists all onboarded residential societies.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies`
- **Auth Required:** No
- **Query Params:** `search` (optional)
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

### 3.2 Onboard New Housing Society — `POST /api/societies`
Registers a new residential enclave requiring 4 mandatory fields.
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

### 3.3 Approve Society — `POST /api/societies/:societyId/approve`
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

### 3.4 Get Vendor Storefront Details & Catalog — `GET /api/vendors/:id`
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

### 4.1 Admin / Sub-Admin Login — `POST /api/auth/login`
Authenticates Super Admin or delegated Sub-Admin credentials.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Auth Required:** No
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "email": "superadmin@digilocal.com",
    "password": "Password123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "success",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-001",
      "name": "DigiLocal Super Admin",
      "email": "superadmin@digilocal.com",
      "role": "SUPER_ADMIN",
      "powers": ["SOCIETIES", "VENDORS", "SUBSCRIPTIONS", "SETTINGS", "SUB_ADMINS"],
      "created_at": "2026-01-15T10:00:00.000Z"
    }
  }
  ```

---

### 4.2 Get Active Admin Profile — `GET /api/auth/me`
Fetches token details & delegated RBAC power sections.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "id": "usr-001",
    "name": "DigiLocal Super Admin",
    "email": "superadmin@digilocal.com",
    "role": "SUPER_ADMIN",
    "powers": ["SOCIETIES", "VENDORS", "SUBSCRIPTIONS", "SETTINGS", "SUB_ADMINS"],
    "created_at": "2026-01-15T10:00:00.000Z"
  }
  ```

---

### 4.3 List All Sub-Admin Accounts — `GET /api/sub-admins`
Lists all delegated sub-admin user accounts.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/sub-admins`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SUB_ADMINS` power)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  [
    {
      "id": "sa-101",
      "name": "Rohan Verma",
      "email": "rohan.admin@digilocal.com",
      "powers": ["SOCIETIES", "VENDORS"],
      "status": "active",
      "created_at": "2026-08-05T12:00:00.000Z"
    }
  ]
  ```

---

### 4.4 Create Sub-Admin Account — `POST /api/sub-admins`
Creates a delegated sub-admin with selected power sections (`SOCIETIES`, `VENDORS`, `SUBSCRIPTIONS`, `SETTINGS`, `SUB_ADMINS`).
- **HTTP Method:** `POST`
- **Endpoint:** `/api/sub-admins`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SUB_ADMINS` power)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "name": "Rohan Verma",
    "email": "rohan.admin@digilocal.com",
    "password": "SecurePassword123!",
    "powers": ["SOCIETIES", "VENDORS"]
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Sub-admin account created successfully.",
    "id": "sa-103",
    "name": "Rohan Verma",
    "email": "rohan.admin@digilocal.com",
    "powers": ["SOCIETIES", "VENDORS"],
    "status": "active",
    "created_at": "2026-08-05T12:00:00.000Z"
  }
  ```

---

### 4.5 Update Sub-Admin Delegated Powers — `PUT /api/sub-admins/:id/powers`
Modifies delegated power sections for a sub-admin.
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/sub-admins/:id/powers`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SUB_ADMINS` power)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "powers": ["SOCIETIES", "VENDORS", "SUBSCRIPTIONS"]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Sub-admin power sections updated successfully.",
    "id": "sa-101",
    "powers": ["SOCIETIES", "VENDORS", "SUBSCRIPTIONS"]
  }
  ```

---

### 4.6 Revoke Sub-Admin Account Access — `DELETE /api/sub-admins/:id`
Deletes/revokes a sub-admin account.
- **HTTP Method:** `DELETE`
- **Endpoint:** `/api/sub-admins/:id`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SUB_ADMINS` power)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "message": "Sub-admin account access revoked successfully.",
    "id": "sa-101"
  }
  ```

---

### 4.7 List Pending Vendor Applications — `GET /api/vendors/pending`
Lists merchant applications awaiting admin approval.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/vendors/pending`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `VENDORS` power)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  [
    {
      "vendor_id": 204,
      "store_name": "Organic Greens Store",
      "owner_name": "Rahul Verma",
      "email": "rahul.greens@gmail.com",
      "phone": "+91 98111 22334",
      "gstin": "07BBBBB120001Z9",
      "society_name": "Anupam Apartment",
      "status": "pending",
      "payments": [
        {
          "payment_id": "pmt-204",
          "transaction_id": "TXN2048714",
          "amount": 2999,
          "payment_method": "UPI / Razorpay",
          "status": "SUCCESS"
        }
      ]
    }
  ]
  ```

---

### 4.8 Approve Merchant Application — `POST /api/vendors/:vendorId/approve`
Approves a merchant onboarding application and activates account.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/:vendorId/approve`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `VENDORS` power)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "message": "Merchant onboarding application approved and activated.",
    "vendor_id": 204,
    "status": "active"
  }
  ```

---

### 4.9 Reject Merchant Application — `POST /api/vendors/:vendorId/reject`
Rejects merchant onboarding request with a custom reason.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/vendors/:vendorId/reject`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `VENDORS` power)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "rejection_reason": "Incomplete GSTIN verification documents."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Merchant application rejected.",
    "vendor_id": 204,
    "status": "rejected"
  }
  ```

---

### 4.10 Get Financial Analytics Stats — `GET /api/subscriptions/stats`
Fetches platform gross revenue, tier breakdowns, and monthly growth trends.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/subscriptions/stats`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SUBSCRIPTIONS` power)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "total_revenue": 1663000,
    "active_subscriptions": 18,
    "tier_breakdown": {
      "free": 2,
      "pro": 12,
      "enterprise": 4
    },
    "monthly_trend": [
      { "month": "Jan", "revenue": 124000 },
      { "month": "Feb", "revenue": 145000 },
      { "month": "Mar", "revenue": 189000 },
      { "month": "Apr", "revenue": 210000 },
      { "month": "May", "revenue": 265000 },
      { "month": "Jun", "revenue": 320000 },
      { "month": "Jul", "revenue": 410000 }
    ]
  }
  ```

---

### 4.11 Renew Merchant Subscription — `POST /api/subscriptions/:subscriptionId/renew`
Extends merchant subscription duration by 1, 6, or 12 months.
- **HTTP Method:** `POST`
- **Endpoint:** `/api/subscriptions/:subscriptionId/renew`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SUBSCRIPTIONS` power)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "extension_months": 12
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Subscription renewed by 12 months.",
    "subscription_id": "sub-101",
    "new_renewal_date": "2027-12-31T00:00:00.000Z"
  }
  ```

---

### 4.12 Get GST Tax Invoice Preview — `GET /api/subscriptions/:subscriptionId/invoice`
Calculates base price, CGST (9%), SGST (9%), and total payable for PDF rendering.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/subscriptions/:subscriptionId/invoice`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>`)
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "invoice_number": "INV-2026-sub-101",
    "issued_at": "2026-01-01T00:00:00.000Z",
    "store_name": "Fresh Organic Mart",
    "society_name": "Mahagun Enclave",
    "tier": "enterprise",
    "base_price": 9999,
    "cgst_amount": 899.91,
    "sgst_amount": 899.91,
    "total_payable": 11798.82,
    "payment_verified": true,
    "payment_gateway": "Razorpay UPI"
  }
  ```

---

### 4.13 Get Platform Branding Config — `GET /api/config`
Fetches current platform title and header logo URL.
- **HTTP Method:** `GET`
- **Endpoint:** `/api/config`
- **Auth Required:** No
- **Request Body:** None
- **Response (200 OK):**
  ```json
  {
    "platform_name": "DigiLocal Super Admin",
    "platform_logo": "https://imgh.in/host/ucila6",
    "updated_at": "2026-08-05T12:00:00.000Z"
  }
  ```

---

### 4.14 Update Branding Configuration — `PUT /api/config/branding`
Updates brand title and header logo URL.
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/config/branding`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SETTINGS` power)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "platform_name": "DigiLocal Super Admin",
    "platform_logo": "https://imgh.in/host/ucila6"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Branding configuration updated successfully.",
    "platform_name": "DigiLocal Super Admin",
    "platform_logo": "https://imgh.in/host/ucila6"
  }
  ```

---

### 4.15 Update Administrator Password — `PUT /api/config/security`
Updates root administrator account password.
- **HTTP Method:** `PUT`
- **Endpoint:** `/api/config/security`
- **Auth Required:** Yes (`Authorization: Bearer <TOKEN>` with `SETTINGS` power)
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "current_password": "Password123!",
    "new_password": "NewSecurePassword456!",
    "confirm_password": "NewSecurePassword456!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Administrator password updated successfully."
  }
  ```

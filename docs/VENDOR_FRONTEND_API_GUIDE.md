# DigiLocal - Vendor Mobile App & Web Portal API Guide

> **Document Version:** 2.0.0 (Strict RBAC & Zero-Trust Architecture)  
> **Audience:** Vendor Mobile App (React Native/Expo) and Vendor Web Portal Developers  
> **Base URL:** `http://localhost:5000` (or production API host)  
> **Security Policy:** All vendor endpoints strictly require a Vendor Bearer Token (`roles: ['vendor']`, `isVendor: true`). Customers and Admins attempting to use vendor endpoints will receive `403 Forbidden`. Cross-vendor IDOR attacks are cryptographically blocked at the gateway.

---

## 1. Authentication & Security Architecture

### 1.1 Authorization Header
Include the vendor access token in every authenticated request:
```http
Authorization: Bearer <VENDOR_ACCESS_TOKEN>
```

### 1.2 Access Control & IDOR Protection Rules
- **Mutual Role Exclusion:** A vendor token can **only** access Vendor endpoints (`/api/vendorPanel/*`, `/api/vendor/*`, `/api/vendors/*`). It is strictly blocked from accessing Customer private endpoints (`/api/users/*`) and Admin endpoints (`/api/admin/*`, `/api/people/*`).
- **Cryptographic IDOR Protection:** For any endpoint with `/:vendorId` (e.g., `/api/vendorPanel/:vendorId/items/:itemId/stock` or `/api/vendor/:vendorId/settings`), the backend validates that `:vendorId` strictly equals the `vendorId` encoded inside your Bearer JWT token. Accessing another vendor's store or mutating another vendor's stock/orders results in:
  ```json
  {
    "success": false,
    "error": "Forbidden: You are not authorized to access or modify this vendor's resources",
    "code": "VENDOR_IDOR_VIOLATION"
  }
  ```
- **Error Codes:**
  - `401 Unauthorized`: Token missing, expired, or invalid.
  - `403 Forbidden`: Token role is not vendor, account is blocked/pending, or IDOR violation.

---

## 2. Vendor Authentication

### 2.1 Vendor Registration
- **Endpoint:** `POST /api/vendor/register`
- **Auth:** Public
- **Request Body (Multipart or JSON):**
  ```json
  {
    "business_name": "Sharma Dairy & Daily Needs",
    "owner_name": "Ramesh Sharma",
    "mobile_number": "9876500001",
    "email": "ramesh@sharmadairy.com",
    "category": "Dairy & Grocery",
    "society_ids": [10, 12],
    "password": "SecurePassword@123"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Vendor registered successfully. Account is pending admin approval.",
    "vendor_id": 14,
    "status": "PENDING"
  }
  ```

### 2.2 Vendor Password Login
- **Endpoint:** `POST /api/vendor/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email_or_phone": "9876500001",
    "password": "SecurePassword@123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "vendor": {
      "id": 14,
      "business_name": "Sharma Dairy & Daily Needs",
      "status": "APPROVED",
      "role": "vendor",
      "isVendor": true,
      "isUser": false
    }
  }
  ```

### 2.3 Send OTP for Login
- **Endpoint:** `POST /api/vendor/send-otp`
- **Auth:** Public
- **Request Body:** `{ "mobile_number": "9876500001" }`

### 2.4 Verify OTP for Login
- **Endpoint:** `POST /api/vendor/verify-otp`
- **Auth:** Public
- **Request Body:** `{ "mobile_number": "9876500001", "otp": "654321" }`
- **Response (200 OK):** Returns vendor object, `token`, and `refreshToken`.

### 2.5 Refresh Vendor Access Token
- **Endpoint:** `POST /api/vendor/refresh-token`
- **Request Body:** `{ "refreshToken": "<REFRESH_TOKEN>" }`

---

## 3. Push Notifications & Device Tokens

### 3.1 Register Push / FCM Token
- **Endpoint:** `POST /api/vendor/push-token` (or `POST /api/vendor/fcm-token`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Request Body:**
  ```json
  {
    "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "device_type": "android"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Push token registered successfully"
  }
  ```

---

## 4. Vendor Profile, Societies Coverage & Operating Settings

### 4.1 Get Vendor Onboarding / Live Status
- **Endpoint:** `GET /api/vendorPanel/status` (or `GET /api/vendorPanel/:vendorId/status`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "vendor_id": 14,
    "status": "APPROVED",
    "is_open": true,
    "subscription_active": true,
    "strike_count": 0
  }
  ```

### 4.2 Update Operating Settings (Open/Closed, Auto-Accept)
- **Endpoint:** `PUT /api/vendor/:vendorId/settings`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "is_open": true,
    "auto_accept_orders": false,
    "delivery_start_time": "06:00",
    "delivery_end_time": "21:00",
    "minimum_order_amount": 100
  }
  ```

### 4.3 Manage Society Delivery Coverage
- **Get Covered Societies:** `GET /api/vendor/:vendorId/coverage`
  - **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Update Covered Societies:** `POST /api/vendor/:vendorId/coverage`
  - **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
  - **Request Body:**
    ```json
    {
      "society_ids": [10, 12, 15]
    }
    ```

---

## 5. Catalog & Inventory Management

### 5.1 List Vendor Products / Items
- **Endpoint:** `GET /api/vendorPanel/items` (or `GET /api/vendorPanel/:vendorId/items`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Query Params:** `?page=1&limit=50&category=Dairy`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "items": [
      {
        "id": 101,
        "name": "Nandini Toned Milk 500ml",
        "category": "Dairy",
        "price": 24.00,
        "stock_quantity": 45,
        "is_available": true,
        "image_url": "/uploads/items/milk_500.png"
      }
    ]
  }
  ```

### 5.2 Add New Product
- **Endpoint:** `POST /api/vendorPanel/items`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Request Body:**
  ```json
  {
    "name": "Amul Butter 100g",
    "category": "Dairy",
    "price": 58.00,
    "stock_quantity": 20,
    "description": "Pasteurized salted table butter"
  }
  ```

### 5.3 Real-Time Stock & Availability Toggle
- **Endpoint:** `PATCH /api/vendorPanel/:vendorId/items/:itemId/stock` (or `PATCH /api/items/:itemId/stock`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "stock_quantity": 30,
    "is_available": true
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stock updated successfully",
    "item": { "id": 101, "stock_quantity": 30, "is_available": true }
  }
  ```

### 5.4 Upload Item Image
- **Endpoint:** `POST /api/vendorPanel/items/upload-image`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Content-Type:** `multipart/form-data`
- **Form Field:** `image: <FILE_BLOB>`

---

## 6. Service Catalog (For Plumbers, Electricians, Carpenters)

### 6.1 List Services Offered
- **Endpoint:** `GET /api/vendors/:vendorId/services`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)

### 6.2 Add or Update Service
- **Endpoint:** `POST /api/vendors/:vendorId/services`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "name": "AC Filter Cleaning & Deep Servicing",
    "charge_type": "FIXED",
    "base_price": 599.00,
    "duration_minutes": 60,
    "description": "Complete indoor unit wet wash and outdoor unit inspection"
  }
  ```

### 6.3 Toggle Service Availability
- **Endpoint:** `PATCH /api/vendors/:vendorId/services/:serviceId/availability`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:** `{ "is_available": false }`

---

## 7. Order Lifecycle & Dispatch Pipeline

### 7.1 List Orders Received
- **Endpoint:** `GET /api/vendorPanel/orders` (or `GET /api/orders/vendor/:vendorId`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Query Params:** `?status=PENDING&page=1&limit=20`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "orders": [
      {
        "id": 8801,
        "customer_name": "Rahul Sharma",
        "customer_phone": "9876543210",
        "society_name": "Green Valley Apartment",
        "delivery_address": "Tower B, Flat 504",
        "items": [
          { "name": "Nandini Toned Milk 500ml", "quantity": 2, "price": 24.00 }
        ],
        "total_amount": 48.00,
        "status": "PENDING",
        "placed_at": "2026-10-22T10:15:00Z"
      }
    ]
  }
  ```

### 7.2 Update Order Status (Pipeline)
- **Endpoint:** `PATCH /api/vendorPanel/orders/:orderId/status` (or `PATCH /api/orders/vendor/:vendorId/orders/:orderId/status`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Allowed Transitions:** `PENDING` -> `ACCEPTED` -> `PREPARING` -> `OUT_FOR_DELIVERY` -> `DELIVERED` (or `REJECTED`)
- **Request Body:**
  ```json
  {
    "status": "ACCEPTED",
    "estimated_delivery_time": "2026-10-22T11:00:00Z",
    "vendor_note": "Order packed and ready"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Order status updated to ACCEPTED",
    "order_id": 8801,
    "status": "ACCEPTED"
  }
  ```

---

## 8. Subscriptions & Cashfree Payment Flow

For a full step-by-step breakdown with Cashfree SDK initialization, see [VENDOR_APP_SUBSCRIPTION_PAYMENT_API.md](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/docs/VENDOR_APP_SUBSCRIPTION_PAYMENT_API.md).

### 8.1 Check Current Subscription Status
- **Endpoint:** `GET /api/vendorPanel/subscription/status` (or `GET /api/vendorPanel/:vendorId/subscription/status`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "has_active_subscription": true,
    "plan_name": "Quarterly Pro",
    "expires_at": "2026-12-31T23:59:59Z",
    "days_remaining": 70
  }
  ```

### 8.2 Create Cashfree Payment Session
- **Endpoint:** `POST /api/subscriptions/create-payment-session` (or `POST /api/vendorPanel/subscription/create-payment-session`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "vendor_id": 14,
    "plan_id": 2,
    "coupon_code": "LAUNCH50"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "payment_session_id": "session_K3mP8xQ1...",
    "order_id": "SUB-ORD-14-1734912000",
    "amount": 1499.00
  }
  ```

### 8.3 Verify Payment After Gateway Return
- **Endpoint:** `POST /api/subscriptions/verify-payment`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "vendor_id": 14,
    "order_id": "SUB-ORD-14-1734912000"
  }
  ```

---

## 9. Customer Enquiries & Reviews

### 9.1 List Service Enquiries Received
- **Endpoint:** `GET /api/vendors/:vendorId/enquiries`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Reply / Update Enquiry Status:** `PATCH /api/vendors/:vendorId/enquiries/:enquiryId`

### 9.2 Reply to a Customer Review
- **Endpoint:** `POST /api/ratings/reply`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Request Body:**
  ```json
  {
    "rating_id": 302,
    "reply_text": "Thank you for shopping with Sharma Dairy! We appreciate your support."
  }
  ```

---

## 10. Vendor Support Desk

### 10.1 List Vendor Support Tickets
- **Endpoint:** `GET /api/vendorPanel/support`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)

### 10.2 Create Support Ticket
- **Endpoint:** `POST /api/vendorPanel/support`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Request Body:**
  ```json
  {
    "subject": "Payment settlement query for week 42",
    "category": "PAYMENTS",
    "message": "Payout for orders between Oct 15-21 not credited yet."
  }
  ```

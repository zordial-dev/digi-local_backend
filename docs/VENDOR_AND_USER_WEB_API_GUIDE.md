# DigiLocal - Vendor & User Web Frontend API Guide

> **Document Version:** 2.0.0 (Strict RBAC & Web-Optimized Architecture)  
> **Target Audience:** Web Frontend Developers building:  
> 1. **Customer Web Storefront & Ordering Portal** (React / Next.js / Vue)  
> 2. **Vendor Desktop Management Portal** (React / Next.js / Vue Dashboard)  
> **Base URL:** `http://localhost:5000` (or your web API domain)  
> **Security Policy:** All authenticated requests must pass a JWT Bearer token. Customers and Vendors have mutually exclusive tokens. Mixing tokens across customer and vendor boundaries results in `403 Forbidden`.

---

## 1. Web Architecture, CORS & Token Management

### 1.1 Web CORS & Credentials
The backend sends permissive yet secure CORS headers. Ensure your frontend HTTP client (Axios, Fetch) enables credentials:
```javascript
// Axios configuration
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Platform-Client': 'web'
  }
});
```

### 1.2 Separation of Web Tokens
- **Customer Web App:** Stores `user_token` (JWT with `roles: ['user']`, `isUser: true`). Cannot invoke `/api/vendorPanel/*`.
- **Vendor Web Portal:** Stores `vendor_token` (JWT with `roles: ['vendor']`, `isVendor: true`). Cannot invoke `/api/users/*`.
- **SSR / Hydration Tip:** In Next.js SSR, parse the token from `cookies` or `Authorization` header and forward it during `getServerSideProps` or React Server Components.

---

# ==========================================
# PART A: CUSTOMER (USER) WEB APPLICATION
# ==========================================

## 2. Customer Authentication Flow

### 2.1 Send OTP for Login / Sign Up
- **Endpoint:** `POST /api/users/login`
- **Request Body:** `{ "mobileNumber": "9876543210" }`
- **Response (200 OK):**
  ```json
  { "success": true, "message": "OTP sent successfully" }
  ```

### 2.2 Verify OTP & Start User Session
- **Endpoint:** `POST /api/users/verify-otp`
- **Request Body:** `{ "mobileNumber": "9876543210", "otp": "123456" }`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 42,
      "name": "Rahul Sharma",
      "mobileNumber": "9876543210",
      "role": "user",
      "isUser": true
    }
  }
  ```

### 2.3 Customer Token Refresh
- **Endpoint:** `POST /api/users/refresh-token`
- **Request Body:** `{ "refreshToken": "<REFRESH_TOKEN>" }`

---

## 3. Society Discovery & Storefront Browsing (Public / SEO Friendly)

### 3.1 List Approved Societies
- **Endpoint:** `GET /api/societies`
- **Query Params:** `?page=1&limit=20&search=Green`
- **Use Case:** Society selector modal or landing page search.

### 3.2 List Vendors in a Society
- **Endpoint:** `GET /api/societies/:societyId/vendors`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "vendor_id": 14,
        "business_name": "Sharma Dairy & Daily Needs",
        "category": "Dairy & Grocery",
        "rating": 4.8,
        "is_open": true
      }
    ]
  }
  ```

### 3.3 Universal Product & Store Search
- **Endpoint:** `GET /api/search`
- **Query Params:** `?q=milk&societyId=10`
- **Response (200 OK):** Returns matching products and vendor stores filtered by the user's selected society.

### 3.4 Vendor Storefront & Product Menu
- **Endpoint:** `GET /api/vendors/:vendorId/storefront`
- **Response (200 OK):** Returns store profile, categories, product list with real-time stock availability, and service packages.

---

## 4. Web Cart & Checkout Pipeline

### 4.1 Validate Cart Stock Before Opening Checkout
- Call before directing the customer to the web payment/checkout step:
- **Endpoint:** `POST /api/orders/validate-stock`
- **Request Body:**
  ```json
  {
    "items": [
      { "item_id": 101, "quantity": 2 },
      { "item_id": 105, "quantity": 1 }
    ]
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "valid": true,
    "items": [ ... ]
  }
  ```

### 4.2 Place Customer Order
- **Endpoint:** `POST /api/orders`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Request Body:**
  ```json
  {
    "vendor_id": 14,
    "items": [
      { "item_id": 101, "quantity": 2, "unit_price": 24.00 }
    ],
    "delivery_address_id": 5,
    "payment_method": "COD",
    "delivery_slot": "07:00 AM - 09:00 AM",
    "special_instructions": "Leave at front door"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Order placed successfully",
    "order": {
      "id": 8801,
      "order_number": "ORD-8801",
      "status": "PENDING",
      "total_amount": 48.00
    }
  }
  ```

### 4.3 Web Order Tracking & Self-Cancellation
- **Get Customer Orders:** `GET /api/users/:userId/orders` (Requires `requireUserOwner`)
- **Cancel Order:** `POST /api/users/:userId/orders/:orderId/cancel` (Requires `requireUserOwner`)
  - **Request Body:** `{ "reason": "Accidental duplicate order" }`

---

## 5. Customer Profile, Address Book, Reviews & Tickets

- **Profile Details:** `GET /api/users/profile` | `PUT /api/users/profile`
- **Delivery Addresses:** `GET /api/users/address` | `POST /api/users/address` | `DELETE /api/users/address/:id`
- **Submit Review:** `POST /api/ratings`
  - Body: `{ "vendor_id": 14, "order_id": 8801, "rating": 5, "review_text": "Super fast delivery!" }`
- **Customer Support Tickets:** `POST /api/users/tickets` | `GET /api/users/:userId/tickets`

---

# ==========================================
# PART B: VENDOR WEB MANAGEMENT PORTAL
# ==========================================

## 6. Vendor Web Authentication & Settings

### 6.1 Vendor Web Login (Password or OTP)
- **Password Login:** `POST /api/vendor/login`
  - Body: `{ "email_or_phone": "vendor@example.com", "password": "Password#123" }`
- **OTP Login:** `POST /api/vendor/send-otp` ➔ `POST /api/vendor/verify-otp`
- **Response (200 OK):** Returns vendor object with `token` and `refreshToken`.

### 6.2 Vendor Operating Hours & Shop Toggle
- **Endpoint:** `PUT /api/vendor/:vendorId/settings`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "is_open": true,
    "auto_accept_orders": false,
    "delivery_start_time": "07:00",
    "delivery_end_time": "22:00",
    "minimum_order_amount": 100
  }
  ```

### 6.3 Society Delivery Coverage Selection
- **Get Coverage:** `GET /api/vendor/:vendorId/coverage`
- **Update Coverage:** `POST /api/vendor/:vendorId/coverage`
  - Body: `{ "society_ids": [10, 12, 18] }`

---

## 7. Web Product Catalog & Bulk Stock Management

### 7.1 List Products
- **Endpoint:** `GET /api/vendorPanel/items`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)

### 7.2 Create New Product
- **Endpoint:** `POST /api/vendorPanel/items`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Request Body:**
  ```json
  {
    "name": "Organic Paneer 200g",
    "category": "Dairy",
    "price": 95.00,
    "stock_quantity": 25,
    "description": "Fresh malai paneer"
  }
  ```

### 7.3 Real-Time Stock & Availability Toggle
- **Endpoint:** `PATCH /api/vendorPanel/:vendorId/items/:itemId/stock` (or `PATCH /api/items/:itemId/stock`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "stock_quantity": 50,
    "is_available": true
  }
  ```

### 7.4 Web Product Image Upload
- **Endpoint:** `POST /api/vendorPanel/items/upload-image`
- **Content-Type:** `multipart/form-data`
- **Form Field:** `image: <FileObject>`

---

## 8. Web Order Dispatch Board & Browser Audio Alerts

### 8.1 Real-Time Audio Alerts in Web Browser
Vendor portal should connect via Socket.io to trigger browser chimes when new orders arrive:
```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: vendorToken }
});

socket.emit('join_vendor_room', { vendor_id: currentVendorId });

socket.on('new_order', (newOrder) => {
  // Play HTML5 audio chime
  const audio = new Audio('/sounds/order-notification.mp3');
  audio.play().catch(() => console.log('Audio autoplay blocked by browser'));
  
  // Update state/query cache
  queryClient.invalidateQueries(['vendorOrders']);
});
```

### 8.2 Fetch Live Orders
- **Endpoint:** `GET /api/vendorPanel/orders`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Query Params:** `?status=PENDING&page=1`

### 8.3 Update Order Lifecycle Status
- **Endpoint:** `PATCH /api/vendorPanel/orders/:orderId/status`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "status": "ACCEPTED",
    "estimated_delivery_time": "2026-10-22T12:00:00Z"
  }
  ```

---

## 9. Vendor Desktop Web Subscription Checkout (Cashfree Web)

For a complete breakdown of Cashfree Web integration, see [VENDOR_WEB_SUBSCRIPTION_PAYMENT_API.md](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/docs/VENDOR_WEB_SUBSCRIPTION_PAYMENT_API.md).

### 9.1 Create Web Payment Session
- **Endpoint:** `POST /api/subscriptions/create-payment-session`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "vendor_id": 14,
    "plan_id": 2,
    "coupon_code": "DISCOUNT10"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "payment_session_id": "session_web_xyz...",
    "order_id": "SUB-ORD-14-1734912000"
  }
  ```

### 9.2 Mount Cashfree JS Web Dropin / Checkout
```javascript
import { load } from '@cashfreepayments/cashfree-js';

const cashfree = await load({ mode: 'production' }); // or 'sandbox'
await cashfree.checkout({
  paymentSessionId: response.data.payment_session_id,
  redirectTarget: '_self'
});
```

### 9.3 Verify Payment on Return
- **Endpoint:** `POST /api/subscriptions/verify-payment`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:** `{ "vendor_id": 14, "order_id": "SUB-ORD-14-1734912000" }`

---

## 10. Vendor Replies & Support Tickets

- **Reply to Customer Review:** `POST /api/ratings/reply`
  - Body: `{ "rating_id": 302, "reply_text": "Thank you for shopping with us!" }`
- **Vendor Support Desk:** `GET /api/vendorPanel/support` | `POST /api/vendorPanel/support`

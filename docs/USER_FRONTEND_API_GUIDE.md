# DigiLocal - Customer (User) App & Web Frontend API Guide

> **Document Version:** 2.0.0 (Strict RBAC & Zero-Trust Architecture)  
> **Audience:** Customer Mobile App (React Native/Expo/Flutter) and Customer Web Frontend Engineers  
> **Base URL:** `http://localhost:5000` (or production API host)  
> **Security Policy:** All customer private endpoints strictly require a User Bearer Token (`roles: ['user']`, `isUser: true`). Attempting to use Vendor or Admin tokens will return `403 Forbidden`.

---

## 1. Authentication & Security Architecture

### 1.1 Authorization Header
All private requests must include the JWT token obtained during User Login/OTP verification:
```http
Authorization: Bearer <USER_ACCESS_TOKEN>
```

### 1.2 Access Control & IDOR Protection Rules
- **Mutual Role Exclusion:** A customer token can **only** access User and public Storefront endpoints. It is strictly blocked from Admin (`/api/admin/*`, `/api/people/*`) and Vendor (`/api/vendorPanel/*`, `/api/vendors/*`) routes.
- **IDOR Protection:** For any parameterized endpoint containing `/:userId` (e.g., `/api/users/:userId/orders`), the backend cryptographically enforces that `:userId` matches the `userId` in your Bearer token. Tampering with this ID returns:
  ```json
  {
    "success": false,
    "error": "Forbidden: You are not authorized to access or modify another user's data",
    "code": "IDOR_VIOLATION"
  }
  ```
- **Error Codes:**
  - `401 Unauthorized`: Token missing, expired, or invalid.
  - `403 Forbidden`: Token belongs to a vendor/admin, or attempting cross-user tampering.

---

## 2. Authentication APIs

### 2.1 Send OTP for Login / Registration
- **Endpoint:** `POST /api/users/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "mobileNumber": "9876543210"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to your mobile number"
  }
  ```

### 2.2 Verify OTP & Retrieve Tokens
- **Endpoint:** `POST /api/users/verify-otp`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "mobileNumber": "9876543210",
    "otp": "123456"
  }
  ```
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
      "email": "rahul@example.com",
      "role": "user",
      "isUser": true
    }
  }
  ```

### 2.3 Refresh Access Token
- **Endpoint:** `POST /api/users/refresh-token`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

## 3. User Profile & Account Management

### 3.1 Get Current User Profile
- **Endpoint:** `GET /api/users/profile` (or `GET /api/users/me`)
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": 42,
      "name": "Rahul Sharma",
      "mobileNumber": "9876543210",
      "email": "rahul@example.com",
      "society_id": 10,
      "flat_number": "A-402",
      "is_active": true
    }
  }
  ```

### 3.2 Update User Profile
- **Endpoint:** `PUT /api/users/profile`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Request Body:**
  ```json
  {
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "society_id": 10,
    "flat_number": "A-402"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "data": { ... }
  }
  ```

### 3.3 Get Account Strikes & Status
- **Endpoint:** `GET /api/users/strikes`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "strike_count": 0,
      "is_flagged": false,
      "status": "active"
    }
  }
  ```

### 3.4 Manage Delivery Addresses
- **Get Addresses:** `GET /api/users/address` (or `GET /api/users/:userId/address`)
  - **Auth:** `Bearer <USER_TOKEN>` (`requireUserOwner`)
- **Add Address:** `POST /api/users/address`
  - **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
  - **Request Body:**
    ```json
    {
      "society_id": 10,
      "tower": "Tower B",
      "flat_number": "504",
      "pincode": "560102",
      "is_default": true
    }
    ```
- **Update Address:** `PUT /api/users/address/:addressId`
- **Delete Address:** `DELETE /api/users/address/:addressId`

---

## 4. Public Discovery & Storefront (No Auth Required)

### 4.1 List Active Societies
- **Endpoint:** `GET /api/societies`
- **Query Params:** `?page=1&limit=20&search=Green`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 10,
        "name": "Green Valley Apartment",
        "city": "Bengaluru",
        "pincode": "560102",
        "status": "APPROVED"
      }
    ]
  }
  ```

### 4.2 List Vendors Serving a Society
- **Endpoint:** `GET /api/societies/:societyId/vendors`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "vendor_id": 5,
        "business_name": "Daily Fresh Dairy & Grocery",
        "category": "Dairy & Milk",
        "rating": 4.8,
        "is_open": true
      }
    ]
  }
  ```

### 4.3 Search Catalog & Stores
- **Endpoint:** `GET /api/search`
- **Query Params:** `?q=milk&societyId=10`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "results": {
      "products": [ ... ],
      "vendors": [ ... ]
    }
  }
  ```

### 4.4 Get Vendor Public Storefront & Catalog
- **Endpoint:** `GET /api/vendors/:vendorId/storefront`
- **Response (200 OK):** Returns vendor info, operating hours, categories, products, and available services.

### 4.5 Validate Cart Stock Before Checkout
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

---

## 5. Orders & Checkout

### 5.1 Place a New Order
- **Endpoint:** `POST /api/orders`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Request Body:**
  ```json
  {
    "vendor_id": 5,
    "items": [
      { "item_id": 101, "quantity": 2, "unit_price": 32.00 }
    ],
    "delivery_address_id": 12,
    "payment_method": "COD",
    "delivery_slot": "07:00 AM - 09:00 AM",
    "special_instructions": "Leave at doorstep"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Order placed successfully",
    "order": {
      "id": 8801,
      "order_number": "ORD-2026-8801",
      "status": "PENDING",
      "total_amount": 64.00,
      "created_at": "2026-10-22T10:00:00Z"
    }
  }
  ```

### 5.2 Get User Orders History
- **Endpoint:** `GET /api/users/:userId/orders` (or `GET /api/orders/user/:userId`)
- **Auth:** `Bearer <USER_TOKEN>` (`requireUserOwner`)
- **Query Params:** `?page=1&limit=10&status=ALL`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 8801,
        "vendor_name": "Daily Fresh Dairy & Grocery",
        "status": "ACCEPTED",
        "total_amount": 64.00,
        "items_count": 1,
        "placed_at": "2026-10-22T10:00:00Z"
      }
    ]
  }
  ```

### 5.3 Cancel Order
- **Endpoint:** `POST /api/users/:userId/orders/:orderId/cancel` (or `POST /api/orders/user/:userId/orders/:orderId/cancel`)
- **Auth:** `Bearer <USER_TOKEN>` (`requireUserOwner`)
- **Request Body:**
  ```json
  {
    "reason": "Ordered wrong item by mistake"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Order cancelled successfully",
    "order_id": 8801,
    "status": "CANCELLED"
  }
  ```

---

## 6. Service Enquiries

### 6.1 Submit an Enquiry to a Service Vendor
- **Endpoint:** `POST /api/enquiries`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Request Body:**
  ```json
  {
    "vendor_id": 14,
    "service_id": 3,
    "message": "Need AC deep cleaning on Saturday morning",
    "preferred_date": "2026-10-25"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Enquiry submitted to vendor",
    "data": { "id": 501, "status": "PENDING" }
  }
  ```

### 6.2 Get User's Submitted Enquiries
- **Endpoint:** `GET /api/users/:userId/enquiries`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUserOwner`)
- **Response (200 OK):** Returns list of customer enquiries and vendor responses.

---

## 7. Ratings & Reviews

### 7.1 Submit a Rating / Review
- **Endpoint:** `POST /api/ratings`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Request Body:**
  ```json
  {
    "vendor_id": 5,
    "order_id": 8801,
    "rating": 5,
    "review_text": "Always prompt and fresh delivery!"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Rating submitted successfully"
  }
  ```

### 7.2 Get User's Own Reviews
- **Endpoint:** `GET /api/users/:userId/reviews`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUserOwner`)

---

## 8. Customer Support Tickets

### 8.1 Create Support Ticket
- **Endpoint:** `POST /api/users/tickets`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUser`)
- **Request Body:**
  ```json
  {
    "subject": "Missing item in order #ORD-8801",
    "category": "ORDER_ISSUE",
    "description": "Milk packet was missing from the packet delivered",
    "order_id": 8801
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "ticket_id": "TCK-10992",
    "status": "OPEN"
  }
  ```

### 8.2 View User Tickets & Conversation
- **Endpoint:** `GET /api/users/:userId/tickets`
- **Auth:** `Bearer <USER_TOKEN>` (`requireUserOwner`)

---

## 9. Handling Errors in Frontend
Always handle `401` and `403` status codes globally:
```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to Customer Mobile OTP Login
      logoutUser();
    } else if (error.response?.status === 403) {
      // Role violation or IDOR tampering attempt
      console.error("Access forbidden: invalid user scope or cross-account access.");
      showToast("Access denied: You do not have permission to view this resource.");
    }
    return Promise.reject(error);
  }
);
```

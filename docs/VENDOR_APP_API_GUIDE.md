# DigiLocal - Vendor Mobile App Developer API Guide

> **Document Version:** 2.0.0 (Strict RBAC & Mobile-Optimized)  
> **Target Audience:** Vendor Mobile App Engineers (React Native / Expo / Flutter / Android / iOS)  
> **Base URL:** `http://localhost:5000` (or your staging/production host)  
> **Auth Header:** `Authorization: Bearer <VENDOR_ACCESS_TOKEN>`  
> **Security Guard:** Strictly requires `roles: ['vendor']` and `isVendor: true`. Customer/Admin tokens or mismatched `:vendorId` (IDOR) return `403 Forbidden`.

---

## 1. Mobile Architecture & App Initialization Flow

```
[ App Launch ]
       │
  Stored JWT in SecureStore? 
       ├── No ───> [ Mobile OTP / Password Login Screen ]
       │                     │
       └── Yes               └──> Receive { token, refreshToken, vendor }
             │
   Call GET /api/vendorPanel/status
             ├── 401 ───> Refresh Token (POST /api/vendor/refresh-token)
             ├── 403 ───> Account Inactive / Striken / Blocked Screen
             └── 200 ───> Register Push/FCM Token (POST /api/vendor/push-token)
                               │
                               └──> Connect WebSocket / Socket.io for Real-time Order Chime
```

---

## 2. Authentication & Session Management

### 2.1 Send Mobile OTP
- **Endpoint:** `POST /api/vendor/send-otp`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "mobile_number": "9876500001"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to registered mobile number"
  }
  ```

### 2.2 Verify Mobile OTP & Receive Session
- **Endpoint:** `POST /api/vendor/verify-otp`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "mobile_number": "9876500001",
    "otp": "123456"
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
      "mobile_number": "9876500001",
      "status": "APPROVED",
      "role": "vendor",
      "isVendor": true,
      "isUser": false
    }
  }
  ```

### 2.3 Password Login (Fallback)
- **Endpoint:** `POST /api/vendor/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email_or_phone": "9876500001",
    "password": "VendorSecurePassword#123"
  }
  ```

### 2.4 Token Refresh (Silent Background Renewal)
- **Endpoint:** `POST /api/vendor/refresh-token`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "refreshToken": "<STORED_REFRESH_TOKEN>"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "<NEW_ACCESS_TOKEN>"
  }
  ```

---

## 3. Push Notifications & Device Token Registration

Call this immediately after every successful login and whenever Expo/FCM rotates the device token.

### 3.1 Register Expo / FCM Push Token
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

## 4. Real-Time Order Management & Audio Alerts

### 4.1 Socket.io Real-time Connection
- Connect to server root with auth query:
  ```javascript
  import { io } from "socket.io-client";
  const socket = io("http://localhost:5000", {
    auth: { token: vendorAccessToken }
  });

  socket.on("connect", () => {
    socket.emit("join_vendor_room", { vendor_id: vendor.id });
  });

  // Incoming new order -> Play alert chime & vibrate phone
  socket.on("new_order", (order) => {
    playNotificationSound();
    vibratePhone();
    showInAppBanner(`New Order #${order.id} received!`);
  });
  ```

### 4.2 Fetch Live Orders (Tabs: Pending, Preparing, Completed)
- **Endpoint:** `GET /api/vendorPanel/orders` (or `GET /api/orders/vendor/:vendorId`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Query Params:** `?status=PENDING` (Values: `PENDING`, `ACCEPTED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`)
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
          { "item_id": 101, "name": "Nandini Milk 500ml", "quantity": 2, "unit_price": 24.00 }
        ],
        "total_amount": 48.00,
        "payment_method": "COD",
        "status": "PENDING",
        "created_at": "2026-10-22T10:15:00Z"
      }
    ]
  }
  ```

### 4.3 Update Order Status (Pipeline Actions)
- **Endpoint:** `PATCH /api/vendorPanel/orders/:orderId/status`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body (Accepting an Order):**
  ```json
  {
    "status": "ACCEPTED",
    "estimated_delivery_time": "2026-10-22T11:00:00Z",
    "vendor_note": "Order packed"
  }
  ```
- **Allowed Mobile Transitions:**
  - `PENDING` ➔ `ACCEPTED` or `REJECTED`
  - `ACCEPTED` ➔ `PREPARING`
  - `PREPARING` ➔ `OUT_FOR_DELIVERY`
  - `OUT_FOR_DELIVERY` ➔ `DELIVERED`

---

## 5. Mobile Inventory & Quick Stock Toggle

### 5.1 List Store Products
- **Endpoint:** `GET /api/vendorPanel/items`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "items": [
      {
        "id": 101,
        "name": "Nandini Toned Milk 500ml",
        "price": 24.00,
        "stock_quantity": 18,
        "is_available": true,
        "image_url": "/uploads/items/milk_500.png"
      }
    ]
  }
  ```

### 5.2 One-Tap Out-of-Stock Switch
- **Endpoint:** `PATCH /api/vendorPanel/:vendorId/items/:itemId/stock` (or `PATCH /api/items/:itemId/stock`)
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "is_available": false
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Stock updated successfully",
    "item": { "id": 101, "is_available": false }
  }
  ```

### 5.3 Camera / Gallery Product Image Upload
- **Endpoint:** `POST /api/vendorPanel/items/upload-image`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Headers:** `Content-Type: multipart/form-data`
- **Body Field:** `image: <ImageBlob/File>`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "imageUrl": "/uploads/items/item_1734912000.jpg"
  }
  ```

---

## 6. Store Status & Open/Closed Quick Switch

### 6.1 Toggle Shop Open/Closed
- **Endpoint:** `PUT /api/vendor/:vendorId/settings`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "is_open": true
  }
  ```

---

## 7. Mobile Cashfree Subscription Checkout

### 7.1 Check Subscription Health
- **Endpoint:** `GET /api/vendorPanel/subscription/status`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)

### 7.2 Create Mobile Payment Session
- **Endpoint:** `POST /api/subscriptions/create-payment-session`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendorOwner`)
- **Request Body:**
  ```json
  {
    "vendor_id": 14,
    "plan_id": 2,
    "coupon_code": "PROMO20"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "payment_session_id": "session_mob_991823...",
    "order_id": "SUB-ORD-14-1734912000",
    "amount": 1499.00
  }
  ```
- **Mobile SDK Action:** Pass `payment_session_id` to Cashfree React Native SDK `CFPaymentGatewayService.doPayment(...)`.

### 7.3 Verify Payment
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

## 8. Customer Reviews & Reply

### 8.1 Reply to Review
- **Endpoint:** `POST /api/ratings/reply`
- **Auth:** `Bearer <VENDOR_TOKEN>` (`requireVendor`)
- **Request Body:**
  ```json
  {
    "rating_id": 302,
    "reply_text": "Thank you for the 5 stars!"
  }
  ```

---

## 9. Mobile Error Handling & IDOR Rejection

Implement a global Axios interceptor:
```typescript
axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      // Access token expired -> invoke refresh token flow
      const refreshed = await renewAccessToken();
      if (!refreshed) logoutAndRedirectToLogin();
    } else if (err.response?.status === 403) {
      // Forbidden: Role mismatch or cross-vendor IDOR violation
      Alert.alert("Permission Denied", "You do not have access to this vendor's data.");
    }
    return Promise.reject(err);
  }
);
```

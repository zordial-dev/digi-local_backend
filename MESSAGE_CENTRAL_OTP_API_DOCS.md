# DigiLocal API Documentation: Mobile OTP (Message Central) & Cashfree Payments
### Providers: Message Central VerifyNow (SMS OTP) & Cashfree Payment Gateway (PG v3)
**Audience:** Mobile App Developers (Flutter / React Native / Android / iOS) & Website Frontend Developers  
**Base URL:** `https://digi-local-backend.onrender.com` (Production) / `http://localhost:5000` (Local)  
**Status:** Live Production Mode (Simulation bypasses e.g. `123456`, `999999` are permanently removed)

---

## 📌 Table of Contents
1. [Key Architectural Changes](#1-key-architectural-changes)
2. [Resident User Panel (Customer App & Website)](#2-resident-user-panel)
   - [2.1 Send Resident User OTP](#21-send-resident-user-otp)
   - [2.2 Verify Resident User OTP](#22-verify-resident-user-otp)
   - [2.3 Resident User Login with OTP](#23-resident-user-login-with-otp)
   - [2.4 Check Phone Registration](#24-check-phone-registration)
3. [Vendor Merchant Panel (Vendor App & Portal)](#3-vendor-merchant-panel)
   - [3.1 Send Vendor OTP](#31-send-vendor-otp)
   - [3.2 Vendor Login with OTP](#32-vendor-login-with-otp)
   - [3.3 Check Vendor Phone Registration](#33-check-vendor-phone-registration)
4. [Generic Utility OTP Endpoints](#4-generic-utility-otp-endpoints)
   - [4.1 Send Generic OTP](#41-send-generic-otp)
   - [4.2 Verify Generic OTP](#42-verify-generic-otp)
5. [Error Handling & Edge Cases](#5-error-handling--edge-cases)
6. [Frontend Quick-Start Snippets](#6-frontend-quick-start-snippets)
7. [Cashfree Payment Gateway Integration](#7-cashfree-payment-gateway-integration)
   - [7.1 Live Credentials Check Endpoint](#71-live-credentials-check-endpoint)
   - [7.2 Cart Order Checkout with Cashfree](#72-cart-order-checkout-with-cashfree)
   - [7.3 Dedicated Order Payment Session Creation](#73-dedicated-order-payment-session-creation)
   - [7.4 Verify Cashfree Order Payment](#74-verify-cashfree-order-payment)
   - [7.5 Direct Resident-to-Vendor Payment (Scan & Pay)](#75-direct-resident-to-vendor-payment-scan--pay)
   - [7.6 Verify Direct Vendor Payment](#76-verify-direct-vendor-payment)
   - [7.7 Cashfree Webhook Handler](#77-cashfree-webhook-handler)
   - [7.8 Vendor & Admin Payment History Endpoints](#78-vendor--admin-payment-history-endpoints)
8. [Postman Testing Guide for Cashfree](#8-postman-testing-guide-for-cashfree)

---

## 1. Key Architectural Changes

1. **Message Central CPaaS Integration:**
   - Real SMS delivery is triggered to Indian mobile numbers (`+91`).
   - OTP codes are typically 4 to 6 digits generated securely by Message Central.
2. **Session Identification (`verification_id`):**
   - Whenever you call `send-otp`, the server returns a `verification_id` (also aliased as `verificationId`).
   - **Recommended:** Store this `verification_id` and pass it back in subsequent verification/login requests for the fastest response.
   - **Fallback:** If your frontend only submits `{ phone, otp }`, the server automatically retrieves the session from an in-memory cache keyed by the phone number (valid for 10 minutes).
3. **Strict Validation (No Dummy Codes):**
   - Dummy codes (`123456`, `999999`, `111111`, `000000`) will return HTTP `400 Bad Request`.
   - Users must enter the authentic OTP received via SMS.

---

## 2. Resident User Panel

### 2.1 Send Resident User OTP
Sends an SMS OTP to the customer's phone number.

* **Endpoint:** `POST /api/users/send-otp`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "country_code": "91",
  "purpose": "login"
}
```
> **Fields:**
> - `phone` *(required, string)*: 10-digit mobile number (e.g. `9876543210` or `+919876543210`).
> - `purpose` *(optional, string)*: 
>   - `"login"` (default): Requires the account to exist in the database. Returns `404` if not found.
>   - `"register"` / `"signup"`: Requires the phone number to be new. Returns `400` if already registered.
> - `country_code` *(optional, string)*: Defaults to `"91"`.

* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully via Message Central",
  "target": "9876543210",
  "provider": "message_central",
  "verification_id": "v-1790245678-abcde",
  "verificationId": "v-1790245678-abcde",
  "data": {
    "success": true,
    "provider": "message_central",
    "verificationId": "v-1790245678-abcde",
    "mobile": "9876543210",
    "countryCode": "91",
    "timeout": 60
  }
}
```

* **Error Response - Account Not Found (404 Not Found):**
```json
{
  "success": false,
  "exists": false,
  "error": "No account found with this mobile number. Please register your account first."
}
```

---

### 2.2 Verify Resident User OTP
Verifies the SMS code without immediately issuing user login tokens (useful for registration steps or multi-step checkout).

* **Endpoint:** `POST /api/users/verify-otp`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "458921",
  "verification_id": "v-1790245678-abcde",
  "country_code": "91"
}
```

* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "valid": true,
  "provider": "message_central",
  "phone_number": "9876543210",
  "data": {
    "success": true,
    "valid": true,
    "verificationStatus": "VERIFICATION_COMPLETED"
  }
}
```

* **Error Response - Invalid/Expired OTP (400 Bad Request):**
```json
{
  "success": false,
  "message": "Incorrect OTP code entered."
}
```

---

### 2.3 Resident User Login with OTP
Authenticates a user using phone and SMS OTP, generating JWT access and refresh tokens.

* **Endpoint:** `POST /api/users/login`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "458921",
  "verification_id": "v-1790245678-abcde"
}
```

* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_v_1296",
    "name": "Ramesh Sharma",
    "email": "ramesh.sharma@example.com",
    "phone": "9876543210",
    "society_id": 1,
    "society_name": "Manglam Ananda",
    "flat": "Shop no. 20",
    "status": "ACTIVE",
    "roles": ["customer", "user"]
  }
}
```

---

### 2.4 Check Phone Registration
Checks if a phone number is registered as a user or vendor before triggering OTP or registration flows.

* **Endpoint:** `POST /api/users/check-phone`
* **Request Body:**
```json
{
  "phone": "9876543210"
}
```
* **Response (200 OK):**
```json
{
  "exists": true,
  "phone": "9876543210",
  "message": "Account found"
}
```

---

## 3. Vendor Merchant Panel

### 3.1 Send Vendor OTP
Dispatches an OTP to a vendor's registered mobile number.

* **Endpoint:** `POST /api/vendors/send-otp`  
  *(Aliases: `/api/vendors/request-otp`, `/api/vendors/otp-send`)*
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "purpose": "login",
  "country_code": "91"
}
```

* **Success Response (200 OK):**
```json
{
  "success": true,
  "provider": "message_central",
  "message": "OTP sent successfully via Message Central",
  "verification_id": "v-1790245678-abcde",
  "verificationId": "v-1790245678-abcde",
  "data": {
    "success": true,
    "provider": "message_central",
    "verificationId": "v-1790245678-abcde",
    "mobile": "9876543210",
    "timeout": 60
  }
}
```

* **Error Response - Store Account Not Found (404 Not Found):**
```json
{
  "success": false,
  "exists": false,
  "error": "No vendor store account found with this phone number. Please register first."
}
```

---

### 3.2 Vendor Login with OTP
Verifies the SMS OTP and authenticates the merchant, returning merchant store details and JWT tokens.

* **Endpoint:** `POST /api/vendors/login-with-otp`  
  *(Aliases: `/api/vendors/otp-login`, `/api/vendors/login-otp`, `/api/vendors/verify-otp`)*
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "458921",
  "verification_id": "v-1790245678-abcde"
}
```

* **Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 1296,
  "public_id": "vnd@1296",
  "status": "active",
  "vendor": {
    "vendor_id": 1296,
    "public_id": "vnd@1296",
    "store_name": "Flower Point",
    "vendor_name": "Ramesh Sharma",
    "email": "ramesh.sharma@example.com",
    "phone_number": "9876543210",
    "status": "active"
  }
}
```

* **Error Response - Invalid OTP (400 Bad Request):**
```json
{
  "error": "Invalid or expired OTP code. Please enter the correct verification code."
}
```

* **Error Response - Blocked Store (403 Forbidden):**
```json
{
  "success": false,
  "error": "Your vendor account has been blocked by admin.",
  "code": "VENDOR_BLOCKED",
  "is_blocked": true
}
```

---

### 3.3 Check Vendor Phone Registration
* **Endpoint:** `POST /api/vendors/check-phone`
* **Request Body:**
```json
{
  "phone": "9876543210"
}
```
* **Success Response (200 OK):**
```json
{
  "exists": true,
  "vendor_id": 1296,
  "public_id": "vnd@1296",
  "store_name": "Flower Point",
  "vendor_name": "Ramesh Sharma",
  "phone_number": "9876543210",
  "status": "active",
  "message": "Vendor account found"
}
```

---

## 4. Generic Utility OTP Endpoints

For generic web/app forms or checkout validation:

### 4.1 Send Generic OTP
* **Endpoint:** `POST /api/otp/send-otp`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "country_code": "91",
  "purpose": "login"
}
```

### 4.2 Verify Generic OTP
* **Endpoint:** `POST /api/otp/verify-otp`
* **Request Body:**
```json
{
  "phone": "9876543210",
  "otp": "458921",
  "verification_id": "v-1790245678-abcde"
}
```

---

## 5. Error Handling & Edge Cases

| Status Code | Reason | What Frontend Should Do |
| :--- | :--- | :--- |
| **`400 Bad Request`** | Missing `phone` or `otp` field. | Validate input on client side before making the API request. |
| **`400 Bad Request`** | Incorrect OTP entered or session expired. | Display error message: *"Invalid or expired OTP code."* Offer Resend OTP button. |
| **`404 Not Found`** | Phone number not registered (when `purpose='login'`). | Prompt user to navigate to the Registration / Signup screen. |
| **`403 Forbidden`** | Account is blocked or suspended by admin. | Show support contact message: *"Account has been suspended."* |
| **`500 Internal Error`**| Gateway timeout or CPaaS network issue. | Show: *"Failed to send OTP. Please try again in a few moments."* |

---

## 6. Frontend Quick-Start Snippets

### JavaScript / React (Website)
```javascript
// Step 1: Request OTP
async function requestOtp(phoneNumber) {
  const response = await fetch('/api/users/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneNumber, purpose: 'login' })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message);
  
  // Save verification_id for step 2
  sessionStorage.setItem('otp_ver_id', data.verification_id);
  return data;
}

// Step 2: Login with OTP
async function loginWithOtp(phoneNumber, otpCode) {
  const verificationId = sessionStorage.getItem('otp_ver_id');
  const response = await fetch('/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: phoneNumber,
      otp: otpCode,
      verification_id: verificationId
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || data.message);
  
  localStorage.setItem('accessToken', data.accessToken);
  return data.user;
}
```

### Flutter / Dart (Mobile App)
```dart
// Step 1: Send OTP
Future<String?> sendVendorOtp(String phone) async {
  final res = await http.post(
    Uri.parse('$baseUrl/api/vendors/send-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({'phone': phone, 'purpose': 'login'}),
  );
  final body = jsonDecode(res.body);
  if (res.statusCode == 200) {
    return body['verification_id'];
  } else {
    throw Exception(body['error'] ?? 'Failed to send OTP');
  }
}

// Step 2: Login with OTP
Future<Map<String, dynamic>> loginVendor(String phone, String otp, String? verificationId) async {
  final res = await http.post(
    Uri.parse('$baseUrl/api/vendors/login-with-otp'),
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'phone': phone,
      'otp': otp,
      'verification_id': verificationId,
    }),
  );
  final body = jsonDecode(res.body);
  if (res.statusCode == 200) {
    return body;
  } else {
    throw Exception(body['error'] ?? 'Invalid OTP code');
  }
}
```

---

## 7. Cashfree Payment Gateway Integration

### Overview & Architecture
DigiLocal integrates Cashfree Payment Gateway (PG v3 API) supporting:
* **Online Cart Checkout (`COD` or `CASHFREE`)**
* **Direct Scan-and-Pay to Vendor Stores**
* **Seamless SDK Integration via `payment_session_id`**
* **Instant In-App / Expo Push Notification to Merchant on Successful Payment**

---

### 7.1 Live Credentials Check Endpoint
Use this diagnostic endpoint to verify if your server's Cashfree credentials in `.env` are authentic and accepted by Cashfree PG.

* **Method & Path:** `GET /api/payments/cashfree/check-credentials` (or `POST`)
* **Headers:** None required
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "authenticated": true,
  "message": "✅ Credentials are 100% VALID and successfully authenticated by Cashfree PG (PRODUCTION)!",
  "environment": "PRODUCTION",
  "base_url": "https://api.cashfree.com/pg",
  "app_id_preview": "13692890...9631",
  "secret_key_length": 52
}
```
* **Failure Response (`401 Unauthorized`):**
```json
{
  "success": false,
  "authenticated": false,
  "status_code": 401,
  "error": "authentication Failed",
  "fix_advice": "Copy the complete secret key from Cashfree Dashboard (ensure all 50+ chars are copied)."
}
```

---

### 7.2 Cart Order Checkout with Cashfree
When a customer creates an order, set `payment_method: "CASHFREE"`. The backend will create the order, call Cashfree to generate a session, and return the `payment_session_id` and `payment_url`.

* **Method & Path:** `POST /api/orders`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "society_id": 1,
  "vendor_id": 1296,
  "customer_name": "Ramesh Sharma",
  "customer_phone": "9876543210",
  "customer_email": "customer@digilocal.in",
  "delivery_address": "Tower A, Flat 302, Manglam Ananda",
  "payment_method": "CASHFREE",
  "items": [
    {
      "item_id": 1726,
      "quantity": 2,
      "price": 150
    }
  ],
  "total_amount": 300,
  "delivery_fee": 15,
  "service_fee": 5
}
```

* **Success Response (`201 Created`):**
```json
{
  "success": true,
  "order_id": 4821,
  "payment_method": "CASHFREE",
  "payment_status": "PENDING",
  "total_amount": 320,
  "cashfree": {
    "success": true,
    "payment_session_id": "session_live_920c5466_abc12345",
    "order_id": "4821",
    "cf_order_id": "cf_order_123456789",
    "order_amount": 320,
    "order_currency": "INR",
    "payment_status": "ACTIVE",
    "payment_url": "https://payments.cashfree.com/order/#4821"
  }
}
```

> **Client Integration:**
> Pass `cashfree.payment_session_id` into Cashfree JS Web SDK (`cashfree.checkout({ paymentSessionId })`) or Flutter/React Native Cashfree SDK. Alternatively, redirect the user to `cashfree.payment_url`.

---

### 7.3 Dedicated Order Payment Session Creation
If an order was already created in `PENDING` state and the user wants to initiate or retry online payment:

* **Method & Path:** `POST /api/payments/cashfree/create-order-session`  
  *(Alias: `/api/payments/cashfree/create-session`)*
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "order_id": 4821,
  "amount": 320,
  "vendor_id": 1296,
  "customer_name": "Ramesh Sharma",
  "customer_phone": "9876543210",
  "customer_email": "customer@digilocal.in",
  "return_url": "https://digilocal.in/payments/cashfree/return?order_id={order_id}"
}
```

* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "payment_session_id": "session_live_920c5466_abc12345",
  "order_id": "4821",
  "cf_order_id": "cf_order_123456789",
  "order_amount": 320,
  "order_currency": "INR",
  "payment_status": "ACTIVE",
  "payment_url": "https://payments.cashfree.com/order/#4821",
  "mode": "live",
  "vendor_id": 1296,
  "store_name": "Flower Point"
}
```

---

### 7.4 Verify Cashfree Order Payment
Once Cashfree SDK completes or returns to the frontend, call this endpoint to verify with Cashfree servers, mark order as `PAID`, record the ledger entry, and trigger the vendor order alert.

* **Method & Path:** `POST /api/payments/cashfree/verify`  
  *(Alias: `/api/payments/cashfree/verify-order`)*
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "order_id": "4821",
  "cashfree_order_id": "4821",
  "cashfree_payment_id": "CF_PAY_98765432"
}
```

* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "verified": true,
  "message": "Payment verified successfully. Order confirmed.",
  "order_id": "4821",
  "payment_status": "PAID",
  "payment_method": "CASHFREE",
  "cashfree_order_id": "4821",
  "cashfree_payment_id": "CF_PAY_98765432",
  "paid_at": "2026-09-24T16:50:00.000Z",
  "order": {
    "order_id": 4821,
    "status": "CONFIRMED",
    "payment_status": "PAID",
    "total_amount": 320
  }
}
```

---

### 7.5 Direct Resident-to-Vendor Payment (Scan & Pay)
Allows residents to scan a merchant's DigiLocal QR code and transfer arbitrary amounts directly (e.g. at the counter).

* **Method & Path:** `POST /api/payments/cashfree/pay-vendor-direct`
* **Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "vendor_id": 1296,
  "amount": 150,
  "customer_name": "Ramesh Sharma",
  "customer_phone": "9876543210",
  "notes": "Direct counter payment for flowers"
}
```

* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "payment_session_id": "session_dir_1790245678",
  "order_id": "CF_DIR_1790245678_1234",
  "order_amount": 150,
  "payment_url": "https://payments.cashfree.com/order/#CF_DIR_1790245678_1234",
  "vendor_id": 1296,
  "store_name": "Flower Point"
}
```

---

### 7.6 Verify Direct Vendor Payment
* **Method & Path:** `POST /api/payments/cashfree/verify-direct`
* **Request Body:**
```json
{
  "order_id": "CF_DIR_1790245678_1234",
  "vendor_id": 1296,
  "amount": 150,
  "customer_name": "Ramesh Sharma",
  "customer_phone": "9876543210"
}
```
* **Success Response (`200 OK`):**
```json
{
  "success": true,
  "verified": true,
  "message": "Direct payment verified and recorded successfully"
}
```

---

### 7.7 Cashfree Webhook Handler
* **Endpoint:** `POST /api/payments/cashfree/webhook`
* Configure this URL in your **Cashfree Merchant Dashboard > Developers > Webhooks**:
  `https://digi-local-backend.onrender.com/api/payments/cashfree/webhook`

---

### 7.8 Vendor & Admin Payment History Endpoints
* **Vendor Payments:** `GET /api/vendors/:vendorId/cashfree-payments`  
  Query Params: `limit=50&offset=0&status=SUCCESS`
* **Admin Platform Ledger:** `GET /api/admin/payments/cashfree-ledger`  
  Query Params: `limit=100&offset=0&status=ALL`

---

## 8. Postman Testing Guide for Cashfree

You can import and run the following requests directly in **Postman**:

### Request 1: Check Live Credentials Diagnostics
* **Method:** `GET`
* **URL:** `{{base_url}}/api/payments/cashfree/check-credentials`
* **Expected Result:** 
  - If valid: `200 OK` with `"authenticated": true`.
  - If secret key is truncated or mismatched: `401 Unauthorized` with exact diagnostic suggestions.

---

### Request 2: Create Cart Order with Cashfree
* **Method:** `POST`
* **URL:** `{{base_url}}/api/orders`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "society_id": 1,
  "vendor_id": 1296,
  "customer_name": "Postman Test User",
  "customer_phone": "9876543210",
  "customer_email": "test@digilocal.in",
  "delivery_address": "Flat 101, Test Enclave",
  "payment_method": "CASHFREE",
  "items": [
    {
      "item_id": 1726,
      "quantity": 1,
      "price": 150
    }
  ],
  "total_amount": 150,
  "delivery_fee": 0,
  "service_fee": 0
}
```

---

### Request 3: Standalone Create Payment Session
* **Method:** `POST`
* **URL:** `{{base_url}}/api/payments/cashfree/create-order-session`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "amount": 250,
  "vendor_id": 1296,
  "customer_name": "Ramesh Resident",
  "customer_phone": "9876543210",
  "customer_email": "ramesh@example.com"
}
```

---

### Request 4: Verify Order Payment
* **Method:** `POST`
* **URL:** `{{base_url}}/api/payments/cashfree/verify`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "order_id": "4821",
  "cashfree_order_id": "4821",
  "cashfree_payment_id": "CF_PAY_TEST_12345"
}
```

---

### Request 5: Direct Scan-and-Pay to Vendor
* **Method:** `POST`
* **URL:** `{{base_url}}/api/payments/cashfree/pay-vendor-direct`
* **Headers:** `Content-Type: application/json`
* **Body (raw JSON):**
```json
{
  "vendor_id": 1296,
  "amount": 100,
  "customer_name": "Postman Customer",
  "customer_phone": "9876543210",
  "notes": "Postman Direct Pay Test"
}
```


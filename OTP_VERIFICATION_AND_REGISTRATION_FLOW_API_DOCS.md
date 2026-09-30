# DigiLocal — OTP, Registration & Login API Docs
**Version:** v1.0 | **Audience:** App & Web Frontend Developers

---

## Key Principle: Three Separate Concerns

The auth flow is split into **three separate steps** — each hits a **different endpoint**:

| Step | What it does | Endpoint |
|------|-------------|----------|
| 1. Pre-check | Is this phone/email already registered? | `POST /api/auth/check-account` |
| 2. Send OTP | Dispatch a 6-digit OTP via SMS | `POST /api/otp/mobile/send-otp` |
| 3a. Verify OTP *(registration only)* | Confirm OTP is valid — no tokens | `POST /api/vendors/verify-otp` or `POST /api/users/verify-otp` |
| 3b. Login with OTP *(login only)* | Confirm OTP + return tokens + profile | `POST /api/vendors/otp-login` or `POST /api/users/login` |
| 4. Register | Save new account (after verify-otp) | `POST /api/vendors/register` or `POST /api/users/register` |

> **IMPORTANT:** `/verify-otp` is only for registration. It does NOT return tokens.
> For login with OTP, use `/otp-login` (vendor) or `/users/login` (resident user). These return tokens directly.

---

## Flow Summary

**Registration:** `check-account → send-otp → verify-otp → register`

**Login (OTP):** `check-account → send-otp → otp-login (or users/login with otp field)`

**Login (Password):** `vendors/login or users/login with password field`

---

## API Reference

---

### 1. Check Account Existence

**Endpoint**
```
POST /api/auth/check-account
```

*Aliases:* `/api/auth/check-user` · `/api/auth/check-exists` · `/api/check-phone`
· `/api/users/check-account` · `/api/users/check-phone` · `/api/vendors/check-phone`

**Request Body**
```json
{
  "identifier": "9876543210",
  "role": "vendor"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `identifier` | string | Yes | Phone or email. Also: `phone`, `mobile`, `phone_number`, `email` |
| `role` | string | No | `"vendor"` or `"user"` — narrows DB search to one table |

**Response — Not Registered — 200 OK**
```json
{
  "success": true,
  "exists": false,
  "account_type": "none",
  "next_action": "REGISTER",
  "identifier": "9876543210",
  "phone": "9876543210",
  "email": null,
  "message": "No account found with this identifier. Proceed to registration.",
  "cooldown": {
    "active": false,
    "retry_after": null,
    "cooldown_seconds": 10,
    "next_cooldown_seconds": 20,
    "attempt": 0
  },
  "user": null,
  "vendor": null
}
```

**Response — Already Registered — 200 OK**
```json
{
  "success": true,
  "exists": true,
  "account_type": "vendor",
  "next_action": "LOGIN",
  "identifier": "9876543210",
  "phone": "9876543210",
  "email": "ramesh@example.com",
  "message": "Account found as vendor. Proceed to login.",
  "cooldown": { "active": false, "retry_after": null, "cooldown_seconds": 10 },
  "user": null,
  "vendor": {
    "vendor_id": 105,
    "public_id": "vnd@0105",
    "store_name": "Ramesh Daily Mart",
    "vendor_name": "Ramesh Kumar",
    "phone": "9876543210",
    "status": "active",
    "vendor_type": "product"
  }
}
```

**Frontend Logic:**
- `exists: false` — show registration screen, call `send-otp` with `purpose: "register"`
- `exists: true` — show login screen, call `send-otp` with `purpose: "login"` (or use password login)

---

### 2. Send OTP via SMS

**Endpoint**
```
POST /api/otp/mobile/send-otp
```

*Aliases:* `/api/otp/send-otp` · `/api/mobile/send-otp` · `/api/vendors/mobile/send-otp` · `/api/users/mobile/send-otp`

**Request Body**
```json
{
  "phone": "9876543210",
  "purpose": "register",
  "country_code": "+91"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | Yes | 10-digit mobile. Also: `mobile`, `phone_number` |
| `purpose` | string | Yes | `"register"` or `"login"`. Unregistered numbers are blocked in login mode |
| `country_code` | string | No | Defaults to `+91`. Also: `countryCode`, `dial_code` |
| `role` | string | Conditional | Required when `purpose` is `"login"`. Pass `"vendor"` or `"user"` |

**Response — OTP Sent — 200 OK**
```json
{
  "success": true,
  "channel": "mobile_sms",
  "provider": "message_central",
  "message": "Mobile OTP sent successfully via SMS",
  "phone": "9876543210",
  "verification_id": "12831085",
  "verificationId": "12831085",
  "cooldown_seconds": 10,
  "retry_after": 10,
  "resend_available_in_seconds": 10,
  "attempt": 1
}
```

> Save `verification_id` from this response and pass it in the verify step (optional but recommended).

**Cooldown Schedule:** 10s → 20s → 40s → 80s → 160s (doubles with each attempt)

**Response — Cooldown Active — 429 Too Many Requests**
```json
{
  "success": false,
  "error": "Please wait 20 seconds before requesting a new OTP.",
  "retry_after": 20,
  "cooldown_seconds": 20,
  "attempt": 2
}
```

**Response — Unregistered phone in login mode — 404 Not Found**
```json
{
  "success": false,
  "exists": false,
  "error": "No vendor store account found with this mobile number. Please register your account first."
}
```

---

### 3A. Verify OTP — Registration Only

Confirms OTP is valid. **Does NOT return tokens or log in the user.**
After this, call `/register` to create the account.

**Endpoints**
```
POST /api/vendors/verify-otp     Vendor App / Web
POST /api/users/verify-otp       Resident User App
POST /api/otp/verify-otp         Universal (auto-detects phone vs email)
```

*Aliases:* `/api/vendors/otp-verify` · `/api/otp/mobile/verify-otp` · `/api/users/mobile/verify-otp`

**Request Body**
```json
{
  "phone": "9876543210",
  "otp": "572914",
  "verification_id": "12831085"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | Yes | Also: `mobile`, `phone_number`, `number` |
| `otp` | string | Yes | 6-digit OTP. Also: `code`, `otp_code` |
| `verification_id` | string | No | From send-otp response. Also: `verificationId` |

**Response — OTP Valid — 200 OK**
```json
{
  "success": true,
  "verified": true,
  "valid": true,
  "channel": "mobile_sms",
  "provider": "message_central",
  "message": "Mobile OTP verified successfully",
  "phone": "9876543210",
  "phone_number": "9876543210"
}
```

**Response — OTP Invalid or Expired — 400 Bad Request**
```json
{
  "success": false,
  "verified": false,
  "valid": false,
  "error": "Invalid or expired OTP code",
  "message": "Invalid or expired OTP code"
}
```

**What to do next:** On `verified: true`, immediately call `POST /api/vendors/register` or `POST /api/users/register`.

---

### 3B. Login with OTP — Returns Tokens

Verifies OTP **and** authenticates the existing account. Returns JWT tokens + full profile.

#### Vendor OTP Login

**Endpoint**
```
POST /api/vendors/otp-login
```

*Aliases:* `/api/vendors/login-with-otp` · `/api/vendors/login-otp`

**Request Body**
```json
{
  "phone": "9876543210",
  "otp": "572914"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | Yes | Also: `mobile`, `phone_number`, `email`, `identifier` |
| `otp` | string | Yes | 6-digit OTP. Also: `code`, `otp_code` |

**Response — Login Success — 200 OK**
```json
{
  "success": true,
  "message": "Vendor login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 105,
  "public_id": "vnd@0105",
  "status": "active",
  "vendor": {
    "vendor_id": 105,
    "public_id": "vnd@0105",
    "store_name": "Ramesh Daily Mart",
    "vendor_name": "Ramesh Kumar",
    "email": "ramesh@example.com",
    "phone_number": "9876543210",
    "status": "active"
  }
}
```

**Response — Account Not Found — 404 Not Found**
```json
{
  "success": false,
  "exists": false,
  "is_registered": false,
  "code": "VENDOR_NOT_FOUND",
  "error": "No vendor store account found with this credential. Please register your vendor store first."
}
```

**Response — Account Blocked — 403 Forbidden**
```json
{
  "success": false,
  "error": "Your vendor account has been blocked by admin.",
  "code": "VENDOR_BLOCKED",
  "is_blocked": true,
  "status": "blocked"
}
```

---

#### Resident User Login (OTP or Password)

**Endpoint**
```
POST /api/users/login
```

**Request Body — OTP Login**
```json
{
  "phone": "9876543210",
  "otp": "572914"
}
```

**Request Body — Password Login**
```json
{
  "phone": "9876543210",
  "password": "MyPassword123"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | Yes | Also: `mobile`, `phone_number`, `identifier` |
| `otp` | string | One required | 6-digit OTP. Also: `code`, `otp_code` |
| `password` | string | One required | Pass either otp or password, not both |

**Response — Login Success — 200 OK**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_823856",
    "public_id": "usr@5228",
    "name": "Ananya Sharma",
    "email": "ananya@example.com",
    "phone": "9876543210",
    "status": "active",
    "is_blocked": false,
    "society_id": "1",
    "society_name": "Green Valley Society",
    "area": "Sector 62",
    "flat": "Tower A, 402",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "address": ""
  }
}
```

**Response — Not Found — 404 Not Found**
```json
{
  "exists": false,
  "error": "No user account found with mobile number 9876543210. Please register your account first."
}
```

---

### 4A. Complete Vendor Store Registration

Submit store details to create the account. Call this after `/verify-otp` returns `verified: true`.

**Endpoint**
```
POST /api/vendors/register
```

**Request Body**
```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh Daily Mart",
  "phone_number": "9876543210",
  "email": "ramesh@example.com",
  "password": "SecurePassword123",
  "whatsapp_number": "9876543210",
  "shop_number": "Shop 4, Ground Floor",
  "shop_image": "https://cdn.example.com/shop.jpg",
  "area": "Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "account_number": "123456789012",
  "ifsc_code": "SBIN0001234",
  "account_holder_name": "Ramesh Kumar",
  "bank_name": "State Bank of India",
  "upi_id": "ramesh@upi",
  "gstin": "09AAAAA0000A1Z5",
  "pan_number": "AAAAA0000A",
  "society_id": 1,
  "category": "Grocery",
  "vendor_type": "product"
}
```

**Required Fields**

| Field | Accepted Aliases | Notes |
|-------|-----------------|-------|
| `vendor_name` | `owner_name`, `name` | Owner full name |
| `store_name` | `shop_name`, `business_name` | Business name |
| `phone_number` | `mobile`, `phone` | 10-digit mobile |
| `email` | — | Valid email |
| `password` | — | Min 8 chars |
| `whatsapp_number` | `whatsapp` | WhatsApp contact |
| `shop_number` | `shop_no` | Shop number / address |
| `shop_image` | `logo` | URL to shop photo |
| `area` | `society_name`, `location_name` | Locality name |
| `city` | — | City |
| `state` | — | State |
| `pincode` | `pin_code` | 6-digit PIN |
| `account_number` | `bank_account_number` | Bank account |
| `ifsc_code` | `ifsc` | Bank IFSC code |

**Optional:** `gstin`, `pan_number`, `upi_id`, `bank_name`, `account_holder_name`, `qr_code`, `society_id`, `category`, `vendor_type` (`"product"` or `"service"`)

**Response — Success — 201 Created**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 105,
  "public_id": "vnd@0105",
  "vendor": {
    "vendor_id": 105,
    "public_id": "vnd@0105",
    "store_name": "Ramesh Daily Mart",
    "vendor_name": "Ramesh Kumar",
    "shop_number": "Shop 4, Ground Floor",
    "area": "Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "account_holder_name": "Ramesh Kumar",
    "upi_id": "ramesh@upi",
    "whatsapp_number": "9876543210",
    "vendor_type": "product",
    "can_add_items": true,
    "status": "PENDING"
  }
}
```

> **status: "PENDING"** — New vendors must be approved by Admin before the vendor panel is fully active. Save the returned tokens — the vendor can still check approval status using them.

**Response — Already Exists — 400 Bad Request**
```json
{
  "error": "An active vendor store account with this mobile number/email already exists. Please log in."
}
```

---

### 4B. Complete Resident User Registration

**Endpoint**
```
POST /api/users/register
```

**Request Body**
```json
{
  "name": "Ananya Sharma",
  "phone": "9876543210",
  "email": "ananya@example.com",
  "password": "SecurePassword123",
  "society_id": 1,
  "flat": "Tower A, 402",
  "area": "Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `phone` | Yes | Also: `mobile`, `phone_number` |
| `name` | No | Defaults to `"Resident User"` |
| `email` | No | Email address |
| `password` | No | System default set if omitted |
| `society_id` | No | Numeric society ID |
| `flat` | No | Flat / unit number |
| `area`, `city`, `state`, `pincode` | No | Location |

**Response — Success — 201 Created**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user_id": "usr_823856",
  "public_id": "usr@5228",
  "user": {
    "user_id": "usr_823856",
    "public_id": "usr@5228",
    "name": "Ananya Sharma",
    "email": "ananya@example.com",
    "phone": "9876543210",
    "status": "active",
    "is_blocked": false,
    "society_id": "1",
    "society_name": "Sector 62",
    "area": "Sector 62",
    "flat": "Tower A, 402",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "address": ""
  }
}
```

**Response — Already Exists — 400 Bad Request**
```json
{
  "error": "An account with this mobile number already exists"
}
```

---

## JWT Token Usage

```
Authorization: Bearer <accessToken>
```

| Token | Expiry | Purpose |
|-------|--------|---------|
| `accessToken` / `token` | 24 hours | All authenticated API calls |
| `refreshToken` | 90 days | Renew expired access token |

---

## HTTP Error Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `201` | Account created |
| `400` | Bad request — invalid OTP, missing fields, already registered |
| `401` | Unauthorized — wrong password |
| `403` | Forbidden — account blocked |
| `404` | Not found — account does not exist |
| `429` | OTP cooldown active |
| `500` | Server error |

---

## End-to-End Flow Diagrams

### Vendor Registration
```
Step 1  POST /api/auth/check-account
        Body: { "identifier": "9876543210" }
        Resp: { exists: false, next_action: "REGISTER" }

Step 2  POST /api/otp/mobile/send-otp
        Body: { "phone": "9876543210", "purpose": "register" }
        Resp: { success: true, verification_id: "12831085", cooldown_seconds: 10 }

Step 3  POST /api/vendors/verify-otp
        Body: { "phone": "9876543210", "otp": "572914", "verification_id": "12831085" }
        Resp: { success: true, verified: true, valid: true }

Step 4  POST /api/vendors/register
        Body: { vendor_name, store_name, phone, email, password, shop_image, ... }
        Resp: { token, accessToken, refreshToken, vendor_id, vendor: { status: "PENDING" } }
```

### Vendor Login via OTP
```
Step 1  POST /api/auth/check-account
        Body: { "identifier": "9876543210" }
        Resp: { exists: true, account_type: "vendor", next_action: "LOGIN" }

Step 2  POST /api/otp/mobile/send-otp
        Body: { "phone": "9876543210", "purpose": "login", "role": "vendor" }
        Resp: { success: true, verification_id: "12831086" }

Step 3  POST /api/vendors/otp-login
        Body: { "phone": "9876543210", "otp": "572914" }
        Resp: { token, accessToken, refreshToken, vendor_id, vendor: { ... } }
```

### Vendor Login via Password
```
Step 1  POST /api/vendors/login
        Body: { "identifier": "9876543210", "password": "SecurePassword123" }
        Resp: { token, accessToken, refreshToken, vendor_id, vendor: { ... } }
```

### Resident User Registration
```
Step 1  POST /api/auth/check-account
        Body: { "identifier": "9876543210" }
        Resp: { exists: false, next_action: "REGISTER" }

Step 2  POST /api/otp/mobile/send-otp
        Body: { "phone": "9876543210", "purpose": "register" }
        Resp: { success: true, verification_id: "12831087" }

Step 3  POST /api/users/verify-otp
        Body: { "phone": "9876543210", "otp": "572914" }
        Resp: { success: true, verified: true, valid: true }

Step 4  POST /api/users/register
        Body: { name, phone, email, password, ... }
        Resp: { token, accessToken, refreshToken, user_id, user: { status: "active" } }
```

### Resident User Login via OTP
```
Step 1  POST /api/auth/check-account
        Body: { "identifier": "9876543210" }
        Resp: { exists: true, account_type: "user", next_action: "LOGIN" }

Step 2  POST /api/otp/mobile/send-otp
        Body: { "phone": "9876543210", "purpose": "login", "role": "user" }
        Resp: { success: true, verification_id: "12831088" }

Step 3  POST /api/users/login
        Body: { "phone": "9876543210", "otp": "572914" }
        Resp: { token, accessToken, refreshToken, user: { ... } }
```

### Resident User Login via Password
```
Step 1  POST /api/users/login
        Body: { "phone": "9876543210", "password": "MyPassword123" }
        Resp: { token, accessToken, refreshToken, user: { ... } }
```

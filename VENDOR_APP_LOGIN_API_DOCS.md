# 🚀 DigiLocal Vendor App — Login & Authentication REST API Specification

> **Document Version**: `v2.5.0 (Production Master)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Vendor App Mobile & Web Frontend Developers, QA Engineers, System Integration Leads  
> **Protocol**: RESTful HTTP / JSON over TLS 1.3  
> **Production Base URL**: `https://digi-local-backend.onrender.com`  
> **Local Base URL**: `http://localhost:5000`  

---

## 📋 Table of Contents
1. [Overview & Security Architecture](#1-overview--security-architecture)
2. [Mandatory Request Headers](#2-mandatory-request-headers)
3. [Vendor Login API Specification (`POST /api/vendors/login`)](#3-vendor-login-api-specification-post-apivendorslogin)
   - [3.1 Request Endpoint & Aliases](#31-request-endpoint--aliases)
   - [3.2 Request Payload Schema](#32-request-payload-schema)
   - [3.3 HTTP 200 OK — Successful Authentication](#33-http-200-ok--successful-authentication)
   - [3.4 HTTP 400 Bad Request — Missing Credentials](#34-http-400-bad-request--missing-credentials)
   - [3.5 HTTP 401 Unauthorized — Incorrect Password](#35-http-401-unauthorized--incorrect-password)
   - [3.6 HTTP 403 Forbidden — Account Blocked by Admin](#36-http-403-forbidden--account-blocked-by-admin)
   - [3.7 HTTP 404 Not Found — Account Not Found](#37-http-404-not-found--account-not-found)
4. [SMS OTP Login & Verification Endpoints](#4-sms-otp-login--verification-endpoints)
5. [Token Refresh API (`POST /api/vendors/refresh-token`)](#5-token-refresh-api-post-apivendorsrefresh-token)
6. [Vendor Logout API (`POST /api/vendors/logout`)](#6-vendor-logout-api-post-apivendorslogout)
7. [Frontend Integration Guidelines & Code Snippets](#7-frontend-integration-guidelines--code-snippets)

---

## 1. Overview & Security Architecture

The **DigiLocal Vendor Authentication Subsystem** provides secure identity verification for store owners and merchants.

### Key Security Features:
- **Strict Password Hashing**: Passwords are validated using `bcrypt.compare` / `crypto.scrypt`. Plain-text login bypasses are strictly disabled.
- **Multi-Identifier Support**: Merchants can authenticate using their **Email Address**, **10-Digit Mobile Number**, or **Numeric Vendor ID**.
- **Cross-Role Resident Capability**: Vendors (even if pending approval or on hold) automatically possess Resident User access capabilities (`status: 'ACTIVE'`) to browse and place orders on the platform.
- **JWT Authorization**: Returns an HMAC-SHA256 Access Token valid for 24 hours and a Refresh Token valid for 90 days.

---

## 2. Mandatory Request Headers

All requests sent to the Vendor Login API MUST include standard HTTP headers:

```http
Content-Type: application/json
Accept: application/json
X-Platform-Client: vendor_app
```

---

## 3. Vendor Login API Specification (`POST /api/vendors/login`)

### 3.1 Request Endpoint & Aliases

- **Primary Route**: `POST /api/vendors/login`
- **Supported Aliases**:
  - `POST /api/vendor/login`
  - `POST /api/stores/login`

---

### 3.2 Request Payload Schema

The backend accepts flexible payload keys to accommodate different frontend naming conventions:

| Field Name | Type | Required | Description | Accepted Key Aliases |
|---|---|---|---|---|
| `email` | `string` | **Yes** (or phone/ID) | Vendor registered email address or mobile number | `identifier`, `phone`, `mobile`, `phone_number` |
| `password` | `string` | **Yes** | Vendor account plaintext password | `pass` |

#### Sample Request Body (Email & Password):
```json
{
  "email": "freshmart@gmail.com",
  "password": "StorePassword123!"
}
```

#### Sample Request Body (Mobile Number & Password):
```json
{
  "phone": "9509512187",
  "password": "StorePassword123!"
}
```

---

### 3.3 HTTP 200 OK — Successful Authentication

Returned when both the identifier exists and the password verification succeeds.

#### Response Headers:
```http
HTTP/1.1 200 OK
Content-Type: application/json
```

#### Response Body Schema:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIxNywidmVuZG9yX2lkIjoxMjE3LCJuYW1lIjoiTG92ZWx5Iiwicm9sZSI6InZlbmRvciIsInJvbGVzIjpbInZlbmRvciIsInVzZXIiXSwiaXNWZW5kb3IiOnRydWUsImlhdCI6MTc4ODI1NTIwMCwiZXhwIjoxNzg4MzQxNjAwfQ.Signature",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIxNywidmVuZG9yX2lkIjoxMjE3LCJuYW1lIjoiTG92ZWx5Iiwicm9sZSI6InZlbmRvciIsInJvbGVzIjpbInZlbmRvciIsInVzZXIiXSwiaXNWZW5kb3IiOnRydWUsImlhdCI6MTc4ODI1NTIwMCwiZXhwIjoxNzg4MzQxNjAwfQ.Signature",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIxNywidHlwZSI6InJlZnJlc2giLCJpYXQiOjE3ODgyNTUyMDAsImV4cCI6MTc5NjAyODAwMH0.Signature",
  "vendor_id": 1217,
  "status": "active",
  "vendor": {
    "vendor_id": 1217,
    "store_name": "freshmart",
    "vendor_name": "Lovely",
    "email": "freshmart@gmail.com",
    "phone_number": "9509512187",
    "status": "active"
  }
}
```

---

### 3.4 HTTP 400 Bad Request — Missing Credentials

Returned when either the login identifier or password field is missing or empty.

#### Response Body:
```json
{
  "error": "Identifier and password are required."
}
```

---

### 3.5 HTTP 401 Unauthorized — Incorrect Password

Returned when the submitted password does not match the hashed password stored in the database.

#### Response Body:
```json
{
  "error": "Incorrect password. Please check your password and try again."
}
```

---

### 3.6 HTTP 403 Forbidden — Account Blocked by Admin

Returned if the vendor store account has been blocked or suspended by an Administrator.

#### Response Body:
```json
{
  "success": false,
  "error": "Your vendor account has been blocked by admin.",
  "code": "VENDOR_BLOCKED",
  "is_blocked": true,
  "status": "blocked",
  "message": "Your vendor store account has been blocked. Please contact customer support for assistance."
}
```

---

### 3.7 HTTP 404 Not Found — Account Not Found

Returned when no vendor record matches the submitted email, mobile number, or vendor ID.

#### Response Body:
```json
{
  "error": "No account found with this credential."
}
```

---

## 4. SMS OTP Login & Verification Endpoints

For mobile app flows supporting SMS OTP authentication:

### 4.1 Send SMS OTP (`POST /api/otp/send-otp`)
- **Payload**: `{ "phone": "9509512187", "purpose": "login" }`
- **Response (200 OK)**: `{ "success": true, "message": "OTP sent successfully" }`

### 4.2 Verify SMS OTP (`POST /api/otp/verify-otp`)
- **Payload**: `{ "phone": "9509512187", "otp": "123456" }`
- **Response (200 OK)**: `{ "success": true, "message": "OTP verified successfully" }`

---

## 5. Token Refresh API (`POST /api/vendors/refresh-token`)

- **Endpoint**: `POST /api/vendors/refresh-token`
- **Payload**: `{ "refreshToken": "<REFRESH_TOKEN>" }`
- **Response (200 OK)**:
  ```json
  {
    "accessToken": "<NEW_JWT_ACCESS_TOKEN>",
    "expiresIn": "24h"
  }
  ```

---

## 6. Vendor Logout API (`POST /api/vendors/logout`)

- **Endpoint**: `POST /api/vendors/logout`
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Logout successful"
  }
  ```

---

## 7. Frontend Integration Guidelines & Code Snippets

### React / React Native Integration Example:

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://digi-local-backend.onrender.com';

export async function loginVendor(identifier: string, password: string) {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/vendors/login`, {
      email: identifier,
      password: password
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Platform-Client': 'vendor_app'
      }
    });

    const { accessToken, refreshToken, vendor } = response.data;

    // Store tokens securely
    await localStorage.setItem('vendor_access_token', accessToken);
    await localStorage.setItem('vendor_refresh_token', refreshToken);
    await localStorage.setItem('vendor_profile', JSON.stringify(vendor));

    return { success: true, vendor };
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.error || error.response.data?.message;

      if (status === 401) {
        alert('Incorrect password. Please try again.');
      } else if (status === 403) {
        alert('Your store account has been blocked by support.');
      } else if (status === 404) {
        alert('No vendor account found with this email/phone.');
      } else {
        alert(errorMessage || 'Login failed.');
      }
    }
    return { success: false, error: error.message };
  }
}
```

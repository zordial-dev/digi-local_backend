# 📝 DigiLocal Vendor Registration — Complete API Documentation & Specification

> **Document Version**: `v3.6.0 (Vendor Onboarding Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Target Audience**: Mobile App & Web Frontend Integration Engineers  

---

## 📋 Table of Contents
1. [Overview & Onboarding Flow](#1-overview--onboarding-flow)
2. [Step 1: Area & Location Suggestions API](#step-1-area--location-suggestions-api)
3. [Step 2: Phone Verification & OTP Flow](#step-2-phone-verification--otp-flow)
4. [Step 3: Vendor Registration API](#step-3-vendor-registration-api)
5. [Step 4: Vendor Approval Status Check API](#step-4-vendor-approval-status-check-api)
6. [Step 5: Resubmit On-Hold Request API](#step-5-resubmit-on-hold-request-api)
7. [Field Validation & Error Codes Summary](#7-field-validation--error-codes-summary)

---

## 1. Overview & Onboarding Flow

```
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│ 1. Area Suggestions     │ ──>│ 2. Phone Check & OTP    │ ──>│ 3. Submit Registration  │
│ GET /api/locations      │    │ POST /vendors/send-otp  │    │ POST /vendors/register  │
└─────────────────────────┘    └─────────────────────────┘    └─────────────────────────┘
                                                                           │
                                                                           ▼
┌─────────────────────────┐                                    ┌─────────────────────────┐
│ 5. Resubmit if On-Hold  │ <───────────────────────────────── │ 4. Check Admin Status   │
│ POST /vendors/resubmit  │                                    │ GET /vendors/status     │
└─────────────────────────┘                                    └─────────────────────────┘
```

When a merchant registers:
1. The account is created with `status: "PENDING"`.
2. Admin reviews the request in the Admin Panel dashboard.
3. An active Resident User account (`usr_v_<vendor_id>`) is automatically created in PostgreSQL so the merchant can immediately browse the storefront.

---

## Step 1: Area & Location Suggestions API

### `GET /api/locations` or `GET /api/vendors/locations/suggestions`

Queries the database `locations` table ONLY to supply autocomplete dropdown suggestions during vendor signup.

#### Query Parameters (Optional):
- `query` or `q`: Search keyword (e.g. `noida`, `sector 62`, `jaipur`).

#### Request Example:
```http
GET /api/locations?q=Sector 62
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "locations": [
    {
      "location_id": 1,
      "area": "Sector 62 Commercial Area",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    }
  ]
}
```

---

## Step 2: Phone Verification & OTP Flow

### A. Check Phone Availability (`POST /api/vendors/check-phone`)

Validates if the phone number is already registered or available for a new merchant account.

#### Request Body:
```json
{
  "phone": "9509512187"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "exists": false,
  "available": true,
  "message": "Phone number is available for registration."
}
```

---

### B. Send OTP (`POST /api/vendors/send-otp`)

Sends a 4-digit verification code to the merchant's mobile number.

#### Request Body:
```json
{
  "phone": "9509512187"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "OTP sent successfully to 9509512187"
}
```

---

### C. Verify OTP (`POST /api/vendors/verify-otp`)

Verifies the 4-digit OTP code entered by the user.

#### Request Body:
```json
{
  "phone": "9509512187",
  "otp": "1234"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "OTP verified successfully."
}
```

---

## Step 3: Vendor Registration API

### `POST /api/vendors/register`

Submits the complete merchant onboarding application.

#### Headers:
```http
Content-Type: application/json
Accept: application/json
```

#### Request Payload Schema:

```json
{
  "vendor_name": "Lovely Jain",
  "store_name": "FreshMart Super Store",
  "email": "freshmart@gmail.com",
  "phone_number": "9509512187",
  "password": "SecurePassword123!",
  "whatsapp_number": "919509512187",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "shop_number": "Shop No. 12, Main Market",
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
  "gstin": "08ABCDE1234F1Z5",
  "pan_number": "ABCDE1234F",
  "vendor_type": "product",
  "category": "Grocery & Daily Needs",
  "society_name": "Omaxe Greenwood Residency",
  "account_holder_name": "Lovely Jain",
  "bank_name": "HDFC Bank",
  "account_number": "50100492817291",
  "ifsc_code": "HDFC0001234",
  "upi_id": "9509512187@upi",
  "qr_code_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
  "accepted_payment_methods": ["UPI", "COD"]
}
```

#### Mandatory Fields Checklist:
| Field Name | Type | Description |
|---|---|---|
| `vendor_name` | `string` | Merchant owner name |
| `store_name` | `string` | Shop / Business name |
| `email` | `string` | Login email address |
| `phone_number` | `string` | Primary contact mobile number |
| `password` | `string` | Password |
| `whatsapp_number` | `string` | WhatsApp order contact number |
| `area` | `string` | Locality / Sector name |
| `city` | `string` | City name |
| `state` | `string` | State name |
| `pincode` | `string` | 6-digit postal code |
| `shop_number` | `string` | Shop unit number / street address |
| `shop_image` | `string` | Store photo URL |
| `gstin` OR `pan_number` | `string` | GSTIN (15 chars) OR PAN (10 chars) |

---

#### Response (`HTTP 201 Created`):

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "vendor_id": 1217,
  "vendor": {
    "vendor_id": 1217,
    "store_name": "FreshMart Super Store",
    "vendor_name": "Lovely Jain",
    "email": "freshmart@gmail.com",
    "phone_number": "9509512187",
    "whatsapp_number": "919509512187",
    "status": "PENDING",
    "vendor_type": "product",
    "can_add_items": true,
    "area": "Sector 62 Commercial Area",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301"
  },
  "message": "Vendor registration submitted successfully! Account is pending admin approval."
}
```

---

## Step 4: Vendor Approval Status Check API

### `GET /api/vendors/status` or `GET /api/vendors/status/:vendorId`

#### Query Parameters:
- `phone`: Mobile number (e.g., `9509512187`)
- `vendor_id`: Vendor numeric ID (e.g., `1217`)

#### Request Example:
```http
GET /api/vendors/status?phone=9509512187
```

#### Response Example (`PENDING` Approval):
```json
{
  "status": "PENDING",
  "vendor_id": 1217,
  "store_name": "FreshMart Super Store",
  "vendor_name": "Lovely Jain",
  "message": "Your registration application is under admin review."
}
```

#### Response Example (`ON_HOLD` with feedback):
```json
{
  "status": "hold",
  "vendor_id": 1217,
  "hold_reason": "Please upload a clearer photo of your shop storefront.",
  "hold_email_subject": "Additional Document Required for DigiLocal Verification",
  "has_resubmitted": false,
  "message": "Application is on hold. Please update required details and resubmit."
}
```

---

## Step 5: Resubmit On-Hold Request API

### `POST /api/vendors/resubmit` or `PUT /api/vendors/resubmit`

Allows an `ON_HOLD` vendor to submit updated photos, GSTIN/PAN, or address information for re-review.

#### Request Body:
```json
{
  "vendor_id": 1217,
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
  "gstin": "08ABCDE1234F1Z5",
  "address": "Shop No. 12, Main Market, Sector 62, Noida"
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Application resubmitted successfully for admin re-evaluation.",
  "status": "PENDING"
}
```

---

## 7. Field Validation & Error Codes Summary

| HTTP Status | Error Message | Action Required |
|---|---|---|
| `400 Bad Request` | `Vendor / owner_name is required for registration.` | Supply `vendor_name` |
| `400 Bad Request` | `Store / shop_name is required for registration.` | Supply `store_name` |
| `400 Bad Request` | `GSTIN or PAN number is a mandatory field...` | Supply `gstin` or `pan_number` |
| `400 Bad Request` | `A shop with this name already exists in this society.` | Choose a unique store name |
| `400 Bad Request` | `Phone number is already registered to another vendor.` | Use a different phone number |

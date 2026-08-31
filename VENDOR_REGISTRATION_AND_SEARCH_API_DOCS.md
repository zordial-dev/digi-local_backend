# 📖 DigiLocal Platform — Vendor Registration, Bank Payment Settings & Area Search API Documentation

This document specifies the complete API specifications, request payloads, field constraints, response outputs, and lifecycle rules for **Vendor Onboarding**, **Post-Registration Bank & Payment Settings Update**, and **Public Area Store Search**.

---

## 📋 Table of Contents
1. [Vendor Registration API (`POST /api/vendors/register`)](#1-vendor-registration-api)
2. [Post-Registration Bank & Payment Settings API (`PUT /api/vendorPanel/payment-details`)](#2-post-registration-bank--payment-settings-api)
3. [Public Area Vendor Search API (`GET /api/vendors`)](#3-public-area-vendor-search-api)
4. [Vendor Lifecycle & Approval Rules](#4-vendor-lifecycle--approval-rules)

---

## 1. Vendor Registration API

Registers a new vendor merchant (shop). The registration request is placed in **`PENDING`** status awaiting Admin shop approval. 

> [!NOTE]
> - **Portal Access**: The vendor **CAN log in and access their vendor portal** immediately while in `PENDING` status to add catalog items or configure store settings.
> - **User App Visibility**: The vendor shop **WILL NOT BE VISIBLE TO CUSTOMERS / USERS** in public search until the Admin approves the shop.
> - **Bank Details**: Bank details (`account_number`, `ifsc_code`, `upi_id`) are **OPTIONAL** during registration and can be added later from Web/App settings.

- **Route**: `POST /api/vendors/register` *(Legacy Alias: `POST /registerVender`)*
- **Authentication**: None (Public Endpoint)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  X-Platform-Client: vendor_app
  ```

### Request Payload (JSON)

```json
{
  "vendor_name": "Rajesh Sharma",
  "store_name": "FreshBites Daily Grocery",
  "email": "rajesh.freshbites@gmail.com",
  "phone_number": "9876543210",
  "password": "SecureVendorPass123!",
  "area": "Sector 62 Noida Hub",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201309",
  "whatsapp_number": "9876543210",
  "shop_number": "Shop #12, Ground Floor",
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
  "category": "Grocery & Staples",
  "gstin": "07AAAAA140001Z5",
  "pan_number": "ABCDE1234F",
  "account_number": "918273645019",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "account_holder_name": "Rajesh Sharma",
  "upi_id": "freshbites@upi"
}
```

### Registration Field Specification

| Field Name | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `vendor_name` | String | **MANDATORY** | Full name of shop owner / merchant. *(Aliases: `owner_name`, `vendorName`)* |
| `store_name` | String | **MANDATORY** | Name of the shop / store. *(Aliases: `shop_name`, `business_name`)* |
| `email` | String | **MANDATORY** | Merchant login & contact email address. |
| `phone_number` | String | **MANDATORY** | Merchant 10-digit mobile number. *(Aliases: `phone`, `mobile`)* |
| `password` | String | **MANDATORY** | Merchant account login password. |
| `area` | String | **MANDATORY** | Operational location area name *(e.g. `'Sector 62 Noida Hub'`)*. *(Aliases: `society_name`, `location_name`)* |
| `city` | String | **MANDATORY** | City name *(e.g. `'Noida'`)*. |
| `state` | String | **MANDATORY** | State name *(e.g. `'Uttar Pradesh'`)*. |
| `pincode` | String | **MANDATORY** | 6-digit postal code *(e.g. `'201309'`)*. |
| `whatsapp_number` | String | **MANDATORY** | WhatsApp ordering number. *(Aliases: `whatsapp`)* |
| `shop_number` | String | **MANDATORY** | Shop number / block / unit address. *(Aliases: `shopNumber`, `shop_no`)* |
| `shop_image` | String | **MANDATORY** | Shop photo / banner URL (captured via camera or gallery). *(Aliases: `logo`, `image_url`)* |
| `category` | String | Optional | Merchant category *(e.g. `'Grocery & Staples'`, `'Dairy & Milk'`, `'Bakery'`)*. *(Default: `'General'`)* |
| `gstin` | String | **MANDATORY** *(either GSTIN or PAN)* | GST Identification Number. *(Aliases: `gst_number`, `gst`)* |
| `pan_number` | String | **MANDATORY** *(either GSTIN or PAN)* | PAN Number. *(Aliases: `pan`, `panNumber`)* |
| `account_number` | String | Optional | Bank account number for payouts. Can be added post-registration. |
| `ifsc_code` | String | Optional | Bank IFSC code. Can be added post-registration. |
| `bank_name` | String | Optional | Name of the bank. |
| `account_holder_name`| String | Optional | Name on bank account. |
| `upi_id` | String | Optional | Merchant UPI payment ID *(e.g. `'apnastore@upi'`)*. |

---

### Response Outputs

#### Success Response (`201 Created`)

```json
{
  "success": true,
  "message": "Vendor merchant registration submitted successfully. Application is pending admin approval.",
  "data": {
    "vendor_id": 105,
    "vendor_name": "Rajesh Sharma",
    "store_name": "FreshBites Daily Grocery",
    "email": "rajesh.freshbites@gmail.com",
    "phone_number": "+91 9876543210",
    "category": "Grocery & Staples",
    "area": "Sector 62 Noida Hub",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
    "whatsapp_number": "9876543210",
    "shop_number": "Shop #12, Ground Floor",
    "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "gstin": "07AAAAA140001Z5",
    "pan_number": "ABCDE1234F",
    "status": "pending",
    "created_at": "2026-08-31T12:45:00.000Z"
  },
  "timestamp": "2026-08-31T12:45:00.000Z",
  "request_id": "req_1787828700000"
}
```

#### Error Response (`400 Bad Request` — Missing Mandatory Field)

```json
{
  "error": "Shop photo / image is a mandatory field for vendor registration."
}
```

---

## 2. Post-Registration Bank & Payment Settings API

Allows vendors (in either **`PENDING`** or **`ACTIVE`** status) to set or update their bank account details and UPI payment settings from the Web or App settings portal at any time after registering.

- **Primary Routes**: 
  - `PUT /api/vendorPanel/payment-details`
  - `PUT /api/vendors/payment-details`
  - `PUT /api/vendorPanel/:vendorId/payment-details`
  - `PUT /api/vendors/:vendorId/payment-details`
- **Authentication**: Vendor Auth Token Required (or `vendor_id` in request body/params)
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

### Request Payload (JSON)

```json
{
  "vendor_id": 105,
  "account_number": "918273645019",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "account_holder_name": "Rajesh Sharma",
  "upi_id": "freshbites@upi",
  "qr_code_url": "https://imgh.in/host/vendor_upi_qr.png"
}
```

### Payment Settings Field Specification

| Field Name | Type | Constraint | Description |
| :--- | :--- | :--- | :--- |
| `vendor_id` | Number/String | Optional | Target vendor ID (inferred from JWT token if omitted). |
| `account_number` | String | Optional | Bank account number. *(Aliases: `bank_account_number`, `accountNumber`)* |
| `ifsc_code` | String | Optional | Bank IFSC code. *(Aliases: `ifsc`, `ifscCode`)* |
| `bank_name` | String | Optional | Name of the bank. *(Aliases: `bankName`, `bank`)* |
| `account_holder_name`| String | Optional | Name as listed on bank account. *(Alias: `accountHolderName`)* |
| `upi_id` | String | Optional | Merchant UPI payment VPA ID *(e.g. `merchant@upi`)*. |
| `qr_code_url` | String | Optional | Custom QR code image URL for UPI payments. |

---

### Response Outputs

#### Success Response (`200 OK`)

```json
{
  "success": true,
  "message": "Bank account and payment details updated successfully.",
  "data": {
    "vendor_id": 105,
    "account_number": "918273645019",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "account_holder_name": "Rajesh Sharma",
    "upi_id": "freshbites@upi",
    "qr_code_url": "https://imgh.in/host/vendor_upi_qr.png"
  }
}
```

---

## 3. Public Area Vendor Search API

Search and list active vendor shops operating within a specified location area or category for customers/users.

> [!IMPORTANT]
> - **Pending Filter**: Vendors with `status = 'PENDING'` are **automatically excluded from customer search results**. Only vendors with `status = 'ACTIVE'` are returned.

- **Primary Route**: `GET /api/vendors` *(Aliases: `GET /api/admin/vendors`, `GET /api/stores`)*
- **Storefront Area Route**: `GET /api/societies/:societyId/vendors`
- **Authentication**: None (Public)

### Query Parameters

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `area` | String | Optional | Filter by location area name or search string | `?area=Sector+62` |
| `search` | String | Optional | Search in store name, owner name, category, or area | `?search=FreshBites` |
| `location_id` | Number | Optional | Filter by Location ID | `?location_id=1` |
| `status` | String | Optional | Vendor status filter (`'active'`, `'pending'`, `'all'`). Public calls default to `'active'`. | `?status=active` |
| `category` | String | Optional | Filter by store category | `?category=Grocery+%26+Staples` |
| `page` | Number | Optional | Page number | `?page=1` |
| `limit` | Number | Optional | Items limit per page | `?limit=20` |

---

### Response Output (`200 OK`)

```json
{
  "success": true,
  "message": "Vendors list retrieved successfully.",
  "data": [
    {
      "vendor_id": 105,
      "id": 105,
      "store_name": "FreshBites Daily Grocery",
      "owner_name": "Rajesh Sharma",
      "email": "rajesh.freshbites@gmail.com",
      "phone": "+91 9876543210",
      "category": "Grocery & Staples",
      "location_id": 1,
      "society_id": 1,
      "area": "Sector 62 Noida Hub",
      "society_name": "Sector 62 Noida Hub",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201309",
      "whatsapp_number": "9876543210",
      "shop_number": "Shop #12, Ground Floor",
      "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
      "gstin": "07AAAAA140001Z5",
      "pan_number": "ABCDE1234F",
      "status": "active",
      "created_at": "2026-08-31T12:45:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "timestamp": "2026-08-31T12:46:00.000Z",
  "request_id": "req_1787828760000"
}
```

---

## 4. Vendor Lifecycle & Approval Rules

| Vendor Event | Trigger / Route | Vendor Portal Access | Customer Visibility | Database Action |
| :--- | :--- | :--- | :--- | :--- |
| **Registration** | `POST /api/vendors/register` | **Allowed** (`PENDING` account can log in & add items/settings) | **Hidden** (Store is not shown in user search) | Vendor row created with `status = 'PENDING'` |
| **Bank/Payment Update** | `PUT /api/vendorPanel/payment-details` | **Allowed** | **Hidden** (while pending) | Updates bank account & UPI fields |
| **Admin Shop Approval** | `POST /api/admin/requests/:vendorId/approve` | **Allowed** | **Visible** (Store becomes active for users) | Sets `status = 'ACTIVE'`; auto-creates/links `area` in `locations` table |
| **Admin Shop Rejection** | `POST /api/admin/requests/:vendorId/reject` | **Blocked** (Vendor cannot log in) | **Hidden** | **Vendor row & catalog items are permanently deleted from database** |

# 📢 FRONTEND NOTICE & API DOCS: Shop Number Payload Guarantee & Vendor Resubmission Specification

> **Document Version**: `v4.3.0 (Shop Number & Resubmit Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Vendor App Developers, Storefront Developers, Admin Panel Developers (`adminMock`)  
> **Effective Date**: Immediate  

---

## 🏬 Part 1: `shop_number` & `address` Field Standardization

### Summary of Changes:
- **`shop_number` Payload Guarantee**: All vendor endpoints (`Registration`, `Login`, `Status Check`, `Dashboard`, `Storefront Profile`, `Admin Panel Vendor List`) now return `shop_number` (and alias `shop_no`) containing the exact shop identifier entered during registration (e.g., `"Shop 101"` or `"Shop 42"`).
- **Separation of Address & Shop Number**: The `address` field contains the store address (or defaults to `shop_number` if address was left empty during quick registration), while `shop_number` strictly holds the shop identifier.

### Example Vendor API Response Payload (`POST /api/vendors/login` or `GET /api/vendorPanel/:vendorId`)

```json
{
  "vendor_id": 1216,
  "vendor_name": "Aarushi",
  "store_name": "Flower's Point",
  "shop_number": "Shop 101",
  "shop_no": "Shop 101",
  "address": "Shop 101, Sector 62 Commercial Area",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "country_code": "+91",
  "phone_number": "9784319840",
  "status": "ACTIVE"
}
```

---

## 🔄 Part 2: Vendor Application Resubmission Specification

When a vendor’s registration application is **`REJECTED`** or placed on **`HOLD`** by an Admin, there are **two supported ways** for the merchant to resubmit updated store details for review:

### Method A (Recommended Best Practice): Standard Registration API (`POST /api/vendors/register`)

Merchants can use the standard registration form in the Vendor App without needing a separate UI screen.

#### Request Body (`POST /api/vendors/register`)
```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh General Store Updated",
  "email": "ramesh.store@gmail.com",
  "phone_number": "9876543210",
  "password": "Password123!",
  "gstin": "08ABCDE1234F1Z5",
  "pan_number": "",
  "area": "Bais Godam",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "whatsapp_number": "9876543210",
  "shop_number": "Shop 42-B",
  "shop_image": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400"
}
```

#### Backend Action & Response (`HTTP 201 Created` / `200 OK`)
- Detects the existing rejected account for `9876543210`.
- Updates store details, shop photo, shop number, address, and password.
- Sets `status = 'PENDING'`, `has_resubmitted = true`, and `resubmitted_at = CURRENT_TIMESTAMP`.
- Issues new JWT tokens so the merchant can immediately log in to track approval progress.

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 1225,
  "vendor": {
    "vendor_id": 1225,
    "store_name": "Ramesh General Store Updated",
    "vendor_name": "Ramesh Kumar",
    "shop_number": "Shop 42-B",
    "shop_no": "Shop 42-B",
    "address": "Shop 42-B, Bais Godam",
    "status": "PENDING"
  }
}
```

---

### Method B: Dedicated Resubmit Endpoint (`POST /api/vendors/resubmit` or `POST /api/vendors/:vendorId/resubmit`)

Used when a logged-in vendor clicks a "Resubmit Application" button on their Status/Review screen.

#### Request Body (`POST /api/vendors/resubmit`)
```json
{
  "vendor_id": 1225,
  "store_name": "Ramesh General Store Updated",
  "shop_number": "Shop 42-B",
  "shop_image": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400",
  "gstin": "08ABCDE1234F1Z5"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "vendor_id": 1225,
  "status": "pending",
  "has_resubmitted": true,
  "message": "Your application has been resubmitted successfully for Admin review."
}
```

---

## 📱 Developer Announcement / SMS Notice Text

Below is the copy-paste SMS / Slack announcement message for frontend developers:

```text
📢 [FRONTEND UPDATE NOTICE - SHOP NUMBER & VENDOR RESUBMIT APIs]
1. Shop Number Payload Guarantee:
   - All vendor APIs (Registration, Login, Dashboard, Storefront, Admin Panel) now explicitly return `shop_number` and `shop_no` with the exact shop number entered during registration.
2. Vendor Re-Application for Rejected Applications:
   - Standard Registration API (POST /api/vendors/register) now seamlessly updates existing REJECTED/HOLD vendor records and resets status to PENDING for Admin review.
   - Dedicated Resubmit API (POST /api/vendors/resubmit) is also available for logged-in status review screens.
```

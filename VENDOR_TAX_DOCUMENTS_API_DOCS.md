# 📄 Vendor Tax Documents (GSTIN & PAN) API Specification & Integration Guide (v1.0.0)

> **Document Version**: v1.0.0 (Optional GSTIN & PAN Specification)  
> **Target Audience**: Merchant Vendor App Developers (`vendor-portal`), Admin Panel Developers (`adminMock`), Resident App & Web Developers (`user-app`)  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  

---

## 📋 Key Business Rules

1. **Both `gstin` and `pan_number` are 100% Optional**:
   - Frontend forms do **NOT** require both fields. A merchant can register or update their store with:
     - **GSTIN only** (e.g. `08ABCDE1234F1Z5`)
     - **PAN Card only** (e.g. `AYHDH1234A`)
     - **Both GSTIN and PAN**
     - **Neither** (if registering prior to tax document upload)

2. **Strict Value Isolation (No Dummy/Fallback Values)**:
   - The backend will **NEVER** inject dummy placeholders or copy `pan_number` into `gstin`/`gst_number`.
   - If a vendor has **only PAN**, the API response returns `pan_number: "AYHDH1234A"` and `gstin: ""`.
   - If a vendor has **only GSTIN**, the API response returns `gstin: "08ABCDE1234F1Z5"` and `pan_number: ""`.
   - If neither is provided, both return empty strings `""`.

---

## 📡 API Payload & Response Specifications

### 1. Vendor Registration (`POST /api/vendors/register`)

#### Request Body Examples:

**Scenario A: Frontend sends PAN only**
```json
{
  "vendor_name": "Raj kumar",
  "store_name": "Rajkumar hero",
  "phone_number": "7568021054",
  "email": "rajkumar@gmail.com",
  "password": "Password123",
  "pan_number": "AYHDH1234A",
  "shop_number": "69",
  "area": "Rajapark",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302004",
  "whatsapp_number": "7568021054",
  "shop_image": "https://storage.digilocal.in/shops/shop_69.jpg"
}
```

**Scenario B: Frontend sends GSTIN only**
```json
{
  "vendor_name": "Aarushi Verma",
  "store_name": "Flower's Point",
  "phone_number": "9784319840",
  "email": "aarushi@gmail.com",
  "password": "Password123",
  "gstin": "08ABCDE1234F1Z5",
  "shop_number": "101",
  "area": "Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "whatsapp_number": "9784319840",
  "shop_image": "https://storage.digilocal.in/shops/flower_point.jpg"
}
```

---

### 2. Vendor Profile & Dashboard (`GET /api/vendorPanel/:vendorId`)

#### Response Example (When Vendor registered with PAN only):
```json
{
  "vendor": {
    "vendor_id": 1241,
    "shop_id": "1241",
    "id": 1241,
    "vendor_name": "Raj kumar",
    "store_name": "Rajkumar hero",
    "phone_number": "7568021054",
    "email": "rajkumar@gmail.com",
    "gstin": "",
    "gst_number": "",
    "pan_number": "AYHDH1234A",
    "status": "pending",
    "created_at_readable": "02 Sep 2026, 04:36 pm IST"
  },
  "items": [],
  "orders": []
}
```

---

### 3. Storefront Vendor Details (`GET /api/vendors/:vendorId`)

#### Response Example (When Vendor registered with GSTIN only):
```json
{
  "success": true,
  "data": {
    "vendor_id": 1216,
    "shop_id": "1216",
    "id": 1216,
    "vendor_name": "Aarushi Verma",
    "store_name": "Flower's Point",
    "gstin": "08ABCDE1234F1Z5",
    "gst_number": "08ABCDE1234F1Z5",
    "pan_number": "",
    "category": "Grocery",
    "vendor_type": "product"
  }
}
```

---

### 4. Admin Vendor Profile View (`GET /api/admin/vendors/:id`)

#### Response Example:
```json
{
  "code": 200,
  "status": "success",
  "data": {
    "vendor_id": 1241,
    "id": 1241,
    "owner_name": "Raj kumar",
    "store_name": "Rajkumar hero",
    "phone_number": "7568021054",
    "gstin": "",
    "gst_number": "",
    "pan_number": "AYHDH1234A",
    "status": "pending"
  }
}
```

---

## 💡 Summary Checklist for Frontend Developers

1. **Form Input Fields**:
   - Mark both `GSTIN` and `PAN Card` inputs as **(Optional)** in registration & store profile forms.
2. **Conditional Rendering**:
   - In Vendor Profile UI: Render GSTIN badge if `vendor.gstin !== ""`. Render PAN badge if `vendor.pan_number !== ""`.
3. **No Validation Blocking**:
   - Users can proceed with registration by filling either field (or neither if pending tax document upload).

# 📢 FRONTEND NOTICE & API DOCS: Flexible GSTIN or PAN Vendor Registration

> **Document Version**: `v3.8.0 (Flexible Tax ID Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Vendor Mobile App Developers, Admin Panel Developers (`adminMock`)  
> **Effective Date**: Immediate  

---

## 📋 Summary of Tax Identifier Policy

When registering a new vendor (`POST /api/vendors/register`), merchants are required to provide **at least ONE** valid tax identifier (**either GSTIN or PAN**):

1. **DB Fields**: The database contains two distinct columns: `gstin` and `pan_number`.
2. **Flexible Storage**:
   - If the merchant provides **GSTIN only**, `gstin` is stored in the DB and `pan_number` remains empty (`""` / `null`).
   - If the merchant provides **PAN only**, `pan_number` is stored in the DB and `gstin` remains empty (`""` / `null`).
   - If the merchant provides **both**, both fields are stored as entered.
3. **No Auto-Extraction**: The backend will not auto-populate or mutate omitted tax fields.

---

## 📡 Registration Request & Response Payload Examples (`POST /api/vendors/register`)

### Scenario A: Vendor Registers with GSTIN Only

#### Request Body (`POST /api/vendors/register`)
```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh General Store",
  "email": "ramesh.store@gmail.com",
  "phone_number": "9876543210",
  "password": "Password123!",
  "gstin": "08ABCDE1234F1Z5",
  "area": "Bais Godam",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "whatsapp_number": "9876543210",
  "shop_number": "Shop 42",
  "shop_image": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400"
}
```

#### Admin Panel Output (`GET /api/admin/vendors/1225`)
```json
{
  "vendor_id": 1225,
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh General Store",
  "email": "ramesh.store@gmail.com",
  "country_code": "+91",
  "phone_number": "9876543210",
  "whatsapp_number": "9876543210",
  "gstin": "08ABCDE1234F1Z5",
  "pan_number": "",
  "shop_number": "Shop 42",
  "area": "Bais Godam",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "status": "PENDING"
}
```

---

### Scenario B: Vendor Registers with PAN Only

#### Request Body (`POST /api/vendors/register`)
```json
{
  "vendor_name": "Sita Devi",
  "store_name": "Sita Dairy",
  "email": "sita.dairy@gmail.com",
  "phone_number": "9123456789",
  "password": "Password123!",
  "pan_number": "ABCDE1234F",
  "area": "Jagatpura",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302017",
  "whatsapp_number": "9123456789",
  "shop_number": "Shop 101",
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"
}
```

#### Admin Panel Output (`GET /api/admin/vendors/1226`)
```json
{
  "vendor_id": 1226,
  "vendor_name": "Sita Devi",
  "store_name": "Sita Dairy",
  "email": "sita.dairy@gmail.com",
  "country_code": "+91",
  "phone_number": "9123456789",
  "whatsapp_number": "9123456789",
  "gstin": "",
  "pan_number": "ABCDE1234F",
  "shop_number": "Shop 101",
  "area": "Jagatpura",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302017",
  "status": "PENDING"
}
```

---

## 📱 Developer Announcement / SMS Notice Text

Below is the copy-paste SMS / Slack announcement message for frontend developers:

```text
📢 [FRONTEND UPDATE NOTICE - VENDOR TAX IDENTIFIERS]
Vendor registration (POST /api/vendors/register) now accepts EITHER GSTIN OR PAN:
- Vendors can enter either gstin or pan_number (at least one is required).
- The database stores whichever field is provided and keeps the unprovided field empty ("").
- No mandatory requirement to enter both tax IDs.
```

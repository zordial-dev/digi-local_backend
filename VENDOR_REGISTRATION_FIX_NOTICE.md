# 📢 DIGILOCAL BACKEND NOTICE: Vendor Registration Fix & Cleaned Response Payload

> **Document Version**: `v3.8.0 (Vendor Registration Specification Update)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Website Developers, Merchant Mobile App Developers  
> **Effective Date**: Immediate  

---

## 📋 Summary of Vendor Registration Fix

The **Vendor Registration API** (`POST /api/vendors/register`) has been updated to align with the **v3.0.0 Location & Coverage Specification**:

1. ❌ **Removed 4 Obsolete Location Fields from Request & Response**:
   - The following 4 fields are no longer present on `vendors` database table and have been removed from the registration payload:  
     `location_type`, `is_global_coverage`, `delivery_radius_km`, `selected_zones`
2. 📍 **Standard Location Fields Preserved**:
   - Onboarding location data relies on: `area`, `city`, `state`, `pincode`, `shop_number`, `society_name` / `society_id`.
3. ⚡ **Instant HTTP 201 Response**:
   - Registration now executes cleanly returning `201 Created` with JWT session tokens and `vendor_id`.

---

## 📡 Updated Vendor Registration Request Example (`POST /api/vendors/register`)

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
  "accepted_payment_methods": ["UPI", "COD"]
}
```

---

## 📦 Updated Vendor Registration Response Example (`HTTP 201 Created`)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "vendor_id": 1221,
  "vendor": {
    "vendor_id": 1221,
    "store_name": "FreshMart Super Store",
    "vendor_name": "Lovely Jain",
    "email": "freshmart@gmail.com",
    "phone_number": "9509512187",
    "whatsapp_number": "919509512187",
    "gstin": "08ABCDE1234F1Z5",
    "pan_number": "ABCDE1234F",
    "account_holder_name": "Lovely Jain",
    "accepted_payment_methods": ["UPI", "COD"],
    "vendor_type": "product",
    "can_add_items": true,
    "status": "PENDING"
  }
}
```

---

## 🛠️ Actions Required by Frontend Teams

- **No action required if using standard address inputs** (`area`, `city`, `state`, `pincode`).
- If your registration form previously sent `location_type` or `is_global_coverage` in JSON payload, you may safely omit them.

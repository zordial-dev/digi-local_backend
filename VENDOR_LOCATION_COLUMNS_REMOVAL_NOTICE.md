# 📢 FRONTEND NOTICE: Removal of Obsolete Vendor Location Columns

> **Document Version**: `v3.0.0 (Architecture Cleanup Notice)`  
> **Status**: APPROVED & APPLIED IN DATABASE  
> **Target Audience**: Vendor Mobile App Developers, Website Frontend Developers, Admin Panel Developers  
> **Effective Date**: Immediate  

---

## 📋 Summary of Changes

The following 6 legacy location & coverage columns have been **permanently dropped** from the PostgreSQL `vendors` table and backend API payloads:

1. ❌ `latitude` (NUMERIC) — *Removed*
2. ❌ `longitude` (NUMERIC) — *Removed*
3. ❌ `location_type` (VARCHAR) — *Removed*
4. ❌ `is_global_coverage` (BOOLEAN) — *Removed*
5. ❌ `delivery_radius_km` (NUMERIC) — *Removed*
6. ❌ `selected_zones` (JSONB) — *Removed*

---

## 🎯 Updated Vendor Location & Coverage Architecture

Vendor location mapping is now standardized purely on:
- **`society_id`**: Associated Housing Society ID
- **`area`**: Area / Sector Name (e.g., `"Sector 62 Commercial Area"`)
- **`city`**: City Name (e.g., `"Noida"`)
- **`state`**: State Name (e.g., `"Uttar Pradesh"`)
- **`pincode`**: Postal Code (e.g., `"201301"`)
- **`location_address` / `address`**: Physical Street Address

---

## 📡 Updated API Payloads & Endpoints

### 1. Vendor Location & Address Update (`PUT /api/vendors/:vendorId/coverage`)

#### Updated Request Payload:
```json
{
  "area": "Sector 62 Commercial Area",
  "location": "Sector 62 Commercial Area",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "location_address": "Shop 12, Main Market, Sector 62, Noida, 201301"
}
```

#### Updated Response Payload (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Vendor location settings updated successfully",
  "vendor_id": 1217,
  "area": "Sector 62 Commercial Area",
  "location": "Sector 62 Commercial Area",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "location_address": "Shop 12, Main Market, Sector 62, Noida, 201301"
}
```

---

### 2. Frontend Storefront Vendors API (`GET /api/societies/:societyId/vendors`)

Vendors are now matched directly by `society_id` or search term (`search` query parameter). Legacy global coverage zone filtering has been removed.

---

### 3. Admin Panel Edit Vendor API (`PUT /api/admin/vendors/:id`)

Admin vendor updates use standard location fields (`area`, `city`, `pincode`, `address`). Obsolete fields are no longer required or returned.

---

## 🛠️ Actions Required by Frontend Teams

1. **Vendor Mobile App (`vendorPanel`)**:
   - Remove UI forms/toggles for `location_type`, `is_global_coverage`, `delivery_radius_km`, `selected_zones`, and lat/long pickers.
   - Use standard `area`, `city`, `pincode`, and `address` fields in store setup screens.

2. **Website & Resident App**:
   - Query vendor lists via `GET /api/societies/:societyId/vendors` or `GET /api/locations?search=...`.

3. **Admin Panel (`adminMock`)**:
   - Ensure Edit Vendor drawer uses standard `area`, `city`, `pincode`, `address` input fields.

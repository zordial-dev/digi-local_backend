# 📢 DIGILOCAL BACKEND RELEASE NOTICE FOR ALL FRONTEND DEVELOPERS

> **Release Version**: `v3.5.0 (Unified Platform Architecture Update)`  
> **Backend Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Effective Date**: Immediate  

---

> ### 📌 MANDATORY NOTE FOR ALL DEVELOPERS
> **Please review ONLY the section relevant to your project/panel:**
> - 💻 **Section A**: Website & Resident App Frontend Developers
> - 🏬 **Section B**: Vendor Mobile App Developers
> - 🛠️ **Section C**: Admin Panel Dashboard Developers

---

## 💻 SECTION A: Website & Resident App Frontend Developers

### 1. 🕒 Standardized IST Timestamps (+05:30)
- All dates, times, and order timestamps return in **India Standard Time (IST UTC+05:30)**:
  - `created_at`: `"2026-09-01T17:49:46+05:30"`
  - `created_at_readable`: `"01 Sep 2026, 05:49 pm IST"`
  - `timestamp`: `"05:49 pm"`

### 2. 🏠 Checkout Delivery Address Handling (`POST /api/orders`)
- When placing an order, pass the exact delivery address entered by the user at checkout in `delivery_address` or `full_address`:
```json
{
  "user_id": "usr_079501",
  "vendor_id": 1216,
  "customer_name": "Garvit",
  "phone": "7568021054",
  "delivery_address": "wtp second floor, Jaipur, Rajasthan, 302001",
  "flat": "wtp second floor",
  "area": "Bais Godam",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302001",
  "items": [...]
}
```

### 3. 👤 User Profile Address Fields (`GET /api/users/profile` / `GET /api/users/status/:id`)
- User profile responses now include all saved address fields: `flat`, `area`, `society_name`, `city`, `pincode`, `address`.

---

## 🏬 SECTION B: Vendor Mobile App Developers

### 1. 🍽️ Menu Section (`/menu`)
- Fetch Catalog: `GET /api/vendors/:vendorId/items` & `GET /api/vendorPanel/:vendorId`
- Add Item: `POST /api/vendors/:vendorId/items`
- Edit Item: `PUT /api/vendors/:vendorId/items/:itemId`
- Stock Toggle: `PATCH /api/vendors/:vendorId/items/:itemId/availability`
- Delete Item: `DELETE /api/vendors/:vendorId/items/:itemId`

### 2. 📦 Orders Section (`/orders`)
- Fetch Live Orders: `GET /api/vendors/:vendorId/orders` & `GET /api/vendorPanel/:vendorId`
- Update Order Status: `PUT /api/vendors/:vendorId/orders/:orderId/status`
  - Allowed status values: `ACCEPTED`, `CONFIRMED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, `CANCELLED`, `REJECTED`
- Real-Time Alarm Socket: Room `vendor_${vendorId}`, Events `newOrder` / `orderUpdate` / `NEW_ORDER_ALERT`

### 3. 💰 Payouts Section (`/payouts`)
- Settlements & Payments: `GET /api/vendors/:vendorId/payments` & `GET /api/vendorPanel/:vendorId`
- Update Bank & UPI Details: `PUT /api/vendors/:vendorId/payment-details`

### 4. ⚙️ Settings Section (`/settings`)
- Store Timings & Bio: `PUT /api/vendors/:vendorId/settings`
- Location & Coverage (v3.0.0 Spec): `PUT /api/vendors/:vendorId/coverage`
- Upload Logo & Media: `POST /api/upload` & `POST /api/vendors/:vendorId/logo`
- Deactivate Account: `DELETE /api/vendors/:vendorId`

---

## 🛠️ SECTION C: Admin Panel Dashboard Developers

### 1. 📋 Admin Order Response Schema Update
- Removed duplicate `id` property (use `order_id` as primary key).
- Added explicit `city` and `state` attributes on order objects.
- Formatted `full_address` / `delivery_address` to include `flat`, `area`, `city`, `state`, and `pincode`.
- Itemized items are returned in the `items` array with `item_name`, `quantity`, `price`, `item_total`.

### 2. 🗑️ Obsolete Location Columns Removed
- The following 6 obsolete columns were dropped from the `vendors` table: `latitude`, `longitude`, `location_type`, `is_global_coverage`, `delivery_radius_km`, `selected_zones`.
- Vendor location queries rely purely on `society_id`, `area`, `city`, `state`, `pincode`, `location_address`.

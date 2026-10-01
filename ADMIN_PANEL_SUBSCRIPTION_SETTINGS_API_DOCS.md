# DigiLocal Admin Panel – Subscription Configuration & Management API Documentation

> **Document Audience**: Admin Panel Frontend Developers (Web Dashboard)  
> **Base URL**: `http://localhost:5000` (or production backend URL)  
> **Topic**: Why the admin panel previously showed ₹2,999, how the updated ₹5,999 annual subscription plan works, and APIs to fetch, display, and dynamically configure subscription plans & coupons.

---

## 🔍 Why the Admin Panel Was Showing ₹2,999

1. **Legacy Mock Default**: Earlier backend specifications used ₹2,999 as the initial placeholder.
2. **Missing Configuration in General Settings**: The admin settings endpoints (`/api/settings`, `/api/platform/config`) previously returned only basic platform metadata (`{ platform_name: 'DigiLocal' }`), causing the admin frontend UI to fall back to its hardcoded default of `2999`.
3. **What Has Been Fixed**:
   - Database `plans` table now contains the official active plan: **₹5,999 / year** (`ANNUAL_5999`).
   - All Admin endpoints (`/api/settings`, `/api/admin/settings`, `/api/settings/subscription-plans`, `/api/subscriptions/stats`, `/api/platform/config`) now return `annual_subscription_price: 5999.00` and the full `plans` list.
   - Admin can now **view and dynamically update** subscription prices and plans using the APIs below.

---

## 📑 Admin API Endpoints

### 1. Fetch Subscription Plan Settings
Use this endpoint on the Admin Dashboard **Settings > Subscription Plans** page to display the current active subscription price and features.

- **Method**: `GET`
- **Endpoints**:
  - `/api/admin/settings/subscription-plans`
  - `/api/settings/subscription-plans`
  - `/api/subscriptions/plans`
- **Headers**:
  - `Authorization: Bearer <ADMIN_TOKEN>`
  - `x-platform-client: admin_dashboard`

#### Response (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Subscription plans retrieved successfully.",
  "data": {
    "annual_subscription_price": 5999.00,
    "subscription_price": 5999.00,
    "plans": [
      {
        "plan_id": 1,
        "plan_code": "ANNUAL_5999",
        "name": "Annual Merchant Plan",
        "description": "1 Year DigiLocal Storefront Visibility & Resident Ordering",
        "price": 5999.00,
        "duration_days": 365,
        "billing_cycle": "YEARLY",
        "features": [
          "Storefront visible on DigiLocal user portal",
          "Customers can view and buy products",
          "Vendor panel dashboard access",
          "Real-time order notifications",
          "Priority merchant support"
        ],
        "is_active": true
      }
    ]
  }
}
```

---

### 2. Update Subscription Plan (Admin Configuration)
Allows the Admin to dynamically update the subscription plan price, name, description, or features without modifying source code.

- **Method**: `PUT`
- **Endpoints**:
  - `/api/admin/settings/subscription-plans`
  - `/api/settings/subscription-plans`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <ADMIN_TOKEN>`

#### Request Payload
```json
{
  "price": 5999.00,
  "name": "Annual Merchant Plan",
  "description": "1 Year Storefront Visibility & Resident Ordering",
  "features": [
    "Storefront visible on DigiLocal user portal",
    "Customers can view and buy products",
    "Vendor panel dashboard access",
    "Real-time order notifications",
    "Priority merchant support"
  ]
}
```

#### Response (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Subscription plan price updated to ₹5999.",
  "data": {
    "success": true,
    "message": "Subscription plan price updated to ₹5999.",
    "annual_subscription_price": 5999.00,
    "subscription_price": 5999.00,
    "subscription_fee": 5999.00,
    "plans": [
      {
        "plan_id": 1,
        "plan_code": "ANNUAL_5999",
        "name": "Annual Merchant Plan",
        "price": 5999.00,
        "duration_days": 365,
        "is_active": true
      }
    ]
  }
}
```

---

### 3. General Platform Settings & Branding
Returns global system configuration including platform name, branding, tax, and subscription fee.

- **Method**: `GET`
- **Endpoints**:
  - `/api/admin/settings`
  - `/api/settings`
  - `/api/platform/config`

#### Response (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Platform config retrieved successfully.",
  "data": {
    "platform_name": "DigiLocal",
    "platform_logo": "https://imgh.in/host/ucila6",
    "currency": "INR",
    "gst_percentage": 18.00,
    "maintenance_mode": false,
    "annual_subscription_price": 5999.00,
    "subscription_price": 5999.00,
    "subscription_fee": 5999.00,
    "subscription_plans": [
      {
        "plan_id": 1,
        "plan_code": "ANNUAL_5999",
        "name": "Annual Merchant Plan",
        "price": 5999.00,
        "duration_days": 365,
        "is_active": true
      }
    ]
  }
}
```

---

### 4. Financial & Subscription Analytics
Provides top-level KPI metrics for the Admin Analytics / Subscriptions tab.

- **Method**: `GET`
- **Endpoint**: `/api/subscriptions/stats`
- **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`

#### Response (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Financial stats retrieved successfully.",
  "data": {
    "active_subscriptions": 24,
    "expired_subscriptions": 3,
    "total_subscription_revenue": 143976.00,
    "annual_subscription_price": 5999.00,
    "subscription_price": 5999.00,
    "subscription_fee": 5999.00
  }
}
```

---

### 5. List All Vendor Subscriptions
Returns the list of all merchant subscription records, including store names, start/end dates, amount paid, and status (`ACTIVE` vs `EXPIRED`).

- **Method**: `GET`
- **Endpoint**: `/api/subscriptions`
- **Headers**: `Authorization: Bearer <ADMIN_TOKEN>`

#### Response (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Subscriptions list retrieved from database.",
  "data": [
    {
      "subscription_id": 45,
      "vendor_id": 1429,
      "store_name": "Sharma Groceries",
      "vendor_name": "Ramesh Sharma",
      "plan_name": "Annual Merchant Plan",
      "start_date": "2026-10-01",
      "end_date": "2027-09-30",
      "original_price": 5999.00,
      "discount_amount": 1000.00,
      "final_price": 4999.00,
      "coupon_code": "SAVE1000",
      "payment_method": "ONLINE",
      "transaction_id": "pay_OQ1234567890",
      "status": "ACTIVE"
    }
  ]
}
```

---

### 6. Generate 8-Digit Promotional Coupon (Admin)
Allows Super Admins or Support to create Zomato-style 8-character coupons (e.g. `SAVE1000`, `FEST5999`, `LOCAL500`) for specific vendors or platform-wide.

- **Method**: `POST`
- **Endpoint**: `/api/subscriptions/coupons/generate`
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <ADMIN_TOKEN>`

#### Request Payload
```json
{
  "vendor_id": 1429,
  "coupon_code": "SAVE1000",
  "discount": 1000,
  "type": "flat",
  "start_date": "2026-10-01",
  "end_date": "2026-10-31",
  "usage_limit": 1
}
```
*(Leave `coupon_code` empty to auto-generate a unique 8-character code like `DIGI9X4K`).*

#### Response (`201 Created`)
```json
{
  "success": true,
  "message": "8-digit coupon \"SAVE1000\" created successfully!",
  "data": {
    "id": 101,
    "coupon_code": "SAVE1000",
    "vendor_id": 1429,
    "discount": 1000.00,
    "type": "flat",
    "start_date": "2026-10-01",
    "end_date": "2026-10-31",
    "usage_limit": 1,
    "status": "unused"
  }
}
```

---

## 🛠️ Integration Checklist for Admin Frontend Dev

1. **Remove Hardcoded Defaults**:
   - In your Admin Panel React/Vue codebase, search for `2999` and replace it with:
     ```javascript
     const subscriptionPrice = settingsData?.annual_subscription_price || 5999;
     ```
2. **Connect Settings Screen**:
   - Call `GET /api/admin/settings/subscription-plans` (or `GET /api/settings`) to load current plan configuration.
   - Bind the input field for "Annual Subscription Fee" to `data.annual_subscription_price` (₹5,999.00).
   - On Form Submit, call `PUT /api/admin/settings/subscription-plans` with `{ price: Number(newPrice) }`.
3. **Coupons Management Tab**:
   - Provide an "Add Coupon" modal calling `POST /api/subscriptions/coupons/generate`.
   - Validate that custom coupon codes are exactly 8 uppercase alphanumeric characters.

---

*End of Admin Panel Subscription API Documentation.*

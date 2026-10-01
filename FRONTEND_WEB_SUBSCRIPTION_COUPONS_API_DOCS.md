# DigiLocal Subscription & Coupons API Documentation (Frontend Web)

> **Document Audience**: Frontend Web Developers (React, Next.js, Vue, or Vanilla JS)  
> **Base URL**: `http://localhost:5000` (or production backend URL)  
> **Key Concept**: Vendors must maintain an active annual subscription (**₹5,999 / year**) to keep their store visible and accept orders on the DigiLocal User Portal. Online payment is mandatory. Vendors can apply 8-character promotional coupons (Zomato-style) to receive instant flat or percentage discounts.

---

## 📑 Table of Contents
1. [Core Business Rules & Workflow](#1-core-business-rules--workflow)
2. [API Reference](#2-api-reference)
   - [2.1 Get Subscription Plans](#21-get-subscription-plans)
   - [2.2 Get Vendor Coupons](#22-get-vendor-coupons)
   - [2.3 Apply Coupon (Price Recalculation)](#23-apply-coupon-price-recalculation)
   - [2.4 Subscribe / Renew Subscription](#24-subscribe--renew-subscription)
   - [2.5 Get Vendor Subscription Status & Expiry Popup Data](#25-get-vendor-subscription-status--expiry-popup-data)
   - [2.6 Generate Coupon (Admin / Support)](#26-generate-coupon-admin--support)
3. [Frontend Web Implementation Guide](#3-frontend-web-implementation-guide)
   - [3.1 Expiry Popup & Warning Banner Logic](#31-expiry-popup--warning-banner-logic)
   - [3.2 Zomato-Style Coupon Drawer Component](#32-zomato-style-coupon-drawer-component)
   - [3.3 Storefront User Portal Inactive Shop Handling](#33-storefront-user-portal-inactive-shop-handling)
4. [Email Reminder Notification Schedule](#4-email-reminder-notification-schedule)

---

## 1. Core Business Rules & Workflow

| Feature | Specification |
| :--- | :--- |
| **Annual Price** | **₹5,999.00 / year** (365 days) |
| **Accepted Payment Methods** | **ONLINE ONLY** (`Razorpay`, `Cashfree`, `UPI`, `NetBanking`, `Card`). Offline / COD is strictly rejected. |
| **User Portal Visibility** | - **Active**: Store and catalog items are visible on the resident user portal.<br>- **Expired**: Store is hidden from search/society listings, storefront returns `403` with `subscription_expired: true`, and order placement is blocked. |
| **Renewal Date Calculation** | If the vendor renews while their subscription is still active, the new 365 days are **appended to the current expiry date** (no lost days). If expired, starts from today. |
| **Coupons** | 8-character uppercase alphanumeric codes (e.g., `SAVE1000`, `FEST5999`, `DIGI500X`). Validated for active date window and unused status. Marked as `used` immediately upon successful checkout. |

---

## 2. API Reference

### 2.1 Get Subscription Plans
Fetches active subscription plans. Currently provides the primary 1-year ₹5,999 plan.

- **Method**: `GET`
- **Endpoints**: `/api/subscriptions/plans` or `/api/plans`
- **Auth**: None (Public)

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Active subscription plans fetched successfully.",
  "data": [
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
```

---

### 2.2 Get Vendor Coupons
Fetches unused, active coupons available for a specific vendor. Only returns coupons where current date is between `start_date` and `end_date`, and `status = 'unused'`.

- **Method**: `GET`
- **Endpoints**:
  - `/api/subscriptions/coupons?vendor_id=1429`
  - `/api/subscriptions/coupons/1429`
  - `/api/vendorPanel/1429/coupons`
  - `/api/coupons?vendor_id=1429`
- **Auth**: Vendor Token or Vendor ID param

#### Response (`200 OK`)
```json
{
  "success": true,
  "total": 2,
  "vendor_id": 1429,
  "data": [
    {
      "id": 101,
      "coupon_code": "SAVE1000",
      "vendor_id": 1429,
      "discount": 1000.00,
      "type": "flat",
      "start_date": "2026-10-01",
      "end_date": "2026-10-31",
      "usage_limit": 1,
      "status": "unused",
      "created_at": "2026-10-01T10:00:00.000Z"
    },
    {
      "id": 102,
      "coupon_code": "FEST20PC",
      "vendor_id": 1429,
      "discount": 20.00,
      "type": "percentage",
      "start_date": "2026-10-01",
      "end_date": "2026-10-15",
      "usage_limit": 1,
      "status": "unused",
      "created_at": "2026-10-01T10:00:00.000Z"
    }
  ]
}
```

---

### 2.3 Apply Coupon (Price Recalculation)
Validates an 8-digit coupon and calculates the exact discounted price before the vendor proceeds to online payment.

- **Method**: `POST`
- **Endpoints**: `/api/subscriptions/apply-coupon` or `/api/coupons/apply`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "vendor_id": 1429,
  "coupon_code": "SAVE1000",
  "plan_id": 1
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Coupon \"SAVE1000\" applied successfully! You saved ₹1000.00.",
  "data": {
    "valid": true,
    "coupon_id": 101,
    "coupon_code": "SAVE1000",
    "discount_type": "flat",
    "discount_value": 1000,
    "original_price": 5999.00,
    "discount_amount": 1000.00,
    "final_price": 4999.00,
    "plan_id": 1,
    "plan_name": "Annual Merchant Plan",
    "duration_days": 365,
    "start_date": "2026-10-01",
    "end_date": "2026-10-31",
    "message": "Coupon \"SAVE1000\" applied successfully! You saved ₹1000.00."
  }
}
```

#### Error Response (`400 Bad Request`)
```json
{
  "success": false,
  "error": "Coupon \"SAVE1000\" has already been used."
}
```

---

### 2.4 Subscribe / Renew Subscription
Completes online subscription activation or renewal. Validates online payment, consumes the coupon, extends or starts a 365-day subscription, and activates the store.

- **Method**: `POST`
- **Endpoints**:
  - `/api/subscriptions/subscribe`
  - `/api/subscriptions/renew`
  - `/api/vendorPanel/:vendorId/subscribe`
  - `/api/vendorPanel/:vendorId/renew`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "vendor_id": 1429,
  "plan_id": 1,
  "coupon_code": "SAVE1000",
  "payment_method": "ONLINE",
  "transaction_id": "pay_OQ1234567890"
}
```

> ⚠️ **Note**: `payment_method` must be an online payment type (`ONLINE`, `RAZORPAY`, `CASHFREE`, `UPI`, `CARD`, `NETBANKING`). Passing `COD` or `CASH` will return HTTP 400 error.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Subscription activated successfully for 1 full year until 2027-09-30! Store is now visible on DigiLocal user portal.",
  "subscription_id": 45,
  "vendor_id": 1429,
  "store_name": "Sharma Groceries",
  "plan_name": "Annual Merchant Plan",
  "start_date": "2026-10-01",
  "end_date": "2027-09-30",
  "original_price": 5999.00,
  "discount_amount": 1000.00,
  "final_price": 4999.00,
  "coupon_applied": "SAVE1000",
  "payment_method": "ONLINE",
  "transaction_id": "pay_OQ1234567890",
  "status": "ACTIVE",
  "shop_visible_on_portal": true
}
```

---

### 2.5 Get Vendor Subscription Status & Expiry Popup Data
Frontend web vendor dashboard should call this on page load. It returns days left, whether the shop is currently live, and whether to show a popup modal.

- **Method**: `GET`
- **Endpoints**:
  - `/api/vendorPanel/:vendorId/subscription-status`
  - `/api/subscriptions/status/:vendorId`
  - `/api/subscriptions/status` (Uses Bearer Token)
- **Auth**: Vendor Token or Vendor ID in URL

#### Response: Active Subscription (Healthy)
```json
{
  "success": true,
  "vendor_id": 1429,
  "store_name": "Sharma Groceries",
  "has_subscription": true,
  "subscription_id": 45,
  "plan_name": "Annual Merchant Plan",
  "status": "ACTIVE",
  "start_date": "2026-10-01",
  "end_date": "2027-09-30",
  "days_left": 364,
  "raw_days_left": 364,
  "is_expired": false,
  "is_expiring_soon": false,
  "shop_visible_on_portal": true,
  "show_expiry_popup": false,
  "popup_type": "NONE",
  "popup_title": "",
  "popup_message": "",
  "action_text": "Renew Subscription",
  "annual_price": 5999.00,
  "original_price": 5999.00,
  "final_price": 4999.00,
  "coupon_code": "SAVE1000",
  "available_coupons_count": 0
}
```

#### Response: Subscription Expired (`show_expiry_popup: true`)
```json
{
  "success": true,
  "vendor_id": 1429,
  "store_name": "Sharma Groceries",
  "has_subscription": true,
  "subscription_id": 45,
  "plan_name": "Annual Merchant Plan",
  "status": "EXPIRED",
  "start_date": "2025-10-01",
  "end_date": "2026-09-30",
  "days_left": 0,
  "raw_days_left": -1,
  "is_expired": true,
  "is_expiring_soon": false,
  "shop_visible_on_portal": false,
  "show_expiry_popup": true,
  "popup_type": "EXPIRED",
  "popup_title": "⚠️ Subscription Expired",
  "popup_message": "Your DigiLocal subscription for \"Sharma Groceries\" has expired on 2026-09-30. Your store is currently hidden from resident users on the portal. Please renew now to restore shop visibility and receive customer orders.",
  "action_text": "Renew Now for ₹5,999/yr",
  "annual_price": 5999.00,
  "available_coupons_count": 1
}
```

#### Response: Expiring in Critical Window (<= 3 Days)
```json
{
  "success": true,
  "days_left": 2,
  "is_expired": false,
  "is_expiring_soon": true,
  "shop_visible_on_portal": true,
  "show_expiry_popup": true,
  "popup_type": "EXPIRING_CRITICAL",
  "popup_title": "🔔 Subscription Expiring in 2 Days",
  "popup_message": "Your DigiLocal subscription for \"Sharma Groceries\" will expire on 2026-10-03 (in 2 days). Renew now to keep receiving resident orders.",
  "action_text": "Renew Now"
}
```

---

### 2.6 Generate Coupon (Admin / Support)
Generates an 8-character Zomato-style promotional code for a merchant.

- **Method**: `POST`
- **Endpoint**: `/api/subscriptions/coupons/generate`
- **Content-Type**: `application/json`

#### Request Body
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
*(If `coupon_code` is omitted, the backend auto-generates a unique 8-character uppercase code like `DIGI4K9X`).*

---

## 3. Frontend Web Implementation Guide

### 3.1 Expiry Popup & Warning Banner Logic

Call `GET /api/vendorPanel/:vendorId/subscription-status` in your top-level layout / vendor dashboard initialization.

```typescript
// Example React / Next.js Hook
import { useState, useEffect } from 'react';

export function useVendorSubscription(vendorId) {
  const [subStatus, setSubStatus] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/vendorPanel/${vendorId}/subscription-status`)
      .then(res => res.json())
      .then(data => {
        setSubStatus(data);
        if (data.show_expiry_popup) {
          setIsModalOpen(true);
        }
      });
  }, [vendorId]);

  return { subStatus, isModalOpen, setIsModalOpen };
}
```

#### UI Conditions to Render:
1. **`popup_type === 'EXPIRED'`**:
   - Show an **un-dismissible modal** or backdrop blocking catalog edits with a red header: `"⚠️ Subscription Expired"`.
   - Show badge in Topbar: `<span className="badge bg-red-600 text-white">Store Hidden (Expired)</span>`.
   - Direct CTA: `"Renew Subscription - ₹5,999/yr"`.
2. **`popup_type === 'EXPIRING_CRITICAL'`** (<= 3 days remaining):
   - Show a modal with Amber/Yellow warning header.
   - Dismissible with a `"Remind Me Later"` button, but display persistent warning banner at the top of the screen:
   `"Your DigiLocal store subscription expires in X days on YYYY-MM-DD. Renew today to prevent your store from going offline."`
3. **`days_left > 3 && days_left <= 7`**:
   - Non-blocking banner at top of dashboard.

---

### 3.2 Zomato-Style Coupon Drawer Component
When the vendor clicks `"Renew Subscription"`, open a renewal checkout modal:

1. Display base price: **₹5,999.00 / year**.
2. Fetch available coupons using `GET /api/vendorPanel/:vendorId/coupons`.
3. Display coupon cards:
   ```html
   <div class="coupon-card border-dashed border-2 border-amber-500 p-4 rounded-xl flex justify-between items-center">
     <div>
       <span class="font-mono font-bold text-lg text-amber-700 bg-amber-50 px-2 py-1 rounded">SAVE1000</span>
       <p class="text-sm text-gray-600 mt-1">Get flat ₹1,000 off on 1-year subscription</p>
       <span class="text-xs text-gray-400">Valid till 31 Oct 2026</span>
     </div>
     <button onClick={() => handleApplyCoupon('SAVE1000')} class="text-amber-600 font-bold hover:underline">
       APPLY
     </button>
   </div>
   ```
4. On Apply, call `POST /api/subscriptions/apply-coupon`:
   - Display:
     - Original: `₹5,999.00`
     - Coupon Discount: `- ₹1,000.00`
     - **To Pay: ₹4,999.00**
5. On "Proceed to Pay":
   - Initiate online payment SDK (Razorpay / Cashfree modal).
   - Once payment returns `payment_id`, call `POST /api/subscriptions/subscribe`.
   - Update UI immediately: Store status becomes **ACTIVE**, days left reset to **365**, and expiry modal closes.

---

### 3.3 Storefront User Portal Inactive Shop Handling
When a resident customer navigates to a store URL (e.g. `/stores/1429`):

- If the backend returns `403` with `{ "subscription_expired": true }`:
  - Show a friendly customer message:
    > *"This store is currently unavailable as its annual subscription is inactive. Please browse other nearby stores."*
  - Hide the "Add to Cart" and "Buy Now" buttons.

---

## 4. Email Reminder Notification Schedule

> 💡 **Important Architectural Rule for Developers**:
> - Email reminders are **strictly dispatched by the backend background cron job** (`src/cron/index.js`), **NEVER** when the vendor or frontend calls an API.
> - Calling `GET /api/vendorPanel/:vendorId/subscription-status` or browsing the dashboard will **never send an email**. That endpoint is purely read-only for frontend UI popups and banners.
> - The cron job automatically deduplicates each notification by recording stages (`["7_DAYS", "3_DAYS", "1_DAY", "0_DAY", "EXPIRED"]`) in the database. Each milestone email is sent **strictly once per vendor subscription cycle**.

| Trigger Point | Dispatch Mechanism | Subject Line | Vendor Action |
| :--- | :--- | :--- | :--- |
| **7 Days Before** | Cron Job (Daily 9 AM) | `🔔 DigiLocal Subscription Expiring in 7 Days – [Store Name]` | Advance heads-up with renewal CTA |
| **3 Days Before** | Cron Job (Daily 9 AM) | `🔔 DigiLocal Subscription Expiring in 3 Days – [Store Name]` | Warning reminder with coupon availability note |
| **1 Day Before** | Cron Job (Daily 9 AM) | `🔔 DigiLocal Subscription Expiring Tomorrow (1 Day) – [Store Name]` | Urgent reminder |
| **0 Days (Today)** | Cron Job (Daily 9 AM) | `🚨 DigiLocal Subscription Expires TODAY – [Store Name]` | Final same-day reminder before shop is hidden |
| **At Expiry / Expired** | Cron Job (Hourly Sweep) | `⚠️ DigiLocal Subscription Expired – [Store Name]` | Store hidden notice with instant reactivation link |

---

*End of Web Frontend API Documentation.*


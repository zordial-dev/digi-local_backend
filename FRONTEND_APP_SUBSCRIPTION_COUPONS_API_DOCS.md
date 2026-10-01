# DigiLocal Subscription & Coupons API Documentation (Mobile App)

> **Document Audience**: Mobile App Developers (React Native, Flutter, Android Kotlin, iOS Swift)  
> **Target Apps**: 
> 1. **DigiLocal Vendor Partner App** (Vendor Panel)
> 2. **DigiLocal Customer Shopping App** (Resident User Portal)  
> **Annual Price**: **₹5,999 / year**  
> **Key Concept**: Vendors must hold an active annual subscription to appear in the Customer App and accept resident orders. Online payment is mandatory. Vendors can apply 8-digit promo coupons to get instant discounts.

---

## 📱 Table of Contents
1. [App User Experience Guidelines](#1-app-user-experience-guidelines)
2. [Mobile API Endpoints](#2-mobile-api-endpoints)
   - [2.1 Fetch Subscription Plans](#21-fetch-subscription-plans)
   - [2.2 Fetch Available Vendor Coupons](#22-fetch-available-vendor-coupons)
   - [2.3 Validate & Apply Coupon](#23-validate--apply-coupon)
   - [2.4 Process Online Subscription Payment](#24-process-online-subscription-payment)
   - [2.5 Fetch Subscription Status & Popup Triggers](#25-fetch-subscription-status--popup-triggers)
3. [Mobile Implementation Patterns](#3-mobile-implementation-patterns)
   - [3.1 Vendor App: App Launch / Foreground Status Check](#31-vendor-app-app-launch--foreground-status-check)
   - [3.2 Expiry Modal & BottomSheet UI States](#32-expiry-modal--bottomsheet-ui-states)
   - [3.3 8-Digit Zomato-Style Coupon BottomSheet](#33-8-digit-zomato-style-coupon-bottomsheet)
   - [3.4 Customer App: Handling Expired / Hidden Stores](#34-customer-app-handling-expired--hidden-stores)
4. [Email Reminder & Notification Timeline](#4-email-reminder--notification-timeline)

---

## 1. App User Experience Guidelines

### Vendor App
1. **App Resume / Launch Check**: Every time the vendor opens the app or brings it to the foreground, call `GET /api/vendorPanel/:vendorId/subscription-status`.
2. **Expired State (`is_expired: true`)**:
   - Display a **blocking, non-dismissible BottomSheet / Fullscreen Dialog**.
   - Vendor cannot add/edit products or process orders until subscription is renewed.
   - Prominent CTA: `"Renew for ₹5,999/yr"`.
3. **Critical Expiring State (`days_left <= 3`)**:
   - Display a dismissible alert BottomSheet on first launch of the day.
   - Display a sticky warning banner on the Vendor Dashboard.
4. **Online Payment Only**:
   - The app must only offer online payment gateways (`Razorpay SDK`, `Cashfree SDK`, `UPI Intent`). COD / Cash options are disabled.
5. **Coupons Support**:
   - Coupons are 8-character uppercase alphanumeric codes (e.g. `SAVE1000`, `FEST5999`).
   - The vendor can tap to select from available coupons in a BottomSheet or type an 8-character code.

### Customer App
1. Stores with expired subscriptions are automatically excluded from search and society lists by the backend.
2. If a customer opens a deep link or saved bookmark of an expired store, the app receives HTTP `403` with `subscription_expired: true`.
3. Show an Inactive Store screen with a friendly message and a button to browse other stores.

---

## 2. Mobile API Endpoints

### 2.1 Fetch Subscription Plans
Fetches the current 1-year merchant subscription plan.

- **Method**: `GET`
- **URL**: `/api/subscriptions/plans` (or `/api/plans`)
- **Headers**: `Accept: application/json`

#### Response (`200 OK`)
```json
{
  "success": true,
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

### 2.2 Fetch Available Vendor Coupons
Returns only unused and currently active coupons for the logged-in vendor.

- **Method**: `GET`
- **URL**: `/api/vendorPanel/:vendorId/coupons` (or `/api/subscriptions/coupons?vendor_id=:vendorId`)
- **Headers**: 
  - `Authorization: Bearer <VENDOR_JWT_TOKEN>`

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
      "status": "unused"
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
      "status": "unused"
    }
  ]
}
```

---

### 2.3 Validate & Apply Coupon
Validates the 8-character coupon code and returns the recalculated final price before initiating payment SDK.

- **Method**: `POST`
- **URL**: `/api/subscriptions/apply-coupon` (or `/api/coupons/apply`)
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "vendor_id": 1429,
  "coupon_code": "SAVE1000",
  "plan_id": 1
}
```

#### Response (`200 OK`)
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

---

### 2.4 Process Online Subscription Payment
Invoked once the native mobile payment SDK (Razorpay / Cashfree) completes successfully.

- **Method**: `POST`
- **URL**: `/api/vendorPanel/:vendorId/subscribe` (or `/api/subscriptions/subscribe`)
- **Headers**: 
  - `Content-Type: application/json`
  - `Authorization: Bearer <VENDOR_JWT_TOKEN>`

#### Request Payload
```json
{
  "vendor_id": 1429,
  "plan_id": 1,
  "coupon_code": "SAVE1000",
  "payment_method": "ONLINE",
  "transaction_id": "pay_XYZ987654321"
}
```

> ⚠️ `payment_method` must be online (`ONLINE`, `RAZORPAY`, `CASHFREE`, `UPI`, `CARD`). Offline/COD will be rejected.

#### Response (`200 OK`)
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
  "transaction_id": "pay_XYZ987654321",
  "status": "ACTIVE",
  "shop_visible_on_portal": true
}
```

---

### 2.5 Fetch Subscription Status & Popup Triggers
Mobile app calls this on launch / dashboard load to get days remaining and modal popup triggers.

- **Method**: `GET`
- **URL**: `/api/vendorPanel/:vendorId/subscription-status` (or `/api/subscriptions/status/:vendorId`)
- **Headers**: `Accept: application/json`

#### Response: Active Store
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
  "is_expired": false,
  "is_expiring_soon": false,
  "shop_visible_on_portal": true,
  "show_expiry_popup": false,
  "popup_type": "NONE",
  "annual_price": 5999.00,
  "available_coupons_count": 0
}
```

#### Response: Store Expired (Requires Modal Popup)
```json
{
  "success": true,
  "vendor_id": 1429,
  "store_name": "Sharma Groceries",
  "has_subscription": true,
  "status": "EXPIRED",
  "start_date": "2025-10-01",
  "end_date": "2026-09-30",
  "days_left": 0,
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

---

## 3. Mobile Implementation Patterns

### 3.1 Vendor App: App Launch / Foreground Status Check

In React Native or Flutter:

```dart
// Flutter Example: Subscription Status Check
Future<void> checkSubscriptionStatus(int vendorId) async {
  final response = await http.get(
    Uri.parse('$baseUrl/api/vendorPanel/$vendorId/subscription-status'),
  );

  if (response.statusCode == 200) {
    final data = json.decode(response.body);
    
    if (data['show_expiry_popup'] == true) {
      if (data['popup_type'] == 'EXPIRED') {
        // Show non-dismissible blocking modal
        showSubscriptionExpiredBottomSheet(context, data, isDismissible: false);
      } else if (data['popup_type'] == 'EXPIRING_CRITICAL') {
        // Show warning BottomSheet (<= 3 days)
        showSubscriptionExpiredBottomSheet(context, data, isDismissible: true);
      }
    }
  }
}
```

```typescript
// React Native Example
import React, { useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useAppSubscriptionCheck(vendorId: number) {
  const [subStatus, setSubStatus] = useState(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/vendorPanel/${vendorId}/subscription-status`);
      const json = await res.json();
      setSubStatus(json);
    } catch (e) {
      console.warn('Subscription check error', e);
    }
  };

  useEffect(() => {
    fetchStatus();
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        fetchStatus();
      }
    });
    return () => subscription.remove();
  }, [vendorId]);

  return subStatus;
}
```

---

### 3.2 Expiry Modal & BottomSheet UI States

| `popup_type` | UI Behavior | Visual Indicator |
| :--- | :--- | :--- |
| `EXPIRED` | **Blocking Fullscreen Modal or BottomSheet** (`isDismissible: false`). Vendor cannot access orders/items until renewed. | Red header icon `⚠️`, "Store Hidden" badge |
| `EXPIRING_TODAY` | High-priority BottomSheet (`isDismissible: true`). Persistent dashboard banner. | Red warning badge `🚨` |
| `EXPIRING_CRITICAL` | Warning BottomSheet on launch (`isDismissible: true`). | Amber/Yellow badge `🔔` |
| `NONE` | Standard Dashboard view. Shows "Active until YYYY-MM-DD" in settings. | Green badge `Active` |

---

### 3.3 8-Digit Zomato-Style Coupon BottomSheet

When vendor taps `"Renew Subscription"`:
1. Open a Payment BottomSheet displaying:
   - **Annual Plan**: `₹5,999.00 / yr`
   - **Apply Coupon** button
2. Tapping `"Apply Coupon"` presents a Coupon BottomSheet containing available coupons from `GET /api/vendorPanel/:vendorId/coupons`.
3. UI Card Design:
   - Dotted/dashed border
   - 8-digit bold badge: `[ SAVE1000 ]`
   - Description: `"Get flat ₹1,000 off on 1-year plan"`
   - `"APPLY"` button in primary brand color
   - Manual text input for entering 8-digit codes directly
4. Tapping `"APPLY"` calls `POST /api/subscriptions/apply-coupon`:
   - Calculates new total: `₹4,999.00`
   - Displays green success chip: `"Coupon SAVE1000 applied! -₹1,000"`
5. `"Pay Now"` button initiates Razorpay/Cashfree Mobile SDK.

---

### 3.4 Customer App: Handling Expired / Hidden Stores

1. Stores with expired subscriptions are filtered out from search & society vendor lists automatically.
2. If a user attempts to view a store that has expired:
   - Backend returns:
     ```json
     {
       "success": false,
       "error": "Store \"Sharma Groceries\" is currently unavailable as its annual subscription has expired.",
       "subscription_expired": true
     }
     ```
   - Customer App displays an empty state screen:
     - Illustration: Store Closed / Under Maintenance
     - Title: `"Store Currently Unavailable"`
     - Subtitle: `"This merchant's storefront is currently inactive. Please explore other nearby stores."`
     - Action: `"Browse Nearby Stores"` button.
3. If an order placement is attempted on an expired store, `POST /api/orders` returns `400` with `"subscription_expired": true`. Display a friendly toast/snackbar.

---

## 4. Email Reminder & Notification Timeline

> 💡 **Important Architectural Rule for Mobile Developers**:
> - Email reminders are **strictly dispatched by the backend background cron job** (`src/cron/index.js`), **NEVER** when the vendor or mobile app calls an API.
> - Calling `GET /api/vendorPanel/:vendorId/subscription-status` or refreshing screens will **never send an email**. That endpoint is purely read-only for rendering app popups and BottomSheets.
> - The cron job automatically deduplicates each notification by recording stages (`["7_DAYS", "3_DAYS", "1_DAY", "0_DAY", "EXPIRED"]`) in the database. Each milestone email is sent **strictly once per vendor subscription cycle**.

```
[ Active Period: 365 Days ]
       │
       ├── 7 Days Before (Cron 9 AM)  ──> Email: "DigiLocal Subscription Expiring in 7 Days"
       │
       ├── 3 Days Before (Cron 9 AM)  ──> Email: "DigiLocal Subscription Expiring in 3 Days" + Critical App Popup
       │
       ├── 1 Day Before  (Cron 9 AM)  ──> Email: "Subscription Expiring Tomorrow"
       │
       ├── Expiry Day    (Cron 9 AM)  ──> Email: "Subscription Expires TODAY"
       │
       └── Expired       (Hourly)     ──> Email: "Subscription Expired" + Store Hidden from Customer App
```

---

*End of Mobile App API Documentation.*


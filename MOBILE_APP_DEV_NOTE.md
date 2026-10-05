# 📱 Mobile App Developer Integration Note & API Guide
**Subject:** Resolution of Storefront API Timeouts, Payload Optimization, and Mobile Networking Best Practices  
**Date:** October 2026  
**Backend Version:** DigiLocal Relational API v3.2.0  
**Target:** Mobile App Developers (React Native / Flutter / Android / iOS)

---

## 📌 Executive Summary

Recent mobile and web client reports indicated that vendor storefront requests (such as `GET /api/vendors/1430` and `GET /api/vendors/1430/items`) were timing out, transferring `0 B`, and causing the UI to display error screens or fallback states.

### What Caused the Issue:
1. **Raw Base64 Image Ingestion:** Vendor records in PostgreSQL contained 1 MB+ raw base64 data URIs (`data:image/jpeg;base64,...`) in `shop_image` and `logo`.
2. **Extreme Payload Size:** Because vendor data is returned with backward-compatible aliases, the 1 MB string was duplicated 6–8 times, inflating single response sizes to **5.4 MB – 8.3 MB**, and `/api/vendors` to **2.3 MB**.
3. **Mobile Network Timeout:** Cellular connections (3G/4G/5G) and client HTTP timeouts (2s–3s) could not complete transferring 5.4+ MB of text before dropping the connection.

---

## 🚀 Backend Fixes & Optimizations

| Metric / Feature | Previous State | New State | Mobile Benefit |
| :--- | :--- | :--- | :--- |
| **Storefront Payload** | **5.4 MB** | **14.3 KB** | **99.7% less cellular data consumption** |
| **Response Time** | **>3.8s (Timeout)** | **~1.2s** | Fast store loading on mobile devices |
| **Image Delivery** | Inline Base64 | Hosted Static URLs (`/uploads/...`) | **Native CDN & Disk Caching** enabled |
| **Catalog Endpoints** | Missing / 404 | `GET /api/items`, `GET /api/products` | Dedicated lightweight item feeds |
| **Entity Lookup** | 400 on vendor IDs | Smart resolver for `item_id` & `vendor_id` | Resilient mobile navigation |

---

## 📱 Mobile Networking Best Practices & Recommendations

### 1. HTTP Client Timeout Configuration
Mobile networks experience packet drops, cell tower handoffs, and transient latency spikes. Never set client timeouts below **8–10 seconds** on mobile devices.

#### React Native (Axios Configuration):
```javascript
// src/services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'https://digi-local-backend.onrender.com',
  timeout: 10000, // 10 seconds for general API calls
  headers: {
    'Accept': 'application/json',
    'X-Platform-Client': 'mobile_app'
  }
});

export default apiClient;
```

#### Flutter (Dio Configuration):
```dart
// lib/core/api_client.dart
import 'package:dio/dio.dart';

final dio = Dio(
  BaseOptions(
    baseUrl: 'https://digi-local-backend.onrender.com',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {'X-Platform-Client': 'mobile_app'},
  ),
);
```

---

### 2. High-Resolution Camera & Gallery Photo Uploads
Modern mobile cameras capture photos at 12 MP–48 MP (5 MB–15 MB per file).
- **CRITICAL:** **Never encode camera photos into Base64 and send them in JSON.** Base64 increases file size by 33%, exhausts mobile memory, and crashes app bridges.
- **Client-Side Image Compression:** Always resize/compress images before upload (max dimensions: 1024x1024, JPEG quality: 75%–80%, target size: ~200 KB–400 KB).
- **Multipart Upload:** Use `multipart/form-data` with `POST /api/upload-image`.

#### React Native Example:
```javascript
import { launchImageLibrary } from 'react-native-image-picker';
import ImageResizer from '@bam.tech/react-native-image-resizer';

async function uploadProductPhoto() {
  const result = await launchImageLibrary({ mediaType: 'photo' });
  const asset = result.assets?.[0];
  if (!asset?.uri) return;

  // 1. Resize & compress
  const resized = await ImageResizer.createResizedImage(
    asset.uri,
    1024,
    1024,
    'JPEG',
    80
  );

  // 2. Upload via multipart/form-data
  const formData = new FormData();
  formData.append('image', {
    uri: resized.uri,
    type: 'image/jpeg',
    name: 'upload.jpg',
  });

  const response = await apiClient.post('/api/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 20000, // 20s timeout for image uploads
  });

  return response.data.image_url; // Hosted URL: https://.../uploads/img-12345.jpg
}
```

---

### 3. Leverage Native Image Caching
Because the backend now returns standard static URLs (`/uploads/vendor-1430.jpg`) rather than inline base64 text, mobile apps can now leverage native disk caching for instant subsequent loads:

- **React Native:** Use `react-native-fast-image`:
  ```jsx
  import FastImage from 'react-native-fast-image';

  <FastImage
    style={{ width: 100, height: 100, borderRadius: 8 }}
    source={{
      uri: vendor.shop_image,
      priority: FastImage.priority.normal,
      cache: FastImage.cacheControl.immutable,
    }}
  />
  ```
- **Flutter:** Use `cached_network_image`:
  ```dart
  CachedNetworkImage(
    imageUrl: vendor.shopImage,
    placeholder: (context, url) => CircularProgressIndicator(),
    errorWidget: (context, url, error) => Icon(Icons.store),
  );
  ```

---

## 📡 API Endpoints Reference for Mobile Apps

### 1. Vendor Details & Catalog
- `GET /api/vendors/:vendorId` — Full storefront details, item catalog, and services list.
- `GET /api/vendors/:vendorId/items` — Dedicated items feed for store catalog screens.
- `GET /api/vendors/:vendorId/services` — Dedicated service listings (returns clean array, ~300ms).

### 2. Category & Item Discovery
- `GET /api/items` (alias: `GET /api/products`) — Browse all available items.
  - Supports query parameters: `?category=Groceries&search=milk&page=1&limit=20`

### 3. Smart Entity Resolver
- `GET /api/products/:id` (alias: `GET /api/items/:id`)
  - If `:id` is an `item_id`, returns single product card details.
  - If `:id` is a `vendor_id`, returns that vendor's storefront and catalog.

### 4. Fast Heartbeat / Liveness
- `GET /api/ping` — Lightweight probe returning `{"status": "ok", "message": "pong"}` in ~4ms. Perfect for network health checks and offline reconnection sweeps.

---

## 🛡️ Error Handling Recommendation
When handling request failures in the mobile UI:
1. **HTTP `404`**: Store legitimately does not exist or has been deleted $\rightarrow$ Render "Store Not Found" screen.
2. **Network Timeout / Connection Error**: Show an inline retry card: `"Connection took longer than expected. [Tap to Retry]"` rather than concluding the store does not exist.

---

## 📦 Mobile App Update: User Delivery Address & Vendor Registration

### 1. User Profile Address & Order Checkout (`POST /api/orders`)
- **Issue Resolved:** If a user updated their address in their profile and placed an order, or if `delivery_address` was not sent in the order request, the order delivery address did not reflect the user's updated database address.
- **Backend Resolution:**
  - `POST /api/orders` now automatically falls back to the user's saved database address (`users.address` / `flat`, `society_name`, `city`, `pincode`) whenever `delivery_address` is not passed or empty.
  - `GET /api/users/:userId/orders` and `GET /api/orders/:orderId` return the user's real saved address rather than any hardcoded mock defaults.
- **Mobile Client Recommendation:**
  - Make sure the checkout screen pre-fills the delivery address from the authenticated user profile (`GET /api/users/:userId` -> `response.data.address`).
  - Pass `delivery_address: currentAddress` in the `POST /api/orders` payload. If the field is omitted, the backend now automatically falls back to the user's latest saved address.

### 2. Vendor Onboarding & Society Name Registration
- **Issue Resolved:** When a vendor enters a society name during registration (`POST /api/vendors/register`), the Admin Panel only showed `"Arg ananta"` for each vendor.
- **Backend Resolution:**
  - `POST /api/vendors/register` accepts `society_name`, `society`, or `area`. If the society does not exist yet, the backend automatically creates it in the database and assigns the correct `society_id` to the new vendor.
  - All Admin endpoints (`GET /api/admin/vendors`, `/api/vendors/pending`, etc.) now explicitly return `society_name`, `societyName`, `society_id`, `societyId`, `area`, and `locationArea`.

---

## 🔒 Strict Role & Tenant Data Isolation (No Wrong Data Sent)

### 1. Complete Removal of Mock Fallbacks
- All synthetic dummy data fallbacks (`"Aarushi"`, `"Rahul Sharma"`, `"Raj Kumar"`, `"+919784319840"`, `"9876543210"`, `"FreshMart Grocery & Organic"`, `"Tower A-402"`, `"SOC-101"`, `"Omaxe Greenwood Residency"`) have been removed from the backend.
- Order details, user profiles, and vendor storefronts now strictly return authentic database records. If optional fields are missing, they return empty strings/null rather than fabricated placeholder data.

### 2. Panel & Account Scope Isolation
- **User Orders & Cart:** When querying `/api/orders` or `/api/users/:userId/orders`, each user strictly retrieves their own orders. Empty query strings return `[]` instead of defaulting to a static test user.
- **Vendor Panel Orders:** The vendor app fetching `/api/vendorPanel/:vendorId/orders` or `/api/orders/vendor/:vendorId` receives only orders placed directly with that specific vendor.
- **Profiles & Addresses:** Updating user or vendor profile details strictly enforces the authenticated token bearer's identity.



---

## New Feature: Vendor Replies to User Reviews (User Panel)

### What Changed
Vendors can reply to user reviews from the vendor app. The user app now has a dedicated endpoint to fetch a user own reviews including vendor replies. Previously, reply data was stored in the database but never returned to the user-facing screen.

---

### Endpoint: Get Authenticated User Reviews (with Vendor Reply)

| Method | URL | Auth |
|--------|-----|------|
| GET | /api/users/my-reviews | Bearer token (recommended) |
| GET | /api/users/:userId/reviews | Bearer token (userId must match token) |
| GET | /api/users/reviews | Bearer token |

Query Params: page (default 1), limit (default 20, max 100)

Success Response 200:

  "success": true,
  "message": "User reviews fetched successfully.",
  "data": {
    "user_id": "usr_abc123",
    "pagination": { "total": 2, "page": 1, "limit": 20, "pages": 1 },
    "reviews": [
      {
        "rating_id": 101,
        "vendor_id": 1430,
        "store_name": "Green Basket",
        "rating": 4.5,
        "review_text": "Great service, very prompt!",
        "has_reply": true,
        "reply": {
          "text": "Thank you for your kind words!",
          "replied_at": "2024-09-02T10:30:00.000Z"
        },
        "created_at": "2024-09-01T08:00:00.000Z"
      },
      {
        "rating_id": 98,
        "vendor_id": 1296,
        "store_name": "Daily Fresh",
        "rating": 3.0,
        "review_text": "Average experience.",
        "has_reply": false,
        "reply": null,
        "created_at": "2024-08-20T14:00:00.000Z"
      }
    ]
  }

Key Fields:
- has_reply: true when vendor has replied. Use this to conditionally show a reply section.
- reply.text: The vendor reply text.
- reply.replied_at: ISO timestamp of reply.
- reply: null when no reply exists.

Mobile UI Recommendation: In the My Reviews tab, if has_reply is true, show a store reply card below the user review. Show replied_at as relative time.

---

### Vendor Reply Endpoint (Vendor App reference)

POST /api/vendor/ratings/:ratingId/reply
POST /api/vendor/reviews/:ratingId/reply

Auth: Vendor Bearer token
Body: { "reply_text": "Thank you for your feedback!" }

Response 200:
  "rating_id": 101,
  "vendor_id": 1430,
  "reply_text": "Thank you for your feedback!",
  "replied_at": "2024-09-02T10:30:00.000Z"

---

### Submit a Review (User App)

POST /api/vendors/:vendorId/ratings or POST /api/ratings

Body:
  "vendor_id": 1430,
  "rating": 4.5,
  "review_text": "Great service!",
  "user_id": "usr_abc123",
  "user_name": "Aman Verma",
  "order_id": "ORD-20240901-001"

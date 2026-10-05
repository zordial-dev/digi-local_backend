# 🌐 Web Frontend Developer Integration Note & API Guide
**Subject:** Resolution of API Timeouts, "Store Not Found" Fallback Bug, and Catalog Optimization  
**Date:** October 2026  
**Backend Version:** DigiLocal Relational API v3.2.0  
**Target:** Web Frontend Developers (`digi-local_website` / React / Next.js)

---

## 📌 Executive Summary

Recently, when navigating to `/all/1430` (or similar store routes), the frontend web application displayed a false **"Store Not Found"** screen (`"We couldn't find an active store with ID 1430. It may have been removed or the link is invalid."`).

### What Actually Happened:
1. **Multi-Megabyte Payload Inflation:** Store records in PostgreSQL had stored large raw base64 data URIs (`data:image/jpeg;base64,...`) in `shop_image` and `logo`.
2. **Response Duplication:** The storefront serializer duplicated these strings across multiple compatibility fields (`cleanVendorObj`, `vendor`, `data.vendor`, root fields), ballooning a single vendor response from **~14 KB to 5.4 MB – 8.3 MB**, and `/api/vendors` to **2.3 MB**.
3. **Frontend Client Abort:** The fetch client in `api.js:35` had an aggressive timeout of **2.0s – 3.0s**. Because transferring 5.4+ MB over cloud networks took ~3.8s, the browser aborted the connection (`0 B transferred`).
4. **Cascade to False "Store Not Found":** In `VendorStorefrontPage.jsx`, the primary request and its fallbacks (`/1430`, `/vendors`, `/stores`) all timed out, evaluating `targetVendor` to `null`. The UI concluded the store was missing.

---

## 🚀 What the Backend Fixed

| Area | Before | Now | Impact |
| :--- | :--- | :--- | :--- |
| **Response Payload (`/api/vendors/1430`)** | **5.4 MB** | **14.3 KB** | **99.7% reduction** |
| **Response Time (`/api/vendors/1430`)** | **>3,800 ms (Timed out)** | **~1,200 ms** | Fast, stable loading |
| **Vendors List (`/api/vendors`)** | **2.3 MB** | **5.5 KB** | Down to ~650 ms |
| **Image URLs** | Inline base64 string | Hosted static URL (`/uploads/...`) | Cacheable by CDN & browser |
| **New Catalog Endpoints** | `404 Not Found` | Dedicated `GET /api/items`, `GET /api/products` | Direct catalog search |
| **Smart Entity Lookup** | `400 Bad Request` | Supports both `item_id` and `vendor_id` on `/api/products/:id` | Seamless fallback |
| **Root Aliases** | `404 Not Found` | Forwarding `/vendors`, `/stores`, `/items`, `/products`, `/services`, `/ping` | Backward compatible |

---

## 🛠️ Required Action Items for Web Frontend Devs

### 1. Adjust Client Timeout in `api.js` (Crucial)
The frontend `api.js` had a strict timeout of `2000ms`–`3000ms`. While queries now complete in ~600ms – 1300ms, real-world internet jitter, slow mobile connections, or initial server wakeups can occasionally take 2.5s – 3.5s.

**Recommended change in your API fetch wrapper (`api.js`):**

```javascript
// src/services/api.js or utils/api.js
const DEFAULT_TIMEOUT_MS = 8000; // Increased from 3000ms to 8000ms (8 seconds)

export async function fetchWithTimeout(resource, options = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS } = options;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms: ${resource}`);
    }
    throw error;
  }
}
```

---

### 2. Differentiate Network Timeouts from 404 "Not Found"
In `VendorStorefrontPage.jsx`, avoid immediately displaying "Store Not Found" if the fetch threw a timeout error (`AbortError` or Network Error). Only render "Store Not Found" when the backend explicitly responds with **HTTP `404`**.

```javascript
// Example in VendorStorefrontPage.jsx
try {
  const res = await api.get(`/api/stores/${vendorId}/items`);
  setVendorData(res.data);
} catch (err) {
  if (err.response?.status === 404) {
    // Legitimately not in database
    setErrorState('NOT_FOUND');
  } else if (err.code === 'ECONNABORTED' || err.name === 'AbortError') {
    // Network or timeout issue
    setErrorState('TIMEOUT'); // Show "Connection is slow. [Retry]" button
  } else {
    setErrorState('SERVER_ERROR');
  }
}
```

---

### 3. Store Photos & Product Image Uploads
**Never send base64 data URIs inside standard JSON bodies.** Always upload images as binary files using `multipart/form-data`:

```javascript
// Correct way to upload images
const formData = new FormData();
formData.append('image', fileObject); // file from <input type="file" />

const uploadRes = await api.post('/api/upload-image', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});

const imageUrl = uploadRes.data.image_url; // Hosted URL e.g. https://digi-local-backend.onrender.com/uploads/img-12345.jpg

// Send the hosted URL in store/product update payload
await api.put(`/api/vendors/${vendorId}/settings`, {
  shop_image: imageUrl,
  store_name: "Yash bakers"
});
```

---

## 📡 API Reference for Web Frontend

### 1. Fetch Storefront & Catalog (Primary)
- **Endpoint:** `GET /api/stores/:vendorId/items` OR `GET /api/vendors/:vendorId`
- **Response Structure (Status 200):**
```json
{
  "success": true,
  "vendor_id": 1430,
  "store_name": "Yash bakers",
  "vendor_name": "Store Manager",
  "category": "Bakery",
  "status": "active",
  "shop_image": "https://digi-local-backend.onrender.com/uploads/vendor-1430.jpg",
  "logo": "https://digi-local-backend.onrender.com/uploads/vendor-logo-1430.jpg",
  "items": [
    {
      "item_id": 1857,
      "vendor_id": 1430,
      "item_name": "Pastry",
      "price": 45,
      "in_stock": true,
      "image_url": "https://digi-local-backend.onrender.com/uploads/item-1857.jpg"
    }
  ],
  "services": []
}
```

### 2. Global Catalog & Item Search
- **Endpoint:** `GET /api/items` (alias: `GET /api/products`)
- **Query Params:**
  - `vendor_id`: Filter items by vendor
  - `category`: Filter items by category
  - `search`: Keyword search in item name & description
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 24)

### 3. Smart Entity Query
- **Endpoint:** `GET /api/products/:id` (alias: `GET /api/items/:id`)
  - If `:id` is an `item_id` (e.g. `1857`), returns single product details.
  - If `:id` is a `vendor_id` (e.g. `1430`), returns that vendor's entire catalog.

### 4. Lightweight Ping & Health
- **Endpoint:** `GET /api/ping` (alias: `GET /ping`)
- **Response:** `{"status": "ok", "message": "pong", "timestamp": "2026-10-05T07:28:38.000Z"}` (~4ms response time)

---

## 🧪 Quick Test Instructions
You can verify the fix in your local web environment right now:
1. Hard-refresh your browser: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac).
2. Open `http://localhost:3000/all/1430`.
3. Check the DevTools Network Tab:
   - Notice `/api/stores/1430/items` completes in ~1.2s with `14.3 KB`.
   - Storefront renders with store name `"Yash bakers"` and its products.

---

## 📦 Update: User Delivery Address & Vendor Society Registration

### 1. User Profile Address & Order Checkout (`POST /api/orders`)
- **Resolved Issue:** When a resident user updated their address in profile settings (`PUT /api/users/profile` or `/api/users/address`), subsequent orders would show an empty delivery address or fall back to a mock address (`"Tower A-402"`).
- **Backend Resolution:** 
  1. `POST /api/orders` now queries the user's saved database record (`users.address`, `flat`, `society_name`, `city`, `pincode`). If `delivery_address` is omitted or empty in the checkout request payload, the backend automatically defaults to the user's latest updated database address.
  2. Order history (`GET /api/users/:userId/orders` and `GET /api/orders/:orderId`) returns the user's authentic saved delivery address with zero hardcoded mock fallbacks.
- **Frontend Action Items:**
  - In checkout/cart state, ensure the active address is initialized from `user.address` fetched via `GET /api/users/:userId` or `GET /api/users/profile`.
  - When posting the order, provide `delivery_address: user.address || selectedAddress`. If omitted, the backend will now safely populate it from the database profile.

### 2. Vendor Society Registration & Admin Panel Display
- **Resolved Issue:** When newly registered vendors entered a society name, the Admin Panel displayed only `"Arg ananta"` (or blank) for each vendor.
- **Root Cause & Backend Resolution:**
  1. Vendor registration (`POST /api/vendors/register`) now properly parses `society_name`, `society`, or `area`, creates the society record if new, links `society_id`, and saves `area` in the `vendors` table.
  2. Admin listing and detail endpoints (`GET /api/admin/vendors`, `/api/vendors/pending`, `/api/vendors/on-hold`, `/api/vendors/:id`) now explicitly include:
     - `society_name` and `societyName` (e.g. `"Palm Residency"`)
     - `society_id` and `societyId` (e.g. `289`)
     - `locationArea` and `area`
  3. Admin onboarding approval and vendor edit routes maintain and persist the correct `society_id` rather than defaulting to mismatched location IDs.
- **Admin Frontend Integration:**
  - Vendor rows/cards can directly bind to `row.societyName || row.society_name || row.locationArea`.


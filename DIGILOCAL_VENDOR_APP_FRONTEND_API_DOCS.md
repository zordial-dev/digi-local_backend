# 🏪 DigiLocal — Vendor App Frontend Developer Master API Documentation
## (React Native, Expo, Flutter, iOS, Android, and Mobile Web)

> **Document Version**: 3.1.0-PROD  
> **Author**: DigiLocal Engineering Architecture Team  
> **Target Audience**: Vendor Mobile & Web App Frontend Developers  
> **Local Network Base URL**: `http://172.25.12.195:5001/api` (Local: `http://localhost:5001/api`)  
> **Production Base URL**: `https://api.digilocal.in/api`  
> **Universal Master OTP**: `999999` (or `123456` for instant testing without SMS)

---

## 📋 Executive Architecture Summary

The **DigiLocal Vendor App** enables local merchants and service providers to manage their digital store, set dynamic Go Global delivery coverage zones, list products or services, fulfill customer orders, and track service enquiries.

This document provides the complete API specification for the **Vendor App Frontend Developer** building mobile apps in React Native, Expo, Flutter, or native iOS/Android.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              VENDOR APP ARCHITECTURAL WORKFLOW                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌─────────────────┐               ┌─────────────────┐               ┌─────────────────┐
│  PHONE & OTP    │               │ GO GLOBAL MAP & │               │ CATALOG & ORDER │
│ AUTHENTICATION  │ ────────────► │ COVERAGE ZONES  │ ────────────► │  MANAGEMENT /   │
│ (MSG91 / Master)│               │ (1km - 10km Max)│               │  LEADS BOARD    │
└─────────────────┘               └─────────────────┘               └─────────────────┘
```

---

## 1. 🔑 Authentication & Header Conventions

All authenticated endpoints require a Bearer access token header:
```http
Authorization: Bearer <VENDOR_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 2. 📱 MOBILE OTP AUTHENTICATION APIs

### 2.1 Send MSG91 Mobile OTP (`POST /api/vendors/send-otp`)

Sends a 6-digit numeric OTP to vendor phone number.

- **Route**: `POST /api/vendors/send-otp`
- **Auth Required**: No

#### Request Payload
```json
{
  "phone": "9876543210"
}
```

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "message": "OTP sent successfully to phone number",
  "phone": "9876543210"
}
```

---

### 2.2 Verify Mobile OTP & Login (`POST /api/vendors/verify-otp` or `POST /api/vendors/login`)

Verifies OTP code and returns vendor authentication JWT tokens. Supports **Universal Master OTP `999999`**.

- **Route**: `POST /api/vendors/verify-otp`
- **Auth Required**: No

#### Request Payload
```json
{
  "phone": "9876543210",
  "otp": "999999"
}
```

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor": {
    "vendor_id": 1,
    "vendor_name": "Raj Kumar",
    "store_name": "Raj Super Mart",
    "phone": "9876543210",
    "vendor_type": "product",
    "delivery_radius_km": 3.0,
    "is_global_coverage": true
  }
}
```

---

## 3. 🗺️ GO GLOBAL MAP COVERAGE APIs

### 3.1 Calculate Dynamic Radius Coverage Zones (`POST /api/vendors/check-coverage`)

Calculates surrounding societies, commercial sectors, sub-areas, and big-areas around `(latitude, longitude)` up to **10 km radius max limit**.

- **Route**: `POST /api/vendors/check-coverage`
- **Auth Required**: No / Optional

#### Request Payload
```json
{
  "latitude": 28.6270,
  "longitude": 77.3720,
  "radius_km": 3.0,
  "sector": "Sector 62",
  "location_type": "society"
}
```

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "vendor_location": {
    "latitude": 28.6270,
    "longitude": 77.3720,
    "sector": "Sector 62"
  },
  "radius_km": 3.0,
  "max_distance_limit_km": 10.0,
  "total_zones": 82,
  "auto_selected_count": 3,
  "zones": [
    {
      "zone_id": "sec_sector_62",
      "name": "Sector 62 Main Market",
      "type": "sector",
      "location": "Sector 62",
      "latitude": 28.6270,
      "longitude": 77.3720,
      "distance_km": 0.5,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    },
    {
      "zone_id": 101,
      "name": "Greenwood Residency",
      "type": "society",
      "location": "Sector 62",
      "latitude": 28.6280,
      "longitude": 77.3730,
      "distance_km": 0.8,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    },
    {
      "zone_id": "sec_adjacent_1",
      "name": "Adjacent Sector Commercial Belt",
      "type": "sector",
      "location": "Sector 62",
      "latitude": 28.6410,
      "longitude": 77.3820,
      "distance_km": 4.2,
      "is_inside_circle": false,
      "is_auto_selected": false,
      "is_active": true
    }
  ]
}
```

---

### 3.2 Save Vendor Serviceable Coverage (`PUT /api/vendors/:vendorId/coverage`)

Saves vendor store coordinates, radius, and active selected zones to DB.

- **Route**: `PUT /api/vendors/:vendorId/coverage`
- **Auth Required**: Yes (`Bearer <VENDOR_TOKEN>`)

#### Request Payload
```json
{
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 3.0,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "selected_zones": [
    {
      "zone_id": "sec_sector_62",
      "name": "Sector 62 Main Market",
      "type": "sector",
      "distance_km": 0.5,
      "is_active": true
    },
    {
      "zone_id": 101,
      "name": "Greenwood Residency",
      "type": "society",
      "distance_km": 0.8,
      "is_active": true
    }
  ]
}
```

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Vendor Go Global dynamic coverage settings updated successfully",
  "vendor": {
    "vendor_id": 1,
    "store_name": "Raj Super Mart",
    "is_global_coverage": true,
    "delivery_radius_km": 3.0,
    "selected_zones_count": 2
  }
}
```

---

## 4. 🛍️ PRODUCT MERCHANT CATALOG & ORDERS APIs

### 4.1 Create Catalog Item (`POST /api/vendorPanel/:vendorId/items`)

- **Route**: `POST /api/vendorPanel/:vendorId/items`
- **Auth Required**: Yes (`Bearer <VENDOR_TOKEN>`)

#### Request Payload
```json
{
  "item_name": "Fresh Organic Butter 500g",
  "category": "Dairy & Milk",
  "price": 275.00,
  "in_stock": true,
  "image_url": "https://img.digilocal.in/items/butter.png"
}
```

---

### 4.2 Update Product Order Status (`PUT /api/orders/:id/status`)

Allowed Status Flow: `Placed` ➔ `Accepted` ➔ `In_Transit` ➔ `Delivered` (or `Cancelled`).

- **Route**: `PUT /api/orders/:id/status`
- **Auth Required**: Yes (`Bearer <VENDOR_TOKEN>`)

#### Request Payload
```json
{
  "status": "Accepted"
}
```

---

## 5. 🛠️ SERVICE PROVIDER ENQUIRIES LEADS BOARD APIs

### 5.1 Fetch Vendor Service Enquiries (`GET /api/vendors/:vendorId/enquiries`)

- **Route**: `GET /api/vendors/:vendorId/enquiries`
- **Auth Required**: Yes (`Bearer <VENDOR_TOKEN>`)

#### Response (HTTP 200 OK)
```json
[
  {
    "enquiry_id": 405,
    "user_name": "Ramesh Gupta",
    "user_phone": "9998887776",
    "service_requested": "Split AC Deep Jet Service",
    "preferred_time": "Today, 4:00 PM",
    "status": "PENDING",
    "created_at": "2026-08-26T14:15:00Z"
  }
]
```

---

## 6. 📱 React Native / Expo Code Snippets

### 6.1 Register Vendor Push Token (FCM / Expo)
```typescript
import * as Notifications from 'expo-notifications';

export async function registerPushToken(vendorId: number, token: string) {
  const res = await fetch(`http://api.digilocal.in/api/vendors/${vendorId}/push-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ push_token: token, device_type: 'expo' })
  });
  return res.json();
}
```

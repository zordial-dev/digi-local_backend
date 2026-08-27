# 🏪 DigiLocal Vendor App (Web & Mobile) - Complete API Integration Documentation

**Document Version**: 1.2.0  
**Target Release**: v1.0.0  
**Target Audience**: Vendor App Frontend Developers (React Native, Expo, Flutter, iOS, Android, and Web)  
**Base URL**: `http://localhost:5000` (or `https://api.digilocal.in`)  
**Frontend Location & Map Guide**: [`FRONTEND_GO_GLOBAL_AND_LOCATION_INTEGRATION_GUIDE.md`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/FRONTEND_GO_GLOBAL_AND_LOCATION_INTEGRATION_GUIDE.md)

---

## Table of Contents
1. [Overview & Architecture Summary](#1-overview--architecture-summary)
2. [Vendor Classification & Location Model](#2-vendor-classification--location-model)
3. [Authentication & Header Conventions](#3-authentication--header-conventions)
4. [TypeScript Data Models & Schemas](#4-typescript-data-models--schemas)
5. [Complete API Endpoints Reference](#5-complete-api-endpoints-reference)
   - [5.1 MSG91 Mobile OTP Service (`POST /api/vendors/send-otp`, `POST /api/vendors/verify-otp`)](#51-msg91-mobile-otp-service)
   - [5.2 Dynamic Coverage Zone Calculator (`POST /api/vendors/check-coverage`)](#52-dynamic-coverage-zone-calculator)
   - [5.3 Vendor Registration with Classification (`POST /api/vendors/register`)](#53-vendor-registration-with-classification)
   - [5.4 Vendor Login & Token Refresh (`POST /api/vendors/login`, `POST /api/vendors/refresh`)](#54-vendor-login--token-refresh)
   - [5.5 Fetch Vendor Profile & Dashboard (`GET /api/vendors/:id`, `GET /api/vendorPanel/:vendorId`)](#55-fetch-vendor-profile--dashboard)
   - [5.6 Update Delivery Radius & Zone Coverage (`PUT /api/vendors/:vendorId/coverage`)](#56-update-delivery-radius--zone-coverage)
   - [5.7 Product Catalog Management (`POST`, `PUT`, `DELETE /api/vendorPanel/:vendorId/items`)](#57-product-catalog-management)
   - [5.8 Product Orders Management (`GET /api/orders/vendor/:vendorId`, `PUT /api/orders/:id/status`)](#58-product-orders-management)
   - [5.9 Service Enquiries Lead Board (`GET /api/vendors/:vendorId/enquiries`, `PUT /api/enquiries/:enquiryId`)](#59-service-enquiries-lead-board)
   - [5.10 Push Notification Token Registration (`POST /api/vendors/push-token`)](#510-push-notification-token-registration)
6. [Frontend UI Implementation Guidelines](#6-frontend-ui-implementation-guidelines)
7. [Error Handling & Code Reference](#7-error-handling--code-reference)

---

## 1. Overview & Architecture Summary

DigiLocal connects residents with local **Product Merchants** (Grocery, Bakery, Chemist) and **Service Providers** (Electrician, AC Repair, Plumbing, Housekeeping).

The Vendor App operates on two main business streams:
- **Product Merchants**: Manage item catalog, prices, and stock inventory. Receive product orders with a simplified 3-stage flow: `Placed` → `Accepted` → `Delivered`.
- **Service Providers**: Catalog item addition is **disabled** (`can_add_items: false`). Vendor receives lead notifications on a dedicated **Service Enquiries Board** with direct one-tap Call and WhatsApp contact CTAs and status progression: `NEW` → `CONTACTED` → `SCHEDULED` → `COMPLETED`.

---

## 2. Vendor Classification & Location Model

### 2.1 Vendor Classification Matrix
| Aspect | Product Merchant | Service Provider |
| :--- | :--- | :--- |
| `vendor_type` | `"product"` | `"service"` |
| `can_add_items` | `true` | `false` (API blocks catalog creation with 403 Forbidden) |
| Primary Dashboard Tab | Catalog / Menu & Orders | Service Enquiries & Leads Board |
| Order / Enquiry Flow | `Placed` → `Accepted` → `Delivered` | `NEW` → `CONTACTED` → `SCHEDULED` → `COMPLETED` |
| Primary Mobile CTA | Add Product Shortcut / Order Status | Accepting Enquiries Toggle & 1-Tap Call/WhatsApp |
| Audio Alert Chime | Order Siren Chime | Service Request Alert Chime |

### 2.2 Baseline Location & "Go Global" Dynamic Coverage
- **Society Vendor** (`location_type: "society"`): Locked to baseline society (`society_id`).
- **Area / Sector Vendor** (`location_type: "area_sector"`): Baseline covers local sector (`sector_name`).
- **"Go Global" Expansion**: Vendors toggle `is_global_coverage: true`, choose a radius (`delivery_radius_km`: 1, 3, 5, 10, 15 km), query `POST /api/vendors/check-coverage`, and selectively toggle active `selected_zones`.

---

## 3. Authentication & Header Conventions

> [!IMPORTANT]
> **Universal Master OTP for Testing & Staging (`999999`)**:
> The backend explicitly allows **`999999`** (or `123456`) as a **Universal Master OTP** bypass.
> Mobile App and Web frontend developers can input **`999999`** during mobile login, registration, or OTP verification across all **Vendor Panels (Mobile & Web)** and **User Panels** to gain instant access without requiring live SMS delivery.

All protected endpoints require the HTTP Bearer Authorization header:
```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

---

## 4. TypeScript Data Models & Schemas

```typescript
export type VendorType = 'product' | 'service';
export type LocationType = 'society' | 'area_sector';

export interface CoverageZoneItem {
  zone_id: number | string;
  name: string;
  type: 'society' | 'sector' | 'sub_area';
  is_active: boolean;
}

export interface VendorProfile {
  vendor_id: number;
  society_id: number;
  vendor_name: string;
  store_name: string;
  email: string;
  phone_number: string;
  whatsapp_number?: string;
  vendor_type: VendorType;
  can_add_items: boolean;
  location_type: LocationType;
  is_global_coverage: boolean;
  delivery_radius_km: number;
  selected_zones: CoverageZoneItem[];
  account_number: string;
  ifsc_code: string;
  bank_name: string;
  account_holder_name: string;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE';
}

export interface ServiceEnquiryLead {
  enquiry_id: number;
  vendor_id: number;
  user_id?: string;
  user_name: string;
  user_phone: string;
  society_id?: number;
  society_name?: string;
  sector?: string;
  service_type: string;
  preferred_time: string;
  description: string;
  issue_photos: string[];
  status: 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  direct_actions: {
    whatsapp_link: string;
    call_link: string;
  };
}

export interface ProductOrder {
  order_id: string;
  vendor_id: number;
  customer_name: string;
  phone: string;
  delivery_address: string;
  total_amount: number;
  status: 'PLACED' | 'ACCEPTED' | 'DELIVERED';
  created_at: string;
  items: Array<{
    item_name: string;
    quantity: number;
    price: number;
  }>;
}
```

---

## 5. Complete API Endpoints Reference

### 5.1 MSG91 Mobile OTP Service

#### Trigger Mobile OTP (`POST /api/vendors/send-otp`)
```json
{
  "mobile": "9876543210",
  "purpose": "register"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "provider": "msg91",
  "message": "OTP sent successfully via MSG91 SMS",
  "target": "9876543210"
}
```

#### Verify Mobile OTP (`POST /api/vendors/verify-otp`)
```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "valid": true
}
```

---

### 5.2 Dynamic Coverage Zone Calculator (`POST /api/vendors/check-coverage`)

Calculates surrounding housing societies and commercial sectors within a given radius using Haversine distance, auto-selecting zones inside the circle while permitting manual toggle for nearby zones.

```json
{
  "latitude": 28.6270,
  "longitude": 77.3720,
  "radius_km": 3,
  "sector": "Sector 62",
  "location_type": "society"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "vendor_location": {
    "latitude": 28.6270,
    "longitude": 77.3720,
    "address": "Sector 62, Noida"
  },
  "radius_km": 3,
  "location_type": "society",
  "total_zones": 6,
  "auto_selected_count": 3,
  "zones": [
    {
      "zone_id": 1,
      "name": "Omaxe Greenwood Residency",
      "type": "society",
      "latitude": 28.6270,
      "longitude": 77.3720,
      "distance_km": 0,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    },
    {
      "zone_id": 2,
      "name": "Apex Golf Avenue",
      "type": "society",
      "latitude": 28.6320,
      "longitude": 77.3780,
      "distance_km": 0.82,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    }
  ]
}
```

---

### 5.3 Vendor Registration with Classification (`POST /api/vendors/register`)

```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh Electrical & AC Repair",
  "email": "ramesh.services@gmail.com",
  "phone_number": "9876500001",
  "password": "VendorPassword123!",
  "account_number": "918890450564",
  "ifsc_code": "SBIN0001234",
  "bank_name": "State Bank of India",
  "account_holder_name": "Ramesh Kumar",
  "vendor_type": "service",
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 5,
  "selected_zones": [
    { "zone_id": 1, "name": "Greenwood Residency", "type": "society", "is_active": true }
  ]
}
```
**Response (201 Created):**
```json
{
  "token": "eyJhbGciOi...",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "vendor_id": 12,
  "vendor": {
    "vendor_id": 12,
    "store_name": "Ramesh Electrical & AC Repair",
    "vendor_type": "service",
    "can_add_items": false,
    "location_type": "area_sector",
    "is_global_coverage": true,
    "delivery_radius_km": 5,
    "status": "ACTIVE"
  }
}
```

---

### 5.4 Vendor Login & Token Refresh

#### Login (`POST /api/vendors/login`)
```json
{
  "identifier": "9876500001",
  "password": "VendorPassword123!"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOi...",
  "accessToken": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "vendor_id": 12,
  "store_name": "Ramesh Electrical & AC Repair"
}
```

---

### 5.5 Fetch Vendor Profile & Dashboard (`GET /api/vendors/:id`)

```bash
curl -X GET http://localhost:5000/api/vendors/12
```
**Response (200 OK):**
```json
{
  "vendor_id": 12,
  "store_name": "Ramesh Electrical & AC Repair",
  "vendor_name": "Ramesh Kumar",
  "phone_number": "9876500001",
  "vendor_type": "service",
  "can_add_items": false,
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 5,
  "selected_zones": [
    { "zone_id": 1, "name": "Greenwood Residency", "type": "society", "is_active": true }
  ],
  "items": []
}
```

---

### 5.6 Update Delivery Radius & Zone Coverage (`PUT /api/vendors/:vendorId/coverage`)

```http
PUT /api/vendors/12/coverage
Authorization: Bearer <accessToken>
Content-Type: application/json
```
```json
{
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 3,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "location_address": "Sector 62, Noida, UP",
  "selected_zones": [
    { "zone_id": 1, "name": "Omaxe Greenwood Residency", "type": "society", "is_active": true },
    { "zone_id": 2, "name": "Apex Golf Avenue", "type": "society", "is_active": true }
  ]
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor delivery coverage settings updated successfully",
  "vendor_id": 12,
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 3,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "location_address": "Sector 62, Noida, UP",
  "selected_zones": [
    { "zone_id": 1, "name": "Omaxe Greenwood Residency", "type": "society", "is_active": true },
    { "zone_id": 2, "name": "Apex Golf Avenue", "type": "society", "is_active": true }
  ]
}
```

---

### 5.7 Product Catalog Management

#### Add Product Item (`POST /api/vendorPanel/:vendorId/items`)
> ⚠️ **Note**: Service Providers (`vendor_type: "service"`) attempting this call receive HTTP 403 Forbidden.

```json
{
  "item_name": "Amul Fresh Butter 500g",
  "price": 275.00,
  "stock": 40,
  "category": "Dairy & Bakery",
  "unit": "packet",
  "is_available": true
}
```
**Error Response for Service Providers (403 Forbidden):**
```json
{
  "error": "Item catalog is disabled for Service Providers. Service requests are managed via the Service Enquiries panel.",
  "can_add_items": false,
  "vendor_type": "service"
}
```

---

### 5.8 Product Orders Management

#### List Orders (`GET /api/orders/vendor/:vendorId`)
**Response (200 OK):**
```json
[
  {
    "order_id": "ORD-178772",
    "customer_name": "Aarushi",
    "phone": "9811223344",
    "delivery_address": "Tower A-402, Greenwood Residency",
    "total_amount": 450.00,
    "status": "PLACED",
    "created_at": "2026-08-26T11:00:00.000Z",
    "items": [
      { "item_name": "Amul Taaza Milk 1L", "quantity": 2, "price": 68.00 }
    ]
  }
]
```

#### Update Order Status (`PUT /api/orders/:id/status`)
Flow: `PLACED` → `ACCEPTED` → `DELIVERED`

```json
{
  "status": "ACCEPTED"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order_id": "ORD-178772",
  "status": "ACCEPTED"
}
```

---

### 5.9 Service Enquiries Lead Board

#### List Vendor Service Enquiries (`GET /api/vendors/:vendorId/enquiries`)
```bash
curl -X GET http://localhost:5000/api/vendors/12/enquiries?status=NEW
```
**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 12,
  "total_enquiries": 1,
  "enquiries": [
    {
      "enquiry_id": 104,
      "user_name": "Ananya Sharma",
      "user_phone": "9811223344",
      "society_name": "Greenwood Residency",
      "sector": "Sector 62",
      "service_type": "AC Servicing & Gas Top-up",
      "preferred_time": "2026-08-28 10:00 AM - 12:00 PM",
      "description": "AC cooling is weak and making buzzing noise",
      "issue_photos": ["https://example.com/ac_leakage.jpg"],
      "status": "NEW",
      "created_at": "2026-08-26T11:20:00.000Z",
      "direct_actions": {
        "whatsapp_link": "https://wa.me/919811223344?text=Hi%20Ananya...",
        "call_link": "tel:9811223344"
      }
    }
  ]
}
```

#### Update Enquiry Status (`PUT /api/enquiries/:enquiryId`)
Allowed statuses: `NEW`, `CONTACTED`, `SCHEDULED`, `COMPLETED`, `CANCELLED`

```json
{
  "status": "CONTACTED"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "Enquiry status updated to CONTACTED",
  "enquiry_id": 104,
  "status": "CONTACTED"
}
```

---

### 5.10 Push Notification Token Registration (`POST /api/vendors/push-token`)

Registers FCM or Expo Push Token for instant audio siren chime alerts.

```json
{
  "vendor_id": 12,
  "push_token": "ExponentPushToken[mock_expo_token_123456]",
  "platform": "expo"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "message": "FCM / Expo device push token registered successfully",
  "vendor_id": 12
}
```

---

## 6. Frontend UI Implementation Guidelines

1. **Service Lead Alert Siren (Mobile App)**: On socket event or FCM push for a new service enquiry, trigger full-screen overlay (`AlarmOverlay.tsx`) with audio chime and instant WhatsApp/Call buttons.
2. **One-Tap WhatsApp CTA**: Use `enquiry.direct_actions.whatsapp_link` directly with `Linking.openURL(whatsapp_link)` on mobile or `window.open(whatsapp_link, '_blank')` on web.
3. **Accepting Enquiries Toggle**: Display persistent availability toggle in vendor profile header.

---

## 7. Error Handling & Code Reference

| Status Code | Message | Description |
| :--- | :--- | :--- |
| `400 Bad Request` | Missing parameters | Invalid JSON or missing mandatory fields |
| `401 Unauthorized` | Invalid JWT token | Token expired or invalid signature |
| `403 Forbidden` | Item catalog is disabled | Service vendors cannot add catalog items |
| `404 Not Found` | Vendor/Order/Enquiry not found | Invalid entity identifier |
| `500 Server Error` | DB query failed | Internal server error |

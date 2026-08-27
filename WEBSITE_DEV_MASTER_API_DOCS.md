# 🌐 DigiLocal — Website Developer Master API Handbook (User Panel + Vendor Web Panel)

**Document Version**: 2.0.0-MASTER  
**Target Release**: v1.0.0  
**Target Audience**: Website Developers (React, Next.js, Vue, Web Apps building User & Vendor Portals)  
**Base URL**: `http://localhost:5000/api` (Production: `https://api.digilocal.in/api`)  
**Authentication Header**: `Authorization: Bearer <ACCESS_TOKEN>`

---

## 📋 Master Table of Contents
1. [Platform Architecture & Integration Overview](#1-platform-architecture--integration-overview)
2. [Global Authentication & HTTP Client Setup](#2-global-authentication--http-client-setup)
3. [PART A: USER / RESIDENT WEB PANEL APIs](#part-a-user--resident-web-panel-apis)
   - [A1. Resident Auth & Profile APIs](#a1-resident-auth--profile-apis)
   - [A2. Housing Societies & Location Selector](#a2-housing-societies--location-selector)
   - [A3. Storefront Discovery & Search (Location Matching & Badges)](#a3-storefront-discovery--search-location-matching--badges)
   - [A4. Product Merchant Storefront & Checkout Flow](#a4-product-merchant-storefront--checkout-flow)
   - [A5. Service Provider Storefront & WhatsApp Enquiry Flow](#a5-service-provider-storefront--whatsapp-enquiry-flow)
   - [A6. Resident Dual Activity Dashboard (Orders & Enquiries)](#a6-resident-dual-activity-dashboard-orders--enquiries)
4. [PART B: VENDOR WEB PANEL APIs](#part-b-vendor-web-panel-apis)
   - [B1. Vendor Registration Stepper & Onboarding](#b1-vendor-registration-stepper--onboarding)
   - [B2. MSG91 OTP & Vendor Authentication](#b2-msg91-otp--vendor-authentication)
   - [B3. Dynamic Coverage Zone Calculator & Settings Editor](#b3-dynamic-coverage-zone-calculator--settings-editor)
   - [B4. Product Merchant Catalog & Order Management](#b4-product-merchant-catalog--order-management)
   - [B5. Service Provider Enquiries & Leads Board](#b5-service-provider-enquiries--leads-board)
   - [B6. Image & Logo Upload Utilities](#b6-image--logo-upload-utilities)
5. [TypeScript Interfaces & Code Snippets](#5-typescript-interfaces--code-snippets)

---

## 1. Platform Architecture & Integration Overview

The DigiLocal website contains two integrated portals built into a single responsive web web-app:
1. **User / Resident Web Panel**: Location selection, vendor discovery, product shopping cart, service enquiry modal with direct WhatsApp chat redirection, and dual order/enquiry tracking dashboard.
2. **Vendor Web Panel**: Registration stepper, classification selection (Product vs Service), Go-Global dynamic coverage zone map/picker, catalog item manager (Product Vendors), and Service Enquiries Leads Board (Service Vendors).

---

## 2. Global Authentication & HTTP Client Setup

> [!IMPORTANT]
> **Universal Master OTP for Testing & Staging (`999999`)**:
> The backend explicitly allows **`999999`** (or `123456`) as a **Universal Master OTP** bypass.
> Website and App frontend developers can input **`999999`** during mobile login, registration, or password reset across all **User (Resident) Panels** and **Vendor Panels (Web & Mobile)** to gain instant access without requiring live SMS delivery.

Attach the Bearer token for protected requests:
```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

### Automatic Axios Token Refresh Interceptor
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('http://localhost:5000/api/vendors/refresh', { refreshToken });
          const newAccessToken = res.data.accessToken;
          localStorage.setItem('access_token', newAccessToken);
          error.config.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(error.config);
        } catch (e) {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## PART A: USER / RESIDENT WEB PANEL APIs

### A1. Resident Auth & Profile APIs

#### A1.1 Send Resident OTP (`POST /api/users/send-otp`)
```json
{ "phone": "9811223344" }
```
**Response (200 OK):**
```json
{ "message": "OTP sent successfully to phone number", "phone": "9811223344" }
```

#### A1.2 Verify Resident OTP (`POST /api/users/verify-otp`)
```json
{ "mobile": "9811223344", "otp": "123456" }
```
**Response (200 OK):**
```json
{ "message": "OTP verified successfully", "mobile": "9811223344" }
```

#### A1.3 Register Resident User (`POST /api/users/register`)
```json
{
  "name": "Ananya Sharma",
  "phone": "9811223344",
  "email": "ananya@gmail.com",
  "password": "Password123!",
  "society_id": 1,
  "sector_name": "Sector 62",
  "primary_delivery_address": "Tower A-402, Greenwood Residency"
}
```
**Response (201 Created):**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "user_id": "usr_9811223344",
    "name": "Ananya Sharma",
    "phone": "9811223344",
    "society_id": 1
  }
}
```

---

### A2. Housing Societies & Location Selector

#### A2.1 List All Societies (`GET /api/societies`)
```bash
curl -X GET http://localhost:5000/api/societies
```
**Response (200 OK):**
```json
[
  {
    "society_id": 1,
    "society_name": "Greenwood Residency",
    "location": "Sector 62, Noida",
    "city": "Noida",
    "pincode": "201309"
  }
]
```

---

### A3. Storefront Discovery & Search (Location Matching & Badges)

#### `GET /api/vendors/search`

Filters active vendors matching resident location (Society or Sector) and attaches dynamic `coverage_badge`.

#### Query Parameters:
- `societyId` / `society_id`: Resident selected society ID (e.g. `1`)
- `sector` / `sectorId`: Resident sector name (e.g. `"Sector 62"`)
- `type` / `vendor_type`: `"product"` | `"service"`
- `search` / `q`: Keyword search term
- `page`, `limit`: Pagination parameters

#### Request Example:
```bash
curl -X GET "http://localhost:5000/api/vendors/search?societyId=1&type=service"
```

#### Response Example (200 OK):
```json
[
  {
    "vendor_id": 12,
    "store_name": "Ramesh Electrical & AC Repair",
    "vendor_name": "Ramesh Kumar",
    "phone_number": "9876500001",
    "whatsapp_number": "9876500001",
    "vendor_type": "service",
    "can_add_items": false,
    "location_type": "area_sector",
    "is_global_coverage": true,
    "delivery_radius_km": 5,
    "coverage_badge": "In Your Society",
    "logo": "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200",
    "society_name": "Greenwood Residency"
  },
  {
    "vendor_id": 15,
    "store_name": "Sharma AC Cooling",
    "vendor_name": "Sharma Ji",
    "vendor_type": "service",
    "can_add_items": false,
    "coverage_badge": "Extended Service (Within 10 km)",
    "logo": "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=200"
  }
]
```

---

### A4. Product Merchant Storefront & Checkout Flow

#### A4.1 Get Vendor Store Profile & Product Catalog (`GET /api/vendors/:id`)
```bash
curl -X GET http://localhost:5000/api/vendors/10
```
**Response (200 OK):**
```json
{
  "vendor_id": 10,
  "store_name": "FreshMart Grocery",
  "vendor_type": "product",
  "can_add_items": true,
  "items": [
    {
      "item_id": 101,
      "item_name": "Amul Taaza Milk 1L",
      "price": 68.00,
      "stock": 100,
      "category": "Dairy",
      "in_stock": true
    }
  ]
}
```

#### A4.2 Place Customer Product Order (`POST /api/orders`)
Flow: `Placed` → `Accepted` → `Delivered`

```json
{
  "vendor_id": 10,
  "user_id": "usr_9811223344",
  "customer_name": "Ananya Sharma",
  "phone": "9811223344",
  "society_id": 1,
  "delivery_address": "Tower A-402, Greenwood Residency",
  "total_amount": 136.00,
  "items": [
    { "item_id": 101, "item_name": "Amul Taaza Milk 1L", "quantity": 2, "price": 68.00 }
  ]
}
```
**Response (201 Created):**
```json
{
  "message": "Order placed successfully",
  "order_id": "ORD-178772",
  "total_amount": 136.00,
  "status": "PLACED",
  "whatsapp_url": "https://wa.me/919876543210?text=...",
  "created_at": "2026-08-26T11:45:00.000Z"
}
```

---

### A5. Service Provider Storefront & WhatsApp Enquiry Flow

When resident clicks **"Request Service / Enquiry"** on a Service Vendor profile:

#### Submit Service Enquiry (`POST /api/enquiries`)

```json
{
  "vendor_id": 12,
  "user_id": "usr_9811223344",
  "user_name": "Ananya Sharma",
  "user_phone": "9811223344",
  "society_id": 1,
  "society_name": "Greenwood Residency",
  "sector": "Sector 62",
  "service_type": "AC Servicing & Gas Top-up",
  "preferred_time": "2026-08-28 10:00 AM - 12:00 PM",
  "description": "AC cooling is weak and making buzzing noise",
  "issue_photos": ["https://example.com/ac_leakage.jpg"]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Service enquiry submitted successfully!",
  "enquiry": {
    "enquiry_id": 104,
    "vendor_id": 12,
    "store_name": "Ramesh Electrical & AC Repair",
    "user_name": "Ananya Sharma",
    "user_phone": "9811223344",
    "service_type": "AC Servicing & Gas Top-up",
    "status": "NEW",
    "created_at": "2026-08-26T11:45:00.000Z",
    "direct_actions": {
      "whatsapp_link": "https://wa.me/919876500001?text=Hi%20Ramesh%20Electrical%20%26%20AC%20Repair%2C%20I%20have%20submitted%20a%20service%20request%20%23104%20for%20AC%20Servicing%20%26%20Gas%20Top-up.",
      "call_link": "tel:9876500001"
    }
  }
}
```

#### Frontend Direct WhatsApp Redirect Trigger:
```javascript
// On 201 response, open pre-filled WhatsApp chat in new window
if (response.data?.enquiry?.direct_actions?.whatsapp_link) {
  window.open(response.data.enquiry.direct_actions.whatsapp_link, '_blank');
}
```

---

### A6. Resident Dual Activity Dashboard (Orders & Enquiries)

#### A6.1 Resident Order History (`GET /api/user/:userId/orders`)
```bash
curl -X GET http://localhost:5000/api/user/usr_9811223344/orders
```

#### A6.2 Resident Service Enquiry History (`GET /api/user/:userId/enquiries`)
```bash
curl -X GET http://localhost:5000/api/user/usr_9811223344/enquiries
```
**Response (200 OK):**
```json
{
  "success": true,
  "total_enquiries": 1,
  "enquiries": [
    {
      "enquiry_id": 104,
      "store_name": "Ramesh Electrical & AC Repair",
      "service_type": "AC Servicing & Gas Top-up",
      "preferred_time": "2026-08-28 10:00 AM - 12:00 PM",
      "status": "NEW",
      "created_at": "2026-08-26T11:45:00.000Z",
      "direct_actions": {
        "whatsapp_link": "https://wa.me/919876500001?text=...",
        "call_link": "tel:9876500001"
      }
    }
  ]
}
```

---

## PART B: VENDOR WEB PANEL APIs

### B1. Vendor Registration Stepper & Onboarding (`POST /api/vendors/register`)

#### Onboarding Payload (Service Provider with Go-Global Coverage):
```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh Electrical Services",
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
    "store_name": "Ramesh Electrical Services",
    "vendor_type": "service",
    "can_add_items": false,
    "status": "ACTIVE"
  }
}
```

---

### B2. MSG91 OTP & Vendor Authentication

#### B2.1 Send Vendor OTP (`POST /api/vendors/send-otp`)
```json
{ "mobile": "9876500001", "purpose": "login" }
```

#### B2.2 Verify Vendor OTP (`POST /api/vendors/verify-otp`)
```json
{ "mobile": "9876500001", "otp": "123456" }
```

#### B2.3 Vendor Login (`POST /api/vendors/login`)
```json
{ "identifier": "9876500001", "password": "VendorPassword123!" }
```

---

### B3. Dynamic Coverage Zone Calculator & Settings Editor

#### B3.1 Coverage Zone Calculator (`POST /api/vendors/check-coverage`)
```json
{
  "radius_km": 5,
  "sector": "Sector 62",
  "location_type": "society"
}
```
**Response (200 OK):**
```json
{
  "success": true,
  "radius_km": 5,
  "total_zones": 3,
  "zones": [
    { "zone_id": 1, "name": "Greenwood Residency", "type": "society", "is_active": true },
    { "zone_id": 2, "name": "Apex Golf Avenue", "type": "society", "is_active": true }
  ]
}
```

#### B3.2 Update Coverage Settings (`PUT /api/vendors/:vendorId/coverage`)
```http
PUT /api/vendors/12/coverage
Authorization: Bearer <accessToken>
Content-Type: application/json
```
```json
{
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 10,
  "selected_zones": [
    { "zone_id": 1, "name": "Greenwood Residency", "type": "society", "is_active": true },
    { "zone_id": 2, "name": "Apex Golf Avenue", "type": "society", "is_active": true }
  ]
}
```

---

### B4. Product Merchant Catalog & Order Management

#### B4.1 Add Product Catalog Item (`POST /api/vendorPanel/:vendorId/items`)
> ⚠️ **Restriction**: If `vendor_type === "service"`, API returns `403 Forbidden`.

```json
{
  "item_name": "Amul Fresh Butter 500g",
  "price": 275.00,
  "stock": 40,
  "category": "Dairy",
  "unit": "packet",
  "is_available": true
}
```
**Error Response for Service Vendors (403 Forbidden):**
```json
{
  "error": "Item catalog is disabled for Service Providers. Service requests are managed via the Service Enquiries panel.",
  "can_add_items": false,
  "vendor_type": "service"
}
```

#### B4.2 Fetch Vendor Product Orders (`GET /api/orders/vendor/:vendorId`)

#### B4.3 Update Order Status (`PUT /api/orders/:id/status`)
Flow: `PLACED` → `ACCEPTED` → `DELIVERED`
```json
{ "status": "ACCEPTED" }
```

---

### B5. Service Provider Enquiries & Leads Board

#### B5.1 Fetch Service Enquiries (`GET /api/vendors/:vendorId/enquiries`)
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
      "status": "NEW",
      "created_at": "2026-08-26T11:20:00.000Z",
      "direct_actions": {
        "whatsapp_link": "https://wa.me/919811223344?text=Hi...",
        "call_link": "tel:9811223344"
      }
    }
  ]
}
```

#### B5.2 Update Enquiry Status (`PUT /api/enquiries/:enquiryId`)
Allowed statuses: `NEW`, `CONTACTED`, `SCHEDULED`, `COMPLETED`, `CANCELLED`
```json
{ "status": "CONTACTED" }
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

### B6. Image & Logo Upload Utilities

#### Upload Photo (`POST /api/vendorPanel/upload-image`)
- Headers: `Content-Type: multipart/form-data`
- Body: Form-data with field name `image`

**Response (200 OK):**
```json
{
  "success": true,
  "image_url": "http://localhost:5000/uploads/item_178772_a8f92c.jpg"
}
```

---

## 5. TypeScript Interfaces & Code Snippets

```typescript
export type VendorType = 'product' | 'service';
export type LocationType = 'society' | 'area_sector';
export type EnquiryStatus = 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PLACED' | 'ACCEPTED' | 'DELIVERED';

export interface VendorSearchResult {
  vendor_id: number;
  store_name: string;
  vendor_name: string;
  phone_number: string;
  whatsapp_number?: string;
  vendor_type: VendorType;
  can_add_items: boolean;
  location_type: LocationType;
  is_global_coverage: boolean;
  delivery_radius_km: number;
  coverage_badge: 'In Your Society' | 'Local Sector' | string;
  logo: string;
  society_name?: string;
}

export interface ServiceEnquiryPayload {
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
  issue_photos?: string[];
}

export interface ProductOrderPayload {
  vendor_id: number;
  user_id: string;
  customer_name: string;
  phone: string;
  society_id: number;
  delivery_address: string;
  total_amount: number;
  items: Array<{
    item_id: number;
    item_name: string;
    quantity: number;
    price: number;
  }>;
}
```

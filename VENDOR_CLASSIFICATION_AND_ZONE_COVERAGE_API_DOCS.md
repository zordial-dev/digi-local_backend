# DigiLocal Complete Specification & Implementation Guide: Vendor Classification, Dynamic Zone Coverage & Resident Experience

**Document Version**: 1.2.0  
**Author**: DigiLocal Engineering Architecture Team  
**Date**: August 26, 2026  
**Status**: Ready for Engineering Execution & Frontend Integration  
**Base URL**: `http://localhost:5000` (Production: `https://api.digilocal.in`)  
**Frontend Guide**: [`FRONTEND_GO_GLOBAL_AND_LOCATION_INTEGRATION_GUIDE.md`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/FRONTEND_GO_GLOBAL_AND_LOCATION_INTEGRATION_GUIDE.md)

---

## Table of Contents
1. [Executive Summary & Platform Overview](#1-executive-summary--platform-overview)
2. [Key Architectural Behaviors](#2-key-architectural-behaviors)
   - [2.1 Vendor Classification System (Product vs Service)](#21-vendor-classification-system)
   - [2.2 Location & Dynamic Coverage Model](#22-location--dynamic-coverage-model)
   - [2.3 Hyper-Local Trust Badges & Search Matching](#23-hyper-local-trust-badges--search-matching)
3. [Data Models & Database Schema](#3-data-models--database-schema)
4. [Backend API Reference](#4-backend-api-reference)
   - [4.1 Check Coverage Zones (`POST /api/vendors/check-coverage`)](#41-check-coverage-zones)
   - [4.2 Vendor Registration with Classification (`POST /api/vendors/register`)](#42-vendor-registration)
   - [4.3 Update Delivery Radius & Zones (`PUT /api/vendors/:vendorId/coverage`)](#43-update-coverage)
   - [4.4 Location-Aware Storefront Vendor Search (`GET /api/vendors/search`)](#44-storefront-search)
   - [4.5 Service Enquiry Submission & WhatsApp Action (`POST /api/enquiries`)](#45-service-enquiry-submission)
   - [4.6 Resident Service Enquiry History (`GET /api/user/:userId/enquiries`)](#46-resident-enquiry-history)
   - [4.7 Vendor Service Enquiries Board (`GET /api/vendors/:vendorId/enquiries`)](#47-vendor-enquiries-board)
   - [4.8 Update Enquiry Status (`PUT /api/enquiries/:enquiryId`)](#48-update-enquiry-status)
   - [4.9 Item Catalog Creation Guard (`POST /api/vendorPanel/:vendorId/items`)](#49-catalog-creation-guard)
   - [4.10 Simplified Product Orders Flow (`POST /api/orders`, `PUT /api/orders/:id/status`)](#410-product-orders-flow)
5. [Frontend App Integration Manuals](#5-frontend-app-integration-manuals)
   - [5.1 Vendor App (Web & Mobile) Handbook (`VENDOR_APP_API_DOCUMENTATION.md`)](#51-vendor-app-handbook)
   - [5.2 Resident Website Storefront Handbook (`USER_API_DOCUMENTATION.md`)](#52-resident-website-handbook)
   - [5.3 Admin Portal Handbook (`ADMIN_PANEL_BACKEND_API_DOCS.md`)](#53-admin-portal-handbook)
6. [Verification & Automated Test Results](#6-verification--automated-test-results)

---

## 1. Executive Summary & Platform Overview

> [!IMPORTANT]
> **Universal Master OTP (`999999`) for All Panels**:
> The backend explicitly supports **`999999`** (or `123456`) as a **Universal Master OTP** bypass across all **User (Resident)** and **Vendor (Mobile App & Web)** panels. Frontend developers can use **`999999`** during testing for instant mobile verification without requiring live SMS delivery.

DigiLocal is a hyper-local marketplace platform connecting residents with local **Product Merchants** (Grocery, Bakery, Chemist) and **Service Providers** (Electrician, AC Repair, Plumbing, Housekeeping).

This complete specification covers the unified API architecture spanning vendor onboarding, dynamic radius-based coverage, resident storefront discovery, WhatsApp enquiry routing, simplified product order tracking (`Placed` → `Accepted` → `Delivered`), and cross-platform frontend integration for Vendor App (Web + Mobile), Resident App (Web), and Admin Portal.

---

## 2. Key Architectural Behaviors

### 2.1 Vendor Classification System
- **Product Merchants** (`vendor_type: "product"`): Full item catalog capabilities (`can_add_items: true`). Store owners create, update, and manage inventory stock and prices. Product order workflow: `Placed` → `Accepted` → `Delivered`.
- **Service Providers** (`vendor_type: "service"`): Item catalog disabled (`can_add_items: false`). Any attempt to call item addition endpoints returns `403 Forbidden`. Service providers manage leads via the **Service Enquiries Board** with status progression: `NEW` → `CONTACTED` → `SCHEDULED` → `COMPLETED`.

### 2.2 Location & Dynamic Coverage Model
- **Society Vendor** (`location_type: "society"`): Baseline delivery is locked to residents of the onboarded Residential Society (`society_id`).
- **Area / Sector Vendor** (`location_type: "area_sector"`): Baseline delivery automatically encompasses all residents in the vendor's local sector/locality (`sector_name`).
- **"Go Global" Expansion (Both Vendor Panels)**: Both Product Merchants and Service Providers can activate **Go Global** mode (`is_global_coverage: true`).
  1. Vendor selects radius (`delivery_radius_km`: 1, 3, 5, 10, or 15 km).
  2. Vendor clicks **Go Global** button -> System prompts for current location (Geolocation API or location pin).
  3. Interactive Google Map view opens displaying a center pin and a circle with radius `delivery_radius_km`.
  4. Backend `POST /api/vendors/check-coverage` calculates Haversine spatial distances, auto-selecting societies/sectors inside the circle (`is_inside_circle: true`, `is_auto_selected: true`).
  5. Vendor can manually toggle (select/unselect) specific areas inside or nearby the circle.
  6. Settings are saved via `PUT /api/vendors/:vendorId/coverage`.

### 2.3 Hyper-Local Trust Badges & User Location Access Control
When residents search or browse vendors via `GET /api/vendors/search` or access direct store links `GET /api/vendors/:vendorId`:
- Resident's location (`user_lat`, `user_lng`, `society_id`, `sector`) is captured upon entering the website.
- **Servicable Area Guard**: The backend filters stores so residents ONLY see and access vendors whose allowed serviceable area covers their location.
- **Trust Badges**:
  1. **`In Your Society`**: Society-anchored vendor matching resident's society ID (Highest trust signal).
  2. **`Local Sector`**: Sector-based vendor serving resident's sector.
  3. **`Extended Service (Within X km)`**: Go-Global vendor serving resident's location within active radius or selected zones.
- **Access Denial (HTTP 403)**: If a resident outside the vendor's serviceable area tries to access `GET /api/vendors/:vendorId`, the backend rejects access with `HTTP 403 Forbidden` (`Store not available in your location area`).

---

## 3. Data Models & Database Schema

### Vendor User Table (`vendors`)
```sql
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id SERIAL PRIMARY KEY,
    society_id INT REFERENCES societies(society_id),
    vendor_name VARCHAR(150) NOT NULL,
    store_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    whatsapp_number VARCHAR(20),
    vendor_type VARCHAR(20) DEFAULT 'product', -- 'product' | 'service'
    can_add_items BOOLEAN DEFAULT TRUE,
    location_type VARCHAR(30) DEFAULT 'society', -- 'society' | 'area_sector'
    latitude DECIMAL(10,7) DEFAULT 28.6270,
    longitude DECIMAL(10,7) DEFAULT 77.3720,
    location_address TEXT,
    is_global_coverage BOOLEAN DEFAULT FALSE,
    delivery_radius_km NUMERIC(5,2) DEFAULT 0.00,
    selected_zones JSONB DEFAULT '[]'::jsonb,
    account_number VARCHAR(50),
    ifsc_code VARCHAR(20),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(150),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Service Enquiry Lead Table (`enquiries`)
```sql
CREATE TABLE IF NOT EXISTS enquiries (
    enquiry_id SERIAL PRIMARY KEY,
    vendor_id INT NOT NULL REFERENCES vendors(vendor_id),
    user_id VARCHAR(100),
    user_name VARCHAR(150) NOT NULL,
    user_phone VARCHAR(20) NOT NULL,
    society_id INT,
    society_name VARCHAR(150),
    sector VARCHAR(100),
    service_type VARCHAR(150) NOT NULL,
    preferred_time VARCHAR(100),
    description TEXT,
    issue_photos JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(30) DEFAULT 'NEW', -- 'NEW' | 'CONTACTED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Backend API Reference

### 4.1 Check Coverage Zones (`POST /api/vendors/check-coverage`)
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
    },
    {
      "zone_id": 5,
      "name": "Gaur City 1",
      "type": "society",
      "latitude": 28.6050,
      "longitude": 77.4250,
      "distance_km": 5.72,
      "is_inside_circle": false,
      "is_auto_selected": false,
      "is_active": false
    }
  ]
}
```

---

### 4.2 Vendor Registration with Classification (`POST /api/vendors/register`)
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
  "vendor_id": 12,
  "vendor": {
    "vendor_id": 12,
    "store_name": "Ramesh Electrical Services",
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

### 4.3 Location-Aware Storefront Vendor Search (`GET /api/vendors/search`)
```bash
curl -X GET "http://localhost:5000/api/vendors/search?societyId=1&type=service"
```
**Response (200 OK):**
```json
[
  {
    "vendor_id": 12,
    "store_name": "Ramesh Electrical Services",
    "vendor_name": "Ramesh Kumar",
    "phone_number": "9876500001",
    "vendor_type": "service",
    "can_add_items": false,
    "coverage_badge": "In Your Society"
  }
]
```

---

### 4.4 Service Enquiry Submission & WhatsApp Action (`POST /api/enquiries`)

Saves service request record into `enquiries` table and returns pre-formatted WhatsApp chat link to vendor's number.

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
    "store_name": "Ramesh Electrical Services",
    "user_name": "Ananya Sharma",
    "user_phone": "9811223344",
    "service_type": "AC Servicing & Gas Top-up",
    "status": "NEW",
    "created_at": "2026-08-26T11:45:00.000Z",
    "direct_actions": {
      "whatsapp_link": "https://wa.me/919876500001?text=Hi%20Ramesh%20Electrical%20Services%2C%20I%20have%20submitted%20a%20service%20request%20%23104%20for%20AC%20Servicing%20%26%20Gas%20Top-up.",
      "call_link": "tel:9876500001"
    }
  }
}
```

---

### 4.5 Resident Service Enquiry History (`GET /api/user/:userId/enquiries`)
```bash
curl -X GET http://localhost:5000/api/user/usr_9811223344/enquiries
```
**Response (200 OK):**
```json
{
  "success": true,
  "user_id": "usr_9811223344",
  "total_enquiries": 1,
  "enquiries": [
    {
      "enquiry_id": 104,
      "store_name": "Ramesh Electrical Services",
      "service_type": "AC Servicing & Gas Top-up",
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

### 4.6 Item Catalog Creation Guard (`POST /api/vendorPanel/:vendorId/items`)

Service Providers (`vendor_type: "service"`) attempting item creation receive HTTP 403 Forbidden.

**Error Response (403 Forbidden):**
```json
{
  "error": "Item catalog is disabled for Service Providers. Service requests are managed via the Service Enquiries panel.",
  "can_add_items": false,
  "vendor_type": "service"
}
```

---

## 5. Frontend App Integration Manuals

Developers should refer to the dedicated, standalone handbooks for their respective platform:
- 📱 **Vendor App Frontend (Mobile & Web)**: [VENDOR_APP_API_DOCUMENTATION.md](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/VENDOR_APP_API_DOCUMENTATION.md)
- 🛒 **Resident Website Frontend (Web Storefront)**: [USER_API_DOCUMENTATION.md](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/USER_API_DOCUMENTATION.md)
- 🛡️ **Super Admin Portal Frontend**: [ADMIN_PANEL_BACKEND_API_DOCS.md](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/ADMIN_PANEL_BACKEND_API_DOCS.md)

---

## 6. Verification & Automated Test Results

Automated test execution (`node tests/testRunner.js`) validates all features:
- ✅ `POST /api/vendors/check-coverage`: Passed.
- ✅ `Vendor Classification & Catalog Restriction (403 Forbidden)`: Passed.
- ✅ `Resident Service Enquiry & WhatsApp CTA Generation`: Passed.
- ✅ `GET /api/vendors/search` Location Matching & Hyper-Local Badges: Passed.

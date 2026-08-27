# DigiLocal Super Admin Panel — Master REST API & CRUD Operations Specification

**Document Version**: 4.1.0-PRODUCTION  
**Author**: DigiLocal Platform Engineering Team  
**Target Release**: v1.0.0  
**Target Audience**: Admin Portal Frontend Developers (React, Vue, Angular, Next.js)  
**Base URL**: `http://localhost:5000/api` (Production: `https://api.digilocal.in/api`)  
**Authentication Header**: `Authorization: Bearer <ADMIN_JWT_TOKEN>`

---

## 📋 Table of Contents
1. [Global Request Headers & Envelopes](#1-global-request-headers--envelopes)
2. [Module 1: Authentication & Identity Management](#module-1-authentication--identity-management)
3. [Module 2: Residential Societies Management](#module-2-residential-societies-management)
4. [Module 3: Merchant & Vendor Classification Management](#module-3-merchant--vendor-classification-management)
5. [Module 4: User Directory & 3-Strike Warning Engine](#module-4-user-directory--3-strike-warning-engine)
6. [Module 5: Subscriptions & Billing Engine](#module-5-subscriptions--billing-engine)
7. [Module 6: Order Ledger & Financial Refunds](#module-6-order-ledger--financial-refunds)
8. [Module 7: Hero Banners & Promotional Carousels](#module-7-hero-banners--promotional-carousels)
9. [Module 8: Sub-Admin Delegation & RBAC Permissions](#module-8-sub-admin-delegation--rbac-permissions)
10. [Module 9: Helpdesk & Support Desk System](#module-9-helpdesk--support-desk-system)
11. [Module 10: Executive Analytics & Telemetry Exports](#module-10-executive-analytics--telemetry-exports)
12. [Module 11: Real-Time Notification Center & Broadcasts](#module-11-real-time-notification-center--broadcasts)
13. [Module 12: Compliance Audit Logs](#module-12-compliance-audit-logs)
14. [Module 13: System Settings & Platform Config](#module-13-system-settings--platform-config)

---

## 1. Global Request Headers & Envelopes

### 1.1 Request Headers
```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
Content-Type: application/json
Accept: application/json
```

> [!IMPORTANT]
> **Universal Master OTP for Staging & Testing (`999999`)**:
> The backend explicitly allows **`999999`** (or `123456`) as a **Universal Master OTP** bypass across all **User (Resident)** and **Vendor (Mobile & Web)** panels. Frontend developers can enter **`999999`** during OTP verification for instant access.

### 1.2 Success Envelope
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "meta": {
    "total_records": 120,
    "total_pages": 6,
    "current_page": 1,
    "page_size": 20
  }
}
```

---

## Module 1: Authentication & Identity Management

| Method & Endpoint | Auth Required | Request Payload | Response Data |
| :--- | :---: | :--- | :--- |
| `POST /admin/auth/login` | No | `{ email, password }` | `{ token, accessToken, refreshToken, admin }` |
| `POST /admin/auth/refresh` | No | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| `GET /admin/auth/me` | Yes | None | `{ id, name, email, role, powers }` |

---

## Module 2: Residential Societies Management

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/societies` | Yes | List onboarded housing societies with search & status filters |
| `POST /admin/societies` | Yes | Onboard new society `{ society_name, location, secretary_name, secretary_mobile, pincode }` |
| `PUT /admin/societies/:id` | Yes | Update society details |
| `DELETE /admin/societies/:id` | Yes | Soft-delete society enclave |

---

## Module 3: Merchant & Vendor Classification Management

Manages both **Product Merchants** and **Service Providers** with location-aware coverage settings.

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/vendors` | Yes | List vendors filtered by `society_id`, `vendor_type` (`product`/`service`), `status` |
| `GET /admin/vendors/pending` | Yes | List pending vendor onboarding applications requiring approval |
| `POST /admin/vendors/:vendorId/approve` | Yes | Approve merchant application & set status to `ACTIVE` |
| `POST /admin/vendors/:vendorId/reject` | Yes | Reject merchant application with custom rejection reason |
| `POST /admin/vendors/:vendorId/status` | Yes | Block/Unblock vendor account (`ACTIVE` / `BLOCKED`) |
| `GET /admin/vendors/:id` | Yes | Fetch complete vendor store profile, coverage zones, and catalog items |
| `PUT /admin/vendors/:id/coverage` | Yes | Override vendor coverage radius (`delivery_radius_km`) and `selected_zones` |

#### Admin Vendor Overview Schema:
```json
{
  "vendor_id": 12,
  "store_name": "Ramesh Electrical & AC Repair",
  "vendor_name": "Ramesh Kumar",
  "email": "ramesh.services@gmail.com",
  "phone_number": "9876500001",
  "vendor_type": "service",
  "can_add_items": false,
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 5,
  "selected_zones": [
    { "zone_id": 1, "name": "Greenwood Residency", "type": "society", "is_active": true }
  ],
  "status": "ACTIVE"
}
```

---

## Module 4: User Directory & 3-Strike Warning Engine

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/users` | Yes | List resident users with strike warnings count |
| `POST /admin/users/:id/flag` | Yes | Issue warning flag to user (3 strikes triggers auto-suspension) |
| `POST /admin/users/:id/block` | Yes | Ban/Suspend user account |
| `POST /admin/users/:id/unblock` | Yes | Lift suspension on user account |

---

## Module 5: Subscriptions & Billing Engine

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/subscriptions` | Yes | List merchant plan subscriptions, expiry dates, and renewals |
| `POST /admin/subscriptions/:id/renew` | Yes | Extend vendor annual subscription validity |

---

## Module 6: Order Ledger & Financial Refunds

Tracks product orders (`Placed` → `Accepted` → `Delivered`) and processes payment refunds.

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/orders` | Yes | List all customer product orders with status filter |
| `GET /admin/enquiries` | Yes | List platform-wide service enquiries (`NEW`, `CONTACTED`, `SCHEDULED`, `COMPLETED`) |
| `POST /admin/payments/refund` | Yes | Process transaction refund `{ payment_id, amount, reason }` |

---

## Module 7: Hero Banners & Promotional Carousels

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/promotions` | Yes | List homepage hero banners and promo tiles |
| `POST /admin/promotions` | Yes | Create promotional banner `{ title, image_url, target_url, active }` |
| `DELETE /admin/promotions/:id` | Yes | Delete promotional banner |

---

## Module 8: Sub-Admin Delegation & RBAC Permissions

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/subadmins` | Yes | List delegated sub-admin accounts |
| `POST /admin/subadmins` | Yes | Create sub-admin with RBAC powers (`SOCIETIES`, `VENDORS`, `USERS`, `PAYMENTS`) |
| `PUT /admin/subadmins/:id` | Yes | Update sub-admin RBAC permissions |

---

## Module 9: Helpdesk & Support Desk System

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/support/tickets` | Yes | List resident/vendor support tickets |
| `POST /admin/support/tickets/:id/reply` | Yes | Post staff response to support ticket |
| `PUT /admin/support/tickets/:id/status` | Yes | Update ticket status (`OPEN`, `RESOLVED`, `CLOSED`) |

---

## Module 10: Executive Analytics & Telemetry Exports

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/reports/executive` | Yes | Telemetry report: Total revenue, active vendors, order volume, enquiry stats |
| `GET /admin/reports/export` | Yes | Download CSV export of transaction ledger or user directory |

---

## Module 11: Real-Time Notification Center & Broadcasts

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/notifications` | Yes | List platform system notifications |
| `POST /admin/notifications/broadcast` | Yes | Send push notification broadcast to all vendors or residents |

---

## Module 12: Compliance Audit Logs

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/audit-logs` | Yes | Security trail: Login events, status changes, refund approvals |

---

## Module 13: System Settings & Platform Config

| Method & Endpoint | Auth Required | Description |
| :--- | :---: | :--- |
| `GET /admin/settings` | Yes | Fetch platform parameters (tax %, delivery rates, MSG91/Cashfree toggles) |
| `PUT /admin/settings` | Yes | Update platform configuration parameters |

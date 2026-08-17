# DigiLocal Super Admin Panel — Master REST API & CRUD Operations Specification
**Document Control & Complete Engineering Specification**  
**Author**: Principal Systems Architect (20+ Years Experience)  
**Version**: 4.0.0-COMPLETE-RELEASE  
**Status**: APPROVED FOR FULL PRODUCTION IMPLEMENTATION  

---

## 🌐 Base URL Infrastructure
- **Local Development Gateway**: `http://172.25.12.195:5001/api` (or `http://localhost:5000/api`)
- **Staging / Production Cloud Gateway**: `https://digi-local-backend.onrender.com/api`
- **Interactive Swagger UI**: `http://localhost:5000/api-docs`
- **OpenAPI 3.1 Spec JSON**: `http://localhost:5000/openapi.json`

---

## 📋 Comprehensive Table of Contents
1. [Global Request Headers & Response Envelopes](#1-global-request-headers--response-envelopes)
2. [Module 1: Authentication & Identity Management](#module-1-authentication--identity-management)
3. [Module 2: Residential Societies & Enclaves Management (Full CRUD)](#module-2-residential-societies--enclaves-management-full-crud)
4. [Module 3: Vendor Store & Merchant Management (Full CRUD)](#module-3-vendor-store--merchant-management-full-crud)
5. [Module 4: User & Resident Directory Management (Full CRUD & Strike Engine)](#module-4-user--resident-directory-management-full-crud--strike-engine)
6. [Module 5: Merchant Subscriptions & Billing Engine](#module-5-merchant-subscriptions--billing-engine)
7. [Module 6: Orders, Payment Ledger & Financial Refunds](#module-6-orders-payment-ledger--financial-refunds)
8. [Module 7: Hero Carousels & Promotional Banners (Full CRUD)](#module-7-hero-carousels--promotional-banners-full-crud)
9. [Module 8: Sub-Admin Delegation & RBAC Permissions (Full CRUD)](#module-8-sub-admin-delegation--rbac-permissions-full-crud)
10. [Module 9: Helpdesk & Support Desk Ticket System (Full Workflow)](#module-9-helpdesk--support-desk-ticket-system-full-workflow)
11. [Module 10: Executive Analytics & Telemetry Exports](#module-10-executive-analytics--telemetry-exports)
12. [Module 11: Real-Time Notification Center & Broadcasts](#module-11-real-time-notification-center--broadcasts)
13. [Module 12: Compliance Audit Logs & Security Trails](#module-12-compliance-audit-logs--security-trails)
14. [Module 13: System Settings & Platform Configuration (Full CRUD)](#module-13-system-settings--platform-configuration-full-crud)
15. [Production SQL Database DDL Schemas](#production-sql-database-ddl-schemas)

---

## 1. Global Request Headers & Response Envelopes

### 1.1 Standard Request Headers
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
X-Platform-Client: admin_dashboard
X-Request-ID: req_99f2b801-4473-4c91-9e20-71a28a3f81e2
```

### 1.2 Success Envelope (200 OK / 201 Created)
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "pagination": {
    "total": 128,
    "page": 1,
    "limit": 20,
    "total_pages": 7,
    "has_next": true,
    "has_prev": false
  },
  "timestamp": "2026-08-14T14:15:00.000Z",
  "request_id": "req_99f2b801"
}
```

### 1.3 Error Envelope (400, 401, 403, 404, 422, 500)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Field validation failed.",
    "details": [{ "field": "phone", "issue": "Invalid phone format." }]
  },
  "timestamp": "2026-08-14T14:15:00.000Z",
  "request_id": "req_99f2b801"
}
```

---

## Module 1: Authentication & Identity Management

| Functionality | Method & Endpoint | Auth Required | Request Payload | Response Data |
| :--- | :--- | :---: | :--- | :--- |
| **Super Admin Login** | `POST /auth/login` (or `/admin/login`) | No | `{ email, password }` | `{ access_token, refresh_token, user }` |
| **JWT Token Refresh** | `POST /auth/refresh` (or `/admin/refresh`) | No | `{ refresh_token }` | `{ access_token, refresh_token }` |
| **Active Admin Profile** | `GET /auth/me` (or `/admin/me`) | Yes | None | `{ id, name, email, role, powers }` |
| **Admin Logout** | `POST /auth/logout` (or `/admin/logout`) | Yes | None | `{ success: true, message }` |

---

## Module 2: Residential Societies & Enclaves Management (Full CRUD)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Societies** | `GET /societies` (or `/admin/societies`) | Yes | Query: `status`, `search`, `limit=1000` | Array of 38 Society records |
| **Create Society** | `POST /societies` (or `/admin/societies`) | Yes | `{ society_name, location, secretary_name, secretary_mobile, pincode }` | Newly created `Society` DTO (201 Created) |
| **Get Society Details** | `GET /societies/:id` (or `/admin/societies/:id`) | Yes | None | Single `Society` DTO with vendor count |
| **Update Society** | `PUT /societies/:id` (or `/admin/societies/:id`) | Yes | `{ society_name, location, secretary_name, secretary_mobile }` | Updated `Society` DTO |
| **Toggle Status (Suspend/Active)** | `PATCH /societies/:id/status` | Yes | `{ status: "suspended", reason }` | `{ success: true, status: "suspended" }` |
| **Delete Society** | `DELETE /societies/:id` (or `/admin/societies/:id`) | Yes | None | `{ success: true, message: "Society deleted" }` |
| **Get Society Vendors** | `GET /societies/:id/vendors` | Yes | None | Array of vendors registered in society |

---

## Module 3: Vendor Store & Merchant Management (Full CRUD)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List All Vendors** | `GET /admin/vendors` (or `/vendors`) | Yes | Query: `status`, `search`, `limit=1000` | Array of 31 Vendor DTO records |
| **List Pending Applications** | `GET /admin/requests` | Yes | Query: `page`, `limit` | Array of 11 Pending Vendor applications |
| **Get Vendor Details** | `GET /admin/vendors/:id` | Yes | None | Complete `Vendor` profile object |
| **Approve Application** | `POST /admin/requests/:id/approve` | Yes | `{}` | `{ success: true, status: "active" }` |
| **Reject Application** | `POST /admin/requests/:id/reject` | Yes | `{ rejection_reason }` | `{ success: true, status: "rejected" }` |
| **Create Vendor** | `POST /admin/vendors` | Yes | `{ store_name, owner_name, email, phone, society_id, gstin }` | Created `Vendor` object |
| **Update Vendor Profile** | `PUT /admin/vendors/:id` | Yes | `{ store_name, owner_name, email, phone, gstin }` | Updated `Vendor` object |
| **Suspend / Reactivate Vendor** | `PATCH /vendors/:id/status` (or `/admin/vendors/:id/status`) | Yes | `{ status: "suspended" }` | `{ success: true, status: "suspended" }` |
| **Delete Vendor Store** | `DELETE /vendors/:id` (or `/admin/vendors/:id`) | Yes | None | `{ success: true, message: "Vendor deleted" }` |
| **Bulk Vendor Action** | `POST /admin/vendors/bulk-action` | Yes | `{ action: "activate" | "delete", ids: [...] }` | `{ success: true, message }` |
| **Get Vendor Payments** | `GET /vendors/:id/payments` | Yes | None | Array of payment records for vendor |

---

## Module 4: User & Resident Directory Management (Full CRUD & Strike Engine)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List All Users / Residents** | `GET /admin/users` (or `/people`) | Yes | Query: `status`, `person_type`, `search` | Array of User profile DTOs |
| **Get User Profile Details** | `GET /admin/users/:id` (or `/people/:id`) | Yes | None | Detailed `User` profile object |
| **Issue Warning Strike (Flag User)** | `POST /admin/users/:id/flag` (or `/people/:id/flag`) | Yes | `{ reason }` | `{ success: true, flags_count: 1, status: "warned" }` |
| **Revoke Warning Strike (Unflag User)**| `DELETE /admin/users/:id/flag` (or `/people/:id/unflag`) | Yes | `{ strike_id, reason }` | `{ success: true, flags_count: 0, status: "active" }` |
| **Suspend / Ban User Account** | `POST /admin/users/:id/block` (or `/admin/users/:id/status`) | Yes | `{ status: "banned", reason }` | `{ success: true, status: "banned" }` |
| **Unblock User Account** | `POST /admin/users/:id/unblock` | Yes | `{}` | `{ success: true, status: "active" }` |
| **Reset User Password** | `POST /admin/users/:id/reset-password` | Yes | `{ new_password }` | `{ success: true, message: "Password reset" }` |
| **Delete User Account** | `DELETE /admin/users/:id` (or `/people/:id`) | Yes | None | `{ success: true, message: "User deleted" }` |
| **User Directory Telemetry** | `GET /admin/users/analytics` | Yes | Query: `timeframe` | User retention & MAU telemetry metrics |

---

## Module 5: Merchant Subscriptions & Billing Engine

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Subscriptions** | `GET /admin/subscriptions` (or `/subscriptions`) | Yes | Query: `tier`, `status`, `search` | Array of Merchant Subscriptions |
| **Get Subscription Analytics** | `GET /admin/subscriptions/stats` | Yes | None | `{ mrr, arr, active_subscriptions, tier_breakdown }` |
| **Renew / Upgrade Subscription**| `POST /admin/subscriptions/renew` | Yes | `{ vendor_id, plan_tier, billing_cycle }` | Updated `Subscription` DTO |
| **Cancel Subscription** | `POST /admin/subscriptions/cancel` | Yes | `{ subscription_id, reason }` | `{ success: true, status: "cancelled" }` |
| **Download Merchant Invoice** | `GET /subscriptions/:id/invoice` | Yes | None | PDF URL download link |

---

## Module 6: Orders, Payment Ledger & Financial Refunds

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Orders** | `GET /orders` (or `/admin/orders`) | Yes | Query: `status`, `vendor_id`, `search` | Array of order records |
| **Get Order Details** | `GET /orders/:id` (or `/admin/orders/:id`) | Yes | None | Complete order object with item list |
| **Flag Order Audit** | `POST /orders/:id/flag-audit` | Yes | `{ audit_notes }` | `{ success: true, is_flagged: true }` |
| **Process Payment Refund** | `POST /admin/payments/refund` (or `/orders/:id/refund`) | Yes | `{ transaction_id, amount, reason }` | `{ refund_id, status: "PROCESSED" }` |
| **Payment Ledger Transactions** | `GET /admin/payments/transactions` | Yes | Query: `start_date`, `end_date` | Financial transactions ledger |

---

## Module 7: Hero Carousels & Promotional Banners (Full CRUD)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Banner Promotions** | `GET /promotions` (or `/admin/promotions`) | Yes | Query: `is_active` | Array of Promotional Banners |
| **Create Banner Promotion** | `POST /admin/promotions` (or `/promotions`) | Yes | `{ title, description, image_url, placement, display_order }` | Created Banner object (201 Created) |
| **Update Banner Promotion** | `PUT /admin/promotions/:id` (or `/promotions/:id`) | Yes | `{ title, image_url, is_active }` | Updated Banner object |
| **Delete Banner Promotion** | `DELETE /admin/promotions/:id` | Yes | None | `{ success: true, message: "Promotion deleted" }` |

---

## Module 8: Sub-Admin Delegation & RBAC Permissions (Full CRUD)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Sub-Admins** | `GET /admin/sub-admins` (or `/sub-admins`) | Yes | None | Array of Sub-Admin Delegate accounts |
| **Create Sub-Admin** | `POST /admin/sub-admins` | Yes | `{ name, email, phone, role, assigned_society_id, powers }` | Created Sub-Admin DTO |
| **Update Sub-Admin Powers** | `PUT /admin/sub-admins/:id/powers` | Yes | `{ powers: ["SOCIETIES", "VENDORS"] }` | Updated Sub-Admin DTO |
| **Toggle Sub-Admin Status** | `POST /admin/subadmins/:id/toggle-status` | Yes | `{ status: "suspended" }` | `{ success: true, status: "suspended" }` |
| **Delete Sub-Admin** | `DELETE /admin/sub-admins/:id` | Yes | None | `{ success: true, message: "Sub-admin deleted" }` |

---

## Module 9: Helpdesk & Support Desk Ticket System (Full Workflow)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Support Tickets** | `GET /support/tickets` (or `/admin/support/tickets`) | Yes | Query: `status`, `category`, `search` | Array of Support Tickets |
| **Get Ticket Details** | `GET /support/tickets/:id` | Yes | None | Single Ticket object with conversation thread |
| **Get Ticket Message Thread** | `GET /support/tickets/:id/messages` | Yes | None | Array of message thread items |
| **Reply to Ticket** | `POST /support/tickets/:id/reply` (or `/messages`) | Yes | `{ message, sender_type: "ADMIN" }` | Created Message object |
| **Escalate Ticket** | `POST /support/tickets/:id/escalate` | Yes | `{ escalation_reason }` | `{ success: true, priority: "HIGH" }` |
| **De-escalate Ticket** | `POST /support/tickets/:id/deescalate` | Yes | `{ reason }` | `{ success: true, priority: "MEDIUM" }` |
| **Add Follower to Ticket** | `POST /support/tickets/:id/followers` | Yes | `{ follower_email }` | `{ success: true, followers: [...] }` |
| **Merge Tickets** | `POST /support/tickets/:id/merge` | Yes | `{ target_ticket_id }` | `{ success: true, merged_into: id }` |
| **Unmerge Tickets** | `POST /support/tickets/:id/unmerge` | Yes | `{}` | `{ success: true, status: "unmerged" }` |
| **Resolve / Close Ticket** | `PATCH /support/tickets/:id/status` | Yes | `{ status: "RESOLVED" }` | `{ success: true, status: "RESOLVED" }` |

---

## Module 10: Executive Analytics & Telemetry Exports

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **Executive Telemetry Metrics** | `GET /reports/telemetry` (or `/admin/reports/telemetry`) | Yes | Query: `timeframe` (`daily`, `monthly`, `yearly`) | Telemetry summary metrics |
| **Export Analytics Report** | `POST /reports/export` (or `GET /reports/export`) | Yes | `{ timeframe, format: "csv" | "excel" | "pdf" }` | `{ downloadUrl, filename }` |

---

## Module 11: Real-Time Notification Center & Broadcasts

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **Broadcast System Announcement** | `POST /notifications/broadcast` | Yes | `{ title, message, target_audience }` | `{ id, title, sent_at }` (201 Created) |
| **List Notification History** | `GET /notifications/history` (or `/admin/notifications`) | Yes | Query: `limit` | Array of sent system notifications |

---

## Module 12: Compliance Audit Logs & Security Trails

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **List Compliance Audit Logs** | `GET /audit-logs` (or `/admin/audit-logs`) | Yes | Query: `actor_id`, `action`, `page`, `limit` | Array of system security audit logs |

---

## Module 13: System Settings & Platform Configuration (Full CRUD)

| Functionality | Method & Endpoint | Auth Required | Request Payload | Expected Response |
| :--- | :--- | :---: | :--- | :--- |
| **Get Platform Settings** | `GET /settings` (or `/admin/settings`) | Yes | None | Live configuration object |
| **Update Platform Config** | `PUT /settings` (or `/admin/settings`) | Yes | `{ gst_percentage, maintenance_mode, currency }` | Updated config object |
| **Update Admin Profile** | `PUT /settings/profile` | Yes | `{ fullName, email, phone, designation }` | Updated Admin Profile DTO |
| **Change Admin Password** | `POST /settings/change-password` | Yes | `{ currentPassword, newPassword }` | `{ success: true, message: "Password updated" }` |

---

## Production SQL Database DDL Schemas

```sql
-- 1. SOCIETIES TABLE
CREATE TABLE IF NOT EXISTS societies (
    society_id BIGSERIAL PRIMARY KEY,
    society_name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(20),
    location VARCHAR(255) DEFAULT '',
    secretary_name VARCHAR(255) DEFAULT 'Society Secretary',
    secretary_mobile VARCHAR(20) DEFAULT '9876543210',
    public_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VENDORS TABLE
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id BIGSERIAL PRIMARY KEY,
    society_id BIGINT REFERENCES societies(society_id) ON DELETE CASCADE,
    society_name VARCHAR(255),
    vendor_name VARCHAR(255) NOT NULL,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    gstin VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    subscription_tier VARCHAR(50) DEFAULT 'pro',
    renewal_date TIMESTAMP DEFAULT '2026-12-31 00:00:00',
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    logo TEXT,
    avatar_url TEXT,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    public_id VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    person_type VARCHAR(50) DEFAULT 'user',
    status VARCHAR(20) DEFAULT 'active',
    society_id BIGINT REFERENCES societies(society_id) ON DELETE SET NULL,
    society_name VARCHAR(255),
    store_name VARCHAR(255),
    flags_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

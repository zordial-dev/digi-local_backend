# DigiLocal Admin Panel — Official Backend REST API Specification & Documentation

## Document Overview
**Document Purpose**: Official Backend REST API Specification required to power the DigiLocal Super Admin Dashboard.  
**Target Audience**: Backend Developers, Frontend Engineers, Mobile Developers & Database Engineers.  
**Base URLs**:
- **Local Server**: `http://172.25.12.195:5001/api` (or `http://localhost:5000/api`)
- **Production Cloud**: `https://digi-local-backend.onrender.com/api`

---

## 📋 Table of Contents
1. [Global API Standards & Headers](#1-global-api-standards--headers)
2. [Module 1: Authentication & Session Management](#module-1-authentication--session-management)
3. [Module 2: Residential Societies Management](#module-2-residential-societies-management)
4. [Module 3: Vendor Store & Merchant Management](#module-3-vendor-store--merchant-management)
5. [Module 4: Users & People Directory Management](#module-4-users--people-directory-management)
6. [Module 5: Merchant Subscriptions & Billing](#module-5-merchant-subscriptions--billing)
7. [Module 6: Payment Ledger, Revenue & Refunds](#module-6-payment-ledger-revenue--refunds)
8. [Module 7: Promotional Banners & Hero Carousel](#module-7-promotional-banners--hero-carousel)
9. [Module 8: Sub-Admin Delegation & RBAC Permissions](#module-8-sub-admin-delegation--rbac-permissions)
10. [Module 9: Support Desk Tickets & Helpdesk Messaging](#module-9-support-desk-tickets--helpdesk-messaging)
11. [Module 10: Executive Analytics & Data Exports](#module-10-executive-analytics--data-exports)
12. [Module 11: Real-Time Notification Center](#module-11-real-time-notification-center)
13. [Module 12: Compliance Audit Logs & Security Trail](#module-12-compliance-audit-logs--security-trail)
14. [Module 13: System Settings & Platform Configuration](#module-13-system-settings--platform-configuration)
15. [Database Entity-Relationship SQL DDL Schemas](#database-entity-relationship-sql-ddl-schemas)

---

## 1. Global API Standards & Headers

### Required Request Headers
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
Accept: application/json
X-Platform-Client: admin_dashboard
```

### Standard Response Format (Success 200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### Standard Error Response Format (4xx / 5xx)
```json
{
  "success": false,
  "error_code": "INVALID_CREDENTIALS",
  "message": "Invalid email or password.",
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

---

## Module 1: Authentication & Session Management

### 1.1 Super Admin Login
- **Endpoint**: `POST /auth/login` (or `POST /admin/login`)
- **Headers**: `Content-Type: application/json`, `X-Platform-Client: admin_dashboard`
- **Request Body**:
```json
{
  "email": "admin@digilocal.com",
  "password": "Password123!"
}
```
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": "usr-admin-01",
      "name": "Super Administrator",
      "email": "admin@digilocal.com",
      "role": "SUPER_ADMIN"
    },
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "def456uvw789..."
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### 1.2 JWT Token Refresh
- **Endpoint**: `POST /auth/refresh`
- **Request Body**:
```json
{
  "refresh_token": "def456uvw789..."
}
```
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Token refreshed successfully.",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "ref-1786603939-abc1234"
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

---

## Module 2: Residential Societies Management

### 2.1 List Societies
- **Endpoint**: `GET /societies` (or `GET /admin/societies`)
- **Query Params**: `search` (optional string), `page` (default: 1), `limit` (default: 20)
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Societies list retrieved successfully.",
  "data": [
    {
      "id": 1,
      "name": "Greenwood Residency",
      "code": "SOC-GWH-01",
      "address": "Sector 78, Noida",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301",
      "vendor_count": 8,
      "resident_count": 450,
      "status": "active",
      "created_at": "2026-08-01T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### 2.2 Create New Society
- **Endpoint**: `POST /societies` (or `POST /admin/societies`)
- **Request Body**:
```json
{
  "name": "Anupam Apartment",
  "code": "SOC-ANP-02",
  "address": "Block B, Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201309"
}
```
- **Response 201 Created**:
```json
{
  "success": true,
  "message": "Society created successfully.",
  "data": {
    "id": 2,
    "name": "Anupam Apartment",
    "code": "SOC-ANP-02",
    "address": "Block B, Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201309",
    "vendor_count": 0,
    "resident_count": 0,
    "status": "active",
    "created_at": "2026-08-12T14:45:00.000Z"
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### 2.3 Edit Society Details
- **Endpoint**: `PUT /societies/:id` (or `PUT /admin/societies/:id`)

### 2.4 Delete Society
- **Endpoint**: `DELETE /societies/:id` (or `DELETE /admin/societies/:id`)

---

## Module 3: Vendor Store & Merchant Management

### 3.1 List All Vendors
- **Endpoint**: `GET /vendors` (or `GET /admin/vendors`)
- **Query Params**: `status` (`all`, `active`, `suspended`, `pending`), `search`, `society_id`
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Vendors list retrieved successfully.",
  "data": [
    {
      "vendor_id": 90,
      "store_name": "Apna Store",
      "owner_name": "Apna Store Grocery",
      "email": "apnastore@gmail.com",
      "phone": "8890450564",
      "gstin": "07AAAAA140001Z5",
      "society_id": 18,
      "society_name": "Manglam Aananda",
      "subscription_tier": "pro",
      "renewal_date": "2026-12-31T00:00:00.000Z",
      "status": "active",
      "total_orders": 9525,
      "total_revenue": 4170000,
      "avatar_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400"
    }
  ],
  "pagination": {
    "total": 90,
    "page": 1,
    "limit": 20,
    "total_pages": 5
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### 3.2 List Pending Onboarding Requests
- **Endpoint**: `GET /admin/requests`

### 3.3 Approve Onboarding Application
- **Endpoint**: `POST /admin/requests/:id/approve`

### 3.4 Reject Onboarding Application
- **Endpoint**: `POST /admin/requests/:id/reject`
- **Request Body**: `{ "reason": "Incomplete GST verification document." }`

### 3.5 Suspend or Activate Vendor Account
- **Endpoint**: `PATCH /vendors/:id/status` (or `POST /admin/vendors/:id/status`)
- **Request Body**: `{ "status": "suspended" }` or `{ "status": "active" }`

---

## Module 4: Users & People Directory Management

### 4.1 List All Users
- **Endpoint**: `GET /admin/users` (or `GET /people`)
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Users directory retrieved successfully.",
  "data": [
    {
      "id": "usr_101",
      "name": "Shivin",
      "email": "lovelysethia53@gmail.com",
      "phone": "9764694949",
      "person_type": "user_vendor",
      "status": "active",
      "society_name": "Udb",
      "store_name": "Shop",
      "flags_count": 0,
      "registered_at": "2026-08-06T08:27:22.660Z"
    }
  ],
  "pagination": {
    "total": 1450,
    "page": 1,
    "limit": 20,
    "total_pages": 73
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### 4.2 Issue Warning Strike (Flag Account)
- **Endpoint**: `POST /admin/users/:id/flag` (or `POST /people/:id/flag`)
- **Rule**: Increments strike count `flags_count` by 1. Reaching 3/3 strikes automatically sets user status to `banned`.

### 4.3 Ban or Unban User Account
- **Endpoint**: `PUT /admin/users/:id/status` (or `PUT /people/:id/status`)
- **Request Body**: `{ "status": "banned" }` or `{ "status": "active" }`

---

## Module 5: Merchant Subscriptions & Billing

### 5.1 List Subscriptions
- **Endpoint**: `GET /subscriptions`

### 5.2 Subscription Telemetry
- **Endpoint**: `GET /subscriptions/stats`
- **Response 200 OK**:
```json
{
  "success": true,
  "message": "Subscription telemetry stats retrieved.",
  "data": {
    "mrr": 58450,
    "active_subscriptions": 980,
    "expiring_soon": 14
  },
  "timestamp": "2026-08-12T14:45:00.000Z"
}
```

### 5.3 Renew / Change Subscription Plan
- **Endpoint**: `POST /subscriptions/renew`
- **Request Body**:
```json
{
  "vendor_id": 90,
  "plan_tier": "pro",
  "billing_cycle": "annual"
}
```

---

## Module 6: Payment Ledger, Revenue & Refunds

### 6.1 Payment Transactions Ledger
- **Endpoint**: `GET /payments/transactions`

### 6.2 Process Refund
- **Endpoint**: `POST /payments/refund`
- **Request Body**:
```json
{
  "transaction_id": "TXN-9001",
  "amount": 450.00,
  "reason": "Damaged items"
}
```

---

## Module 7: Promotional Banners & Hero Carousel

### 7.1 List Promotional Banners
- **Endpoint**: `GET /promotions` (Public) & `GET /admin/promotions` (Admin)

### 7.2 Create Banner Promotion
- **Endpoint**: `POST /admin/promotions`
- **Request Body**:
```json
{
  "title": "Independence Day Sale",
  "description": "Flat 30% OFF on all organic grocery stores!",
  "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200",
  "target_type": "CATEGORY",
  "target_value": "Grocery & Organic Fresh",
  "placement": "HERO_SLIDER",
  "display_order": 1,
  "is_active": true
}
```

---

## Module 8: Sub-Admin Delegation & RBAC Permissions

### 8.1 List Sub-Admins
- **Endpoint**: `GET /admin/sub-admins` (or `GET /sub-admins`)

### 8.2 Create Sub-Admin User
- **Endpoint**: `POST /admin/sub-admins` (or `POST /sub-admins`)
- **Request Body**:
```json
{
  "name": "Priya Sharma",
  "email": "priya.admin@digilocal.com",
  "phone": "+91 98123 45678",
  "role": "SOCIETY_ADMIN",
  "assigned_society_id": 1,
  "permissions": ["SOCIETIES_READ", "VENDORS_READ", "VENDORS_APPROVE"]
}
```

---

## Module 9: Support Desk Tickets & Helpdesk Messaging

### 9.1 List Support Tickets
- **Endpoint**: `GET /support/tickets`

### 9.2 Get Conversation Messages
- **Endpoint**: `GET /support/tickets/:id/messages`

### 9.3 Reply to Ticket
- **Endpoint**: `POST /support/tickets/:id/messages`
- **Request Body**:
```json
{
  "message": "Your issue has been resolved.",
  "sender_type": "ADMIN"
}
```

---

## Module 10: Executive Analytics & Data Exports

### 10.1 Executive Telemetry Metrics
- **Endpoint**: `GET /reports/executive`

### 10.2 Data File Export
- **Endpoint**: `GET /reports/export?format=csv&module=revenue`

---

## Module 11: Real-Time Notification Center

### 11.1 List System Notifications
- **Endpoint**: `GET /notifications`

### 11.2 Mark All Notifications Read
- **Endpoint**: `PATCH /notifications/read-all`

---

## Module 12: Compliance Audit Logs & Security Trail

### 12.1 List Audit Log Entries
- **Endpoint**: `GET /audit-logs`

---

## Module 13: System Settings & Platform Configuration

### 13.1 Get Settings Configuration
- **Endpoint**: `GET /settings` (or `GET /config`)

### 13.2 Update Settings Configuration
- **Endpoint**: `PUT /settings`
- **Request Body**:
```json
{
  "gst_percentage": 18,
  "maintenance_mode": false,
  "currency": "INR"
}
```

---

## Database Entity-Relationship SQL DDL Schemas

```sql
-- 1. SOCIETIES TABLE
CREATE TABLE societies (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. VENDORS TABLE
CREATE TABLE vendors (
    vendor_id BIGINT AUTO_INCREMENT PRIMARY KEY,
    store_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50) NOT NULL,
    gstin VARCHAR(20),
    society_id BIGINT,
    society_name VARCHAR(255),
    subscription_tier ENUM('free', 'pro', 'enterprise') DEFAULT 'pro',
    renewal_date TIMESTAMP,
    status ENUM('active', 'pending', 'suspended', 'expired') DEFAULT 'active',
    total_orders INT DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    avatar_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE SET NULL
);

-- 3. USERS TABLE
CREATE TABLE users (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    person_type ENUM('user', 'vendor', 'user_vendor', 'sub_admin') DEFAULT 'user',
    status ENUM('active', 'warned', 'banned', 'suspended') DEFAULT 'active',
    society_id BIGINT,
    society_name VARCHAR(255),
    flags_count INT DEFAULT 0,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE SET NULL
);

-- 4. PROMOTIONS TABLE
CREATE TABLE promotions (
    id VARCHAR(100) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    target_type ENUM('STORE', 'CATEGORY', 'SOCIETY', 'URL', 'EXTERNAL') DEFAULT 'CATEGORY',
    target_value VARCHAR(255),
    placement ENUM('HERO_SLIDER', 'BANNER_STRIP', 'POPUP', 'SIDEBAR') DEFAULT 'HERO_SLIDER',
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

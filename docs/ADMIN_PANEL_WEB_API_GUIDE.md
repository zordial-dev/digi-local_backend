# DigiLocal - Admin Panel Web Developer API Guide

> **Document Version:** 2.0.0 (Strict RBAC & Granular Power Delegation)  
> **Target Audience:** Admin Web Dashboard Developers (React / Next.js / Vue / Vite Admin Portal)  
> **Base URL:** `http://localhost:5000` (or production API host)  
> **Security Policy:** All requests require an Admin Bearer Token (`isAdmin: true`, `roles: ['admin', ...powers]`). Customer and Vendor tokens are strictly rejected with `403 Forbidden`.

---

## 1. Web Architecture, Session & Dynamic Navigation

### 1.1 Authorization Header
```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

### 1.2 Granular RBAC Power Matrix
When an admin logs in, their profile returns a list of assigned `powers`. The Web Dashboard must use this array to dynamically show/hide sidebar navigation items and route guards:

| Power Code | Web Dashboard Module / Page | Accessible Endpoints |
| :--- | :--- | :--- |
| `ALL` | **Full Platform Access** | All `/api/admin/*` and platform routes (Super Admin). |
| `SUB_ADMINS` | **Sub-Admins Directory & Roles** | `/api/admin/sub-admins/*` |
| `SOCIETIES` | **Societies & Apartments Directory** | `/api/admin/societies/*`, `/api/societies/:id/approve` |
| `VENDORS` | **Vendor KYC & Compliance** | `/api/admin/vendors/*`, `/api/vendors/:id/unblock` |
| `SUBSCRIPTIONS`| **Financial Ledger & Coupons** | `/api/admin/payments/*`, `/api/admin/subscriptions/*` |
| `SUPPORT` | **Dispute Desk & Escalations** | `/api/admin/support/tickets/*` |
| `SETTINGS` | **Platform Branding & CMS Policy** | `/api/admin/settings`, `/api/cms/*` |

### 1.3 Handling 403 Forbidden in Web UI
If a sub-admin attempts an action without the required power, the backend returns:
```json
{
  "success": false,
  "error": "Forbidden: Missing required permission power 'VENDORS'",
  "code": "INSUFFICIENT_PERMISSIONS"
}
```
**Frontend Best Practice:** Intercept this code globally and trigger a toast notification (e.g. `toast.error("You lack permission for this action.")`).

---

## 2. Admin Authentication & Session Management

### 2.1 Admin Password Login
- **Endpoint:** `POST /api/admin/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "superadmin@digilocal.com",
    "password": "SuperAdminSecurePassword#123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": 1,
      "name": "Platform Super Admin",
      "email": "superadmin@digilocal.com",
      "role": "super_admin",
      "powers": ["ALL"],
      "isAdmin": true
    }
  }
  ```

### 2.2 Refresh Admin Token
- **Endpoint:** `POST /api/admin/refresh-token`
- **Request Body:** `{ "refreshToken": "<REFRESH_TOKEN>" }`

### 2.3 Verify Current Admin Profile
- **Endpoint:** `GET /api/admin/me`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Use Case:** Initial layout hydration on page reload.

---

## 3. Sub-Admin Delegation (Super Admin Only)

### 3.1 List Sub-Admins
- **Endpoint:** `GET /api/admin/sub-admins`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)

### 3.2 Create Sub-Admin
- **Endpoint:** `POST /api/admin/sub-admins`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)
- **Request Body:**
  ```json
  {
    "name": "Pooja Hegde",
    "email": "pooja.support@digilocal.com",
    "password": "InitialPassword#123",
    "powers": ["SUPPORT", "VENDORS"]
  }
  ```

### 3.3 Update Sub-Admin Powers Checklist
- **Endpoint:** `PUT /api/admin/sub-admins/:id/permissions`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)
- **Request Body:**
  ```json
  {
    "powers": ["SUPPORT", "VENDORS", "SOCIETIES"]
  }
  ```

### 3.4 Revoke Sub-Admin Access
- **Endpoint:** `DELETE /api/admin/sub-admins/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)

---

## 4. Societies & Apartment Clusters

### 4.1 Societies Table (Search & Filter)
- **Endpoint:** `GET /api/admin/societies`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SOCIETIES')`)
- **Query Params:** `?status=PENDING&page=1&limit=25&search=Green`

### 4.2 Create New Society
- **Endpoint:** `POST /api/admin/societies`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SOCIETIES')`)
- **Request Body:**
  ```json
  {
    "name": "Prestige Shantiniketan",
    "address": "Whitefield Main Road",
    "city": "Bengaluru",
    "pincode": "560048",
    "total_flats": 3000
  }
  ```

### 4.3 Approve / Reject Society Application
- **Endpoint:** `POST /api/societies/:societyId/approve`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SOCIETIES')`)
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "admin_notes": "RWA documents verified"
  }
  ```

---

## 5. Vendor Moderation & Compliance Pipeline

### 5.1 Vendor Applications Table
- **Endpoint:** `GET /api/admin/vendors`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)
- **Query Params:** `?status=PENDING&page=1&limit=30` (Values: `PENDING`, `APPROVED`, `REJECTED`, `BLOCKED`)

### 5.2 Approve / Reject Vendor Application
- **Endpoint:** `PATCH /api/admin/vendors/:id/status`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "notes": "GST and FSSAI verified"
  }
  ```

### 5.3 Issue Disciplinary Strike
- **Endpoint:** `POST /api/admin/vendors/:id/strike`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)
- **Request Body:**
  ```json
  {
    "reason": "Repeated order cancellations without notice",
    "strike_increment": 1
  }
  ```

### 5.4 Unblock / Remove Hold
- **Endpoint:** `POST /api/vendors/:id/unblock`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)

---

## 6. Users Directory & Disciplinary Actions

### 6.1 Platform Users Directory
- **Endpoint:** `GET /api/admin/users` (or `GET /api/people`)
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Query Params:** `?page=1&limit=50&search=Rahul`

### 6.2 Flag Disruptive User
- **Endpoint:** `POST /api/people/:id/flag` (or `POST /api/admin/users/:id/strike`)
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Request Body:** `{ "reason": "Repeated fraudulent COD order refusal" }`

---

## 7. Platform Analytics Dashboard & Subscriptions Ledger

### 7.1 Dashboard Metric Cards & GMV Charts
- **Endpoint:** `GET /api/admin/dashboard`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "metrics": {
      "total_orders_today": 342,
      "gmv_today": 84520.00,
      "active_vendors": 128,
      "active_societies": 34,
      "pending_vendor_approvals": 5
    }
  }
  ```

### 7.2 Subscription Transactions History
- **Endpoint:** `GET /api/admin/payments/transactions`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUBSCRIPTIONS')`)

### 7.3 Generate Promotional Coupon
- **Endpoint:** `POST /api/admin/subscriptions/coupons`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUBSCRIPTIONS')`)
- **Request Body:**
  ```json
  {
    "code": "DIWALI50",
    "discount_percentage": 50,
    "max_uses": 200,
    "valid_until": "2026-11-15T23:59:59Z"
  }
  ```

### 7.4 Broadcast Renewal Reminders
- **Endpoint:** `POST /api/admin/subscriptions/reminders`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUBSCRIPTIONS')`)

---

## 8. Support Desk & Dispute Escalations

### 8.1 Support Tickets List
- **Endpoint:** `GET /api/admin/support/tickets`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUPPORT')`)
- **Query Params:** `?status=OPEN&priority=HIGH`

### 8.2 Resolve or Reassign Ticket
- **Endpoint:** `PATCH /api/admin/support/tickets/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUPPORT')`)
- **Request Body:**
  ```json
  {
    "status": "RESOLVED",
    "resolution_note": "Customer refund credited"
  }
  ```

---

## 9. Platform Branding & Content Management (CMS)

### 9.1 Update Policy Pages (Terms, Privacy, Refund Policy)
- **Endpoint:** `PUT /api/cms/pages/:slug`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SETTINGS')`)
- **Request Body:**
  ```json
  {
    "title": "Vendor Terms of Service",
    "content_markdown": "# Updated Terms..."
  }
  ```

### 9.2 Update Platform Support Contacts
- **Endpoint:** `PUT /api/cms/contacts`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SETTINGS')`)
- **Request Body:**
  ```json
  {
    "support_phone": "+91-80-6000-1234",
    "support_email": "care@digilocal.com",
    "business_hours": "07:00 AM - 10:00 PM IST"
  }
  ```

---

## 10. Security Activity & Audit Ledger

### 10.1 Audit Log Table
- **Endpoint:** `GET /api/admin/audit-logs`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Query Params:** `?limit=50&page=1`
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "logs": [
      {
        "id": 409,
        "admin_email": "superadmin@digilocal.com",
        "action": "APPROVE_VENDOR",
        "target_resource": "Vendor #14",
        "ip_address": "49.37.102.14",
        "timestamp": "2026-10-22T08:14:02Z"
      }
    ]
  }
  ```

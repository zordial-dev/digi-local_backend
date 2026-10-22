# DigiLocal - Admin Web Dashboard API Guide

> **Document Version:** 2.0.0 (Strict RBAC & Granular Privilege Delegation)  
> **Audience:** Admin Web Dashboard (React/Next.js/Vue) Frontend Engineers  
> **Base URL:** `http://localhost:5000` (or production API host)  
> **Security Policy:** All admin routes strictly require an Admin Bearer Token (`isAdmin: true`, `roles: ['admin', ...powers]`). Customer and Vendor tokens are strictly rejected with `403 Forbidden`. Granular operations are protected by the Power Permission Matrix.

---

## 1. Authentication & RBAC Architecture

### 1.1 Authorization Header
Include the Admin access token in all API requests:
```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

### 1.2 Admin Roles & Power Matrix
Admin privileges are divided into Super Admin (`role: 'super_admin'`) and Sub-Admin (`role: 'sub_admin'`). Super Admins have the universal `ALL` power. Sub-Admins have specific powers assigned during creation:

| Power Code | Scope & Modules |
| :--- | :--- |
| `ALL` | Full, unrestricted platform privileges (Super Admin only). |
| `SOCIETIES` | Create, approve, update status, and manage apartments/societies. |
| `VENDORS` | Approve/reject vendor onboarding, issue strikes, hold/unblock accounts. |
| `SUBSCRIPTIONS`| Manage subscription tiers, generate promotional coupons, send renewal reminders. |
| `SUPPORT` | Manage and reply to customer & vendor dispute tickets, resolve escalations. |
| `SETTINGS` | Platform configuration, payment gateway keys, CMS pages, branding. |
| `SUB_ADMINS` | Create, edit permissions, and revoke sub-admin credentials (Super Admin only). |

### 1.3 Error Responses
- **401 Unauthorized:** Missing, expired, or invalid token.
- **403 Forbidden (Role Mismatch):** Customer or Vendor token attempting to access Admin endpoints:
  ```json
  {
    "success": false,
    "error": "Forbidden: Requires Admin privileges",
    "code": "ACCESS_DENIED"
  }
  ```
- **403 Forbidden (Insufficient Power):** Sub-Admin lacks the specific power required for an action:
  ```json
  {
    "success": false,
    "error": "Forbidden: Missing required permission power 'VENDORS'",
    "code": "INSUFFICIENT_PERMISSIONS"
  }
  ```

---

## 2. Admin Authentication & Session Management

### 2.1 Admin Password Login
- **Endpoint:** `POST /api/admin/login`
- **Auth:** Public
- **Request Body:**
  ```json
  {
    "email": "superadmin@digilocal.com",
    "password": "SuperAdminStrongPassword#2026"
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
- **Auth:** Public
- **Request Body:** `{ "refreshToken": "<REFRESH_TOKEN>" }`

### 2.3 Get Current Admin Session & Permissions
- **Endpoint:** `GET /api/admin/me`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Response (200 OK):** Returns admin info, role, and array of assigned powers.

---

## 3. Sub-Admin Delegation (Super Admin Only)

### 3.1 List Sub-Admins
- **Endpoint:** `GET /api/admin/sub-admins`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)

### 3.2 Create New Sub-Admin
- **Endpoint:** `POST /api/admin/sub-admins`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)
- **Request Body:**
  ```json
  {
    "name": "Pooja Hegde",
    "email": "pooja.support@digilocal.com",
    "password": "TemporaryPassword#123",
    "powers": ["SUPPORT", "VENDORS"]
  }
  ```

### 3.3 Update Sub-Admin Powers
- **Endpoint:** `PUT /api/admin/sub-admins/:id/permissions`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)
- **Request Body:**
  ```json
  {
    "powers": ["SUPPORT", "VENDORS", "SOCIETIES"]
  }
  ```

### 3.4 Revoke / Delete Sub-Admin
- **Endpoint:** `DELETE /api/admin/sub-admins/:id`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUB_ADMINS')`)

---

## 4. Societies & Apartment Clusters

### 4.1 List Societies
- **Endpoint:** `GET /api/admin/societies`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SOCIETIES')`)
- **Query Params:** `?status=PENDING&page=1&limit=25`

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

### 4.3 Approve / Reject Society
- **Endpoint:** `POST /api/societies/:societyId/approve`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SOCIETIES')`)
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "admin_notes": "Verified with resident welfare association"
  }
  ```

---

## 5. Vendor Moderation & Compliance

### 5.1 List All Vendors (Filter by Status)
- **Endpoint:** `GET /api/admin/vendors`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)
- **Query Params:** `?status=PENDING&search=Dairy&page=1`

### 5.2 Approve / Reject Vendor Application
- **Endpoint:** `PATCH /api/admin/vendors/:id/status`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)
- **Request Body:**
  ```json
  {
    "status": "APPROVED",
    "notes": "KYC and GST documents verified"
  }
  ```

### 5.3 Issue Warning / Strike to Vendor
- **Endpoint:** `POST /api/admin/vendors/:id/strike`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)
- **Request Body:**
  ```json
  {
    "reason": "Repeated unfulfilled confirmed orders without notice",
    "strike_increment": 1
  }
  ```

### 5.4 Unblock / Remove Hold on Vendor
- **Endpoint:** `POST /api/vendors/:id/unblock`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('VENDORS')`)

---

## 6. Users Directory & Disciplinary Actions

### 6.1 List Platform Users
- **Endpoint:** `GET /api/admin/users` (or `GET /api/people`)
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Query Params:** `?page=1&limit=30&flagged=true`

### 6.2 Flag / Strike Disruptive User
- **Endpoint:** `POST /api/people/:id/flag` (or `POST /api/admin/users/:id/strike`)
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Request Body:**
  ```json
  {
    "reason": "Fraudulent COD order rejection pattern"
  }
  ```

---

## 7. Financial Ledger & Subscription Management

### 7.1 Platform Analytics & Revenue Dashboard
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

### 7.2 Subscription Transaction History
- **Endpoint:** `GET /api/admin/payments/transactions`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUBSCRIPTIONS')`)

### 7.3 Create Subscription Coupon Code
- **Endpoint:** `POST /api/admin/subscriptions/coupons`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUBSCRIPTIONS')`)
- **Request Body:**
  ```json
  {
    "code": "FESTIVE50",
    "discount_percentage": 50,
    "max_uses": 100,
    "valid_until": "2026-11-30T23:59:59Z"
  }
  ```

### 7.4 Trigger Renewal Reminder Notifications
- **Endpoint:** `POST /api/admin/subscriptions/reminders`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SUBSCRIPTIONS')`)

---

## 8. Support Desk & Dispute Escalations

### 8.1 List All Support Tickets
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
    "resolution_note": "Refund of Rs. 48 credited to customer wallet."
  }
  ```

---

## 9. Platform Branding & Content Management (CMS)

### 9.1 Update CMS Policy Pages (Terms, Privacy, Refund Policy)
- **Endpoint:** `PUT /api/cms/pages/:slug`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requirePower('SETTINGS')`)
- **Request Body:**
  ```json
  {
    "title": "Vendor Terms of Service",
    "content_markdown": "# Terms of Service\n\n1. Merchant obligations..."
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

## 10. Audit Trails & Security Activity Logs

### 10.1 View Admin Audit Logs
- **Endpoint:** `GET /api/admin/audit-logs`
- **Auth:** `Bearer <ADMIN_TOKEN>` (`requireAdmin`)
- **Query Params:** `?limit=50&admin_id=1`
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

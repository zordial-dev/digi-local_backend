# ⚡ Master Support System Backend API Specification: Multi-App & Support Panel

> **Document Version**: `v5.0.0` (Unified Support Desk, User App, Vendor App & Website Specification)  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Target Audience**: Backend Engineers, Support Desk Frontend Team (`adminMock`), Resident App Developers (`user-app`), Vendor App Developers (`vendor-portal`)

---

## 📋 Executive Overview & Cross-Platform Architecture

The DigiLocal Support System provides unified, end-to-end ticketing across **all 3 platform ecosystems**:

1. **Admin Panel Support Desk (`adminMock`)**:  
   Full administrative control over all tickets, internal staff notes, priority escalations, ticket merging, SLA configuration, analytics KPIs, and follower assignments.
2. **Resident User App & Website (`user-app`)**:  
   Inbound ticket submission, order dispute filing, personal ticket history, and real-time customer reply messaging.
3. **Merchant Vendor App & Portal (`vendor-portal`)**:  
   Store inquiry submission, payout disputes, vendor-vs-user dispute management, and support response tracking.

---

## 📊 Database DDL Schema Specifications (PostgreSQL)

### 1. `support_tickets` Table
```sql
CREATE TABLE support_tickets (
    id VARCHAR(64) PRIMARY KEY,                     -- e.g. 't-1788287963713'
    ticket_number VARCHAR(32) NOT NULL UNIQUE,      -- Reference ID e.g. 'TICK-9082'
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(64) NOT NULL,                  -- 'vendor_vs_user', 'vendor_vs_vendor', 'user_vs_vendor', 'technical', 'billing', 'onboarding', 'general'
    priority VARCHAR(32) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status VARCHAR(32) NOT NULL DEFAULT 'open',     -- 'open', 'in_progress', 'resolved', 'closed'
    user_type VARCHAR(32) NOT NULL DEFAULT 'user',  -- 'user', 'vendor', 'user_vendor'
    source VARCHAR(64) DEFAULT 'landing_website',   -- 'landing_website', 'mobile_app', 'vendor_portal'
    reporter_name VARCHAR(128) NOT NULL,
    reporter_email VARCHAR(128) NOT NULL,
    reporter_user_id VARCHAR(64),                   -- User ID or Vendor ID of creator
    entity_name VARCHAR(128),                       -- Society or Vendor Store name
    target_vendor VARCHAR(128),                     -- Reported vendor store name if dispute
    order_id VARCHAR(64),                           -- Associated Order ID e.g. 'ORD-9842'
    order_amount DECIMAL(10, 2),                    -- Order amount in INR e.g. 707.00
    assigned_to VARCHAR(128) DEFAULT 'Super Admin', -- Assigned Admin staff name
    sla_minutes_remaining INT DEFAULT 120,           -- SLA countdown in minutes
    followers TEXT[] DEFAULT '{}',
    merged_into VARCHAR(64),
    merged_children TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_readable VARCHAR(64),                -- e.g. '02 Sep 2026, 06:32 am IST'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. `ticket_messages` Table
```sql
CREATE TABLE ticket_messages (
    id VARCHAR(64) PRIMARY KEY,                     -- e.g. 'm-1788287963713'
    ticket_id VARCHAR(64) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_name VARCHAR(128) NOT NULL,
    sender_role VARCHAR(32) NOT NULL,               -- 'admin', 'sub_admin', 'vendor', 'user'
    sender_avatar VARCHAR(255),
    message TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,        -- True if internal staff note (hidden from customer & vendor)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at_readable VARCHAR(64)
);
```

### 3. `ticket_attachments` Table
```sql
CREATE TABLE ticket_attachments (
    id VARCHAR(64) PRIMARY KEY,
    ticket_id VARCHAR(64) NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes INT NOT NULL,
    file_url VARCHAR(512) NOT NULL,
    uploaded_by VARCHAR(128) NOT NULL,
    uploaded_at_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 📡 SECTION I: Admin Panel Support Desk API Endpoints (`adminMock`)

### 1. Fetch All Support Tickets (`GET /api/admin/support/tickets`)
- **Query Params**: `status` (`all`, `open`, `in_progress`, `resolved`, `closed`), `category` (`user_vs_vendor`, `billing`, etc.), `search`
- **Response**: `200 OK`

```json
{
  "code": 200,
  "status": "success",
  "message": "Support tickets retrieved successfully.",
  "data": [
    {
      "id": "t-1788287963713",
      "ticket_number": "TICK-9082",
      "subject": "Missing Item & Delayed Delivery Complaint",
      "description": "Customer reported 2 items missing from Order #ORD-9842 fulfilled by Aarushi Sweets.",
      "category": "user_vs_vendor",
      "priority": "high",
      "status": "in_progress",
      "user_type": "user",
      "source": "mobile_app",
      "reporter_name": "Garvit Sharma",
      "reporter_email": "garvit@gmail.com",
      "entity_name": "Greenwood Residency",
      "target_vendor": "Aarushi Sweets",
      "order_id": "ORD-9842",
      "order_amount": 707.00,
      "assigned_to": "Aarushi Admin",
      "sla_minutes_remaining": 45,
      "created_at": "2026-09-02T01:02:11.000Z",
      "created_at_ist": "2026-09-02T06:32:11+05:30",
      "created_at_readable": "02 Sep 2026, 06:32 am IST",
      "updated_at": "2026-09-02T06:45:00+05:30"
    }
  ]
}
```

### 2. Fetch Single Ticket Details (`GET /api/admin/support/tickets/:ticketId`)
- **Response**: `200 OK` or `404 Not Found`

### 3. Fetch Ticket Message History (`GET /api/support/tickets/:ticketId/messages`)
- **Response**: `200 OK`

### 4. Admin Reply or Internal Staff Note (`POST /api/support/tickets/:ticketId/reply`)
- **Body**: `{ "message": "...", "is_internal_note": false, "new_status": "resolved" }`
- **Response**: `200 OK`

### 5. Update Ticket Status / Priority / Assignee (`PATCH /api/admin/support/tickets/:ticketId/status`)
- **Body**: `{ "status": "in_progress", "priority": "urgent", "assigned_to": "Aarushi Admin" }`
- **Response**: `200 OK`

### 6. Escalate Priority Level (`POST /api/support/tickets/:ticketId/escalate`)
- Escalates step: `LOW` -> `MEDIUM` -> `HIGH` -> `URGENT`.
- **Response**: `200 OK` or `422 Business Rule Breach` if already `URGENT`.

### 7. De-escalate Priority Level (`POST /api/support/tickets/:ticketId/deescalate`)
- De-escalates step: `URGENT` -> `HIGH` -> `MEDIUM` -> `LOW`.
- **Response**: `200 OK` or `422 Business Rule Breach` if already `LOW`.

### 8. Merge Duplicate Ticket (`POST /api/support/tickets/:ticketId/merge`)
- **Body**: `{ "target_master_ticket_number": "TICK-9082" }`
- **Response**: `200 OK`

### 9. Unmerge Child Ticket (`POST /api/support/tickets/:ticketId/unmerge`)
- **Body**: `{ "child_ticket_number": "TICK-9083" }`
- **Response**: `200 OK`

### 10. Add / Remove Staff Followers (`POST /api/support/tickets/:ticketId/followers`)
- **Body**: `{ "follower_name": "Garvit SubAdmin", "action": "add" }`
- **Response**: `200 OK`

### 11. Support Desk Analytics & KPIs (`GET /api/admin/support/analytics`)
- **Response**: `200 OK` with counts, response times, SLA compliance rate, and category breakdown.

### 12. SLA Policy Configuration (`GET` & `PUT /api/admin/support/sla`)
- **PUT Body**: `{ "urgent_sla_minutes": 15, "high_sla_minutes": 45, "medium_sla_minutes": 120, "low_sla_minutes": 240, "auto_escalate_on_breach": true, "notify_assigned_staff": true }`

### 13. Ticket Tag Management (`GET`, `POST`, `DELETE /api/admin/support/tags`)
- **POST Body**: `{ "name": "Refund Dispatched", "color": "#10B981" }`

### 14. File Attachments & Photo Upload (`POST /api/support/tickets/:ticketId/attachments`)
- **Content-Type**: `multipart/form-data`
- **Response**: `201 Created`

---

## 📡 SECTION II: Resident User Mobile App & Landing Website Support Endpoints (`user-app`)

### 1. Submit New Customer Complaint / Inquiry (`POST /api/user/tickets`)
- **Body**: `{ "subject": "Damaged Item Delivered", "description": "...", "category": "user_vs_vendor", "order_id": "ORD-9842", "target_vendor": "Aarushi Sweets", "reporter_name": "Garvit Sharma", "reporter_email": "garvit@gmail.com", "source": "mobile_app" }`
- **Response**: `201 Created`

### 2. Fetch User's Submitted Tickets (`GET /api/user/tickets`)
- **Response**: `200 OK`

### 3. User Reply to Ticket (`POST /api/user/tickets/:ticketId/reply`)
- **Body**: `{ "message": "Thank you, I have attached the damaged box photo." }`
- **Response**: `200 OK`

---

## 📡 SECTION III: Merchant Vendor Mobile App & Portal Support Endpoints (`vendor-portal`)

### 1. Submit Vendor Inquiry / Payout Dispute (`POST /api/vendor/tickets`)
- **Body**: `{ "subject": "Store Settlement Discrepancy", "description": "...", "category": "billing", "priority": "high", "store_name": "Flower's Point", "reporter_email": "aarushi20@gmail.com" }`
- **Response**: `201 Created`

### 2. Fetch Merchant's Submitted Tickets (`GET /api/vendor/tickets`)
- **Response**: `200 OK`

---

## ❌ Standard Error Codes & Responses

- **HTTP 401 Unauthorized**: `{ "code": 401, "status": "error", "error": "UNAUTHORIZED", "message": "..." }`
- **HTTP 404 Not Found**: `{ "code": 404, "status": "error", "error": "TICKET_NOT_FOUND", "message": "..." }`
- **HTTP 422 Business Rule Breach**: `{ "code": 422, "status": "error", "error": "BUSINESS_RULE_BREACH", "message": "..." }`

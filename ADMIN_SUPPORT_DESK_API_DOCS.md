# DigiLocal Admin Panel — Support Desk Module API Documentation (v5.0.0)

Complete REST API documentation for **Module 9: Support Desk Tickets, Multi-App Dispute Resolution & Analytics**.

---

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| **Local** | `http://localhost:5001/api` |
| **Network (LAN)** | `http://172.25.12.195:5001/api` |
| **Production** | `https://digi-local-backend.onrender.com/api` |

---

## 🔐 Authentication

All admin support desk endpoints accept standard Bearer tokens from Admin / Sub-Admin login.

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 📋 Support Desk Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/support/tickets` | List all support tickets with status/category/search filters |
| `GET` | `/api/admin/support/tickets/:ticketId` | Fetch single ticket details |
| `GET` | `/api/support/tickets/:ticketId/messages` | Get ticket thread messages |
| `POST` | `/api/support/tickets/:ticketId/reply` | Reply to ticket or add internal staff note |
| `PATCH` | `/api/admin/support/tickets/:ticketId/status` | Update status, priority, and assignee |
| `POST` | `/api/support/tickets/:ticketId/escalate` | Escalate ticket priority step (LOW -> MEDIUM -> HIGH -> URGENT) |
| `POST` | `/api/support/tickets/:ticketId/deescalate` | De-escalate priority step (URGENT -> HIGH -> MEDIUM -> LOW) |
| `POST` | `/api/support/tickets/:ticketId/merge` | Merge duplicate ticket into master ticket |
| `POST` | `/api/support/tickets/:ticketId/unmerge` | Unmerge child ticket from master |
| `POST` | `/api/support/tickets/:ticketId/followers` | Add / Remove staff followers |
| `GET` | `/api/admin/support/analytics` | Support desk KPIs and category breakdown analytics |
| `GET` / `PUT` | `/api/admin/support/sla` | Get & update SLA policy timeouts |
| `GET` / `POST` / `DELETE` | `/api/admin/support/tags` | Manage support tags |
| `POST` | `/api/support/tickets/:ticketId/attachments` | File / photo upload for ticket |

---

## 1. List All Support Tickets

**Method:** `GET`  
**Endpoint:** `/api/admin/support/tickets`  
**Query Parameters:**
- `status`: `all`, `open`, `in_progress`, `resolved`, `closed`
- `category`: `user_vs_vendor`, `billing`, `technical`, etc.
- `search`: search term matching ticket number, name, email, vendor

### Response `200 OK`
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

---

## 2. Priority Escalation & De-escalation Rules

- **Escalation (`POST /api/support/tickets/:ticketId/escalate`)**: Steps priority LOW -> MEDIUM -> HIGH -> URGENT. If ticket is already `URGENT`, returns **HTTP 422 Business Rule Breach**:
```json
{
  "code": 422,
  "status": "error",
  "error": "BUSINESS_RULE_BREACH",
  "message": "Ticket is already at the highest priority level (URGENT). Cannot escalate further."
}
```
- **De-escalation (`POST /api/support/tickets/:ticketId/deescalate`)**: Steps priority URGENT -> HIGH -> MEDIUM -> LOW. If ticket is already `LOW`, returns **HTTP 422 Business Rule Breach**:
```json
{
  "code": 422,
  "status": "error",
  "error": "BUSINESS_RULE_BREACH",
  "message": "Ticket is already at the lowest priority level (LOW). Cannot de-escalate further."
}
```

# DigiLocal Admin Panel — Support Desk Module API Documentation

Complete REST API documentation for **Module 9: Support Desk Tickets & Helpdesk Messaging**.

---

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| **Local** | `http://localhost:5001/api` |
| **Network (LAN)** | `http://172.25.12.195:5001/api` |
| **Production** | `https://digi-local-backend.onrender.com/api` |

---

## 🔐 Authentication

All admin support desk endpoints require a valid JWT token from the admin login.

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 📋 Support Desk Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/support/tickets` | List all support tickets |
| `GET` | `/api/support/tickets/:id/messages` | Get all messages in a ticket thread |
| `POST` | `/api/support/tickets/:id/messages` | Reply to a ticket |
| `PATCH` | `/api/support/tickets/:id/status` | Update ticket status |

---

## 1. List All Support Tickets

**Method:** `GET`
**Endpoint:** `/api/support/tickets`
**Auth:** Bearer Token

### Request
```http
GET /api/support/tickets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "TCK-801",
      "user_id": "usr_101",
      "user_name": "Shivin",
      "subject": "Delivery delay inquiry",
      "category": "Orders",
      "priority": "medium",
      "status": "open",
      "created_at": "2026-08-12T10:30:00.000Z"
    },
    {
      "id": "TCK-802",
      "user_id": "usr_205",
      "user_name": "Priya Mehta",
      "subject": "Payment not reflected",
      "category": "Payments",
      "priority": "high",
      "status": "in_progress",
      "created_at": "2026-08-11T14:22:00.000Z"
    },
    {
      "id": "TCK-803",
      "user_id": "usr_312",
      "user_name": "Rahul Verma",
      "subject": "Wrong item received",
      "category": "Orders",
      "priority": "low",
      "status": "resolved",
      "created_at": "2026-08-10T09:10:00.000Z"
    }
  ]
}
```

### Ticket Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ticket ID |
| `user_id` | `string` | ID of the user who raised the ticket |
| `user_name` | `string` | Display name of the user |
| `subject` | `string` | Short description of the issue |
| `category` | `string` | `General`, `Orders`, `Payments`, `Vendors`, `Account` |
| `priority` | `string` | `low`, `medium`, `high` |
| `status` | `string` | `open`, `in_progress`, `resolved`, `closed` |
| `created_at` | `string` | ISO 8601 timestamp |

---

## 2. Get Ticket Messages (Conversation Thread)

**Method:** `GET`
**Endpoint:** `/api/support/tickets/:id/messages`
**Auth:** Bearer Token

### Request
```http
GET /api/support/tickets/TCK-801/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Path Params

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✅ Yes | The ticket ID |

### Response `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "ticket_id": "TCK-801",
      "sender_type": "USER",
      "message": "My order was supposed to arrive yesterday but I still haven't received it. Please help.",
      "created_at": "2026-08-12T10:30:00.000Z"
    },
    {
      "id": 2,
      "ticket_id": "TCK-801",
      "sender_type": "ADMIN",
      "message": "Hi! We're looking into this. Could you please share your order ID?",
      "created_at": "2026-08-12T11:00:00.000Z"
    },
    {
      "id": 3,
      "ticket_id": "TCK-801",
      "sender_type": "USER",
      "message": "Order ID is ORD-45291.",
      "created_at": "2026-08-12T11:15:00.000Z"
    }
  ]
}
```

### Message Object Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | `number` | Auto-incremented message ID |
| `ticket_id` | `string` | Parent ticket reference |
| `sender_type` | `string` | `USER` or `ADMIN` |
| `message` | `string` | The message text |
| `created_at` | `string` | ISO 8601 timestamp |

---

## 3. Reply to a Ticket

**Method:** `POST`
**Endpoint:** `/api/support/tickets/:id/messages`
**Auth:** Bearer Token

### Request
```http
POST /api/support/tickets/TCK-801/messages
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `message` | `string` | ✅ Yes | The reply text |
| `sender_type` | `string` | ❌ Optional | `ADMIN` (default) or `USER` |

```json
{
  "message": "We have investigated your order. The vendor has confirmed dispatch. You should receive it within 2 hours.",
  "sender_type": "ADMIN"
}
```

### Response `201 Created`
```json
{
  "success": true,
  "message": "Reply sent successfully."
}
```

> **Note:** When a reply is posted, the ticket status is automatically updated to `in_progress`.

### Error Response `400 Bad Request`
```json
{
  "success": false,
  "message": "VALIDATION_ERROR",
  "error": "Message text is required."
}
```

---

## 4. Update Ticket Status

**Method:** `PATCH`
**Endpoint:** `/api/support/tickets/:id/status`
**Auth:** Bearer Token

### Request
```http
PATCH /api/support/tickets/TCK-801/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | ✅ Yes | New status for the ticket |

**Allowed status values:**

| Value | Meaning |
|-------|---------|
| `open` | Ticket is newly raised, not yet acted on |
| `in_progress` | Admin has started working on it |
| `resolved` | Issue has been resolved |
| `closed` | Ticket is permanently closed |

```json
{
  "status": "resolved"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "Ticket status updated to resolved."
}
```

### Error Response `400 Bad Request`
```json
{
  "success": false,
  "error": "Status is required."
}
```

---

## 🗄️ Database Schema

```sql
-- Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    priority VARCHAR(20) DEFAULT 'medium',  -- low | medium | high
    status VARCHAR(20) DEFAULT 'open',      -- open | in_progress | resolved | closed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Messages Table (conversation thread)
CREATE TABLE IF NOT EXISTS ticket_messages (
    id BIGSERIAL PRIMARY KEY,
    ticket_id VARCHAR(100) REFERENCES support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) DEFAULT 'USER',  -- USER | ADMIN
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 💡 Frontend Integration Notes

1. **Listing tickets** — Call `GET /api/support/tickets` on page load to render the ticket list.
2. **Opening a ticket thread** — When user clicks a ticket, call `GET /api/support/tickets/:id/messages` to load the conversation.
3. **Sending a reply** — Post to `POST /api/support/tickets/:id/messages` with `sender_type: "ADMIN"`.
4. **Closing a ticket** — Use `PATCH /api/support/tickets/:id/status` with `{ "status": "resolved" }` or `{ "status": "closed" }`.
5. **Status auto-update** — The backend automatically sets status to `in_progress` when an admin posts a reply.

# 📱 Resident User Mobile App & Website — Support Ticketing API Documentation (v5.0.0)

Dedicated REST API specification for **Resident User App & Landing Website Developers (`user-app`)**.

---

## 🌐 Base URLs

| Environment | URL |
|-------------|-----|
| **Local** | `http://localhost:5001/api` |
| **Network (LAN)** | `http://172.25.12.195:5001/api` |
| **Production** | `https://digi-local-backend.onrender.com/api` |

---

## 🔐 Headers

```http
Authorization: Bearer <USER_JWT_TOKEN>
Content-Type: application/json
```

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/user/tickets` | Submit a new customer complaint or dispute ticket |
| `GET` | `/api/user/tickets` | Fetch history of tickets submitted by the resident user |
| `POST` | `/api/user/tickets/:ticketId/reply` | Post a customer reply to an existing ticket thread |

---

## 1. Submit New Customer Complaint / Inquiry

**Method:** `POST`  
**Endpoint:** `/api/user/tickets` (or `/api/users/tickets`)

### Request Body
```json
{
  "subject": "Damaged Item Delivered",
  "description": "The sweets box in order #ORD-9842 was completely crushed upon arrival.",
  "category": "user_vs_vendor",
  "order_id": "ORD-9842",
  "target_vendor": "Aarushi Sweets",
  "reporter_name": "Garvit Sharma",
  "reporter_email": "garvit@gmail.com",
  "source": "mobile_app"
}
```

### Response `201 Created`
```json
{
  "code": 201,
  "status": "success",
  "message": "Your support ticket TICK-9082 has been submitted. Our team will respond within 45 minutes.",
  "data": {
    "ticket_id": "t-1788287963713",
    "ticket_number": "TICK-9082",
    "status": "open",
    "sla_minutes_remaining": 45,
    "created_at_readable": "02 Sep 2026, 06:32 am IST"
  }
}
```

---

## 2. Fetch User's Ticket History

**Method:** `GET`  
**Endpoint:** `/api/user/tickets` (or `/api/users/tickets`)

### Response `200 OK`
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "ticket_id": "t-1788287963713",
      "ticket_number": "TICK-9082",
      "subject": "Damaged Item Delivered",
      "category": "user_vs_vendor",
      "status": "in_progress",
      "order_id": "ORD-9842",
      "unread_messages_count": 1,
      "created_at_readable": "02 Sep 2026, 06:32 am IST",
      "updated_at_readable": "02 Sep 2026, 06:45 am IST"
    }
  ]
}
```

---

## 3. Customer Reply to Ticket

**Method:** `POST`  
**Endpoint:** `/api/user/tickets/:ticketId/reply`

### Request Body
```json
{
  "message": "Thank you, I have attached the damaged box photo."
}
```

### Response `200 OK`
```json
{
  "code": 200,
  "status": "success",
  "message": "Reply added to ticket.",
  "data": {
    "id": "m-108",
    "ticket_id": "t-1788287963713",
    "sender_name": "Garvit Sharma",
    "sender_role": "user",
    "message": "Thank you, I have attached the damaged box photo.",
    "created_at_readable": "02 Sep 2026, 07:00 am IST"
  }
}
```

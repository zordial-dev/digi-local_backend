# 📢 Official Release Notice & Integration Guide for User Website & App Frontend Developers

> **Document Version**: v5.0.0 (Master Support System Specification)  
> **Target Audience**: Resident User Website & Mobile App Developers (`user-app`)  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  

---

## 📋 Overview

The DigiLocal backend now provides **Resident Customer Support & Order Dispute Filing**. Customers can submit complaints regarding damaged goods, missing items, or order delays (`ORD-xxxx`), view personal ticket histories, send replies in real-time, and attach photo evidence.

---

## 🔐 Authentication Header

All endpoints accept standard logged-in Resident User JWT tokens:

```http
Authorization: Bearer <USER_JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 📡 API Endpoints Specification

### 1. Submit New Customer Complaint / Order Dispute
- **Method**: `POST`
- **Endpoint**: `/api/user/tickets` (or `/api/users/tickets`)
- **Content-Type**: `application/json`

#### Request Payload:
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

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | `string` | ✅ Yes | Short summary of issue |
| `description` | `string` | ✅ Yes | Detailed complaint text |
| `category` | `string` | ❌ Optional | `user_vs_vendor`, `billing`, `technical`, `general` (default: `user_vs_vendor`) |
| `order_id` | `string` | ❌ Optional | Associated order ID e.g. `ORD-9842` |
| `target_vendor` | `string` | ❌ Optional | Reported merchant store name |
| `reporter_name` | `string` | ❌ Optional | Customer display name |
| `reporter_email` | `string` | ❌ Optional | Customer email |
| `source` | `string` | ❌ Optional | `mobile_app` or `landing_website` |

#### Response (`201 Created`):
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

### 2. Fetch User's Submitted Ticket History
- **Method**: `GET`
- **Endpoint**: `/api/user/tickets` (or `/api/users/tickets`)

#### Response (`200 OK`):
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

### 3. Send Customer Reply to Ticket Thread
- **Method**: `POST`
- **Endpoint**: `/api/user/tickets/:ticketId/reply`
- **Content-Type**: `application/json`

> **Note**: Internal staff notes (`is_internal_note: true`) are automatically excluded and hidden from customer view to protect admin privacy.

#### Request Payload:
```json
{
  "message": "Thank you, I have attached the damaged box photo."
}
```

#### Response (`200 OK`):
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

---

### 4. Upload Photo Evidence Attachment
- **Method**: `POST`
- **Endpoint**: `/api/support/tickets/:ticketId/attachments`
- **Header**: `Content-Type: multipart/form-data`
- **FormData**: `file` (binary image or PDF, max 10MB)

#### Response (`201 Created`):
```json
{
  "code": 201,
  "status": "success",
  "message": "Attachment uploaded successfully.",
  "data": {
    "attachment_id": "att_98421",
    "ticket_id": "t-1788287963713",
    "file_name": "damaged_delivery_photo.jpg",
    "file_size_bytes": 1420500,
    "file_url": "https://storage.digilocal.in/support/att_98421.jpg",
    "uploaded_at_ist": "2026-09-02T06:35:00+05:30"
  }
}
```

---

## ❌ Standard Error Status Codes

| Status Code | Error Key | Description |
|-------------|-----------|-------------|
| `401 Unauthorized` | `UNAUTHORIZED` | Invalid or expired Resident User JWT Token |
| `404 Not Found` | `TICKET_NOT_FOUND` | Specified `ticketId` does not exist |
| `400 Bad Request` | `VALIDATION_ERROR` | Missing mandatory fields (`subject`, `description`) |

# 📢 Official Release Notice & Integration Guide for Vendor App Frontend Developers

> **Document Version**: v5.0.0 (Master Support System Specification)  
> **Target Audience**: Merchant Vendor Mobile App & Portal Developers (`vendor-portal`)  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  

---

## 📋 Overview

The DigiLocal backend now supports **Merchant Support Ticketing & Payout Dispute Management**. Vendor merchants can submit store inquiries, dispute payout settlements, track resolution progress, upload evidence attachments, and view past ticket history directly inside the Vendor App and Merchant Portal.

---

## 🔐 Authentication Header

All requests require the logged-in Merchant Vendor's JWT token:

```http
Authorization: Bearer <VENDOR_JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 📡 API Endpoints Specification

### 1. Submit Vendor Inquiry / Payout Dispute
- **Method**: `POST`
- **Endpoint**: `/api/vendor/tickets` (or `/api/vendors/tickets`)
- **Content-Type**: `application/json`

#### Request Payload:
```json
{
  "subject": "Store Settlement Discrepancy",
  "description": "Settlement amount for order #ORD-9842 reflects 10% commission deduction instead of 5% agreed rate.",
  "category": "billing",
  "priority": "high",
  "store_name": "Flower's Point",
  "reporter_email": "aarushi20@gmail.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `subject` | `string` | ✅ Yes | Short title of inquiry/dispute |
| `description` | `string` | ✅ Yes | Detailed description of the issue |
| `category` | `string` | ❌ Optional | `billing`, `technical`, `vendor_vs_user`, `onboarding`, `general` (default: `billing`) |
| `priority` | `string` | ❌ Optional | `low`, `medium`, `high`, `urgent` (default: `high`) |
| `store_name` | `string` | ❌ Optional | Name of merchant store |
| `reporter_email` | `string` | ❌ Optional | Merchant contact email |

#### Response (`201 Created`):
```json
{
  "code": 201,
  "status": "success",
  "message": "Merchant inquiry TICK-4912 submitted successfully.",
  "data": {
    "ticket_id": "t-178829910011",
    "ticket_number": "TICK-4912",
    "status": "open",
    "priority": "high",
    "sla_minutes_remaining": 45,
    "created_at_readable": "02 Sep 2026, 12:45 pm IST"
  }
}
```

---

### 2. Fetch Merchant's Submitted Tickets
- **Method**: `GET`
- **Endpoint**: `/api/vendor/tickets` (or `/api/vendors/tickets`)

#### Response (`200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "ticket_id": "t-178829910011",
      "ticket_number": "TICK-4912",
      "subject": "Store Settlement Discrepancy",
      "category": "billing",
      "status": "open",
      "priority": "high",
      "unread_messages_count": 0,
      "created_at_readable": "02 Sep 2026, 12:45 pm IST"
    }
  ]
}
```

---

### 3. Upload Document / Evidence Attachment
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
    "ticket_id": "t-178829910011",
    "file_name": "settlement_invoice.pdf",
    "file_size_bytes": 1420500,
    "file_url": "https://storage.digilocal.in/support/att_98421.pdf",
    "uploaded_at_ist": "2026-09-02T12:50:00+05:30"
  }
}
```

---

## ❌ Standard Error Status Codes

| Status Code | Error Key | Description |
|-------------|-----------|-------------|
| `401 Unauthorized` | `UNAUTHORIZED` | Invalid or expired Vendor JWT Token |
| `404 Not Found` | `TICKET_NOT_FOUND` | Specified `ticketId` does not exist |
| `400 Bad Request` | `VALIDATION_ERROR` | Missing mandatory fields (`subject`, `description`) |

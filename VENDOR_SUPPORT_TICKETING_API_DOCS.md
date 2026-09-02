# 🏪 Merchant Vendor Mobile App & Portal — Support Ticketing API Documentation (v5.0.0)

Dedicated REST API specification for **Merchant Vendor App & Portal Developers (`vendor-portal`)**.

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
Authorization: Bearer <VENDOR_JWT_TOKEN>
Content-Type: application/json
```

---

## 📋 Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/vendor/tickets` | Submit a new vendor store inquiry or payout dispute |
| `GET` | `/api/vendor/tickets` | Fetch history of tickets submitted by the merchant |

---

## 1. Submit Vendor Inquiry / Payout Dispute

**Method:** `POST`  
**Endpoint:** `/api/vendor/tickets` (or `/api/vendors/tickets`)

### Request Body
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

### Response `201 Created`
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

## 2. Fetch Merchant's Submitted Tickets

**Method:** `GET`  
**Endpoint:** `/api/vendor/tickets` (or `/api/vendors/tickets`)

### Response `200 OK`
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

# 📢 FRONTEND NOTICE: Standardized Phone Fields & Differentiated Timestamps

> **Document Version**: `v3.7.0 (Phone Payload & IST Timestamp Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Website Frontend Developers, Vendor Mobile App Developers, Admin Panel Developers (`adminMock`)  
> **Effective Date**: Immediate  

---

## 📋 Summary of Phone Payload & Timestamp Updates

### 1. Simplified Phone Payload Attributes
Across all backend APIs (User Website, Vendor App, Admin Panel), phone attributes are now simplified to **strictly two fields**:

- **`country_code`**: `"+91"`
- **`phone_number`**: `"9784319840"` *(10-digit mobile number)*

All extra fields (`phone_digits`, `phone`, `mobile`) have been removed for clean UI parsing.

---

### 2. Differentiated Timestamp Attributes

To resolve ambiguity between server/UTC time and India Standard Time (IST):

- **`created_at`**: Standard ISO 8601 UTC timestamp (e.g. `"2026-09-02T01:02:11.000Z"`).
- **`created_at_ist`**: Converted ISO timestamp with explicit **+05:30 IST offset** (e.g. `"2026-09-02T06:32:11+05:30"`).
- **`created_at_readable`**: Human-readable IST display string for UI components (e.g. `"02 Sep 2026, 06:32 am IST"`).

---

## 📡 API Response Payload Examples (`HTTP 200 OK`)

### 1. Admin Panel User Directory (`GET /api/admin/users` / `GET /api/admin/users/:userId`)

```json
{
  "code": 200,
  "status": "success",
  "message": "Users directory retrieved successfully.",
  "data": [
    {
      "user_id": "usr_v_1223",
      "name": "Raj",
      "email": "raj@gmail.com",
      "country_code": "+91",
      "phone_number": "9784319840",
      "area": "Jagatpura",
      "society_name": "Jagatpura",
      "flat": "Shop 101",
      "status": "active",
      "is_blocked": false,
      "created_at": "2026-09-02T01:02:11.000Z",
      "created_at_ist": "2026-09-02T06:32:11+05:30",
      "created_at_readable": "02 Sep 2026, 06:32 am IST"
    }
  ]
}
```

---

### 2. Admin Panel & Vendor App Vendor Profile (`GET /api/admin/vendors` / `GET /api/vendors/profile`)

```json
{
  "vendor_id": 1216,
  "vendor_name": "Aarushi",
  "store_name": "Flower's Point",
  "email": "aarushi20@gmail.com",
  "country_code": "+91",
  "phone_number": "9784319840",
  "whatsapp_number": "9784319840",
  "category": "Grocery",
  "status": "ACTIVE",
  "created_at": "2026-08-31T13:23:22.000Z",
  "created_at_ist": "2026-08-31T18:53:22+05:30",
  "created_at_readable": "31 Aug 2026, 06:53 pm IST"
}
```

---

## 📱 Developer Announcement / SMS Notice Text

Below is the updated copy-paste SMS / Slack message notice for all frontend developers:

```text
📢 [FRONTEND UPDATE NOTICE - PHONE & IST TIME SCHEMAS]
Backend API responses have been updated with simplified phone fields and differentiated IST timestamps:
1. Phone Fields:
  • country_code: "+91"
  • phone_number: "9784319840"
2. Timestamps:
  • created_at: "2026-09-02T01:02:11.000Z" (Standard UTC ISO)
  • created_at_ist: "2026-09-02T06:32:11+05:30" (Converted IST ISO with +05:30)
  • created_at_readable: "02 Sep 2026, 06:32 am IST" (Formatted Display Text)
Please update UI cards/tables to use created_at_ist or created_at_readable for IST display.
```

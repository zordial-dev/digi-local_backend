# 📢 FRONTEND NOTICE: Admin Panel User Timestamp Standardization (IST +05:30)

> **Document Version**: `v3.4.0 (Admin Panel User Schema Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Admin Panel Frontend Developers (`adminMock`), Mobile & Web Integration Engineers  
> **Effective Date**: Immediate  

---

## 📋 Summary of Schema Update

To ensure consistency across the Admin Panel user directory, all user record responses (`GET /api/admin/users`, `GET /api/admin/users/:userId`) now strictly emit timestamps formatted in **India Standard Time (IST, UTC+05:30)**.

### Standardized Time Fields Added to User Object:

1. **`created_at`**:
   - ISO 8601 string with explicit `+05:30` IST offset.
   - Example: `"2026-09-02T06:32:11+05:30"`
2. **`created_at_ist`**:
   - ISO 8601 string with explicit `+05:30` IST offset for direct frontend filtering.
   - Example: `"2026-09-02T06:32:11+05:30"`
3. **`created_at_readable`**:
   - Formatted IST display string for UI tables, modals, and detail cards.
   - Example: `"02 Sep 2026, 06:32 am IST"`

---

## 📡 Updated Admin User Payload Example (`HTTP 200 OK`)

### Endpoints:
- `GET /api/admin/users`
- `GET /api/admin/users/:userId`

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
      "phone": "9571240742",
      "area": "Jagatpura",
      "society_name": "Jagatpura",
      "flat": "Shop 101",
      "status": "active",
      "is_blocked": false,
      "created_at": "2026-09-02T06:32:11+05:30",
      "created_at_ist": "2026-09-02T06:32:11+05:30",
      "created_at_readable": "02 Sep 2026, 06:32 am IST"
    }
  ]
}
```

---

## 📱 Developer Announcement / SMS Notice Text

Below is the copy-paste SMS / Slack message notice for the Admin Panel frontend team:

```text
📢 [FRONTEND UPDATE NOTICE]
Admin Panel User API responses now include IST (+05:30) standardized timestamps.
- Endpoint: GET /api/admin/users & GET /api/admin/users/:userId
- New Fields:
  • created_at: "2026-09-02T06:32:11+05:30"
  • created_at_ist: "2026-09-02T06:32:11+05:30"
  • created_at_readable: "02 Sep 2026, 06:32 am IST"
Please update your user table & user profile components to use created_at_ist or created_at_readable. No client-side timezone offset math is required.
```

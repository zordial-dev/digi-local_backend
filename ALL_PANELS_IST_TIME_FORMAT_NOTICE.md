# 📢 FRONTEND NOTICE: Standardization of All API Timestamps to IST (+05:30)

> **Document Version**: `v3.3.0 (Timezone Standardization Specification)`  
> **Status**: APPROVED & APPLIED IN PRODUCTION  
> **Target Audience**: Website Frontend Developers, Vendor Mobile App Developers, Admin Panel Developers  
> **Effective Date**: Immediate  

---

## 📋 Summary of Standardization

To eliminate timezone mismatches across platforms, **ALL date and timestamp fields** across all backend API responses (User Website, Vendor App, Admin Panel) are now strictly formatted in **India Standard Time (IST, UTC+05:30)**.

### Standardized Format Attributes:

1. **`created_at` / `createdAt` / `date`**:  
   - Format: `YYYY-MM-DDTHH:mm:ss+05:30`  
   - Example: `"2026-09-01T17:45:00+05:30"`

2. **`created_at_readable` / `date_readable`**:  
   - Format: `DD MMM YYYY, hh:mm am/pm IST`  
   - Example: `"01 Sep 2026, 05:45 pm IST"`

3. **`timestamp` / `time`**:  
   - Format: `hh:mm am/pm`  
   - Example: `"05:45 pm"`

---

## 📡 Updated API Response Payload Examples

### 1. User / Admin Orders API (`GET /api/orders` / `GET /api/admin/orders`)

```json
{
  "order_id": "ORD-5427",
  "customer_name": "usher",
  "total_amount": 599,
  "status": "COMPLETED",
  "created_at": "2026-09-01T17:45:00+05:30",
  "created_at_readable": "01 Sep 2026, 05:45 pm IST",
  "timestamp": "05:45 pm"
}
```

---

### 2. User Profile & Status API (`GET /api/users/profile` / `GET /api/users/status/:userId`)

```json
{
  "user_id": "usr_708296",
  "name": "usher",
  "phone": "+918585858585",
  "status": "active",
  "created_at": "2026-09-01T11:05:08+05:30"
}
```

---

### 3. Vendor Profile API (`GET /api/vendors/:id` / `GET /api/vendors/profile`)

```json
{
  "vendor_id": 1217,
  "store_name": "FreshMart Super Store",
  "opening_time": "08:00 AM",
  "closing_time": "10:00 PM",
  "created_at": "2026-08-31T06:24:41+05:30",
  "created_at_readable": "31 Aug 2026, 06:24 am IST"
}
```

---

## 🛠️ Actions Required by Frontend Teams

- **No timezone conversions needed**: You can display `created_at_readable` or `timestamp` directly on cards and tables without parsing UTC or converting browser offsets.
- Parse `+05:30` automatically using standard `new Date(order.created_at)` if performing dynamic duration math.

# DigiLocal Admin Panel — User & Vendor Strike System API Documentation

> **Document Version:** 1.0.0  
> **Audience:** Admin Panel Frontend Developers  
> **Base URL:** `/api/admin` (with aliases `/api/v1/admin`, `/api/people`, `/api/vendors`)

---

## 1. Overview & Core Rules

1. **`strike_count` in Payloads:**
   - Every User and Vendor detail/list payload now contains `strike_count` (integer: `0`, `1`, `2`, `3`).
   - The field `strikes` is also provided in every payload as a backward-compatible alias.
2. **Three-Strike Ban Policy:**
   - **0 Strikes:** Clean account (`status: "active"` / `"ACTIVE"`).
   - **1 Strike:** Warning issued (`strike_count: 1`).
   - **2 Strikes:** Critical Warning (`strike_count: 2`). Frontend should show high-priority warning banner.
   - **3 Strikes:** Auto-Ban (`status: "blocked"` / `"BLOCKED"`, `is_blocked: true`). Account is restricted from placing orders or receiving store orders.
3. **Unban Behavior:**
   - When an administrator unbans/unblocks a user or a vendor:
     - `strike_count` is set to **`0`**.
     - `status` is set to **`"active"`** (for users) or **`"ACTIVE"`** (for vendors).
     - `is_blocked` is set to **`false`**.
     - Strike history is cleared.

---

## 2. User API Endpoints

### 2.1. List Users
- **Endpoint:** `GET /api/admin/users` (Alias: `GET /api/people`)
- **Query Params:** `?page=1&limit=100&search=9876543210`
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "Users directory retrieved successfully.",
  "data": [
    {
      "user_id": "usr_1024",
      "public_id": "usr@1024",
      "name": "Rohan Sharma",
      "email": "rohan@example.com",
      "phone": "9876543210",
      "phone_number": "9876543210",
      "status": "active",
      "is_blocked": false,
      "strike_count": 0,
      "strikes": 0,
      "flags_count": 0,
      "society_name": "Antriksh Golf View 1",
      "area": "Sector 78",
      "flat": "A-402",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301",
      "created_at": "2026-09-02T10:00:00.000Z"
    }
  ]
}
```

---

### 2.2. Get User Details
- **Endpoint:** `GET /api/admin/users/:userId` (Alias: `GET /api/people/:id`)
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "User profile retrieved successfully.",
  "data": {
    "user_id": "usr_1024",
    "public_id": "usr@1024",
    "name": "Rohan Sharma",
    "email": "rohan@example.com",
    "phone": "9876543210",
    "status": "active",
    "is_blocked": false,
    "strike_count": 1,
    "strikes": 1,
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301"
  }
}
```

---

### 2.3. Issue Strike to User
- **Endpoint:** `POST /api/admin/users/:userId/strike` (Alias: `POST /api/people/:id/strike`)
- **Request Body:**
```json
{
  "reason": "Repeated fake order cancellations"
}
```
- **Response (on 3rd strike):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Strike #3 issued to user \"Rohan Sharma\". Account has reached 3 strikes and is AUTOMATICALLY BANNED / BLOCKED!",
  "data": {
    "user_id": "usr_1024",
    "name": "Rohan Sharma",
    "status": "blocked",
    "is_blocked": true,
    "is_auto_banned": true,
    "strike_count": 3,
    "strikes": 3,
    "max_strikes_allowed": 3,
    "reason": "Repeated fake order cancellations",
    "strike_reasons": [
      { "strike_number": 1, "reason": "Policy violation warning" },
      { "strike_number": 2, "reason": "Abusive behavior with delivery staff" },
      { "strike_number": 3, "reason": "Repeated fake order cancellations" }
    ]
  }
}
```

---

### 2.4. Unban / Unblock User (Resets `strike_count` to 0)
- **Endpoint:** `POST /api/admin/users/:userId/unban` (Aliases: `POST /api/admin/users/:userId/unblock`, `POST /api/people/:id/unban`, `POST /api/people/:id/unblock`)
- **Request Body (Optional):**
```json
{
  "reason": "User appeal reviewed and approved by management"
}
```
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "User \"Rohan Sharma\" has been successfully unbanned. Status set to ACTIVE and all 3 strike(s) cleared.",
  "data": {
    "user_id": "usr_1024",
    "name": "Rohan Sharma",
    "status": "active",
    "is_blocked": false,
    "is_banned": false,
    "strike_count": 0,
    "strikes": 0,
    "flags_count": 0,
    "previous_status": "blocked",
    "previous_strikes": 3,
    "unban_reason": "User appeal reviewed and approved by management"
  }
}
```

---

### 2.5. Remove Strike / Decrement Strikes for User
- **Endpoint:** `DELETE /api/admin/users/:userId/strike` or `POST /api/admin/users/:userId/unstrike`
- **Request Body (Optional):**
```json
{
  "reset_all": false
}
```
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "User strikes count updated to 1.",
  "data": {
    "user_id": "usr_1024",
    "strike_count": 1,
    "strikes": 1,
    "status": "active",
    "is_blocked": false
  }
}
```

---

## 3. Vendor API Endpoints

### 3.1. List Vendors
- **Endpoint:** `GET /api/admin/vendors` (Aliases: `GET /api/vendors`, `GET /api/vendors/all`)
- **Query Params:** `?page=1&limit=50&search=FreshMart&status=all`
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendors list retrieved successfully.",
  "data": [
    {
      "vendor_id": 42,
      "public_id": "vnd@0042",
      "id": 42,
      "store_name": "Daily Fresh Mart",
      "vendor_name": "Suresh Patel",
      "owner_name": "Suresh Patel",
      "email": "freshmart@example.com",
      "phone_number": "9812345678",
      "whatsapp_number": "9812345678",
      "status": "ACTIVE",
      "is_blocked": false,
      "strike_count": 0,
      "strikes": 0,
      "category": "Grocery",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    }
  ]
}
```

---

### 3.2. Get Vendor Details
- **Endpoint:** `GET /api/admin/vendors/:vendorId` (Alias: `GET /api/vendors/:id`)
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor details retrieved successfully.",
  "data": {
    "vendor_id": 42,
    "public_id": "vnd@0042",
    "store_name": "Daily Fresh Mart",
    "vendor_name": "Suresh Patel",
    "email": "freshmart@example.com",
    "phone_number": "9812345678",
    "status": "ACTIVE",
    "is_blocked": false,
    "strike_count": 0,
    "strikes": 0,
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301"
  }
}
```

---

### 3.3. Issue Strike to Vendor
- **Endpoint:** `POST /api/admin/vendors/:vendorId/strike`
- **Request Body:**
```json
{
  "reason": "Selling expired products to residents"
}
```
- **Response (on 3rd strike):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Strike #3 issued to vendor \"Daily Fresh Mart\". Vendor has reached 3 strikes and is AUTOMATICALLY BANNED / BLOCKED!",
  "data": {
    "vendor_id": 42,
    "store_name": "Daily Fresh Mart",
    "status": "blocked",
    "is_blocked": true,
    "is_auto_banned": true,
    "strike_count": 3,
    "strikes": 3,
    "max_strikes_allowed": 3,
    "reason": "Selling expired products to residents",
    "strike_reasons": [
      { "strike_number": 1, "reason": "Late delivery complaint" },
      { "strike_number": 2, "reason": "Overcharging residents beyond MRP" },
      { "strike_number": 3, "reason": "Selling expired products to residents" }
    ]
  }
}
```

---

### 3.4. Unban / Unblock Vendor (Resets `strike_count` to 0)
- **Endpoint:** `POST /api/admin/vendors/:vendorId/unban` (Aliases: `POST /api/admin/vendors/:vendorId/unblock`, `POST /api/vendors/:id/unblock`, `DELETE /api/admin/vendors/:id/block`)
- **Request Body (Optional):**
```json
{
  "reason": "Vendor submitted compliance proof and signed SLA agreement"
}
```
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor \"Daily Fresh Mart\" has been successfully unbanned. Status set to ACTIVE and strike count reset to 0.",
  "data": {
    "vendor_id": 42,
    "store_name": "Daily Fresh Mart",
    "vendor_name": "Suresh Patel",
    "status": "ACTIVE",
    "is_blocked": false,
    "is_banned": false,
    "strike_count": 0,
    "strikes": 0,
    "flags_count": 0,
    "previous_status": "blocked",
    "previous_strikes": 3,
    "unban_reason": "Vendor submitted compliance proof and signed SLA agreement"
  }
}
```

---

### 3.5. Update Vendor Status Directly
- **Endpoint:** `POST /api/admin/vendors/:vendorId/status` (or `PATCH`)
- **Request Body:**
```json
{
  "status": "ACTIVE"
}
```
*(Note: Whenever status is updated to `"ACTIVE"`, the backend automatically resets `strike_count` to `0` and clears strikes).*

---

### 3.6. Get Vendor Strike History
- **Endpoint:** `GET /api/admin/vendors/:vendorId/strike` (or `/strikes`)
- **Response:**
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor strike details retrieved successfully.",
  "data": {
    "vendor_id": 42,
    "store_name": "Daily Fresh Mart",
    "strike_count": 2,
    "strikes": 2,
    "max_strikes_allowed": 3,
    "strikes_remaining": 1,
    "status": "active",
    "is_blocked": false,
    "strike_reasons": [
      { "strike_number": 1, "reason": "Late delivery" },
      { "strike_number": 2, "reason": "Overcharging" }
    ]
  }
}
```

---

## 4. Frontend UI / Component Recommendations

1. **Table Column: Strikes Badge**
   - `strike_count === 0`: Green pill badge `0 Strikes` or `Clean`.
   - `strike_count === 1`: Yellow pill badge `1 Strike (Warning)`.
   - `strike_count === 2`: Orange pill badge `2 Strikes (Critical)`.
   - `strike_count >= 3`: Red pill badge `3 Strikes (Banned)`.

2. **Action Buttons:**
   - When `user.is_blocked || user.status === 'blocked'` or `vendor.is_blocked || vendor.status === 'BLOCKED'`:
     - Show **"Unban Account"** button triggering `POST .../unban`.
     - In the unban modal/alert: *"Unbanning this account will restore its status to ACTIVE and reset its strike count to 0."*
   - Show **"Issue Strike"** button triggering `POST .../strike` with reason input.

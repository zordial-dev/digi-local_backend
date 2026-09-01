# ⚡ Admin Panel: User Strike & 3-Strike Auto-Ban System API Specification

> **Document Version**: `v3.7.0 (User Moderation Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Target Audience**: Admin Panel Frontend Developers (`C:\Users\LENOVO\Desktop\adminMock`)  

---

## 📋 Summary of Feature Behavior

1. **Strike Counter (`strikes`)**:
   - Each resident user profile tracks a `strikes` integer counter (default `0`).
   - `strikes` is returned on all user profile & list endpoints (`GET /api/admin/users`, `GET /api/people/:id`, `GET /api/users/status`).

2. **3-Strike Automatic Ban**:
   - When an Admin clicks the **Issue Strike** button (`POST /api/admin/users/:userId/strike`), the user's `strikes` count is incremented by +1.
   - If `strikes >= 3`, the user's account status is **AUTOMATICALLY UPDATED TO `BLOCKED`** (`is_blocked: true`, `is_auto_banned: true`).
   - The user's app/web session will be immediately denied access (`HTTP 403 USER_BLOCKED`) forcing an automatic logout.

3. **Reset / Remove Strike**:
   - Admins can remove strikes or unblock the user (`DELETE /api/admin/users/:userId/strike` or `POST /api/admin/users/:userId/unstrike`).

---

## 📡 API Endpoints Specification

### 1. Issue Strike to User (`POST /api/admin/users/:id/strike` or `POST /api/people/:id/strike`)

#### Headers:
```http
Content-Type: application/json
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

#### Request Body (Optional):
```json
{
  "reason": "Policy violation / fake orders"
}
```

#### Response Example — Strike #1 or #2 (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Strike #1 issued to user \"Garvit\". (2 strikes remaining before automatic ban).",
  "data": {
    "user_id": "usr_079501",
    "name": "Garvit",
    "phone": "+917568021054",
    "strikes": 1,
    "max_strikes_allowed": 3,
    "status": "active",
    "is_blocked": false,
    "is_auto_banned": false,
    "reason": "Policy violation / fake orders"
  }
}
```

#### Response Example — Strike #3 (Triggers 3-Strike Auto-Ban) (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Strike #3 issued to user \"Garvit\". Account has reached 3 strikes and is AUTOMATICALLY BANNED / BLOCKED!",
  "data": {
    "user_id": "usr_079501",
    "name": "Garvit",
    "phone": "+917568021054",
    "strikes": 3,
    "max_strikes_allowed": 3,
    "status": "blocked",
    "is_blocked": true,
    "is_auto_banned": true,
    "reason": "Policy violation / fake orders"
  }
}
```

---

### 2. Remove / Reset User Strikes (`DELETE /api/admin/users/:id/strike` or `POST /api/people/:id/unstrike`)

#### Request Body (Optional):
```json
{
  "reset_all": true
}
```

#### Response Example (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "User strikes count updated to 0.",
  "data": {
    "user_id": "usr_079501",
    "name": "Garvit",
    "phone": "+917568021054",
    "strikes": 0,
    "max_strikes_allowed": 3,
    "status": "active",
    "is_blocked": false
  }
}
```

---

## 🛠️ Actions Required by Admin Panel Frontend Team

1. **User List / User Details View**:
   - Display a **Strike Counter Badge** showing `user.strikes / 3` (e.g. `⚡ 2/3 Strikes`).
   - Add the **Issue Strike** button calling `POST /api/admin/users/:id/strike`.
   - Highlight auto-banned users (`strikes >= 3` or `status === 'blocked'`) with a red warning badge.

# ⚡ User Panel: 2nd Strike Warning & 3-Strike Auto-Ban System API Specification

> **Document Version**: `v4.0.0 (User Moderation & Strike Warning Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Target Audience**: Website Frontend Developers & User App Panel Developers  

---

## 📋 Overview & Business Rules

The DigiLocal platform enforces a **3-Strike Moderation Policy** for resident users:

1. **Strike #1 (First Warning)**:
   - Increments the user's `strikes` count to `1`.
   - Logged in the system with an official strike reason.

2. **Strike #2 (Second Strike & Warning Message)**:
   - Increments `strikes` count to `2`.
   - The User Panel APIs (`GET /api/users/status`, `GET /api/users/profile`, `GET /api/users/strikes`) return `show_second_strike_warning: true` and `show_strike_warning: true`.
   - **Both strike reasons** (Strike #1 and Strike #2) are returned in the API responses in `strike_reasons_list` (array of string reasons) and `strike_reasons` (array of objects with `strike_number`, `reason`, and `created_at` timestamp).
   - **Frontend Requirement**: The website/user panel MUST display a warning modal or persistent top banner informing the user about their 2nd strike, displaying both strike reasons, and warning them that a 3rd strike will automatically block their account.

3. **Strike #3 (Automatic Account Ban)**:
   - Increments `strikes` count to `3`.
   - The user account is **AUTOMATICALLY BLOCKED** (`status: "blocked"`, `is_blocked: true`, `is_auto_banned: true`).
   - Any attempt to access User Panel endpoints returns `HTTP 403 Forbidden` (`code: "USER_BLOCKED"`) along with all 3 strike reasons.
   - **Frontend Requirement**: The website MUST automatically log out the user, clear stored tokens, and display a block screen advising the user to contact support.

---

## 📡 API Endpoints Specification

---

### 1. User Panel Status & Strike Check (`GET /api/users/status` or `GET /api/users/status/:userId`)

Use this endpoint on website initialization, app launch, or routing to check user status and strike warnings.

#### Headers:
```http
Authorization: Bearer <USER_JWT_TOKEN>
Accept: application/json
```

#### Response Example — User with 2nd Strike (`HTTP 200 OK`):
```json
{
  "success": true,
  "user_id": "usr_991823",
  "name": "Garvit Sharma",
  "email": "garvit@example.com",
  "phone": "+917568021054",
  "status": "active",
  "is_blocked": false,
  "strikes": 2,
  "max_strikes_allowed": 3,
  "show_second_strike_warning": true,
  "show_strike_warning": true,
  "warning_title": "Second Strike Warning",
  "warning_message": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!",
  "strike_reasons_list": [
    "First strike: Repeated fake or unpaid order placements",
    "Second strike: Abusive communication with vendor/support"
  ],
  "strike_reasons": [
    {
      "strike_number": 1,
      "reason": "First strike: Repeated fake or unpaid order placements",
      "created_at": "2026-09-08T10:15:00+05:30"
    },
    {
      "strike_number": 2,
      "reason": "Second strike: Abusive communication with vendor/support",
      "created_at": "2026-09-08T12:00:00+05:30"
    }
  ],
  "society_id": "101",
  "society_name": "Sunrise Apartments",
  "area": "Sector 62",
  "flat": "Flat 402",
  "city": "Noida",
  "pincode": "201301",
  "address": "Flat 402, Sunrise Apartments, Sector 62, Noida",
  "message": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!",
  "recommended_ui_text": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!"
}
```

#### Response Example — User Reached 3rd Strike (Auto-Blocked) (`HTTP 403 Forbidden`):
```json
{
  "success": false,
  "user_id": "usr_991823",
  "status": "blocked",
  "code": "USER_BLOCKED",
  "is_blocked": true,
  "is_auto_banned": true,
  "strikes": 3,
  "max_strikes_allowed": 3,
  "action": "logout",
  "error": "Resident user account has been blocked by administrator due to policy violation or 3 strikes limit.",
  "message": "Your resident user account has been blocked due to policy violations or 3 strikes limit. Please log out and contact customer support.",
  "recommended_ui_text": "Your user account has been blocked by admin. Access denied.",
  "strike_reasons_list": [
    "First strike: Repeated fake or unpaid order placements",
    "Second strike: Abusive communication with vendor/support",
    "Third strike: Fraudulent cancellation request"
  ],
  "strike_reasons": [
    {
      "strike_number": 1,
      "reason": "First strike: Repeated fake or unpaid order placements",
      "created_at": "2026-09-08T10:15:00+05:30"
    },
    {
      "strike_number": 2,
      "reason": "Second strike: Abusive communication with vendor/support",
      "created_at": "2026-09-08T12:00:00+05:30"
    },
    {
      "strike_number": 3,
      "reason": "Third strike: Fraudulent cancellation request",
      "created_at": "2026-09-08T12:05:00+05:30"
    }
  ]
}
```

---

### 2. Dedicated User Strikes Info Endpoint (`GET /api/users/strikes` or `GET /api/users/strikes/:userId`)

Dedicated endpoint for the User Panel warning banner or modal component to fetch strike details.

#### Headers:
```http
Authorization: Bearer <USER_JWT_TOKEN>
Accept: application/json
```

#### Response Example — 2nd Strike Warning (`HTTP 200 OK`):
```json
{
  "success": true,
  "user_id": "usr_991823",
  "name": "Garvit Sharma",
  "phone": "+917568021054",
  "status": "active",
  "is_blocked": false,
  "is_auto_banned": false,
  "strikes": 2,
  "max_strikes_allowed": 3,
  "show_second_strike_warning": true,
  "show_strike_warning": true,
  "warning_title": "Second Strike Warning",
  "warning_message": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!",
  "strike_reasons_list": [
    "First strike: Repeated fake or unpaid order placements",
    "Second strike: Abusive communication with vendor/support"
  ],
  "strike_reasons": [
    {
      "strike_number": 1,
      "reason": "First strike: Repeated fake or unpaid order placements",
      "created_at": "2026-09-08T10:15:00+05:30"
    },
    {
      "strike_number": 2,
      "reason": "Second strike: Abusive communication with vendor/support",
      "created_at": "2026-09-08T12:00:00+05:30"
    }
  ],
  "message": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!"
}
```

---

### 3. User Profile Endpoint (`GET /api/users/profile` or `GET /api/users/me`)

#### Response Example — User Profile with 2nd Strike Warning Fields (`HTTP 200 OK`):
```json
{
  "user_id": "usr_991823",
  "name": "Garvit Sharma",
  "email": "garvit@example.com",
  "phone": "+917568021054",
  "status": "active",
  "is_blocked": false,
  "strikes": 2,
  "max_strikes_allowed": 3,
  "show_second_strike_warning": true,
  "show_strike_warning": true,
  "warning_title": "Second Strike Warning",
  "warning_message": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!",
  "strike_reasons_list": [
    "First strike: Repeated fake or unpaid order placements",
    "Second strike: Abusive communication with vendor/support"
  ],
  "strike_reasons": [
    {
      "strike_number": 1,
      "reason": "First strike: Repeated fake or unpaid order placements",
      "created_at": "2026-09-08T10:15:00+05:30"
    },
    {
      "strike_number": 2,
      "reason": "Second strike: Abusive communication with vendor/support",
      "created_at": "2026-09-08T12:00:00+05:30"
    }
  ],
  "society_id": "101",
  "society_name": "Sunrise Apartments",
  "area": "Sector 62",
  "flat": "Flat 402",
  "city": "Noida",
  "pincode": "201301",
  "address": "Flat 402, Sunrise Apartments, Sector 62, Noida",
  "created_at": "2026-09-08T10:00:00+05:30"
}
```

---

### 4. Admin Panel Endpoint: Issue Strike (`POST /api/admin/users/:userId/strike` or `POST /api/people/:id/strike`)

Called by Admin Portal to issue a strike to a resident user.

#### Request Body:
```json
{
  "reason": "Abusive communication with vendor/support"
}
```

#### Response Example — Strike #2 Issued (`HTTP 200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Strike #2 issued to user \"Garvit Sharma\". (1 strikes remaining before automatic ban).",
  "data": {
    "user_id": "usr_991823",
    "name": "Garvit Sharma",
    "phone": "+917568021054",
    "strikes": 2,
    "max_strikes_allowed": 3,
    "status": "active",
    "is_blocked": false,
    "is_auto_banned": false,
    "show_second_strike_warning": true,
    "show_strike_warning": true,
    "warning_title": "Second Strike Warning",
    "warning_message": "Warning: You have received 2 strikes on your account due to policy violations. Receiving a 3rd strike will result in your account being automatically blocked!",
    "reason": "Abusive communication with vendor/support",
    "strike_reasons_list": [
      "First strike: Repeated fake or unpaid order placements",
      "Second strike: Abusive communication with vendor/support"
    ],
    "strike_reasons": [
      {
        "strike_number": 1,
        "reason": "First strike: Repeated fake or unpaid order placements",
        "created_at": "2026-09-08T10:15:00+05:30"
      },
      {
        "strike_number": 2,
        "reason": "Second strike: Abusive communication with vendor/support",
        "created_at": "2026-09-08T12:00:00+05:30"
      }
    ],
    "message": "Strike #2 issued to user \"Garvit Sharma\". (1 strikes remaining before automatic ban)."
  }
}
```

---

### 5. Admin Panel Endpoint: Remove / Reset Strikes (`DELETE /api/admin/users/:userId/strike` or `POST /api/people/:id/unstrike`)

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
    "user_id": "usr_991823",
    "name": "Garvit Sharma",
    "phone": "+917568021054",
    "strikes": 0,
    "max_strikes_allowed": 3,
    "status": "active",
    "is_blocked": false,
    "show_second_strike_warning": false,
    "show_strike_warning": false,
    "strike_reasons": [],
    "strike_reasons_list": []
  }
}
```

---

## 💻 Frontend Website Developer Checklist

1. **Check Strike Warning Status**:
   - On page load / status check, inspect `res.show_second_strike_warning` or `res.strikes === 2`.
2. **Display Strike Warning UI**:
   - Render a modal / popup or prominent banner:
     - **Heading**: `"⚡ Account Warning: 2 Strikes Received"`
     - **Message**: `res.warning_message`
     - **Reasons List**: Render `res.strike_reasons_list` or `res.strike_reasons` as a bulleted list so the user sees exactly why both Strike #1 and Strike #2 were issued.
3. **Handle 3rd Strike Auto-Ban**:
   - If an API returns `HTTP 403 Forbidden` with `code: "USER_BLOCKED"`:
     - Show block modal listing all 3 strike reasons from `res.strike_reasons_list`.
     - Clear auth token & redirect user to login/support screen.

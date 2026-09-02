# 📢 FRONTEND NOTICE & API DOCS: Vendor & Admin Panel Logout Endpoints

> **Document Version**: `v4.2.0 (Logout API Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Vendor Mobile App Developers, Admin Panel Developers (`adminMock`), Integration Engineers  
> **Effective Date**: Immediate  

---

## 📋 Summary of Logout Specifications

This document outlines the standard logout endpoints for both the **Vendor Mobile App** and the **Admin Panel**. Calling these endpoints revokes active sessions and clears device push notification tokens.

---

## 🏪 1. Vendor Mobile App Logout API

### Endpoint: `POST /api/vendors/logout` (or `POST /api/vendor/logout`)

#### Headers
```text
Content-Type: application/json
Authorization: Bearer <VENDOR_JWT_TOKEN>
```

#### Optional Request Body
```json
{
  "vendor_id": 1216
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor logged out successfully. Session invalidated."
}
```

#### Behavior & Actions:
- Invalidates the active vendor JWT token on the backend.
- Clears stored push notification device tokens (`push_token` & `fcm_token`) associated with the vendor store.

---

## 🛡️ 2. Admin Panel Logout API

### Endpoint: `POST /api/admin/logout` (or `POST /api/auth/logout` / `POST /api/v1/auth/logout`)

#### Headers
```text
Content-Type: application/json
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

#### Request Body
None required.

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Admin logged out successfully. Session invalidated.",
  "data": {}
}
```

#### Behavior & Actions:
- Invalidates active Admin / Sub-Admin JWT session token.

---

## 📱 Developer Announcement / SMS Notice Text

Below is the copy-paste announcement message for frontend developers:

```text
📢 [FRONTEND UPDATE NOTICE - LOGOUT ENDPOINTS]
Logout endpoints are active for both Vendor App and Admin Panel:
1. Vendor App Logout:
   - Endpoint: POST /api/vendors/logout
   - Header: Authorization: Bearer <VENDOR_TOKEN>
   - Clears FCM push device tokens and revokes JWT session.
2. Admin Panel Logout:
   - Endpoint: POST /api/admin/logout (or POST /api/auth/logout)
   - Header: Authorization: Bearer <ADMIN_TOKEN>
   - Revokes active admin session.
Please ensure clients clear stored auth tokens from local storage / secure store upon calling logout.
```

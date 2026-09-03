# Sub-Admin Hierarchy, Delegatable Powers Ceiling & Creator Security — API Documentation

This document provides technical integration guidelines for the Admin Panel frontend developers regarding **Sub-Admin Creation Delegation**, **Delegatable Powers Ceiling Configuration**, **Creator Identification**, and **Creator-Only Account Deletion Enforcement**.

---

## 1. Overview & Business Rules

1. **Sub-Admin Administration Power (`SUB_ADMINS`)**:
   - Super Admin can grant a sub-admin account the Sub-Admin Administration power (`"SUB_ADMINS"` inside `powers` array or setting `can_manage_subadmins: true`).
   - Only sub-admins possessing this power are authorized to create or manage other sub-admin accounts.
2. **Grantable / Delegatable Powers Ceiling (`grantable_powers` / `allowed_delegation_powers`)**:
   - When Super Admin enables Sub-Admin Administration power for a sub-admin, Super Admin defines the exact set of powers (`grantable_powers`) that this sub-admin can delegate to child sub-admins.
   - When a creator sub-admin attempts to create a child sub-admin, the backend enforces that assigned powers **MUST NOT** exceed the creator's grantable ceiling.
3. **Creator Information (`created_by_info`)**:
   - Every sub-admin account tracks who created it (`creator_id`, `created_by`, `created_role`).
   - The created sub-admin can view this metadata in list and detail responses so it knows its creator.
4. **Creator-Only Account Deletion**:
   - A sub-admin account can **ONLY** be deleted by:
     1. **Super Admin**, OR
     2. **The direct creator Sub-Admin** who created that sub-admin account.
   - Any attempt by an unrelated sub-admin to delete an account will be rejected with HTTP `403 Forbidden`.

---

## 2. API Endpoints Reference

Base Paths:
- `/api/v1/admin/subadmins`
- `/api/admin/sub-admins` *(Alias)*

---

### 2.1 Create Sub-Admin Account

**Endpoint**: `POST /api/v1/admin/subadmins` or `POST /api/admin/sub-admins`  
**Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`

#### Request Payload
```json
{
  "name": "Ajay Kumar",
  "email": "ajay.subadmin@digilocal.com",
  "password": "SecurePassword123!",
  "powers": ["VENDORS", "SOCIETIES", "SUB_ADMINS"],
  "grantable_powers": ["VENDORS", "SOCIETIES"],
  "can_manage_subadmins": true
}
```

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | String | **Yes** | Full name of the sub-admin. |
| `email` | String | **Yes** | Unique email address. |
| `password` | String | **Yes** | Account password. |
| `powers` | Array[String] | No | Operational powers assigned to this sub-admin. |
| `grantable_powers` / `allowed_delegation_powers` | Array[String] | No | Set of powers this sub-admin is permitted to delegate to child sub-admins it creates. |
| `can_manage_subadmins` | Boolean | No | Alias to automatically grant `"SUB_ADMINS"` power. |

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Sub-admin account created successfully",
  "data": {
    "id": "sub-ajaykumar-4821",
    "name": "Ajay Kumar",
    "email": "ajay.subadmin@digilocal.com",
    "role": "sub_admin",
    "powers": [
      "SUB_ADMINS",
      "VENDORS",
      "SOCIETIES"
    ],
    "allowed_delegation_powers": [
      "VENDORS",
      "SOCIETIES"
    ],
    "grantable_powers": [
      "VENDORS",
      "SOCIETIES"
    ],
    "can_manage_subadmins": true,
    "status": "active",
    "created_at": "2026-09-03T09:31:38.510Z",
    "created_by": "Super Admin",
    "creator_id": "super-admin",
    "created_role": "super_admin",
    "created_by_info": {
      "creator_id": "super-admin",
      "created_by": "Super Admin",
      "created_role": "super_admin"
    }
  }
}
```

---

### 2.2 List All Sub-Admin Accounts

**Endpoint**: `GET /api/v1/admin/subadmins` or `GET /api/admin/sub-admins`  
**Headers**: `Authorization: Bearer <token>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Sub-admin list retrieved",
  "data": [
    {
      "id": "sub-ajaykumar-4821",
      "name": "Ajay Kumar",
      "email": "ajay.subadmin@digilocal.com",
      "role": "sub_admin",
      "powers": ["SUB_ADMINS", "VENDORS"],
      "allowed_delegation_powers": ["VENDORS"],
      "grantable_powers": ["VENDORS"],
      "can_manage_subadmins": true,
      "status": "active",
      "created_at": "2026-09-03T09:31:38.510Z",
      "created_by": "Super Admin",
      "creator_id": "super-admin",
      "created_role": "super_admin",
      "created_by_info": {
        "creator_id": "super-admin",
        "created_by": "Super Admin",
        "created_role": "super_admin"
      }
    },
    {
      "id": "sub-rahulsharma-9210",
      "name": "Rahul Sharma",
      "email": "rahul.vendorops@digilocal.com",
      "role": "sub_admin",
      "powers": ["VENDORS"],
      "allowed_delegation_powers": [],
      "grantable_powers": [],
      "can_manage_subadmins": false,
      "status": "active",
      "created_at": "2026-09-03T09:35:10.120Z",
      "created_by": "Ajay Kumar",
      "creator_id": "sub-ajaykumar-4821",
      "created_role": "sub_admin",
      "created_by_info": {
        "creator_id": "sub-ajaykumar-4821",
        "created_by": "Ajay Kumar",
        "created_role": "sub_admin"
      }
    }
  ]
}
```

---

### 2.3 Fetch Single Sub-Admin Details

**Endpoint**: `GET /api/v1/admin/subadmins/:id` or `GET /api/admin/sub-admins/:id`  
**Headers**: `Authorization: Bearer <token>`

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Sub-admin details retrieved",
  "data": {
    "id": "sub-rahulsharma-9210",
    "name": "Rahul Sharma",
    "email": "rahul.vendorops@digilocal.com",
    "role": "sub_admin",
    "powers": ["VENDORS"],
    "allowed_delegation_powers": [],
    "grantable_powers": [],
    "can_manage_subadmins": false,
    "status": "active",
    "created_at": "2026-09-03T09:35:10.120Z",
    "created_by": "Ajay Kumar",
    "creator_id": "sub-ajaykumar-4821",
    "created_role": "sub_admin",
    "created_by_info": {
      "creator_id": "sub-ajaykumar-4821",
      "created_by": "Ajay Kumar",
      "created_role": "sub_admin"
    }
  }
}
```

---

### 2.4 Delete Sub-Admin Account (Strict Security Enforcement)

**Endpoint**: `DELETE /api/v1/admin/subadmins/:id` or `DELETE /api/admin/sub-admins/:id`  
**Headers**: `Authorization: Bearer <token>`

#### Authorization Rules:
- ✅ **Super Admin** ➡️ Permitted to delete any sub-admin.
- ✅ **Direct Creator Sub-Admin** (`creator_id === req.user.id`) ➡️ Permitted to delete sub-admins it created.
- ❌ **Non-Creator Sub-Admin** ➡️ **REJECTED (`403 Forbidden`)**.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Sub-admin account revoked successfully",
  "revoked_id": "sub-rahulsharma-9210"
}
```

#### Rejection Response — Non-Creator (`403 Forbidden`)
```json
{
  "success": false,
  "error": "FORBIDDEN_REVOCATION",
  "message": "Revocation Restricted: Only Super Admin or the direct creator Sub-Admin of this account can delete it."
}
```

---

### 2.5 Error Codes Table

| Error Code | HTTP Status | Trigger Condition |
| :--- | :--- | :--- |
| `FORBIDDEN_SUBADMIN_ADMINISTRATION` | `403` | Sub-admin without `"SUB_ADMINS"` power tries to create a sub-admin. |
| `FORBIDDEN_DELEGATION_CEILING` | `403` | Granted powers exceed creator's `grantable_powers` ceiling. |
| `FORBIDDEN_REVOCATION` | `403` | Non-creator sub-admin attempts to delete an account. |
| `BAD_REQUEST_SELF_REVOCATION` | `400` | Sub-admin attempts to delete its own account. |
| `DUPLICATE_EMAIL` | `400` | Email address is already registered. |

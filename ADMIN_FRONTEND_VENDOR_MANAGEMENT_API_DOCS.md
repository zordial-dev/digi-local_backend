# Admin Panel API Documentation: Vendor Management & Hold Workflow

This document provides the complete API reference for **Admin Panel Frontend Developers** to manage vendor onboarding applications, approve/reject vendors, view the On-Hold queue, and trigger SMTP email hold notices.

---

## 📌 Standardized Clean Vendor Object Schema

All vendor listing and detail APIs return the standardized vendor object below. All duplicate fields (`store_name`, `owner_name`, `phone`, `whatsapp_number`, `gst_number`, `address`, `location`, `full_address`, `society_id`, `society_name`, `logo`, `avatar_url`) have been removed in favor of single clean keys:

```json
{
  "vendor_id": 1185,
  "id": 1185,
  "vendor_name": "Rajesh Sharma",
  "shop_name": "Sharma Electronics",
  "email": "sharma@digilocal.com",
  "phone_number": "9574775706",
  "gstin": "07AAAAA0000A1Z5",
  "category": "Electronics & Accessories",
  "vendor_type": "product",
  "shop_number": "Suite 808",
  "area": "Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
  "description": "Electronics and daily essentials sourced for DigiLocal residents.",
  "status": "PENDING",
  "hold_reason": "",
  "hold_email_subject": "",
  "has_resubmitted": false,
  "resubmitted_at": null,
  "resubmitted_at_readable": null,
  "created_at": "2026-08-31T16:42:56+05:30",
  "created_at_readable": "31 Aug 2026, 04:42 pm IST",
  "created_at_time": "04:42 pm"
}
```

---

## 1. List Pending Vendor Applications

### **Endpoint:** `GET /api/vendors/pending`

**Purpose:**  
Fetch all newly registered vendors whose application is waiting for Admin review (`status = 'PENDING'`).

### **Headers:**
```http
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "Pending vendor onboarding requests retrieved.",
  "data": [
    {
      "vendor_id": 1185,
      "id": 1185,
      "vendor_name": "Rajesh Sharma",
      "shop_name": "Sharma Electronics",
      "email": "sharma@digilocal.com",
      "phone_number": "9574775706",
      "gstin": "07AAAAA0000A1Z5",
      "category": "Electronics & Accessories",
      "vendor_type": "product",
      "shop_number": "Suite 808",
      "area": "Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301",
      "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
      "description": "Electronics daily essentials.",
      "status": "PENDING",
      "created_at_readable": "31 Aug 2026, 04:42 pm IST",
      "created_at_time": "04:42 pm"
    }
  ]
}
```

---

## 2. List On-Hold Vendors Queue

### **Endpoint:** `GET /api/vendors/on-hold`

**Purpose:**  
Fetch all vendors currently on Hold (`status = 'HOLD'`). Vendors who updated their settings and clicked "Resubmit Request" have `has_resubmitted = true` and are automatically sorted to the top.

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "On-hold vendor onboarding requests retrieved.",
  "data": [
    {
      "vendor_id": 1185,
      "id": 1185,
      "vendor_name": "Rajesh Sharma (Updated)",
      "shop_name": "Sharma Electronics",
      "phone_number": "9574775706",
      "gstin": "07AAAAA0000A1Z5",
      "area": "Sector 62",
      "city": "Noida",
      "status": "HOLD",
      "hold_email_subject": "Action Required: Clearer GST Certificate",
      "hold_reason": "Please upload a clearer GST certificate image.",
      "has_resubmitted": true,
      "resubmitted_at_readable": "31 Aug 2026, 04:45 pm IST"
    }
  ]
}
```

### 🎨 **Frontend UI Badge Rules for On-Hold Screen:**
- `has_resubmitted === true`: Render **🟢 "Resubmitted & Updated"** badge with `resubmitted_at_readable` timestamp.
- `has_resubmitted === false`: Render **🟡 "Awaiting Vendor Changes"** badge.

---

## 3. Place Vendor On Hold & Send SMTP Email Notice

### **Endpoint:** `POST /api/vendors/:vendorId/hold`

**Purpose:**  
Admin puts a vendor application on Hold, inputs the email subject & content, and sends an automated SMTP email to the vendor's email address.

### **Request Body:**
```json
{
  "subject": "Action Required: Clearer GST Certificate Needed",
  "email_content": "Dear Merchant, please log in to your vendor portal settings, upload a clearer GST certificate image, and click Resubmit Request."
}
```

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "Vendor application placed on hold and email notice sent successfully.",
  "vendor_id": 1185,
  "status": "HOLD",
  "email_sent": true
}
```

---

## 3.1 Get Vendor Reapplication Field Diffs (Old vs New Data)

### **Endpoint:** `GET /api/admin/vendors/:id/reapplication-changes`
*(Or: `GET /api/admin/vendors/:id/changes` / `GET /api/admin/requests/:id/reapplication-changes`)*

**Purpose:**  
When a vendor resubmits their application after being placed on **HOLD** or **REJECTED**, this endpoint returns **only the fields that were modified** by the vendor (comparing `old_value` and `new_value`). Unchanged fields are excluded.

### **Response Example (`200 OK`):**
```json
{
  "code": 200,
  "status": "success",
  "message": "Retrieved 2 field change(s) for vendor reapplication.",
  "vendor_id": 1185,
  "store_name": "Sharma Super Electronics",
  "status": "PENDING",
  "has_resubmitted": true,
  "resubmitted_at": "2026-09-03T12:30:00.000Z",
  "hold_reason": "Please update your GSTIN and PAN card details.",
  "total_changed_fields": 2,
  "changed_fields": {
    "gstin": {
      "field_name": "gstin",
      "field_label": "GSTIN Number",
      "old_value": "07AAAAA0000A1Z5",
      "new_value": "07BBBCC1111D1Z2",
      "changed_at": "2026-09-03T12:30:00.000Z"
    },
    "pan_number": {
      "field_name": "pan_number",
      "field_label": "PAN Card Number",
      "old_value": "AAAAA0000A",
      "new_value": "BBBCC1111D",
      "changed_at": "2026-09-03T12:30:00.000Z"
    }
  },
  "changes_list": [
    {
      "change_id": 2,
      "field_name": "gstin",
      "field_label": "GSTIN Number",
      "old_value": "07AAAAA0000A1Z5",
      "new_value": "07BBBCC1111D1Z2",
      "changed_at": "2026-09-03T12:30:00.000Z"
    },
    {
      "change_id": 1,
      "field_name": "pan_number",
      "field_label": "PAN Card Number",
      "old_value": "AAAAA0000A",
      "new_value": "BBBCC1111D",
      "changed_at": "2026-09-03T12:30:00.000Z"
    }
  ]
}
```

*See [`ADMIN_VENDOR_REAPPLICATION_DIFF_API_DOCS.md`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/ADMIN_VENDOR_REAPPLICATION_DIFF_API_DOCS.md) for full developer details and React UI component code.*

---

## 4. Approve Vendor Application

### **Endpoint:** `POST /api/vendors/:vendorId/approve`
*(Or: `PATCH /api/vendors/:vendorId/status` with `{ "status": "ACTIVE" }`)*

**Purpose:**  
Admin approves a vendor (from Pending or Hold status). The vendor's status changes to `ACTIVE`, granting them full access to the vendor portal.

### **Request Body:**
```json
{
  "status": "ACTIVE"
}
```

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "Vendor application approved successfully.",
  "vendor_id": 1185,
  "status": "ACTIVE"
}
```

---

## 5. Reject Vendor Application

### **Endpoint:** `POST /api/vendors/:vendorId/reject`
*(Or: `PATCH /api/vendors/:vendorId/status` with `{ "status": "REJECTED" }`)*

**Purpose:**  
Admin rejects a vendor application during initial onboarding review. The vendor's status changes to `REJECTED`.

### **Request Body:**
```json
{
  "status": "REJECTED",
  "reason": "Invalid business details"
}
```

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "Vendor application rejected.",
  "vendor_id": 1185,
  "status": "rejected"
}
```

---

## 6. Block Vendor Account

### **Endpoint:** `POST /api/vendors/:vendorId/block`
*(Or: `POST /api/admin/vendors/:vendorId/block`)*

**Purpose:**  
Admin blocks an active/registered vendor merchant due to policy violations. The vendor's status in database is updated to `BLOCKED`. The vendor is immediately hidden from customer storefront search and blocked from logging into the vendor portal.

### **Request Body:**
```json
{
  "reason": "Fraudulent listing / policy violation"
}
```

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "Merchant account blocked successfully by admin.",
  "data": {
    "vendor_id": 1185,
    "status": "blocked",
    "is_blocked": true,
    "reason": "Fraudulent listing / policy violation"
  }
}
```

---

## 7. Block Resident User Account

### **Endpoint:** `POST /api/admin/users/:userId/block`
*(Or: `POST /api/people/:userId/block`)*

**Purpose:**  
Admin bans/blocks a resident user account. The user's status in database is updated to `BLOCKED`. When the user attempts to log in, the API responds with `403 Forbidden` (`code: "USER_BLOCKED"`).

### **Request Body:**
```json
{
  "reason": "Repeated policy violations"
}
```

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "message": "User account status updated to BLOCKED.",
  "data": {
    "user_id": "usr_102938",
    "status": "blocked",
    "is_blocked": true,
    "reason": "Repeated policy violations"
  }
}
```

---

## 8. Get Vendor Detailed Profile

### **Endpoint:** `GET /api/vendors/:vendorId`

**Purpose:**  
Fetch complete single-field profile details for a specific vendor.

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "vendor_id": 1185,
    "id": 1185,
    "vendor_name": "Rajesh Sharma",
    "shop_name": "Sharma Electronics",
    "email": "sharma@digilocal.com",
    "phone_number": "9574775706",
    "gstin": "07AAAAA0000A1Z5",
    "category": "Electronics & Accessories",
    "vendor_type": "product",
    "shop_number": "Suite 808",
    "area": "Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "description": "Electronics daily essentials.",
    "status": "PENDING",
    "created_at_readable": "31 Aug 2026, 04:42 pm IST"
  }
}
```

---

## 📋 Summary Checklist for Admin Frontend Dev:

1. **Use Single Standard Keys**: Use `shop_name`, `vendor_name`, `phone_number`, `gstin`, `area`, `shop_image`, `vendor_type`, `category`.
2. **Timestamps**: Display `created_at_readable` (e.g. `"31 Aug 2026, 04:42 pm IST"`) and `created_at_time` (e.g. `"04:42 pm"`).
3. **On-Hold Workflow**: Modal on Hold button should prompt for `subject` and `email_content`, then post to `POST /api/vendors/:vendorId/hold`.

# DigiLocal API Docs — Admin Panel (Hold Vendor & On-Hold Queue Management)

This document provides complete instructions for Frontend Developers building the **DigiLocal Admin Panel**. It covers putting vendor applications on **Hold** with SMTP email notices, displaying the **On-Hold Vendors list**, and taking actions (Approve, Reject, or Re-Hold) on resubmitted vendors.

---

## 1. Put Vendor on Hold (With SMTP Email Notice)

When an Admin wants to put a vendor application on hold and request changes via email.

### Endpoint
- **POST** `/api/vendors/:vendorId/hold`
- **POST** `/api/admin/requests/:vendorId/hold`

### Request Headers
```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
Content-Type: application/json
```

### Request Body Parameters

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `subject` | `string` | **Yes** | Custom email subject line sent to the vendor via SMTP. |
| `email_content` | `string` | **Yes** | Detailed reason/instructions explaining what the vendor must update in their settings. |

### Example Request Body
```json
{
  "subject": "Document Correction Required for DigiLocal Registration",
  "email_content": "Please upload a clearer GST Certificate and update your shop address details in settings."
}
```

### Example 200 Success Response
```json
{
  "code": 200,
  "status": "success",
  "message": "Merchant onboarding application placed on hold. Notification email sent to vendor.",
  "data": {
    "vendor_id": 1164,
    "status": "on_hold",
    "hold_email_subject": "Document Correction Required for DigiLocal Registration",
    "hold_reason": "Please upload a clearer GST Certificate and update your shop address details in settings.",
    "has_resubmitted": false
  }
}
```

---

## 2. Fetch On-Hold Vendors List

Fetches all vendors currently on hold. Vendors who have updated their details and clicked **"Resubmit Request"** will have `has_resubmitted: true` and are automatically sorted to the top.

### Endpoint
- **GET** `/api/vendors/on-hold`
- **GET** `/api/admin/requests/on-hold`

### Request Headers
```http
Authorization: Bearer <ADMIN_ACCESS_TOKEN>
```

### Response Fields Explanation

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `vendor_id` | `number` | Unique vendor ID. |
| `store_name` | `string` | Name of the shop. |
| `owner_name` | `string` | Owner/vendor name. |
| `email` | `string` | Vendor email address. |
| `phone` | `string` | Vendor phone number. |
| `gstin` | `string` | GSTIN or PAN number. |
| `society_name` | `string` | Society/Area name. |
| `status` | `string` | Always `"on_hold"`. |
| `hold_email_subject` | `string` | Subject line of email sent when placed on hold. |
| `hold_reason` | `string` | Custom message/reason sent when placed on hold. |
| `has_resubmitted` | `boolean` | `true` if vendor has edited settings and resubmitted. Render a **"Resubmitted"** badge in UI! |
| `resubmitted_at` | `string \| null` | ISO timestamp of when vendor clicked Resubmit Request. |

### Example 200 Success Response
```json
{
  "code": 200,
  "status": "success",
  "message": "On-hold vendor onboarding requests retrieved.",
  "data": [
    {
      "id": 1164,
      "vendor_id": 1164,
      "store_name": "Sharma Super Grocery (Updated)",
      "owner_name": "Rajesh Sharma",
      "email": "vendor@example.com",
      "phone": "9988776655",
      "gstin": "07AAAAA0000A1Z5",
      "society_name": "Sector 62",
      "status": "on_hold",
      "hold_email_subject": "Document Correction Required",
      "hold_reason": "Please upload a clearer GST Certificate.",
      "has_resubmitted": true,
      "resubmitted_at": "2026-08-31T09:30:56.746Z",
      "created_at": "2026-08-31T08:00:00.000Z"
    }
  ]
}
```

---

## 3. Admin Actions from Hold Section

From the **Hold Section** in Admin Panel, Admin can perform 3 actions on any on-hold vendor:

### Action A: Approve Application
- **POST** `/api/vendors/:vendorId/approve`
- Moves status from `on_hold` to `active` (`ACTIVE`), activates payment & subscription, auto-links area in `locations` table.

### Action B: Reject Application
- **POST** `/api/vendors/:vendorId/reject`
- Body: `{ "reason": "Did not fulfill criteria after hold period." }`
- Moves status from `on_hold` to `rejected` (`REJECTED`). Record retained in DB.

### Action C: Re-Hold Application
- **POST** `/api/vendors/:vendorId/hold`
- Body: `{ "subject": "Second Revision Required", "email_content": "GSTIN matches another business, please fix." }`
- Resets `has_resubmitted = false`, updates `hold_reason`, and fires a new SMTP email.

---

## 4. UI Design Checklist for Admin Panel Devs

- [ ] **Pending Requests Tab**: Shows new registrations (`status === 'pending'`).
- [ ] **On-Hold Vendors Tab**: Displays all vendors on hold (`GET /api/vendors/on-hold`).
- [ ] **Resubmitted Badge**: Display a prominent **"NEW UPDATES RESUBMITTED"** green/blue badge on cards where `has_resubmitted === true`.
- [ ] **Action Modal**: "Put on Hold" button opens a modal with inputs for `Subject` and `Email Message (Content)`. Clicking "Send Email & Put on Hold" fires the API.

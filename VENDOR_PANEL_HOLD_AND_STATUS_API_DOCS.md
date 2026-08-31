# DigiLocal API Docs — Vendor Panel Web & App (Vendor Status & Hold Resubmit Workflow)

This document provides complete instructions for Frontend Developers building the **Vendor Web Portal** and **Vendor Mobile App**. It covers checking vendor onboarding status, displaying the exact UI banners/text per status, and handling the **Resubmit Request** workflow when an application is placed on **Hold**.

---

## 1. Vendor Status Check API

Vendors can check their current shop request status using their **Vendor Auth Bearer Token** or by providing their **Vendor ID**.

### Endpoint
- **GET** `/api/vendors/status`
- **GET** `/api/vendors/:vendorId/status`

### Request Headers
```http
Authorization: Bearer <VENDOR_ACCESS_TOKEN>
Content-Type: application/json
```

---

### Response Structure & Fields Explanation

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `status` | `string` | The current status code: `"pending"`, `"accepted"`, `"rejected"`, or `"on_hold"`. |
| `is_accepted` | `boolean` | `true` if vendor is approved and active. |
| `is_pending` | `boolean` | `true` if initial registration is awaiting admin review. |
| `is_rejected` | `boolean` | `true` if admin rejected the application. |
| `is_on_hold` | `boolean` | `true` if admin placed the application on hold. |
| `has_resubmitted` | `boolean` | `true` if the vendor has already updated details and clicked **Resubmit Request**. |
| `resubmitted_at` | `string \| null` | ISO timestamp of vendor resubmission. |
| `hold_email_subject` | `string` | Email subject sent by admin when putting vendor on hold. |
| `hold_reason` | `string` | Custom message/reason written by admin explaining required changes. |
| `message` | `string` | High-level system status message. |
| `recommended_ui_text` | `string` | Ready-to-display user-friendly message for UI banners. |

---

## 2. Frontend UI Matrix — What Screen/Text to Display per Status

| Status | `is_on_hold` | `has_resubmitted` | Portal Access | Recommended Banner Color | UI Screen Title | Recommended UI Message / Banner Text | UI Actions Allowed |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`pending`** | `false` | `false` | Blocked / Pending Splash Screen | 🟡 Yellow / Amber | **Application Under Review** | *"Your registration request is under review by admin. Verification will be completed soon."* | None. Show progress spinner and support link. |
| **`on_hold`** | `true` | `false` | Settings Only / Hold Banner | 🟠 Orange / Amber | **Action Required: Application On Hold** | *"Your application is on hold. Please update your details as requested in the reason below and click Resubmit Request."* | Vendor can edit store settings and click **"Resubmit Request"** button. |
| **`on_hold`** | `true` | `true` | Settings Only / Hold Banner | 🔵 Blue / Info | **Resubmitted — Under Review** | *"Your resubmitted application is currently under review by admin in the Hold section."* | Show "Updates Resubmitted" badge. Disable duplicate resubmit clicks. |
| **`accepted`** | `false` | N/A | Full Access | 🟢 Green | **Store Active** | *"Congratulations! Your shop application is approved and active."* | Full Vendor Dashboard (Products, Orders, Earnings, Profile). |
| **`rejected`** | `false` | N/A | Blocked / Access Denied | 🔴 Red | **Application Rejected** | *"Your application was rejected by admin. Please contact support if you believe this is an error."* | Portal access blocked. Show support phone/email. |

---

## 3. Resubmit Request API (Vendor Settings Page)

When a vendor is **On Hold** (`status === "on_hold"` and `has_resubmitted === false`), they can update their shop settings (store name, GSTIN, area, city, shop photo, etc.) and click **Resubmit Request**.

### Endpoint
- **POST** `/api/vendors/resubmit`
- **PUT** `/api/vendorPanel/resubmit`

### Request Headers
```http
Authorization: Bearer <VENDOR_ACCESS_TOKEN>
Content-Type: application/json
```

### Example Request Body
```json
{
  "store_name": "Sharma Super Grocery",
  "vendor_name": "Rajesh Sharma",
  "gstin": "07AAAAA0000A1Z5",
  "area": "Sector 62",
  "city": "Noida",
  "pincode": "201301",
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"
}
```

### Example 200 Success Response
```json
{
  "vendor_id": 1164,
  "status": "on_hold",
  "has_resubmitted": true,
  "resubmitted_at": "2026-08-31T09:30:56.746Z",
  "message": "Your application update has been resubmitted successfully. It is under review in the Hold section by the Admin team."
}
```

> [!IMPORTANT]
> **Queue Behavior**: Clicking **Resubmit Request** does **NOT** reset the status back to `pending`. The request stays in the **Hold section (`on_hold`)** with `has_resubmitted: true` so the Admin can immediately review the resubmitted on-hold request.

---

## 4. Frontend Code Integration Snippet (React / React Native Example)

```jsx
import React, { useEffect, useState } from 'react';

export function VendorStatusCard({ token }) {
  const [vendorStatus, setVendorStatus] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/vendors/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setVendorStatus(data));
  }, [token]);

  if (!vendorStatus) return <p>Loading status...</p>;

  const { status, is_on_hold, has_resubmitted, hold_reason, recommended_ui_text } = vendorStatus;

  if (status === 'accepted') {
    return <div className="banner green">🎉 {recommended_ui_text}</div>;
  }

  if (status === 'rejected') {
    return <div className="banner red">🚫 {recommended_ui_text}</div>;
  }

  if (is_on_hold) {
    return (
      <div className="banner orange">
        <h3>⚠️ Action Required: Application On Hold</h3>
        <p><strong>Admin Reason:</strong> {hold_reason}</p>
        <p>{recommended_ui_text}</p>
        {!has_resubmitted && (
          <button onClick={() => window.location.href = '/settings'}>
            Go to Settings & Resubmit Request
          </button>
        )}
        {has_resubmitted && (
          <span className="badge blue">✔ Updates Resubmitted — Awaiting Admin Review</span>
        )}
      </div>
    );
  }

  // Pending status
  return <div className="banner yellow">⏳ {recommended_ui_text}</div>;
}
```

---

## 5. Area Autocomplete & Suggestions API

When vendor types their shop area/location during registration or settings update, call this API to get instant suggestions from the `locations` database table.

### Endpoint
- **GET** `/api/locations/suggestions?q=<SEARCH_TERM>`
- **GET** `/api/locations?q=<SEARCH_TERM>`

### Query Parameters
- `q` or `search` or `area`: The input string entered by the vendor (e.g. `"Sec"` or `"Sitapura"`).

### Example Response
```json
{
  "success": true,
  "total": 3,
  "query": "sec",
  "suggestions": [
    "Sector 62",
    "Sector 63",
    "Sector 18"
  ],
  "data": [
    {
      "location_id": 1,
      "area": "Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    }
  ]
}
```


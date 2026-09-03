# Admin Vendor Reapplication Field Diff API Documentation

This API endpoint allows Admin Panel developers to fetch **only the specific fields modified by a vendor** during their application resubmission / reapplication (after being placed on **HOLD** or **REJECTED**). Unchanged fields are omitted so the Admin UI can highlight exact side-by-side changes (`old_value` vs `new_value`).

---

## 1. Get Vendor Reapplication Changes API Specification

- **Primary Route**: `GET /api/admin/vendors/:id/reapplication-changes`
- **Supported Aliases**:
  - `GET /api/admin/vendors/:id/changes`
  - `GET /api/admin/requests/:id/reapplication-changes`
- **Authentication**: Bearer Token (`Authorization: Bearer <ADMIN_JWT_TOKEN>`)
- **HTTP Method**: `GET`

### Path Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | Integer / String | **Yes** | Vendor ID or Public ID |

---

## 2. Response Specifications

### A. Success Response (`HTTP 200 OK`) — When Vendor Has Modified Fields
```json
{
  "code": 200,
  "status": "success",
  "message": "Retrieved 3 field change(s) for vendor reapplication.",
  "vendor_id": 1243,
  "store_name": "Updated Super Store Name",
  "vendor_name": "Ramesh Kumar",
  "email": "ramesh.superstore@gmail.com",
  "phone_number": "9876543210",
  "status": "PENDING",
  "has_resubmitted": true,
  "resubmitted_at": "2026-09-03T12:30:00.000Z",
  "hold_reason": "Please update your GSTIN, PAN number, and shop photo.",
  "total_changed_fields": 3,
  "changed_fields": {
    "gstin": {
      "field_name": "gstin",
      "field_label": "GSTIN Number",
      "old_value": "08OLDGSTIN1234F",
      "new_value": "08NEWGSTIN5678F",
      "changed_at": "2026-09-03T12:30:00.000Z",
      "batch_id": "2026-09-03T12:30:00.000Z"
    },
    "pan_number": {
      "field_name": "pan_number",
      "field_label": "PAN Card Number",
      "old_value": "OLDPAN1234",
      "new_value": "NEWPAN5678",
      "changed_at": "2026-09-03T12:30:00.000Z",
      "batch_id": "2026-09-03T12:30:00.000Z"
    },
    "store_name": {
      "field_name": "store_name",
      "field_label": "Store / Shop Name",
      "old_value": "Initial Store Name",
      "new_value": "Updated Super Store Name",
      "changed_at": "2026-09-03T12:30:00.000Z",
      "batch_id": "2026-09-03T12:30:00.000Z"
    }
  },
  "changes_list": [
    {
      "change_id": 3,
      "field_name": "store_name",
      "field_label": "Store / Shop Name",
      "old_value": "Initial Store Name",
      "new_value": "Updated Super Store Name",
      "changed_at": "2026-09-03T12:30:00.000Z",
      "batch_id": "2026-09-03T12:30:00.000Z"
    },
    {
      "change_id": 2,
      "field_name": "pan_number",
      "field_label": "PAN Card Number",
      "old_value": "OLDPAN1234",
      "new_value": "NEWPAN5678",
      "changed_at": "2026-09-03T12:30:00.000Z",
      "batch_id": "2026-09-03T12:30:00.000Z"
    },
    {
      "change_id": 1,
      "field_name": "gstin",
      "field_label": "GSTIN Number",
      "old_value": "08OLDGSTIN1234F",
      "new_value": "08NEWGSTIN5678F",
      "changed_at": "2026-09-03T12:30:00.000Z",
      "batch_id": "2026-09-03T12:30:00.000Z"
    }
  ]
}
```

---

### B. Success Response (`HTTP 200 OK`) — When No Fields Were Changed
```json
{
  "code": 200,
  "status": "success",
  "message": "No field changes recorded for this vendor reapplication.",
  "vendor_id": 1243,
  "store_name": "FreshMart Grocery",
  "vendor_name": "Ramesh Kumar",
  "status": "PENDING",
  "has_resubmitted": false,
  "resubmitted_at": null,
  "hold_reason": "",
  "total_changed_fields": 0,
  "changed_fields": {},
  "changes_list": []
}
```

---

### C. Error Response (`HTTP 404 Not Found`) — Invalid Vendor ID
```json
{
  "code": 404,
  "status": "error",
  "message": "Vendor ID \"999999\" not found.",
  "error_code": "RESOURCE_NOT_FOUND"
}
```

---

## 3. Supported Tracked Fields
The diff tracker automatically monitors and compares the following fields when a vendor updates or resubmits their application:

| Field Name | Human Label (`field_label`) | Description |
| :--- | :--- | :--- |
| `gstin` | GSTIN Number | 15-character GST Registration Number |
| `pan_number` | PAN Card Number | 10-character Income Tax PAN Number |
| `store_name` | Store / Shop Name | Registered merchant store name |
| `vendor_name` | Owner / Vendor Name | Full name of merchant owner |
| `email` | Email Address | Vendor contact email address |
| `phone_number` | Mobile / Phone Number | Primary 10-digit phone number |
| `shop_number` | Shop Number / Unit | Shop unit, suite, or flat number |
| `address` | Full Shop Address | Detailed street address |
| `area` | Area / Locality / Society | Neighborhood area or society |
| `city` | City | City location |
| `state` | State | State location |
| `pincode` | Pincode | Postal pin code |
| `shop_image` | Shop Photo / Logo | Cover image / logo URL |
| `category` | Store Category | Business category (Grocery, Services, etc.) |
| `bank_name` | Bank Name | Bank name for payouts |
| `account_number` | Bank Account Number | Bank account number |
| `ifsc_code` | Bank IFSC Code | Bank IFSC code |
| `account_holder_name` | Account Holder Name | Name on bank account |
| `upi_id` | UPI ID | UPI ID for direct customer payments |
| `qr_code_url` | UPI QR Code Image | QR code image URL |
| `whatsapp_number` | WhatsApp Number | WhatsApp contact number |

---

## 4. Frontend Integration Example (React / Next.js)

Below is an example React component for Admin Panel frontend developers to render the **Resubmission Field Changes Comparison Card**:

```tsx
import React, { useEffect, useState } from 'react';

interface ChangeItem {
  change_id: number;
  field_name: string;
  field_label: string;
  old_value: string;
  new_value: string;
  changed_at: string;
}

interface ReapplicationDiffData {
  vendor_id: number;
  store_name: string;
  hold_reason: string;
  total_changed_fields: number;
  changes_list: ChangeItem[];
}

export const VendorReapplicationDiffCard: React.FC<{ vendorId: number }> = ({ vendorId }) => {
  const [diffData, setDiffData] = useState<ReapplicationDiffData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiffs() {
      try {
        const response = await fetch(`http://localhost:5001/api/admin/vendors/${vendorId}/reapplication-changes`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        });
        const json = await response.json();
        if (json.code === 200) {
          setDiffData(json);
        }
      } catch (err) {
        console.error('Failed to load vendor reapplication diffs', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDiffs();
  }, [vendorId]);

  if (loading) return <div>Loading reapplication changes...</div>;
  if (!diffData || diffData.total_changed_fields === 0) {
    return <div className="alert alert-info">No updated fields reported for this vendor reapplication.</div>;
  }

  return (
    <div className="card shadow-sm border-warning mb-4">
      <div className="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
        <h5 className="mb-0">⚠️ Vendor Updated Details (Reapplication Diff)</h5>
        <span className="badge bg-dark">{diffData.total_changed_fields} Field(s) Changed</span>
      </div>
      <div className="card-body">
        {diffData.hold_reason && (
          <p className="text-muted"><strong>Original Hold Reason:</strong> {diffData.hold_reason}</p>
        )}
        <div className="table-responsive">
          <table className="table table-bordered table-striped">
            <thead className="table-light">
              <tr>
                <th>Field Name</th>
                <th>Previous Value (Before Hold)</th>
                <th>New Updated Value (Vendor Input)</th>
              </tr>
            </thead>
            <tbody>
              {diffData.changes_list.map((item) => (
                <tr key={item.field_name}>
                  <td><strong>{item.field_label}</strong></td>
                  <td className="table-danger text-decoration-line-through">
                    {item.old_value || <em className="text-muted">(empty)</em>}
                  </td>
                  <td className="table-success fw-bold text-success">
                    {item.new_value || <em className="text-muted">(empty)</em>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
```

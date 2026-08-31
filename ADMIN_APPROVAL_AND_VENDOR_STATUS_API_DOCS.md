# ⚡ Vendor Status Check API Documentation (Vendor Auth & App Friendly)

This API allows frontend web and mobile app developers to check the status of any vendor shop (**accepted**, **pending**, **rejected**) using **Vendor Token** or **Vendor ID**. Admin credentials are **NOT** required.

---

## 🔑 Access & Authentication Rules

- **No Admin Credentials Needed**: Frontend app developers can call this endpoint using either the **Vendor Authorization Token** or the **Vendor ID**.
- **Portal Access on Rejection**: If a vendor's application is **rejected**, they are blocked from entering the main vendor dashboard. However, calling this Status API returns `status: "rejected"` so the app can display the rejection status screen to the vendor.

---

## 📡 API Endpoint Details

- **HTTP Method**: `GET`
- **Endpoint Routes**:
  - `GET /api/vendors/status` *(using Vendor Bearer Token)*
  - `GET /api/vendors/:vendorId/status` *(using Vendor ID parameter)*
- **Authentication**: Vendor JWT Token (`Authorization: Bearer <VENDOR_JWT_TOKEN>`) OR Vendor ID in URL path
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Accept: application/json
  ```

---

## 📥 Expected Inputs

### Option A: Using Vendor Token (Recommended for Vendor Mobile App & Web)
Send the Vendor JWT Token received upon registration or login:
```http
GET /api/vendors/status
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

### Option B: Using Vendor ID (Public / Quick Check)
Pass the `vendorId` in the URL path:
```http
GET /api/vendors/105/status
```

---

## 📤 Expected Outputs (JSON Responses)

### 1. When Pending Admin Review (`status: "pending"`)
```json
{
  "vendor_id": 105,
  "status": "pending",
  "is_accepted": false,
  "is_pending": true,
  "is_rejected": false,
  "message": "Your request will be processed soon."
}
```
> 💡 **Frontend Action**: Show status banner *"Your request will be processed soon."* or yellow **PENDING** badge.

---

### 2. When Accepted & Approved (`status: "accepted"`)
```json
{
  "vendor_id": 105,
  "status": "accepted",
  "is_accepted": true,
  "is_pending": false,
  "is_rejected": false,
  "message": "Store is verified and active."
}
```
> 💡 **Frontend Action**: Grant access to full dashboard / show green **ACCEPTED / LIVE** badge.

---

### 3. When Application Rejected (`status: "rejected"`)
```json
{
  "vendor_id": 105,
  "status": "rejected",
  "is_accepted": false,
  "is_pending": false,
  "is_rejected": true,
  "message": "Merchant application was rejected by admin."
}
```
> 💡 **Frontend Action**: Block main dashboard access and display red rejection screen *"Merchant application was rejected by admin. Please contact support."*.

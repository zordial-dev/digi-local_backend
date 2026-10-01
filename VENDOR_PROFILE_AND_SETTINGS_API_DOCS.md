# DigiLocal Vendor Profile, Shop & Payment Update API Documentation
**Target Audience:** Frontend Engineers (Web & Mobile Apps — React, Next.js, React Native, Flutter, Swift, Kotlin)  
**Base URL:** `https://digilocal-backend.onrender.com` (Production) / `http://localhost:5000` (Local)  
**Authentication:** Bearer Token in `Authorization: Bearer <JWT_TOKEN>` header  

---

## 1. Root Cause Summary: Why GSTIN Was Not Updating

Prior to this fix, when a vendor attempted to update their profile or GSTIN, the backend threw a runtime error:
1. **Uncaught ReferenceError on `ifsc`**: In [vendorService.js](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/services/vendorService.js#L239), the code evaluated `ifsc_code || ifsc`. Because `ifsc` was not defined or destructured in the function scope, omitting `ifsc_code` from an update payload caused Node.js to throw `ReferenceError: ifsc is not defined`. This aborted the entire SQL `UPDATE` statement with a `500 Internal Server Error`, preventing `gstin` and all other fields from persisting.
2. **Missing PAN Auto-Extraction**: When a vendor provided their 15-character GSTIN (`07AAAAA0000A1Z5`), the 10-character PAN (`AAAAA0000A`, characters 3–12) was not automatically extracted or synced if `pan_number` was omitted.
3. **Undeclared `upi_id` & `qr_code_url` in Dedicated Payment Route**: In [vendorPanelController.js](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/controllers/Vendor/vendorPanelController.js#L715-L756), the `updatePaymentDetails` controller referenced undeclared variables `upi_id` and `qr_code_url`, causing runtime crashes when updating bank and UPI details.
4. **Missing `qr_code` Persistence in General Settings**: The general `updateStoreSettings` SQL query lacked the `qr_code` column.

### What Was Fixed:
- Destructured and sanitized all bank, tax, and payment parameters (`ifsc`, `ifscCode`, `pan`, `panNumber`, `qr_code`, `upi_id`).
- Implemented **Smart GSTIN/PAN Auto-Extraction**: Whenever a 15-character GSTIN is updated and PAN is omitted, the 10-digit PAN (characters 3 to 12) is automatically extracted and saved to both `gstin`, `gst_number`, and `pan_number`.
- Supported nested payload formats (e.g. `payment_details: { ... }`, `tax_details: { ... }`, `business_details: { ... }`) alongside flat root properties.
- Full `qr_code` support added across all update pipelines.

---

## 2. API Endpoints Overview

| Method | Endpoint | Content-Type | Purpose |
|---|---|---|---|
| `PUT` / `PATCH` / `POST` | `/api/vendorPanel/:vendorId/settings` | `application/json` OR `multipart/form-data` | **Primary:** Update entire profile, shop info, tax (GSTIN/PAN), hours, and bank details |
| `PUT` / `PATCH` / `POST` | `/api/vendorPanel/:vendorId/profile` | `application/json` OR `multipart/form-data` | Alias to `/settings` |
| `PUT` / `PATCH` / `POST` | `/api/vendors/:vendorId/settings` | `application/json` OR `multipart/form-data` | `/vendors` route alias |
| `PUT` | `/api/vendorPanel/:vendorId/payment-details` | `application/json` | Dedicated endpoint for Bank Account, IFSC, UPI ID, and QR Code |
| `PUT` | `/api/vendors/:vendorId/payment-details` | `application/json` | Dedicated payment details alias |
| `POST` / `PUT` | `/api/vendorPanel/:vendorId/logo` | `multipart/form-data` | Dedicated logo / shop image upload |
| `GET` | `/api/vendorPanel/:vendorId` | `N/A` | Fetch vendor dashboard with complete profile, shop, tax, and bank data |

---

## 3. Profile & Store Settings Update (`PUT /api/vendorPanel/:vendorId/settings`)

Use this endpoint on Web and Mobile Apps to update any combination of store info, owner info, tax numbers (GSTIN/PAN), store timings, and bank/payment details.

### URL:
`PUT /api/vendorPanel/:vendorId/settings`  
*(Also accepts `PATCH` or `POST`, and `/profile`)*

### Headers:
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
Content-Type: application/json
```
*(Or `multipart/form-data` when uploading a camera/gallery image file directly)*

---

### 3.1 Request Payload Attributes (JSON)

#### A. Tax & Identification Details
| Field | Type | Description | Example |
|---|---|---|---|
| `gstin` | `string` | 15-character GST Identification Number. Both `gstin` and `gst_number` are supported. Automatically converted to uppercase. | `"07AAAAA0000A1Z5"` |
| `gst_number` | `string` | Alias for `gstin`. | `"07AAAAA0000A1Z5"` |
| `pan_number` | `string` | 10-character PAN number. **Optional** if 15-character GSTIN is provided (backend auto-extracts characters 3–12). | `"AAAAA0000A"` |
| `pan` | `string` | Alias for `pan_number`. | `"AAAAA0000A"` |

#### B. Shop & Store Details
| Field | Type | Description | Example |
|---|---|---|---|
| `store_name` | `string` | Name of the shop displayed to customers on DigiLocal. Must be unique per society. | `"Fresh Veggies & Fruits"` |
| `category` | `string` | Shop category (e.g., Grocery, Dairy, Bakery, Electronics). | `"Grocery"` |
| `description` | `string` | Description or bio of the shop. | `"Daily fresh groceries delivered in 15 minutes."` |
| `shop_number` | `string` | Shop or Unit number inside society / commercial complex. | `"Shop 12-B"` |
| `address` | `string` | Full street or physical address. | `"Near Clubhouse, Express Greens"` |
| `area` | `string` | Society or Sector area name. | `"Express Greens, Sector 77"` |
| `city` | `string` | City. | `"Noida"` |
| `state` | `string` | State. | `"Uttar Pradesh"` |
| `pincode` | `string` | 6-digit postal code. | `"201301"` |
| `opening_time` | `string` | Opening time string (e.g. `08:00 AM`). | `"08:00 AM"` |
| `closing_time` | `string` | Closing time string (e.g. `10:00 PM`). | `"10:00 PM"` |
| `working_days` | `string` | Operating days. | `"Mon-Sun"` |
| `business_type` | `string` | Nature of business (e.g., Retail, Wholesale). | `"Retail"` |

#### C. Owner & Contact Information
| Field | Type | Description | Example |
|---|---|---|---|
| `vendor_name` | `string` | Owner or contact person's name. | `"Rajesh Sharma"` |
| `email` | `string` | Vendor's registered email address. | `"rajesh.sharma@gmail.com"` |
| `phone_number` | `string` | Primary contact mobile number (10 digits). | `"9876543210"` |
| `whatsapp_number` | `string` | WhatsApp business or communication number. | `"9876543210"` |

#### D. Bank & Settlement Details
| Field | Type | Description | Example |
|---|---|---|---|
| `bank_name` | `string` | Name of the bank. | `"HDFC Bank"` |
| `account_number` | `string` | Beneficiary bank account number. | `"50100234567890"` |
| `ifsc_code` | `string` | 11-character Indian Financial System Code (IFSC). Automatically converted to uppercase. | `"HDFC0001234"` |
| `account_holder_name` | `string` | Full name as per bank records. | `"Rajesh Sharma"` |
| `upi_id` | `string` | Virtual Payment Address (VPA) for instant UPI payouts. | `"rajesh@okhdfcbank"` |
| `qr_code` | `string` | URL or base64 data of vendor's UPI QR code. | `"https://cdn.digilocal.com/qr/1432.png"` |

#### E. Store Ordering & Commercial Policy
| Field | Type | Description | Example |
|---|---|---|---|
| `min_order_value` | `number` | Minimum cart subtotal required to place an order. | `150.00` |
| `max_quantity_limit` | `number` | Maximum quantity per product item per order. | `10` |
| `delivery_charge` | `number` | Delivery fee charged to customer. | `20.00` |
| `gst_percentage` | `number` | Store GST percentage applied to bill. | `5.00` |
| `service_charge_percentage` | `number` | Packaging or service charge percentage. | `0.00` |

---

### 3.2 Example 1: Updating GSTIN & Tax Details Only

If the vendor only changes their GST number from their mobile app or web profile:

```json
{
  "gstin": "07AAAAA0000A1Z5"
}
```

#### What Backend Does:
1. Updates `gstin = '07AAAAA0000A1Z5'`.
2. Updates `gst_number = '07AAAAA0000A1Z5'`.
3. Auto-extracts PAN `AAAAA0000A` (characters 3–12) and updates `pan_number = 'AAAAA0000A'`.
4. Keeps existing bank, address, and shop information unchanged.

#### Response (`200 OK`):
```json
{
  "message": "Store profile & settings updated successfully",
  "success": true,
  "logo": "https://digilocal-backend.onrender.com/uploads/logo.jpg",
  "logo_url": "https://digilocal-backend.onrender.com/uploads/logo.jpg",
  "shop_image": "https://digilocal-backend.onrender.com/uploads/logo.jpg",
  "vendor": {
    "vendor_id": 1432,
    "store_name": "Fresh Mart",
    "vendor_name": "Rajesh Sharma",
    "owner_name": "Rajesh Sharma",
    "email": "rajesh@gmail.com",
    "phone_number": "9876543210",
    "whatsapp_number": "9876543210",
    "gstin": "07AAAAA0000A1Z5",
    "gst_number": "07AAAAA0000A1Z5",
    "pan_number": "AAAAA0000A",
    "shop_number": "Shop 12",
    "address": "Express Greens",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "bank_name": "HDFC Bank",
    "account_number": "50100234567890",
    "ifsc_code": "HDFC0001234",
    "account_holder_name": "Rajesh Sharma",
    "upi_id": "rajesh@okhdfcbank",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "updated_at": "2026-10-01T10:00:00.000Z"
  }
}
```

---

### 3.3 Example 2: Updating Shop Details & Timings

```json
{
  "store_name": "Sharma Daily Essentials",
  "description": "Premium dairy, fresh vegetables and daily essentials.",
  "shop_number": "Booth #4",
  "opening_time": "07:30 AM",
  "closing_time": "10:30 PM",
  "working_days": "All Days (Mon-Sun)",
  "min_order_value": 100,
  "delivery_charge": 15
}
```

---

### 3.4 Example 3: Updating Shop Details with New Logo (Multipart Form-Data)

When uploading an image file from the Camera or File Picker:

**Headers:**
```http
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data
```

**Form Fields:**
- `file` or `logo` or `image` (Binary File: JPEG, PNG, WEBP, HEIC, max 10MB)
- `store_name`: `"Sharma Daily Essentials"`
- `gstin`: `"07AAAAA0000A1Z5"`
- `phone_number`: `"9876543210"`

---

## 4. Dedicated Payment Details Update (`PUT /api/vendorPanel/:vendorId/payment-details`)

Use this dedicated endpoint when building the "Bank Account & Settlement" screen in Vendor App or Web.

### URL:
`PUT /api/vendorPanel/:vendorId/payment-details`  
*(Or `PUT /api/vendors/:vendorId/payment-details`)*

### Headers:
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
Content-Type: application/json
```

### Request Body:
```json
{
  "bank_name": "State Bank of India",
  "account_number": "31987654321",
  "ifsc_code": "SBIN0001234",
  "account_holder_name": "Rajesh Sharma",
  "upi_id": "rajesh@oksbi",
  "qr_code": "https://res.cloudinary.com/digilocal/image/upload/v12345/qr_code.png"
}
```

### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Bank account and payment details updated successfully.",
  "data": {
    "vendor_id": 1432,
    "account_number": "31987654321",
    "ifsc_code": "SBIN0001234",
    "bank_name": "State Bank of India",
    "account_holder_name": "Rajesh Sharma",
    "upi_id": "rajesh@oksbi",
    "qr_code": "https://res.cloudinary.com/digilocal/image/upload/v12345/qr_code.png",
    "qr_code_url": "https://res.cloudinary.com/digilocal/image/upload/v12345/qr_code.png"
  }
}
```

---

## 5. Bank IFSC Lookup Utility (`GET /api/vendors/bank/:ifsc`)

Before submitting bank details, frontend can auto-fill and validate the branch name using DigiLocal's built-in IFSC lookup:

### URL:
`GET /api/vendors/bank/HDFC0001234`  
*(Or `GET /api/ifsc/HDFC0001234`)*

### Response (`200 OK`):
```json
{
  "success": true,
  "ifsc": "HDFC0001234",
  "bank": "HDFC Bank",
  "bank_name": "HDFC Bank",
  "branch": "Sector 62 Noida",
  "address": "B-9/2, Sector 62, Noida, Gautam Buddha Nagar, Uttar Pradesh - 201301",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "micr": "110240102"
}
```

---

## 6. Frontend Code Examples

### A. React / Next.js (Web Frontend)
```javascript
import axios from 'axios';

const API_BASE = 'https://digilocal-backend.onrender.com';

// 1. Update Profile & GSTIN
export async function updateVendorProfile(vendorId, token, profileData) {
  try {
    const response = await axios.put(
      `${API_BASE}/api/vendorPanel/${vendorId}/settings`,
      profileData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
}

// 2. Update Bank & Payment Details
export async function updatePaymentDetails(vendorId, token, bankData) {
  try {
    const response = await axios.put(
      `${API_BASE}/api/vendorPanel/${vendorId}/payment-details`,
      bankData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
}
```

---

### B. React Native / Expo (Mobile App Frontend)
```javascript
// Example using fetch for multipart form-data (with camera image)
export async function updateVendorSettingsWithPhoto(vendorId, token, fields, imageUri) {
  const formData = new FormData();

  // Append text fields
  Object.keys(fields).forEach((key) => {
    if (fields[key] !== undefined && fields[key] !== null) {
      formData.append(key, String(fields[key]));
    }
  });

  // Append image if selected
  if (imageUri) {
    const filename = imageUri.split('/').pop() || 'store_logo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type
    });
  }

  const response = await fetch(`https://digilocal-backend.onrender.com/api/vendorPanel/${vendorId}/settings`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`
      // Note: Do NOT set Content-Type header manually for FormData in React Native
    },
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to update store settings');
  }
  return data;
}
```

---

## 7. Error Handling & Validation Guide

| Status Code | Error Message | Solution / Cause |
|---|---|---|
| `400 Bad Request` | `"This phone number is already registered to another vendor."` | Vendor attempted to change phone to one already claimed by another vendor. |
| `400 Bad Request` | `"This email address is already registered to another vendor."` | Vendor attempted to change email to one already registered. |
| `400 Bad Request` | `"A shop with this name already exists in this society."` | Shop name conflict inside the same residential society. |
| `401 Unauthorized` | `"Invalid token or token expired."` | Bearer token is missing or expired. Redirect to vendor login screen. |
| `403 Forbidden` | `"Access denied. You can only manage your own vendor account."` | Authenticated vendor ID does not match `:vendorId` in URL. |
| `404 Not Found` | `"Vendor ID ... not found."` | The `:vendorId` passed in the URL does not exist in the database. |
| `500 Server Error` | `"Failed to update store settings"` | Database connection issue or unhandled parameter. |

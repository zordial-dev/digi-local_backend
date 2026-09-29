# 🏦 Vendor Registration & Bank Verification API Documentation
**Platform:** DigiLocal (Mobile App & Web Frontend)  
**Base URL:**  
- **Production:** `https://digi-local-backend.onrender.com`  
- **Local Dev:** `http://localhost:5000` (or `http://127.0.0.1:5000`)

---

## 📌 Summary of Updates

1. **Mandatory Bank Account & IFSC**:
   - `account_number` and `ifsc_code` are now **strictly mandatory** for vendor registration in both the backend validator and the database (`NOT NULL` constraint).
   - If either field is missing or empty, the API immediately returns `HTTP 400 Bad Request` with an explicit error message.
2. **Existing Vendors**:
   - All existing vendor records in the database have their bank account numbers and IFSC codes backfilled (`account_number = 'abc'`, `ifsc_code = '1234'`).
3. **New Bank Location / IFSC Search API**:
   - An instant bank branch & location lookup endpoint has been added so frontend apps and web forms can auto-fetch bank name, branch, city, state, address, and verify the IFSC in real-time as the user types.

---

## 1. 🔍 Bank Location & IFSC Lookup API

Lookup real bank branch name, physical address, city, district, and state from an Indian Financial System Code (IFSC).

### **Endpoints**
- `GET /api/bank/:ifsc` *(Recommended)*
- `GET /api/ifsc/:ifsc`
- `GET /api/vendors/bank/:ifsc`
- `GET /api/vendors/bank-details/:ifsc`
- `GET /api/bank?ifsc=:ifsc` *(Query parameter alternative)*

### **Request Parameters**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `ifsc` | String (Path or Query) | **Yes** | 11-character Indian Financial System Code (e.g., `SBIN0000001`, `HDFC0001234`, `ICIC0000002`). Case-insensitive (auto-uppercased). |

### **Success Response (`200 OK`)**
```json
{
  "success": true,
  "message": "Bank branch details retrieved successfully",
  "data": {
    "ifsc": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "bank_code": "HDFC",
    "branch": "PARK STREET",
    "address": "3 PARK STREET M I ROAD M I ROAD",
    "city": "JAIPUR",
    "district": "JAIPUR",
    "state": "RAJASTHAN",
    "centre": "JAIPUR",
    "contact": "+919875003333",
    "micr": "302240007",
    "upi": true,
    "rtgs": true,
    "neft": true,
    "imps": true
  }
}
```

### **Error Responses**

#### **Invalid Format (`400 Bad Request`)**
Returned when the IFSC is not exactly 11 characters or doesn't conform to standard Indian banking format:
```json
{
  "success": false,
  "error": "Invalid IFSC code format. An IFSC code must be exactly 11 characters (e.g., SBIN0000001, HDFC0001234)."
}
```

#### **Branch Not Found (`404 Not Found`)**
Returned when the IFSC does not correspond to an active RBI bank branch:
```json
{
  "success": false,
  "error": "No bank branch found for IFSC code \"SBIN0999999\". Please check and enter a valid IFSC code."
}
```

---

## 2. 📝 Vendor Registration API

Register a new vendor store account. Requires authentication & business profile info, including mandatory bank account and IFSC code.

### **Endpoints**
- `POST /api/vendors/register`
- `POST /api/vendor/register`

### **Content-Type**
`application/json` (or `multipart/form-data`)

### **Mandatory Fields Specification**

| Field Name | Type | Accepted Aliases | Description |
|---|---|---|---|
| `vendor_name` | String | `owner_name`, `name` | **Mandatory.** Owner / merchant full name. |
| `store_name` | String | `shop_name`, `business_name` | **Mandatory.** Display name of the vendor store. |
| `email` | String | `email_address` | **Mandatory.** Vendor contact & login email. |
| `phone_number` | String | `mobile_number`, `phone` | **Mandatory.** 10-digit mobile number. |
| `password` | String | `pass` | **Mandatory.** Vendor password (min 6 chars recommended). |
| `area` | String | `location`, `society_name` | **Mandatory.** Society name or area / neighborhood. |
| `city` | String | - | **Mandatory.** City (e.g., `Noida`, `Jaipur`). |
| `state` | String | - | **Mandatory.** State (e.g., `Uttar Pradesh`, `Rajasthan`). |
| `pincode` | String / Number | `pin_code` | **Mandatory.** 6-digit postal code. |
| `whatsapp_number` | String | `whatsapp` | **Mandatory.** 10-digit WhatsApp number for order alerts. |
| `shop_number` | String | `shop_no`, `shopNumber` | **Mandatory.** Shop / flat / unit address. |
| `shop_image` | String | `logo`, `image_url` | **Mandatory.** Shop cover photo URL. |
| `account_number` | String / Number | `bank_account_number`, `accountNumber` | **Mandatory (NEW).** Bank account number to receive vendor settlements. |
| `ifsc_code` | String | `ifsc`, `ifscCode` | **Mandatory (NEW).** 11-character Bank IFSC Code. |

### **Optional Fields**
| Field Name | Type | Description |
|---|---|---|
| `bank_name` | String | Bank name (e.g., `HDFC Bank` or auto-filled from the IFSC lookup). |
| `account_holder_name` | String | Name on bank account (defaults to `vendor_name` if omitted). |
| `category` | String | Business category (e.g. `Grocery`, `Electronics`, `Plumber`). |
| `vendor_type` | String | `product` (default) or `service`. |
| `gstin` | String | Optional GST number (stored in uppercase). |
| `pan_number` | String | Optional PAN card number (stored in uppercase). |
| `upi_id` | String | Optional UPI VPA (e.g., `9571240742@fam`). |
| `qr_code` | String | Optional UPI payment URI or QR image URL. |

---

### **Sample Request Payload**
```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh Daily Essentials",
  "email": "ramesh.kumar@example.com",
  "phone_number": "9876543210",
  "password": "SecretPassword@123",
  "area": "Gaur City 2",
  "city": "Greater Noida",
  "state": "Uttar Pradesh",
  "pincode": "201009",
  "whatsapp_number": "9876543210",
  "shop_number": "Shop No. 12, Ground Floor",
  "shop_image": "https://imgh.in/host/ucila6",
  "account_number": "918005625999",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "account_holder_name": "Ramesh Kumar",
  "category": "Daily Needs",
  "vendor_type": "product"
}
```

---

### **Responses**

#### **1. Success (`201 Created` or `200 OK`)**
```json
{
  "message": "Vendor registration submitted successfully. Your store is under review by DigiLocal administration.",
  "vendor_id": 1391,
  "public_id": "vnd@8492",
  "status": "pending",
  "store_name": "Ramesh Daily Essentials",
  "email": "ramesh.kumar@example.com",
  "category": "Daily Needs",
  "account_number": "918005625999",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "accepted_payment_methods": "[\"UPI\",\"COD\"]"
}
```

#### **2. Validation Error – Missing Account Number (`400 Bad Request`)**
```json
{
  "error": "Bank account number (account_number) is mandatory for vendor registration."
}
```

#### **3. Validation Error – Missing IFSC Code (`400 Bad Request`)**
```json
{
  "error": "Bank IFSC code (ifsc_code) is mandatory for vendor registration."
}
```

#### **4. Duplicate Vendor Error (`400 Bad Request`)**
```json
{
  "error": "An active vendor store account with this mobile number/email already exists. Please log in."
}
```

---

## 💡 Frontend Integration Best Practice (App & Web)

1. **Auto-Fill Bank Name & Branch**:
   - In your registration form, place the **IFSC Code** input field above or next to the Bank Name and Branch fields.
   - When the user enters 11 characters into the IFSC input, debounce for 300ms and call:
     ```javascript
     const res = await fetch(`https://digi-local-backend.onrender.com/api/bank/${ifsc.trim().toUpperCase()}`);
     const data = await res.json();
     if (data.success) {
       // Auto-populate form fields:
       bankNameInput.value = data.data.bank_name;
       branchInput.value = `${data.data.branch}, ${data.data.city}`;
       showSuccessBadge("Verified Bank: " + data.data.bank_name);
     } else {
       showFieldError(data.error);
     }
     ```
2. **Prevent Submitting Incomplete Forms**:
   - Disable the "Submit / Register" button if `account_number` is empty or if `ifsc_code.length !== 11`.

# 📄 Complete API Documentation: Vendor Bank & Payment Details Integration

This technical specification documents the **Merchant Bank Account & Direct Payment APIs** for DigiLocal. It enables resident customers to pay vendors directly via **Bank Transfer, UPI ID, or UPI QR Code** when placing orders on the website.

---

## 📌 Summary of Vendor Payment Fields

| Field Name | Mandatory? | Data Type | Description / Example |
| :--- | :---: | :--- | :--- |
| **`account_number`** | **YES** | `VARCHAR(50)` | Bank account number (`5010023456789`) |
| **`ifsc_code`** | **YES** | `VARCHAR(20)` | Bank branch IFSC code (`HDFC0004321`) |
| **`bank_name`** | Optional | `VARCHAR(100)` | Name of the bank (`HDFC Bank Ltd`) |
| **`account_holder_name`**| Optional | `VARCHAR(255)` | Beneficiary name (`Aggarwal Sweets & Snacks`) |
| **`upi_id`** | Optional | `VARCHAR(100)` | UPI VPA address (`aggarwal.sweets@hdfcbank`) |
| **`qr_code_url`** | Optional | `TEXT` | Image URL of vendor payment QR Code |
| **`whatsapp_number`** | Optional | `VARCHAR(20)` | Merchant WhatsApp number for payment screenshots |
| **`accepted_payment_methods`** | Optional | `VARCHAR(255)` | Modes (`COD,UPI,BANK_TRANSFER,QR_CODE`) |
| **`payment_instructions`** | Optional | `TEXT` | Customer payment instructions displayed at checkout |

---

## 📍 Index of Endpoints

1. [POST /api/vendors/register](#1-post-apivendorsregister) — Register Merchant Store (with Mandatory Bank Details)
2. [GET /api/vendors/:vendorId](#2-get-apivendorsvendorid) — Fetch Vendor Storefront Details & Payment Info
3. [GET /api/societies/:societyId/vendors](#3-get-apisocietiessocietyidvendors) — List Storefront Vendors with Payment Fields

---

## 1. POST /api/vendors/register

### 💡 Business Idea & Purpose
Registers a new merchant store. Validates that **`account_number`** and **`ifsc_code`** are provided before activating the store.

### 📥 Request Schema
* **HTTP Method**: `POST`
* **URL Path**: `/api/vendors/register`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "store_name": "Aggarwal Sweets & Bakers",
  "vendor_name": "Vijay Aggarwal",
  "email": "vijay@aggarwalsweets.com",
  "phone_number": "9811223399",
  "password": "VendorPass123!",
  "category": "Sweets",
  "address": "Shop 12, Greenwood Plaza",
  "pincode": "201310",
  "account_number": "5010023456789",
  "ifsc_code": "HDFC0004321",
  "bank_name": "HDFC Bank Ltd",
  "account_holder_name": "Aggarwal Sweets & Snacks",
  "upi_id": "aggarwal.sweets@hdfcbank",
  "qr_code_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300",
  "whatsapp_number": "9811223399",
  "accepted_payment_methods": "COD,UPI,BANK_TRANSFER,QR_CODE",
  "payment_instructions": "Pay via UPI QR Code or Bank Transfer and send payment screenshot on WhatsApp."
}
```

### 📤 Response Payload (201 Created)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 899,
  "vendor": {
    "vendor_id": 899,
    "society_id": 1,
    "store_name": "Aggarwal Sweets & Bakers",
    "vendor_name": "Vijay Aggarwal",
    "email": "vijay@aggarwalsweets.com",
    "phone_number": "9811223399",
    "category": "Sweets",
    "address": "Shop 12, Greenwood Plaza",
    "pincode": "201310",
    "account_number": "5010023456789",
    "ifsc_code": "HDFC0004321",
    "bank_name": "HDFC Bank Ltd",
    "account_holder_name": "Aggarwal Sweets & Snacks",
    "upi_id": "aggarwal.sweets@hdfcbank",
    "qr_code_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300",
    "whatsapp_number": "9811223399",
    "accepted_payment_methods": "COD,UPI,BANK_TRANSFER,QR_CODE",
    "payment_instructions": "Pay via UPI QR Code or Bank Transfer and send payment screenshot on WhatsApp.",
    "status": "ACTIVE"
  }
}
```

### ❌ Validation Errors
- **Missing `account_number`**: `400 Bad Request` -> `{"error": "Bank account_number is a mandatory field for vendor registration"}`
- **Missing `ifsc_code`**: `400 Bad Request` -> `{"error": "Bank ifsc_code is a mandatory field for vendor registration"}`

---

## 2. GET /api/vendors/:vendorId

### 💡 Business Idea & Purpose
Fetches vendor storefront details including catalog menu items, bank account info, UPI ID, QR Code URL, and WhatsApp number for order checkout.

### 📥 Request Schema
* **HTTP Method**: `GET`
* **URL Path**: `/api/vendors/899`

### 📤 Response Payload (200 OK)
```json
{
  "vendor_id": 899,
  "store_name": "Aggarwal Sweets & Bakers",
  "vendor_name": "Vijay Aggarwal",
  "phone_number": "9811223399",
  "email": "vijay@aggarwalsweets.com",
  "society_name": "Greenwood Residency",
  "account_number": "5010023456789",
  "ifsc_code": "HDFC0004321",
  "bank_name": "HDFC Bank Ltd",
  "account_holder_name": "Aggarwal Sweets & Snacks",
  "upi_id": "aggarwal.sweets@hdfcbank",
  "qr_code_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300",
  "whatsapp_number": "9811223399",
  "accepted_payment_methods": "COD,UPI,BANK_TRANSFER,QR_CODE",
  "payment_instructions": "Pay via UPI QR Code or Bank Transfer and send payment screenshot on WhatsApp.",
  "items": [ ... ]
}
```

---

## 3. GET /api/societies/:societyId/vendors

### 💡 Business Idea & Purpose
Lists all active stores within a residential society, complete with bank details and QR codes for customer reference.

### 📥 Request Schema
* **HTTP Method**: `GET`
* **URL Path**: `/api/societies/1/vendors`

### 📤 Response Payload (200 OK)
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "vendor_id": 899,
      "society_id": 1,
      "store_name": "Aggarwal Sweets & Bakers",
      "vendor_name": "Vijay Aggarwal",
      "phone_number": "9811223399",
      "account_number": "5010023456789",
      "ifsc_code": "HDFC0004321",
      "bank_name": "HDFC Bank Ltd",
      "account_holder_name": "Aggarwal Sweets & Snacks",
      "upi_id": "aggarwal.sweets@hdfcbank",
      "qr_code_url": "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=300",
      "whatsapp_number": "9811223399",
      "accepted_payment_methods": "COD,UPI,BANK_TRANSFER,QR_CODE",
      "society_name": "Greenwood Residency"
    }
  ]
}
```

---

## 4. Frontend Checkout Integration Code Example

### React Component for Vendor Direct Payment Checkout

```jsx
import React from 'react';

export function VendorCheckoutModal({ vendor, totalAmount }) {
  if (!vendor) return null;

  return (
    <div className="payment-modal">
      <h2>Pay ₹{totalAmount} to {vendor.store_name}</h2>
      
      {/* Option A: Scan QR Code */}
      {vendor.qr_code_url && (
        <div className="qr-section">
          <p>Scan & Pay via any UPI App (GPay, PhonePe, Paytm):</p>
          <img src={vendor.qr_code_url} alt="Vendor Payment QR" width={220} />
          <p><strong>UPI ID:</strong> {vendor.upi_id}</p>
        </div>
      )}

      {/* Option B: Bank Account Transfer */}
      <div className="bank-section">
        <h3>Bank Account Transfer Details:</h3>
        <p><strong>Account Holder:</strong> {vendor.account_holder_name || vendor.vendor_name}</p>
        <p><strong>Account Number:</strong> {vendor.account_number}</p>
        <p><strong>IFSC Code:</strong> {vendor.ifsc_code}</p>
        <p><strong>Bank Name:</strong> {vendor.bank_name}</p>
      </div>

      {/* Option C: WhatsApp Payment Confirmation */}
      {vendor.whatsapp_number && (
        <div className="whatsapp-note">
          <p>{vendor.payment_instructions || 'Send payment screenshot on WhatsApp after paying.'}</p>
          <a href={`https://wa.me/91${vendor.whatsapp_number}?text=Hi, I have paid ₹${totalAmount} for my order.`} target="_blank" rel="noreferrer">
            Confirm Order on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
```

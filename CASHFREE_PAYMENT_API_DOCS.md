# 📄 Complete API Documentation: Cashfree Payment Gateway Integration

This technical specification details the **Cashfree Production Payment Gateway APIs** integrated into DigiLocal for Merchant Store Registration & Subscription Onboarding.

---

## ⚙️ Cashfree Production Credentials Configured

| Configuration Key | Value |
| :--- | :--- |
| **`CASHFREE_APP_ID`** | `1369289019fa421dddf71e590759829631` |
| **`CASHFREE_ENV`** | `PRODUCTION` |
| **`CASHFREE_API_VERSION`** | `2023-08-01` |
| **`SDK script URL`** | `https://sdk.cashfree.com/js/v3/cashfree.js` |

---

## 📌 Index of Endpoints

1. [POST /api/vendors/register](#1-post-apivendorsregister) — Vendor Registration + Instant Cashfree Payment Session
2. [POST /api/vendors/cashfree/create-session](#2-post-apivendorscashfreecreate-session) — On-Demand Payment Session Creation
3. [POST /api/vendors/cashfree/verify](#3-post-apivendorscashfreeverify) — Verify Payment Status
4. [Frontend Cashfree Web SDK React Code Snippet](#4-frontend-cashfree-web-sdk-integration-example)

---

## 1. POST /api/vendors/register

### 💡 Business Idea & Purpose
Registers a new merchant store in PostgreSQL database and automatically generates an active Cashfree Production Payment Session ID for onboarding payment checkout.

### 📥 Request Schema
* **HTTP Method**: `POST`
* **URL Path**: `/api/vendors/register`
* **Headers**: `Content-Type: application/json`

#### Request Body
```json
{
  "store_name": "Gupta Sweets & Bakers",
  "vendor_name": "Amit Gupta",
  "email": "amit@guptasweets.com",
  "phone_number": "9899887766",
  "password": "VendorPass123!",
  "category": "Bakery",
  "address": "Shop 5, Greenwood Plaza",
  "pincode": "201310"
}
```

### 📤 Response Payload (201 Created)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 895,
  "vendor": {
    "vendor_id": 895,
    "society_id": 1,
    "store_name": "Gupta Sweets & Bakers",
    "vendor_name": "Amit Gupta",
    "email": "amit@guptasweets.com",
    "phone_number": "9899887766",
    "category": "Bakery",
    "address": "Shop 5, Greenwood Plaza",
    "pincode": "201310",
    "status": "ACTIVE"
  },
  "cashfree": {
    "app_id": "1369289019fa421dddf71e590759829631",
    "environment": "PRODUCTION",
    "payment_session_id": "session_vlLIOhBOpHTaC-c6HgMARPLzWi-npLqQ5Cz4lghTL7DVPTJtHs0jhjeruvhPStQ...",
    "order_id": "VND_REG_1786963282104_6742",
    "cf_order_id": "6675323692",
    "order_amount": 499,
    "payment_url": "https://payments.cashfree.com/order/#VND_REG_1786963282104_6742"
  }
}
```

---

## 2. POST /api/vendors/cashfree/create-session

### 💡 Business Idea & Purpose
Allows the merchant dashboard or registration flow to generate a Cashfree Payment Session ID on-demand (e.g. for upgraded subscription plans or renewal).

### 📥 Request Schema
* **HTTP Method**: `POST`
* **URL Path**: `/api/vendors/cashfree/create-session`

#### Request Body
```json
{
  "vendor_id": "895",
  "store_name": "Gupta Sweets & Bakers",
  "vendor_name": "Amit Gupta",
  "email": "amit@guptasweets.com",
  "phone_number": "9899887766",
  "amount": 499.00
}
```

### 📤 Response Payload (200 OK)
```json
{
  "success": true,
  "message": "Cashfree payment session generated successfully",
  "app_id": "1369289019fa421dddf71e590759829631",
  "environment": "PRODUCTION",
  "payment_session_id": "session_vlLIOhBOpHTaC-c6HgMARPLzWi-npLqQ5Cz4lghTL7DVPTJtHs0jhjeruvhPStQ...",
  "order_id": "VND_REG_1786963282104_6742",
  "cf_order_id": "6675323692",
  "order_amount": 499,
  "order_currency": "INR",
  "payment_url": "https://payments.cashfree.com/order/#VND_REG_1786963282104_6742"
}
```

---

## 3. POST /api/vendors/cashfree/verify

### 💡 Business Idea & Purpose
Verifies the payment transaction status with Cashfree after merchant completes payment via Web SDK checkout or redirection.

### 📥 Request Schema
* **HTTP Method**: `POST`
* **URL Path**: `/api/vendors/cashfree/verify`

#### Request Body
```json
{
  "order_id": "VND_REG_1786963282104_6742"
}
```

### 📤 Response Payload (200 OK)
```json
{
  "success": true,
  "order_id": "VND_REG_1786963282104_6742",
  "verified": true,
  "status": "PAID"
}
```

---

## 4. Frontend Cashfree Web SDK Integration Guide

### 📦 Step 1: Install or Include Cashfree Web SDK

#### Option A: HTML Script Tag (Vanilla JS / HTML)
Add this script tag inside your HTML `<head>` or `index.html`:
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

#### Option B: NPM Package (React / Next.js / Vue / Vite)
```bash
npm install @cashfreepayments/cashfree-js
```

---

### 💻 Step 2: Complete React / JavaScript Implementation

```javascript
import { load } from '@cashfreepayments/cashfree-js';

// 1. Initialize Cashfree SDK in Production mode
const cashfree = await load({
  mode: "production" // Cashfree Production Environment
});

async function handleVendorRegistration(formData) {
  try {
    // 2. Register Vendor & Get Backend Response with Cashfree Session
    const response = await fetch('http://localhost:5001/api/vendors/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || 'Registration failed');
      return;
    }

    const { payment_session_id, order_id, payment_url } = data.cashfree || {};

    if (payment_session_id) {
      // 3. Launch Cashfree Checkout
      const checkoutOptions = {
        paymentSessionId: payment_session_id,
        redirectTarget: "_modal" // Use "_modal" for popup checkout OR "_self" for page redirect
      };

      const result = await cashfree.checkout(checkoutOptions);

      if (result.error) {
        // Payment failed or dismissed by user
        console.error("❌ Payment Error / Dismissed:", result.error);
        alert(`Payment error: ${result.error.message || 'Payment not completed'}`);
        return;
      }

      if (result.paymentDetails) {
        console.log("✅ Payment Success Details:", result.paymentDetails);

        // 4. Verify Payment Status with DigiLocal Backend
        const verifyRes = await fetch('http://localhost:5001/api/vendors/cashfree/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id })
        });

        const verifyData = await verifyRes.json();
        if (verifyData.verified) {
          alert('🎉 Registration & Payment Successful! Welcome to DigiLocal.');
          // Redirect to Vendor Dashboard
          window.location.href = '/vendor/dashboard';
        }
      }
    } else if (payment_url) {
      // Fallback: Direct Payment Link Redirection
      window.location.href = payment_url;
    }
  } catch (err) {
    console.error('Registration Exception:', err);
  }
}
```

---

## 5. Summary Checklist for Frontend Developer

- [x] **API Base URL**: `http://localhost:5001/api` (or `http://172.25.12.196:5001/api` for LAN testing)
- [x] **SDK Mode**: `"production"`
- [x] **Session Field**: Access `data.cashfree.payment_session_id` returned directly inside `POST /api/vendors/register`
- [x] **Checkout Target**: Use `redirectTarget: "_modal"` for clean popup overlay, or `redirectTarget: "_self"` for full-page redirection.
- [x] **Verification**: Call `POST /api/vendors/cashfree/verify` with `{ order_id: data.cashfree.order_id }` after payment completes.

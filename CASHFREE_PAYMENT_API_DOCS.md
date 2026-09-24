# DigiLocal Cashfree PG (v3) API Documentation

This document provides frontend engineers (Web, Android, iOS, React Native, and Flutter) with the complete API specifications for the **Cashfree Payment Gateway (v3)** integration, including live processing and simulated **Dummy/Test Payment** flows.

---

## 🌐 1. Environments & Base URLs

| Environment | Backend Base URL | Description |
| :--- | :--- | :--- |
| **Local Development** | `http://localhost:5000` | Local development server |
| **Cloud Production** | `https://digi-local-backend.onrender.com` | Live Render backend deployment |

> 💡 **Tip**: When testing with Postman or mobile clients, set an environment variable `{{base_url}}` to switch seamlessly between `http://localhost:5000` and `https://digi-local-backend.onrender.com`.

---

## 🧪 2. How to Test Dummy / Mock Payments

To test the complete end-to-end payment lifecycle **without deducting real money** and **without needing active bank accounts or live Cashfree merchant credentials**:

1. Pass `"mock": true` (or `"env": "TEST"`) in the request body when creating any order or payment session.
2. The backend responds immediately with:
   - A mock `payment_session_id` (format: `session_test_<timestamp>_<random>`)
   - A test `payment_url` (`https://payments-test.cashfree.com/order/#<order_id>`)
   - `"mode": "test_sandbox"`
3. Pass `"mock": true` when calling the verification endpoint (`/api/payments/cashfree/verify`). The backend marks the order as `CONFIRMED` and `PAID`, triggers real-time Socket.IO notifications to the vendor, and records a settlement ledger entry.

---

## 📲 3. Frontend SDK Integration Quickstart

### A. Web Apps (Vanilla JS, React, Vue, Next.js)

1. **Include the Cashfree JS SDK v3 script in `index.html`**:
   ```html
   <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
   ```
   Or install via npm:
   ```bash
   npm install @cashfreepayments/cashfree-js
   ```

2. **Launch Checkout Modal**:
   ```javascript
   // 'sandbox' for test / 'production' for live payments
   const cashfree = Cashfree({ mode: "sandbox" }); 

   async function handlePayment(paymentSessionId, orderId) {
     const checkoutOptions = {
       paymentSessionId: paymentSessionId,
       redirectTarget: "_modal" // Opens popup UPI/Card modal without navigating away
     };

     try {
       const result = await cashfree.checkout(checkoutOptions);
       if (result.error) {
         console.warn("Payment dismissed or cancelled by user:", result.error);
       }
       if (result.paymentDetails) {
         // Step 2: Verify with DigiLocal backend
         await verifyPaymentWithBackend(orderId);
       }
     } catch (err) {
       console.error("Checkout launch error:", err);
     }
   }
   ```

### B. React Native (Android & iOS)

Install the Cashfree React Native SDK:
```bash
npm install react-native-cashfree-pg-sdk
```

```javascript
import { CFPaymentGatewayService, CFSession, CFEnvironment } from 'react-native-cashfree-pg-sdk';

function triggerNativeCheckout(paymentSessionId, orderId) {
  const session = new CFSession(
    paymentSessionId,
    orderId,
    CFEnvironment.SANDBOX // or CFEnvironment.PRODUCTION
  );

  CFPaymentGatewayService.setCallback({
    onPaymentVerify(orderId) {
      // Payment successful in SDK -> Verify on DigiLocal Backend
      verifyPaymentWithBackend(orderId);
    },
    onPaymentFailure(error, orderId) {
      console.log('Payment failed:', error);
    }
  });

  CFPaymentGatewayService.doPayment(session);
}
```

---

## 📡 4. Complete API Specifications

---

### Endpoint 1: Create Order with Cashfree Session
Creates a customer order in the DigiLocal database and simultaneously generates a Cashfree payment session ID.

- **URL**: `{{base_url}}/api/orders`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body Schema:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vendor_id` | `Number` | **Yes** | Vendor ID from catalog (e.g. `1296`) |
| `society_id` | `Number` | No | Society ID (defaults to `1`) |
| `user_id` | `String` | No | Customer ID (e.g. `usr_9876543210`) |
| `customer_name` | `String` | No | Customer full name |
| `phone` | `String` | No | Customer 10-digit mobile number |
| `customer_email`| `String` | No | Customer email address |
| `delivery_address`| `String`| No | Delivery address (e.g. `Flat 402, Tower B`) |
| `payment_method` | `String` | **Yes** | `"CASHFREE"` (or `"COD"` for Cash on Delivery) |
| `total_amount` | `Number` | **Yes** | Total bill amount in INR (e.g. `150.00`) |
| `items` | `Array` | **Yes** | Array of cart item objects: `[{ item_id, item_name, quantity, price }]` |
| `mock` | `Boolean` | No | Set `true` for **dummy/test payment** |

#### Request Example (Postman Copy-Paste):
```json
{
  "vendor_id": 1296,
  "society_id": 1,
  "user_id": "usr_9876543210",
  "customer_name": "Rohan Sharma",
  "phone": "9876543210",
  "customer_email": "rohan@gmail.com",
  "delivery_address": "Flat 402, Tower B, Greenwood Residency",
  "payment_method": "CASHFREE",
  "total_amount": 150.00,
  "mock": true,
  "items": [
    {
      "item_id": 1726,
      "item_name": "White Lily",
      "quantity": 1,
      "price": 150.00
    }
  ]
}
```

#### Response Example (`201 Created` / `200 OK`):
```json
{
  "success": true,
  "message": "Order created. Please complete payment via Cashfree.",
  "order_id": "ORD-6461",
  "total_amount": 150,
  "status": "PENDING",
  "payment_method": "CASHFREE",
  "payment_status": "PENDING",
  "societyName": "Greenwood Residency",
  "payment_session_id": "session_test_1790250245814_oj0g1ydj",
  "payment_url": "https://payments-test.cashfree.com/order/#ORD-6461",
  "cashfree": {
    "success": true,
    "mode": "test_sandbox",
    "payment_session_id": "session_test_1790250245814_oj0g1ydj",
    "order_id": "ORD-6461",
    "cf_order_id": "CF_TEST_ORD-6461",
    "order_amount": 150,
    "order_currency": "INR",
    "payment_status": "ACTIVE",
    "payment_url": "https://payments-test.cashfree.com/order/#ORD-6461",
    "message": "Cashfree session created in Test mode (Test/Dummy Mode Active)"
  },
  "order": {
    "order_id": "ORD-6461",
    "vendor_id": 1296,
    "user_id": "usr_9876543210",
    "customer_name": "Rohan Sharma",
    "phone_number": "9876543210",
    "delivery_address": "Flat 402, Tower B, Greenwood Residency",
    "status": "PENDING",
    "payment_status": "PENDING",
    "payment_method": "CASHFREE",
    "cashfree_order_id": "ORD-6461",
    "total_amount": 150
  }
}
```

---

### Endpoint 2: Standalone Cashfree Payment Session
Use this endpoint if your frontend architecture generates the `order_id` in advance or needs to initialize a payment session without creating a full cart order.

- **URL**: `{{base_url}}/api/payments/cashfree/create-order-session`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body Schema:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | `String` | No | Unique order ID (auto-generated if omitted) |
| `amount` | `Number` | **Yes** | Transaction amount in INR |
| `customer_phone` | `String` | No | Customer mobile number |
| `customer_name` | `String` | No | Customer name |
| `customer_email` | `String` | No | Customer email |
| `vendor_id` | `Number` | No | Target vendor ID |
| `mock` | `Boolean` | No | Set `true` for **dummy/test payment** |

#### Request Example (Postman Copy-Paste):
```json
{
  "order_id": "TEST_ORDER_9999",
  "amount": 250.00,
  "customer_phone": "9876543210",
  "customer_name": "Aarushi Verma",
  "customer_email": "aarushi@gmail.com",
  "mock": true
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "payment_session_id": "session_test_1790250223489_a1w3kh2t",
  "order_id": "TEST_ORDER_9999",
  "cf_order_id": "CF_TEST_TEST_ORDER_9999",
  "order_amount": 250,
  "order_currency": "INR",
  "payment_status": "ACTIVE",
  "payment_url": "https://payments-test.cashfree.com/order/#TEST_ORDER_9999",
  "mode": "test_sandbox",
  "store_name": "DigiLocal Merchant"
}
```

---

### Endpoint 3: Verify Cashfree Payment
Call this endpoint after the customer completes the SDK modal or is redirected back to confirm payment status, mark the order as `PAID`, and dispatch real-time vendor alerts.

- **URL**: `{{base_url}}/api/payments/cashfree/verify`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body Schema:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | `String` | **Yes** | DigiLocal Order ID (e.g. `ORD-6461`) |
| `cashfree_order_id`| `String` | No | Cashfree order reference ID |
| `cashfree_payment_id`| `String`| No | Payment transaction ID from SDK callback |
| `mock` | `Boolean` | No | Set `true` to verify a dummy/test payment |

#### Request Example (Postman Copy-Paste):
```json
{
  "order_id": "ORD-6461",
  "mock": true
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "verified": true,
  "message": "Payment verified successfully. Order confirmed.",
  "order_id": "ORD-6461",
  "payment_status": "PAID",
  "payment_method": "CASHFREE",
  "cashfree_order_id": "ORD-6461",
  "cashfree_payment_id": "cf_pay_test_1790250241849",
  "paid_at": "2026-09-24T11:44:00.000Z",
  "order": {
    "order_id": "ORD-6461",
    "vendor_id": 1296,
    "status": "CONFIRMED",
    "payment_status": "PAID",
    "payment_method": "CASHFREE",
    "total_amount": 150
  }
}
```

---

### Endpoint 4: Direct Vendor Scan & Pay Session
Enables customers to scan a vendor's in-store DigiLocal QR code and pay any arbitrary amount directly to that vendor.

- **URL**: `{{base_url}}/api/payments/cashfree/pay-vendor-direct`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body Schema:
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vendor_id` | `Number` | **Yes** | Vendor ID (e.g. `1296`) |
| `amount` | `Number` | **Yes** | Amount to pay vendor in INR |
| `customer_name` | `String` | No | Customer name |
| `customer_phone`| `String` | No | Customer phone number |
| `mock` | `Boolean` | No | Set `true` for **dummy/test payment** |

#### Request Example (Postman Copy-Paste):
```json
{
  "vendor_id": 1296,
  "amount": 75.00,
  "customer_name": "Pooja Mehta",
  "customer_phone": "9876543210",
  "mock": true
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "order_id": "CF_VND_1296_1790250243703",
  "payment_session_id": "session_test_1790250243703_9ba13d48",
  "vendor_id": 1296,
  "vendor_name": "Ramesh Kumar",
  "store_name": "Flower Point",
  "amount": 75,
  "currency": "INR",
  "mode": "test_sandbox"
}
```

---

### Endpoint 5: Verify Direct Scan & Pay Payment
Verifies direct payments made to a vendor via QR code and credits the vendor's ledger.

- **URL**: `{{base_url}}/api/payments/cashfree/verify-direct`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body:
```json
{
  "order_id": "CF_VND_1296_1790250243703",
  "mock": true
}
```

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "message": "Payment verified successfully",
  "order_id": "CF_VND_1296_1790250243703",
  "payment_status": "PAID"
}
```

---

### Endpoint 6: Fetch Vendor Payment History & Settlements
Returns the list of all successful online customer payments received by a specific vendor.

- **URL**: `{{base_url}}/api/vendors/:vendorId/cashfree-payments`
- **Method**: `GET`

#### Request Headers:
```http
Accept: application/json
```

#### Example URL:
`{{base_url}}/api/vendors/1296/cashfree-payments`

#### Response Example (`200 OK`):
```json
{
  "success": true,
  "vendor_id": "1296",
  "store_name": "Flower Point",
  "bank_account_number": "50100428912345",
  "ifsc_code": "HDFC0001234",
  "total_received": 225.00,
  "total_transactions": 2,
  "payments": [
    {
      "payment_id": 101,
      "order_id": "ORD-6461",
      "amount": 150.00,
      "payment_status": "PAID",
      "customer_name": "Rohan Sharma",
      "created_at": "2026-09-24T11:44:00.000Z"
    },
    {
      "payment_id": 102,
      "order_id": "CF_VND_1296_1790250243703",
      "amount": 75.00,
      "payment_status": "PAID",
      "customer_name": "Pooja Mehta",
      "created_at": "2026-09-24T11:44:03.000Z"
    }
  ]
}
```

---

## 🧪 5. Ready-to-Run cURL Commands for Postman

Copy and paste these commands into Postman (**Import -> Raw Text**):

### 1. Create Dummy Order with Cashfree
```bash
curl --location 'http://localhost:5000/api/orders' \
--header 'Content-Type: application/json' \
--data '{
  "vendor_id": 1296,
  "society_id": 1,
  "user_id": "usr_9876543210",
  "customer_name": "Test Customer",
  "phone": "9876543210",
  "delivery_address": "Flat 101, Tower A",
  "payment_method": "CASHFREE",
  "total_amount": 150.00,
  "mock": true,
  "items": [
    {
      "item_id": 1726,
      "item_name": "White Lily",
      "quantity": 1,
      "price": 150.00
    }
  ]
}'
```

### 2. Verify Dummy Payment
```bash
curl --location 'http://localhost:5000/api/payments/cashfree/verify' \
--header 'Content-Type: application/json' \
--data '{
  "order_id": "ORD-6461",
  "mock": true
}'
```

### 3. Direct Scan & Pay to Vendor (Dummy)
```bash
curl --location 'http://localhost:5000/api/payments/cashfree/pay-vendor-direct' \
--header 'Content-Type: application/json' \
--data '{
  "vendor_id": 1296,
  "amount": 75.00,
  "customer_name": "Direct Payer",
  "customer_phone": "9876543210",
  "mock": true
}'
```

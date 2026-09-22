# DigiLocal Payment Gateway & Order Placement API Documentation

This documentation provides frontend developers with complete integration specifications for:
1. **Cash on Delivery (COD)** Order Placement
2. **Cashfree Payment Gateway (v3)** Online Payment Flow
3. **Vendor Bank Account & IFSC Code Configuration** for direct settlements

---

## 🌐 1. Environments & Base URLs

| Environment | Backend Base URL | Cashfree Gateway URL |
| :--- | :--- | :--- |
| **Local Development** | `http://localhost:5000` | `https://api.cashfree.com/pg` *(Production)* / `https://sandbox.cashfree.com/pg` |
| **Production** | `https://api.digilocal.in` | `https://api.cashfree.com/pg` |

> **Cashfree Web SDK Script (Include in `<head>` of web app)**:
> ```html
> <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
> ```
> Or install via NPM for React / Next.js:
> ```bash
> npm install @cashfreepayments/cashfree-js
> ```

---

## 🛒 2. Customer Order Placement API

### `POST /api/orders`
Creates a customer cart order. Supports both **Cash on Delivery** and **Online Payment via Cashfree**.

- **URL**: `/api/orders`
- **Method**: `POST`
- **Content-Type**: `application/json`

### Request Payload Specification

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `vendor_id` | `Number` | **Yes** | Target vendor ID |
| `society_id` | `Number` | No | Customer's society ID (defaults to `1`) |
| `user_id` | `String` | No | Customer User ID (e.g., `usr_9876543210`) |
| `customer_name`| `String` | No | Customer full name |
| `phone` | `String` | No | Customer 10-digit mobile number |
| `customer_email`| `String`| No | Customer email (defaults to `customer@digilocal.in`) |
| `delivery_address`| `String`| No | Complete delivery address (e.g. `Flat 402, Tower B`) |
| `payment_method` | `String` | **Yes** | Either `"COD"` or `"CASHFREE"` (also accepts `"ONLINE"`) |
| `total_amount` | `Number` | **Yes** | Total order amount in INR |
| `items` | `Array` | **Yes** | Array of cart items (see schema below) |

#### Item Object Schema (`items` array):
```json
{
  "item_id": 101,
  "item_name": "Whole Wheat Brown Bread",
  "quantity": 2,
  "price": 50.00
}
```

---

### Scenario A: Cash on Delivery (COD)

#### Request Example (COD)
```json
{
  "user_id": "usr_9876543210",
  "customer_name": "Aarushi Verma",
  "phone": "9876543210",
  "customer_email": "aarushi@gmail.com",
  "vendor_id": 1296,
  "society_id": 1,
  "delivery_address": "Flat 402, Tower B, Greenwood Residency",
  "payment_method": "COD",
  "total_amount": 250.00,
  "items": [
    {
      "item_id": 1,
      "item_name": "Whole Wheat Bread",
      "quantity": 2,
      "price": 50.00
    },
    {
      "item_id": 2,
      "item_name": "Fresh Cow Milk 1L",
      "quantity": 3,
      "price": 50.00
    }
  ]
}
```

#### Response Example (COD - `200 OK`)
```json
{
  "success": true,
  "message": "Order placed successfully via Cash on Delivery.",
  "order_id": "ORD-5481",
  "total_amount": 250,
  "status": "PLACED",
  "payment_method": "COD",
  "payment_status": "PENDING",
  "societyName": "Greenwood Residency",
  "created_at": "2026-09-22T14:15:00.000+05:30",
  "order": {
    "order_id": "ORD-5481",
    "vendor_id": 1296,
    "user_id": "usr_9876543210",
    "customer_name": "Aarushi Verma",
    "phone_number": "9876543210",
    "delivery_address": "Flat 402, Tower B, Greenwood Residency",
    "status": "PLACED",
    "payment_status": "PENDING",
    "payment_method": "COD",
    "total_amount": 250,
    "created_at": "2026-09-22T14:15:00.000+05:30",
    "items": [
      {
        "item_id": 1,
        "item_name": "Whole Wheat Bread",
        "quantity": 2,
        "unit_price": 50,
        "price": 50
      },
      {
        "item_id": 2,
        "item_name": "Fresh Cow Milk 1L",
        "quantity": 3,
        "unit_price": 50,
        "price": 50
      }
    ]
  }
}
```
> **Frontend Action**: Direct the customer immediately to the **Order Confirmation / Success** screen.

---

### Scenario B: Online Payment via Cashfree

#### Request Example (Cashfree)
```json
{
  "user_id": "usr_9876543210",
  "customer_name": "Aarushi Verma",
  "phone": "9876543210",
  "customer_email": "aarushi@gmail.com",
  "vendor_id": 1296,
  "society_id": 1,
  "delivery_address": "Flat 402, Tower B, Greenwood Residency",
  "payment_method": "CASHFREE",
  "total_amount": 250.00,
  "items": [
    {
      "item_id": 1,
      "item_name": "Whole Wheat Bread",
      "quantity": 2,
      "price": 50.00
    }
  ]
}
```

#### Response Example (Cashfree - `200 OK`)
```json
{
  "success": true,
  "message": "Order created. Please complete payment via Cashfree.",
  "order_id": "ORD-5482",
  "total_amount": 250,
  "status": "PENDING",
  "payment_method": "CASHFREE",
  "payment_status": "PENDING",
  "societyName": "Greenwood Residency",
  "created_at": "2026-09-22T14:16:00.000+05:30",
  "payment_session_id": "session_live_89fa123bc456def789...",
  "payment_url": "https://payments.cashfree.com/order/#ORD-5482",
  "cashfree": {
    "success": true,
    "mode": "live",
    "payment_session_id": "session_live_89fa123bc456def789...",
    "order_id": "ORD-5482",
    "cf_order_id": "CF_ORD-5482",
    "order_amount": 250,
    "order_currency": "INR",
    "payment_status": "ACTIVE",
    "payment_url": "https://payments.cashfree.com/order/#ORD-5482"
  },
  "order": {
    "order_id": "ORD-5482",
    "vendor_id": 1296,
    "user_id": "usr_9876543210",
    "customer_name": "Aarushi Verma",
    "phone_number": "9876543210",
    "delivery_address": "Flat 402, Tower B, Greenwood Residency",
    "status": "PENDING",
    "payment_status": "PENDING",
    "payment_method": "CASHFREE",
    "cashfree_order_id": "ORD-5482",
    "total_amount": 250
  }
}
```

---

## 💻 3. Frontend Cashfree SDK Checkout Trigger

Once the frontend receives `payment_session_id` from `POST /api/orders`, launch the Cashfree checkout modal:

### Vanilla JS / Web Implementation
```javascript
// Initialize Cashfree SDK ('production' for live payments, 'sandbox' for test)
const cashfree = Cashfree({ mode: "production" });

function startPayment(paymentSessionId, orderId) {
  const checkoutOptions = {
    paymentSessionId: paymentSessionId,
    redirectTarget: "_modal" // Opens UPI / Cards modal without leaving the page
  };

  cashfree.checkout(checkoutOptions).then(async (result) => {
    if (result.error) {
      console.error("Payment dismissed or failed:", result.error);
      alert("Payment was not completed. You can retry anytime.");
    }
    if (result.paymentDetails) {
      console.log("Payment completed by user:", result.paymentDetails);
      // Verify payment with DigiLocal backend
      await verifyPaymentOnBackend(orderId);
    }
  });
}
```

### React / React Native Implementation
In React Native, use the `@cashfreepayments/cashfree-pg-sdk-react-native` package:
```javascript
import { CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';

const session = new CFSession(
  response.payment_session_id,
  response.order_id,
  CFEnvironment.PRODUCTION
);
CFPaymentGatewayService.doPayment(session);
```

---

## 🔍 4. Cashfree Payment Verification API

After the customer finishes the checkout modal or is redirected back, the frontend must call the verification endpoint to verify payment status and update the order state to `CONFIRMED` and `PAID`.

### `POST /api/payments/cashfree/verify`
- **Method**: `POST`
- **Content-Type**: `application/json`

#### Request Body
```json
{
  "order_id": "ORD-5482",
  "cashfree_order_id": "ORD-5482",
  "cashfree_payment_id": "cf_pay_987654321"
}
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "verified": true,
  "message": "Payment verified successfully. Order confirmed.",
  "order_id": "ORD-5482",
  "payment_status": "PAID",
  "payment_method": "CASHFREE",
  "cashfree_order_id": "ORD-5482",
  "cashfree_payment_id": "cf_pay_987654321",
  "paid_at": "2026-09-22T14:18:10.000Z",
  "order": {
    "order_id": "ORD-5482",
    "vendor_id": 1296,
    "status": "CONFIRMED",
    "payment_status": "PAID",
    "payment_method": "CASHFREE",
    "total_amount": 250
  }
}
```
> **Frontend Action**: On `verified: true`, show the **Payment & Order Confirmed** celebration screen.

---

## 🏦 5. Vendor Bank Account & Settlement APIs

Vendors enter their bank account number and IFSC code so customer payments are attributed and settled directly into their bank account.

### A. Vendor Enters / Updates Bank Account & IFSC Code
- **Endpoint**: `PUT /api/vendorPanel/:vendorId/payment-details`
  *(or `PUT /api/vendorPanel/payment-details` when vendor JWT token is passed in header)*
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "account_number": "50100428912345",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "account_holder_name": "Ramesh Kumar Flower Store",
  "upi_id": "ramesh@okhdfcbank"
}
```

#### Field Specifications:
| Field | Type | Description |
| :--- | :--- | :--- |
| `account_number` | `String` | Vendor bank account number |
| `ifsc_code` | `String` | 11-character Indian Financial System Code (e.g., `HDFC0001234`) |
| `bank_name` | `String` | Name of the bank (e.g., `HDFC Bank`, `State Bank of India`) |
| `account_holder_name` | `String` | Legal name as registered with the bank |
| `upi_id` | `String` | Optional vendor UPI VPA |

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Bank account and payment details updated successfully.",
  "data": {
    "vendor_id": 1296,
    "account_number": "50100428912345",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "account_holder_name": "Ramesh Kumar Flower Store",
    "upi_id": "ramesh@okhdfcbank"
  }
}
```

---

### B. Fetch Vendor Profile (Showing Saved Bank Account)
- **Endpoint**: `GET /api/vendorPanel/:vendorId`
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### Response Example
```json
{
  "vendor": {
    "vendor_id": 1296,
    "vendor_name": "Ramesh Kumar",
    "store_name": "Flower Point",
    "phone_number": "9876543210",
    "account_number": "50100428912345",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "account_holder_name": "Ramesh Kumar Flower Store",
    "upi_id": "ramesh@okhdfcbank"
  }
}
```

---

### C. Fetch Vendor Payment Settlements Ledger
Vendors can view their order revenues and settlement credit history:

- **Endpoint**: `GET /api/payments/cashfree/vendor/:vendorId/ledger`
- **Headers**:
  ```http
  Authorization: Bearer <VENDOR_JWT_TOKEN>
  ```

#### Response (`200 OK`)
```json
{
  "success": true,
  "vendor_id": 1296,
  "store_name": "Flower Point",
  "vendor_bank_account": "50100428912345",
  "vendor_ifsc": "HDFC0001234",
  "summary": {
    "total_settled_amount": 4500.00,
    "total_successful_transactions": 18
  },
  "payments": [
    {
      "payment_id": 101,
      "order_id": "ORD-5482",
      "amount": 250.00,
      "payment_status": "SUCCESS",
      "payment_method": "CASHFREE",
      "cashfree_payment_id": "cf_pay_987654321",
      "customer_name": "Aarushi Verma",
      "created_at": "2026-09-22T14:18:10.000Z"
    }
  ]
}
```

---

## 🛠️ 6. Testing & Interactive Tools

1. **Interactive Test Page (in browser)**:
   Navigate to `http://localhost:5000/cashfree-test.html`
   - Switch between **COD** and **CASHFREE** toggles.
   - Test modal checkout with sample items.
   - Click **"🔑 Test PG Credentials"** to test live PG connection.

2. **Terminal Credential Diagnostic Command**:
   ```bash
   npm run test:cashfree
   ```
   Directly pings Cashfree PG to validate merchant `APP_ID` and `SECRET_KEY`.

---

## 📋 7. Summary of API Endpoints

| Flow | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **COD Order** | `POST` | `/api/orders` | Creates order with `payment_method: "COD"` |
| **Cashfree Order** | `POST` | `/api/orders` | Creates order and returns `payment_session_id` |
| **Verify Payment** | `POST` | `/api/payments/cashfree/verify` | Confirms payment and updates order to `PAID` |
| **Save Vendor Bank** | `PUT` | `/api/vendorPanel/:vendorId/payment-details` | Vendor saves Account Number & IFSC |
| **View Vendor Bank** | `GET` | `/api/vendorPanel/:vendorId` | Fetches vendor profile with bank info |
| **Vendor Ledger** | `GET` | `/api/payments/cashfree/vendor/:vendorId/ledger` | Displays settlements & credited payments |

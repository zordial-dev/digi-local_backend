# 💳 DigiLocal — Website Payment Integration API Docs
### For: Website Frontend Developer (React / Next.js / Vue / Vanilla JS)

> **Backend Base URL (Production):** `https://digi-local-backend.onrender.com`  
> **Backend Base URL (Local Dev):** `http://localhost:5000`  
> **Payment Gateway:** Cashfree PG v3 (`2023-08-01`)  
> **Last Updated:** 29 Sep 2026  

---

## 🧭 How the Payment Flow Works

When a user on your website buys from a vendor, the end-to-end flow is:

```
User clicks Pay → Website calls DigiLocal backend → Backend creates Cashfree session
→ Website launches Cashfree popup modal → User pays (UPI / Card / Netbanking)
→ Website calls backend verify endpoint → Backend confirms with Cashfree → Order marked PAID
→ Show "Payment Successful!" to user
```

**Four API calls. That's it.**

---

## 📦 Step 0: Install the Cashfree JS SDK

```bash
npm install @cashfreepayments/cashfree-js
```

Or via CDN in your HTML `<head>`:
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

---

## 🔑 Environment Configuration

| Setting | Value |
|---|---|
| Cashfree SDK mode | `'production'` |
| Backend base URL | `https://digi-local-backend.onrender.com` |
| Env var name (Next.js) | `NEXT_PUBLIC_API_URL` |

> **Never expose** Cashfree App ID or Secret Key in frontend code. They live securely in the backend `.env`.

---

## 📡 API Specifications

---

### API 1 — Create Cart Order

Creates the order in our database **before** payment. Returns an `order_id`.

```http
POST /api/orders
Content-Type: application/json
```

#### Request Body

```json
{
  "vendor_id": 1296,
  "user_id": "usr_9876543210",
  "customer_name": "Aarushi Verma",
  "customer_phone": "9876543210",
  "customer_email": "aarushi@gmail.com",
  "delivery_address": "Flat 402, Tower B, Greenwood Residency",
  "payment_method": "CASHFREE",
  "total_amount": 200.00,
  "items": [
    { "item_id": 101, "item_name": "White Lily", "quantity": 2, "price": 40.00 },
    { "item_id": 105, "item_name": "Mango Juice", "quantity": 1, "price": 120.00 }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `vendor_id` | number | **YES** | The vendor the user is buying from |
| `items` | array | **YES** | `[{ item_id, item_name, quantity, price }]` |
| `total_amount` | number | **YES** | Total order value in INR |
| `payment_method` | string | **YES** | Always `"CASHFREE"` for online payment |
| `customer_name` | string | **YES** | User's full name |
| `customer_phone` | string | **YES** | 10-digit mobile number |
| `customer_email` | string | No | User's email |
| `delivery_address` | string | No | Delivery address string |
| `user_id` | string | No | Your app's user identifier |

#### Response `200 OK`

```json
{
  "success": true,
  "order_id": "ORD_1790592300123",
  "total_amount": 200.00,
  "status": "PENDING",
  "payment_status": "PENDING",
  "payment_method": "CASHFREE"
}
```

> **Save `order_id`** — it's needed in all next steps.

---

### API 2 — Create Cashfree Payment Session

Contacts Cashfree servers and returns a `payment_session_id` to launch the payment popup.

```http
POST /api/payments/create-order
Content-Type: application/json
```

*Aliases: `POST /api/payments/create-order-session`, `POST /api/payments/cashfree/create-order-session`*

#### Request Body

```json
{
  "order_id": "ORD_1790592300123",
  "amount": 200.00,
  "customer_name": "Aarushi Verma",
  "customer_phone": "9876543210",
  "customer_email": "aarushi@gmail.com",
  "return_url": "https://yourwebsite.com/order-status?order_id=ORD_1790592300123"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `order_id` | string | **YES** | The `order_id` from API 1 |
| `amount` | number | **YES** | Must match the order total (INR) |
| `customer_name` | string | **YES** | User's name |
| `customer_phone` | string | **YES** | 10-digit mobile number |
| `customer_email` | string | No | User's email |
| `return_url` | string | No | Page to redirect after payment (non-modal / redirect flows) |

#### Response `200 OK`

```json
{
  "success": true,
  "payment_session_id": "session_g73h_f89h4_23098f_LiveSessionId",
  "order_id": "ORD_1790592300123",
  "cf_order_id": "CF_ORD_1790592300123",
  "order_amount": 200.00,
  "order_currency": "INR",
  "payment_status": "ACTIVE",
  "payment_url": "https://payments.cashfree.com/order/#ORD_1790592300123",
  "mode": "live"
}
```

> **Save `payment_session_id`** — pass it to the Cashfree JS SDK to open the modal.

---

### API 3 — Launch Cashfree Payment Modal (Frontend SDK Call)

This is not an HTTP call to our backend — it's a call to the Cashfree JS SDK.

```javascript
import { load } from '@cashfreepayments/cashfree-js';

let cashfreeInstance = null;

// Call this on PAGE LOAD, not on button click — avoids popup blockers
async function initCashfree() {
  if (!cashfreeInstance) {
    cashfreeInstance = await load({ mode: 'production' }); // 'production' for real payments
  }
  return cashfreeInstance;
}

async function openPaymentModal(paymentSessionId, orderId) {
  const cashfree = await initCashfree();

  const result = await cashfree.checkout({
    paymentSessionId: paymentSessionId,
    redirectTarget: '_modal' // Opens as popup — user stays on your page
  });

  if (result.error) {
    // User closed the modal or payment cancelled
    showError('Payment was cancelled. Please try again.');
    return;
  }

  if (result.paymentDetails) {
    // Payment completed in modal — call API 4 to verify
    await verifyPayment(orderId);
  }
}
```

> **Important:** Initialize Cashfree SDK on page load with `initCashfree()`, not inside the button click handler. This prevents browser popup blockers from blocking the modal.

---

### API 4 — Verify Payment on Backend

After the Cashfree modal returns `paymentDetails`, call this endpoint to confirm with Cashfree servers and mark the order PAID.

```http
POST /api/payments/verify
Content-Type: application/json
```

*Alias: `POST /api/payments/cashfree/verify`*

#### Request Body

```json
{
  "order_id": "ORD_1790592300123"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `order_id` | string | **YES** | The `order_id` from API 1 |

#### Response `200 OK` — Verified Successfully

```json
{
  "success": true,
  "verified": true,
  "message": "Payment verified successfully. Order confirmed.",
  "order_id": "ORD_1790592300123",
  "payment_status": "PAID",
  "payment_method": "CASHFREE",
  "cashfree_payment_id": "CF_PAY_928172901",
  "paid_at": "2026-09-29T07:12:44.000Z",
  "order": {
    "order_id": "ORD_1790592300123",
    "vendor_id": 1296,
    "status": "CONFIRMED",
    "payment_status": "PAID",
    "total_amount": 200.00
  }
}
```

#### Response `400` — Not Verified / Payment Failed

```json
{
  "success": false,
  "verified": false,
  "payment_status": "FAILED",
  "error": "Payment has not been completed or was declined"
}
```

> Show "Order Confirmed!" **only** when `verified === true` AND `payment_status === 'PAID'`.

---

## 💻 Complete React / Next.js Component (Copy-Paste Ready)

```jsx
import React, { useState, useEffect } from 'react';
import { load } from '@cashfreepayments/cashfree-js';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://digi-local-backend.onrender.com';

let cashfreeInstance = null;
async function getCashfree() {
  if (!cashfreeInstance) {
    cashfreeInstance = await load({ mode: 'production' });
  }
  return cashfreeInstance;
}

/**
 * PayNowButton — drop this into your checkout page
 * Props:
 *   vendorId: number
 *   cartItems: [{ item_id, item_name, quantity, price }]
 *   totalAmount: number (INR)
 *   user: { name, phone, email, id }
 *   onSuccess: (data) => void
 *   onFailure: (err) => void
 */
export default function PayNowButton({ vendorId, cartItems, totalAmount, user, onSuccess, onFailure }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCashfree().catch(console.warn); // Pre-init on mount
  }, []);

  const handlePay = async () => {
    try {
      setLoading(true);
      setError('');

      // API 1: Create Order
      const orderRes = await fetch(`${BACKEND_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendorId,
          customer_name: user.name,
          customer_phone: user.phone,
          customer_email: user.email || '',
          user_id: user.id || `usr_${user.phone}`,
          payment_method: 'CASHFREE',
          total_amount: totalAmount,
          items: cartItems
        })
      });
      const orderData = await orderRes.json();
      if (!orderData.success || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to create order');
      }
      const orderId = orderData.order_id;

      // API 2: Create Payment Session
      const sessionRes = await fetch(`${BACKEND_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          amount: totalAmount,
          customer_name: user.name,
          customer_phone: user.phone,
          customer_email: user.email || ''
        })
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.success || !sessionData.payment_session_id) {
        throw new Error(sessionData.error || 'Failed to create payment session');
      }

      // API 3: Launch Cashfree Modal
      const cashfree = await getCashfree();
      const result = await cashfree.checkout({
        paymentSessionId: sessionData.payment_session_id,
        redirectTarget: '_modal'
      });

      if (result.error) {
        setError(result.error.message || 'Payment was cancelled.');
        if (onFailure) onFailure(result.error);
        return;
      }

      // API 4: Verify Payment
      if (result.paymentDetails) {
        const verifyRes = await fetch(`${BACKEND_URL}/api/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.verified && verifyData.payment_status === 'PAID') {
          if (onSuccess) onSuccess(verifyData);
          else window.location.href = `/order-confirmation?order_id=${orderId}`;
        } else {
          throw new Error(verifyData.error || 'Payment verification failed');
        }
      }
    } catch (err) {
      const msg = err.message || 'Payment failed. Please try again.';
      setError(msg);
      if (onFailure) onFailure(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pay-now-wrapper">
      {error && (
        <p className="pay-error" style={{ color: '#e53935', fontSize: 14, marginBottom: 8 }}>
          ⚠️ {error}
        </p>
      )}
      <button
        onClick={handlePay}
        disabled={loading}
        style={{
          padding: '12px 24px', fontSize: 16, fontWeight: 600,
          background: loading ? '#ccc' : '#1a73e8', color: '#fff',
          border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Securing payment...' : `Pay ₹${Number(totalAmount).toFixed(2)}`}
      </button>
    </div>
  );
}
```

#### Usage in your checkout page:

```jsx
<PayNowButton
  vendorId={1296}
  cartItems={[
    { item_id: 101, item_name: 'White Lily', quantity: 2, price: 40 },
    { item_id: 105, item_name: 'Mango Juice', quantity: 1, price: 120 }
  ]}
  totalAmount={200}
  user={{ name: 'Aarushi Verma', phone: '9876543210', email: 'aarushi@gmail.com', id: 'usr_9876543210' }}
  onSuccess={(data) => {
    console.log('Payment success!', data);
    router.push(`/order-confirmation?id=${data.order_id}`);
  }}
  onFailure={(err) => {
    console.error('Payment failed:', err);
  }}
/>
```

---

## ⚡ Direct Vendor Payment — Scan & Pay (Optional)

Use this when a user scans the vendor's QR code and pays a custom amount directly (no cart order needed).

### Step A — Create Direct Payment Session

```http
POST /api/payments/pay-vendor-direct
Content-Type: application/json

{
  "vendor_id": 1296,
  "amount": 350.00,
  "customer_name": "Aarushi Verma",
  "customer_phone": "9876543210",
  "notes": "Weekly groceries clearance"
}
```

| Field | Type | Required |
|---|---|---|
| `vendor_id` | number | **YES** |
| `amount` | number | **YES** |
| `customer_name` | string | No |
| `customer_phone` | string | No |
| `notes` | string | No |

#### Response `200 OK`

```json
{
  "success": true,
  "payment_session_id": "session_direct_982348_live",
  "order_id": "CF_DIR_1790592300999",
  "order_amount": 350.00,
  "vendor": { "vendor_id": 1296, "store_name": "Fresh Mart" }
}
```

### Step B — Launch Cashfree modal with the `payment_session_id` (same SDK call as API 3)

### Step C — Verify Direct Payment

```http
POST /api/payments/verify-direct
Content-Type: application/json

{ "order_id": "CF_DIR_1790592300999" }
```

Response is same format as API 4.

---

## 🔔 Webhooks — Automatic, No Frontend Action Needed

If a user closes the browser mid-payment (e.g., UPI Intent), Cashfree auto-notifies our backend:

**Webhook URL:** `https://digi-local-backend.onrender.com/api/payments/webhook`

The backend automatically:
- Verifies the Cashfree HMAC signature
- Updates order to `PAID` + `CONFIRMED`
- Notifies the vendor in real-time via Socket.IO

You don't need to handle this — it's all done server-side.

---

## ❌ Error Handling Reference

| HTTP Status | `verified` | Scenario | User Message |
|---|---|---|---|
| `200` | `true` | Payment successful | "Order confirmed! ✅" |
| `400` | `false` | Payment declined / cancelled | "Payment declined. Try another method." |
| `400` | — | Missing fields / bad amount | Show the `error` field from response |
| `401` | — | Auth token expired | Redirect to login |
| `404` | — | `order_id` not found | "Order not found. Please refresh your cart." |
| `500` | — | Backend or gateway error | "Payment gateway busy. Please try again in a moment." |

---

## 🧪 Testing Without Real Money (Active — Remove When Told)

### Option A — 1-Click Dummy Transaction (Fastest)

Browser URL:
```
https://digi-local-backend.onrender.com/api/payments/cashfree/dummy-transaction?amount=100&auto_complete=true
```

Or Postman/cURL:
```json
POST /api/payments/cashfree/dummy-transaction

{
  "amount": 100.00,
  "customer_name": "Test User",
  "customer_phone": "9876543210",
  "auto_complete": true
}
```

Creates a fully completed PAID order with a ledger entry — no real money charged.

### Option B — mock: true Flag on Any Endpoint

Add `"mock": true` to your order or session request. Returns simulated session. Then verify with `"mock": true`.

```json
POST /api/orders
{
  "vendor_id": 1296, "payment_method": "CASHFREE",
  "total_amount": 150, "mock": true, "items": [...]
}
```

```json
POST /api/payments/verify
{ "order_id": "ORD_...", "mock": true }
```

### Option C — Simulate Existing Order Paid

```json
POST /api/payments/cashfree/simulate-payment

{ "order_id": "ORD_1790592300123" }
```

Marks the existing order as PAID, CONFIRMED without any real payment.

### Option D — Interactive Test Bench (Browser UI)

Open: `http://localhost:5000/cashfree-test`

Full UI with SDK modal test, dummy transactions, credential check, and payments ledger viewer.

---

## 📊 Order Status Query APIs

```http
GET /api/orders/{order_id}
```
Returns order details including `payment_status`, `status`, `paid_at`.

```http
GET /api/orders/user/{user_id}
```
Returns all orders for a specific user.

```http
GET /api/orders/vendor/{vendor_id}
```
Returns all orders placed with a specific vendor.

---

## ❓ FAQ

**Q: What Cashfree SDK mode should I use for real payments?**  
A: Use `'production'` in `load({ mode: 'production' })`. Use `'sandbox'` only for testing with Cashfree test credentials.

**Q: Do I need to send the Cashfree App ID or Secret Key from frontend?**  
A: **Absolutely not.** Never put Cashfree credentials in frontend code. They're in the backend `.env`. Just call our backend APIs.

**Q: What payment methods will users see in the Cashfree modal?**  
A: All methods — UPI (GPay, PhonePe, Paytm), Credit Card, Debit Card, Netbanking, Wallets, EMI, Pay Later. Cashfree shows them automatically based on what's active on your merchant account.

**Q: What happens if the user closes the Cashfree modal mid-payment?**  
A: `result.error` will be truthy. **Do NOT call** `/api/payments/verify`. Just show "Payment Cancelled" and let the user retry.

**Q: What if the user pays via UPI Intent and their browser closes before returning?**  
A: Our backend webhook handles this automatically. The order will be updated to PAID even if the user never came back to your page.

**Q: How do I know for sure that money was received before showing the success screen?**  
A: Always call `POST /api/payments/verify`. **Only** show success if the response has both `verified: true` AND `payment_status: 'PAID'`. This is the source of truth.

**Q: Is there a redirect flow (non-modal) option?**  
A: Yes. Set `redirectTarget` to `'_self'` instead of `'_modal'` in the Cashfree SDK call, and set `return_url` when creating the session. The user will be redirected back to your `return_url` after payment. Then call `/api/payments/verify` when your return page loads.

---

## 🚀 Quick Start Checklist

- [ ] `npm install @cashfreepayments/cashfree-js`
- [ ] Set env var `NEXT_PUBLIC_API_URL=https://digi-local-backend.onrender.com`
- [ ] Initialize Cashfree SDK (`load({ mode: 'production' })`) on **page load**
- [ ] On checkout button click → `POST /api/orders` → save `order_id`
- [ ] `POST /api/payments/create-order` → save `payment_session_id`
- [ ] Call `cashfree.checkout({ paymentSessionId, redirectTarget: '_modal' })`
- [ ] Wait for `result.paymentDetails` (not `result.error`)
- [ ] `POST /api/payments/verify` with `order_id`
- [ ] Show success screen **only** if `verified: true` AND `payment_status === 'PAID'`

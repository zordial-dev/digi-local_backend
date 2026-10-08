# DigiLocal Web Frontend — Refund Status API Documentation
> **Target Audience:** Web Frontend Developers (React.js / Next.js / Vue.js / Tailwind CSS / Customer Web Portal)  
> **Backend Base URLs:**  
> - **Production:** `https://digi-local-backend.onrender.com`  
> - **Local Development:** `http://localhost:5000`  
> - **Authentication:** Standard JWT Bearer token in headers: `Authorization: Bearer <user_token>`

---

## 1. Overview for Web Developers

When an order paid online via Cashfree Payment Gateway (UPI, Credit/Debit Card, Net Banking) is cancelled, an automated refund is created back to the customer's original payment method.

The Web Frontend needs to display:
1. **Whether the refund has completed** (`is_refund_completed: true` -> Green status pill / success badge).
2. **Whether the refund is in progress** (`is_refund_in_progress: true` -> Amber status pill / processing spinner).
3. **Refund Metadata** (`refund_amount`, `refund_id`, `refunded_at`, `destination`, `estimated_settlement`).

---

## 2. API Endpoints Specification

### API 1: Single Order Refund Status (Dedicated Endpoint)
Use this endpoint on the **Order Details Page**, **Checkout / Order Success Page**, or **Customer Order Tracking Modal**.

- **HTTP Method:** `GET`
- **Route:** `/api/orders/:orderId/refund-status`
- **Alias:** `/api/orders/:orderId/refund` or `/api/payments/cashfree/refund-status/:orderId`

#### Scenario 1: Refund Completed
Returned when Cashfree and the customer's bank have finalized the credit.

```http
GET /api/orders/ORD-7712/refund-status HTTP/1.1
Host: digi-local-backend.onrender.com
Accept: application/json
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "order_id": "ORD-7712",
  "user_id": "usr_9921",
  "vendor_id": 8,
  "store_name": "Sunrise Organic Groceries",
  "order_status": "CANCELLED",
  "is_refund_completed": true,
  "is_refund_in_progress": false,
  "refund_status": "COMPLETED",
  "refund_status_label": "Refund Completed",
  "payment_status": "REFUND_COMPLETED",
  "payment_method": "CASHFREE",
  "total_amount": 540.00,
  "refund_amount": 540.00,
  "refund_id": "REF_ORD-7712_1728384910291",
  "refunded_at": "2026-10-08T10:30:00.000Z",
  "destination": "Original Payment Source (Bank Account / UPI / Card)",
  "estimated_settlement": "Completed",
  "message": "Refund has been completed successfully and credited back to the original payment source."
}
```

---

#### Scenario 2: Refund In Progress
Returned when the refund instruction has been dispatched and the banking partner network is clearing it.

**Response (`200 OK`):**
```json
{
  "success": true,
  "order_id": "ORD-7713",
  "user_id": "usr_9921",
  "vendor_id": 8,
  "store_name": "Sunrise Organic Groceries",
  "order_status": "CANCELLED",
  "is_refund_completed": false,
  "is_refund_in_progress": true,
  "refund_status": "IN_PROGRESS",
  "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
  "payment_status": "REFUND_IN_PROGRESS",
  "payment_method": "CASHFREE",
  "total_amount": 320.00,
  "refund_amount": 320.00,
  "refund_id": "REF_ORD-7713_1728384992144",
  "refunded_at": "2026-10-08T10:32:00.000Z",
  "destination": "Original Payment Source (Bank Account / UPI / Card)",
  "estimated_settlement": "5-7 business days",
  "message": "Refund has been initiated and is currently being processed by the banking network."
}
```

---

#### Scenario 3: Cash On Delivery / Unpaid (No Refund Applicable)
Returned when an order was placed via COD or unpaid. No money was taken, so no refund is processed.

**Response (`200 OK`):**
```json
{
  "success": true,
  "order_id": "ORD-7714",
  "user_id": "usr_9921",
  "vendor_id": 8,
  "store_name": "Sunrise Organic Groceries",
  "order_status": "CANCELLED",
  "is_refund_completed": false,
  "is_refund_in_progress": false,
  "refund_status": "NOT_APPLICABLE",
  "refund_status_label": "No Refund Applicable (Cash on Delivery or Unpaid)",
  "payment_status": "CANCELLED",
  "payment_method": "COD",
  "total_amount": 210.00,
  "refund_amount": 0,
  "refund_id": null,
  "refunded_at": null,
  "destination": null,
  "estimated_settlement": null,
  "message": "Order was Cash on Delivery or unpaid. No payment was deducted, so no refund is needed."
}
```

---

### API 2: User Refunds List (Customer Portal "My Refunds" View)
Use this endpoint to display a dedicated list or table of refunds under the customer's account dashboard.

- **HTTP Method:** `GET`
- **Route:** `/api/orders/user/:userId/refunds`

**Response (`200 OK`):**
```json
{
  "success": true,
  "count": 2,
  "refunds": [
    {
      "order_id": "ORD-7712",
      "user_id": "usr_9921",
      "vendor_id": 8,
      "store_name": "Sunrise Organic Groceries",
      "order_status": "CANCELLED",
      "is_refund_completed": true,
      "is_refund_in_progress": false,
      "refund_status": "COMPLETED",
      "refund_status_label": "Refund Completed",
      "payment_status": "REFUND_COMPLETED",
      "payment_method": "CASHFREE",
      "total_amount": 540.00,
      "refund_amount": 540.00,
      "refund_id": "REF_ORD-7712_1728384910291",
      "refunded_at": "2026-10-08T10:30:00.000Z",
      "destination": "Original Payment Source (Bank Account / UPI / Card)",
      "created_at": "2026-10-08T09:15:00.000Z"
    },
    {
      "order_id": "ORD-7713",
      "user_id": "usr_9921",
      "vendor_id": 8,
      "store_name": "Sunrise Organic Groceries",
      "order_status": "CANCELLED",
      "is_refund_completed": false,
      "is_refund_in_progress": true,
      "refund_status": "IN_PROGRESS",
      "refund_status_label": "Refund in Progress (Crediting back to original payment source)",
      "payment_status": "REFUND_IN_PROGRESS",
      "payment_method": "CASHFREE",
      "total_amount": 320.00,
      "refund_amount": 320.00,
      "refund_id": "REF_ORD-7713_1728384992144",
      "refunded_at": "2026-10-08T10:32:00.000Z",
      "destination": "Original Payment Source (Bank Account / UPI / Card)",
      "created_at": "2026-10-08T09:20:00.000Z"
    }
  ]
}
```

---

### API 3: Existing Order Details & Order List Endpoints
If your web application is already calling:
- `GET /api/orders/:orderId` (Single order)
- `GET /api/orders/user/:userId` (User order history)

Each order object in the response already includes:
```json
{
  "payment_status": "REFUND_COMPLETED",
  "refund_status": "COMPLETED",
  "refund_status_label": "Refund Completed",
  "is_refund_in_progress": false,
  "refund_id": "REF_ORD-7712_1728384910291",
  "refund_amount": 540.00,
  "refunded_at": "2026-10-08T10:30:00.000Z"
}
```

---

## 3. Web UI State Matrix & Visual Badges

| `is_refund_completed` | `is_refund_in_progress` | Badge Color | Badge Label | Description |
| :---: | :---: | :--- | :--- | :--- |
| `true` | `false` | 🟢 Green (`bg-emerald-50 text-emerald-800 border-emerald-200`) | **Refund Completed** | Credited back to original payment source. |
| `false` | `true` | 🟠 Amber (`bg-amber-50 text-amber-800 border-amber-200`) | **Refund in Progress** | Processing by banking network (usually 15m - 2h for UPI). |
| `false` | `false` | ⚪ Neutral (`bg-gray-50 text-gray-700 border-gray-200`) | **No Refund Needed** | Cash on Delivery / Unpaid order. |

---

## 4. Web Component Examples (React / Next.js / Tailwind CSS)

### 4.1 React / Next.js Component: `OrderRefundCard.tsx`

```tsx
import React from 'react';

interface RefundStatusProps {
  orderId: string;
  isRefundCompleted: boolean;
  isRefundInProgress: boolean;
  refundAmount?: number;
  refundId?: string;
  refundedAt?: string;
  destination?: string;
}

export const OrderRefundCard: React.FC<RefundStatusProps> = ({
  orderId,
  isRefundCompleted,
  isRefundInProgress,
  refundAmount,
  refundId,
  refundedAt,
  destination
}) => {
  if (isRefundCompleted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white text-xs font-bold">
              ✓
            </span>
            <h4 className="text-sm font-semibold text-emerald-900">Refund Completed</h4>
          </div>
          {refundAmount !== undefined && (
            <span className="text-base font-bold text-emerald-900">
              ₹{refundAmount.toFixed(2)}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-emerald-800 leading-relaxed">
          The refund was completed successfully and credited back to your original payment method ({destination || 'UPI / Bank Account'}).
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-emerald-700 font-mono">
          {refundId && <span>Refund ID: <strong>{refundId}</strong></span>}
          {refundedAt && <span>• Date: {new Date(refundedAt).toLocaleString('en-IN')}</span>}
        </div>
      </div>
    );
  }

  if (isRefundInProgress) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 animate-spin items-center justify-center rounded-full border-2 border-amber-600 border-t-transparent text-xs" />
            <h4 className="text-sm font-semibold text-amber-900">Refund in Progress</h4>
          </div>
          {refundAmount !== undefined && (
            <span className="text-base font-bold text-amber-900">
              ₹{refundAmount.toFixed(2)}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-amber-800 leading-relaxed">
          Refund request has been accepted by Cashfree PG and sent to your bank. Most UPI refunds reflect within 15 minutes to 2 hours.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-amber-700 font-mono">
          {refundId && <span>Reference: <strong>{refundId}</strong></span>}
          <span>• Destination: {destination || 'Original Payment Source'}</span>
        </div>
      </div>
    );
  }

  return null;
};
```

---

### 4.2 React Hook for Fetching & Polling Refund Status

```typescript
import { useState, useEffect } from 'react';

export function useOrderRefundStatus(orderId: string, shouldPoll = false) {
  const [refundData, setRefundData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/refund-status`);
      const data = await res.json();
      if (data.success) {
        setRefundData(data);
      } else {
        setError(data.error || 'Failed to fetch refund status');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId) return;
    fetchStatus();

    // If refund is in progress and polling is requested, poll every 10 seconds
    if (shouldPoll && refundData?.is_refund_in_progress) {
      const interval = setInterval(fetchStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [orderId, shouldPoll, refundData?.is_refund_in_progress]);

  return { refundData, loading, error, refetch: fetchStatus };
}
```

---

## 5. Summary Cheat Sheet for Web Dev

- **Single Order Refund Status:** `GET /api/orders/:orderId/refund-status`
- **User Refund History:** `GET /api/orders/user/:userId/refunds`
- **Check if completed:** `res.data.is_refund_completed === true`
- **Check if in progress:** `res.data.is_refund_in_progress === true`
- **Display Amount:** `res.data.refund_amount`

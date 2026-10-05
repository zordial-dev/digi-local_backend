# 📦 Inventory & Real-Time Stock Management — API Documentation

**For:** Web Frontend Developers & Mobile App Developers (User App & Vendor App)  
**Date:** October 2026  
**Backend Version:** DigiLocal Relational API v3.3.0  
**Status:** ✅ Fully Implemented, Tested & Live in Production  

---

## 🎯 Executive Summary & Real-World Flow

### Example Scenario:
1. **Initial State:** A vendor lists **100 Pastries** (`stock: 100`, `in_stock: true`).
2. **Frontend UI Limitation:** The user can add **at most 100** pastries to their cart. The `+` (increment) button is automatically capped at `item.stock`.
3. **Order Placed:** User orders **20 Pastries**.
   - Backend performs atomic stock deduction: `stock = stock - 20`.
   - Remaining stock in database is now **80**.
4. **Subsequent Orders:** Another user or subsequent order can now order **at most 80** pastries.
   - If a user tries to place an order for **85 pastries**, the backend **rejects the order with HTTP 400 Bad Request** (`insufficient_stock: true`, `available_stock: 80`).
5. **Order Cancellation / Rejection:** If the order of 20 is cancelled by the customer or rejected by the vendor, the backend **automatically restores the 20 pastries** back to inventory (`80 + 20 = 100`).
6. **Out of Stock Automation:** When stock reaches `0`, the backend automatically marks `in_stock = false` and `is_available = false`.

---

## 📑 Summary of Available Endpoints

| # | Endpoint | Method | Target Consumer | Purpose |
|---|----------|--------|-----------------|---------|
| 1 | `/api/vendors/:vendorId` | `GET` | User Web / User App | Fetch vendor storefront with live `stock` on each item |
| 2 | `/api/items/:id/stock` | `GET` | User Web / App / Vendor | Lightweight real-time stock check for a single item |
| 3 | `/api/orders/check-stock` | `POST` | User Web / User App | Validate entire cart before proceeding to checkout/payment |
| 4 | `/api/orders` | `POST` | User Web / User App | Place order with atomic stock deduction & enforcement |
| 5 | `/api/orders/:id/cancel` | `POST` | User Web / User App | Cancel order & auto-restore item quantities back to stock |
| 6 | `/api/vendorPanel/:vendorId/items/:itemId/stock` | `PATCH` / `PUT` | Vendor Panel / Vendor App | Vendor updates or adjusts stock count (restock/adjust) |

---

## 1. Fetch Storefront & Menu Items (With Live Stock)

### `GET /api/vendors/:vendorId`
### `GET /api/stores/:vendorId`

When the customer visits a store menu or storefront, every item in `items` now includes authoritative inventory stock fields.

#### Response Schema (`200 OK`)
```json
{
  "vendor_id": 1430,
  "store_name": "Yash bakers",
  "category": "Bakery & Snacks",
  "status": "ACTIVE",
  "items": [
    {
      "item_id": 1858,
      "vendor_id": 1430,
      "item_name": "pastry",
      "price": 35,
      "unit_price": 35,
      "category": "Bakery, Cakes & Desserts",
      "description": "Chocolate pastry",
      "image_url": "https://i.imghos.co/NwtAJsPG.jpg",
      "stock": 100,
      "available_quantity": 100,
      "max_quantity": 100,
      "unit": "piece",
      "in_stock": true,
      "is_available": true
    }
  ]
}
```

### 💡 Frontend Guidance for Item Card / Quantity Counter
```javascript
// Web / React / Flutter logic:
const maxAllowed = item.stock || 0;
const isOutOfStock = !item.in_stock || maxAllowed <= 0;

// Increment button handler:
function handleIncrement() {
  if (currentQty >= maxAllowed) {
    showToast(`Only ${maxAllowed} available in stock!`);
    return;
  }
  setQty(currentQty + 1);
}
```

---

## 2. Real-Time Single Item Stock Check

### `GET /api/items/:id/stock`
### `GET /api/products/:id/stock`

Use this lightweight endpoint to re-verify stock right when the user opens the item detail modal or adds to cart.

#### Response (`200 OK`)
```json
{
  "success": true,
  "item_id": 1858,
  "item_name": "pastry",
  "vendor_id": 1430,
  "price": 35,
  "unit": "piece",
  "stock": 80,
  "available_quantity": 80,
  "max_quantity": 80,
  "in_stock": true,
  "is_available": true
}
```

---

## 3. Cart Stock Pre-Validation API

### `POST /api/orders/check-stock`
### Aliases: `POST /api/orders/validate-cart`, `POST /api/cart/check-stock`, `POST /api/cart/validate`

Call this endpoint before opening payment or when user clicks **"Proceed to Checkout"** to guarantee all cart quantities are still available.

#### Request Body:
```json
{
  "vendor_id": 1430,
  "items": [
    {
      "item_id": 1858,
      "quantity": 20
    }
  ]
}
```

#### Success Response — All Items Available (`200 OK`)
```json
{
  "success": true,
  "can_fulfill": true,
  "valid": true,
  "message": "All items are in stock and available for order",
  "items": [
    {
      "item_id": 1858,
      "item_name": "pastry",
      "price": 35,
      "requested_quantity": 20,
      "available_stock": 100,
      "max_allowed": 100,
      "remaining_after_order": 80,
      "in_stock": true,
      "is_available": true,
      "can_fulfill": true,
      "error": null
    }
  ]
}
```

#### Error Response — Requested Quantity Exceeds Available Stock (`200 OK`)
```json
{
  "success": true,
  "can_fulfill": false,
  "valid": false,
  "message": "Some items exceed available stock or are out of stock",
  "items": [
    {
      "item_id": 1858,
      "item_name": "pastry",
      "price": 35,
      "requested_quantity": 120,
      "available_stock": 100,
      "max_allowed": 100,
      "remaining_after_order": 0,
      "in_stock": true,
      "is_available": true,
      "can_fulfill": false,
      "error": "Only 100 available in stock (requested 120)"
    }
  ]
}
```

---

## 4. Place Order & Atomic Stock Deduction

### `POST /api/orders`

When placing an order, the backend **strictly enforces stock availability**.

#### Request Body:
```json
{
  "vendor_id": 1430,
  "user_id": "usr_998811",
  "customer_name": "John Doe",
  "phone": "9876543210",
  "delivery_address": "Flat 302, Tower B, Arg Ananta",
  "payment_method": "COD",
  "items": [
    {
      "item_id": 1858,
      "quantity": 20
    }
  ]
}
```

#### Success Response (`201 Created`)
Stock is atomically reduced by 20 (`100 -> 80`). The remaining stock is returned in `order.items[].stock_remaining`.

```json
{
  "success": true,
  "message": "Order placed successfully via Cash on Delivery.",
  "order_id": "ORD-8878",
  "total_amount": 700,
  "status": "PLACED",
  "payment_method": "COD",
  "payment_status": "PENDING",
  "order": {
    "order_id": "ORD-8878",
    "vendor_id": 1430,
    "user_id": "usr_998811",
    "customer_name": "John Doe",
    "phone_number": "9876543210",
    "delivery_address": "Flat 302, Tower B, Arg Ananta",
    "status": "PLACED",
    "total_amount": 700,
    "items": [
      {
        "item_id": 1858,
        "item_name": "pastry",
        "quantity": 20,
        "unit_price": 35,
        "price": 35,
        "stock_remaining": 80
      }
    ]
  }
}
```

---

### ❌ Error Response: Insufficient Stock (`400 Bad Request`)

If the user attempts to order more quantity than is available (e.g. requesting 85 when only 80 are left):

```json
{
  "success": false,
  "error": "Only 80 'pastry' available in stock, but you requested 85. Please reduce the quantity.",
  "message": "Only 80 'pastry' available in stock, but you requested 85. Please reduce the quantity.",
  "insufficient_stock": true,
  "item_id": 1858,
  "item_name": "pastry",
  "available_stock": 80,
  "requested_quantity": 85,
  "max_allowed": 80
}
```

### ❌ Error Response: Out of Stock (`400 Bad Request`)

If an item's stock is `0` or item is unavailable:

```json
{
  "success": false,
  "error": "Cannot order 'pastry': This item is currently out of stock.",
  "message": "Cannot order 'pastry': This item is currently out of stock.",
  "out_of_stock": true,
  "item_id": 1858,
  "item_name": "pastry",
  "available_stock": 0,
  "requested_quantity": 5
}
```

---

## 5. Automatic Stock Restoration on Cancellation

### `POST /api/orders/:id/cancel`
### `PUT /api/orders/:id/status` (with `status: "CANCELLED"` or `"REJECTED"`)

When an order is cancelled by the customer, rejected by the merchant, or cancelled by the admin, the backend **automatically restores all item quantities back to stock** and sets `in_stock = true`.

#### Request Body (`POST /api/orders/ORD-8878/cancel`):
```json
{
  "reason": "Customer changed mind"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Order cancelled successfully.",
  "order_id": "ORD-8878",
  "status": "CANCELLED"
}
```
*(The 20 pastries from ORD-8878 are immediately added back: `80 -> 100`).*

---

## 6. Vendor Inventory & Stock Update API

### `PATCH /api/vendorPanel/:vendorId/items/:itemId/stock`
### `PUT /api/vendorPanel/:vendorId/items/:itemId/stock`
### Aliases: `PATCH /api/items/:itemId/stock`, `PUT /api/items/:itemId/stock`

Use this endpoint in the **Vendor Web Portal** or **Vendor Mobile App** to update stock counts directly.

### Option A: Set Absolute Stock
```json
{
  "stock": 150
}
```

### Option B: Delta Adjustment (Restock / Sale)
```json
{
  "stock_change": 50
}
```
*(Increments current stock by 50. Negative numbers decrement stock).*

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Stock updated successfully from 100 to 150",
  "item_id": 1858,
  "item_name": "pastry",
  "previous_stock": 100,
  "stock": 150,
  "available_quantity": 150,
  "max_quantity": 150,
  "in_stock": true,
  "is_available": true
}
```

---

## 📱 Frontend Integration Checklist for Web & Mobile Devs

1. **Menu Item Display:**
   - Read `item.stock` and `item.in_stock`.
   - If `item.stock <= 0` or `!item.in_stock`:
     - Show **"Sold Out"** or **"Out of Stock"** badge.
     - Disable the **"Add"** button.
   - If `item.stock <= 5` and `item.stock > 0`:
     - Show **"Only X left!"** urgency badge.

2. **Quantity Counter (`+` / `-`):**
   - Minimum value: `1` (or `0` to remove).
   - Maximum value: `item.stock`.
   - Disable or dim the `+` button when cart quantity equals `item.stock`.

3. **Pre-Checkout Validation:**
   - Call `POST /api/orders/check-stock` right before navigating to Payment.
   - If `can_fulfill: false`, highlight any item that exceeds stock and prompt user to adjust.

4. **Catching 400 Insufficient Stock:**
   - If `POST /api/orders` returns `400` with `insufficient_stock: true`:
     - Display `error` message in a banner/toast: `"Only X available in stock!"`.
     - Automatically update the cart item quantity to `available_stock`.

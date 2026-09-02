# 🏪 Merchant Vendor Purchases & Orders Made API Documentation (v1.0.0)

> **Document Version**: v1.0.0 (Vendor-to-Vendor B2B & B2C Purchase Orders Specification)  
> **Target Audience**: Merchant Vendor App & Portal Frontend Developers (`vendor-portal`)  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  

---

## 📋 Overview

When a merchant vendor (e.g. Raj Supermart) acts as a buyer/customer and places an order to buy supplies or inventory from another vendor store (e.g. Aarushi Sweets or Wholesale Mart), the vendor can now view all **Orders Made / Purchases** placed by them via this dedicated API.

---

## 🔐 Authorization Header

```http
Authorization: Bearer <VENDOR_JWT_ACCESS_TOKEN>
Content-Type: application/json
```

---

## 📡 API Endpoints Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vendorPanel/:vendorId/purchases` | Fetch orders placed by this vendor when buying from other vendors |
| `GET` | `/api/vendorPanel/:vendorId/my-orders` | Alias endpoint for vendor's own purchase history |
| `GET` | `/api/vendor/:vendorId/purchases` | Top-level vendor purchases alias |
| `GET` | `/api/orders/vendor-purchases/:vendorId` | Orders module vendor purchases alias |

---

## 1. Fetch Orders Placed by Vendor (Purchases)

**Method:** `GET`  
**Endpoint:** `/api/vendorPanel/:vendorId/purchases`  
*(or `/api/vendorPanel/:vendorId/my-orders` / `/api/vendor/:vendorId/purchases`)*

### Path Parameters
- `vendorId` (string/number): Vendor ID (e.g. `1225`), Public ID (e.g. `c860cb`), or phone number.

### Request Example
```http
GET /api/vendorPanel/1225/purchases
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Response Example (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor purchases retrieved successfully.",
  "data": [
    {
      "order_id": "ORD-V2V-9842",
      "buyer_vendor_id": "1225",
      "buyer_public_id": "c860cb",
      "buyer_store_name": "Raj Supermart",
      "seller_vendor_id": "104",
      "seller_store_name": "Aarushi Sweets",
      "seller_store_logo": "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300",
      "total_amount": 707.00,
      "status": "delivered",
      "delivery_address": "Shop 352, Raj Supermart, Sheoganj",
      "created_at": "2026-09-02T06:32:11.000Z",
      "created_at_readable": "02 Sep 2026, 06:32 am IST",
      "items": [
        {
          "item_id": 101,
          "item_name": "Organic Milk Packets (Bulk)",
          "quantity": 10,
          "price": 50.00,
          "item_total": 500.00
        },
        {
          "item_id": 102,
          "item_name": "Desi Ghee Box 1kg",
          "quantity": 1,
          "price": 207.00,
          "item_total": 207.00
        }
      ]
    }
  ]
}
```

---

## 💡 Frontend Integration Notes for Vendor App Devs

1. **Dashboard / Profile Menu**:
   - On the Vendor App Dashboard / Settings drawer, add a **"My Purchases / Orders Placed"** tab next to "Store Sales Orders".
2. **Sales Orders vs. Purchases**:
   - **Sales Orders** (`GET /api/vendorPanel/:vendorId` -> `orders` array): Orders placed by customers/residents for items sold *by* this vendor.
   - **Purchases** (`GET /api/vendorPanel/:vendorId/purchases`): Orders placed *by* this vendor to buy items from other stores.
3. **UI Badges**:
   - Render `seller_store_name`, `seller_store_logo`, `total_amount`, and order `status` (`pending`, `confirmed`, `delivered`, `cancelled`).

# 📢 FRONTEND NOTICE: Updated Admin Panel Order Schema

> **Document Version**: `v3.1.0 (Admin Order Schema Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Admin Panel Frontend Developers (`C:\Users\LENOVO\Desktop\adminMock`), Website & Mobile App Integration Engineers  
> **Effective Date**: Immediate  

---

## 📋 Summary of Schema Changes

1. ❌ **Removed Duplicate `id` Field**:
   - The duplicate `id` field has been removed. Use `order_id` as the primary identifier across all order components.
2. 🌆 **Added `city` & `state` Fields**:
   - Added explicit `city` and `state` attributes to each order object.
3. 🏠 **Formatted `full_address` / `delivery_address`**:
   - `full_address` and `delivery_address` are now formatted to include `flat`, `area`, `city`, `state`, and `pincode`:  
     `"Flat 420, Bais Godam, Noida, Rajasthan, 201301"`

---

## 📡 Updated Admin Order Response Payload (`HTTP 200 OK`)

### Applicable Endpoints:
- `GET /api/admin/users/:userId/orders`
- `GET /api/admin/orders`
- `GET /api/admin/orders/:orderId`

```json
{
  "code": 200,
  "status": "success",
  "message": "User orders with full items details retrieved successfully.",
  "data": [
    {
      "order_id": "ORD-5427",
      "user_id": "usr_708296",
      "vendor_id": 1216,
      "customer_name": "usher test update",
      "customer_phone": "5858585858",
      "phone": "5858585858",
      "store_name": "Verified Test Store",
      "vendor_name": "Owner Updated",
      "vendor_phone": "9784319840",
      "category": "Grocery",
      "status": "COMPLETED",
      "payment_status": "PAID",
      "payment_method": "COD / Online",
      "flat": "Flat 420",
      "area": "Bais Godam",
      "city": "Noida",
      "state": "Rajasthan",
      "pincode": "201301",
      "delivery_address": "Flat 420, Bais Godam, Noida, Rajasthan, 201301",
      "full_address": "Flat 420, Bais Godam, Noida, Rajasthan, 201301",
      "subtotal": 599,
      "service_charge": 0,
      "total_amount": 599,
      "total": 599,
      "items_count": 1,
      "items": [
        {
          "item_id": 1716,
          "item_name": "Lily bouquet",
          "name": "Lily bouquet",
          "quantity": 1,
          "unit_price": 599,
          "price": 599,
          "item_total": 599
        }
      ],
      "products": [
        {
          "item_id": 1716,
          "item_name": "Lily bouquet",
          "name": "Lily bouquet",
          "quantity": 1,
          "unit_price": 599,
          "price": 599,
          "item_total": 599
        }
      ],
      "created_at": "2026-09-01T11:38:33+05:30",
      "created_at_readable": "01 Sep 2026, 11:38 am IST"
    }
  ]
}
```

---

## 🛠️ Actions Required by Frontend Teams

1. **Admin Panel UI (`adminMock`)**:
   - Update order table & modal references to use `order.order_id` (remove any usage of `order.id`).
   - Access `order.city` and `order.state` directly in order detail cards.
   - Display `order.full_address` / `order.delivery_address` for formatted shipping addresses.

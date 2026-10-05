# Mobile App Developer Documentation: User Order Address & Society Fix

This documentation is specifically for **Mobile App Developers** working on the **Customer Mobile App / User Panel** (React Native / Expo / Flutter / Android / iOS).

---

## 1. Issue Resolved

### The Bug:
In the Customer Mobile App (User Panel), orders were displaying `"ARG Ananta"` / `"ag anantra"` as the delivery address/society, even when the customer ordered for a completely different address (e.g. *"Flat 101, Mahima Panache, Jagatpura"*), while the Vendor App was correctly showing the customer's actual address.

### Why This Happened:
1. When fetching user orders, the query performed `LEFT JOIN societies s ON o.society_id = s.society_id`. Since `society_id` was defaulted to `1` in the database, `s.society_name` always returned `"ARG Ananta"`.
2. The user order mapping was setting `society_name: ord.society_name`, which locked every order to `"ARG Ananta"`.
3. If the mobile app read `order.society_name`, `order.society`, `order.buildingNumber`, or `order.address`, it either got `"ARG Ananta"` or `undefined`.

### The Fix:
- The backend now dynamically extracts the **actual building/society** and **flat number** directly from the order's true `delivery_address` (and user profile).
- `"ARG Ananta"` will **never** override the customer's actual delivery location.
- All standard address and society field aliases are now populated consistently: `delivery_address`, `address`, `full_address`, `shipping_address`, `society_name`, `society`, `societyName`, `flatNumber`, `buildingNumber`.

---

## 2. API Endpoints for User Orders

### Endpoints
- **Fetch User Orders List:** `GET /api/orders/user/:userId` (or `GET /api/orders?user_id=:userId`, or `GET /api/users/:userId/orders`)
- **Single Order Details:** `GET /api/orders/:orderId`

### Headers
```http
Authorization: Bearer <user_jwt_token>
```

---

## 3. Order Response Schema (User Panel)

```json
{
  "success": true,
  "count": 1,
  "orders": [
    {
      "id": "ORD-7429",
      "order_id": "ORD-7429",
      "customer_name": "Aarav Patel",
      "phone": "9876543210",
      "store_name": "Royal Bakers",
      "delivery_address": "Flat 402, Royal Palms, C-Scheme, Jaipur",
      "address": "Flat 402, Royal Palms, C-Scheme, Jaipur",
      "full_address": "Flat 402, Royal Palms, C-Scheme, Jaipur",
      "shipping_address": "Flat 402, Royal Palms, C-Scheme, Jaipur",
      "flatNumber": "Flat 402",
      "buildingNumber": "Royal Palms",
      "flat": "Flat 402",
      "building": "Royal Palms",
      "society_name": "Royal Palms",
      "society": "Royal Palms",
      "societyName": "Royal Palms",
      "total": 160,
      "total_amount": 160,
      "status": "PLACED",
      "status_label": "Order Placed",
      "created_at": "2026-10-05T15:00:00+05:30",
      "items": [...]
    }
  ]
}
```

---

## 4. Mobile App UI Display Guide

In your React Native order card or order history screen:

```tsx
// Displaying full delivery address:
<Text style={styles.addressText}>
  {order.delivery_address || order.address}
</Text>

// Displaying flat & society tag:
<Text style={styles.societyTag}>
  {order.flatNumber}, {order.society_name}
</Text>
```
*(Both `order.delivery_address` and `order.society_name` now accurately reflect the customer's actual destination address, matching the Vendor Panel).*

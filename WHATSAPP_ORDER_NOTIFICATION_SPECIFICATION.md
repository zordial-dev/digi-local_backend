# 📦 DigiLocal — WhatsApp Order Placement & Vendor Notification Specification

This document specifies the exact API integration for placing orders on the DigiLocal Resident/User website or app and triggering real-time Firebase Push Notifications and Alarms to the Vendor App upon WhatsApp confirmation.

---

## 📌 Architecture Flow

```
[User Website/Panel] ──(1) POST /api/orders (notify_on_whatsapp: true)──> [Backend Database]
                                                                                │
                                                                       Returns whatsapp_url
                                                                                │
[User Clicks "Confirm via WhatsApp"] ──(2) POST /api/orders/:id/notify ───────> [Firebase FCM / Socket]
         │                                                                      │
         └─────────────(3) Opens WhatsApp (wa.me/...)───────────────────────────> [Vendor Phone & App]
```

---

## ⚙️ Base URLs

- **Local Network / Development**: `http://172.25.12.195:5001/api`
- **Production Server**: `https://digi-local-backend.onrender.com/api`

---

## 🛠️ API Specifications

### 1. Create New Order (`POST /api/orders`)

Creates the order record in the database and generates the WhatsApp checkout URL. Pass `"notify_on_whatsapp": true` to suppress immediate vendor push notifications until the customer actually clicks the WhatsApp confirmation button.

- **Endpoint**: `POST /api/orders`
- **Headers**: `Content-Type: application/json`

#### **Request Body Schema**
```json
{
  "vendor_id": 79,
  "customer_name": "Raj Kumar",
  "phone": "9571240742",
  "delivery_address": "Greenwood Residency • Tower A-402",
  "total_amount": 150,
  "notify_on_whatsapp": true,
  "items": [
    {
      "item_id": 36,
      "item_name": "Apple",
      "quantity": 1,
      "price": 150
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `vendor_id` | `number` | **Yes** | Vendor ID to receive the order |
| `customer_name` | `string` | **Yes** | Full name of the resident customer (e.g. `"Raj Kumar"`) |
| `phone` | `string` | **Yes** | Contact mobile number of the customer (e.g. `"9571240742"`) |
| `delivery_address` | `string` | **Yes** | Customer's delivery address / flat number |
| `total_amount` | `number` | **Yes** | Total order amount in INR (₹) |
| `notify_on_whatsapp`| `boolean`| **Yes** | Set to `true` to delay vendor notification until WhatsApp click |
| `items` | `array` | **Yes** | Array of cart item objects (`item_id`, `item_name`, `quantity`, `price`) |

#### **Success Response (`201 Created`)**
```json
{
  "order_id": "ORD-1485",
  "status": "PENDING",
  "created_at": "2026-08-11T09:30:00.000Z",
  "societyName": "Greenwood Residency",
  "whatsapp_url": "https://wa.me/919876543210?text=...",
  "whatsapp_message": "📦 *New Order from Greenwood Residency...*",
  "message": "Order placed successfully"
}
```

---

### 2. Trigger Vendor Push Notification (`POST /api/orders/:orderId/notify`)

Triggers the high-priority Firebase Cloud Messaging (FCM) push notification, Expo push notification, and Socket.io alarm sound to the vendor's app.

- **Endpoint**: `POST /api/orders/:orderId/notify` (or `POST /api/orders/:orderId/confirm-whatsapp`)
- **Headers**: `Content-Type: application/json`

#### **Success Response (`200 OK`)**
```json
{
  "success": true,
  "message": "Vendor push notification and alert sent successfully via Firebase/Socket",
  "order_id": "ORD-1485",
  "customer_name": "Raj Kumar",
  "total_amount": 150
}
```

---

## 💻 Frontend JavaScript / React Code Example

```javascript
const API_BASE_URL = 'http://172.25.12.195:5001/api';

/**
 * 1. Called when user clicks "Checkout / Place Order" on the website
 */
async function placeOrder(cartItems, userProfile, vendorId) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendor_id: vendorId,
        customer_name: userProfile.name, // e.g. "Raj Kumar"
        phone: userProfile.phone,        // e.g. "9571240742"
        delivery_address: userProfile.address,
        total_amount: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        notify_on_whatsapp: true,        // Delays vendor alarm until WhatsApp click
        items: cartItems.map(item => ({
          item_id: item.id,
          item_name: item.name,
          quantity: item.quantity,
          price: item.price
        }))
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to place order');
    }

    return result; // Returns { order_id: "ORD-1485", whatsapp_url: "https://wa.me/...", ... }
  } catch (error) {
    console.error('Order error:', error);
    alert(error.message);
  }
}

/**
 * 2. Called when user clicks "Confirm Order via WhatsApp" button
 */
async function handleConfirmWhatsAppClick(orderId, whatsappUrl) {
  // Fire Firebase Push Notification & Alarm to Vendor App asynchronously
  fetch(`${API_BASE_URL}/orders/${orderId}/notify`, {
    method: 'POST'
  }).catch(err => console.error('Failed to notify vendor:', err));

  // Instantly open WhatsApp link for customer to send message
  window.open(whatsappUrl, '_blank');
}
```

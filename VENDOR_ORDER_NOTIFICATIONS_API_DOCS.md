# 🔔 DigiLocal Vendor Order Push Notifications & Loud Sound Alerts — Specification & API Documentation

This document provides complete implementation specifications for **Zomato / Swiggy style High-Priority Push Notifications & Real-Time Sound Alerts** for the DigiLocal Vendor Application.

---

## 📌 1. Architecture Overview

```
 ┌──────────────────────┐             ┌────────────────────────┐             ┌─────────────────────────┐
 │ Resident Order Placed │ ─────────► │ DigiLocal Backend Node │ ─────────► │ FCM (Firebase Cloud)    │
 └──────────────────────┘             └───────────┬────────────┘             └────────────┬────────────┘
                                                  │                                       │
                                                  │ (Socket.IO Alert)                     │ (High-Priority Push)
                                                  ▼                                       ▼
                                      ┌────────────────────────────────────────────────────────┐
                                      │              Vendor Mobile App (React Native)          │
                                      │ - Loud Sound Channel: `new_order_alert_sound`          │
                                      │ - Real-time Socket Event: `NEW_ORDER_ALERT`            │
                                      └────────────────────────────────────────────────────────┘
```

---

## 🛠️ 2. Backend API Endpoints

### 2.1 Register FCM Device Push Token
**POST** `/api/vendorPanel/:vendorId/fcm-token` or `/api/vendors/fcm-token`

#### Request Body:
```json
{
  "fcm_token": "fcm_device_token_string_here_abcdef123456",
  "platform": "android"
}
```

#### Response (`200 OK`):
```json
{
  "message": "FCM Push Notification device token registered successfully"
}
```

---

### 2.2 Unregister FCM Token (On Vendor Logout)
**DELETE** `/api/vendorPanel/:vendorId/fcm-token` or `/api/vendors/fcm-token`

#### Response (`200 OK`):
```json
{
  "message": "FCM token removed successfully"
}
```

---

## 📲 3. Mobile App Push Payload Structure (FCM)

When a resident submits an order (`POST /api/orders`), the backend automatically builds and dispatches the following high-priority payload to Google Firebase FCM:

```json
{
  "token": "vendor_fcm_token",
  "notification": {
    "title": "🔔 NEW ORDER RECEIVED! (#1042)",
    "body": "Aarav Gupta placed an order worth ₹450.00 (3 items). Tap to view order details."
  },
  "android": {
    "priority": "high",
    "notification": {
      "channelId": "new_order_high_priority_channel",
      "sound": "new_order_alert_sound",
      "priority": "max",
      "visibility": "public"
    }
  },
  "apns": {
    "payload": {
      "aps": {
        "sound": "new_order_alert_sound.caf",
        "badge": 1
      }
    }
  },
  "data": {
    "type": "NEW_ORDER_RECEIVED",
    "order_id": "1042",
    "vendor_id": "103",
    "total_amount": "450.00",
    "sound": "new_order_alert_sound"
  }
}
```

---

## 🔌 4. WebSockets Real-Time Channel (Socket.IO)

Vendors can also connect to real-time WebSockets for instant, zero-latency alerts when the app is in the foreground:

### Connect & Join Vendor Channel:
```typescript
import io from 'socket.io-client';

const socket = io('http://172.25.12.195:5001');

// Join Vendor Notification Room
socket.emit('join_vendor_room', vendorId);

// Listen for New Order Audio Alert Event
socket.on('NEW_ORDER_ALERT', (data) => {
  console.log('🔔 NEW ORDER RECEIVED VIA SOCKET:', data);
  // Play custom loud audio chime
  playLoudOrderChime();
});
```

---

## 📱 5. Android Notification Channel Setup (React Native)

To ensure the notification plays loud audio even in Do-Not-Disturb (DND) or background mode, add this to `android/app/src/main/res/raw/`:
- Place `new_order_alert_sound.mp3` inside `android/app/src/main/res/raw/`.

And configure `@react-native-firebase/messaging` in React Native:

```typescript
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';

// Create High Priority Channel
PushNotification.createChannel(
  {
    channelId: 'new_order_high_priority_channel',
    channelName: 'High Priority New Orders',
    channelDescription: 'Loud sound notification channel for new incoming orders',
    soundName: 'new_order_alert_sound.mp3',
    importance: 4, // IMPORTANCE_HIGH
    vibrate: true,
  },
  (created) => console.log(`Notification channel created: ${created}`)
);
```

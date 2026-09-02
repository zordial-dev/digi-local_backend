# 📱 DigiLocal Platform - Complete Vendor App Master API Documentation

> **Document Version**: `v4.1.0 (Exhaustive Vendor Mobile App Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Vendor Mobile App Developers, Backend Engineers, QA Integration Testers  
> **Effective Date**: Immediate  

---

## 📋 General API Standards

- **Base URL**: `https://digilocal.in/api` (or `http://localhost:5000/api`)
- **Headers**:
  - `Content-Type: application/json`
  - `Authorization: Bearer <VENDOR_JWT_TOKEN>` *(for authenticated endpoints)*
- **Phone Fields**: All phone outputs include `country_code: "+91"` and `phone_number: "9876543210"`.
- **Timestamp Format**: All IST timestamps are formatted with `+05:30` offset (e.g., `created_at_ist: "2026-09-02T06:32:11+05:30"`).

---

## 1. Authentication & Account Lifecycle

### 1.1 Vendor Registration (`POST /api/vendors/register`)
Allows a new merchant to register a store. Merchants can submit **either GSTIN or PAN** (at least one is required).

#### Request Body
```json
{
  "vendor_name": "Aarushi",
  "store_name": "Flower's Point",
  "email": "aarushi20@gmail.com",
  "phone_number": "9784319840",
  "password": "Password123!",
  "gstin": "08ABCDE1234F1Z5",
  "pan_number": "",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "whatsapp_number": "9784319840",
  "shop_number": "Shop 101",
  "shop_image": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400",
  "category": "Grocery"
}
```

#### Response (`HTTP 201 Created`)
```json
{
  "code": 201,
  "status": "success",
  "message": "Vendor registered successfully. Account pending approval.",
  "data": {
    "vendor": {
      "vendor_id": 1216,
      "public_id": "38f192",
      "vendor_name": "Aarushi",
      "store_name": "Flower's Point",
      "email": "aarushi20@gmail.com",
      "country_code": "+91",
      "phone_number": "9784319840",
      "whatsapp_number": "9784319840",
      "gstin": "08ABCDE1234F1Z5",
      "pan_number": "",
      "status": "PENDING",
      "created_at_ist": "2026-09-02T12:30:00+05:30"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.2 Vendor Login (`POST /api/vendors/login`)
Authenticates a registered vendor using mobile number and password.

#### Request Body
```json
{
  "identifier": "9784319840",
  "password": "Password123!"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor login successful.",
  "data": {
    "vendor": {
      "vendor_id": 1216,
      "vendor_name": "Aarushi",
      "store_name": "Flower's Point",
      "email": "aarushi20@gmail.com",
      "country_code": "+91",
      "phone_number": "9784319840",
      "status": "ACTIVE"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.3 Send Auth OTP (`POST /api/vendors/send-otp`)

#### Request Body
```json
{
  "phone_number": "9784319840"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "OTP sent successfully to +919784319840."
}
```

---

### 1.4 Verify Auth OTP (`POST /api/vendors/verify-otp`)

#### Request Body
```json
{
  "phone_number": "9784319840",
  "otp": "123456"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "OTP verified successfully.",
  "data": {
    "vendor_id": 1216,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 1.5 Forgot Password (`POST /api/vendors/forgot-password`)

#### Request Body
```json
{
  "email": "aarushi20@gmail.com"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Password reset verification code sent."
}
```

---

### 1.6 Reset Password (`POST /api/vendors/reset-password`)

#### Request Body
```json
{
  "phone_number": "9784319840",
  "otp": "123456",
  "new_password": "NewPassword123!"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Password updated successfully. Please login with your new password."
}
```

---

### 1.7 Check Phone Registration (`POST /api/vendors/check-phone`)

#### Request Body
```json
{
  "phone_number": "9784319840"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "exists": true,
  "message": "Account exists with this phone number."
}
```

---

### 1.8 Refresh Access Token (`POST /api/vendors/refresh`)

#### Request Body
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 1.9 Vendor Status Check (`GET /api/vendors/status` or `GET /api/vendors/status/:vendorId`)

#### Headers
`Authorization: Bearer <TOKEN>`

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": {
    "vendor_id": 1216,
    "store_name": "Flower's Point",
    "status": "ACTIVE",
    "is_blocked": false,
    "hold_reason": "",
    "can_add_items": true
  }
}
```

---

### 1.10 Resubmit Application (`POST /api/vendors/resubmit`)

#### Request Body
```json
{
  "vendor_id": 1216,
  "store_name": "Flower's Point Updated",
  "gstin": "08ABCDE1234F1Z5",
  "shop_number": "Shop 102",
  "shop_image": "https://images.unsplash.com/photo-1534723452862-4c874018d66d?w=400"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor application resubmitted successfully for review.",
  "data": {
    "vendor_id": 1216,
    "status": "PENDING",
    "has_resubmitted": true,
    "resubmitted_at_ist": "2026-09-02T12:35:00+05:30"
  }
}
```

---

### 1.11 Vendor Logout (`POST /api/vendors/logout`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Logged out successfully."
}
```

---

## 2. Store Dashboard & Settings

### 2.1 Get Full Vendor Dashboard (`GET /api/vendorPanel/:vendorId`)

#### Headers
`Authorization: Bearer <TOKEN>`

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": {
    "vendor": {
      "vendor_id": 1216,
      "store_name": "Flower's Point",
      "vendor_name": "Aarushi",
      "country_code": "+91",
      "phone_number": "9784319840",
      "status": "ACTIVE",
      "opening_time": "08:00 AM",
      "closing_time": "01:00 AM",
      "min_order_value": 0,
      "delivery_charge": 20,
      "total_orders": 4,
      "total_revenue": 136797.00
    },
    "recent_orders": [],
    "top_items": []
  }
}
```

---

### 2.2 Update Store Settings & Timings (`PUT /api/vendors/:vendorId/settings`)

#### Request Body
```json
{
  "opening_time": "08:00 AM",
  "closing_time": "11:00 PM",
  "min_order_value": 100,
  "delivery_charge": 25,
  "max_quantity_limit": 15
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Store settings updated successfully.",
  "data": {
    "opening_time": "08:00 AM",
    "closing_time": "11:00 PM",
    "min_order_value": 100,
    "delivery_charge": 25,
    "max_quantity_limit": 15
  }
}
```

---

### 2.3 Upload Store Logo (`POST /api/vendorPanel/:vendorId/logo`)

#### Form Data (`multipart/form-data`)
- `file`: `<IMAGE_FILE_BINARY>`

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Store logo updated successfully.",
  "data": {
    "logo_url": "https://digilocal.in/uploads/item_1788330000_a1b2c3.jpg"
  }
}
```

---

## 3. Product Catalog & Inventory Management

### 3.1 Get Store Items (`GET /api/vendors/:vendorId/items`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "item_id": 1716,
      "vendor_id": 1216,
      "item_name": "Lily bouquet",
      "price": 599.00,
      "category": "Grocery",
      "description": "Fresh Lily bouquet",
      "in_stock": true,
      "image_url": "https://media.gettyimages.com/id/1492597110/photo/flower-bouquets.jpg"
    }
  ]
}
```

---

### 3.2 Add Item to Store (`POST /api/vendors/:vendorId/items`)

#### Headers
`Authorization: Bearer <TOKEN>`

#### Request Body
```json
{
  "item_name": "Red Rose Bouquet",
  "price": 499,
  "category": "Flowers",
  "description": "Bunch of 12 fresh red roses",
  "in_stock": true,
  "image_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400"
}
```

#### Response (`HTTP 201 Created`)
```json
{
  "code": 201,
  "status": "success",
  "message": "Item added to store successfully.",
  "data": {
    "item_id": 1719,
    "vendor_id": 1216,
    "item_name": "Red Rose Bouquet",
    "price": 499.00,
    "category": "Flowers",
    "in_stock": true
  }
}
```

---

### 3.3 Update Item (`PUT /api/vendors/:vendorId/items/:itemId`)

#### Request Body
```json
{
  "item_name": "Red Rose Bouquet (Special)",
  "price": 549,
  "in_stock": true
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Item updated successfully.",
  "data": {
    "item_id": 1719,
    "item_name": "Red Rose Bouquet (Special)",
    "price": 549.00,
    "in_stock": true
  }
}
```

---

### 3.4 Toggle Item Availability (`PATCH /api/vendorPanel/items/:itemId/availability`)

#### Request Body
```json
{
  "in_stock": false
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Item stock status updated.",
  "data": {
    "item_id": 1719,
    "in_stock": false
  }
}
```

---

### 3.5 Delete Item (`DELETE /api/vendors/:vendorId/items/:itemId`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Item deleted from store catalog."
}
```

---

### 3.6 Upload Product Image (`POST /api/vendorPanel/upload-image`)

#### Form Data (`multipart/form-data`)
- `file`: `<IMAGE_FILE_BINARY>`

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": {
    "image_url": "https://digilocal.in/uploads/item_1788330000_a1b2c3.jpg"
  }
}
```

---

## 4. Vendor Order Management

### 4.1 Get Vendor Orders (`GET /api/vendors/:vendorId/orders`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "order_id": "ORD-5427",
      "vendor_id": 1216,
      "customer_name": "usher test update",
      "country_code": "+91",
      "phone_number": "5858585858",
      "total_amount": 599.00,
      "status": "COMPLETED",
      "payment_method": "COD",
      "delivery_address": "Flat 420, Bais Godam, Noida, Uttar Pradesh, 201301",
      "created_at_ist": "2026-09-01T11:38:33+05:30",
      "items": [
        {
          "item_id": 1716,
          "item_name": "Lily bouquet",
          "quantity": 1,
          "price": 599.00
        }
      ]
    }
  ]
}
```

---

### 4.2 Update Order Status (`PUT /api/vendors/:vendorId/orders/:orderId/status`)
Pipeline status sequence: `PENDING` ➔ `CONFIRMED` ➔ `OUT_FOR_DELIVERY` ➔ `COMPLETED` (or `CANCELLED`).

#### Request Body
```json
{
  "status": "CONFIRMED"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Order status updated to CONFIRMED.",
  "data": {
    "order_id": "ORD-5427",
    "status": "CONFIRMED"
  }
}
```

---

## 5. Service Vendor Enquiries

### 5.1 Get Received Enquiries (`GET /api/vendors/:vendorId/enquiries`)
Fetches service enquiries submitted by residents to service vendors (e.g. Electrician, Plumber, AC Repair).

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "enquiry_id": 51,
      "vendor_id": 1216,
      "user_name": "Garvit",
      "country_code": "+91",
      "user_phone": "9876543210",
      "service_type": "AC Repair",
      "preferred_time": "Tomorrow 10:00 AM",
      "description": "AC not cooling properly",
      "status": "PENDING",
      "created_at_ist": "2026-09-02T10:15:00+05:30"
    }
  ]
}
```

---

### 5.2 Update Enquiry Status (`PUT /api/vendors/:vendorId/enquiries/:enquiryId`)

#### Request Body
```json
{
  "status": "ACCEPTED"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Enquiry status updated to ACCEPTED."
}
```

---

## 6. Banking & Payment Setup

### 6.1 Update Payment Details (`PUT /api/vendors/:vendorId/payment-details`)

#### Request Body
```json
{
  "account_number": "50100492817291",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "account_holder_name": "Aarushi",
  "upi_id": "9784319840@upi",
  "accepted_payment_methods": "[\"UPI\",\"COD\"]"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Payment and banking details updated successfully.",
  "data": {
    "account_number": "50100492817291",
    "ifsc_code": "HDFC0001234",
    "bank_name": "HDFC Bank",
    "upi_id": "9784319840@upi"
  }
}
```

---

### 6.2 Get Vendor Payout & Payment Transactions (`GET /api/vendors/:id/payments`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "transaction_id": "TXN-94021",
      "amount": 135000.00,
      "payment_status": "PAID",
      "payment_method": "UPI",
      "created_at_ist": "2026-09-01T12:19:46+05:30"
    }
  ]
}
```

---

## 7. Serviceable Coverage & Delivery Area

### 7.1 Update Serviceable Coverage (`PUT /api/vendors/:vendorId/coverage`)

#### Request Body
```json
{
  "delivery_radius_km": 5.0,
  "is_global_coverage": false,
  "selected_zones": ["Sector 62", "Bais Godam"]
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Serviceable coverage updated successfully."
}
```

---

### 7.2 Get Location Suggestions (`GET /api/vendors/locations/suggestions?query=Noida`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "data": [
    {
      "location_id": 54,
      "area": "Sector 62 Commercial Area",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    }
  ]
}
```

---

## 8. Push Notifications & Device Tokens

### 8.1 Register FCM Push Device Token (`POST /api/vendors/fcm-token`)

#### Request Body
```json
{
  "vendor_id": 1216,
  "fcm_token": "fcm_token_sample_string_12345",
  "device_type": "android",
  "platform": "android"
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "FCM device push token registered successfully."
}
```

---

### 8.2 Delete FCM Push Device Token (`DELETE /api/vendors/fcm-token`)

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "FCM device push token removed."
}
```

---

## 9. Subscription Renewal & Account Deletion

### 9.1 Renew Subscription (`POST /api/vendorPanel/:vendorId/renew`)

#### Request Body
```json
{
  "subscription_tier": "pro",
  "duration_months": 12
}
```

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor subscription renewed successfully until 30 Dec 2027.",
  "data": {
    "renewal_date": "2027-12-30T18:30:00.000Z",
    "subscription_tier": "pro"
  }
}
```

---

### 9.2 Delete Store Account (`DELETE /api/vendorPanel/:vendorId`)

#### Headers
`Authorization: Bearer <TOKEN>`

#### Response (`HTTP 200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "Vendor store account deleted successfully."
}
```

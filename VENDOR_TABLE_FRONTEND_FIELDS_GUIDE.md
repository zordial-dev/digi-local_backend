# 🏪 Frontend Developer Reference: `vendors` Table API Fields

> **Document Version**: `v3.2.0 (Frontend Developer Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Target Audience**: Vendor Mobile App Developers, Website Developers, Admin Panel Developers  

---

## 📋 Table of Contents
1. [Overview](#1-overview)
2. [Relevant Vendor Fields for Frontend UI](#2-relevant-vendor-fields-for-frontend-ui)
3. [Vendor Profile Response JSON Example](#3-vendor-profile-response-json-example)
4. [Field Usage Matrix by App/Panel](#4-field-usage-matrix-by-apppanel)

---

## 1. Overview

This document provides a clean, curated reference of all **relevant frontend fields** returned by vendor APIs (`GET /api/vendors/:id`, `GET /api/vendors/profile`, `GET /api/admin/vendors/:id`). Obsolete location columns (`latitude`, `longitude`, `location_type`, `is_global_coverage`, `delivery_radius_km`, `selected_zones`) have been dropped.

---

## 2. Relevant Vendor Fields for Frontend UI

### 🆔 1. Identifiers & Account Status
| Field Name | Type | Description | Example Value |
|---|---|---|---|
| `vendor_id` | `number` | Unique numeric vendor ID | `1217` |
| `public_id` | `string` | Human-readable public ID | `"VND-1217"` |
| `status` | `string` | Account status (`active`, `pending`, `hold`, `blocked`) | `"active"` |
| `vendor_type` | `string` | Vendor business type (`product`, `service`) | `"product"` |
| `can_add_items` | `boolean` | Flag whether vendor can add catalog products | `true` |

---

### 🏪 2. Store & Merchant Identity
| Field Name | Type | Description | Example Value |
|---|---|---|---|
| `store_name` | `string` | Shop / Business name | `"FreshMart Super Store"` |
| `vendor_name` / `owner_name` | `string` | Merchant owner name | `"Lovely Merchant"` |
| `email` | `string` | Registered merchant email | `"freshmart@gmail.com"` |
| `phone_number` / `phone` | `string` | Primary contact mobile number | `"9509512187"` |
| `whatsapp_number` | `string` | WhatsApp order contact number | `"919509512187"` |
| `category` | `string` | Primary store category | `"Grocery & Daily Needs"` |
| `description` | `string` | Store bio / description | `"Fresh groceries delivered in 30 mins"` |
| `logo` / `shop_image` | `string` | Store banner / logo image URL | `"https://images.unsplash.com/..."` |
| `opening_time` | `string` | Store opening time | `"08:00 AM"` |
| `closing_time` | `string` | Store closing time | `"10:00 PM"` |

---

### 📍 3. Location & Address Details
| Field Name | Type | Description | Example Value |
|---|---|---|---|
| `society_id` | `number` | Primary linked Housing Society ID | `1` |
| `society_name` | `string` | Housing Society name | `"Omaxe Greenwood Residency"` |
| `area` / `location` | `string` | Locality / Sector name | `"Sector 62 Commercial Area"` |
| `shop_number` | `string` | Shop / Unit number | `"Shop No. 12"` |
| `city` | `string` | City | `"Noida"` |
| `state` | `string` | State | `"Uttar Pradesh"` |
| `pincode` | `string` | Postal code | `"201301"` |
| `address` / `location_address` | `string` | Full physical address | `"Shop 12, Main Market, Sector 62, Noida, 201301"` |

---

### 💰 4. Store Operations & Pricing Rules
| Field Name | Type | Description | Example Value |
|---|---|---|---|
| `min_order_value` | `number` | Minimum order value in ₹ | `0` |
| `delivery_charge` | `number` | Delivery fee in ₹ | `20` |
| `gst_percentage` | `number` | Applicable GST percentage rate | `5` |
| `gstin` | `string` | GST tax number | `"07AAAAA0000A1Z5"` |
| `pan_number` | `string` | PAN card number | `"ABCDE1234F"` |

---

### 💳 5. Payout & Bank Settlement Details
| Field Name | Type | Description | Example Value |
|---|---|---|---|
| `account_number` | `string` | Settlement bank account number | `"918005625999"` |
| `ifsc_code` | `string` | Bank IFSC code | `"HDFC0001234"` |
| `bank_name` | `string` | Settlement bank name | `"HDFC Bank"` |
| `account_holder_name` | `string` | Bank account holder name | `"Lovely Merchant"` |
| `upi_id` | `string` | UPI VPA ID | `"freshmart@hdfcbank"` |
| `qr_code_url` | `string` | UPI QR Code image URL | `"https://..."` |
| `accepted_payment_methods` | `string` | Accepted methods CSV | `"COD,UPI,BANK_TRANSFER,QR_CODE"` |

---

## 3. Vendor Profile Response JSON Example

```json
{
  "success": true,
  "vendor_id": 1217,
  "public_id": "VND-1217",
  "store_name": "FreshMart Super Store",
  "vendor_name": "Lovely Merchant",
  "owner_name": "Lovely Merchant",
  "email": "freshmart@gmail.com",
  "phone_number": "9509512187",
  "whatsapp_number": "919509512187",
  "category": "Grocery & Daily Needs",
  "description": "Fresh groceries delivered in 30 mins",
  "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
  "status": "active",
  "society_id": 1,
  "society_name": "Omaxe Greenwood Residency",
  "area": "Sector 62 Commercial Area",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "address": "Shop 12, Main Market, Sector 62, Noida, 201301",
  "min_order_value": 0,
  "delivery_charge": 20,
  "gst_percentage": 5,
  "gstin": "07AAAAA0000A1Z5",
  "pan_number": "ABCDE1234F",
  "account_number": "918005625999",
  "ifsc_code": "HDFC0001234",
  "bank_name": "HDFC Bank",
  "account_holder_name": "Lovely Merchant",
  "upi_id": "freshmart@hdfcbank",
  "accepted_payment_methods": "COD,UPI,BANK_TRANSFER,QR_CODE"
}
```

---

## 4. Field Usage Matrix by App/Panel

| Field Name | Vendor Merchant App | Website Storefront | Admin Panel Dashboard |
|---|:---:|:---:|:---:|
| `store_name` | ✅ (Editable) | ✅ (Display) | ✅ (Display / Edit) |
| `vendor_name` | ✅ (Editable) | ❌ | ✅ (Display / Edit) |
| `phone_number` | ✅ (Editable) | ✅ (Contact) | ✅ (Display / Edit) |
| `category` | ✅ (Editable) | ✅ (Filter) | ✅ (Display / Edit) |
| `area` / `city` / `pincode` | ✅ (Editable) | ✅ (Search / Filter) | ✅ (Display / Edit) |
| `min_order_value` | ✅ (Editable) | ✅ (Checkout Rule) | ✅ (Display / Edit) |
| `delivery_charge` | ✅ (Editable) | ✅ (Checkout Math) | ✅ (Display / Edit) |
| `upi_id` / `qr_code_url` | ✅ (Bank Settings) | ✅ (Payment Screen) | ✅ (Audit) |
| `status` | ✅ (Readonly) | ❌ | ✅ (Approve / Block) |

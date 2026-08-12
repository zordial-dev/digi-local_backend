# DigiLocal — User Panel (Resident App) REST API Documentation
**Document Version:** 1.0.0  
**Base URL:** `http://localhost:5000/api` (Production: `https://digi-local-backend.onrender.com/api`)  
**Authentication:** Bearer JWT Token in Header `Authorization: Bearer <ACCESS_TOKEN>`

---

## 📋 Table of Contents
1. [User Authentication & Account APIs](#1-user-authentication--account-apis)
   - [1.1 Send Mobile/Email OTP (`POST /api/users/send-otp`)](#11-send-mobileemail-otp-post-apiuserssend-otp)
   - [1.2 Verify Mobile/Email OTP (`POST /api/users/verify-otp`)](#12-verify-mobileemail-otp-post-apiusersverify-otp)
   - [1.3 Resident User Registration (`POST /api/users/register`)](#13-resident-user-registration-post-apiusersregister)
   - [1.4 Resident User Login (`POST /api/users/login`)](#14-resident-user-login-post-apiuserslogin)
   - [1.5 Get User Profile (`GET /api/users/profile`)](#15-get-user-profile-get-apiusersprofile)
2. [Housing Societies & Enclaves APIs](#2-housing-societies--enclaves-apis)
   - [2.1 List / Search Housing Societies (`GET /api/societies`)](#21-list--search-housing-societies-get-apisocieties)
   - [2.2 Get Housing Society Details (`GET /api/societies/:id`)](#22-get-housing-society-details-get-apisocietiesid)
   - [2.3 Onboard New Housing Society (`POST /api/societies`)](#23-onboard-new-housing-society-post-apisocieties)
   - [2.4 List Society Onboarded Stores (`GET /api/societies/:societyId/vendors`)](#24-list-society-onboarded-stores-get-apisocietiessocietyidvendors)
3. [Vendor Storefront & Catalog APIs](#3-vendor-storefront--catalog-apis)
   - [3.1 Get Vendor Store Profile & Product Catalog (`GET /api/vendors/:id`)](#31-get-vendor-store-profile--product-catalog-get-apivendorsid)
4. [Orders & Checkout APIs](#4-orders--checkout-apis)
   - [4.1 Create Customer Order (`POST /api/orders`)](#41-create-customer-order-post-apiorders)
   - [4.2 List Resident Order History (`GET /api/users/:userId/orders`)](#42-list-resident-order-history-get-apiusersuseridorders)
   - [4.3 Get Single Order Breakdown (`GET /api/orders/:orderId`)](#43-get-single-order-breakdown-get-apiordersorderid)

---

## 1. User Authentication & Account APIs

### 1.1 Send Mobile/Email OTP (`POST /api/users/send-otp`)
Generates a 6-digit numeric OTP sent via SMS/Email to verify the resident's mobile number.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/send-otp`
- **Authentication Required:** No (Public)
- **Headers:** `Content-Type: application/json`

#### Input Parameters:
| Field Name | Data Type | Required? | Description |
|---|---|---|---|
| `phone` | `String` | **Required** | Resident 10-digit mobile number (e.g. `"9571240742"`) |
| `email` | `String` | *Optional* | Resident email address for email verification |

#### Request Body Example:
```json
{
  "phone": "9571240742"
}
```

#### Success Response (200 OK):
```json
{
  "message": "OTP sent successfully to phone number",
  "phone": "9571240742"
}
```

#### Error Responses:
- **400 Bad Request:** Missing phone number.
  ```json
  { "error": "Phone number or email address is required to send OTP" }
  ```

---

### 1.2 Verify Mobile/Email OTP (`POST /api/users/verify-otp`)
Verifies the 6-digit OTP code sent to the resident's mobile number.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/verify-otp`
- **Authentication Required:** No (Public)
- **Headers:** `Content-Type: application/json`

#### Input Parameters:
| Field Name | Data Type | Required? | Description |
|---|---|---|---|
| `mobile` | `String` | **Required** | Resident 10-digit mobile number |
| `otp` | `String` | **Required** | 6-digit numeric OTP code (e.g. `"123456"`) |

#### Request Body Example:
```json
{
  "mobile": "9571240742",
  "otp": "123456"
}
```

#### Success Response (200 OK):
```json
{
  "message": "OTP verified successfully",
  "mobile": "9571240742"
}
```

#### Error Responses:
- **400 Bad Request:** Invalid or expired OTP code.
  ```json
  { "error": "Invalid OTP code" }
  ```

---

### 1.3 Resident User Registration (`POST /api/users/register`)
Registers a new resident account using mobile number as the primary identifier.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/register`
- **Authentication Required:** No (Public)
- **Headers:** `Content-Type: application/json`

#### Input Parameters:
| Field Name | Data Type | Required? | Description |
|---|---|---|---|
| `mobile` | `String` | **Required** | Resident 10-digit mobile number (Accepts: `mobile`, `phone`, `phone_number`) |
| `password` | `String` | **Required** | Account password |
| `name` | `String` | *Optional* | Resident full name (e.g. `"Rohan Mehta"`) |
| `society_id` | `Number`/`String` | *Optional* | Housing society ID (Default: `1`) |
| `flat` | `String` | *Optional* | Flat/Tower address (e.g. `"Tower A-402"`) |
| `email` | `String` | *Optional* | Email address |
| `otp` | `String` | *Optional* | OTP code (required only if strict mode is enabled) |

#### Request Body Example:
```json
{
  "name": "Rohan Mehta",
  "mobile": "9571240742",
  "password": "UserPassword123!",
  "society_id": 1,
  "flat": "Tower A-402"
}
```

#### Success Response (201 Created):
```json
{
  "message": "User registered successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_379378",
    "name": "Rohan Mehta",
    "phone": "9571240742",
    "society_id": "1",
    "society_name": "Omaxe Greenwood Residency",
    "flat": "Tower A-402",
    "joined_date": "August 2026"
  }
}
```

#### Error Responses:
- **400 Bad Request:** Missing mandatory fields.
  ```json
  { "error": "Mobile number and password are required for registration." }
  ```

---

### 1.4 Resident User Login (`POST /api/users/login`)
Authenticates a resident user via mobile number and password.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/users/login`
- **Authentication Required:** No (Public)
- **Headers:** `Content-Type: application/json`

#### Input Parameters:
| Field Name | Data Type | Required? | Description |
|---|---|---|---|
| `mobile` | `String` | **Required** | Resident mobile number (Accepts: `mobile`, `phone`, `identifier`) |
| `password` | `String` | **Required** | Account password |

#### Request Body Example:
```json
{
  "mobile": "9571240742",
  "password": "UserPassword123!"
}
```

#### Success Response (200 OK):
```json
{
  "message": "User login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": "usr_379378",
    "name": "Rohan Mehta",
    "phone": "9571240742",
    "society_id": "1",
    "society_name": "Omaxe Greenwood Residency",
    "flat": "Tower A-402",
    "joined_date": "August 2026",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
  }
}
```

#### Error Responses:
- **401 Unauthorized:** Invalid mobile number or wrong password.
  ```json
  { "error": "Invalid mobile number or password" }
  ```

---

### 1.5 Get User Profile (`GET /api/users/profile`)
Fetches account details and housing society information for the logged-in resident.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/users/profile` (Alias: `/api/users/me`)
- **Authentication Required:** Yes (`Authorization: Bearer <ACCESS_TOKEN>`)
- **Headers:** `Authorization: Bearer <TOKEN>`

#### Request Query / Body: None

#### Success Response (200 OK):
```json
{
  "user_id": "usr_379378",
  "name": "Rohan Mehta",
  "email": null,
  "phone": "9571240742",
  "society_id": "1",
  "society_name": "Omaxe Greenwood Residency",
  "flat": "Tower A-402",
  "joined_date": "August 2026",
  "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
}
```

---

### 1.6 Delete User Account (`DELETE /api/users/profile`)
Permanently deletes the resident user's account and profile details from the platform.

- **HTTP Method:** `DELETE`
- **Endpoint:** `/api/users/profile` (Aliases: `/api/users/me`, `/api/users/:userId`)
- **Authentication Required:** Yes (`Authorization: Bearer <ACCESS_TOKEN>`)
- **Headers:** `Authorization: Bearer <ACCESS_TOKEN>`

#### Success Response (200 OK):
```json
{
  "success": true,
  "message": "User account for \"Rohan Mehta\" (ID: usr_379378) deleted successfully.",
  "user_id": "usr_379378"
}
```

#### Error Responses:
- **401 Unauthorized:** Missing or invalid access token.
- **404 Not Found:** User account not found.

---


## 2. Housing Societies & Enclaves APIs

### 2.1 List / Search Housing Societies (`GET /api/societies`)
Lists all onboarded housing societies for resident discovery during registration or society switching.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies`
- **Authentication Required:** No (Public)

#### Query Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `search` | `String` | *Optional* | Search query matching society name or city (e.g. `?search=Greenwood`) |

#### Request Example:
`GET /api/societies?search=Greenwood`

#### Success Response (200 OK):
```json
[
  {
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "location": "Jaipur, Rajasthan",
    "secretary_name": "Rajesh Varma",
    "secretary_mobile": "9876543210",
    "public_id": "SOC-1",
    "status": "active"
  }
]
```

---

### 2.2 Get Housing Society Details (`GET /api/societies/:id`)
Fetches details of a specific housing society by ID.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies/:id`
- **Authentication Required:** No (Public)

#### URL Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `id` | `Number` | **Required** | Society ID (e.g. `1`) |

#### Success Response (200 OK):
```json
{
  "society_id": 1,
  "society_name": "Omaxe Greenwood Residency",
  "location": "Jaipur, Rajasthan",
  "secretary_name": "Rajesh Varma",
  "secretary_mobile": "9876543210",
  "public_id": "SOC-1",
  "status": "active"
}
```

---

### 2.3 Onboard New Housing Society (`POST /api/societies`)
Allows residents or society secretaries to submit a request to onboard a new residential society.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/societies`
- **Authentication Required:** No (Public)
- **Headers:** `Content-Type: application/json`

#### Input Parameters:
| Field Name | Data Type | Required? | Description |
|---|---|---|---|
| `society_name` | `String` | **Required** | Official name of housing society |
| `location` | `String` | **Required** | City / Locality address |
| `secretary_name` | `String` | **Required** | Secretary or contact person name |
| `secretary_mobile` | `String` | **Required** | 10-digit contact mobile number |

#### Request Body Example:
```json
{
  "society_name": "Royal Garden Enclave",
  "location": "Viman Nagar, Sector 4, Pune, Maharashtra",
  "secretary_name": "Vikram Mehta",
  "secretary_mobile": "9876543210"
}
```

#### Success Response (201 Created):
```json
{
  "message": "Society onboarded successfully",
  "society_id": 105,
  "society": {
    "society_id": 105,
    "society_name": "Royal Garden Enclave",
    "location": "Viman Nagar, Sector 4, Pune, Maharashtra",
    "secretary_name": "Vikram Mehta",
    "secretary_mobile": "9876543210"
  }
}
```

---

### 2.4 List Society Onboarded Stores (`GET /api/societies/:societyId/vendors`)
Lists all active stores/merchants servicing a specific housing society.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/societies/:societyId/vendors`
- **Authentication Required:** No (Public)

#### URL Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `societyId` | `Number` | **Required** | Society ID (e.g. `1`) |

#### Query Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `search` | `String` | *Optional* | Search store name or category (e.g. `?search=grocery`) |

#### Success Response (200 OK):
```json
[
  {
    "vendor_id": 13,
    "store_name": "FreshMart Grocery & Organic",
    "vendor_name": "Rajesh Sharma",
    "email": "freshmart@gmail.com",
    "phone_number": "9876543210",
    "gst_number": "07AAACR12341Z5",
    "opening_time": "08:00 AM",
    "closing_time": "10:00 PM",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
    "description": "Quality goods & daily essentials delivered within society via WhatsApp.",
    "society_id": 1
  }
]
```

---

## 3. Vendor Storefront & Catalog APIs

### 3.1 Get Vendor Store Profile & Product Catalog (`GET /api/vendors/:id`)
Fetches vendor storefront profile details and full product catalog. Accepts `vendor_id` (numeric `13`), `public_id` (alphanumeric `5BFHDR`), or vendor `email` (`freshmart@gmail.com`).

- **HTTP Method:** `GET`
- **Endpoint:** `/api/vendors/:id`
- **Authentication Required:** No (Public)

#### URL Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `id` | `String`/`Number` | **Required** | Numeric ID (`13`), Public ID (`5BFHDR`), or Email (`freshmart@gmail.com`) |

#### Request Example:
- `GET /api/vendors/13`
- `GET /api/vendors/5BFHDR`
- `GET /api/vendors/freshmart@gmail.com`

#### Success Response (200 OK):
```json
{
  "vendor_id": 13,
  "public_id": "5BFHDR",
  "store_name": "FreshMart Grocery & Organic",
  "vendor_name": "Rajesh Sharma",
  "email": "freshmart@gmail.com",
  "phone_number": "9876543210",
  "opening_time": "08:00 AM",
  "closing_time": "10:00 PM",
  "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200",
  "description": "Quality goods & daily essentials delivered within society via WhatsApp.",
  "society_id": 1,
  "status": "ACTIVE",
  "items": [
    {
      "item_id": 15,
      "item_name": "Cake",
      "price": 500.00,
      "category": "Grocery",
      "description": "Special fresh baked cake",
      "image_url": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400",
      "in_stock": true
    },
    {
      "item_id": 18,
      "item_name": "Bread",
      "price": 75.00,
      "category": "Grocery",
      "description": "Fresh brown wheat bread",
      "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
      "in_stock": true
    }
  ]
}
```

#### Error Responses:
- **404 Not Found:** Store ID or email does not exist.
  ```json
  { "error": "Vendor not found" }
  ```

---

## 4. Orders & Checkout APIs

### 4.1 Create Customer Order (`POST /api/orders`)
Places a new order with vendor items for home delivery within the society.

- **HTTP Method:** `POST`
- **Endpoint:** `/api/orders`
- **Authentication Required:** Yes (`Authorization: Bearer <TOKEN>`) or Optional
- **Headers:** `Content-Type: application/json`

#### Input Parameters:
| Field Name | Data Type | Required? | Description |
|---|---|---|---|
| `vendor_id` | `Number` | **Required** | Merchant vendor ID (e.g. `13`) |
| `items` | `Array[Object]` | **Required** | Array of selected catalog items |
| `items[].item_id` | `Number` | **Required** | Item ID |
| `items[].quantity` | `Number` | **Required** | Quantity ordered (e.g. `1`) |
| `items[].price` | `Number` | **Required** | Unit price (e.g. `500.00`) |
| `delivery_address` | `String` | *Optional* | Delivery flat/tower address |

#### Request Body Example:
```json
{
  "vendor_id": 13,
  "delivery_address": "Tower A, Flat 402, Greenwood Residency",
  "items": [
    { "item_id": 15, "quantity": 1, "price": 500.00 },
    { "item_id": 18, "quantity": 2, "price": 75.00 }
  ]
}
```

#### Success Response (201 Created):
```json
{
  "message": "Order created successfully",
  "order_id": "ORD-5366",
  "total_amount": 650.00,
  "status": "PENDING"
}
```

#### Error Responses:
- **400 Bad Request:** Empty items array or invalid vendor ID.
  ```json
  { "error": "Order must contain at least one item and a valid vendor_id" }
  ```

---

### 4.2 List Resident Order History (`GET /api/users/:userId/orders`)
Fetches all past and active orders placed by the resident user.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/users/:userId/orders` (Alias: `/api/orders/user/:userId`)
- **Authentication Required:** Yes (`Authorization: Bearer <TOKEN>`)

#### URL Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `userId` | `String` | **Required** | Resident User ID (e.g. `"usr_379378"`) |

#### Success Response (200 OK):
```json
[
  {
    "order_id": "ORD-5366",
    "user_id": "usr_379378",
    "vendor_id": 13,
    "store_name": "FreshMart Grocery & Organic",
    "total_amount": 650.00,
    "status": "PENDING",
    "created_at": "2026-08-05T13:26:00.000Z",
    "society_name": "Omaxe Greenwood Residency",
    "delivery_address": "Tower A, Flat 402, Greenwood Residency",
    "items": [
      {
        "item_name": "Cake",
        "quantity": 1,
        "price": 500.00
      },
      {
        "item_name": "Bread",
        "quantity": 2,
        "price": 75.00
      }
    ]
  }
]
```

---

### 4.3 Get Single Order Breakdown (`GET /api/orders/:orderId`)
Fetches detailed itemized breakdown and status for a single order.

- **HTTP Method:** `GET`
- **Endpoint:** `/api/orders/:orderId`
- **Authentication Required:** Yes (`Authorization: Bearer <TOKEN>`)

#### URL Parameters:
| Parameter | Data Type | Required? | Description |
|---|---|---|---|
| `orderId` | `String` | **Required** | Order ID (e.g. `"ORD-5366"`) |

#### Success Response (200 OK):
```json
{
  "order_id": "ORD-5366",
  "user_id": "usr_379378",
  "vendor_id": 13,
  "store_name": "FreshMart Grocery & Organic",
  "total_amount": 650.00,
  "status": "PENDING",
  "delivery_address": "Tower A, Flat 402, Greenwood Residency",
  "created_at": "2026-08-05T13:26:00.000Z",
  "items": [
    {
      "item_name": "Cake",
      "quantity": 1,
      "price": 500.00
    },
    {
      "item_name": "Bread",
      "quantity": 2,
      "price": 75.00
    }
  ]
}
```

#### Error Responses:
- **404 Not Found:** Order ID does not exist.
  ```json
  { "error": "Order not found" }
  ```

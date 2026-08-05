# DigiLocal Backend — Complete API & Architecture Changelog
**Date:** August 5, 2026  
**Scope:** Architecture Refactoring, JWT Auth, User & Vendor Restructuring, Society Onboarding, and Image Normalization.

---

## 1. Architectural Changes (MVC Pattern)

The backend codebase has been refactored into a decoupled **Model-View-Controller (MVC)** architecture.

### Directory Structure:
- `src/controllers/`: Contains pure business logic and HTTP request handlers.
  - `usersController.js`
  - `vendorAuthController.js`
  - `vendorPanelController.js`
  - `societiesController.js`
  - `storefrontController.js`
  - `ordersController.js`
  - `adminController.js`
  - `healthController.js`
- `src/routes/`: Route definitions delegating execution to controller functions.
- `src/services/`: Core domain business services (`vendorService.js`, `paymentService.js`, `emailService.js`).
- `src/utils/`: Helper utilities (`auth.js`, `imageUtils.js`, `cache.js`, `logger.js`).

---

## 2. Authentication & Security Updates

### Pure JWT Authentication
- **Firebase Token Verification Removed**: `src/utils/firebase.js` deleted. Backend authentication relies exclusively on pure backend JWT tokens (`accessToken` with 24h expiration, `refreshToken` with 60d expiration).
- **Security Headers**: Added `Cross-Origin-Resource-Policy: cross-origin` and updated CSP `img-src 'self' data: blob: http: https: *` to prevent CORS image blocking.

---

## 3. Detailed API Endpoint Specifications & Changes

### A. User Authentication Endpoints (`/api/users`)

#### 1. User Registration — `POST /api/users/register`
- **Change:** Registration relies on **Mobile Number** as primary identifier. Email is optional and no longer checked for uniqueness.
- **Request Body:**
  ```json
  {
    "mobile": "9876543210",          // Required (accepts: mobile, phone, phone_number, identifier)
    "password": "UserPass123!",       // Required
    "society_id": 1,                 // Optional (default: 1)
    "flat": "Tower C-302"            // Optional
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "user": {
      "user_id": "usr_377178",
      "name": "Resident User",
      "phone": "9876543210",
      "society_id": "1",
      "society_name": "Omaxe Greenwood Residency",
      "flat": "Tower C-302"
    }
  }
  ```

#### 2. User Login — `POST /api/users/login`
- **Change:** Restricted to **Mobile Number ONLY**. Returns `400 Bad Request` if an email login attempt is detected.
- **Request Body:**
  ```json
  {
    "mobile": "9876543210",          // Accepts: mobile, phone, identifier
    "password": "UserPass123!"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "usr_377178",
      "name": "Resident User",
      "phone": "9876543210",
      "role": "user"
    }
  }
  ```

---

### B. Vendor Authentication Endpoints (`/api/vendors`)

#### 1. Vendor Registration — `POST /api/vendors/register`
- **Change:** Removed `shop_no` / `shop_number` column completely from the database schema, insert query, Zod schemas, and response body.
- **Request Body:**
  ```json
  {
    "owner_name": "Rajesh Kumar",
    "store_name": "Fresh Dairy & Grocery",
    "mobile": "9876543210",
    "password": "VendorPass123!",
    "society_id": 1,
    "business_category": "Grocery"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "token": "eyJhbGciOiJIUzI1...",
    "vendor_id": 35,
    "vendor": {
      "vendor_id": 35,
      "store_name": "Fresh Dairy & Grocery",
      "vendor_name": "Rajesh Kumar",
      "phone_number": "9876543210",
      "society_id": 1
    }
  }
  ```

---

### C. Society Management Endpoints (`/api/societies`)

#### 1. Society Onboarding — `POST /api/societies`
- **Change:** Requires **strictly 4 fields**: `society_name`, `location`, `secretary_name`, `secretary_mobile`. Obsolete fields (`pincode`, `total_flats`, `image_url`, `banner_image`) dropped.
- **Request Body:**
  ```json
  {
    "society_name": "Emerald Heights",
    "location": "Sector 120, Noida",
    "secretary_name": "Mr. Anil Kapoor",
    "secretary_mobile": "9812345678"
  }
  ```
- **Accepted Field Aliases:**
  - Secretary Name: `secretary_name`, `secretaryName`, `rwa_name`, `rwaName`
  - Secretary Mobile: `secretary_mobile`, `secretaryMobile`, `secretary_phone`, `secretaryPhone`, `rwa_phone`, `rwaPhone`, `mobile`, `phone`
- **Response (201 Created):**
  ```json
  {
    "message": "Society onboarded successfully",
    "society_id": 34,
    "society": {
      "society_id": 34,
      "society_name": "Emerald Heights",
      "location": "Sector 120, Noida",
      "secretary_name": "Mr. Anil Kapoor",
      "secretary_mobile": "9812345678"
    }
  }
  ```

#### 2. Get Society Details — `GET /api/societies/:id`
- **Response (200 OK):**
  ```json
  {
    "society_id": 1,
    "society_name": "Omaxe Greenwood Residency",
    "location": "Sector 120, Noida",
    "secretary_name": "Mr. Anil Kapoor",
    "secretary_mobile": "9812345678"
  }
  ```

---

### D. Vendor Panel & Item Image Normalization (`/api/vendorPanel`)

#### 1. Add Item — `POST /api/vendorPanel/:vendorId/items`
- **Change:** Multi-alias support for image URLs (`image_url`, `imageUrl`, `image`, `item_image`, `itemImage`, `photo`, `photo_url`). Google Drive links and Google Search redirect URLs automatically normalized to direct embeddable images.
- **Request Body:**
  ```json
  {
    "item_name": "Organic Honey 500g",
    "price": 250.00,
    "imageUrl": "https://www.google.com/url?sa=i&url=https%3A%2F%2Fimages.unsplash.com%2Fphoto-1563636619-e9143da7973b%3Fw%3D400",
    "category": "Grocery"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "Item added successfully",
    "item_id": 17,
    "image_url": "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400"
  }
  ```

#### 2. Update Item — `PUT /api/vendorPanel/:vendorId/items/:itemId`
- **Request Body:** Supports partial updates and image URL normalization across all aliases.

---

## 4. Database Schema Migrations Summary

- **`vendors` Table**: `shop_no` column removed.
- **`users` Table**: `email` constraint altered to `NULL` (optional).
- **`societies` Table**: Standardized to `society_name`, `location`, `secretary_name`, `secretary_mobile`.

---
*Documentation updated and verified live against PostgreSQL.*

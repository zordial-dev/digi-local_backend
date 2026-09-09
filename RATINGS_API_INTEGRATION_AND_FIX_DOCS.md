# DigiLocal API Documentation: Ratings & Reviews System

> **Target Audience**: Frontend Web & Mobile Developers (Vendor Panel, Admin Panel, Customer App)  
> **Base URL**: `https://digi-local-backend.onrender.com` (Production) or `http://localhost:5000` (Local)  
> **Backend Version**: DigiLocal v2.4 (Live on Production)

---

## 1. Summary of What Was Fixed on Backend

1. **CORS Preflight (`OPTIONS`) Headers Extended**:
   - The backend previously had a restricted CORS `allowedHeaders` list. When frontend requests sent non-standard headers like `Cache-Control`, `Pragma`, or custom tokens with a `GET` request, the browser's `OPTIONS` preflight request was rejected, resulting in the browser aborting the request with:
     ```
     ⚠️ Provisional headers are shown (Request cancelled in red)
     ```
   - **Fix Applied**: `server.js` now explicitly allows `Cache-Control`, `Pragma`, `Expires`, `X-Requested-With`, `x-vendor-id`, `x-user-id`, and all standard client headers.

2. **Frontend Best Practice**:
   - On standard `GET` requests (`GET /api/vendors/:vendorId/ratings`), **do not** send `Content-Type: application/json` in request headers. `Content-Type` is only required for `POST`/`PUT`/`PATCH` requests carrying a JSON body.
   - If your component triggers multiple rapid calls on re-renders, ensure you are not canceling the active request before it completes.

---

## 2. Ratings & Reviews API Specifications

### Endpoint 1: Fetch Vendor Ratings & Star Breakdown

Retrieve all customer reviews and ratings for a vendor, along with pagination and a complete 1-to-5 star breakdown summary.

- **Method**: `GET`
- **URL**: `/api/vendors/:vendorId/ratings`  
  *(Aliases: `/api/vendorPanel/:vendorId/ratings`, `/api/stores/:vendorId/ratings`)*
- **Headers**:
  ```http
  Authorization: Bearer <jwt_token> (Optional for public storefront)
  ```

#### **Query Parameters**:

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `page` | `integer` | No | `1` | Page number for pagination |
| `limit` | `integer` | No | `20` | Items per page (max 100) |
| `star` | `number` | No | - | Filter reviews by exact star count (`1` to `5`) |

#### **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Vendor ratings retrieved successfully.",
  "data": {
    "vendor_id": 1296,
    "summary": {
      "avg_rating": 4.5,
      "total_ratings": 12,
      "breakdown": {
        "1": 0,
        "2": 1,
        "3": 1,
        "4": 3,
        "5": 7
      }
    },
    "pagination": {
      "total": 12,
      "page": 1,
      "limit": 20,
      "pages": 1
    },
    "ratings": [
      {
        "rating_id": 15,
        "vendor_id": 1296,
        "user_id": "usr_991823",
        "user_name": "Pooja Sharma",
        "rating": 5,
        "review_text": "Excellent fresh flowers and quick delivery!",
        "order_id": "ORD-10928",
        "vendor_reply": "Thank you so much Pooja! Looking forward to serving you again.",
        "vendor_replied_at": "2026-09-09T14:30:00.000Z",
        "created_at": "2026-09-09T12:00:00.000Z"
      }
    ]
  }
}
```

---

### Endpoint 2: Fetch Rating Summary Only

Quickly fetch just the star average, total review count, and star breakdown without loading individual review text (ideal for store cards and headers).

- **Method**: `GET`
- **URL**: `/api/vendors/:vendorId/ratings/summary`  
  *(Alias: `/api/vendorPanel/:vendorId/ratings/summary`)*

#### **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Vendor rating summary retrieved successfully.",
  "data": {
    "vendor_id": 1296,
    "avg_rating": 4.5,
    "total_ratings": 12,
    "breakdown": {
      "1": 0,
      "2": 1,
      "3": 1,
      "4": 3,
      "5": 7
    }
  }
}
```

---

### Endpoint 3: Customer Submits a Rating & Review

Allows a resident or customer to rate and review a vendor.

- **Method**: `POST`
- **URL**: `/api/vendors/:vendorId/ratings`  
  *(Alias: `/api/ratings`, `/api/vendorPanel/:vendorId/ratings`)*
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <user_jwt_token>
  ```

#### **Request Body (JSON)**:
```json
{
  "rating": 5,
  "review_text": "The bouquet was beautiful and arrived right on time.",
  "order_id": "ORD-10928",
  "user_name": "Pooja Sharma"
}
```

#### **Success Response (`201 Created`)**:
```json
{
  "success": true,
  "message": "Vendor rating and review submitted successfully.",
  "data": {
    "rating_id": 16,
    "vendor_id": 1296,
    "user_id": "usr_991823",
    "user_name": "Pooja Sharma",
    "rating": 5,
    "review_text": "The bouquet was beautiful and arrived right on time.",
    "order_id": "ORD-10928",
    "status": "PUBLISHED",
    "created_at": "2026-09-09T12:45:00.000Z"
  }
}
```

---

### Endpoint 4: Vendor Replies to a Customer Review

Allows the vendor to post an official reply to a customer review.

- **Method**: `POST`
- **URL**: `/api/vendorPanel/ratings/:ratingId/reply`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <vendor_jwt_token>
  ```

#### **Request Body (JSON)**:
```json
{
  "reply_text": "Thank you for the wonderful review, Pooja! We appreciate your support."
}
```

#### **Success Response (`200 OK`)**:
```json
{
  "success": true,
  "message": "Reply posted successfully.",
  "data": {
    "rating_id": 16,
    "vendor_reply": "Thank you for the wonderful review, Pooja! We appreciate your support.",
    "vendor_replied_at": "2026-09-09T12:50:00.000Z"
  }
}
```

---

## 3. Frontend Implementation Example (Axios)

```javascript
import axios from 'axios';

const BASE_URL = 'https://digi-local-backend.onrender.com/api';

/**
 * Fetch vendor ratings and reviews with pagination
 */
export const getVendorRatings = async (vendorId, page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${BASE_URL}/vendors/${vendorId}/ratings`, {
      params: { page, limit }
      // Do NOT add 'Content-Type': 'application/json' on GET requests
    });

    if (response.data && response.data.success) {
      return response.data.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching vendor ratings:', error);
    throw error;
  }
};

/**
 * Submit a customer rating & review
 */
export const submitRating = async (vendorId, ratingData, token) => {
  try {
    const response = await axios.post(`${BASE_URL}/vendors/${vendorId}/ratings`, ratingData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error submitting rating:', error);
    throw error;
  }
};
```

# 📱 Vendor Mobile App: Customer Reviews & Ratings API Documentation

> **Document Version**: `v2.1.0 (Vendor Mobile App Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Target Audience**: Mobile App Frontend Developers (React Native / Expo / Flutter / Android / iOS)  

---

## 📋 Overview

This document specifies the mobile API endpoints for the **Vendor App** allowing merchants to view customer ratings and reviews, view star distribution metrics, and reply to user feedback.

---

## 📡 Mobile App Endpoints

### 1. Fetch Vendor Reviews & Ratings List (`GET /api/vendor/reviews` or `GET /api/vendor/ratings`)

Fetch all customer reviews given to the vendor store along with star rating metrics.

#### Headers:
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
X-Vendor-ID: <VENDOR_ID>
Accept: application/json
```

#### Query Parameters:
| Parameter | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `vendor_id` | `number` | *optional* | Vendor ID (if not passing JWT or header). |
| `page` | `number` | `1` | Page number for pagination. |
| `limit` | `number` | `20` | Items per page (max 100). |
| `star` | `number` | *optional* | Filter reviews by star count (1 to 5). |

#### Request Example:
```http
GET /api/vendor/reviews?page=1&limit=20 HTTP/1.1
Host: digi-local-backend.onrender.com
Authorization: Bearer <VENDOR_JWT_TOKEN>
X-Vendor-ID: 1242
Accept: application/json
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Vendor user ratings and reviews retrieved successfully.",
  "data": {
    "vendor_id": 1242,
    "store_name": "Fresh Mart Grocery",
    "metrics": {
      "avg_rating": 4.67,
      "rating_count": 15,
      "total_reviews": 15,
      "breakdown": {
        "5": 11,
        "4": 3,
        "3": 1,
        "2": 0,
        "1": 0
      }
    },
    "pagination": {
      "total": 15,
      "page": 1,
      "limit": 20,
      "pages": 1
    },
    "reviews": [
      {
        "rating_id": 108,
        "vendor_id": 1242,
        "user_id": "usr_99182",
        "user_name": "Rohan Malhotra",
        "rating": 5.0,
        "review_text": "Super fast delivery and fresh quality products!",
        "order_id": "ORD_88123",
        "status": "PUBLISHED",
        "reply_text": "Thank you Rohan! Glad you enjoyed your order.",
        "replied_at": "2026-09-08T12:30:00.000Z",
        "created_at": "2026-09-08T12:00:00.000Z"
      }
    ],
    "ratings": [
      {
        "rating_id": 108,
        "vendor_id": 1242,
        "user_id": "usr_99182",
        "user_name": "Rohan Malhotra",
        "rating": 5.0,
        "review_text": "Super fast delivery and fresh quality products!",
        "order_id": "ORD_88123",
        "status": "PUBLISHED",
        "reply_text": "Thank you Rohan! Glad you enjoyed your order.",
        "replied_at": "2026-09-08T12:30:00.000Z",
        "created_at": "2026-09-08T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 2. Submit Merchant Reply to Customer Review (`POST /api/vendor/ratings/:ratingId/reply` or `POST /api/vendor/reviews/:ratingId/reply`)

Allows the vendor to post a response/reply to a specific customer review.

#### Headers:
```http
Authorization: Bearer <VENDOR_JWT_TOKEN>
X-Vendor-ID: <VENDOR_ID>
Content-Type: application/json
```

#### Request Body:
```json
{
  "reply_text": "Thank you Rohan! We are glad you enjoyed your order."
}
```

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Vendor reply published successfully.",
  "data": {
    "rating_id": 108,
    "vendor_id": 1242,
    "reply_text": "Thank you Rohan! We are glad you enjoyed your order.",
    "replied_at": "2026-09-08T12:30:00.000Z"
  }
}
```

---

## 📱 Mobile App UI Guidelines

1. **Rating Summary Header Card**:
   - **Score Display**: Show average rating (e.g., `4.67 ⭐`) in large text.
   - **Review Count**: Show total reviews `(15 Reviews)`.
   - **Breakdown Bars**: Progress bars for 5-star, 4-star, 3-star, 2-star, and 1-star counts from `metrics.breakdown`.
2. **Review Items**:
   - Display `user_name`, star rating, `created_at` timestamp, and `review_text`.
   - If `reply_text` exists, display a highlighted **Merchant Reply** container.
   - If `reply_text` is `null`, display `[ 💬 Reply to Customer ]` button opening reply sheet.

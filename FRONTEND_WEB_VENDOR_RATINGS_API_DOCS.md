# 💻 Frontend Web: Vendor Ratings & Customer Reviews API Documentation

> **Document Version**: `v2.1.0 (Frontend Web Specification)`  
> **Status**: APPROVED & LIVE IN PRODUCTION  
> **Base URL**: `https://digi-local-backend.onrender.com/api`  
> **Target Audience**: Frontend Web Developers (User Storefront Web & Vendor Web Dashboard)  

---

## 📋 Overview

This document specifies the Web API contracts for:
1. **User Storefront Web App**: Rating submission form, public star widgets, and customer reviews list.
2. **Vendor Web Dashboard**: Vendor review management, star rating analytics breakdown, and merchant reply UI.

---

## 1. User Storefront Web App Endpoints

### 1.1 Submit Rating & Review (`POST /api/vendorPanel/:vendorId/ratings` or `POST /api/vendors/:vendorId/ratings` or `POST /api/ratings`)

Submit a new customer rating and review for a vendor store.

#### Request Body:
```json
{
  "vendor_id": 1242,
  "rating": 5.0,
  "review_text": "Super fast delivery and fresh quality products!",
  "user_id": "usr_99182",
  "user_name": "Rohan Malhotra",
  "order_id": "ORD_88123"
}
```

#### Response (`HTTP 201 Created`):
```json
{
  "success": true,
  "message": "Vendor rating and review submitted successfully.",
  "data": {
    "rating_id": 108,
    "vendor_id": 1242,
    "user_id": "usr_99182",
    "user_name": "Rohan Malhotra",
    "rating": 5,
    "review_text": "Super fast delivery and fresh quality products!",
    "order_id": "ORD_88123",
    "status": "PUBLISHED",
    "created_at": "2026-09-08T12:00:00.000Z",
    "vendor_summary": {
      "avg_rating": 4.67,
      "rating_count": 15,
      "total_ratings_sum": 70
    }
  }
}
```

---

### 1.2 Fetch Public Vendor Ratings & Breakdown (`GET /api/vendors/:vendorId/ratings` or `GET /api/vendorPanel/:vendorId/ratings`)

#### Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "message": "Vendor ratings retrieved successfully.",
  "data": {
    "vendor_id": 1242,
    "summary": {
      "avg_rating": 4.67,
      "total_ratings": 15,
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
    "ratings": [
      {
        "rating_id": 108,
        "vendor_id": 1242,
        "user_id": "usr_99182",
        "user_name": "Rohan Malhotra",
        "rating": 5,
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

## 2. Vendor Web Dashboard Endpoints

### 2.1 Fetch Vendor's Own Customer Reviews (`GET /api/vendorPanel/:vendorId/reviews` or `GET /api/vendorPanel/reviews`)

Allows vendors to see all user reviews given to their store.

#### Request Example:
```http
GET /api/vendorPanel/1242/reviews?page=1&limit=20 HTTP/1.1
Host: digi-local-backend.onrender.com
Authorization: Bearer <VENDOR_TOKEN>
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
        "rating": 5,
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

### 2.2 Vendor Posts Response to Customer Review (`POST /api/vendorPanel/ratings/:ratingId/reply` or `POST /api/vendorPanel/reviews/:ratingId/reply`)

#### Request Body:
```json
{
  "reply_text": "Thank you for your fantastic feedback! We are delighted to serve you."
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
    "reply_text": "Thank you for your fantastic feedback! We are delighted to serve you.",
    "replied_at": "2026-09-08T12:30:00.000Z"
  }
}
```

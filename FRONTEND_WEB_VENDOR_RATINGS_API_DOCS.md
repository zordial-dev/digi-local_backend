# DigiLocal Platform - Frontend Web Vendor Ratings & Reviews API Documentation

## Overview
This document guides **Frontend Web Developers** building:
1. **User Storefront Web App**: Rating submission form, star rating widgets, review listing, and star breakdown card.
2. **Vendor Web Dashboard**: Rating analytics, star distribution charts, and vendor reply UI.

---

## 1. User Storefront Web App Integration

### 1.1 Submit Rating & Review
- **Endpoint**: `POST /api/vendors/:vendorId/ratings` (or `POST /api/ratings`)
- **Headers**: `Content-Type: application/json`

#### Request Payload
```json
{
  "vendor_id": 1241,
  "rating": 5.0,
  "review_text": "Super fast delivery and fresh quality products!",
  "user_id": "usr_99182",
  "user_name": "Rohan Malhotra",
  "order_id": "ord_77123"
}
```

#### Response (`201 Created`)
```json
{
  "success": true,
  "message": "Vendor rating and review submitted successfully.",
  "data": {
    "rating_id": 105,
    "vendor_id": 1241,
    "user_id": "usr_99182",
    "user_name": "Rohan Malhotra",
    "rating": 5,
    "review_text": "Super fast delivery and fresh quality products!",
    "order_id": "ord_77123",
    "status": "PUBLISHED",
    "created_at": "2026-09-04T15:18:00.000Z",
    "vendor_summary": {
      "avg_rating": 4.65,
      "rating_count": 28,
      "total_ratings_sum": 130.2
    }
  }
}
```

---

### 1.2 Fetch Public Vendor Ratings & Star Breakdown
- **Endpoint**: `GET /api/vendors/:vendorId/ratings`
- **Query Parameters**:
  - `page` *(default 1)*: Page number.
  - `limit` *(default 20)*: Page size.
  - `star` *(optional)*: Filter reviews by exact star (e.g. `star=5`).

#### Example Request
```bash
curl -X GET "http://localhost:5000/api/vendors/1241/ratings?page=1&limit=10"
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Vendor ratings retrieved successfully.",
  "data": {
    "vendor_id": 1241,
    "summary": {
      "avg_rating": 4.65,
      "total_ratings": 28,
      "breakdown": {
        "5": 20,
        "4": 5,
        "3": 2,
        "2": 1,
        "1": 0
      }
    },
    "pagination": {
      "total": 28,
      "page": 1,
      "limit": 10,
      "pages": 3
    },
    "ratings": [
      {
        "rating_id": 105,
        "vendor_id": 1241,
        "user_id": "usr_99182",
        "user_name": "Rohan Malhotra",
        "rating": 5,
        "review_text": "Super fast delivery and fresh quality products!",
        "order_id": "ord_77123",
        "status": "PUBLISHED",
        "reply_text": "Thank you Rohan! Glad you enjoyed your order.",
        "replied_at": "2026-09-04T15:25:00.000Z",
        "created_at": "2026-09-04T15:18:00.000Z"
      }
    ]
  }
}
```

---

### 1.3 Quick Rating Summary (Header / Card Badge)
- **Endpoint**: `GET /api/vendors/:vendorId/ratings/summary`

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Vendor rating summary fetched successfully.",
  "data": {
    "vendor_id": 1241,
    "avg_rating": 4.65,
    "rating_count": 28,
    "star_breakdown": {
      "5": 20,
      "4": 5,
      "3": 2,
      "2": 1,
      "1": 0
    }
  }
}
```

---

## 2. Vendor Web Dashboard Integration

### 2.1 Fetch Vendor's Own Ratings & Customer Feedback
- **Endpoint**: `GET /api/vendor/ratings`
- **Headers**: `Authorization: Bearer <VENDOR_TOKEN>` or `X-Vendor-ID: <VENDOR_ID>`

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Vendor self-rating metrics retrieved.",
  "data": {
    "vendor_id": 1241,
    "metrics": {
      "avg_rating": 4.65,
      "rating_count": 28,
      "breakdown": {
        "5": 20,
        "4": 5,
        "3": 2,
        "2": 1,
        "1": 0
      }
    },
    "pagination": {
      "total": 28,
      "page": 1,
      "limit": 20,
      "pages": 2
    },
    "ratings": [
      {
        "rating_id": 105,
        "user_name": "Rohan Malhotra",
        "rating": 5,
        "review_text": "Super fast delivery!",
        "order_id": "ord_77123",
        "reply_text": null,
        "replied_at": null,
        "created_at": "2026-09-04T15:18:00.000Z"
      }
    ]
  }
}
```

---

### 2.2 Vendor Posts Reply to Review
- **Endpoint**: `POST /api/vendor/ratings/:ratingId/reply`
- **Body**:
```json
{
  "reply_text": "Thank you for your fantastic feedback! We are delighted to serve you."
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Vendor reply published successfully.",
  "data": {
    "rating_id": 105,
    "vendor_id": 1241,
    "reply_text": "Thank you for your fantastic feedback! We are delighted to serve you.",
    "replied_at": "2026-09-04T15:30:00.000Z"
  }
}
```

---

## 3. Recommended Frontend UI Components
1. **StarRatingSelector (`<StarRating value={val} onChange={setVal} />`)**: Interactive 5-star picker component for customer review modal.
2. **RatingSummaryBadge (`⭐ 4.65 (28 Reviews)`)**: Clean pill display on vendor shop cards.
3. **VendorReplyCard**: Highlighted reply block below customer review text displaying `Merchant Response`.

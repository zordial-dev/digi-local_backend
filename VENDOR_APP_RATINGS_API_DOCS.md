# DigiLocal Platform - Vendor Mobile App Ratings & Reviews API Documentation

## Overview
This document specifies the mobile API contract and implementation guide for **Vendor App Mobile Frontend Developers** (React Native / Flutter / Android Native).

---

## 1. Mobile App Endpoints

### 1.1 Fetch Vendor Rating Dashboard & Reviews List
- **Endpoint**: `GET /api/vendor/ratings`
- **Headers**:
  - `X-Vendor-ID`: `<VENDOR_ID>` (or `Authorization: Bearer <VENDOR_JWT_TOKEN>`)
- **Query Parameters**:
  - `page` *(default 1)*: Page number.
  - `limit` *(default 20)*: Page size.

#### Example Request
```http
GET /api/vendor/ratings?page=1&limit=20 HTTP/1.1
Host: localhost:5000
X-Vendor-ID: 1241
Accept: application/json
```

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

### 1.2 Submit Merchant Reply to Review
- **Endpoint**: `POST /api/vendor/ratings/:ratingId/reply`
- **Headers**:
  - `X-Vendor-ID`: `<VENDOR_ID>`
  - `Content-Type`: `application/json`

#### Request Payload
```json
{
  "reply_text": "Thank you Rohan! We are glad you enjoyed your order."
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
    "reply_text": "Thank you Rohan! We are glad you enjoyed your order.",
    "replied_at": "2026-09-04T15:30:00.000Z"
  }
}
```

---

## 2. Mobile App UI Guidelines & Screen Specs

### 2.1 Rating Summary Header Card
- **Average Rating Display**: Render large bold numeric score (e.g. `4.65 ⭐`) with star icon.
- **Rating Count**: Display `(28 Customer Reviews)`.
- **Star Breakdown Progress Bars**: Render horizontal progress bars for 5-star, 4-star, 3-star, 2-star, and 1-star distributions.

### 2.2 Customer Review List View
- **User Avatar Badge**: Render circle badge with user initials.
- **Star Rating Pill**: Small green/gold badge with filled stars.
- **Review Text & Date**: Formatted IST timestamp and customer message.
- **Reply Action Button**:
  - If `reply_text` is `null`: Show button `[ 💬 Reply to Customer ]` opening modal sheet.
  - If `reply_text` exists: Render `Merchant Reply` box with timestamp.

---

## 3. Error Codes & Mobile Exception Handling

| Code | HTTP Status | Description | Action |
| :--- | :--- | :--- | :--- |
| `UNAUTHORIZED_VENDOR` | `400 / 401` | Missing vendor token or `X-Vendor-ID`. | Prompt vendor to re-login. |
| `RATING_NOT_FOUND` | `404` | Rating ID does not exist. | Refresh review list. |
| `MISSING_REPLY_TEXT` | `400` | Reply text body empty. | Show inline error message. |

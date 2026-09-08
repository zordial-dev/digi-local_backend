# DigiLocal Platform - Admin Panel Vendor Ratings & Moderation API Documentation

## Overview
This document specifies the complete API integration endpoints for **Admin Developers** to monitor, filter, search, moderate, and delete vendor ratings and reviews across the DigiLocal platform.

---

## 1. Authentication & Base URL
- **Base URL**: `http://localhost:5000` (or `https://your-domain.com`)
- **Headers**:
  - `Authorization`: `Bearer <ADMIN_JWT_TOKEN>`
  - `Content-Type`: `application/json`

---

## 2. Admin Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **`GET`** | `/api/admin/vendor-ratings` | List, search, & filter all vendor ratings across the platform. |
| **`PATCH`** | `/api/admin/vendor-ratings/:ratingId/status` | Update rating status (`PUBLISHED`, `HIDDEN`, `FLAGGED`). |
| **`DELETE`** | `/api/admin/vendor-ratings/:ratingId` | Delete a rating & recalculate vendor aggregate score. |

---

## 3. Detailed Endpoint Specs

### 3.1 List & Filter All Vendor Ratings
- **Endpoint**: `GET /api/admin/vendor-ratings`
- **Query Parameters**:
  - `vendor_id` *(optional)*: Filter ratings for a specific vendor ID.
  - `status` *(optional)*: Filter by status (`PUBLISHED`, `HIDDEN`, `FLAGGED`).
  - `min_rating` *(optional)*: Minimum star rating (e.g. `1` or `4`).
  - `max_rating` *(optional)*: Maximum star rating (e.g. `2` or `5`).
  - `search` *(optional)*: Search string matching user name, review text, or store name.
  - `page` *(optional, default `1`)*: Page number for pagination.
  - `limit` *(optional, default `20`)*: Records per page (max `100`).

#### Request Example (cURL)
```bash
curl -X GET "http://localhost:5000/api/admin/vendor-ratings?page=1&limit=20&status=PUBLISHED&search=Rajkumar" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Admin vendor ratings retrieved.",
  "data": {
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "pages": 3
    },
    "ratings": [
      {
        "rating_id": 104,
        "vendor_id": 1241,
        "store_name": "Rajkumar hero",
        "vendor_name": "Rajkumar Sharma",
        "user_id": "usr_99812",
        "user_name": "Ananya Sharma",
        "rating": 5,
        "review_text": "Excellent quality products and super fast delivery!",
        "order_id": "ord_88192",
        "status": "PUBLISHED",
        "reply_text": "Thank you so much for your feedback!",
        "replied_at": "2026-09-04T15:10:00.000Z",
        "created_at": "2026-09-04T14:30:00.000Z"
      }
    ]
  }
}
```

---

### 3.2 Update Rating Moderation Status
- **Endpoint**: `PATCH /api/admin/vendor-ratings/:ratingId/status`
- **Path Parameters**: `ratingId` (Numeric ID of rating)
- **Request Body**:
```json
{
  "status": "HIDDEN"
}
```
*Allowed Status Values*: `PUBLISHED`, `HIDDEN`, `FLAGGED`

#### Behavior:
- Setting status to `HIDDEN` removes the rating from the public vendor storefront and **automatically recalculates** the vendor's `avg_rating` and `rating_count`.
- Setting status back to `PUBLISHED` restores it and updates aggregate scores.

#### Request Example (cURL)
```bash
curl -X PATCH "http://localhost:5000/api/admin/vendor-ratings/104/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -d '{"status": "HIDDEN"}'
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Rating status updated to HIDDEN. Vendor aggregate metrics recalculated.",
  "data": {
    "rating_id": 104,
    "vendor_id": 1241,
    "status": "HIDDEN",
    "vendor_summary": {
      "avg_rating": 4.5,
      "rating_count": 44,
      "total_ratings_sum": 198
    }
  }
}
```

---

### 3.3 Delete Abusive or Spam Rating
- **Endpoint**: `DELETE /api/admin/vendor-ratings/:ratingId`
- **Path Parameters**: `ratingId` (Numeric ID of rating)

#### Behavior:
- Permanently deletes the rating record from database.
- Automatically recalculates vendor `avg_rating` and `rating_count`.

#### Request Example (cURL)
```bash
curl -X DELETE "http://localhost:5000/api/admin/vendor-ratings/104" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

#### Response Example (`200 OK`)
```json
{
  "success": true,
  "message": "Rating deleted successfully and vendor score recalculated.",
  "data": {
    "deleted_rating_id": 104,
    "vendor_id": 1241,
    "vendor_summary": {
      "avg_rating": 4.52,
      "rating_count": 43,
      "total_ratings_sum": 194.5
    }
  }
}
```

---

## 4. Admin UI Integration Workflow & Tips
1. **Moderation Queue Badge**: Render count of `FLAGGED` or low-rating (`min_rating=1&max_rating=2`) reviews in your sidebar badge.
2. **One-Click Quick Action**: Provide quick toggle buttons for `Hide / Publish / Flag` in your Admin Ratings table.
3. **Automated Vendor Recalculation**: You do not need to manually recalculate vendor averages; the backend handles recalculation on status changes and deletions.

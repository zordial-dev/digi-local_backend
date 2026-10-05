# Web Frontend Developer Documentation: Edit & Delete Customer Review API

This documentation is specifically for **Web Frontend Developers** working on the **Customer Web Storefront & Portal** (React / Next.js / Vue / Angular).

---

## 1. Feature Overview

Customers on the web storefront can now **edit their previously submitted vendor reviews and ratings**, or **delete** them.

When a review is edited:
1. The new star rating and review comment are saved in PostgreSQL.
2. The vendor's aggregate score (`avg_rating`) and total rating count (`rating_count`) are recalculated automatically.
3. The response includes the full updated review object, vendor reply (if any), and updated vendor metrics.

---

## 2. Edit Review API

### HTTP Methods & URLs
- `PUT /api/reviews/:ratingId`
- `PATCH /api/reviews/:ratingId`
- *(Aliases: `PUT /api/ratings/:ratingId`, `PUT /api/users/reviews/:ratingId`)*

### Headers
```http
Content-Type: application/json
Authorization: Bearer <user_jwt_token>
```
*(If JWT is not present, pass `user_id` in the request body for identity matching).*

### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `ratingId` | Integer | **Yes** | ID of the review (`rating_id`) to update |

### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | Number | *Optional* | Star rating between `1.0` and `5.0` |
| `review_text` | String | *Optional* | Updated feedback text |
| `user_name` | String | *Optional* | Customer display name |

> **Aliases Supported:** `review_text`, `reviewText`, `comment`.

### Example Request Body
```json
{
  "rating": 5.0,
  "review_text": "Updated: Outstanding customer service and prompt delivery. Highly recommended!",
  "user_name": "Pooja Verma"
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Review updated successfully.",
  "data": {
    "rating_id": 22,
    "vendor_id": 12,
    "user_id": "usr_482910",
    "user_name": "Pooja Verma",
    "rating": 5.0,
    "review_text": "Updated: Outstanding customer service and prompt delivery. Highly recommended!",
    "order_id": "ORD-5192",
    "status": "PUBLISHED",
    "has_reply": true,
    "reply": {
      "text": "Thank you for shopping with us!",
      "replied_at": "2026-10-05T12:00:00.000Z"
    },
    "created_at": "2026-10-04T14:30:00.000Z",
    "updated_at": "2026-10-05T15:10:00.000Z",
    "vendor_summary": {
      "avg_rating": 4.8,
      "rating_count": 35,
      "total_ratings_sum": 168.0
    }
  }
}
```

---

## 3. Delete Review API

If a user chooses to remove their review:

### HTTP Method & URL
`DELETE /api/reviews/:ratingId`

### Headers
```http
Authorization: Bearer <user_jwt_token>
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Review deleted successfully.",
  "data": {
    "deleted_rating_id": 22,
    "vendor_id": 12,
    "vendor_summary": {
      "avg_rating": 4.79,
      "rating_count": 34,
      "total_ratings_sum": 163.0
    }
  }
}
```

---

## 4. Web Component Example (React)

```jsx
import React, { useState } from 'react';

export function EditReviewForm({ review, token, onSaveSuccess, onCancel }) {
  const [rating, setRating] = useState(review.rating);
  const [reviewText, setReviewText] = useState(review.review_text);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/reviews/${review.rating_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating, review_text: reviewText })
      });

      const json = await res.json();
      if (json.success) {
        onSaveSuccess(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Failed to update review');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-review-form">
      <h3>Edit Your Review</h3>
      {errorMsg && <div className="error-alert">{errorMsg}</div>}
      
      <label>Rating (1.0 to 5.0):</label>
      <input
        type="number"
        min="1.0"
        max="5.0"
        step="0.5"
        value={rating}
        onChange={(e) => setRating(parseFloat(e.target.value))}
        required
      />

      <label>Review Text:</label>
      <textarea
        rows={4}
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write your updated feedback..."
        required
      />

      <div className="button-group">
        <button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Update Review'}
        </button>
        <button type="button" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>
    </form>
  );
}
```

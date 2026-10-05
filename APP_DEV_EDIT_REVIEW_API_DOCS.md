# Mobile App Developer Documentation: Edit & Delete Customer Review API

This documentation is specifically for **Mobile App Developers** working on the **Customer Mobile App** (React Native / Expo / Flutter / Android / iOS).

---

## 1. Feature Overview

Users who have submitted a rating and review for a vendor/store can now **edit and update** their rating score and review text, or **delete** their review directly from the Customer Mobile App.

Whenever a user edits or deletes their review:
- The updated review text and rating are saved immediately to the database.
- The vendor's average rating (`avg_rating`) and total rating count (`rating_count`) are automatically recalculated in real time.
- If the vendor previously replied to the review, the vendor's reply remains intact and returned in the response.

---

## 2. Edit / Update Review API

### HTTP Methods & URLs
- `PUT /api/reviews/:ratingId`
- `PATCH /api/reviews/:ratingId`
- *(Aliases: `PUT /api/ratings/:ratingId`, `PUT /api/users/reviews/:ratingId`)*

### Headers
```http
Content-Type: application/json
Authorization: Bearer <user_jwt_token>
```
*(Note: If JWT is not used in certain app screens, pass `user_id` in the request body for ownership validation).*

### URL Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `ratingId` | Integer | **Yes** | The unique ID of the review (`rating_id`) to edit |

### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rating` | Number | *Optional* | Updated star rating between `1.0` and `5.0` (e.g. `4.5`) |
| `review_text` | String | *Optional* | Updated review comment / feedback text |
| `user_name` | String | *Optional* | Updated display name of the customer |

> **Aliases Supported:** `review_text`, `reviewText`, `comment`.

### Example Request Body
```json
{
  "rating": 4.5,
  "review_text": "Updated review: The delivery was much faster this time and the food arrived hot! Very satisfied.",
  "user_name": "Aarav Patel"
}
```

### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Review updated successfully.",
  "data": {
    "rating_id": 18,
    "vendor_id": 12,
    "user_id": "usr_482910",
    "user_name": "Aarav Patel",
    "rating": 4.5,
    "review_text": "Updated review: The delivery was much faster this time and the food arrived hot! Very satisfied.",
    "order_id": "ORD-7429",
    "status": "PUBLISHED",
    "has_reply": true,
    "reply": {
      "text": "Thank you for updating your review! We are delighted you enjoyed your meal.",
      "replied_at": "2026-10-05T12:30:00.000Z"
    },
    "created_at": "2026-10-04T18:20:00.000Z",
    "updated_at": "2026-10-05T15:10:00.000Z",
    "vendor_summary": {
      "avg_rating": 4.6,
      "rating_count": 28,
      "total_ratings_sum": 128.8
    }
  }
}
```

### Error Responses
- **`400 Bad Request`**:
  ```json
  { "success": false, "error": { "code": "INVALID_RATING_VALUE", "message": "Rating must be a number between 1.0 and 5.0 stars" } }
  ```
- **`403 Forbidden`** (if user attempts to edit another customer's review):
  ```json
  { "success": false, "error": { "code": "FORBIDDEN", "message": "You are not authorized to edit this review" } }
  ```
- **`404 Not Found`**:
  ```json
  { "success": false, "error": { "code": "REVIEW_NOT_FOUND", "message": "Review with ID 18 not found" } }
  ```

---

## 3. Delete Review API

If the user wants to remove their review entirely:

### HTTP Method & URL
`DELETE /api/reviews/:ratingId` *(or `DELETE /api/ratings/:ratingId`)*

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
    "deleted_rating_id": 18,
    "vendor_id": 12,
    "vendor_summary": {
      "avg_rating": 4.5,
      "rating_count": 27,
      "total_ratings_sum": 124.3
    }
  }
}
```

---

## 4. Mobile App Integration Example (React Native)

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';

export default function EditReviewModal({ review, token, onUpdated, onClose }) {
  const [stars, setStars] = useState(String(review.rating));
  const [comment, setComment] = useState(review.review_text);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://api.digilocal.in/api/reviews/${review.rating_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: parseFloat(stars),
          review_text: comment
        })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Your review has been updated!');
        onUpdated(data.data);
        onClose();
      } else {
        Alert.alert('Error', data.error?.message || 'Could not update review');
      }
    } catch (err) {
      Alert.alert('Network Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontWeight: 'bold', fontSize: 16 }}>Edit Review</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginVertical: 10 }}
        placeholder="Rating (1.0 - 5.0)"
        keyboardType="numeric"
        value={stars}
        onChangeText={setStars}
      />
      <TextInput
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: 'top' }}
        placeholder="Write your feedback..."
        multiline
        value={comment}
        onChangeText={setComment}
      />
      <View style={{ marginTop: 15 }}>
        <Button title={loading ? "Saving..." : "Save Changes"} onPress={handleSave} disabled={loading} />
      </View>
    </View>
  );
}
```

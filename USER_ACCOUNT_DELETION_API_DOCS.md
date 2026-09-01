# 🗑️ Resident User Account Deletion Backend API Documentation

This document provides the complete API specification for frontend developers (Resident User App / Web Portal) to implement the **Account Deletion** feature for resident users.

---

## 📌 Endpoint Overview

| Action | HTTP Method | Endpoint | Authorization |
| :--- | :--- | :--- | :--- |
| **Delete Logged-in User Account** | `DELETE` | `/api/users/profile` | `Bearer <JWT_TOKEN>` |
| **Delete Logged-in User Account (Alias)** | `DELETE` | `/api/users/me` | `Bearer <JWT_TOKEN>` |
| **Delete Logged-in User Account (Alias)** | `DELETE` | `/api/users/delete` | `Bearer <JWT_TOKEN>` |
| **Delete Account via User ID** | `DELETE` | `/api/users/:userId` | `Bearer <JWT_TOKEN>` |
| **Delete Account via POST** | `POST` | `/api/users/delete-account` | `Bearer <JWT_TOKEN>` |

---

## 🔐 Authorization & Headers

- **Header**: `Authorization: Bearer <USER_JWT_ACCESS_TOKEN>`
- **Content-Type**: `application/json`

---

## 📥 Request Parameters (Optional)

If the user is authenticated via Bearer token, no request body or query parameters are required. The backend automatically identifies the logged-in user from the JWT payload.

If specifying target user manually:

### Request Body (Optional):
```json
{
  "user_id": "usr_998877",
  "phone": "9876543210"
}
```

---

## 📤 Response Specifications

### 🟢 1. Success Response (`200 OK`)
Returned when the user account and associated temporary records are permanently deleted from the database.

```json
{
  "success": true,
  "message": "Resident user account for \"Aarushi Sharma\" (ID: usr_998877, Phone: 9876543210) deleted permanently.",
  "user_id": "usr_998877",
  "deleted_at": "2026-09-01T13:10:00.000Z"
}
```

#### 💡 Frontend Actions on `200 OK`:
1. Clear local storage tokens:
   ```javascript
   localStorage.removeItem('userToken');
   localStorage.removeItem('user');
   localStorage.clear();
   ```
2. Display success toast: *"Your account has been deleted permanently."*
3. Redirect user to the Registration / Welcome screen.

---

### 🔴 2. Account Not Found (`404 Not Found`)
Returned if the user account does not exist or has already been deleted.

```json
{
  "success": false,
  "error": "User account not found or already deleted."
}
```

---

### 🔴 3. Server Error (`500 Internal Server Error`)

```json
{
  "success": false,
  "error": "Failed to delete user account: Database error"
}
```

---

## 💻 Frontend Integration Example (React / React Native)

```javascript
export async function handleDeleteAccount(userToken) {
  try {
    const response = await fetch('http://localhost:5000/api/users/profile', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // 1. Purge Local Storage
      localStorage.removeItem('userToken');
      localStorage.clear();

      alert('Your account has been deleted permanently.');

      // 2. Redirect to Signup / Welcome
      window.location.href = '/register';
    } else {
      alert(data.error || 'Failed to delete account.');
    }
  } catch (err) {
    console.error('Account deletion error:', err);
    alert('Network error. Please try again.');
  }
}
```

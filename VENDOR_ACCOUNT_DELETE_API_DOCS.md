# 📄 API Specification: Vendor Account & Store Deletion

This API specification details the **Vendor Account & Store Deletion Endpoints** in DigiLocal. It allows vendors to permanently delete their store account, profile, and catalog items directly from the **Vendor Mobile App (Android/iOS)** and **Vendor Web Dashboard**.

---

## 📌 Summary of Endpoints

| HTTP Method | Route Endpoint Path | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| **`DELETE`** | `/api/vendors/:vendorId` | **YES** | Primary vendor store deletion endpoint |
| **`DELETE`** | `/api/vendors/:vendorId/store` | **YES** | Alternative alias for store deletion |
| **`DELETE`** | `/api/vendorPanel/:vendorId` | **YES** | Vendor Panel route alias |

---

## 🔒 Authentication & Headers

* **Header**: `Authorization: Bearer <VENDOR_ACCESS_TOKEN>`
* **Header**: `Content-Type: application/json`

> **Note**: Both path parameter `:vendorId` and JWT payload `vendor_id` are checked to ensure authorization safety.

---

## 🚀 API Endpoint Details

### 1. DELETE `/api/vendors/:vendorId`

#### 📥 Request Parameters
* **URL Parameter**: `vendorId` (Integer or String, e.g. `899`)

#### 📥 Request Headers Example
```http
DELETE /api/vendors/899 HTTP/1.1
Host: api.digilocal.in
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

#### 📤 Successful Response (200 OK)
```json
{
  "success": true,
  "message": "Vendor store \"Aggarwal Sweets & Bakers\" (ID: 899) and associated items deleted successfully.",
  "vendor_id": 899
}
```

#### ❌ Error Responses

##### A. Unauthorized / Token Missing (401 Unauthorized)
```json
{
  "error": "Access token is required for authentication"
}
```

##### B. Store Not Found (404 Not Found)
```json
{
  "error": "Vendor store not found"
}
```

##### C. Server Error (500 Internal Server Error)
```json
{
  "error": "Failed to delete vendor store"
}
```

---

## 🧹 Database Cascade Cleanup Behavior

When a vendor triggers account deletion, the backend automatically performs the following cleanup:
1. `DELETE FROM items WHERE vendor_id = <vendorId>` (Deletes store products & items).
2. `DELETE FROM catalog_items WHERE vendor_id = <vendorId>` (Deletes catalog associations).
3. `DELETE FROM vendors WHERE vendor_id = <vendorId>` (Deletes merchant store record).
4. Clears active server-side cache.

---

## 📱 Frontend Integration Code Example (React / React Native)

```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = 'https://api.digilocal.in'; // Replace with backend host

export async function deleteVendorAccount(vendorId) {
  try {
    const token = await AsyncStorage.getItem('vendorAccessToken');
    if (!token) {
      throw new Error('Vendor is not authenticated');
    }

    const response = await fetch(`${API_BASE_URL}/api/vendors/${vendorId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to delete account');
    }

    // Clear local authentication tokens & navigate to login/welcome screen
    await AsyncStorage.multiRemove(['vendorAccessToken', 'vendorRefreshToken', 'vendorUser']);
    
    Alert.alert('Account Deleted', 'Your vendor store account has been permanently deleted.');
    return data;
  } catch (error) {
    Alert.alert('Deletion Error', error.message);
    throw error;
  }
}
```

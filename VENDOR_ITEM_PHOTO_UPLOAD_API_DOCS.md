# Vendor Item Photo Upload & Management API Documentation

This document explains all available backend APIs for uploading and updating vendor item photos (from **Camera**, **Gallery**, **Base64**, or **Hosted Image URL**) in the DigiLocal Vendor App.

---

## 🚀 Overview of Approaches

Developers can choose between **Two Recommended Flows**:

1. **Approach A (Recommended - 2-Step Flow):**
   - **Step 1:** Upload image from camera/gallery to `POST /api/vendorPanel/upload-image`.
   - **Step 2:** Pass the returned `image_url` to `POST /api/vendorPanel/:vendorId/items` (Add Item) or `PUT /api/vendorPanel/:vendorId/items/:itemId` (Update Item).

2. **Approach B (Direct 1-Step Flow):**
   - Directly send `multipart/form-data` with the image file (field name: `image`, `file`, or `photo`) directly to:
     - `POST /api/vendorPanel/:vendorId/items` (when adding a new item)
     - `PUT /api/vendorPanel/:vendorId/items/:itemId` (when editing an existing item)
     - `POST /api/vendorPanel/:vendorId/items/:itemId/image` (dedicated endpoint for updating existing item's photo)

---

## 1. Standalone Image Upload API (Camera / Gallery)

Use this endpoint to upload any image file or Base64 string and obtain a permanent hosted URL.

- **URL:** `POST /api/vendorPanel/upload-image`
  - *Aliases:* `POST /api/upload-image`, `POST /api/upload`
- **Authentication:** `Bearer <vendor_token>` (or Admin token)

### A. Multipart Form-Data (Camera / Gallery File)
- **Headers:**
  ```http
  Authorization: Bearer <vendor_token>
  Content-Type: multipart/form-data
  ```
- **Body Form-Data:**
  - `file` (or `image` / `photo`): Select binary image file from device camera / gallery.

### B. Base64 JSON Payload
- **Headers:**
  ```http
  Authorization: Bearer <vendor_token>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQE...",
    "filename": "item_photo.jpg"
  }
  ```

### Response (200 OK)
```json
{
  "success": true,
  "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg",
  "filename": "item_1789638006153_a1b2c3.jpg",
  "size": 245120,
  "mimetype": "image/jpeg"
}
```

---

## 2. Add New Item with Photo

Creates a new product item in the vendor's catalog.

- **URL:** `POST /api/vendorPanel/:vendorId/items`
  - *Alias:* `POST /api/vendors/:vendorId/items`
- **Authentication:** `Bearer <vendor_token>`

### Option 1: JSON (Using `image_url` from Step 1)
- **Headers:**
  ```http
  Authorization: Bearer <vendor_token>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "item_name": "Fresh Red Roses Bouquet",
    "price": 299,
    "stock": 30,
    "category": "Flowers & Bouquets",
    "unit": "Piece",
    "description": "Bunch of fresh red roses for celebration and pooja",
    "is_available": true,
    "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg"
  }
  ```

### Option 2: Direct Multipart Form-Data (Direct Camera / Gallery File)
- **Headers:**
  ```http
  Authorization: Bearer <vendor_token>
  Content-Type: multipart/form-data
  ```
- **Form Fields:**
  - `item_name`: `Fresh Red Roses Bouquet`
  - `price`: `299`
  - `stock`: `30`
  - `category`: `Flowers & Bouquets`
  - `unit`: `Piece`
  - `description`: `Bunch of fresh red roses`
  - `is_available`: `true`
  - `image` (or `file` / `photo`): `[Binary file from Camera/Gallery]`

### Response (201 Created)
```json
{
  "success": true,
  "message": "Item added successfully",
  "item_id": 1740,
  "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg"
}
```

---

## 3. Dedicated Endpoint: Update Item Photo Only

If an item is already added and the vendor chooses a new photo from Camera/Gallery and hits save:

- **URL:** `POST /api/vendorPanel/:vendorId/items/:itemId/image`
  - *Aliases:*
    - `PUT /api/vendorPanel/:vendorId/items/:itemId/image`
    - `POST /api/vendorPanel/:vendorId/items/:itemId/photo`
    - `PUT /api/vendorPanel/:vendorId/items/:itemId/photo`
    - `POST /api/vendors/:vendorId/items/:itemId/image`
- **Authentication:** `Bearer <vendor_token>`

### Option 1: Multipart Form-Data (Camera / Gallery)
- **Headers:**
  ```http
  Authorization: Bearer <vendor_token>
  Content-Type: multipart/form-data
  ```
- **Form Fields:**
  - `file` (or `image` / `photo`): `[Binary file from camera or gallery]`

### Option 2: JSON Payload (Image URL or Base64)
- **Headers:**
  ```http
  Authorization: Bearer <vendor_token>
  Content-Type: application/json
  ```
- **Request Body:**
  ```json
  {
    "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg"
  }
  ```
  *(or pass Base64 string directly in key `"base64"` or `"image"`)*

### Response (200 OK)
```json
{
  "success": true,
  "message": "Item photo updated successfully",
  "vendor_id": "1296",
  "item_id": "1740",
  "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg",
  "item": {
    "item_id": "1740",
    "vendor_id": "1296",
    "item_name": "Fresh Red Roses Bouquet",
    "price": "299.00",
    "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg",
    "is_available": true
  }
}
```

---

## 4. Edit Existing Item (Partial / Full Update)

Updates an existing item. Can update **just the photo**, **just price/stock**, or **all fields**.

- **URL:** `PUT /api/vendorPanel/:vendorId/items/:itemId`
  - *Alias:* `PATCH /api/vendorPanel/:vendorId/items/:itemId`
- **Authentication:** `Bearer <vendor_token>`

### A. Updating ONLY the Photo
```http
PUT /api/vendorPanel/1296/items/1740
Authorization: Bearer <token>
Content-Type: application/json

{
  "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg"
}
```

### B. Updating Photo directly via Multipart Form-Data (Camera/Gallery)
```http
PUT /api/vendorPanel/1296/items/1740
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form fields:
file: [binary image file]
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Item updated successfully",
  "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg",
  "item": {
    "item_id": "1740",
    "vendor_id": "1296",
    "item_name": "Fresh Red Roses Bouquet",
    "price": "299.00",
    "image_url": "https://api.digilocal.in/uploads/item_1789638006153_a1b2c3.jpg"
  }
}
```

---

## 📱 Mobile App (Flutter / React Native / Android) Code Example

### Flutter (http / dio)
```dart
// 1. Upload Camera/Gallery image
var request = http.MultipartRequest('POST', Uri.parse('$baseUrl/api/vendorPanel/upload-image'));
request.headers['Authorization'] = 'Bearer $vendorToken';
request.files.add(await http.MultipartFile.fromPath('file', pickedFile.path));

var streamedResponse = await request.send();
var response = await http.Response.fromStream(streamedResponse);
var data = jsonDecode(response.body);
String uploadedImageUrl = data['image_url'];

// 2. Update item photo
var updateResponse = await http.put(
  Uri.parse('$baseUrl/api/vendorPanel/$vendorId/items/$itemId'),
  headers: {
    'Authorization': 'Bearer $vendorToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'image_url': uploadedImageUrl,
  }),
);
```

### React Native / Axios
```javascript
// Direct dedicated photo upload
const formData = new FormData();
formData.append('file', {
  uri: photo.uri,
  type: photo.type || 'image/jpeg',
  name: photo.fileName || 'item_photo.jpg',
});

const response = await axios.post(
  `${BASE_URL}/api/vendorPanel/${vendorId}/items/${itemId}/image`,
  formData,
  {
    headers: {
      'Authorization': `Bearer ${vendorToken}`,
      'Content-Type': 'multipart/form-data',
    },
  }
);
console.log('Updated image URL:', response.data.image_url);
```

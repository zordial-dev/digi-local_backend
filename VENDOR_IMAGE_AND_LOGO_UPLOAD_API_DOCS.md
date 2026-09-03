# Vendor Shop Image & Logo Upload API Documentation

This document provides technical integration guidelines for frontend developers integrating **Vendor Shop Logo & Image Uploads**.

The API supports 3 upload formats seamlessly across all upload endpoints:
1. **JSON Base64 Payload** (Base64 string from camera/picker).
2. **Multipart Form-Data File Upload** (File binary stream).
3. **Direct Image URL String** (Pre-hosted web image link).

---

## 1. Upload Endpoints

| Endpoint Route | HTTP Method | Purpose |
| :--- | :--- | :--- |
| `/api/upload-image` | `POST` | General image / item / shop logo upload. |
| `/api/upload-logo` | `POST` | Shop logo upload. |
| `/api/upload` | `POST` | Legacy image upload endpoint. |
| `/api/vendorPanel/upload-image` | `POST` | Vendor Panel item/logo upload. |
| `/api/vendorPanel/upload-logo` | `POST` | Vendor Panel shop logo upload. |
| `/api/vendorPanel/:vendorId/logo` | `POST` / `PUT` | Directly upload & set vendor shop logo in DB. |
| `/api/vendors/:vendorId/logo` | `POST` / `PUT` | Directly upload & set vendor shop logo in DB. |

---

## 2. Upload Methods & Payload Formats

### Method A: JSON Base64 Payload (Recommended for Mobile / Web Camera & Picker)

**Content-Type**: `application/json`

#### Payload Option A.1 (Separate Base64 & Meta fields)
```json
{
  "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
  "fileType": "image/jpeg",
  "filename": "3.avif"
}
```

#### Payload Option A.2 (Data URI string)
```json
{
  "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "filename": "shop_logo.jpg"
}
```

#### Payload Option A.3 (Unified `image` field)
```json
{
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "filename": "logo.png"
}
```

---

### Method B: Multipart Form-Data Upload (Binary File Stream)

**Content-Type**: `multipart/form-data`

| Form Field Name | Value |
| :--- | :--- |
| `file` or `image` or `photo` or `logo` | Binary Image File (`.jpg`, `.png`, `.webp`, `.avif`, `.heic`) |

---

### Method C: Direct Image URL String

**Content-Type**: `application/json`

```json
{
  "image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800"
}
```

---

## 3. Success Response (`200 OK`)

```json
{
  "success": true,
  "image_url": "https://digi-local-backend.onrender.com/uploads/upload-1788434349923-4708.avif",
  "logo_url": "https://digi-local-backend.onrender.com/uploads/upload-1788434349923-4708.avif",
  "logo": "https://digi-local-backend.onrender.com/uploads/upload-1788434349923-4708.avif",
  "filename": "upload-1788434349923-4708.avif",
  "size": 134,
  "mimetype": "image/jpeg",
  "original_name": "3.avif"
}
```

---

## 4. Setting Shop Logo Directly (`POST/PUT /api/vendorPanel/:vendorId/logo`)

When calling `/api/vendorPanel/:vendorId/logo` (or `/api/vendors/:vendorId/logo`), the backend uploads the logo and **automatically updates the database record** for that vendor.

#### Request (JSON Base64)
```json
{
  "base64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
  "fileType": "image/jpeg",
  "filename": "shop_logo.jpg"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Shop logo updated successfully!",
  "vendor_id": 1241,
  "logo": "https://digi-local-backend.onrender.com/uploads/upload-1788434349923-4708.jpg",
  "logo_url": "https://digi-local-backend.onrender.com/uploads/upload-1788434349923-4708.jpg"
}
```

---

## 5. Error Responses

#### `400 Bad Request` — Missing File / Base64 Payload
```json
{
  "error": "No image file, base64 payload, or URL received.",
  "hint": "Send a file via multipart form-data, a base64 string (JSON key base64, image_base64, or image), or image_url.",
  "code": "NO_FILE_RECEIVED"
}
```

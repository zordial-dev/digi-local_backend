# 📄 API Specification: Vendor Shop Logo Upload (Camera & Gallery)

This technical specification details the **Vendor Shop Logo Upload & Update APIs** in DigiLocal. It allows vendors to add or update their shop logo directly using a **Camera Photo (Live Click)** or **Gallery Image Picker** on the **Vendor Mobile App (Android/iOS)** and **Vendor Web Dashboard**.

---

## 📌 Summary of Logo Upload Endpoints

| HTTP Method | Route Path | Auth Required | Content-Type | Description |
| :--- | :--- | :---: | :--- | :--- |
| **`POST`** | `/api/vendorPanel/upload-logo` | Optional | `multipart/form-data` | Upload camera photo/gallery file and get hosted logo URL |
| **`POST`** | `/api/vendorPanel/upload-image` | Optional | `multipart/form-data` | General upload endpoint for images and shop logos |
| **`POST` / `PUT`** | `/api/vendorPanel/:vendorId/logo` | **YES** | `multipart/form-data` or `json` | Upload camera photo and update vendor shop logo in DB |
| **`PUT`** | `/api/vendorPanel/:vendorId/settings` | **YES** | `application/json` | Update store settings including `logo` URL |

---

## 📸 Supported Image Sources & Formats
* **Camera Capture**: Directly captured JPEG photos from mobile camera (no extension or standard `.jpg`).
* **Gallery Picker**: JPEG, PNG, WEBP, HEIC image files picked from device storage.
* **Multipart Field Names Supported**: `logo`, `image`, `photo`, `file`
* **File Size Limit**: Up to `10 MB`

---

## 🚀 API Endpoint Documentation

### 1. POST `/api/vendorPanel/upload-logo`

#### 💡 Business Idea & Purpose
Uploads a raw camera photo or gallery pick and returns a publicly accessible image URL (`logo_url`) to display in the frontend preview before saving.

#### 📥 Request Headers
* `Content-Type: multipart/form-data`

#### 📥 Request Body (Multipart FormData)
* `logo`: File (Camera Binary Blob / JPEG Image)

#### 📤 Response Payload (200 OK)
```json
{
  "success": true,
  "image_url": "https://api.digilocal.in/uploads/logo-1723901234567-8910.jpg",
  "logo_url": "https://api.digilocal.in/uploads/logo-1723901234567-8910.jpg",
  "logo": "https://api.digilocal.in/uploads/logo-1723901234567-8910.jpg",
  "filename": "logo-1723901234567-8910.jpg",
  "size": 421050,
  "mimetype": "image/jpeg"
}
```

---

### 2. POST / PUT `/api/vendorPanel/:vendorId/logo`

#### 💡 Business Idea & Purpose
Uploads the shop logo file (or accepts a `logo_url` string) and updates the vendor's store profile in the PostgreSQL database in a single request.

#### 📥 Request Headers
* `Authorization: Bearer <VENDOR_ACCESS_TOKEN>`
* `Content-Type: multipart/form-data` (if sending file) or `application/json` (if sending URL)

#### 📥 Request Body Options

##### Option A: Multipart File (Camera Photo)
* `logo`: File (JPEG photo from camera)

##### Option B: JSON Body (Image URL)
```json
{
  "logo_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300"
}
```

#### 📤 Response Payload (200 OK)
```json
{
  "success": true,
  "message": "Shop logo updated successfully!",
  "vendor_id": 899,
  "logo": "https://api.digilocal.in/uploads/logo-1723901234567-8910.jpg",
  "logo_url": "https://api.digilocal.in/uploads/logo-1723901234567-8910.jpg"
}
```

---

## 📱 React Native & React Integration Code Examples

### A. React Native Camera Photo Picker & Logo Upload

```javascript
import React, { useState } from 'react';
import { Button, Image, View, Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.digilocal.in'; // Replace with server host

export function ShopLogoUploader({ vendorId, currentLogo, onLogoUpdated }) {
  const [logoUri, setLogoUri] = useState(currentLogo);
  const [uploading, setUploading] = useState(false);

  // 1. Capture photo via Camera
  const openCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 0.8 }, handlePhotoPicked);
  };

  // 2. Pick photo from Gallery
  const openGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, handlePhotoPicked);
  };

  // 3. Upload photo to backend
  const handlePhotoPicked = async (response) => {
    if (response.didCancel || response.errorCode) return;
    const asset = response.assets?.[0];
    if (!asset) return;

    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('vendorAccessToken');
      const formData = new FormData();
      formData.append('logo', {
        uri: asset.uri,
        name: asset.fileName || `camera_${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg'
      });

      const res = await fetch(`${API_BASE_URL}/api/vendorPanel/${vendorId}/logo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      setLogoUri(data.logo_url);
      if (onLogoUpdated) onLogoUpdated(data.logo_url);
      Alert.alert('Success', 'Shop logo updated successfully!');
    } catch (err) {
      Alert.alert('Upload Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={{ alignItems: 'center' }}>
      <Image source={{ uri: logoUri }} style={{ width: 120, height: 120, borderRadius: 60 }} />
      <Button title="📷 Take Photo with Camera" onPress={openCamera} disabled={uploading} />
      <Button title="🖼️ Choose from Gallery" onPress={openGallery} disabled={uploading} />
    </View>
  );
}
```

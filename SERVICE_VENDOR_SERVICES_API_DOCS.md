# 🛠️ DigiLocal — Service Vendor Services Management API Documentation
### For: Vendor Mobile App & Website Frontend Developers (React Native / Flutter / Next.js / React)

> **Base URL (Production):** `https://digi-local-backend.onrender.com`  
> **Base URL (Local Dev):** `http://localhost:5000`  
> **Auth Header:** `Authorization: Bearer <vendor_jwt_token>` *(optional for legacy calls)*  
> **Last Updated:** 29 Sep 2026  

---

## 📱 UI Field to API Parameter Mapping

Based on the **"Add New Service"** screen design:

| UI Field Name | API Field Name | Type | Required | Example Value | Description |
|:---|:---|:---|:---:|:---|:---|
| **Service Photo** | `image` or `photo` (file) / `image_url` (string) | File / String | No | *(Binary file from Camera/Gallery or hosted URL)* | Photo uploaded via Camera or Media picker |
| **Service Name** | `service_name` *(aliases: `serviceName`, `name`, `title`)* | String | **YES** | `"Split AC Deep Cleaning & Servicing"` | Title/Name of the service |
| **Category** | `category` | String | No | `"Electrician & Repairs"` | Category dropdown selection |
| **Price (₹)** | `price` *(alias: `service_price`)* | Number | No | `499` | Service base charges in INR (defaults to `0`) |
| **Visiting Charge (₹)** | `visiting_charge` *(alias: `visitingCharge`)* | Number | No | `99` | Inspection / visiting fee in INR (defaults to `0`) |
| **Estimated Duration** | `estimated_duration` *(alias: `duration`)* | String | No | `"1 hour"` | Duration dropdown (e.g. `"30 mins"`, `"1 hour"`, `"2 hours"`) |
| **Service Location** | `service_location` *(alias: `location`)* | String | No | `"At Customer's Doorstep"` | Selected pill: `"At Customer's Doorstep"`, `"At Shop / Clinic"`, or `"Online / Remote"` |
| **Service Description** | `description` *(alias: `service_description`)* | String | No | `"Complete indoor & outdoor unit water jet cleaning, filter wash, and gas check."` | What's included and details |
| **Availability** | `is_available` | Boolean | No | `true` | Toggle active/inactive status (defaults to `true`) |

---

## 📡 API Endpoints Specification

---

### 1️⃣ Add New Service
Creates a new service in the vendor's catalog.

```http
POST /api/vendorPanel/:vendorId/services
```
*Alias: `POST /api/vendors/:vendorId/services`*

#### Supported Request Formats
This endpoint supports **both**:
1. **`multipart/form-data`** (Recommended for Mobile App Camera & Gallery uploads)
2. **`application/json`** (For web or when image is already a hosted URL / Base64)

#### A. `multipart/form-data` Request (Mobile App / Image Picker)
```
POST /api/vendorPanel/1296/services
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  service_name: Split AC Deep Cleaning & Servicing
  category: Electrician & Repairs
  price: 499
  visiting_charge: 99
  estimated_duration: 1 hour
  service_location: At Customer's Doorstep
  description: Complete indoor & outdoor unit water jet cleaning with filter wash.
  image: <binary_image_file_from_camera_or_gallery>
```

#### B. `application/json` Request
```json
POST /api/vendorPanel/1296/services
Content-Type: application/json
Authorization: Bearer <token>

{
  "service_name": "Split AC Deep Cleaning & Servicing",
  "category": "Electrician & Repairs",
  "price": 499,
  "visiting_charge": 99,
  "estimated_duration": "1 hour",
  "service_location": "At Customer's Doorstep",
  "description": "Complete indoor & outdoor unit water jet cleaning with filter wash.",
  "image_url": "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=600",
  "is_available": true
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "message": "Service \"Split AC Deep Cleaning & Servicing\" added successfully",
  "service": {
    "service_id": 1,
    "id": 1,
    "vendor_id": 1296,
    "service_name": "Split AC Deep Cleaning & Servicing",
    "name": "Split AC Deep Cleaning & Servicing",
    "category": "Electrician & Repairs",
    "price": 499.00,
    "visiting_charge": 99.00,
    "estimated_duration": "1 hour",
    "service_location": "At Customer's Doorstep",
    "description": "Complete indoor & outdoor unit water jet cleaning with filter wash.",
    "image_url": "https://digi-local-backend.onrender.com/uploads/service_1790676528_abc.jpg",
    "photo_url": "https://digi-local-backend.onrender.com/uploads/service_1790676528_abc.jpg",
    "is_available": true,
    "created_at": "2026-09-29T10:05:00.000Z",
    "updated_at": "2026-09-29T10:05:00.000Z"
  }
}
```

---

### 2️⃣ Get All Services of a Vendor
Fetches all services listed by a vendor (for the vendor dashboard or resident storefront).

```http
GET /api/vendorPanel/:vendorId/services
```
*Alias: `GET /api/vendors/:vendorId/services`*

#### Optional Query Parameters
| Query Param | Type | Description |
|---|---|---|
| `category` | string | Filter by category (e.g. `?category=Electrician%20%26%20Repairs`) |
| `is_available` | boolean | Filter active only (`?is_available=true`) |
| `search` | string | Search keyword in service name or description (`?search=ac`) |

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "vendor_id": 1296,
  "count": 2,
  "services": [
    {
      "service_id": 1,
      "id": 1,
      "vendor_id": 1296,
      "service_name": "Split AC Deep Cleaning & Servicing",
      "category": "Electrician & Repairs",
      "price": 499.00,
      "visiting_charge": 99.00,
      "estimated_duration": "1 hour",
      "service_location": "At Customer's Doorstep",
      "description": "Complete indoor & outdoor unit water jet cleaning.",
      "image_url": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
      "is_available": true,
      "created_at": "2026-09-29T10:05:00.000Z"
    },
    {
      "service_id": 2,
      "id": 2,
      "vendor_id": 1296,
      "service_name": "Switchboard & Wiring Repair",
      "category": "Electrician & Repairs",
      "price": 149.00,
      "visiting_charge": 49.00,
      "estimated_duration": "45 mins",
      "service_location": "At Customer's Doorstep",
      "description": "Inspection and repair of faulty switches and MCBs.",
      "image_url": null,
      "is_available": true,
      "created_at": "2026-09-29T10:10:00.000Z"
    }
  ]
}
```

---

### 3️⃣ Get Single Service Details
Fetches full details of a specific service along with vendor contact info.

```http
GET /api/services/:serviceId
```
*Alias: `GET /api/vendors/:vendorId/services/:serviceId`*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "service": {
    "service_id": 1,
    "vendor_id": 1296,
    "service_name": "Split AC Deep Cleaning & Servicing",
    "category": "Electrician & Repairs",
    "price": 499.00,
    "visiting_charge": 99.00,
    "estimated_duration": "1 hour",
    "service_location": "At Customer's Doorstep",
    "description": "Complete indoor & outdoor unit water jet cleaning.",
    "image_url": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
    "is_available": true,
    "vendor": {
      "vendor_id": 1296,
      "store_name": "Sharma Electricals & AC Services",
      "vendor_name": "Ramesh Sharma",
      "phone_number": "9876543210",
      "whatsapp_number": "9876543210"
    }
  }
}
```

---

### 4️⃣ Edit / Update Service
Updates service pricing, name, category, duration, location, description, availability, and/or replaces the photo.

```http
PUT /api/vendorPanel/:vendorId/services/:serviceId
```
*Aliases:*  
- `PATCH /api/vendorPanel/:vendorId/services/:serviceId`  
- `POST /api/vendorPanel/:vendorId/services/:serviceId` *(Supported for mobile frameworks that use POST for multipart uploads)*  
- `PUT /api/vendors/:vendorId/services/:serviceId`  
- `PATCH /api/vendors/:vendorId/services/:serviceId`  
- `PUT /api/services/:serviceId`  
- `PATCH /api/services/:serviceId`  

> 💡 **Image Preservation Guarantee:**  
> When editing text/pricing fields, if you do **not** provide a new image file or new URL, the backend **keeps the existing service photo intact**. You do **not** need to re-upload the photo on every edit!

#### Supported Request Formats:
1. **`multipart/form-data`** (Recommended for Mobile App Camera & Gallery photo updates)
2. **`application/json`** (For Web or when updating text fields / hosted image URL)

#### A. `application/json` Request (Update text & pricing fields without touching photo)
```http
PUT /api/vendorPanel/1296/services/1
Content-Type: application/json
Authorization: Bearer <token>

{
  "service_name": "Split AC Deep Jet Cleaning & Gas Top-up",
  "price": 599,
  "visiting_charge": 79,
  "estimated_duration": "1.5 hours",
  "service_location": "At Customer's Doorstep",
  "description": "Now includes outdoor unit jet cleaning and high-pressure coil wash."
}
```

#### B. `multipart/form-data` Request (Replace Service Photo from Mobile Camera/Gallery + Update Info)
```http
PUT /api/vendorPanel/1296/services/1
Content-Type: multipart/form-data
Authorization: Bearer <token>

FormData:
  service_name: Split AC Deep Cleaning & Servicing
  price: 549
  image: <binary_image_file_from_picker>
```
*(Accepts field names: `image`, `photo`, `service_photo`, `service_image`, or `file`)*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Service updated successfully",
  "service": {
    "service_id": 1,
    "id": 1,
    "vendor_id": 1296,
    "service_name": "Split AC Deep Cleaning & Servicing",
    "name": "Split AC Deep Cleaning & Servicing",
    "title": "Split AC Deep Cleaning & Servicing",
    "category": "Electrician & Repairs",
    "price": 549.00,
    "visiting_charge": 79.00,
    "estimated_duration": "1.5 hours",
    "duration": "1.5 hours",
    "service_location": "At Customer's Doorstep",
    "location": "At Customer's Doorstep",
    "description": "Now includes outdoor unit jet cleaning.",
    "image_url": "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg",
    "imageUrl": "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg",
    "image": "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg",
    "photo_url": "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg",
    "photoUrl": "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg",
    "photo": "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg",
    "images": [
      "https://digi-local-backend.onrender.com/uploads/service_1790678250_abc.jpg"
    ],
    "is_available": true,
    "isAvailable": true,
    "created_at": "2026-09-29T10:05:00.000Z",
    "updated_at": "2026-09-30T11:45:00.000Z"
  }
}
```

---

### 5️⃣ Dedicated Update Service Photo / Image Only
If your mobile or web app has a dedicated "Change Photo" button or multi-step wizard, use this dedicated endpoint:

```http
POST /api/vendorPanel/:vendorId/services/:serviceId/image
```
*Aliases:*  
- `PUT /api/vendorPanel/:vendorId/services/:serviceId/image`  
- `PATCH /api/vendorPanel/:vendorId/services/:serviceId/image`  
- `POST /api/services/:serviceId/image`  
- `PUT /api/services/:serviceId/image`  

#### Request (`multipart/form-data` or `application/json`)
- **Multipart:** send binary file with key `image` or `photo`
- **JSON:** send `{ "image": "https://..." }` or `{ "imageUrl": "..." }` or `{ "image_url": "..." }` or Base64 string

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Service photo updated successfully",
  "service_id": 1,
  "image_url": "https://digi-local-backend.onrender.com/uploads/service_1790679999.jpg",
  "imageUrl": "https://digi-local-backend.onrender.com/uploads/service_1790679999.jpg",
  "image": "https://digi-local-backend.onrender.com/uploads/service_1790679999.jpg",
  "photo_url": "https://digi-local-backend.onrender.com/uploads/service_1790679999.jpg",
  "photo": "https://digi-local-backend.onrender.com/uploads/service_1790679999.jpg"
}
```

---

### 6️⃣ Toggle Service Availability (Active / Inactive)
Enables or disables a service (e.g. if technician is temporarily unavailable).

```http
PATCH /api/vendorPanel/:vendorId/services/:serviceId/availability
```
*Alias: `PATCH /api/services/:serviceId/availability`*

#### Request Body (Optional - if omitted, it inverts the current state)
```json
{
  "is_available": false
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "service_id": 1,
  "is_available": false,
  "message": "Service is now UNAVAILABLE"
}
```

---

### 7️⃣ Delete Service
Removes a service from the vendor's catalog.

```http
DELETE /api/vendorPanel/:vendorId/services/:serviceId
```
*Alias: `DELETE /api/services/:serviceId`*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Service #1 deleted successfully"
}
```

---

### 8️⃣ Storefront Customer View (Website & Resident App)
When a customer views the vendor's store on web or mobile:

```http
GET /api/vendors/:vendorId
```
*Alias: `GET /api/stores/:vendorId`*

The backend **automatically attaches** the full list of services under the `services` key with all image aliases:

```json
{
  "success": true,
  "vendor_id": 1296,
  "store_name": "Sharma Electricals & AC Services",
  "vendor_type": "service",
  "services": [
    {
      "service_id": 1,
      "service_name": "Split AC Deep Cleaning & Servicing",
      "name": "Split AC Deep Cleaning & Servicing",
      "category": "Electrician & Repairs",
      "price": 499.00,
      "visiting_charge": 99.00,
      "estimated_duration": "1 hour",
      "service_location": "At Customer's Doorstep",
      "image": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
      "image_url": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
      "imageUrl": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
      "photo": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
      "images": [
        "https://digi-local-backend.onrender.com/uploads/service_1.jpg"
      ],
      "is_available": true
    }
  ]
}
```

---

## 🖼️ Image Handling Fix & Guide for Frontend Devs

### Why were images previously not showing?
1. **Field Name Mismatch:** The frontend sent `image`, `imageUrl`, or `images`, but the backend only parsed `image_url` or `photo` in certain endpoints.
2. **Missing Aliases in Response:** React Native and web cards often look for `service.image` or `service.imageUrl` or `service.images[0]`. Previously, only `image_url` was returned, resulting in `undefined` and blank placeholder boxes.
3. **Broken Relative URLs:** Stored relative paths like `/uploads/...` were previously malformed by missing protocol resolvers (`https:///uploads/...`).

### What is fixed:
- ✅ **All input keys supported:** `image`, `imageUrl`, `image_url`, `photo`, `photoUrl`, `service_image`, `service_photo`, `images` (file upload, base64, or direct URL).
- ✅ **All response keys returned:** Every service response now includes:
  `image`, `imageUrl`, `image_url`, `photo`, `photoUrl`, `photo_url`, `service_image`, `service_photo`, and `images: [url]`.
- ✅ **Automatic HTTPS URL Resolution:** All uploaded images automatically resolve to complete, direct HTTPS URLs.
- ✅ **Safe Fallback:** If no photo is uploaded, it safely falls back to a clean default service banner (`DEFAULT_PRODUCT_SERVICE_IMAGE`).

---

## 💻 Frontend Code Examples

### A. React Native / Mobile App — Edit Service Screen (Expo / React Native CLI)

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, StyleSheet, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = 'https://digi-local-backend.onrender.com';

export default function EditServiceScreen({ route, navigation }) {
  const { service, vendorId, token } = route.params;

  const [serviceName, setServiceName] = useState(service.service_name || service.name || '');
  const [category, setCategory] = useState(service.category || 'Electrician & Repairs');
  const [price, setPrice] = useState(String(service.price ?? ''));
  const [visitingCharge, setVisitingCharge] = useState(String(service.visiting_charge ?? ''));
  const [estimatedDuration, setEstimatedDuration] = useState(service.estimated_duration || '1 hour');
  const [serviceLocation, setServiceLocation] = useState(service.service_location || "At Customer's Doorstep");
  const [description, setDescription] = useState(service.description || '');
  
  // Existing photo URL from service (note: you can safely use service.image or service.imageUrl)
  const [existingImage, setExistingImage] = useState(service.image || service.image_url || service.imageUrl);
  const [newPhotoUri, setNewPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Pick new photo from Gallery
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewPhotoUri(result.assets[0].uri);
    }
  };

  const handleUpdateService = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Validation Error', 'Service name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const serviceId = service.service_id || service.id;

      // Use FormData to support binary photo update or text update seamlessly
      const formData = new FormData();
      formData.append('service_name', serviceName.trim());
      formData.append('category', category);
      formData.append('price', price);
      formData.append('visiting_charge', visitingCharge);
      formData.append('estimated_duration', estimatedDuration);
      formData.append('service_location', serviceLocation);
      formData.append('description', description.trim());

      // If user selected a NEW photo, attach it. If not, omit it and backend preserves existing photo!
      if (newPhotoUri) {
        const filename = newPhotoUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('image', { uri: newPhotoUri, name: filename, type } as any);
      }

      const res = await fetch(`${API_BASE}/api/vendorPanel/${vendorId}/services/${serviceId}`, {
        method: 'PUT', // or PATCH or POST
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update service');
      }

      Alert.alert('Success 🎉', 'Service updated successfully!');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Network error while updating service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Photo Preview & Change Button */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: newPhotoUri || existingImage }}
          style={styles.imagePreview}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
          <Text style={styles.changePhotoText}>📷 Change Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <Text style={styles.label}>Service Name</Text>
      <TextInput style={styles.input} value={serviceName} onChangeText={setServiceName} />

      <Text style={styles.label}>Price (₹)</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" />

      <Text style={styles.label}>Visiting / Inspection Charge (₹)</Text>
      <TextInput style={styles.input} value={visitingCharge} onChangeText={setVisitingCharge} keyboardType="numeric" />

      <Text style={styles.label}>Estimated Duration</Text>
      <TextInput style={styles.input} value={estimatedDuration} onChangeText={setEstimatedDuration} />

      <Text style={styles.label}>Service Description</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline />

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateService} disabled={loading}>
        <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#F8F9FA' },
  imageContainer: { alignItems: 'center', marginBottom: 20 },
  imagePreview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#E9ECEF' },
  changePhotoBtn: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#212529', borderRadius: 8 },
  changePhotoText: { color: '#FFF', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#495057', marginBottom: 6 },
  input: { backgroundColor: '#FFF', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#CED4DA', marginBottom: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#0D6EFD', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' }
});
```

---

### B. Next.js / React Web Form — Edit Service Function

```tsx
/**
 * Update an existing service from Web (Next.js / React)
 * Supports either JSON or FormData
 */
export async function updateService(vendorId: number, serviceId: number, formValues: any, token: string) {
  // If an image file was selected from <input type="file" />:
  if (formValues.imageFile) {
    const formData = new FormData();
    formData.append('service_name', formValues.service_name);
    formData.append('category', formValues.category);
    formData.append('price', String(formValues.price));
    formData.append('visiting_charge', String(formValues.visiting_charge));
    formData.append('estimated_duration', formValues.estimated_duration);
    formData.append('service_location', formValues.service_location);
    formData.append('description', formValues.description);
    formData.append('image', formValues.imageFile);

    const res = await fetch(`https://digi-local-backend.onrender.com/api/vendorPanel/${vendorId}/services/${serviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    return await res.json();
  }

  // If updating text/pricing only (JSON):
  const res = await fetch(`https://digi-local-backend.onrender.com/api/vendorPanel/${vendorId}/services/${serviceId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      service_name: formValues.service_name,
      category: formValues.category,
      price: Number(formValues.price),
      visiting_charge: Number(formValues.visiting_charge),
      estimated_duration: formValues.estimated_duration,
      service_location: formValues.service_location,
      description: formValues.description,
      // If passing a new hosted image URL:
      image_url: formValues.image_url || undefined
    })
  });

  return await res.json();
}
```

---

## 📌 Summary Checklist for Frontend Developers

1. **How to display Service Image:**  
   You can now safely read **`service.image`**, **`service.imageUrl`**, or **`service.image_url`**. All of them contain the full HTTPS URL.
2. **Endpoint to Edit Service:**  
   `PUT /api/vendorPanel/:vendorId/services/:serviceId` (or `PATCH` / `POST` / `/api/services/:serviceId`).
3. **Dedicated Photo Upload Endpoint:**  
   `POST /api/vendorPanel/:vendorId/services/:serviceId/image`.
4. **Preserving Photo on Edit:**  
   Simply don't send the `image` field when editing text fields, and the backend will preserve the existing photo.
5. **Location Pills:**  
   Supported values: `"At Customer's Doorstep"`, `"At Shop / Clinic"`, or `"Online / Remote"`.


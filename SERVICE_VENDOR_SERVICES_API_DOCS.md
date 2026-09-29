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

### 4️⃣ Update Service Details
Updates service pricing, duration, location, description, or replaces the photo.

```http
PUT /api/vendorPanel/:vendorId/services/:serviceId
```
*Aliases: `PATCH /api/vendorPanel/:vendorId/services/:serviceId`, `PUT /api/services/:serviceId`*

#### Request Body (`application/json` or `multipart/form-data`)
```json
{
  "price": 449,
  "visiting_charge": 79,
  "estimated_duration": "1.5 hours",
  "description": "Updated promo discount pricing for winter."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "message": "Service updated successfully",
  "service": {
    "service_id": 1,
    "vendor_id": 1296,
    "service_name": "Split AC Deep Cleaning & Servicing",
    "price": 449.00,
    "visiting_charge": 79.00,
    "estimated_duration": "1.5 hours",
    "updated_at": "2026-09-29T10:15:00.000Z"
  }
}
```

---

### 5️⃣ Toggle Service Availability (Active / Inactive)
Enables or disables a service (e.g. if technician is temporarily unavailable).

```http
PATCH /api/vendorPanel/:vendorId/services/:serviceId/availability
```
*Alias: `PATCH /api/services/:serviceId/availability`*

#### Request Body (Optional - if omitted, it simply inverts the current state)
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

### 6️⃣ Delete Service
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

### 7️⃣ Storefront Customer View (Website & Resident App)
When a customer views the vendor's store on web or mobile:

```http
GET /api/vendors/:vendorId
```
*Alias: `GET /api/stores/:vendorId`*

The backend **automatically attaches** the full list of services under the `services` key:

```json
{
  "success": true,
  "vendor_id": 1296,
  "store_name": "Sharma Electricals & AC Services",
  "vendor_type": "service",
  "can_add_items": false,
  "services": [
    {
      "service_id": 1,
      "service_name": "Split AC Deep Cleaning & Servicing",
      "category": "Electrician & Repairs",
      "price": 499.00,
      "visiting_charge": 99.00,
      "estimated_duration": "1 hour",
      "service_location": "At Customer's Doorstep",
      "image_url": "https://digi-local-backend.onrender.com/uploads/service_1.jpg",
      "is_available": true
    }
  ]
}
```

---

## 💻 Frontend Code Examples

### A. React Native / Mobile App (Expo Image Picker / Camera)

```tsx
import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

const API_BASE = 'https://digi-local-backend.onrender.com';

export default function AddServiceScreen({ vendorId, token, navigation }) {
  const [serviceName, setServiceName] = useState('');
  const [category, setCategory] = useState('Electrician & Repairs');
  const [price, setPrice] = useState('499');
  const [visitingCharge, setVisitingCharge] = useState('99');
  const [estimatedDuration, setEstimatedDuration] = useState('1 hour');
  const [serviceLocation, setServiceLocation] = useState("At Customer's Doorstep");
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  // Pick Image from Gallery or Camera
  const pickImage = async (fromCamera = false) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleAddService = async () => {
    if (!serviceName.trim()) {
      alert('Please enter a service name');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('service_name', serviceName.trim());
      formData.append('category', category);
      formData.append('price', price);
      formData.append('visiting_charge', visitingCharge);
      formData.append('estimated_duration', estimatedDuration);
      formData.append('service_location', serviceLocation);
      formData.append('description', description.trim());

      if (photoUri) {
        const filename = photoUri.split('/').pop() || 'service.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('image', { uri: photoUri, name: filename, type } as any);
      }

      const res = await fetch(`${API_BASE}/api/vendorPanel/${vendorId}/services`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to add service');
      }

      alert('Service added successfully! 🎉');
      navigation.goBack();
    } catch (err: any) {
      alert(err.message || 'Error saving service');
    } finally {
      setLoading(false);
    }
  };

  return (
    // Your UI Form with Image preview, TextInputs, Category picker, and ADD SERVICE button
  );
}
```

---

### B. Next.js / React Web Form (JSON or FormData)

```tsx
async function submitService(vendorId, formValues, token) {
  const response = await fetch(`https://digi-local-backend.onrender.com/api/vendors/${vendorId}/services`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      service_name: formValues.serviceName,
      category: formValues.category,
      price: Number(formValues.price),
      visiting_charge: Number(formValues.visitingCharge),
      estimated_duration: formValues.estimatedDuration,
      service_location: formValues.serviceLocation,
      description: formValues.description,
      image_url: formValues.imageUrl,
      is_available: true
    })
  });

  return await response.json();
}
```

---

## 📌 Summary Checklist for Frontend Developers

1. **Endpoint to call on "ADD SERVICE" button:**  
   `POST /api/vendorPanel/:vendorId/services` (or `/api/vendors/:vendorId/services`).
2. **For Camera/Media upload:**  
   Send `FormData` with field name `image` or `photo`.
3. **Location pills selection:**  
   Send one of: `"At Customer's Doorstep"`, `"At Shop / Clinic"`, or `"Online / Remote"`.
4. **Showing services to customers:**  
   When querying `GET /api/vendors/:vendorId`, look at the `response.services` array!

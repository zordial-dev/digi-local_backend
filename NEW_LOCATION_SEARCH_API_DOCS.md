# 📍 DigiLocal — New Area & City/State Location Search API Specification

> **Document Version**: 4.0.0-NEW-WORKFLOW  
> **Target Audience**: Vendor App & Resident Storefront Frontend Developers (Web, React Native, Expo, Flutter)  
> **Base URL (Local)**: `http://localhost:5001/api`  
> **Base URL (Production)**: `https://api.digilocal.in/api`  
> **Database Table Reference**: [`locations`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/models/schema.sql#L3-L10) and [`vendors`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/models/schema.sql#L64-L125) tables in [`schema.sql`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/models/schema.sql)

---

## 📋 Executive Architecture Summary

The location workflow in DigiLocal has been updated to a **simplified Area, City, State, and Pincode string matching model**:

1. **Vendor Registration & Location Storage**: When a vendor registers, they submit `location` (area name, e.g. `"A, sitapura"`), `city` (e.g. `"Jaipur"`), `state` (e.g. `"Rajasthan"`), and `pincode` (e.g. `"302022"`).
2. **Resident Area Search**: When a resident inputs an area keyword (e.g. `"sitapura"`), the backend returns all vendors whose location matches the input (e.g. vendors in `"A, sitapura"` and `"B, sitapura"`).
3. **City & State Filtering**: Residents can apply `city` and `state` filters to view all servicing shops within that city/state.
4. **Locations Table (`locations`)**: Automatically stores and indexes all registered areas for live autocompletion on frontend search inputs.

---

## ⚠️ CRITICAL NOTICE FOR FRONTEND DEVELOPERS (Features Commented Out)

> [!IMPORTANT]
> **Please update your frontend application code to disable/comment out the following old features**:
> 
> 1. ❌ **Go Global Interactive Map & Radius Circle Selector**:
>    - Comment out Leaflet / Google Maps radius circle slider (`1 km`, `3 km`, `5 km`, `10 km`).
>    - Comment out interactive square checkpoint boxes (`[✓]` / `[ ]`).
>    - **Do NOT call `POST /api/vendors/check-coverage`** (this endpoint is now disabled).
> 2. ❌ **User Live GPS Location Prompt**:
>    - Remove browser/device GPS permission prompts (`navigator.geolocation.getCurrentPosition()`).
>    - Remove 10 km distance restriction alerts. Storefront access is now open based on string matching.
> 3. ✅ **Replace with Simplified Form & Search Bar**:
>    - On Vendor Registration & Profile Settings: Provide text inputs for **`location` (Area)**, **`city`**, **`state`**, and **`pincode`**.
>    - On Resident Storefront: Provide an **Area Search Bar** and **City / State Dropdown Filters**.

---

## 🗄️ Database Schemas

### 1. `locations` Table
```sql
CREATE TABLE IF NOT EXISTS locations (
    location_id BIGSERIAL PRIMARY KEY,
    area VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Location Columns in `vendors` Table
```sql
location VARCHAR(255),  -- Area Name (e.g. "A, Sitapura", "Sector 62")
city VARCHAR(100),      -- City Name (e.g. "Jaipur", "Noida")
state VARCHAR(100),     -- State Name (e.g. "Rajasthan", "Uttar Pradesh")
pincode VARCHAR(20)     -- Postal Pincode (e.g. "302022")
```

---

## 📡 API Endpoints Reference

### 1. 🏬 Register Vendor with Location Details (`POST /api/vendors/register`)

Registers a vendor store along with mandatory/optional area location fields.

* **Route**: `POST /api/vendors/register`
* **Auth**: None

#### Request Payload
```json
{
  "vendor_name": "Ramesh Kumar",
  "store_name": "Ramesh Electricals & Hardware",
  "phone_number": "9876543210",
  "password": "VendorPassword123!",
  "account_number": "5010023456789",
  "ifsc_code": "SBIN0001234",
  "vendor_type": "product",
  "location": "A, Sitapura Industrial Area",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302022"
}
```

#### Response (201 Created)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 12,
  "vendor": {
    "vendor_id": 12,
    "store_name": "Ramesh Electricals & Hardware",
    "location": "A, Sitapura Industrial Area",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302022",
    "status": "ACTIVE"
  }
}
```

---

### 2. 🔍 Storefront Vendor Area & City/State Search (`GET /api/vendors/search`)

Searches vendors matching an area keyword or filtered by city and state.

* **Route**: `GET /api/vendors/search`
* **Auth**: None

#### Query Parameters
| Parameter | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`area`** (or `location`, `q`, `search`) | `string` | Search area keyword matching location string. | `sitapura` |
| **`city`** | `string` | Filter vendors by city name. | `Jaipur` |
| **`state`** | `string` | Filter vendors by state name. | `Rajasthan` |
| **`pincode`** | `string` | Filter vendors by postal pincode. | `302022` |
| **`type`** | `string` | Vendor classification (`product` or `service`). | `product` |

#### Example Request
```http
GET /api/vendors/search?area=sitapura&city=Jaipur&state=Rajasthan&type=product
```

#### Response (200 OK)
```json
[
  {
    "vendor_id": 12,
    "store_name": "Ramesh Electricals & Hardware",
    "vendor_name": "Ramesh Kumar",
    "phone_number": "9876543210",
    "vendor_type": "product",
    "location": "A, Sitapura Industrial Area",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302022",
    "coverage_badge": "Location: A, Sitapura Industrial Area"
  },
  {
    "vendor_id": 15,
    "store_name": "Sitapura Auto Spares",
    "vendor_name": "Vikram Singh",
    "phone_number": "9811223344",
    "vendor_type": "product",
    "location": "B, Sitapura Commercial Complex",
    "city": "Jaipur",
    "state": "Rajasthan",
    "pincode": "302022",
    "coverage_badge": "Location: B, Sitapura Commercial Complex"
  }
]
```

---

### 3. 📍 Fetch Autocomplete Locations (`GET /api/locations`)

Returns list of registered areas, cities, and states for live autocompleting search bars and dropdown filters.

* **Route**: `GET /api/locations`
* **Auth**: None

#### Query Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| **`search`** (or `q`, `area`) | `string` | Keyword search area or city. |
| **`city`** | `string` | Filter locations by city. |
| **`state`** | `string` | Filter locations by state. |

#### Response (200 OK)
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "location_id": 1,
      "area": "A, Sitapura Industrial Area",
      "city": "Jaipur",
      "state": "Rajasthan",
      "pincode": "302022"
    },
    {
      "location_id": 2,
      "area": "B, Sitapura Commercial Complex",
      "city": "Jaipur",
      "state": "Rajasthan",
      "pincode": "302022"
    }
  ]
}
```

---

### 4. ⚙️ Update Vendor Location & Profile Settings (`PUT /api/vendors/:vendorId/coverage`)

Updates a vendor's shop area, city, state, and pincode in their profile.

* **Route**: `PUT /api/vendors/:vendorId/coverage`
* **Auth**: Required (`Bearer <VENDOR_TOKEN>`)

#### Request Payload
```json
{
  "location": "C, Sitapura Tech Park",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302022"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Vendor location details updated successfully!",
  "vendor_id": 12,
  "location": "C, Sitapura Tech Park",
  "city": "Jaipur",
  "state": "Rajasthan",
  "pincode": "302022"
}
```

---

## 💻 Frontend Code Example (React / Next.js Area & City Search)

```tsx
import React, { useState } from 'react';

export function StorefrontSearchHeader({ onSearch }: { onSearch: (params: any) => void }) {
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ area, city, state });
  };

  return (
    <form onSubmit={handleSearchSubmit} className="search-header-container">
      {/* Area Text Input */}
      <input
        type="text"
        value={area}
        onChange={(e) => setArea(e.target.value)}
        placeholder="Enter Area (e.g. sitapura, sector 62)..."
      />

      {/* City Dropdown / Input */}
      <input
        type="text"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        placeholder="City (e.g. Jaipur)"
      />

      {/* State Input */}
      <input
        type="text"
        value={state}
        onChange={(e) => setState(e.target.value)}
        placeholder="State (e.g. Rajasthan)"
      />

      <button type="submit">🔍 Search Shops</button>
    </form>
  );
}
```

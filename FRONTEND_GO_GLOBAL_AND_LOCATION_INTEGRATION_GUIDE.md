# DigiLocal - Frontend Integration Guide: Go Global Vendor Coverage & User Location Engine

> **For Frontend Developers (React / React Native / Next.js / Vue / Flutter)**  
> **Local Network Base URL**: `http://172.25.12.195:5001/api` (Localhost: `http://localhost:5001/api`)  
> **Production Base URL**: `https://api.digilocal.in/api`  
> This guide details the complete user flow, vendor flow, API endpoints, data models, and component UI architecture for implementing **Go Global Vendor Coverage** and **User Location-Based Store Discovery**.

---

## 📌 System Architectural Overview

DigiLocal operates a location-aware delivery and service platform divided into two distinct frontend flows:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 DIGILOCAL LOCATION ARCHITECTURE                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌────────────────────────────────────────┐                       ┌────────────────────────────────────────┐
│     USER / RESIDENT WEB & MOBILE APP   │                       │      VENDOR ADMIN & PANEL APP          │
├────────────────────────────────────────┤                       ├────────────────────────────────────────┤
│ • Prompt Location on Website Entry     │                       │ • Vendor Selects Radius & Store Point  │
│ • Live Autocomplete Search + Live GPS  │                       │ • Interactive Map with Radius Circle   │
│ • NO MAP DISPLAY (Store List Only)     │                       │ • Interactive Square Checkpoint Boxes  │
│ • Filter & Show Servicing Stores Only  │                       │ • Toggle Serviceable Societies/Sectors  │
│ • Block Out-of-Coverage Direct Access  │                       │ • Save Selected Zones to Store Profile │
└────────────────────────────────────────┘                       └────────────────────────────────────────┘
```

---

## 1. 🏡 User / Resident Web & Mobile App Integration

### 1.1 User Flow & Requirements
1. **Initial Website / App Load**:
   - When a user enters the app, prompt them to set their location (Modal or Header Location Selector).
   - Provide two options:
     1. **`📍 Use Current GPS Location`**: Trigger browser/device `navigator.geolocation.getCurrentPosition()`.
     2. **`🔍 Type City / Sector / Society`**: Input box with **live autocompleting suggestions dropdown**.
2. **Storefront Search Execution**:
   - Store `user_lat`, `user_lng`, and `user_sector` in application state / LocalStorage.
   - Execute `GET /api/vendors/search?user_lat=${lat}&user_lng=${lng}&type=${vendorType}`.
3. **UI Rendering (NO MAP REQUIRED FOR USER)**:
   - **Do NOT render a map for the user**.
   - Display a clean grid/list of **accessible vendor store cards** servicing the user's location.
   - Attach hyper-local badges (e.g., `In Your Society`, `Go Global Servicable`, `Distance: 1.2 km`).
4. **Direct Storefront Access Enforcement**:
   - When user navigates to a store page (`/store/:vendorId`), pass `user_lat` and `user_lng` to `GET /api/vendors/:vendorId`.
   - If HTTP 200 OK: Display store catalog.
   - If HTTP 403 Forbidden: Display friendly location restriction alert (`"This store does not service your area"`).

---

### 1.2 User Location Prompt Component (React / Next.js Example)

```tsx
import React, { useState, useEffect } from 'react';

interface LocationState {
  lat: number;
  lng: number;
  address: string;
}

export const UserLocationPromptModal = ({ onLocationSet }: { onLocationSet: (loc: LocationState) => void }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Live Autocomplete Suggestions
  const handleInputChange = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  // GPS Location Trigger
  const handleUseGPS = () => {
    if (!navigator.geolocation) return alert('GPS not supported');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      let address = `Live GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data?.display_name) {
          address = data.display_name.split(',').slice(0, 3).join(', ');
        }
      } catch (e) {}

      setLoading(false);
      onLocationSet({ lat, lng, address });
    }, (err) => {
      setLoading(false);
      alert('GPS Permission Denied. Please search location manually.');
    });
  };

  return (
    <div className="location-modal-overlay">
      <div className="location-modal-card">
        <h2>📍 Select Your Location to See Available Stores</h2>
        
        <button onClick={handleUseGPS} disabled={loading} className="btn-gps">
          {loading ? 'Detecting GPS...' : '📍 Use My Current GPS Location'}
        </button>

        <div className="divider">OR SEARCH AREA</div>

        <div className="autocomplete-container">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search City, Sector, or Society (e.g. Kumbha Marg Jaipur, Sector 62 Noida)..."
          />
          {suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="suggestion-item"
                  onClick={() => {
                    const shortName = item.display_name.split(',').slice(0, 3).join(', ');
                    onLocationSet({ lat: parseFloat(item.lat), lng: parseFloat(item.lon), address: shortName });
                  }}
                >
                  📍 <b>{item.display_name.split(',').slice(0, 3).join(', ')}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

---

### 1.3 Fetching Accessible Vendors for User (API Integration)

```typescript
// Fetch Servicing Vendors for User Location
export async function getServicingVendors(userLat: number, userLng: number, vendorType: 'product' | 'service' = 'product') {
  const url = `/api/vendors/search?user_lat=${userLat}&user_lng=${userLng}&type=${vendorType}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to load servicing vendors');
  }

  const vendors = await response.json();
  return vendors; // Returns Array of location-filtered vendor objects
}
```

---

## 2. 🗺️ Vendor App / Vendor Admin Panel Integration

### 2.1 Vendor Flow & Requirements
1. **Radius & Store Center Selection**:
   - Vendor enters Radius (`1 km`, `3 km`, `5 km`, `10 km max`).
   - Store position defaults to registered shop lat/lng or detected GPS point.
2. **Interactive Map Display**:
   - Render Map (Google Maps or Leaflet) with green coverage circle overlay.
   - Display store center marker (`🏪 Vendor Store Center`).
3. **Interactive Square Checkpoint Markers (`[✓]`)**:
   - Call `POST /api/vendors/check-coverage` passing `vendor_id` to calculate all surrounding societies, sectors, and commercial areas (up to 10 km max).
   - Render each area as an interactive square tick box marker on the map:
     - **Active / Selected Area**: Solid Green Square Box with White Checkmark (`[✓]`).
     - **Inactive / Excluded Area**: Empty Grey Outline Box (`[ ]`) with **NO tick**.
4. **2-Way Synchronized Tick Box List View**:
   - Render 75-item list view below map with filter tabs (*All*, *Active Only*, *Societies*, *Sectors*).
   - Default tab **MUST be `All`** so areas outside the circle are shown.
   - Toggling a checkbox on the map updates the list item, and vice versa.
5. **Save Coverage**:
   - Execute `PUT /api/vendors/:vendorId/coverage` to save selected serviceable zones to DB.

---

### 2.2 Vendor Check Coverage Request Payload

```json
// POST /api/vendors/check-coverage
{
  "vendor_id": 1,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "radius_km": 3.0,
  "sector": "Sector 62",
  "location_type": "society"
}
```

### 2.3 Vendor Check Coverage Response Schema

```json
{
  "success": true,
  "vendor_location": {
    "latitude": 28.6270,
    "longitude": 77.3720,
    "sector": "Sector 62"
  },
  "radius_km": 3.0,
  "max_distance_limit_km": 10.0,
  "total_zones": 82,
  "auto_selected_count": 3,
  "_comment": "IMPORTANT: The backend returns ALL 82 zones. Frontend MUST render all 82 items (no .slice(0, 13) or artificial limits).",
  "zones": [
    {
      "zone_id": "sec_sector_62",
      "name": "Sector 62 Main Market",
      "type": "sector",
      "location": "Sector 62",
      "latitude": 28.6270,
      "longitude": 77.3720,
      "distance_km": 0.5,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    },
    {
      "zone_id": 101,
      "name": "Greenwood Residency",
      "type": "society",
      "location": "Sector 62",
      "latitude": 28.6280,
      "longitude": 77.3730,
      "distance_km": 0.8,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    },
    {
      "zone_id": 102,
      "name": "Adjacent Sector Commercial Belt",
      "type": "sector",
      "location": "Sector 62",
      "latitude": 28.6410,
      "longitude": 77.3820,
      "distance_km": 4.2,
      "is_inside_circle": false,
      "is_auto_selected": false,
      "is_active": true
    }
  ]
}
```

---

### 2.4 Save Vendor Coverage Payload

```json
// PUT /api/vendors/:vendorId/coverage
{
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 3.0,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "selected_zones": [
    {
      "zone_id": "sec_sector_62",
      "name": "Sector 62 Main Market",
      "type": "sector",
      "distance_km": 0.5,
      "is_active": true
    },
    {
      "zone_id": 101,
      "name": "Greenwood Residency",
      "type": "society",
      "distance_km": 0.8,
      "is_active": true
    }
  ]
}
```

---

## 3. 📡 API Endpoint Reference Summary

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/vendors/check-coverage` | `POST` | Vendor | Calculates societies & sectors within radius (10km max cutoff). Returns map checkpoints. |
| `/api/vendors/:vendorId/coverage` | `PUT` | Vendor | Saves vendor Go Global radius, lat/lng, and active selected coverage zones. |
| `/api/vendors/search` | `GET` | User / Resident | Searches and returns ONLY vendors servicing `(user_lat, user_lng)`. |
| `/api/vendors/:vendorId` | `GET` | User / Resident | Retrieves store catalog. Returns `HTTP 403 Forbidden` if user is outside vendor coverage. |

---

## 💻 Live Working Interactive Demo Reference

Frontend developers can inspect and reference the live working demonstration page at:
👉 **`http://localhost:5001/go-global-demo.html`** (or [`public/go-global-demo.html`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/public/go-global-demo.html)).

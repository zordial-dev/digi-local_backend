# DigiLocal API Documentation: Location Autocomplete & Suggestions

> **Target Audience**: Frontend Web & Mobile Developers (Vendor Panel, Admin Panel, Customer App)  
> **Backend Version**: DigiLocal v2.4 (Production / Staging)  
> **Base URL**: `https://digi-local-backend.onrender.com/api` (Production) or `http://localhost:5000/api` (Local)

---

## ⚠️ CRITICAL NOTICE FOR FRONTEND DEVELOPERS

### 1. Remove Third-Party OpenStreetMap (Nominatim) Calls
The frontend is currently firing parallel API calls to `https://nominatim.openstreetmap.org/search?q={query}+India...`.  
**You MUST remove all calls to OpenStreetMap / Nominatim.**  
All location and area suggestions **must strictly come from the DigiLocal database `locations` table**.

### 2. Cache-Control Update
The backend now returns `Cache-Control: no-store, no-cache, must-revalidate` to ensure browser caching (e.g. `304 Not Modified`) never serves stale location data.

---

## 1. Location Autocomplete / Search API

Search and suggest areas, cities, and pincodes from the DigiLocal `locations` table.

### **Endpoint**
`GET /api/locations`  
*(Aliases: `/api/locations/suggestions`, `/api/locations/search`, `/api/vendors/locations/suggestions`)*

### **Query Parameters**

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `search` (or `q`) | `string` | Optional | Partial search term matched against `area`, `city`, `state`, or `pincode`. Case-insensitive. | `jagat` |
| `city` | `string` | Optional | Filter strictly by exact city name. | `Jaipur` |
| `state` | `string` | Optional | Filter strictly by exact state name. | `Rajasthan` |

---

### **Success Response (200 OK)**

#### When matches exist in the database:
```json
{
  "success": true,
  "total": 1,
  "query": "jagatp",
  "suggestions": [
    "Jagatpura"
  ],
  "areas": [
    "Jagatpura"
  ],
  "data": [
    {
      "location_id": 90,
      "area": "Jagatpura",
      "city": "Jaipur Municipal Corporation",
      "state": "Rajasthan",
      "pincode": "302017"
    }
  ]
}
```

#### When NO matches exist (or `locations` table is empty):
```json
{
  "success": true,
  "total": 0,
  "query": "unknown_area",
  "suggestions": [],
  "areas": [],
  "data": []
}
```

---

## 2. Frontend Implementation Guide (React / Vue / React Native / Axios)

### **Example: Debounced Search Hook (Axios)**

```javascript
import axios from 'axios';

// Call DigiLocal Backend ONLY
export const fetchLocationSuggestions = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    return [];
  }

  try {
    const response = await axios.get('https://digi-local-backend.onrender.com/api/locations', {
      params: { search: searchTerm.trim() },
      headers: {
        'Cache-Control': 'no-cache'
      }
    });

    if (response.data && response.data.success) {
      // response.data.data contains full objects: { location_id, area, city, state, pincode }
      // response.data.suggestions contains array of area name strings: ["Jagatpura"]
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching locations from DigiLocal DB:', error);
    return [];
  }
};
```

### **Frontend UI Rules:**
1. **Never fallback to OpenStreetMap / Google Places** unless explicitly approved.
2. If `data.length === 0`:
   - Display a dropdown item: *"No existing locations found in database"*.
   - Either prompt the vendor to select an existing approved location, or allow them to type a custom location that will be saved to the database upon registration.

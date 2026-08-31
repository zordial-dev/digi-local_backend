# DigiLocal API Docs — Area Autocomplete & Location Suggestions API

This document provides complete instructions for Frontend Developers (Vendor App, Vendor Web, Admin Panel, and Customer Storefront) to implement **real-time Area Autocomplete Suggestions** when a user or vendor types an area, society, or locality name.

---

## 1. Area Suggestions / Autocomplete API

### Endpoints (All Aliases Supported)
- **GET** `/api/locations/suggestions`
- **GET** `/api/locations`
- **GET** `/api/locations/search`
- **GET** `/api/vendors/locations/suggestions`

---

## 2. Request Parameters

Query parameters can be passed using any of the following standard parameter keys: `q`, `search`, `query`, `area`, `term`, or `input`.

| Parameter | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `q` / `search` / `query` | `string` | Optional | `""` | Search query entered by user/vendor (e.g., `"Sec"`, `"Sitapura"`). Searches against the `locations` table `area`, `city`, and `pincode` columns. |
| `city` | `string` | Optional | `""` | Optional city filter (e.g., `"Noida"`). |
| `state` | `string` | Optional | `""` | Optional state filter (e.g., `"Uttar Pradesh"`). |

---

## 3. Example Request

### HTTP Request
```http
GET /api/locations/suggestions?q=Sec HTTP/1.1
Host: localhost:5000
```

---

## 4. Response Structure & Example

### Example 200 Success Response
```json
{
  "success": true,
  "total": 3,
  "query": "sec",
  "suggestions": [
    "Sector 62",
    "Sector 63",
    "Sector 18"
  ],
  "areas": [
    "Sector 62",
    "Sector 63",
    "Sector 18"
  ],
  "data": [
    {
      "location_id": 1,
      "area": "Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    },
    {
      "location_id": 2,
      "area": "Sector 63",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    },
    {
      "location_id": 3,
      "area": "Sector 18",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    }
  ]
}
```

### Response Field Descriptions

| Field | Type | Description |
| :--- | :--- | :--- |
| `success` | `boolean` | `true` on success. |
| `query` | `string` | The active search query term processed by backend. |
| `suggestions` | `string[]` | **Array of clean area names** ready for rendering directly into frontend dropdown lists. |
| `areas` | `string[]` | Alias of `suggestions` for frontend convenience. |
| `data` | `object[]` | Full location objects including `location_id`, `area`, `city`, `state`, `pincode`. |

---

## 5. Frontend React / React Native Implementation Example

```jsx
import React, { useState } from 'react';

export function AreaAutocompleteInput({ onSelectArea }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setQuery(text);

    if (text.trim().length > 0) {
      fetch(`http://localhost:5000/api/locations/suggestions?q=${encodeURIComponent(text)}`)
        .then(res => res.json())
        .then(data => {
          setSuggestions(data.suggestions || []);
        })
        .catch(err => console.error('Error fetching area suggestions:', err));
    } else {
      setSuggestions([]);
    }
  };

  const handleSelect = (areaName) => {
    setQuery(areaName);
    setSuggestions([]);
    if (onSelectArea) onSelectArea(areaName);
  };

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Type Area / Sector name..."
        value={query}
        onChange={handleInputChange}
        className="input-field"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', zIndex: 1000, listStyle: 'none', margin: 0, padding: 0 }}>
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              onClick={() => handleSelect(item)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
            >
              📍 {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

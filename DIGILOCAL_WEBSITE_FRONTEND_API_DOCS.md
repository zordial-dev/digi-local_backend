# 🌐 DigiLocal — Website Frontend Developer Master API Documentation
## (User Web Panel & Vendor Web Portal)

> **Document Version**: 3.1.0-PROD  
> **Author**: DigiLocal Engineering Architecture Team  
> **Target Audience**: Website Frontend Developers (React, Next.js, Vue, Web Portals)  
> **Local Network Base URL**: `http://172.25.12.195:5001/api` (Local: `http://localhost:5001/api`)  
> **Production Base URL**: `https://api.digilocal.in/api`  
> **Universal Master OTP**: `999999` (or `123456` for instant testing without SMS)

---

## 📋 Executive Architecture Summary

DigiLocal is a location-aware hyper-local marketplace platform connecting residents with local **Product Merchants** (Grocery, Bakery, Electronics) and **Service Providers** (Electrician, AC Repair, Plumbing).

This document provides the complete API specification for the **Website Frontend Developer** building both:
1. **User / Resident Web Panel**: Location capture on website entry, storefront discovery of servicing vendors, product shopping cart checkout, service enquiry submission with direct WhatsApp routing, and dual order/enquiry tracking dashboard.
2. **Vendor Web Portal**: Vendor onboarding, setting dynamic Go Global serviceable areas (Radius circle + Interactive Checkpoints), catalog management, order fulfillment, and service leads board.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DIGILOCAL WEBSITE FRONTEND ARCHITECTURE                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌────────────────────────────────────────┐                       ┌────────────────────────────────────────┐
│      PART 1: USER WEB PANEL FLOW       │                       │     PART 2: VENDOR WEB PORTAL FLOW     │
├────────────────────────────────────────┤                       ├────────────────────────────────────────┤
│ 1. Prompt Location on Website Entry    │                       │ 1. Vendor Registers/Logins & Sets Loc  │
│ 2. Live Autocomplete Search + GPS      │                       │ 2. Selects Radius (1km - 10km max)     │
│ 3. NO MAP DISPLAY (Store List Only)    │                       │ 3. Check Coverage (Map Checkpoints)    │
│ 4. Filter & Display Servicing Stores   │                       │ 4. Toggle Serviceable Societies/Sectors │
│ 5. Enforce 403 Forbidden Out-of-Area   │                       │ 5. Save Coverage Areas to Store DB     │
└────────────────────────────────────────┘                       └────────────────────────────────────────┘
```

---

## 1. 🔑 Authentication & HTTP Headers

All authenticated endpoints require a Bearer token header:
```http
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json
```

---

## 2. 🏬 PART 1: VENDOR WEB PORTAL APIs (Coverage Setup & Catalog)

### 2.1 Calculate Vendor Coverage Checkpoints (`POST /api/vendors/check-coverage`)

Vendors use this API to set their store location and radius, returning all surrounding societies, sectors, sub-areas, and big-areas within distance (up to 10 km max limit).

- **Route**: `POST /api/vendors/check-coverage`
- **Auth Required**: No (Public vendor setup)

#### Request Payload
```json
{
  "latitude": 28.6270,
  "longitude": 77.3720,
  "radius_km": 3.0,
  "sector": "Sector 62",
  "location_type": "society"
}
```

#### Response (HTTP 200 OK)
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
      "zone_id": "sec_adjacent_1",
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

### 2.2 Save Vendor Serviceable Coverage Areas (`PUT /api/vendors/:vendorId/coverage`)

Saves the vendor's selected Go Global serviceable societies and sectors into the store profile in the database.

- **Route**: `PUT /api/vendors/:vendorId/coverage`
- **Auth Required**: Yes (`Bearer <VENDOR_TOKEN>`)

#### Request Payload
```json
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
    },
    {
      "zone_id": "sec_adjacent_1",
      "name": "Adjacent Sector Commercial Belt",
      "type": "sector",
      "distance_km": 4.2,
      "is_active": true
    }
  ]
}
```

#### Response (HTTP 200 OK)
```json
{
  "success": true,
  "message": "Vendor Go Global dynamic coverage settings updated successfully",
  "vendor": {
    "vendor_id": 1,
    "store_name": "Raj Super Mart",
    "is_global_coverage": true,
    "delivery_radius_km": 3.0,
    "latitude": 28.6270,
    "longitude": 77.3720,
    "selected_zones_count": 3
  }
}
```

---

## 3. 🏡 PART 2: USER / RESIDENT WEB PANEL APIs (Discovery & Orders)

### 3.1 Storefront Search — Location-Aware Store Discovery (`GET /api/vendors/search`)

When a user enters the website and sets their location (`user_lat`, `user_lng`), the frontend calls this API to render **ONLY vendor stores servicing that resident's area**.

- **Route**: `GET /api/vendors/search`
- **Auth Required**: No (Public resident endpoint)
- **Query Parameters**:
  - `user_lat` (required, float): e.g. `28.6270`
  - `user_lng` (required, float): e.g. `77.3720`
  - `sector` (optional, string): e.g. `"Sector 62"`
  - `type` (optional, string): `"product"` or `"service"` (Default: all)

#### Example HTTP Request
```http
GET /api/vendors/search?user_lat=28.6270&user_lng=77.3720&type=product HTTP/1.1
Host: api.digilocal.in
```

#### Response (HTTP 200 OK)
```json
[
  {
    "vendor_id": 1,
    "store_name": "Raj Super Mart",
    "vendor_name": "Raj Kumar",
    "vendor_type": "product",
    "phone": "9876543210",
    "category": "Grocery & Supermarket",
    "logo_url": "https://img.digilocal.in/stores/1.png",
    "address": "Shop 12, Sector 62 Main Market, Noida",
    "latitude": 28.6270,
    "longitude": 77.3720,
    "delivery_radius_km": 3.0,
    "distance_km": 0.5,
    "is_servicable": true,
    "coverage_badge": "Go Global Servicable",
    "rating": 4.8,
    "is_open": true
  },
  {
    "vendor_id": 4,
    "store_name": "FreshMart Grocery & Organic",
    "vendor_name": "Rajesh Sharma",
    "vendor_type": "product",
    "phone": "9876543211",
    "category": "Organic Food & Bakery",
    "logo_url": "https://img.digilocal.in/stores/4.png",
    "address": "Sector 62 Market, Noida",
    "latitude": 28.6280,
    "longitude": 77.3730,
    "delivery_radius_km": 5.0,
    "distance_km": 0.8,
    "is_servicable": true,
    "coverage_badge": "Go Global Servicable",
    "rating": 4.9,
    "is_open": true
  }
]
```

---

### 3.2 Direct Store Profile & Catalog Access (`GET /api/vendors/:id`)

Retrieves the store profile and product catalog when a user navigates to a store page (`/store/:vendorId`). Enforces `HTTP 403 Forbidden` if the user is outside the store's coverage area.

- **Route**: `GET /api/vendors/:id`
- **Query Parameters**:
  - `user_lat` (required, float)
  - `user_lng` (required, float)

#### Success Response (HTTP 200 OK - User Inside Coverage Area)
```json
{
  "success": true,
  "is_servicable": true,
  "vendor": {
    "vendor_id": 1,
    "store_name": "Raj Super Mart",
    "vendor_type": "product",
    "phone": "9876543210",
    "category": "Grocery",
    "rating": 4.8,
    "is_open": true
  },
  "items": [
    {
      "item_id": 501,
      "item_name": "Amul Taaza T-Special Milk 1L",
      "category": "Dairy & Milk",
      "price": 68.00,
      "in_stock": true,
      "image_url": "https://img.digilocal.in/items/milk.png"
    },
    {
      "item_id": 502,
      "item_name": "Fortune Sunlite Sunflower Oil 1L",
      "category": "Edible Oils",
      "price": 145.00,
      "in_stock": true,
      "image_url": "https://img.digilocal.in/items/oil.png"
    }
  ]
}
```

#### Denied Response (HTTP 403 Forbidden - User Outside Coverage Area > 10km)
```json
{
  "success": false,
  "error": "Store not available in your location area. Maximum serviceable distance between vendor and user is 10 km.",
  "is_servicable": false
}
```

---

### 3.3 Product Order Checkout (`POST /api/orders`)

- **Route**: `POST /api/orders`
- **Auth Required**: Yes (`Bearer <USER_TOKEN>`)

#### Request Payload
```json
{
  "vendor_id": 1,
  "delivery_address": "Flat 402, Greenwood Residency, Sector 62, Noida",
  "latitude": 28.6270,
  "longitude": 77.3720,
  "items": [
    { "item_id": 501, "quantity": 2 },
    { "item_id": 502, "quantity": 1 }
  ],
  "payment_method": "COD"
}
```

#### Response (HTTP 201 Created)
```json
{
  "success": true,
  "message": "Order created successfully",
  "order": {
    "order_id": 8901,
    "vendor_id": 1,
    "store_name": "Raj Super Mart",
    "total_amount": 281.00,
    "status": "Placed",
    "created_at": "2026-08-26T14:30:00Z"
  }
}
```

---

### 3.4 Service Provider Enquiry Submission (`POST /api/enquiries`)

Sends a service enquiry (e.g. AC Repair, Electrician) to a Service Provider vendor and generates a direct **WhatsApp Click-to-Chat CTA Link**.

- **Route**: `POST /api/enquiries`
- **Auth Required**: No / Optional

#### Request Payload
```json
{
  "vendor_id": 12,
  "user_name": "Ramesh Gupta",
  "user_phone": "9998887776",
  "user_address": "Sector 62, Noida",
  "service_requested": "Split AC Deep Jet Service",
  "preferred_time": "Today, 4:00 PM",
  "notes": "AC cooling low and noise from fan"
}
```

#### Response (HTTP 201 Created)
```json
{
  "success": true,
  "message": "Enquiry submitted successfully. WhatsApp routing link generated.",
  "enquiry": {
    "enquiry_id": 405,
    "vendor_id": 12,
    "status": "PENDING",
    "whatsapp_cta_link": "https://wa.me/919876543210?text=Hi%20Vendor%2C%20I%20need%20Split%20AC%20Deep%20Jet%20Service%20at%20Sector%2062%20Noida.%20Name%3A%20Ramesh%20Gupta"
  }
}
```

---

## 4. 💡 React / Next.js Implementation Code Examples

### 4.1 Location Prompt Component (No Map Display)
```tsx
import React, { useState } from 'react';

export const LocationPrompt = ({ onSelectLocation }: { onSelectLocation: (lat: number, lng: number, name: string) => void }) => {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const handleSearch = async (val: string) => {
    setText(val);
    if (val.length < 2) return setSuggestions([]);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`);
    const data = await res.json();
    setSuggestions(data || []);
  };

  const handleGPS = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      onSelectLocation(lat, lng, 'Current GPS Location');
    });
  };

  return (
    <div className="location-prompt">
      <button onClick={handleGPS}>📍 Use My Live GPS</button>
      <input
        type="text"
        value={text}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Type Sector, City or Area (e.g. Kumbha Marg Jaipur, Sector 62 Noida)..."
      />
      {suggestions.map((s, i) => (
        <div key={i} onClick={() => onSelectLocation(parseFloat(s.lat), parseFloat(s.lon), s.display_name)}>
          📍 {s.display_name.split(',').slice(0, 3).join(', ')}
        </div>
      ))}
    </div>
  );
};
```

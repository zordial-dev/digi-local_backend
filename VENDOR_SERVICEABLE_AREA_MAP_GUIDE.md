# 🗺️ DigiLocal — Vendor Serviceable Area & Interactive Map Component Specification ("Map Wala Part")

> **Document Version**: 1.0.0-PROD  
> **Target Audience**: Vendor Mobile App (React Native, Expo, Flutter) & Web Frontend Developers  
> **Interactive Live Demo File**: [`public/go-global-demo.html`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/public/go-global-demo.html)  
> **Database Table Reference**: [`vendors`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/models/schema.sql#L64-L117) table in [`schema.sql`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/src/models/schema.sql#L108-L113)

---

## 1. 🗄️ Database Schema & Storage Columns

The vendor's serviceable area and map coverage are stored in the **`vendors`** database table using the following key columns:

| Column Name | Data Type | Default | Description |
| :--- | :--- | :--- | :--- |
| **`is_global_coverage`** | `BOOLEAN` | `FALSE` | Toggle enabling wide-area "Go Global" dynamic coverage (`TRUE`) or local society only (`FALSE`). |
| **`delivery_radius_km`** | `DECIMAL(5,2)` | `0.00` | Dynamic delivery radius in kilometers (`1.0`, `3.0`, `5.0`, `10.0` max cutoff limit). |
| **`selected_zones`** | `JSONB` | `'[]'` | JSON array of active societies, sectors, and sub-areas covered by the vendor store. |
| **`latitude`** | `DECIMAL(10,7)` | `28.6270` | Shop physical location latitude coordinate. |
| **`longitude`** | `DECIMAL(10,7)` | `77.3720` | Shop physical location longitude coordinate. |
| **`location_address`** | `TEXT` | `NULL` | Formatted street address / landmark of the vendor shop location. |

---

## 2. 📐 Map UI Architecture & Visual Elements ("Map Wala Part")

The interactive map view consists of **3 main visual components**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                         VENDOR MAP VIEWPORT                            │
 │                                                                        │
 │   ⚪ Out-of-Circle Zone [ ]            🟢 Active Covered Zone [✓]   │
 │   (Grey Outline Box)                 (Solid Green Box + Checkmark)     │
 │                                                                        │
 │             ┌────────────────────────────────────────┐                 │
 │             │   🟢 GREEN COVERAGE RADIUS CIRCLE       │                 │
 │             │   (1 km, 3 km, 5 km, 10 km max)       │                 │
 │             │                                        │                 │
 │             │          🏪 VENDOR STORE PIN           │                 │
 │             │         (Draggable Center Pin)         │                 │
 │             └────────────────────────────────────────┘                 │
 └────────────────────────────────────────────────────────────────────────┘
```

### 2.1 🏪 Draggable Store Center Pin
* **Location**: Anchored to vendor shop `(latitude, longitude)`.
* **Behavior**: Dragging the pin updates shop coordinates in real time and automatically re-fetches surrounding map checkpoints.

### 2.2 🟢 Dynamic Coverage Circle Overlay
* **Radius**: Drawn around store center based on vendor's `delivery_radius_km` dropdown (`1 km`, `3 km`, `5 km`, `10 km max`).
* **Visual Style**: Emerald Green border (`#10B981`) with semi-transparent fill (`opacity: 0.15`).

### 2.3 🔳 Square Checkpoint Box Markers (`[✓]` / `[ ]`)
Each society, sector, or commercial sub-area in the region is rendered as an interactive **Square Checkpoint Box**:
* **Active Selected Zone (`is_active: true`)**: Solid Green Box (`#10B981`) with a **White Checkmark `✓`** (`checkpoint-active`).
* **Inactive / Excluded Zone (`is_active: false`)**: Dark/Grey Outline Box (`#334155`) with **empty space** (`checkpoint-inactive`).
* **Tap/Click Action**: Tapping a box on the map instantly toggles its active status and updates both the map display and the list view below it.

---

## 3. 📡 Backend API Integration Flow for Map

### Step 1: Query Surrounding Map Checkpoints (`POST /api/vendors/check-coverage`)

* **HTTP Route**: `POST /api/vendors/check-coverage`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
```json
{
  "vendor_id": 12,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "radius_km": 3.0,
  "sector": "Sector 62",
  "location_type": "society"
}
```

* **Response Body** (Contains all checkpoint locations inside and nearby the circle):
```json
{
  "success": true,
  "vendor_location": { "latitude": 28.6270, "longitude": 77.3720 },
  "radius_km": 3.0,
  "total_zones": 12,
  "auto_selected_count": 3,
  "zones": [
    {
      "zone_id": 101,
      "name": "Greenwood Residency",
      "type": "society",
      "latitude": 28.6280,
      "longitude": 77.3730,
      "distance_km": 0.8,
      "is_inside_circle": true,
      "is_auto_selected": true,
      "is_active": true
    },
    {
      "zone_id": "sec_sector_62",
      "name": "Sector 62 Commercial Market",
      "type": "sector",
      "latitude": 28.6410,
      "longitude": 77.3820,
      "distance_km": 4.2,
      "is_inside_circle": false,
      "is_auto_selected": false,
      "is_active": false
    }
  ]
}
```

---

### Step 2: Save Final Coverage to Database (`PUT /api/vendors/:vendorId/coverage`)

* **HTTP Route**: `PUT /api/vendors/:vendorId/coverage`
* **Headers**: `Authorization: Bearer <VENDOR_TOKEN>`, `Content-Type: application/json`
* **Request Body**:
```json
{
  "location_type": "area_sector",
  "is_global_coverage": true,
  "delivery_radius_km": 3.0,
  "latitude": 28.6270,
  "longitude": 77.3720,
  "selected_zones": [
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

## 4. 🎨 CSS Styling for Map Checkpoint Square Boxes

Add these CSS styles to your Web application stylesheet:

```css
/* Checkpoint Square Box Styling */
.map-checkpoint {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.6);
  transition: all 0.2s ease;
}

/* Active Serviceable Zone Box (Green with Checkmark ✓) */
.checkpoint-active {
  background: #10B981;
  border: 2px solid #FFFFFF;
  color: #FFFFFF;
  box-shadow: 0 0 14px rgba(16, 185, 129, 0.9);
}

/* Inactive Excluded Zone Box (Grey Outline, Empty) */
.checkpoint-inactive {
  background: rgba(30, 41, 59, 0.85);
  border: 2px solid #94A3B8;
  color: transparent;
  opacity: 0.75;
}
```

---

## 5. 💻 React / Web Map Implementation Code Example (Leaflet / OpenStreetMap)

```jsx
import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';

export function VendorServiceableMap({ vendorId, initialLat = 28.6270, initialLng = 77.3720 }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const circleLayer = useRef(null);

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [radiusKm, setRadiusKm] = useState(3.0);
  const [zones, setZones] = useState([]);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance.current);

      // Add Shop Center Pin
      const storePin = L.marker([lat, lng], { draggable: true }).addTo(mapInstance.current);
      storePin.bindPopup("<b>🏪 Vendor Store Center</b>");
      storePin.on('dragend', (e) => {
        const coord = e.target.getLatLng();
        setLat(coord.lat);
        setLng(coord.lng);
      });
    }
  }, []);

  // 2. Update Radius Circle
  useEffect(() => {
    if (mapInstance.current) {
      if (circleLayer.current) mapInstance.current.removeLayer(circleLayer.current);
      circleLayer.current = L.circle([lat, lng], {
        color: '#10B981',
        fillColor: '#10B981',
        fillOpacity: 0.15,
        radius: radiusKm * 1000
      }).addTo(mapInstance.current);
    }
  }, [lat, lng, radiusKm]);

  // 3. Fetch Map Checkpoints from API
  const fetchCheckpoints = async () => {
    const res = await fetch('/api/vendors/check-coverage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId, latitude: lat, longitude: lng, radius_km: radiusKm })
    });
    const data = await res.json();
    if (data.success) {
      setZones(data.zones);
      renderCheckpointMarkers(data.zones);
    }
  };

  // 4. Render Checkpoint Square Box Markers on Map
  const renderCheckpointMarkers = (zoneList) => {
    zoneList.forEach((z) => {
      const iconHtml = `<div class="map-checkpoint ${z.is_active ? 'checkpoint-active' : 'checkpoint-inactive'}">
        ${z.is_active ? '✓' : ''}
      </div>`;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-checkpoint-pin',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([z.latitude, z.longitude], {
        icon: customIcon,
        zIndexOffset: z.is_active ? 1000 : 100
      }).addTo(mapInstance.current);

      marker.on('click', () => toggleZoneStatus(z.zone_id));
    });
  };

  // 5. Toggle Active Zone
  const toggleZoneStatus = (zoneId) => {
    setZones((prev) =>
      prev.map((z) => (z.zone_id === zoneId ? { ...z, is_active: !z.is_active } : z))
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        <select value={radiusKm} onChange={(e) => setRadiusKm(parseFloat(e.target.value))}>
          <option value={1}>1 km (Neighborhood)</option>
          <option value={3}>3 km (Local Sector)</option>
          <option value={5}>5 km (Sub-Market)</option>
          <option value={10}>10 km (Max Distance Limit)</option>
        </select>
        <button onClick={fetchCheckpoints}>✨ Refresh Map Checkpoints</button>
      </div>

      <div ref={mapRef} style={{ height: '400px', width: '100%', borderRadius: '12px' }} />
    </div>
  );
}
```

---

## 📱 React Native Mobile Map Implementation Notes (`react-native-maps`)

For React Native Android & iOS apps using `react-native-maps`:

```jsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';

export function MobileVendorMap({ lat, lng, radiusKm, zones, onToggleZone }) {
  return (
    <MapView
      style={{ width: '100%', height: 350 }}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
    >
      {/* 1. Coverage Radius Circle */}
      <Circle
        center={{ latitude: lat, longitude: lng }}
        radius={radiusKm * 1000}
        fillColor="rgba(16, 185, 129, 0.15)"
        strokeColor="#10B981"
        strokeWidth={2}
      />

      {/* 2. Store Center Pin */}
      <Marker coordinate={{ latitude: lat, longitude: lng }} title="🏪 Vendor Store Center" />

      {/* 3. Interactive Checkpoint Square Markers */}
      {zones.map((zone) => (
        <Marker
          key={zone.zone_id}
          coordinate={{ latitude: zone.latitude, longitude: zone.longitude }}
          onPress={() => onToggleZone(zone.zone_id)}
        >
          <View style={[styles.box, zone.is_active ? styles.activeBox : styles.inactiveBox]}>
            {zone.is_active && <Text style={styles.checkText}>✓</Text>}
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowRadius: 4,
    elevation: 4,
  },
  activeBox: {
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  inactiveBox: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  checkText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
```

---

### 📋 Checklist for Developer Implementation
- [x] Render store center pin with draggable listener.
- [x] Render radius circle scaled by `delivery_radius_km * 1000` meters.
- [x] Call `POST /api/vendors/check-coverage` to retrieve surrounding checkpoint zones.
- [x] Render active covered zones as solid green square boxes with white checkmark `✓`.
- [x] Render unselected zones as dark/grey outline square boxes without checkmark.
- [x] Synchronize map marker tap events with list checkboxes below the map.
- [x] Call `PUT /api/vendors/:vendorId/coverage` to save selected coverage settings to DB.

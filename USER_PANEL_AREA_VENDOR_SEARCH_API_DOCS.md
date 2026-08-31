# User Panel API Documentation: Search Vendors by User Area/Location Input

This document describes the exact API endpoint that the **User Panel (Customer App / Website)** calls when a user types or selects an area/location in the top search bar to view matching shops/vendors operating in that area.

---

## 🔍 API Overview: User Area Vendor Search

### **Endpoint:** `GET /api/vendors/search`
*(Also available as: `GET /api/stores/search` or `GET /api/vendors`)*

**Description:**  
This endpoint receives the area or location string entered by the user in the search input section. It returns all active vendors (`status = 'ACTIVE'`) whose registered `area`, `location`, `address`, or society name matches the user's input.

---

## 🛠️ Query Parameters:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `area` | `string` | **Yes** (Recommended) | Area / Location typed or selected by user | `"Sector 62"` |
| `search` | `string` | **No** (Optional) | Search keyword (matches area, store name, category) | `"Sector 62"` or `"Electronics"` |
| `q` | `string` | **No** (Optional) | Alias for `search` / `area` | `"Sector 62"` |
| `location` | `string` | **No** (Optional) | Alias for `area` | `"Sector 62"` |
| `city` | `string` | **No** (Optional) | Filter by specific city | `"Noida"` |
| `state` | `string` | **No** (Optional) | Filter by specific state | `"Uttar Pradesh"` |
| `pincode` | `string` | **No** (Optional) | Filter by 6-digit pincode | `"201301"` |
| `vendor_type` | `string` | **No** (Optional) | Filter by `"product"` or `"service"` | `"product"` |
| `page` | `number` | **No** (Optional) | Page number for pagination | `1` |
| `limit` | `number` | **No** (Optional) | Number of vendors per page (default: 24) | `20` |

---

## 📡 Request Examples:

### **Case 1: User enters area in input box (e.g. "Sector 62")**
```http
GET /api/vendors/search?area=Sector%2062 HTTP/1.1
Host: api.digilocal.com
```

### **Case 2: User searches both area and city**
```http
GET /api/vendors/search?area=Sector%2062&city=Noida HTTP/1.1
Host: api.digilocal.com
```

### **Case 3: Using standard search query parameter (`search` or `q`)**
```http
GET /api/vendors/search?search=Sector%2062 HTTP/1.1
Host: api.digilocal.com
```

---

## 📦 Response Example (`200 OK`):

```json
[
  {
    "vendor_id": 105,
    "store_name": "Sharma Electronics & General Store",
    "vendor_name": "Rajesh Sharma",
    "category": "Electronics & Daily Essentials",
    "phone_number": "9876543210",
    "whatsapp_number": "9876543210",
    "email": "sharma@digilocal.com",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "description": "Electronics and daily essentials for DigiLocal residents.",
    "location": "Sector 62",
    "address": "Shop 4, Tech Park, Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "society_name": "Greenwood Residency",
    "vendor_type": "product",
    "can_add_items": true,
    "status": "ACTIVE",
    "coverage_badge": "Location: Sector 62"
  },
  {
    "vendor_id": 108,
    "store_name": "Verma Grocery Supermart",
    "vendor_name": "Aman Verma",
    "category": "Grocery",
    "phone_number": "9812345678",
    "whatsapp_number": "9812345678",
    "email": "verma@digilocal.com",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "description": "Fresh vegetables and daily groceries.",
    "location": "Sector 62",
    "address": "Plot 12, Sector 62",
    "city": "Noida",
    "state": "Uttar Pradesh",
    "pincode": "201301",
    "society_name": "Greenwood Residency",
    "vendor_type": "product",
    "can_add_items": true,
    "status": "ACTIVE",
    "coverage_badge": "Location: Sector 62"
  }
]
```

---

## 💻 Frontend Code Example (React / React Native / Vue / Vanilla JS):

```javascript
// Function to fetch vendors based on area typed by user
async function searchVendorsByArea(userAreaInput) {
  try {
    const encodedArea = encodeURIComponent(userAreaInput);
    const response = await fetch(`https://api.digilocal.com/api/vendors/search?area=${encodedArea}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch vendors for this location');
    }
    
    const vendorsList = await response.json();
    console.log('Vendors found in area:', vendorsList);
    
    // Render vendors list in UI
    renderVendorsUI(vendorsList);
  } catch (error) {
    console.error('Error loading vendors:', error);
  }
}

// Example Trigger on Search Input Event
document.getElementById('locationSearchInput').addEventListener('input', (e) => {
  const query = e.target.value.trim();
  if (query.length >= 2) {
    searchVendorsByArea(query);
  }
});
```

---

## ✅ Key Highlights for Frontend Dev:
1. **Case-Insensitive Match**: Search query matches area names regardless of uppercase/lowercase (e.g., `"sector 62"`, `"SECTOR 62"`, `"Sector 62"`).
2. **Partial Matching**: Partial text matches work (e.g. typing `"Sector"` returns vendors from `"Sector 62"`, `"Sector 63"`, etc.).
3. **Active Vendors Only**: Only approved and active vendors (`status = 'ACTIVE'`) are returned to the user panel.

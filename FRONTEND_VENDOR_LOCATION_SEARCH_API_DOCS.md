# Frontend API Documentation: Vendor Search by Location & Area Autocomplete

This documentation covers the 2 primary endpoints for searching vendors based on user-entered locations/areas and getting autocomplete suggestions from the `locations` table.

---

## 1. Area Autocomplete / Location Suggestions API

### **Endpoint:** `GET /api/locations/suggestions`
*(Also available as: `GET /api/locations`, `GET /api/locations/autocomplete`, `GET /api/locations/search`)*

**Purpose:**  
When the user types their area or location in the frontend input field, call this API to get instant matching suggestions from the `locations` database table.

### **Query Parameters:**

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `q` | `string` | **No** (Optional) | Search query / prefix typed by user | `"Sector 62"` |
| `area` | `string` | **No** | Alias for `q` | `"Sector 62"` |
| `search` | `string` | **No** | Alias for `q` | `"Noida"` |
| `city` | `string` | **No** | Optional filter by specific city | `"Noida"` |
| `state` | `string` | **No** | Optional filter by specific state | `"Uttar Pradesh"` |

---

### **Request Example:**
```http
GET /api/locations/suggestions?q=Sector%2062 HTTP/1.1
Host: api.digilocal.com
```

---

### **Response Example (`200 OK`):**
```json
{
  "success": true,
  "query": "sector 62",
  "suggestions": [
    "Sector 62",
    "Sector 62 A",
    "Sector 62 B"
  ],
  "data": [
    {
      "location_id": 12,
      "area": "Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301",
      "display_text": "Sector 62, Noida, Uttar Pradesh (201301)"
    }
  ]
}
```

---

## 2. Search Vendors by User Location / Area API

### **Endpoint:** `GET /api/vendors/search`
*(Also available as: `GET /api/vendors`)*

**Purpose:**  
When the user enters/selects an area or location, call this API to return all active shops/vendors whose registered `area`, `location`, `address`, or society name matches the user's location input.

### **Query Parameters:**

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `area` | `string` | **Yes** / Recommended | Area or location entered by user | `"Sector 62"` |
| `location` | `string` | **No** | Alias for `area` | `"Sector 62"` |
| `search` | `string` | **No** | Search term (matches store name, description, area) | `"Electronics"` |
| `city` | `string` | **No** | Filter by city name | `"Noida"` |
| `state` | `string` | **No** | Filter by state name | `"Uttar Pradesh"` |
| `pincode` | `string` | **No** | Filter by 6-digit pincode | `"201301"` |
| `vendor_type` | `string` | **No** | Filter by `"product"` or `"service"` | `"product"` |
| `page` | `number` | **No** | Page number for pagination | `1` |
| `limit` | `number` | **No** | Items per page (default: 24) | `20` |

---

### **Request Example:**
```http
GET /api/vendors/search?area=Sector%2062&city=Noida HTTP/1.1
Host: api.digilocal.com
```

---

### **Response Example (`200 OK`):**
```json
[
  {
    "vendor_id": 105,
    "store_name": "Sharma General Store",
    "vendor_name": "Rajesh Sharma",
    "category": "Daily Essentials",
    "phone_number": "9876543210",
    "email": "sharma@digilocal.com",
    "logo": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
    "description": "Daily essentials sourced for DigiLocal residents.",
    "location": "Sector 62",
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

### **Paginated Response Example (when `page` & `limit` are passed):**
```json
{
  "success": true,
  "data": [
    {
      "vendor_id": 105,
      "store_name": "Sharma General Store",
      "vendor_name": "Rajesh Sharma",
      "category": "Daily Essentials",
      "phone_number": "9876543210",
      "location": "Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301",
      "society_name": "Greenwood Residency",
      "vendor_type": "product",
      "status": "ACTIVE"
    }
  ],
  "meta": {
    "total_records": 1,
    "total_pages": 1,
    "current_page": 1,
    "page_size": 20,
    "has_next": false,
    "has_prev": false
  }
}
```

---

## 💡 Frontend Integration Walkthrough:

1. **Step 1: Autocomplete Suggestions Input**
   - As the user types in the location search bar (e.g. `"Sec..."`), send debounced `GET /api/locations/suggestions?q=Sec`.
   - Render the returned `suggestions` array in the dropdown menu.

2. **Step 2: Vendor List Query**
   - When the user selects an area or presses search, call `GET /api/vendors/search?area=Sector%2062`.
   - Display the returned array of active shops operating in that location.

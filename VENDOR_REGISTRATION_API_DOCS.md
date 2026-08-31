# 🏬 Vendor / Store Registration API Documentation

## Endpoints

Frontend developers can use **any** of the following HTTP POST endpoints to register a vendor/store:

- `POST /api/vendors/register` *(Standard Plural Endpoint)*
- `POST /api/vendor/register` *(Singular Alias)*
- `POST /api/stores/register` *(Storefront Alias)*

---

## 📥 Request Format

- **HTTP Method**: `POST`
- **Content-Type**: `application/json`

### Request Body JSON Schema

```json
{
  "vendor_name": "Rajesh Sharma",
  "store_name": "Sharma Electronics",
  "email": "vendor@digilocal.com",
  "phone_number": "9876543210",
  "password": "VendorPassword123!",
  "area": "Sector 62",
  "city": "Noida",
  "state": "Uttar Pradesh",
  "pincode": "201301",
  "whatsapp_number": "9876543210",
  "shop_number": "Shop 101, Ground Floor",
  "shop_image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=300",
  "gstin": "07AAAAA0000A1Z5",
  "pan_number": "AAAAA0000A",
  "category": "Electronics & Accessories",
  "vendor_type": "product"
}
```

---

## 🔑 Field Specifications

| Field Name | Type | Required | Alias Keys Supported by Backend | Description |
| :--- | :--- | :--- | :--- | :--- |
| `vendor_name` | `string` | **Yes** | `owner_name`, `ownerName`, `vendorName`, `name` | Full name of store owner / vendor |
| `store_name` | `string` | **Yes** | `shop_name`, `business_name`, `storeName`, `shopName` | Name of the shop / store |
| `email` | `string` | **Yes** | `email_address`, `emailAddress` | Valid vendor email address |
| `phone_number` | `string` | **Yes** | `mobile_number`, `mobile`, `phone`, `phoneNumber` | 10-digit mobile number |
| `password` | `string` | **Yes** | `pass`, `create_password` | Vendor account password |
| `area` | `string` | **Yes** | `society_name`, `location_name`, `location` | Area / Locality name |
| `city` | `string` | **Yes** | - | City name (e.g. Noida, Delhi) |
| `state` | `string` | **Yes** | - | State name (e.g. Uttar Pradesh) |
| `pincode` | `string` | **Yes** | `pin_code`, `pinCode` | 6-digit postal code |
| `whatsapp_number` | `string` | **Yes** | `whatsapp`, `merchant_whatsapp` | WhatsApp contact number |
| `shop_number` | `string` | **Yes** | `shopNumber`, `shop_no`, `address` | Shop/Flat/Suite number or address |
| `shop_image` | `string` | **Yes** | `logo`, `shopImage`, `images[0]` | Image URL of shop |
| `gstin` | `string` | **Yes** *(or PAN)* | `gst_number`, `gstNumber`, `gst` | 15-char GSTIN (Auto-extracts 10-char PAN if provided) |
| `pan_number` | `string` | **Yes** *(or GSTIN)* | `pan`, `panNumber` | 10-char PAN number |
| `category` | `string` | Optional | `business_category`, `businessCategory` | Default: `"General"` |
| `vendor_type` | `string` | Optional | `vendorType`, `business_type` | `"product"` or `"service"` (Default: `"product"`) |

---

## 📤 Response Formats

### ✅ Success Response (`201 Created`)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "vendor_id": 1206,
  "vendor": {
    "vendor_id": 1206,
    "gstin": "07AAAAA0000A1Z5",
    "pan_number": "AAAAA0000A",
    "account_holder_name": "Rajesh Sharma",
    "upi_id": "",
    "qr_code_url": "",
    "whatsapp_number": "9876543210",
    "accepted_payment_methods": ["UPI", "COD"],
    "vendor_type": "product",
    "can_add_items": true,
    "status": "PENDING"
  }
}
```

### ❌ Validation Error Response (`400 Bad Request`)

```json
{
  "error": "Store / shop_name is required for registration."
}
```

---

## 💻 Frontend Code Example (Axios / Fetch)

```javascript
import axios from 'axios';

const registerVendor = async (formData) => {
  try {
    const response = await axios.post('http://localhost:5000/api/vendors/register', {
      vendor_name: formData.ownerName,
      store_name: formData.shopName,
      email: formData.email,
      phone_number: formData.phone,
      password: formData.password,
      area: formData.area,
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      whatsapp_number: formData.whatsapp,
      shop_number: formData.shopNumber,
      shop_image: formData.shopImage,
      gstin: formData.gstin
    });

    console.log('Vendor registered:', response.data);
    return response.data;
  } catch (error) {
    console.error('Registration failed:', error.response?.data?.error || error.message);
    throw error;
  }
};
```

# 📱 DigiLocal — Mobile Number & OTP Authentication API Documentation

Complete API specification for Frontend Engineers (Mobile & Web) integrating User and Vendor Authentication into DigiLocal.

---

## 🌟 Overview of Supported Authentication Flows

The backend supports **two primary authentication methods**:

1. **Firebase Phone Auth** (`firebase_token`) — **Production SMS Flow**. Firebase Client SDK sends real SMS on device, mobile/web app passes `firebase_token` to backend for verification and JWT issuance.
2. **Password Authentication** (`Phone + Password`) — Standard login using registered mobile number and password.

---

## 🔑 Base URL & Common Headers

* **Base URL**: `http://localhost:5001` (or your deployed server URL, e.g. `https://api.digilocal.com`)
* **Headers**:
  ```http
  Content-Type: application/json
  ```
* **Authorization Header** (for protected routes):
  ```http
  Authorization: Bearer <accessToken>
  ```

---

# 👤 RESIDENT USER AUTHENTICATION (`/api/users`)

---

### 1. 📤 Send OTP Route
Informational route for client apps triggering Firebase SMS.

* **HTTP Method**: `POST`
* **Route Path**: `/api/users/send-otp`

#### 📥 Request Body
```json
{
  "phone": "+919784319840"
}
```

#### 📤 Success Response (`200 OK`)
```json
{
  "message": "OTP dispatch initiated via Firebase Phone Authentication. Please complete SMS verification on client and submit firebase_token.",
  "target": "+919784319840",
  "provider": "firebase"
}
```

---

### 2. ✅ Verify OTP (Backend OTP or Firebase ID Token)

Verify an OTP code or a Firebase ID Token before proceeding to registration/reset.

* **HTTP Method**: `POST`
* **Route Path**: `/api/users/verify-otp`

#### 📥 Request Body Option A (Backend 6-Digit OTP)
```json
{
  "phone": "9876543210",
  "otp": "482910"
}
```

#### 📥 Request Body Option B (Firebase Phone Auth ID Token)
```json
{
  "firebase_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

#### 📤 Success Response (`200 OK`)
```json
{
  "message": "OTP verified successfully",
  "valid": true
}
```

#### ❌ Error Response (`400 Bad Request`)
```json
{
  "error": "Invalid OTP code"
}
```

---

### 3. 🔐 Resident User Login

Authenticate an existing resident user. Supports **Password**, **Backend OTP**, or **Firebase Token**.

* **HTTP Method**: `POST`
* **Route Path**: `/api/users/login`

#### 📥 Option A: Phone + Password Login
```json
{
  "phone": "9876543210",
  "password": "MySecretPassword123!"
}
```

#### 📥 Option B: Phone + Backend OTP Login (Passwordless)
```json
{
  "phone": "9876543210",
  "otp": "482910"
}
```

#### 📥 Option C: Firebase Phone Auth Login (Production Real SMS)
```json
{
  "firebase_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
}
```

#### 📤 Success Response (`200 OK`)
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "user_id": "usr_948210",
    "name": "Mayank Sharma",
    "email": "user@example.com",
    "phone": "9876543210",
    "society_id": "1",
    "society_name": "Omaxe Greenwood Residency",
    "flat": "Tower A-402",
    "joined_date": "August 2026",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
  }
}
```

#### ❌ Error Responses
* **`401 Unauthorized`** (Invalid credentials):
  ```json
  {
    "error": "Invalid mobile number or password"
  }
  ```
* **`400 Bad Request`** (Invalid OTP):
  ```json
  {
    "error": "Invalid OTP code"
  }
  ```

---

### 4. 📝 Resident User Registration

Register a new resident user account. Requires mobile verification via **Backend OTP** or **Firebase Token**.

* **HTTP Method**: `POST`
* **Route Path**: `/api/users/register`

#### 📥 Request Body (Backend OTP Flow)
```json
{
  "name": "Rahul Verma",
  "phone": "9876543210",
  "password": "SecurePassword123!",
  "otp": "482910",
  "society_id": 1,
  "flat": "Tower B-204"
}
```

#### 📥 Request Body (Firebase Phone Auth Flow)
```json
{
  "name": "Rahul Verma",
  "password": "SecurePassword123!",
  "firebase_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "society_id": 1,
  "flat": "Tower B-204"
}
```

#### 📤 Success Response (`201 Created`)
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "user_id": "usr_829102",
    "name": "Rahul Verma",
    "email": null,
    "phone": "9876543210",
    "society_id": "1",
    "society_name": "Omaxe Greenwood Residency",
    "flat": "Tower B-204",
    "joined_date": "August 2026",
    "avatar": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200"
  }
}
```

#### ❌ Error Response (`400 Bad Request`)
```json
{
  "error": "An account with this mobile number already exists"
}
```

---

# 🏪 VENDOR AUTHENTICATION (`/api/vendors`)

---

### 1. 📤 Send Vendor OTP
* **HTTP Method**: `POST`
* **Route Path**: `/api/vendors/send-otp`
* **Request Body**:
  ```json
  {
    "email": "vendor@zordial.com"
  }
  ```
  *(or `{ "phone": "9876543210" }`)*

---

### 2. 🔐 Vendor Login
* **HTTP Method**: `POST`
* **Route Path**: `/api/vendors/login`

#### 📥 Request Body (Email/Phone + Password)
```json
{
  "email": "vendor@zordial.com",
  "password": "VendorSecretPass123!"
}
```

#### 📥 Request Body (Phone + OTP)
```json
{
  "phone": "9876543210",
  "otp": "482910"
}
```

#### 📤 Success Response (`200 OK`)
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "vendor": {
    "vendor_id": "vnd_10293",
    "vendor_name": "Fresh Groceries Local",
    "email": "vendor@zordial.com",
    "phone": "9876543210",
    "role": "vendor"
  }
}
```

---

### 3. 📝 Vendor Registration
* **HTTP Method**: `POST`
* **Route Path**: `/api/vendors/register`

#### 📥 Request Body
```json
{
  "vendor_name": "Fresh Mart Local Store",
  "email": "freshmart@zordial.com",
  "phone_number": "9876543210",
  "password": "VendorSecurePass123!",
  "otp": "482910",
  "category": "Grocery",
  "address": "Shop 12, Main Market, Greenwood"
}
```

---

## 💻 Frontend Code Integration Examples

### React / React Native (Firebase Phone Auth Flow)

```javascript
import auth from '@react-native-firebase/auth';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// 1. Trigger Real SMS OTP via Firebase
async function sendFirebaseSms(phoneNumber) {
  const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
  return confirmation; // Store confirmation in state
}

// 2. User enters OTP code -> Verify & Login to Backend
async function confirmOtpAndLoginToBackend(confirmationResult, otpCode) {
  // A. Verify OTP on Firebase side
  const credential = await confirmationResult.confirm(otpCode);
  
  // B. Get Firebase ID Token
  const idToken = await credential.user.getIdToken();

  // C. Send Firebase Token to DigiLocal Backend
  const response = await axios.post(`${API_BASE_URL}/users/login`, {
    firebase_token: idToken
  });

  const { accessToken, user } = response.data;
  
  // Store JWT token locally
  localStorage.setItem('accessToken', accessToken);
  console.log('Successfully logged in user:', user);
  return user;
}
```

---

### Flutter (Firebase Phone Auth Flow)

```dart
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> loginWithFirebaseToken(String idToken) async {
  final url = Uri.parse('http://localhost:5001/api/users/login');
  
  final response = await http.post(
    url,
    headers: {'Content-Type': 'application/json'},
    body: jsonEncode({
      'firebase_token': idToken,
    }),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print('Logged in successfully: ${data['user']['name']}');
    print('JWT Access Token: ${data['accessToken']}');
  } else {
    print('Backend Login Error: ${response.body}');
  }
}
```

---

## 🛠 HTTP Status Codes Quick Reference

| Code | Status | Meaning |
| :--- | :--- | :--- |
| `200` | OK | Login / Verification successful |
| `201` | Created | User / Vendor account registered successfully |
| `400` | Bad Request | Missing required parameters or invalid OTP |
| `401` | Unauthorized | Incorrect password or invalid/expired credentials |
| `500` | Internal Error | Server error |

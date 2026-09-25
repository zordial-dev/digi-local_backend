# DigiLocal Platform — Email & OTP API Documentation
**Target Audience:** Mobile App Developers (Flutter / React Native) & Web Frontend Developers  
**Version:** 3.5.0  
**Updated:** September 2026  
**Base Server URL:** `http://localhost:5000` (Local) / `https://digilocal-backend.onrender.com` (Production)

---

## 📌 Why Was the App Developer Getting a 404?
1. **Missing General Endpoint:** The developer was sending requests to `POST /api/email/send` or `POST /api/email/send-otp`, but the legacy backend only had `POST /api/test/email/send` and SMS-only routes.
2. **Missing Distinct Email vs Mobile Routes:** Previously, only `/api/otp/send-otp` existed, and it required a 10-digit mobile number for Message Central SMS. There were no separate dedicated routes for email OTP verification.

✅ **Resolved:** We have now deployed dedicated, distinct routes for **Email OTP** and **Mobile OTP**, along with `/api/email/send`, `/api/email/status`, and intelligent universal aliases.

---

## 🌐 Quick Summary Table

| Category | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Email OTP** | `POST` | `/api/otp/email/send-otp` | Sends a 6-digit verification code to the user's email via AWS SES. |
| **Email OTP** | `POST` | `/api/otp/email/verify-otp` | Verifies the 6-digit email code. (Optional auto-login). |
| **Mobile OTP** | `POST` | `/api/otp/mobile/send-otp` | Sends an SMS verification code to a 10-digit mobile number via Message Central. |
| **Mobile OTP** | `POST` | `/api/otp/mobile/verify-otp` | Verifies the SMS verification code via Message Central. |
| **General Email**| `POST` | `/api/email/send` | Sends any transactional or custom notification email via AWS SES. |
| **Email Health** | `GET` | `/api/email/status` | Verifies AWS SES SMTP connection and health. |

*(Note: Aliases such as `/api/email/send-otp`, `/api/email/verify-otp`, `/api/users/email/send-otp`, `/api/vendors/email/send-otp` are all active and will never 404).*

---

## 🔐 1. Email OTP Service (Dedicated)

### 1.1 Send Email OTP
Dispatches a branded HTML email containing a 6-digit verification code with a 10-minute expiry.

- **Method:** `POST`
- **Primary Route:** `/api/otp/email/send-otp`
- **Aliases:** `/api/email/send-otp`, `/api/otp/send-email-otp`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "email": "user@example.com",
  "name": "Raj Kumar",
  "purpose": "verification"
}
```
* **Parameters:**
  * `email` *(string, required)*: Recipient email address.
  * `name` *(string, optional)*: Recipient name shown in email greeting (defaults to user/vendor name or "Valued User").
  * `purpose` *(string, optional)*: `"login"`, `"register"`, or `"verification"` (default).
    * If `"login"`, checks that an account exists for this email.
    * If `"register"`, checks that the email is not already registered.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "channel": "email",
  "provider": "aws_ses",
  "message": "OTP verification code sent to user@example.com",
  "email": "user@example.com",
  "expires_in_seconds": 600,
  "ttl_minutes": 10
}
```

#### Error Responses
- **`400 Bad Request`** (Invalid email format):
  ```json
  {
    "success": false,
    "error": "Invalid email address format",
    "message": "Please provide a valid email address."
  }
  ```
- **`404 Not Found`** (When `purpose: "login"` and account does not exist):
  ```json
  {
    "success": false,
    "exists": false,
    "error": "No account found with this email address. Please register your account first."
  }
  ```

---

### 1.2 Verify Email OTP
Verifies the 6-digit code received via email.

- **Method:** `POST`
- **Primary Route:** `/api/otp/email/verify-otp`
- **Aliases:** `/api/email/verify-otp`, `/api/otp/verify-email-otp`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "email": "user@example.com",
  "otp": "482910",
  "purpose": "login"
}
```
* **Parameters:**
  * `email` *(string, required)*: Recipient email address.
  * `otp` *(string, required)*: 6-digit numeric OTP code. (Can also pass `code` or `otp_code`).
  * `purpose` *(string, optional)*: If set to `"login"` (or if `include_token: true`), the API returns JWT `accessToken`, `refreshToken`, and user profile on successful verification.

#### Success Response (`200 OK` - Standalone Verification)
```json
{
  "success": true,
  "verified": true,
  "channel": "email",
  "message": "Email OTP verified successfully",
  "email": "user@example.com"
}
```

#### Success Response (`200 OK` - Login Intent with Tokens)
```json
{
  "success": true,
  "verified": true,
  "channel": "email",
  "message": "Email OTP verified successfully",
  "email": "user@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 42,
    "name": "Raj Kumar",
    "email": "user@example.com",
    "phone": "9876543210",
    "role": "user"
  }
}
```

#### Error Response (`400 Bad Request` - Invalid or Expired Code)
```json
{
  "success": false,
  "verified": false,
  "error": "Invalid OTP code",
  "message": "Invalid OTP code"
}
```

---

## 📱 2. Mobile OTP Service (Dedicated)

### 2.1 Send Mobile SMS OTP
Sends an SMS OTP code to a 10-digit mobile number via Message Central VerifyNow.

- **Method:** `POST`
- **Primary Route:** `/api/otp/mobile/send-otp`
- **Aliases:** `/api/otp/send-mobile-otp`, `/api/mobile/send-otp`, `/api/otp/send-otp`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "phone": "9876543210",
  "country_code": "91",
  "purpose": "login"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "channel": "mobile_sms",
  "provider": "message_central",
  "message": "Mobile OTP sent successfully via SMS",
  "phone": "9876543210",
  "verification_id": "c1f7a8b9-...",
  "verificationId": "c1f7a8b9-..."
}
```

---

### 2.2 Verify Mobile SMS OTP
Verifies the SMS OTP code using Message Central VerifyNow.

- **Method:** `POST`
- **Primary Route:** `/api/otp/mobile/verify-otp`
- **Aliases:** `/api/otp/verify-mobile-otp`, `/api/mobile/verify-otp`, `/api/otp/verify-otp`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

#### Request Body
```json
{
  "phone": "9876543210",
  "otp": "583921",
  "verification_id": "c1f7a8b9-..."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "verified": true,
  "channel": "mobile_sms",
  "provider": "message_central",
  "message": "Mobile OTP verified successfully",
  "phone": "9876543210"
}
```

---

## ✉️ 3. General Email API Service

### 3.1 Send Any Custom Notification Email
Sends a custom email via AWS SES.

- **Method:** `POST`
- **Primary Route:** `/api/email/send`
- **Aliases:** `/api/test/email/send`, `/api/email/send-test`
- **Headers:**
  ```http
  Content-Type: application/json
  ```

#### Request Body (Plain Text or Message)
```json
{
  "to": "user@example.com",
  "subject": "Important Account Update - DigiLocal",
  "message": "Your requested order #1084 has been accepted by the store."
}
```

#### Request Body (Rich HTML)
```json
{
  "to": "user@example.com",
  "subject": "Order Shipped!",
  "html": "<div style='font-family: Arial;'><h2>Your order is on the way!</h2><p>Delivering to Tower B, Flat 402.</p></div>"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "sent": true,
  "messageId": "<0100018f...-000000@email-smtp.ap-south-1.amazonaws.com>",
  "recipient": "user@example.com",
  "subject": "Important Account Update - DigiLocal",
  "message": "Email dispatched successfully.",
  "timestamp": "2026-09-25T09:23:19.283Z"
}
```

---

### 3.2 Check Email Service Health
Checks whether AWS SES SMTP credentials and server connectivity are healthy.

- **Method:** `GET`
- **Route:** `/api/email/status`

#### Success Response (`200 OK`)
```json
{
  "code": 200,
  "status": "success",
  "message": "SMTP mail service is connected and healthy.",
  "data": {
    "status": "CONNECTED",
    "connected": true,
    "service": "AWS SES SMTP",
    "host": "email-smtp.ap-south-1.amazonaws.com",
    "port": 587,
    "region": "ap-south-1",
    "default_from": "DigiLocal Platform <connexon@zordial.com>",
    "timestamp": "2026-09-25T09:23:18.714Z"
  }
}
```

---

## 🧪 Postman / cURL Quick Copy

### Test Email OTP Send:
```bash
curl -X POST http://localhost:5000/api/otp/email/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "rajfreefire902@gmail.com", "name": "Raj"}'
```

### Test Email OTP Verify:
```bash
curl -X POST http://localhost:5000/api/otp/email/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "rajfreefire902@gmail.com", "otp": "123456"}'
```

### Test General Email Send:
```bash
curl -X POST http://localhost:5000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to": "rajfreefire902@gmail.com", "subject": "Test Mail", "message": "Testing DigiLocal Email Service"}'
```

---

## 💡 Frontend Integration Notes
1. **Spam / Junk Check During Testing:** AWS SES emails sent from `connexon@zordial.com` are currently routed by Gmail to the **Spam/Junk** folder because `zordial.com` DNS has a quarantine policy without `include:amazonses.com`. Tell developers to check Spam during manual testing.
2. **Distinct Verification Logic:**
   - For **Mobile Flow**: send `phone` + `country_code` to `/api/otp/mobile/send-otp`, then send `phone` + `otp` + `verification_id` to `/api/otp/mobile/verify-otp`.
   - For **Email Flow**: send `email` to `/api/otp/email/send-otp`, then send `email` + `otp` to `/api/otp/email/verify-otp`.

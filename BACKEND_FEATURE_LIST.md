# DigiLocal Backend Platform — Complete Feature Specification List

**Document Status:** Complete & Production Verified  
**Target Audience:** Engineering Leadership, Product Managers, Frontend/Mobile Teams, QA Leads  
**Architecture:** Node.js / Express, PostgreSQL / SQLite, Socket.IO Real-Time Engine, Cashfree Payments, MSG91 OTP, Firebase FCM & Expo Push Service, Nodemailer Queue  

---

## Executive Summary

**DigiLocal** is a hyper-local e-commerce marketplace and delivery platform specifically engineered for residential gated communities and housing societies. It connects resident customers directly with nearby vendors (groceries, daily essentials, bakeries, pharmacies, services) through dedicated store interfaces, WhatsApp order dispatching, real-time audio-push notifications, and multi-tier subscription/payment handling.

The backend service is structured into four primary operational pillars:
1. **Super Admin Management Portal API** — Platform governance, RBAC, financial accounting, user/vendor moderation, CMS & support desk.
2. **Vendor Panel & Mobile Application API** — Storefront configuration, real-time order desk, product catalog/stock management, payment details & push notifications.
3. **Customer / Resident Storefront & App API** — Society & store discovery, catalog browsing, cart processing, order placement, order tracking & support tickets.
4. **Integration Engine & Core Infrastructure** — Real-time WebSockets, Cashfree payment gateway, MSG91 SMS/WhatsApp OTP, FCM/Expo push notifications, background email queues, automated crons, and liveness/readiness probes.

---

## 1. Super Admin Portal & Platform Governance API

The Admin API empowers platform administrators and sub-admins to govern the entire DigiLocal ecosystem, moderate residents and merchants, inspect financial performance, process refunds, and configure system-wide rules.

### 1.1 Authentication & Security Controls
* **Admin Secret & Master Login:** Secure authentication using master secret keys (`/api/admin/login` & `/api/v1/auth/login`).
* **JWT Access & Refresh Token Management:** Token issuing with customizable expiry (`expiresIn`), token refresh cycle (`/api/v1/auth/refresh`), and current session verification (`/api/v1/auth/me`).
* **Admin Profile & Credential Management:** Admin profile detail updates and secure password change endpoints with hash updates (`/api/settings/profile`, `/api/settings/change-password`).

### 1.2 Sub-Admin & Role-Based Access Control (RBAC)
* **Sub-Admin Provisioning:** Create, update, and list sub-admin accounts with assigned society boundaries (`/api/subadmins`, `/api/sub-admins`).
* **Granular Permission Power Matrix:** Dynamic power assignment array including `MANAGE_USERS`, `MANAGE_VENDORS`, `FINANCIALS`, `SUPPORT`, `SETTINGS`, `CMS`, and `AUDIT_LOGS`.
* **Account Status Toggles:** Instantly activate, suspend, or revoke sub-admin powers (`/api/subadmins/:id`).

### 1.3 Resident User Directory & Moderation
* **User Directory Listing:** Paginated user search and filter by name, phone, email, or society (`/api/people`, `/api/v1/admin/users`, `/api/users`).
* **User Analytics & Demographic Metrics:** Aggregate resident join metrics, active vs blocked counts, flag statistics (`/api/people/analytics`).
* **User Detail Inspection:** Full profile retrieval including society affiliation, flat number, joined date, order history, and flag count (`/api/people/:id`).
* **User Moderation & Account Suspension:**
  * Flag/Unflag user accounts for suspicious activities (`/api/people/:id/flag`, `/api/people/:id/unflag`).
  * Block/Unblock user access across all storefronts (`/api/people/:id/block`, `/api/people/:id/unblock`, `/api/people/:id/status`).
  * Soft delete / hard purge user records (`/api/people/:id`).

### 1.4 Vendor Onboarding & Marketplace Moderation
* **Vendor Master Directory:** View all onboarding & active vendors with society details, subscription tier, start/end dates, and payment history (`/api/admin/vendors`, `/api/vendors`).
* **Pending Vendor Approval Workflow:**
  * Inspect pending merchant applications with payment proof and GST validation (`/api/admin/requests`).
  * Approve vendor request: Automatically sets status to `ACTIVE`, creates/extends 1-Year subscription plan, clears cache (`/api/admin/requests/:vendorId/approve`).
  * Reject vendor request: Sets status to `REJECTED`, cancels subscription (`/api/admin/requests/:vendorId/reject`).
* **Vendor Account Suspension & Reactivation:** Block, suspend, or reactivate vendor stores with custom reason messages sent via automated HTML email (`/api/admin/vendors/:vendorId/status`).

### 1.5 Financial Management, Subscriptions & Payment Ledger
* **Transaction Ledger:** Unified payment transaction stream logging Cashfree & Razorpay payments, transaction IDs, payment methods, timestamps, and order/subscription links (`/api/payments/transactions`).
* **Executive Revenue Dashboard:** Real-time revenue aggregates, total volume, subscription collection breakdowns, and payment method stats (`/api/payments/revenue-dashboard`).
* **Subscription Management:** Monitor vendor subscription tiers, annual plan start/end dates, renewal statuses (`/api/subscriptions`).
* **Automated Refund Processing:** Initiate online payment refunds (full or partial) via Cashfree integration, auto-updating order and payment ledger statuses (`/api/payments/refund`, `/api/payments/:id/refund`).
* **Financial Documents Generation:** Instant PDF/HTML layout download for payment receipts (`/api/payments/:id/receipt`) and tax invoices (`/api/payments/:id/invoice`).

### 1.6 Promotions, Hero Banners & Marketing Engine
* **Banner & Promotional Card Management:** CRUD endpoints for homepage marketing campaigns (`/api/promotions`).
* **Placement & Targeting:** Configure target placement (`HERO_SLIDER`, `POPUP`, `CATEGORY_BANNER`), target category/store value, display ordering, and image URLs.
* **Campaign Scheduling:** Set start and end dates with automated active/inactive status evaluation.

### 1.7 Support Desk & Escalation Ticketing System
* **Central Support Dashboard:** Filter, search, and list support tickets by status (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and category (`/api/support/tickets`).
* **Ticket Messaging & Multi-Party Conversation:** View ticket timeline and post agent replies (`/api/support/tickets/:id/messages`, `/api/support/tickets/:id/reply`).
* **Ticket Lifecycle & Escalation:**
  * Escalate/De-escalate ticket priority levels (`/api/support/tickets/:id/escalate`, `/api/support/tickets/:id/deescalate`).
  * Add internal ticket followers/assignees (`/api/support/tickets/:id/followers`).
  * Merge duplicate tickets into a master thread or unmerge previously joined tickets (`/api/support/tickets/:id/merge`, `/api/support/tickets/:id/unmerge`).
  * Update ticket status (`/api/support/tickets/:id/status`).

### 1.8 System Audit Logging & Security Telemetry
* **Audit Trail Inspection:** Comprehensive system log tracking admin/user actions, target entity types, IP addresses, and exact timestamps (`/api/audit-logs`, `/api/audit-logs/:id`).
* **Audit Export:** Export filtered audit trail logs in CSV/JSON formats for compliance reviews (`/api/audit-logs/export`).

### 1.9 Platform Configuration & Dynamic Settings
* **Branding & Identity Config:** Dynamic updates for platform name, logo URL, currency symbol, and platform maintenance mode (`/api/config`, `/api/settings/branding`, `/api/settings`).
* **Tax & Financial Settings:** Configure default platform GST percentage (e.g., 18.00%), service charges, and subscription tier pricing (`/api/settings/tax`, `/api/settings/subscription-plans`).
* **Communication & SMTP Email Setup:** Configure Nodemailer SMTP credentials, email sender names, and trigger test emails (`/api/settings/email`, `/api/settings/email/send-test`).
* **System & Notification Rules:** Configure system thresholds, notification rules, and broadcast push settings (`/api/settings/system`, `/api/settings/notifications`).

### 1.10 Content Management System (CMS) & Legal Pages
* **Dynamic Legal & Policy Pages:** API endpoints serving Markdown/HTML for Privacy Policy (`/api/privacy-policy`, `/api/cms/privacy-policy`), Terms & Conditions (`/api/terms-conditions`, `/api/cms/terms-conditions`), About Us (`/api/about-us`, `/api/cms/about-us`), and Help & Support (`/api/help-support`, `/api/cms/help-support`).
* **CMS Content Editor:** Admin put endpoints to dynamically update legal text and support contacts (`/api/admin/cms/pages/:slug`, `/api/admin/cms/contacts`).

### 1.11 Executive Telemetry & Reporting Engine
* **Telemetry Tele-metrics:** High-level metrics for mobile app installs, active user sessions, order conversion rates, and gross merchandise value (GMV) (`/api/reports/telemetry`, `/api/reports/executive`).
* **Data Export Engine:** Export platform reports to CSV or JSON formats (`/api/reports/export`).

---

## 2. Vendor Mobile App & Store Management Panel API

The Vendor API powers the mobile app for store owners (groceries, daily essentials, local services), enabling real-time store management, order execution, stock management, and customer messaging.

### 2.1 Vendor Onboarding & Authentication
* **Multi-Step Registration:** Onboard new merchants with store name, owner details, GSTIN, society binding, and initial subscription fee payment (`/api/vendors/register`).
* **Secure JWT Login:** Vendor login with email & password returning access token, refresh token, and vendor profile (`/api/vendors/login`).
* **Session Refresh & Profile Inspection:** Token refresh endpoint (`/api/vendors/refresh-token`) and authenticated vendor profile fetch (`/api/vendors/me`, `/api/vendorPanel/:vendorId/profile`).

### 2.2 Store Profile & Business Rules Customization
* **Storefront Branding:** Customize store name, store description, logo image, avatar banner image, and public store ID (`/api/vendorPanel/:vendorId/profile`).
* **Store Logo & Image Upload Engine:** Multipart image file upload endpoint saving store logo/banner to public static storage (`/api/vendors/:vendorId/logo`, `/api/vendorPanel/:vendorId/logo`).
* **Operating Hours & Timing Controls:** Set daily opening time (e.g. `08:00 AM`) and closing time (e.g. `10:00 PM`) used by the storefront to display "OPEN" or "CLOSED" badges.
* **Order Processing Thresholds:** Configure Minimum Order Value (MOV), maximum allowed order quantity per item, and flat/tiered delivery charge (`/api/vendorPanel/:vendorId/settings`).
* **Accepted Payment Methods:** Toggle vendor payment acceptance (COD, UPI, Bank Transfer, QR Code).

### 2.3 Vendor Payment & Banking Details
* **Settlement Details Management:** Dedicated endpoint to configure bank account number, IFSC code, bank name, account holder name, and UPI ID (`/api/vendors/:vendorId/payment-details`, `/api/vendorPanel/:vendorId/payment-details`).
* **UPI & QR Code Management:** Upload custom payment QR code image or generate dynamic UPI intent string/QR URL (`upi://pay?pa=...`).
* **Custom Payment Instructions:** Provide store-specific payment instructions displayed to customers during checkout.

### 2.4 Product Catalog & Stock Management
* **Catalog Inventory Listing:** List all items with filter by category, search by item name, and stock status (`/api/vendorPanel/:vendorId/items`).
* **Product Creation & Editing:** Add or update item details including item name, description, unit price, stock quantity, item category, unit (e.g. `kg`, `piece`, `pkt`, `liter`), and product image URL (`/api/vendorPanel/:vendorId/items`).
* **Instant Stock & Availability Toggle:** One-click endpoint to toggle product availability (`is_available` / `in_stock`) instantly reflected on customer web apps (`/api/vendorPanel/:vendorId/items/:itemId/toggle`).
* **Product Deletion:** Remove items from catalog (`/api/vendorPanel/:vendorId/items/:itemId`).

### 2.5 Real-Time Order Processing & Lifecycle Management
* **Incoming Order Stream:** View active, historical, and pending customer orders with customer name, phone, flat address, item breakdown, and total amount (`/api/vendorPanel/:vendorId/orders`).
* **Order Status Transition Pipeline:** Advance order lifecycle states:
  * `PLACED` → Order created by customer.
  * `ACCEPTED` → Vendor accepts order and begins packing.
  * `DISPATCHED` → Order handed over to delivery executive / resident pickup.
  * `COMPLETED` → Order successfully delivered & paid.
  * `CANCELLED` → Order rejected/cancelled with reason.
* **Order Itemization:** Detailed view of customer items, item pricing, quantities, subtotal, GST, and delivery charges (`/api/vendorPanel/:vendorId/orders/:orderId`).

### 2.6 Real-Time Audio Push Notifications & WebSockets
* **Device FCM / Expo Token Registration:** Register or update device push token for Firebase Cloud Messaging (FCM Native) or Expo Push API (`/api/vendors/fcm-token`, `/api/vendors/register-push-token`).
* **Zomato/Swiggy-Style Loud Order Alert:** High-priority push notifications with custom sound (`order_alert_chime.wav` / `new_order_alert_sound`), Android max priority channels, foreground alert displays, and action buttons (`ACCEPT`, `REJECT`, `MUTE`).
* **Socket.IO Real-Time Alert Engine:** Instant Socket.IO event emission (`NEW_ORDER_ALERT` and `new_order_alert`) directly to `vendor_<vendor_id>` rooms for immediate dashboard audio chime without refresh.
* **Token Cleanup on Logout:** Clear device push token on vendor logout to avoid phantom alerts (`/api/vendors/fcm-token/clear`).

### 2.7 WhatsApp Order Integration & Notification Payload
* **WhatsApp Order Notification Generator:** Formats structured itemized order summary, customer delivery address, total bill, and payment instructions formatted specifically for WhatsApp messaging (`/api/vendors/:vendorId/orders/:orderId/whatsapp-notification`).
* **Direct WhatsApp Click-to-Chat Link:** Generates pre-filled `https://wa.me/<number>?text=...` links for instant 1-click vendor messaging to customers.

### 2.8 Vendor Analytics & Subscription Health
* **Vendor Dashboard Metrics:** Aggregate total revenue, lifetime orders count, active product count, and average order value (`/api/vendorPanel/:vendorId/dashboard`).
* **Subscription Status & Renewal Tracking:** View current plan tier (`pro`, `starter`), start/end dates, subscription status (`ACTIVE`, `PENDING`, `EXPIRED`), and days remaining until renewal.

### 2.9 Account Lifecycle & GDPR Compliance
* **Vendor Account Deletion Request:** Endpoint for merchant self-service account deletion request with password verification, database soft deletion, catalog cleanup, and audit logging (`/api/vendors/:vendorId/account`, `/api/vendors/account/delete`).

---

## 3. Customer / Resident Storefront & Mobile Application API

The Storefront API powers the resident web and mobile app experience, enabling easy society lookup, vendor discovery, store catalog browsing, cart calculations, order placement, and support tickets.

### 3.1 Resident Authentication & Profile Management
* **MSG91 Mobile OTP Login:** Request 6-digit OTP code to resident mobile number (`/api/otp/send`) and verify OTP (`/api/otp/verify`).
* **User Profile Creation & Binding:** Register resident account with name, phone, email, society ID, and flat number (`/api/users/register`, `/api/users/profile`).
* **Profile & Address Updates:** Update resident profile, profile avatar, and default delivery address (`/api/users/profile`).

### 3.2 Society & Storefront Discovery Engine
* **Society Directory Search:** Search and filter active societies by society name, city, location, or pincode (`/api/societies`, `/api/storefront/societies`).
* **Society Details & Vendor Directory:** Fetch society profile along with all active vendors operating within the society (`/api/societies/:id`, `/api/stores`).
* **Vendor Store Profile:** View detailed vendor information including opening/closing hours, store logo, description, MOV, delivery charges, accepted payment methods, and bank/UPI payment details (`/api/stores/:id`, `/api/vendorPanel/:vendorId/public`).

### 3.3 Digital Product Catalog & Search
* **Store Product Listing:** Fetch full item catalog for a store categorized by product type (`/api/stores/:id/items`, `/api/vendorPanel/:vendorId/public/items`).
* **Product Search & Filtering:** Search products by keyword across society stores or within a specific vendor catalog.
* **Real-time Availability Status:** Displays live stock indicators (`in_stock: true/false`, price, unit) preventing backorders.

### 3.4 Cart Calculation & Order Placement
* **Order Validation Engine:** Validates cart total against vendor's Minimum Order Value (MOV), checks item max quantity limits, verifies vendor active status and operating hours.
* **Bill Breakdown Engine:** Calculates total order amount combining item line items, vendor GST percentage, and society delivery charge.
* **Instant Order Placement:** Submits customer order with delivery flat/address, customer phone, selected vendor ID, line items, and payment method (`/api/orders`, `/api/users/orders`).
* **Order Confirmation:** Returns unique timestamped order ID, status (`PLACED`), and formatted item summary.

### 3.5 Customer Order Tracking & History
* **Customer Order History:** List all historical orders placed by the authenticated resident (`/api/orders`, `/api/users/orders`).
* **Live Order Tracking:** Inspect real-time status of active order (`PLACED` → `ACCEPTED` → `DISPATCHED` → `COMPLETED`) (`/api/orders/:id`).
* **Order Cancellation:** Allow resident to cancel pending order if vendor has not yet accepted or dispatched it (`/api/orders/:id/cancel`).

### 3.6 Resident Support & Assistance Desk
* **Submit Support Ticket:** Resident endpoint to file a support query with subject, category, and message body (`/api/users/support/tickets`).
* **View Resident Support History:** List tickets created by user with real-time status (`OPEN`, `IN_PROGRESS`, `RESOLVED`) and reply message history (`/api/users/support/tickets/:id`).

---

## 4. Integration Engine & Core Infrastructure

The DigiLocal backend incorporates enterprise-grade integrations, background processing queues, and operational tools.

### 4.1 MSG91 SMS & WhatsApp OTP Gateway Engine
* **v5 OTP API Integration:** Integrates MSG91 `https://control.msg91.com/api/v5/otp` API for high-deliverability SMS/WhatsApp OTP dispatch.
* **Phone Number Normalization:** Automated formatting of Indian phone numbers (`+91` / `91` prefixing).
* **Simulation Mode:** Development fallback mode allowing instant OTP verification (`123456` / `999999`) when MSG91 auth key is not configured.

### 4.2 Cashfree Payment Gateway Engine (v3 API)
* **Payment Session Initialization:** Creates Cashfree order payment sessions (`/pg/orders`) for vendor subscription onboarding fees and customer order checkouts (`createPaymentSession`, `createVendorRegistrationPayment`).
* **Webhook Signature Verification:** HMAC SHA256 cryptographic verification of Cashfree webhook payloads (`verifyWebhookSignature`).
* **Payment Callback & Sync:** Callback handler (`/api/vendors/cashfree/callback`) and webhook sync (`/api/vendors/cashfree/webhook`) updating vendor registration status to `ACTIVE`.
* **Automated Refund API:** API integration to trigger refunds for cancelled orders or subscription adjustments.

### 4.3 Firebase FCM & Expo Push Notification Engine
* **Multi-Channel Push Router:** Automatically detects device token type (`ExponentPushToken` vs native FCM token) and dispatches via Expo Push API or Firebase Admin SDK.
* **Foreground Sound & Channel Configuration:** Configures Android notification channel `order_alerts_channel` with custom sound file `order_alert_chime.wav`, max priority, and click action handlers.
* **Deduplication Guard:** Built-in order notification deduplication keeping an in-memory set of recent order IDs to eliminate duplicate push dispatches.

### 4.4 Async Email Notification & Queue System
* **Nodemailer SMTP Integration:** Configured email transport supporting custom SMTP, HTML email templates, and inline assets.
* **Background Email Queue:** Asynchronous job processing queue for sending transactional emails without blocking API request-response loops (`src/services/emailQueue.js`).
* **Transactional Email Templates:** Pre-designed HTML email templates for:
  * Vendor Registration & Onboarding Welcome.
  * Vendor Account Status Updates (Approval, Rejection, Suspension).
  * 7-Day Subscription Expiry Warning.
  * Customer Order Receipt & Confirmation.
  * Support Ticket Responses.
  * Password Reset & Verification.

### 4.5 Real-Time WebSocket Infrastructure (Socket.IO)
* **Socket Server Initialization:** Multi-room Socket.IO server mounted on Express HTTP server.
* **Vendor Notification Rooms:** Dual room subscriptions (`vendor_<vendor_id>` and `<vendor_id>`) for real-time order alerts.
* **Event Dispatcher:** Fires `NEW_ORDER_ALERT`, `new_order_alert`, and `new_order` events to connected frontend clients.

### 4.6 Scheduled Job Cron Engine
* **Daily Subscription Expiry Monitor:** Node-cron scheduler running daily at 9:00 AM (`0 9 * * *`).
* **Automated Expiry Alerts:** Queries vendors whose subscription end date is within 7 days and dispatches warning emails automatically (`src/cron/index.js`).

### 4.7 Health, Observability & Environment Controls
* **Liveness & Readiness Probes:** Operational endpoints for Kubernetes/Docker deployment:
  * `/health` — Full system status report including database connectivity ping, environment, memory usage, uptime.
  * `/health/live` — Liveness probe (HTTP 200 OK).
  * `/health/ready` — Readiness probe verifying active database connection.
  * `/version` & `/health/version` — Application version and environment metadata.
* **Database Driver Support:** Unified database query abstraction layer supporting PostgreSQL (production) and SQLite (local testing) (`src/models/db.js`).

---

## 5. Technology Stack & API Summary Matrix

| Pillar / Service | Primary Technologies | Key Endpoints / Modules | Operational Features |
| :--- | :--- | :--- | :--- |
| **Super Admin Portal** | Node.js, Express, JWT, SQL | `/api/admin/*`, `/api/people/*`, `/api/payments/*`, `/api/support/*`, `/api/config` | RBAC, User/Vendor Moderation, Revenue Dashboard, Refunds, CMS, Audit Logs |
| **Vendor App & Panel** | Node.js, Express, Socket.IO, FCM | `/api/vendorPanel/*`, `/api/vendors/*` | Store Config, Catalog/Stock CRUD, Real-Time Audio Push Alerts, WhatsApp Link Generator |
| **Resident Storefront** | Node.js, Express, MSG91 | `/api/societies/*`, `/api/stores/*`, `/api/orders/*`, `/api/users/*` | OTP Auth, Society Search, Cart Calculation, MOV Validation, Order Tracking |
| **Payment Engine** | Cashfree PG v3 API, HMAC SHA256 | `/api/vendors/cashfree/*`, `cashfreeService.js` | Subscription Fees, Checkout Sessions, Webhook Verification, Refund Processing |
| **OTP Engine** | MSG91 v5 API | `/api/otp/*`, `msg91Service.js` | 6-Digit SMS/WhatsApp OTP, Phone Normalization, Dev Simulation Mode |
| **Push & WebSockets** | Firebase FCM, Expo Push API, Socket.IO | `notificationService.js`, `socket/index.js` | Custom Audio Chime (`order_alert_chime.wav`), Foreground Chime, Deduplication |
| **Email & Cron** | Nodemailer, Async Queue, node-cron | `emailService.js`, `emailQueue.js`, `cron/index.js` | Subscription 7-Day Expiry Warnings, Transactional HTML Emails |
| **Observability** | Express | `/health`, `/health/ready`, `/health/live` | DB Ping, Uptime, Memory Usage, Docker/K8s Readiness Probes |

---

## 6. Verification & Quality Assurance

* **OpenAPI 3.1.0 Specification:** Standardized OpenAPI JSON schema maintained at [`docs/openapi.json`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/docs/openapi.json).
* **Automated Test Suite:** Complete test runner and integration test scripts under [`tests/testRunner.js`](file:///c:/Users/LENOVO/Desktop/digilocal_backend_mock/tests/testRunner.js) verifying admin auth, vendor lifecycle, order creation, payment callbacks, and notification dispatching.

---
*Document prepared for DigiLocal Engineering Team & Management Review.*

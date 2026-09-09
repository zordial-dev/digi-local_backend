# DigiLocal Backend Platform — Complete Feature Specification & Architecture Blueprint

**Document Status:** Complete & Production Verified  
**Target Audience:** Engineering Leadership, Technical Leads, Backend/Frontend Developers, Mobile Engineers, QA, Product Managers  
**System Architecture:** Node.js / Express, PostgreSQL (with PostGIS) / SQLite, Redis, Socket.IO Real-Time Engine, Cashfree Payments PG v3, MSG91 OTP Engine, Firebase FCM & Expo Push Service, Nodemailer Queue, Meta WhatsApp Cloud API  

---

## Executive Summary

**DigiLocal** is an enterprise-grade, hyper-local e-commerce marketplace, on-demand services platform, and scheduled delivery engine engineered specifically for residential gated communities and housing societies. It bridges resident customers directly with approved nearby merchants, service providers, and residential association (RWA) governance.

The platform architecture is built around **19 comprehensive domain subsystems**:

1. **Resident Profile & Account Engine** — Passwordless OTP authentication, profile management, society/flat unit tenancy binding, saved address geocoding, and account recovery.
2. **Society & Community Management** — PostGIS spatial geofencing, society-level vendor visibility, delivery rules, community bulletin announcements, and RWA administrative controls.
3. **Hyperlocal Digital Store & Catalog Engine** — Merchant digital storefronts, multi-tier categories, variants, dynamic operating hours, MOV rules, and instant Redis-backed stock toggles.
4. **Resident Ordering & Shopping Cart Engine** — Atomic cart price/stock validation, tax/delivery calculation, row-locking checkout sessions, and complete order lifecycle management.
5. **Real-Time Order Management & Alarm System** — Swiggy/Zomato-style continuous high-priority audio alarms (`order_alert_chime.wav`), WebSocket rooms (`vendor_{id}`), repetitive chime loops, and instant resident tracking broadcasts.
6. **Delivery & Fleet Management Engine** — Automated driver dispatching, high-frequency GPS coordinate ingestion via Redis Geospatial (`GEOADD`), live map tracking streams, and cryptographic proof-of-delivery (POD) OTP handshakes.
7. **Local Services & Freelancer Hub** — KYC onboarding for verified electricians, plumbers, house cleaners; dynamic rate cards; appointment booking slots; and reviews.
8. **Payments, Finance & Vendor Earnings Engine** — Cashfree PG v3 API, HMAC SHA256 webhook cryptographic verification, double-entry merchant earnings ledger, and automated bank payouts.
9. **Digital Wallet & Society Credit (Khatta) Engine** — Resident prepaid wallets, instant refunds, double-entry financial ledger integrity, and traditional neighborhood credit books ("Udhar / Khatta") with credit limits and automated payment reconciliation.
10. **Subscription & Recurring Delivery Engine** — Daily and periodic recurring deliveries (milk, newspaper, groceries, water), automated 03:00 AM IST order generator cron, and vacation pause/resume.
11. **Offers, Promotions & Digital Marketing Engine** — Rule-based coupon code engine (min cart, max discount, society targeting), dynamic home hero banners, and flash deals.
12. **WhatsApp CRM & Customer Engagement Engine** — Meta WhatsApp Cloud API integration, automated receipt and tracking dispatches, direct `wa.me` merchant-customer click-to-chat links, and vendor CRM notes.
13. **AI-Powered Inventory & Demand Forecasting** — Time-series demand prediction algorithms, SKU velocity classification (FMCG vs slow-moving), critical low-stock alerts, and smart reorder advice.
14. **Regional Voice Commerce & Multilingual Experience** — Multi-language localization (English, Hindi, Marathi, Gujarati, etc.), Speech-to-Text audio processing pipeline, phonetic catalog matching, and 1-tap voice cart population.
15. **Notifications & Multi-Channel Communications** — Unified dispatch router spanning FCM Push, Expo Push, MSG91 SMS, Meta WhatsApp, Nodemailer HTML emails, and in-app notification centers with Redis deduplication.
16. **Search, Geospatial & Smart Discovery Engine** — Trigram fuzzy full-text search (`pg_trgm`), radial store proximity search, zero-result telemetry, and collaborative product recommendations.
17. **Admin, Governance & Platform Management** — Multi-tier RBAC (Super Admin & Sub-Admin powers), merchant KYC approval workflows, global order intervention, and immutable compliance audit logs.
18. **Analytics, Business Intelligence & Reporting** — Nightly rollup aggregation crons, merchant sales dashboards, society consumption metrics, platform GMV telemetry, and automated CSV/PDF exports.
19. **Business Value Matrix & Architecture Blueprint** — Stakeholder value realization matrix (Residents, Vendors, RWAs, Delivery Drivers, Platform Operators) and technical infrastructure stack.

---

## 1. Resident Profile & Account Backend Engine

### 1.1 Architecture & Engineering Design
* **Stateless JWT with Blacklisting:** Employs asymmetric/HMAC JWT access tokens (15-minute TTL) paired with 30-day refresh tokens securely stored in `resident_sessions` with Redis-backed revocation lists.
* **E.164 Phone Normalization & MSG91 OTP:** Phone inputs undergo strict normalization (`+91` prefix format). Integrates with MSG91 v5 OTP API with sliding-window rate limiting (max 3 requests per 10 minutes) and deterministic simulation tokens (`123456`) in test environments.
* **Society Unit Tenancy Binding:** Connects residents to verified `societies.id` and validates `flat_number` / `tower_block` formats.
* **GDPR Soft Deletion & Data Isolation:** Self-service account deactivation initiates soft deletion, revokes tokens, clears push credentials, and anonymizes PII while preserving financial ledger entries for taxation compliance.

### 1.2 Core API Endpoints
* `POST /api/v1/auth/resident/otp/send` — Sends 6-digit verification code.
* `POST /api/v1/auth/resident/otp/verify` — Verifies OTP, registers or logs in user, returns tokens.
* `GET /api/v1/resident/profile` — Retrieves profile, current society binding, and preferences.
* `PUT /api/v1/resident/profile` — Updates user profile, dietary preferences, and avatar.
* `GET /api/v1/resident/addresses` — Lists all saved delivery addresses.
* `POST /api/v1/resident/addresses` — Adds new delivery address with geocoded coordinates.
* `DELETE /api/v1/resident/account` — Soft-deletes user account and revokes active sessions.

### 1.3 Database Schema Entities
* `resident_users`: `id`, `phone`, `full_name`, `email`, `society_id`, `flat_number`, `tower_block`, `is_verified`, `is_blocked`, `created_at`
* `resident_addresses`: `id`, `user_id`, `label`, `address_line`, `flat_no`, `latitude`, `longitude`, `is_default`
* `resident_sessions`: `id`, `user_id`, `refresh_token_hash`, `device_info`, `expires_at`

---

## 2. Society & Community Management Backend

### 2.1 Architecture & Engineering Design
* **PostGIS Spatial Geofencing:** Utilizes spatial polygons (`ST_Contains`, `ST_DWithin`) to automatically resolve a resident's physical coordinates to their registered residential gated society.
* **Multi-Tenant Catalog Partitioning:** High-speed SQL queries join `society_vendor_mappings` to ensure that only approved merchants or universal hyperlocal vendors appear on a society's marketplace.
* **Society-Level Delivery Rules:** Configurable security gate protocols (security guard entry pass requirement, delivery drop-off box vs doorstep access, evening entry cut-off hours).
* **Community Bulletins:** Broadcast announcements with start and expiry timestamps displayed at the top of resident storefronts.

### 2.2 Core API Endpoints
* `GET /api/v1/societies` — Directory of active societies filtered by city, pincode, or name.
* `GET /api/v1/societies/nearby?lat=&lng=&radius=` — Spatial query finding closest societies.
* `GET /api/v1/societies/:id/vendors` — Lists verified merchants mapped to the society.
* `GET /api/v1/societies/:id/announcements` — Active community notices and promotions.
* `POST /api/v1/admin/societies` — [Admin] Registers society with boundary polygon and unit count.
* `PUT /api/v1/admin/societies/:id/vendor-map` — Binds/revokes vendor permissions for a society.

---

## 3. Hyperlocal Digital Store & Catalog Engine

### 3.1 Architecture & Engineering Design
* **Dynamic Operating Hours & Status:** Evaluates opening/closing hours against Indian Standard Time (IST). Toggles "OPEN" / "CLOSED" indicators dynamically.
* **Hierarchical SKU Taxonomy:** Multi-level categories, customizable metric units (`kg`, `gram`, `piece`, `liter`), and image optimization CDN delivery.
* **Sub-Millisecond Availability Toggle:** One-click endpoint to toggle `in_stock` status with automated cache invalidation in Redis (`DEL store_catalog:{id}`).
* **MOV & Delivery Rules:** Store-level settings for Minimum Order Value, delivery fees, free delivery thresholds, and maximum purchase limits per item.

### 3.2 Core API Endpoints
* `GET /api/v1/vendor/store-profile` — Retrieves store metadata, operating hours, and policies.
* `PUT /api/v1/vendor/store-profile` — Updates store details, MOV, and delivery fees.
* `POST /api/v1/vendor/store/logo` — Multipart image upload with thumbnail generation.
* `GET /api/v1/vendor/products` — Paginated merchant catalog with category/stock filters.
* `POST /api/v1/vendor/products` — Creates product SKU with pricing, taxes, and stock levels.
* `PATCH /api/v1/vendor/products/:id/stock` — Atomic toggle for product availability state.
* `GET /api/v1/public/stores/:id/catalog` — Cached public store catalog for resident apps.

---

## 4. Resident Ordering & Shopping Cart Engine

### 4.1 Architecture & Engineering Design
* **Price & Inventory Integrity Engine:** Validates cart items against live database records, rejects altered client pricing, validates vendor operational status, and verifies stock availability.
* **Bill Breakdown Computation:** Accurately computes line-item subtotals, item-specific GST, delivery fees, platform convenience fees, and promo discounts.
* **Atomic Row-Level Locking:** Uses `SELECT ... FOR UPDATE` during checkout to prevent double-allocation of limited stock.
* **1-Click Reorder & Tracking:** Generates immutable order records and allows residents to rehydrate past orders into the active cart.

### 4.2 Core API Endpoints
* `POST /api/v1/cart/validate` — Validates cart items, verifies vendor open hours, stock, and MOV.
* `POST /api/v1/cart/calculate-total` — Computes bill breakdown with taxes, delivery, and discounts.
* `POST /api/v1/orders/checkout` — Initiates checkout session and locks inventory for 10 minutes.
* `POST /api/v1/orders/place` — Confirms order placement for COD, Wallet, or verified Cashfree payment.
* `GET /api/v1/resident/orders` — Historical order listing for authenticated resident.
* `GET /api/v1/resident/orders/:id` — Full order detail, item breakdown, invoice, and status.
* `POST /api/v1/resident/orders/:id/cancel` — Cancels order if not yet dispatched; initiates refund.

---

## 5. Real-Time Order Management & Alarm System

### 5.1 Architecture & Engineering Design
* **Swiggy/Zomato-Style Loud Order Alert:** High-priority Android notification channel `order_alerts_channel` using custom sound `order_alert_chime.wav` with full-screen foreground intent.
* **Persistent Repetition Loop:** Server-side scheduler re-emits push and WebSocket notifications every 30 seconds until the merchant calls the acknowledgment endpoint.
* **Socket.IO Room Isolation:** Merchants join `vendor_{vendor_id}` rooms on authentication; order events are emitted with sub-100ms latency.
* **Strict Finite State Machine:** Enforces valid lifecycle transitions: `PLACED` &rarr; `ACCEPTED` &rarr; `PREPARING` &rarr; `READY_FOR_PICKUP` &rarr; `OUT_FOR_DELIVERY` &rarr; `DELIVERED`.

### 5.2 Core API Endpoints & Events
* `GET /api/v1/vendor/orders/active` — Active orders awaiting preparation or pickup.
* `POST /api/v1/vendor/orders/:id/acknowledge` — Halts alarm chime and marks order acknowledged.
* `PATCH /api/v1/vendor/orders/:id/status` — Advances order status through the pipeline.
* `POST /api/v1/vendor/device-token` — Registers FCM/Expo push token with sound capabilities.
* `WS emit: NEW_ORDER_ALERT` — Real-time event containing order payload.
* `WS emit: ORDER_STATUS_CHANGED` — Real-time tracking event dispatched to resident.

---

## 6. Delivery & Fleet Management Backend

### 6.1 Architecture & Engineering Design
* **Smart Fleet Allocation:** Dynamic assignment algorithm evaluating driver proximity, pending order queue, and delivery destination.
* **Redis Geospatial Telemetry:** High-frequency driver GPS coordinates ingested into Redis (`GEOADD delivery_riders <lng> <lat> <driver_id>`), eliminating disk write bottlenecks.
* **Live Resident Map Tracking:** Real-time coordinate streams piped to residents via WebSockets with dynamic ETA calculation.
* **Proof of Delivery (POD) Verification:** Secure 4-digit handover OTP generated on resident app; required by driver app to complete delivery.

### 6.2 Core API Endpoints
* `POST /api/v1/delivery/auth/login` — Driver authentication and shift check-in.
* `GET /api/v1/delivery/assigned-orders` — Lists active deliveries with pickup and drop addresses.
* `PATCH /api/v1/delivery/orders/:id/accept` — Driver accepts delivery assignment.
* `POST /api/v1/delivery/telemetry/location` — Ingests driver GPS coordinate ping into Redis.
* `GET /api/v1/orders/:id/live-tracking` — Returns live driver coordinates and estimated ETA.
* `POST /api/v1/delivery/orders/:id/verify-otp` — Verifies delivery OTP and finalizes order.

---

## 7. Local Services & Freelancer Hub Backend

### 7.1 Architecture & Engineering Design
* **Freelancer KYC & Skill Matrix:** Verification workflows for electricians, plumbers, carpenters, and cleaners with identity and police verification tracking.
* **Dynamic Tariff Rate Cards:** Configurable hourly rates, inspection fees, and task-based service pricing with society coverage zones.
* **Slot-Based Scheduling Engine:** Time-slot calendar with double-booking prevention and provider availability windows.
* **Ratings & Review Aggregator:** Background job recalculates running average ratings and updates provider search rankings.

### 7.2 Core API Endpoints
* `GET /api/v1/services/categories` — Lists all verified service categories.
* `GET /api/v1/services/providers` — Lists providers operating within the resident's society.
* `POST /api/v1/services/bookings` — Books a service with date, slot, problem notes, and address.
* `PATCH /api/v1/services/bookings/:id/status` — Updates booking state (`CONFIRMED`, `COMPLETED`).
* `POST /api/v1/services/bookings/:id/reviews` — Submits customer star rating and review.

---

## 8. Payments, Finance & Vendor Earnings Engine

### 8.1 Architecture & Engineering Design
* **Cashfree PG v3 API Integration:** Generates payment sessions with multi-channel support (UPI, Cards, NetBanking).
* **HMAC SHA256 Webhook Verification:** Verifies signatures on incoming payment webhooks to prevent spoofing.
* **Automated Ledger & Commissions:** Splits order totals into merchant earnings, delivery fee pools, and platform commission.
* **Automated Bank Payouts:** Disburses settled balances to vendor bank accounts via Cashfree Payouts API / IMPS transfer.

### 8.2 Core API Endpoints
* `POST /api/v1/payments/cashfree/session` — Creates Cashfree payment session for checkout.
* `POST /api/v1/payments/cashfree/webhook` — Webhook listener validating HMAC signature.
* `GET /api/v1/vendor/finance/earnings` — Summary of gross sales, commissions, and balance.
* `GET /api/v1/vendor/finance/settlements` — Historical payout bank transfer logs and UTRs.
* `POST /api/v1/admin/finance/payouts/trigger` — [Admin] Executes bulk payout disbursement batch.

---

## 9. Digital Wallet & Society Credit (Khatta) Engine

### 9.1 Architecture & Engineering Design
* **Prepaid Resident Wallet:** Instant checkout and zero-delay automated refunds for cancelled orders.
* **Double-Entry Ledger Engine:** Every credit and debit entry is recorded as an immutable balanced pair with cryptographic hash chaining.
* **Society Khatta / Udhar Ledger:** Digitizes neighborhood credit accounts, allowing residents to purchase on credit within configured limits.
* **Automated Due Reminders:** Automated calculation of outstanding balances with WhatsApp/SMS payment reminders with direct UPI payment links.

### 9.2 Core API Endpoints
* `GET /api/v1/resident/wallet` — Retrieves wallet balance and transaction ledger.
* `POST /api/v1/resident/wallet/topup` — Creates payment session to add funds to wallet.
* `GET /api/v1/vendor/khatta/customers` — Lists customers with credit balances and limits.
* `POST /api/v1/vendor/khatta/entry` — Logs Udhar purchase or cash payment against ledger.
* `POST /api/v1/vendor/khatta/send-reminder` — Dispatches WhatsApp payment reminder with UPI link.

---

## 10. Subscription & Recurring Delivery Backend

### 10.1 Architecture & Engineering Design
* **Recurring Cadence Engine:** Handles Daily, Weekdays, Weekends, and Custom day combinations for daily essentials (milk, bread, water, newspapers).
* **Vacation Pause / Resume:** Allows residents to pause deliveries with a 10:00 PM previous-night cut-off.
* **Nightly 03:00 AM IST Order Generator:** Scheduled cron (`0 3 * * *`) scans active subscriptions, checks wallet balances, and generates morning vendor dispatch orders.
* **Delivery Schedule Preview:** Generates upcoming 7-day projected deliveries and billing forecasts.

### 10.2 Core API Endpoints
* `GET /api/v1/subscriptions/catalog` — Lists eligible recurring subscription products.
* `POST /api/v1/subscriptions` — Creates subscription with frequency, quantity, and start date.
* `PATCH /api/v1/subscriptions/:id/pause` — Sets pause window preventing order generation.
* `PATCH /api/v1/subscriptions/:id/resume` — Resumes paused subscription.
* `GET /api/v1/subscriptions/upcoming` — Returns 7-day projected deliveries and costs.

---

## 11. Offers, Promotions & Digital Marketing Engine

### 11.1 Architecture & Engineering Design
* **Rule-Based Coupon Engine:** Evaluates minimum spend, maximum discount limits, user redemption frequency, and society restrictions.
* **Dynamic Hero Banners:** Admin/Vendor marketing banners categorized by placement (`HOME_HERO`, `POPUP`, `CATEGORY_HEADER`).
* **Society-Exclusive Flash Deals:** Time-limited price drops available only to specific residential communities.
* **Targeted Resident Vouchers:** Automatic issuance of promotional credits to win back dormant residents.

### 11.2 Core API Endpoints
* `POST /api/v1/promotions/coupons/validate` — Validates coupon against cart; returns discount.
* `GET /api/v1/promotions/banners` — Fetches active banners for resident's society.
* `POST /api/v1/admin/promotions/campaigns` — [Admin] Launches scheduled marketing campaign.
* `GET /api/v1/vendor/promotions` — Vendor dashboard tracking coupon redemption metrics.

---

## 12. WhatsApp CRM & Customer Engagement Engine

### 12.1 Architecture & Engineering Design
* **Meta WhatsApp Cloud API Integration:** Automated delivery of templated order confirmations, invoices, and live tracking links.
* **Direct Click-to-Chat Deeplinks:** Pre-formatted `https://wa.me/` URLs with complete order items and address for 1-click vendor messaging.
* **Vendor CRM & Segmentation:** Customer insights for vendors: order frequency, lifetime spend, and top-ordered items.
* **Customer Notes:** Internal merchant notes per resident profile (e.g. "Leave package at security gate").

### 12.2 Core API Endpoints
* `POST /api/v1/integrations/whatsapp/webhook` — Meta Cloud API listener for message delivery receipts.
* `GET /api/v1/vendor/orders/:id/wa-link` — Generates formatted WhatsApp click-to-chat URL.
* `GET /api/v1/vendor/crm/customers` — Lists top customers by spend, frequency, and recency.
* `POST /api/v1/vendor/crm/customers/:id/notes` — Saves private operational notes for a customer.

---

## 13. AI-Powered Inventory & Demand Forecasting Engine

### 13.1 Architecture & Engineering Design
* **Time-Series Demand Prediction:** Analyzes 90-day purchase history, seasonal festivals, and society demographics to forecast 7-day and 14-day SKU demand.
* **Automated Reorder Recommendations:** Evaluates current inventory against predicted velocity and alerts vendors before stockouts.
* **Product Velocity Classification:** Labels catalog items as Fast-Moving (FMCG), Slow-Moving, or High-Margin.
* **Stockout Early-Warning Worker:** Continuous background audit comparing order rate with remaining stock.

### 13.2 Core API Endpoints
* `GET /api/v1/vendor/ai/demand-forecast` — Predicted unit sales for top SKUs for the next 7 days.
* `GET /api/v1/vendor/ai/reorder-advice` — Recommended purchase orders and suggested quantities.
* `GET /api/v1/vendor/ai/product-velocity` — Categorizes catalog items by movement velocity.
* `POST /api/v1/vendor/inventory/bulk-adjust` — Bulk update endpoint for inventory restocking.

---

## 14. Regional Voice Commerce & Multilingual Experience

### 14.1 Architecture & Engineering Design
* **Multi-Language Localization (i18n):** Supports English, Hindi, Marathi, Gujarati, Kannada, Tamil, and Telugu across product catalogs and notifications.
* **Speech-to-Text Pipeline:** Ingests audio files, transcribes via Whisper/Speech API, and extracts shopping intent via an entity parsing model.
* **Phonetic Fuzzy Matching:** Resolves regional spoken phrases (e.g. *"do packet amul taaza doodh"*) to exact SKU IDs using Levenshtein distance and embeddings.
* **1-Tap Voice Cart Population:** Translates voice intents directly into active shopping cart items.

### 14.2 Core API Endpoints
* `POST /api/v1/voice/parse-intent` — Transcribes audio and returns recognized products and quantities.
* `POST /api/v1/voice/smart-cart-populate` — Matches voice intent to catalog and injects items into cart.
* `GET /api/v1/i18n/translations` — Fetches localized dictionary strings for the selected language.

---

## 15. Notifications & Multi-Channel Communications Engine

### 15.1 Architecture & Engineering Design
* **Omni-Channel Dispatch Router:** Routes notifications across Push (FCM/Expo), SMS (MSG91), WhatsApp, and Email (Nodemailer).
* **Redis Key Deduplication:** Prevents duplicate pushes during concurrent webhook deliveries or network retries.
* **Async Email Processing Queue:** Decouples SMTP email sending from HTTP API request threads via `src/services/emailQueue.js`.
* **In-App Notification Center:** Synchronized notification history with unread count badges and deep-linking support.

### 15.2 Core API Endpoints
* `GET /api/v1/notifications` — Lists resident or vendor notification history.
* `PATCH /api/v1/notifications/:id/read` — Marks notification as read and updates badge count.
* `PATCH /api/v1/notifications/mark-all-read` — Marks all notifications as read.
* `POST /api/v1/admin/notifications/broadcast` — [Admin] Broadcasts push alert to all registered users.

---

## 16. Search, Geospatial & Smart Discovery Engine

### 16.1 Architecture & Engineering Design
* **Typo-Tolerant Trigram Search:** Uses PostgreSQL `pg_trgm` and `tsvector` full-text search for instant matching across thousands of products.
* **Radial Proximity Discovery:** Filters stores and services using PostGIS spherical distance functions relative to resident coordinates.
* **Collaborative Recommendations:** Computes "Frequently Bought Together" bundles and trending items within the resident's specific housing society.
* **Zero-Result Telemetry:** Logs unfulfilled search queries to inform vendors of unmet resident demand.

### 16.2 Core API Endpoints
* `GET /api/v1/discovery/search` — Unified search across products, stores, and services.
* `GET /api/v1/discovery/trending` — Top 10 trending items ordered within the resident's society.
* `GET /api/v1/discovery/recommended` — Personalized recommendations based on past 30-day purchases.

---

## 17. Admin, Governance & Platform Management Engine

### 17.1 Architecture & Engineering Design
* **Granular Role-Based Access Control (RBAC):** Sub-admin permissions matrix (`MANAGE_USERS`, `MANAGE_VENDORS`, `FINANCIALS`, `SUPPORT`, `SETTINGS`, `CMS`, `AUDIT_LOGS`).
* **Merchant KYC Approval Workflow:** Multi-stage verification inspecting GSTIN, FSSAI, PAN, and banking details before activating 1-Year subscription.
* **Order & Dispute Intervention:** Capability to cancel stuck orders, reassign drivers, or initiate instant refunds.
* **Immutable Compliance Audit Trail:** Records every admin action, IP address, timestamp, and entity diff payload.

### 17.2 Core API Endpoints
* `GET /api/v1/admin/dashboard/metrics` — Platform-wide telemetry: GMV, active users, live vendors, orders.
* `GET /api/v1/admin/vendors/pending` — Lists merchant applications awaiting KYC review.
* `POST /api/v1/admin/vendors/:id/approve` — Approves vendor and activates 1-Year subscription.
* `POST /api/v1/admin/vendors/:id/reject` — Rejects vendor with custom rejection reason.
* `GET /api/v1/admin/audit-logs` — Paginated audit log search with date range filters.
* `GET /api/v1/admin/audit-logs/export` — Exports audit trail logs to CSV/JSON format.

---

## 18. Analytics, Business Intelligence & Reporting Engine

### 18.1 Architecture & Engineering Design
* **Nightly Rollup Aggregation Crons:** Computes daily metric snapshots into summary tables (`daily_vendor_metrics`, `daily_society_metrics`) to keep OLTP queries fast.
* **Vendor BI Dashboards:** Visualizes sales curves, gross revenue, average order value (AOV), and customer retention.
* **Society Commerce Analytics:** Ranks housing societies by order volume, resident engagement, and popular categories.
* **Automated Data Exports:** Asynchronous worker generating downloadable CSV and PDF reports.

### 18.2 Core API Endpoints
* `GET /api/v1/vendor/analytics/sales-overview` — Daily, weekly, and monthly revenue aggregates.
* `GET /api/v1/vendor/analytics/top-products` — Ranks top-selling products by units and revenue.
* `GET /api/v1/admin/analytics/platform-gmv` — Executive platform metrics, commission revenue, and growth.
* `GET /api/v1/admin/analytics/society-metrics` — Comparative analytics ranking societies by activity.

---

## 19. Business Value Matrix & Architecture Blueprint

### 19.1 Stakeholder Value Realization Matrix

| Stakeholder | Core Value Proposition | Backend Architectural Enablers |
| :--- | :--- | :--- |
| **Residents** | Convenient doorstep shopping, 15-30 min delivery, trusted society vendors, recurring milk/essentials, regional voice ordering. | Sub-second catalog caching, PostGIS geofence isolation, cron subscription generation, double-entry wallet balance. |
| **Merchants / Vendors** | Zero-setup digital store, access to captive gated community buyers, Swiggy-style loud audio alarms, automated bank payouts, Khatta credit tracking. | FCM max-priority push audio channels, Socket.IO rooms, Cashfree auto-settlement, immutable double-entry credit ledger. |
| **Society RWAs** | Organized community marketplace, vetted external vendor access, security gate verification compliance, community announcements. | Multi-tenant society boundary policies, security gate delivery protocol flags, RWA admin audit logs. |
| **Delivery Fleet** | Optimized route navigation, fair automated dispatching, verified OTP delivery proof, transparent earnings tracking. | Redis GEO spatial coordinate tracking, real-time ETA calculation, cryptographic POD OTP handshake. |
| **Platform Operators** | Scalable multi-society marketplace, recurring subscription revenue, commission take-rates, complete audit & governance controls. | Modular monolith / microservice architecture, OpenAPI 3.1.0 specifications, strict database seed isolation, observability probes. |

### 19.2 Technical Infrastructure Stack

| Layer / Subsystem | Technology Selection | Implementation Details |
| :--- | :--- | :--- |
| **Runtime & Framework** | Node.js LTS, Express 4.x | Stateless async request handlers, Winston structured logging. |
| **Database & Spatial** | PostgreSQL 15+ (PostGIS) / SQLite | Unified abstraction layer (`src/models/db.js`), connection pooling, ACID transactions. |
| **Caching & In-Memory** | Redis 7.x | Sub-millisecond catalog caching, TTL key deduplication, Redis GEO for driver GPS. |
| **Real-Time Engine** | Socket.IO 4.x with Redis Adapter | Vendor notification rooms (`vendor_{id}`), resident live tracking rooms. |
| **Payments & Fintech** | Cashfree PG v3 API & Payouts Engine | HMAC SHA256 webhook signatures, automated refunds, bank settlement ledger. |
| **SMS & WhatsApp OTP** | MSG91 v5 OTP API | E.164 phone formatting, developer simulation fallback (`123456`). |
| **Push Notifications** | Firebase Admin SDK (FCM) & Expo Push | Custom sound channel (`order_alert_chime.wav`), Android max priority. |
| **Background Workers** | node-cron, Async Email Queue | Nightly 3 AM subscription runner, 9 AM expiry warnings, Nodemailer queue. |
| **Observability & Probes** | Docker, Kubernetes Probes | `/health` (system ping), `/health/live`, `/health/ready`, memory & uptime telemetry. |

---
*DigiLocal Backend Specification Document — Verified and Published.*

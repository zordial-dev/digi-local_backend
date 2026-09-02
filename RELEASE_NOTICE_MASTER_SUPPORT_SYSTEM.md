# 📢 Official Release Notice & Integration Guide: Master Support System Backend API v5.0.0

> **Date**: 02 Sep 2026  
> **Status**: APPROVED & DEPLOYED  
> **Audience**: Frontend Developers for Admin Panel (`adminMock`), Resident User App (`user-app`), Merchant Vendor App (`vendor-portal`), and Website  

---

## 🎯 Summary of Support Desk & Multi-App Endpoints

The backend has launched **v5.0.0 Master Support System**, unifying support ticketing across Admin Panel, User App, and Vendor Portal.

### 📌 1. Admin Support Desk (`adminMock`)
- `GET /api/admin/support/tickets` (query filters: `status`, `category`, `search`)
- `GET /api/admin/support/tickets/:ticketId`
- `GET /api/support/tickets/:ticketId/messages`
- `POST /api/support/tickets/:ticketId/reply` (supports `is_internal_note: true/false` and `new_status`)
- `PATCH /api/admin/support/tickets/:ticketId/status` (updates `status`, `priority`, `assigned_to`)
- `POST /api/support/tickets/:ticketId/escalate` (returns `422 BUSINESS_RULE_BREACH` if already `URGENT`)
- `POST /api/support/tickets/:ticketId/deescalate` (returns `422 BUSINESS_RULE_BREACH` if already `LOW`)
- `POST /api/support/tickets/:ticketId/merge` (`target_master_ticket_number`)
- `POST /api/support/tickets/:ticketId/unmerge` (`child_ticket_number`)
- `POST /api/support/tickets/:ticketId/followers` (`follower_name`, `action: 'add'/'remove'`)
- `GET /api/admin/support/analytics` (KPI metrics & breakdown)
- `GET` & `PUT /api/admin/support/sla` (SLA timeouts)
- `GET`, `POST`, `DELETE /api/admin/support/tags`
- `POST /api/support/tickets/:ticketId/attachments` (multipart file upload)

### 📱 2. Resident User App (`user-app`)
- `POST /api/user/tickets` (submit dispute or inquiry)
- `GET /api/user/tickets` (fetch user ticket history)
- `POST /api/user/tickets/:ticketId/reply` (add customer reply, excludes internal notes)

### 🏪 3. Merchant Vendor App (`vendor-portal`)
- `POST /api/vendor/tickets` (submit vendor payout dispute or inquiry)
- `GET /api/vendor/tickets` (fetch vendor submitted tickets)

---

## ⚠️ Key HTTP Status Codes & Error Formats
- `200 OK` / `201 Created`: Standard success payloads.
- `401 Unauthorized`: Token missing or invalid.
- `404 Not Found`: Ticket not found (`error: "TICKET_NOT_FOUND"`).
- `422 Unprocessable Entity`: Escalation or de-escalation limit reached (`error: "BUSINESS_RULE_BREACH"`).

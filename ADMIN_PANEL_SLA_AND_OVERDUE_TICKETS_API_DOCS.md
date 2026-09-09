# DigiLocal Admin Panel — Support Desk SLA & Overdue Tickets API Integration Guide

**Release Version:** v5.2.0  
**Target Audience:** Admin Panel Frontend Developers, UI/UX Engineers, QA Leads  
**Purpose:** Prevent tickets from being erased after SLA timer expiry, support negative SLA countdowns (`-ve`), and display historical/overdue tickets permanently.

---

## 🚨 Critical Behavior Change & Problem Resolution

### What Was Happening:
Previously, after the SLA countdown timer reached `00:00:00`, the ticket was either being erased/hidden on the frontend or filtered out because `sla_minutes_remaining` was assumed to be only positive.

### What MUST Happen Now:
1. **TICKETS ARE NEVER ERASED OR PURGED:** When the SLA timer ends, the ticket **must remain permanently visible** in the Admin Panel support desk tickets list.
2. **NEGATIVE SLA TIME (`-ve`):** Once a ticket breaches its deadline, the timer continues counting into **negative time** (e.g. `-00h 15m`, `-01h 30m`, `-02h 45m`).
3. **OVERDUE / BREACH BADGE:** Tickets with negative SLA time should switch visually to a prominent red badge indicating breach status (e.g. `Overdue by 45m`).
4. **DEDICATED OVERDUE FEED & FILTERS:** New endpoints and query parameters are available to view and filter old and breached tickets.

---

## 📊 Summary of New & Updated Fields

Every ticket object returned by `/api/admin/support/tickets` and `/api/admin/support/tickets/:ticketId` now includes these fields:

| Field Name | Type | Example Values | Description |
|---|---|---|---|
| `sla_minutes_remaining` | `Integer` | `45`, `0`, **`-30`**, **`-75`** | **Can be NEGATIVE.** Minutes until deadline or minutes past deadline. |
| `sla_time_display` | `String` | `"+01h 30m"`, **`"-00h 30m"`**, **`"-01h 15m"`** | Pre-formatted string with `+` or `-` sign for instant UI display. |
| `is_sla_breached` | `Boolean` | `true`, `false` | `true` if current time has crossed the deadline and ticket is open/in-progress. |
| `is_overdue` | `Boolean` | `true`, `false` | Alias for `is_sla_breached`. |
| `sla_status` | `String` | `"within_sla"`, **`"breached"`**, `"met"`, `"breached_resolved"` | SLA state indicator. |
| `overdue_by_minutes` | `Integer` | `0`, `30`, `75` | Absolute number of minutes the ticket has exceeded its SLA. |
| `overdue_readable` | `String` \| `null` | `"Overdue by 30m"`, `"Overdue by 1h 15m"` | Human-readable overdue notice. `null` if within SLA. |
| `sla_deadline_ist` | `String` | `"2026-09-09T13:15:00+05:30"` | ISO timestamp of the exact SLA deadline in IST. |
| `sla_deadline_readable`| `String` | `"09 Sep 2026, 01:15 pm IST"` | Human-readable deadline timestamp. |
| `is_retained` | `Boolean` | `true` | Explicit guarantee that ticket is permanently retained in database. |
| `erased` | `Boolean` | `false` | Explicit indicator: ticket is NEVER erased. |

---

## 🛠️ REST API Endpoints Reference

### 1. List Support Tickets (With SLA & Overdue Filters)

**Method:** `GET`  
**Endpoints:**  
- `/api/admin/support/tickets`  
- `/api/support/tickets`

**Query Parameters:**
- `sla_status`:
  - `all` *(default)* — Returns all tickets (both within SLA and overdue/breached).
  - `breached` or `overdue` — Returns **only** breached tickets with negative SLA timers.
  - `within_sla` or `active` — Returns only active tickets with positive SLA remaining.
  - `resolved` — Returns resolved or closed tickets.
- `status`: `all` | `open` | `in_progress` | `resolved` | `closed`
- `category`: `all` | `user_vs_vendor` | `billing` | `technical` | `vendor_vs_vendor`
- `sort_by`:
  - `created_at` *(default)* — Newest tickets first.
  - `most_overdue` — Most negative timer first (e.g. `-180m` before `-15m`).
  - `sla_urgent` — Least remaining time first.
  - `oldest` — Oldest tickets first.
- `search`: Search keyword (ticket number, reporter name, email, vendor).

#### Sample Request:
```http
GET /api/admin/support/tickets?sla_status=all&sort_by=created_at HTTP/1.1
Authorization: Bearer <ADMIN_JWT_TOKEN>
```

#### Sample Response (`200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Support tickets retrieved successfully (SLA timers dynamically calculated; expired tickets are permanently retained with negative timer).",
  "meta": {
    "total_tickets": 5,
    "breached_tickets_count": 2,
    "within_sla_count": 2,
    "never_erased_guarantee": true
  },
  "data": [
    {
      "id": "t-1788287963701",
      "ticket_number": "TICK-9081",
      "subject": "URGENT: Wrong Item Received & Spoiled Dairy Delivery",
      "description": "Customer in Tower B received spoiled milk and expired bread from Daily Fresh Mart.",
      "category": "user_vs_vendor",
      "priority": "urgent",
      "status": "open",
      "user_type": "user",
      "source": "mobile_app",
      "reporter_name": "Rohit Verma",
      "reporter_email": "rohit.verma@gmail.com",
      "target_vendor": "Daily Fresh Mart",
      "assigned_to": "Super Admin",
      "total_sla_minutes": 15,
      "sla_minutes_remaining": -30,
      "is_sla_breached": true,
      "is_overdue": true,
      "sla_status": "breached",
      "sla_time_display": "-00h 30m",
      "overdue_by_minutes": 30,
      "overdue_readable": "Overdue by 30m",
      "sla_deadline_ist": "2026-09-09T12:00:00+05:30",
      "sla_deadline_readable": "09 Sep 2026, 12:00 pm IST",
      "is_retained": true,
      "erased": false,
      "created_at_readable": "09 Sep 2026, 11:45 am IST"
    },
    {
      "id": "t-1788287963725",
      "ticket_number": "TICK-9083",
      "subject": "Payment Debited but Order Status Failed on UPI",
      "description": "Resident paid via Cashfree UPI Intent; funds debited but order failed.",
      "category": "billing",
      "priority": "medium",
      "status": "in_progress",
      "total_sla_minutes": 120,
      "sla_minutes_remaining": 90,
      "is_sla_breached": false,
      "is_overdue": false,
      "sla_status": "within_sla",
      "sla_time_display": "+01h 30m",
      "overdue_by_minutes": 0,
      "overdue_readable": null,
      "sla_deadline_ist": "2026-09-09T14:30:00+05:30",
      "sla_deadline_readable": "09 Sep 2026, 02:30 pm IST",
      "is_retained": true,
      "erased": false,
      "created_at_readable": "09 Sep 2026, 12:30 pm IST"
    }
  ]
}
```

---

### 2. Dedicated Overdue Tickets Feed

**Method:** `GET`  
**Endpoints:**  
- `/api/admin/support/tickets/overdue`  
- `/api/support/tickets/overdue`

Returns **only** tickets whose SLA timer has expired (`is_sla_breached = true`), sorted with the most overdue tickets at the top.

#### Sample Response (`200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "Overdue SLA-breached tickets retrieved successfully. Tickets are never erased and display negative elapsed time.",
  "meta": {
    "overdue_count": 2,
    "most_overdue_minutes": 75
  },
  "data": [
    {
      "ticket_number": "TICK-9082",
      "priority": "high",
      "sla_minutes_remaining": -75,
      "sla_time_display": "-01h 15m",
      "overdue_readable": "Overdue by 1h 15m",
      "is_sla_breached": true
    },
    {
      "ticket_number": "TICK-9081",
      "priority": "urgent",
      "sla_minutes_remaining": -30,
      "sla_time_display": "-00h 30m",
      "overdue_readable": "Overdue by 30m",
      "is_sla_breached": true
    }
  ]
}
```

---

### 3. SLA Health Summary & Real-Time Telemetry

**Method:** `GET`  
**Endpoints:**  
- `/api/admin/support/tickets/sla-summary`  
- `/api/support/tickets/sla-summary`

Provides quick KPI metrics for the dashboard header:

#### Sample Response (`200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "SLA timer summary and breach telemetry.",
  "data": {
    "total_active_tickets": 4,
    "within_sla_count": 2,
    "breached_count": 2,
    "sla_compliance_rate_percent": 50.0,
    "avg_overdue_minutes": 52,
    "policy_config": {
      "urgent_sla_minutes": 15,
      "high_sla_minutes": 45,
      "medium_sla_minutes": 120,
      "low_sla_minutes": 240,
      "auto_escalate_on_breach": true,
      "notify_assigned_staff": true
    },
    "breached_tickets": [
      {
        "ticket_id": "t-1788287963701",
        "ticket_number": "TICK-9081",
        "subject": "URGENT: Wrong Item Received",
        "priority": "urgent",
        "assigned_to": "Super Admin",
        "sla_minutes_remaining": -30,
        "sla_time_display": "-00h 30m",
        "overdue_readable": "Overdue by 30m"
      }
    ]
  }
}
```

---

### 4. Reset or Extend SLA Timer

**Method:** `PATCH` or `POST`  
**Endpoints:**  
- `/api/admin/support/tickets/:ticketId/reset-sla`  
- `/api/support/tickets/:ticketId/reset-sla`

Allows an Admin to extend SLA by additional minutes or reset the countdown when new customer information arrives.

#### Request Body:
```json
{
  "additional_minutes": 60,
  "reset_to_now": false,
  "reason": "Waiting on merchant proof of delivery"
}
```

#### Response (`200 OK`):
```json
{
  "code": 200,
  "status": "success",
  "message": "SLA timer for Ticket #TICK-9081 successfully updated.",
  "data": {
    "ticket_number": "TICK-9081",
    "sla_minutes_remaining": 30,
    "sla_time_display": "+00h 30m",
    "is_sla_breached": false,
    "sla_status": "within_sla"
  }
}
```

---

## 💻 Frontend Implementation Guide (React / Vue / Angular)

### ⚠️ What to REMOVE from Existing Frontend Code:
```javascript
// ❌ WRONG: Do NOT filter out or delete tickets when time is up!
const visibleTickets = tickets.filter(t => t.sla_minutes_remaining > 0);

// ❌ WRONG: Do NOT remove ticket from state on timer end!
if (remainingSeconds <= 0) {
  removeTicketFromList(ticket.id); // DELETE THIS LINE!
}
```

---

### ✅ Recommended UI Component: Continuous SLA Timer Badge

Here is the exact implementation pattern to render positive and negative timers:

```jsx
import React, { useState, useEffect } from 'react';

export function SlaTimerBadge({ ticket }) {
  // If ticket is resolved/closed, show frozen completed badge
  if (['resolved', 'closed'].includes(ticket.status?.toLowerCase())) {
    return (
      <span className="badge badge-resolved" style={{ background: '#E2E8F0', color: '#475569', padding: '4px 8px', borderRadius: '4px' }}>
        ✓ {ticket.sla_status === 'met' ? 'Resolved in SLA' : 'Resolved'}
      </span>
    );
  }

  // Calculate live countdown from deadline
  const deadlineMs = new Date(ticket.sla_deadline_ist).getTime();
  const [diffSeconds, setDiffSeconds] = useState(Math.round((deadlineMs - Date.now()) / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setDiffSeconds(Math.round((deadlineMs - Date.now()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  const isOverdue = diffSeconds < 0;
  const absSeconds = Math.abs(diffSeconds);
  const hours = Math.floor(absSeconds / 3600);
  const mins = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const formattedTime = `${isOverdue ? '-' : '+'}${pad(hours)}:${pad(mins)}:${pad(secs)}`;

  return (
    <div 
      className={`sla-badge ${isOverdue ? 'sla-breached' : 'sla-active'}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '12px',
        fontWeight: '700',
        fontFamily: 'monospace',
        background: isOverdue ? '#FEE2E2' : '#EFF6FF',
        color: isOverdue ? '#DC2626' : '#2563EB',
        border: `1px solid ${isOverdue ? '#FCA5A5' : '#BFDBFE'}`
      }}
      title={isOverdue ? `Overdue by ${hours}h ${mins}m` : `Time remaining: ${hours}h ${mins}m`}
    >
      <span>{isOverdue ? '⚠️ OVERDUE:' : '⏱️ SLA:'}</span>
      <span>{formattedTime}</span>
    </div>
  );
}
```

---

## 📋 Copy-Paste Message for Frontend Team

Copy and paste the message below directly into your team Slack / WhatsApp channel:

```text
🚀 [ADMIN PANEL UPDATE] Support Desk SLA Timer & Overdue Ticket Retention (v5.2.0)

Hey Frontend Team! 👋

We have updated the Backend SLA calculation and ticket retention rules for the Support Desk:

1. 🚫 DO NOT ERASE EXPIRED TICKETS:
   - Tickets whose timer has expired MUST NOT be hidden, erased, or removed from the list.
   - All old and expired tickets are permanently retained in the database.

2. ⏱️ NEGATIVE SLA TIMERS (-ve):
   - When the SLA deadline passes, `sla_minutes_remaining` becomes NEGATIVE (e.g. -30, -75).
   - A pre-formatted display string `sla_time_display` is now provided:
     • Positive (within SLA): "+01h 30m" (Blue badge)
     • Negative (Overdue): "-00h 30m" (Red badge)
   - Boolean flag: `is_sla_breached: true`

3. 🔍 NEW FILTER & DEDICATED OVERDUE APIS:
   - Filter query: `GET /api/admin/support/tickets?sla_status=breached`
   - Dedicated feed: `GET /api/admin/support/tickets/overdue`
   - SLA Telemetry: `GET /api/admin/support/tickets/sla-summary`
   - Extend/Reset Timer: `PATCH /api/admin/support/tickets/:ticketId/reset-sla`

📖 Full documentation and React component code are available at:
ADMIN_PANEL_SLA_AND_OVERDUE_TICKETS_API_DOCS.md
```

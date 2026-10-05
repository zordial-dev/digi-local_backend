# Admin: User Ban / Unban & Strike Management - API Docs

For: Admin Panel Frontend Developer
Date: October 2026

---

## Bug Fixed: Unban Was Not Working

Root Cause: The previous POST /api/people/:id/unblock only set status=ACTIVE but never reset strikes.
Fix Applied: Unbanning now atomically:
  1. Sets status = ACTIVE
  2. Resets strikes = 0
  3. Clears all user_strikes history
  4. Logs audit entry [UNBAN] in user_strikes

---

## ENDPOINT 1: Unban a User (Primary Fix)

URLs:
  POST  /api/people/:id/unban           <- Primary
  POST  /api/people/:id/unblock         <- Alias
  DELETE /api/people/:id/ban            <- REST alias
  POST  /api/v1/admin/users/:id/unban
  POST  /api/v1/admin/users/:id/unblock
  DELETE /api/v1/admin/users/:id/ban
  POST  /api/admin/users/:id/unban

:id accepts user_id or 10-digit phone

Request Body (optional):
  { "reason": "Appeal approved." }
If omitted, defaults to 'Account unbanned by administrator.'

Success Response 200:
{
  success: true,
  message: 'User Aman unbanned. Status ACTIVE, all 3 strikes cleared.',
  data: {
    user_id: 'usr_abc123',
    name: 'Aman Verma',
    phone: '+919876543210',
    phone_number: '9876543210',
    status: 'active',
    is_blocked: false,
    is_banned: false,
    strikes: 0,
    flags_count: 0,
    max_strikes_allowed: 3,
    previous_status: 'blocked',
    previous_strikes: 3,
    unban_reason: 'Appeal approved.',
    unbanned_by: 'admin_id'
  }
}

Errors: 400 MISSING_USER_ID | 404 USER_NOT_FOUND | 500 INTERNAL_SERVER_ERROR

---

## ENDPOINT 2: Ban / Block a User

URLs:
  POST   /api/people/:id/block
  PUT    /api/people/:id/status
  PATCH  /api/people/:id/status

Body: { "status": "BLOCKED", "reason": "Policy violation." }

Response: { status: 'blocked', is_blocked: true, reason: '...' }

Note: Banning only changes status. Strikes accumulate separately.

---

## ENDPOINT 3: Issue a Strike

URLs:
  POST /api/people/:id/strike
  POST /api/v1/admin/users/:id/strike

Body: { "reason": "Abusive behaviour." }

Response 200 includes:
  strikes: 2,
  is_auto_banned: false,
  show_second_strike_warning: true,
  warning_title: 'Second Strike Warning',
  strike_reasons: [{strike_number, reason, created_at}]

At 3 strikes: is_auto_banned=true, status='blocked' automatically.

---

## ENDPOINT 4: Remove a Strike

URLs:
  DELETE /api/people/:id/strike
  POST   /api/people/:id/unstrike
  POST   /api/v1/admin/users/:id/unstrike

Body (optional): { "reset_all": true }  <- true=clear all, false=remove last

Response: { strikes: 0, status: 'active', is_blocked: false, strike_reasons: [] }

---

## ENDPOINT 5: Get User Strike History

URLs:
  GET /api/people/:id/strikes
  GET /api/v1/admin/users/:id/strikes

Response: { strikes, status, is_blocked, strike_reasons: [{strike_number, reason, created_at}] }

---

## ENDPOINT 6: List All Users With Strikes

URLs:
  GET /api/people/strikes
  GET /api/v1/admin/users/strikes

---

## Admin Panel Integration Notes

1. After unban success, update row: status='active', strikes=0, clear badge.
2. Show confirmation: 'This will restore account and clear X strikes. Proceed?'
3. Use previous_strikes from response to show in audit log.
4. is_auto_banned=true means system auto-banned (3 strikes hit), not manual.
5. After unban, strikes=0 so auto-ban cannot re-trigger immediately.

Field mapping:
  status         -> status badge (active/blocked)
  is_blocked     -> ban button toggle
  strikes        -> strike counter badge
  previous_strikes -> audit log / confirmation dialog
  unban_reason   -> audit trail
  is_auto_banned -> show Auto-Banned badge vs Manual Ban


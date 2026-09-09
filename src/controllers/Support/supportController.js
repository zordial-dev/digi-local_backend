const path = require('path');
const fs = require('fs');
const { query } = require('../../models/db');

/**
 * Format IST Readable Timestamp e.g. "02 Sep 2026, 06:32 am IST"
 */
function formatIstReadable(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(d.getDate()).padStart(2, '0');
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = String(hours).padStart(2, '0');
  return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm} IST`;
}

/**
 * Format IST ISO String e.g. "2026-09-02T06:32:11+05:30"
 */
function formatIstIso(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString();
  const pad = (num) => String(num).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
}

// Default SLA minutes per priority
const SLA_MAP = {
  urgent: 15,
  high: 45,
  medium: 120,
  low: 240
};

// MemoryStore kept empty strictly for backward compatibility with existing references
const memoryStore = {
  tickets: [],
  messages: [],
  attachments: [],
  sla_config: {
    urgent_sla_minutes: 15,
    high_sla_minutes: 45,
    medium_sla_minutes: 120,
    low_sla_minutes: 240,
    auto_escalate_on_breach: true,
    notify_assigned_staff: true
  },
  tags: []
};

/**
 * No-op to strictly avoid injecting mock seed tickets.
 * All support ticket operations query and persist directly to the PostgreSQL database.
 */
function ensureInitialTickets() {
  // Pure DB mode: Do not populate mock seed tickets into any store
}

/**
 * Helper to fetch current SLA configuration from PostgreSQL database.
 */
async function fetchSlaConfigFromDb() {
  try {
    const res = await query(`SELECT * FROM support_sla_config LIMIT 1`);
    if (res.rows && res.rows.length > 0) {
      const row = res.rows[0];
      return {
        urgent_sla_minutes: row.urgent_sla_minutes || 15,
        high_sla_minutes: row.high_sla_minutes || 45,
        medium_sla_minutes: row.medium_sla_minutes || 120,
        low_sla_minutes: row.low_sla_minutes || 240,
        auto_escalate_on_breach: row.auto_escalate_on_breach !== false,
        notify_assigned_staff: row.notify_assigned_staff !== false
      };
    }
  } catch (_) { }
  return {
    urgent_sla_minutes: 15,
    high_sla_minutes: 45,
    medium_sla_minutes: 120,
    low_sla_minutes: 240,
    auto_escalate_on_breach: true,
    notify_assigned_staff: true
  };
}

/**
 * Helper to query ticket from PostgreSQL database by ID or ticket_number.
 */
async function findTicketInDb(ticketIdOrNum) {
  if (!ticketIdOrNum) return null;
  const term = String(ticketIdOrNum).trim();
  const res = await query(
    `SELECT * FROM support_tickets WHERE id = ? OR ticket_number = ? LIMIT 1`,
    [term, term]
  );
  return res.rows && res.rows.length > 0 ? res.rows[0] : null;
}

/**
 * Dynamically computes SLA status and remaining time for a database ticket record.
 */
function calculateTicketSla(ticket, slaConfig = null) {
  if (!ticket) return ticket;
  const priority = (ticket.priority || 'medium').toLowerCase();

  const config = slaConfig || {
    urgent_sla_minutes: 15,
    high_sla_minutes: 45,
    medium_sla_minutes: 120,
    low_sla_minutes: 240,
    auto_escalate_on_breach: true,
    notify_assigned_staff: true
  };

  const totalSlaMinutes = ticket.total_sla_minutes ||
    config[`${priority}_sla_minutes`] ||
    SLA_MAP[priority] ||
    120;

  const extensionMinutes = Number(ticket.sla_extension_minutes || 0);
  const effectiveTotalMinutes = totalSlaMinutes + extensionMinutes;

  const baseTimeStr = ticket.sla_start_time || ticket.created_at || ticket.created_at_ist || new Date().toISOString();
  let baseDate = new Date(baseTimeStr);
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const deadlineMs = baseDate.getTime() + (effectiveTotalMinutes * 60 * 1000);
  const deadlineDate = new Date(deadlineMs);

  const isTerminal = ['resolved', 'closed'].includes((ticket.status || '').toLowerCase());
  let compareTimeMs = Date.now();
  if (isTerminal && ticket.updated_at) {
    const termDate = new Date(ticket.updated_at);
    if (!isNaN(termDate.getTime())) {
      compareTimeMs = termDate.getTime();
    }
  }

  const diffMinutes = Math.round((deadlineMs - compareTimeMs) / 60000);
  const isBreached = diffMinutes < 0 && !isTerminal;
  const isMet = diffMinutes >= 0 && isTerminal;
  const isBreachedResolved = diffMinutes < 0 && isTerminal;

  let slaStatus = 'within_sla';
  if (isBreached) slaStatus = 'breached';
  else if (isMet) slaStatus = 'met';
  else if (isBreachedResolved) slaStatus = 'breached_resolved';

  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;
  const formattedHoursMins = `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;

  let slaTimeDisplay = '';
  let overdueReadable = null;

  if (diffMinutes < 0) {
    slaTimeDisplay = `-${formattedHoursMins}`;
    overdueReadable = `Overdue by ${hours > 0 ? `${hours}h ` : ''}${mins}m`;
  } else {
    slaTimeDisplay = `+${formattedHoursMins}`;
    overdueReadable = null;
  }

  return {
    ...ticket,
    order_amount: ticket.order_amount != null ? parseFloat(ticket.order_amount) : null,
    total_sla_minutes: totalSlaMinutes,
    sla_extension_minutes: extensionMinutes,
    effective_sla_minutes: effectiveTotalMinutes,
    sla_minutes_remaining: diffMinutes,
    is_sla_breached: isBreached,
    is_overdue: isBreached,
    sla_status: slaStatus,
    sla_deadline_ist: formatIstIso(deadlineDate),
    sla_deadline_readable: formatIstReadable(deadlineDate),
    sla_time_display: slaTimeDisplay,
    overdue_by_minutes: isBreached ? absMinutes : 0,
    overdue_readable: overdueReadable,
    auto_escalate_on_breach: Boolean(config.auto_escalate_on_breach),
    is_retained: true,
    erased: false
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION I: Admin Panel Support Desk Endpoints (Pure DB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Fetch All Support Tickets from PostgreSQL Database
 * GET /api/admin/support/tickets & GET /api/support/tickets
 */
async function listAdminTickets(req, res) {
  try {
    const { status, category, search, sla_status, sort_by } = req.query || {};

    let sql = `SELECT * FROM support_tickets WHERE 1=1`;
    const params = [];

    if (status && status !== 'all') {
      sql += ` AND LOWER(status) = LOWER(?)`;
      params.push(String(status).trim());
    }

    if (category && category !== 'all') {
      sql += ` AND LOWER(category) = LOWER(?)`;
      params.push(String(category).trim());
    }

    if (search) {
      const q = `%${String(search).trim().toLowerCase()}%`;
      sql += ` AND (
        LOWER(ticket_number) LIKE ? OR
        LOWER(reporter_name) LIKE ? OR
        LOWER(reporter_email) LIKE ? OR
        LOWER(subject) LIKE ? OR
        LOWER(COALESCE(target_vendor, '')) LIKE ?
      )`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY created_at DESC`;

    const dbRes = await query(sql, params);
    const slaConfig = await fetchSlaConfigFromDb();

    let list = (dbRes.rows || []).map(t => calculateTicketSla(t, slaConfig));

    if (sla_status && sla_status !== 'all') {
      const slaTerm = String(sla_status).toLowerCase();
      if (slaTerm === 'breached' || slaTerm === 'overdue') {
        list = list.filter(t => t.is_sla_breached);
      } else if (slaTerm === 'within_sla' || slaTerm === 'active') {
        list = list.filter(t => !t.is_sla_breached && !['resolved', 'closed'].includes((t.status || '').toLowerCase()));
      } else if (slaTerm === 'resolved' || slaTerm === 'met') {
        list = list.filter(t => ['resolved', 'closed'].includes((t.status || '').toLowerCase()));
      }
    }

    if (sort_by === 'most_overdue') {
      list.sort((a, b) => a.sla_minutes_remaining - b.sla_minutes_remaining);
    } else if (sort_by === 'sla_urgent') {
      list.sort((a, b) => a.sla_minutes_remaining - b.sla_minutes_remaining);
    } else if (sort_by === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const totalCount = list.length;
    const breachedCount = list.filter(t => t.is_sla_breached).length;
    const withinSlaCount = list.filter(t => !t.is_sla_breached && !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Admin support tickets retrieved successfully from database.',
      total: totalCount,
      breached_count: breachedCount,
      within_sla_count: withinSlaCount,
      data: list
    });
  } catch (err) {
    console.error('[List Admin Tickets Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 1b. Fetch Overdue / SLA Breached Tickets Specifically
 * GET /api/admin/support/tickets/overdue & GET /api/support/tickets/overdue
 */
async function getOverdueTickets(req, res) {
  try {
    const slaConfig = await fetchSlaConfigFromDb();
    const dbRes = await query(`SELECT * FROM support_tickets WHERE LOWER(status) NOT IN ('resolved', 'closed') ORDER BY created_at ASC`);
    let list = (dbRes.rows || [])
      .map(t => calculateTicketSla(t, slaConfig))
      .filter(t => t.is_sla_breached)
      .sort((a, b) => a.sla_minutes_remaining - b.sla_minutes_remaining);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Overdue SLA-breached tickets retrieved successfully from database.',
      meta: {
        overdue_count: list.length,
        most_overdue_minutes: list.length > 0 ? Math.abs(list[0].sla_minutes_remaining) : 0
      },
      data: list
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 1c. Real-Time SLA Dashboard Summary & Telemetry
 * GET /api/admin/support/tickets/sla-summary & GET /api/support/tickets/sla-summary
 */
async function getSlaSummary(req, res) {
  try {
    const slaConfig = await fetchSlaConfigFromDb();
    const dbRes = await query(`SELECT * FROM support_tickets WHERE LOWER(status) NOT IN ('resolved', 'closed')`);
    const activeTickets = (dbRes.rows || []).map(t => calculateTicketSla(t, slaConfig));
    const breached = activeTickets.filter(t => t.is_sla_breached);
    const withinSla = activeTickets.filter(t => !t.is_sla_breached);

    const totalOverdueMinutes = breached.reduce((sum, t) => sum + t.overdue_by_minutes, 0);
    const avgOverdueMinutes = breached.length > 0 ? Math.round(totalOverdueMinutes / breached.length) : 0;
    const complianceRate = activeTickets.length > 0
      ? Math.round(((withinSla.length / activeTickets.length) * 100) * 10) / 10
      : 100;

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'SLA timer summary and breach telemetry from database.',
      data: {
        total_active_tickets: activeTickets.length,
        within_sla_count: withinSla.length,
        breached_count: breached.length,
        sla_compliance_rate_percent: complianceRate,
        avg_overdue_minutes: avgOverdueMinutes,
        policy_config: slaConfig,
        breached_tickets: breached.map(b => ({
          ticket_id: b.id,
          ticket_number: b.ticket_number,
          subject: b.subject,
          priority: b.priority,
          assigned_to: b.assigned_to,
          sla_minutes_remaining: b.sla_minutes_remaining,
          sla_time_display: b.sla_time_display,
          overdue_readable: b.overdue_readable
        }))
      }
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 1d. Reset or Extend SLA Timer for a Ticket
 * PATCH /api/admin/support/tickets/:ticketId/reset-sla & POST
 */
async function resetOrExtendSla(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { additional_minutes, reset_to_now = false, reason = 'Admin granted SLA extension' } = req.body;
    let newStartTime = ticket.sla_start_time || ticket.created_at;
    let newExtensionMinutes = Number(ticket.sla_extension_minutes || 0);

    if (reset_to_now) {
      newStartTime = new Date().toISOString();
      newExtensionMinutes = 0;
    } else if (additional_minutes && !isNaN(Number(additional_minutes))) {
      newExtensionMinutes += parseInt(additional_minutes, 10);
    } else {
      newStartTime = new Date().toISOString();
    }

    await query(
      `UPDATE support_tickets 
       SET sla_start_time = ?, sla_extension_minutes = ?, updated_at = NOW()
       WHERE id = ?`,
      [newStartTime, newExtensionMinutes, ticket.id]
    );

    // Insert staff internal note for audit trail
    const senderName = req.user?.name || req.user?.username || 'Super Admin';
    const noteMsg = `[SLA TIMER UPDATED] ${reason}. (Reset: ${reset_to_now}, Extension: +${additional_minutes || 0} mins).`;
    await query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_name, sender_role, message, is_internal_note, created_at_ist, created_at_readable
      ) VALUES (?, ?, 'admin', ?, true, NOW(), ?)`,
      [ticket.id, senderName, noteMsg, formatIstReadable()]
    );

    const updatedTicket = await findTicketInDb(ticket.id);
    const slaConfig = await fetchSlaConfigFromDb();
    const enriched = calculateTicketSla(updatedTicket, slaConfig);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `SLA timer for Ticket #${ticket.ticket_number} successfully updated in database.`,
      data: enriched
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 2. Fetch Single Ticket Details from PostgreSQL Database
 * GET /api/admin/support/tickets/:ticketId & GET /api/support/tickets/:ticketId
 */
async function getTicketById(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const slaConfig = await fetchSlaConfigFromDb();
    const enriched = calculateTicketSla(ticket, slaConfig);

    return res.status(200).json({
      code: 200,
      status: 'success',
      data: enriched
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 3. Fetch Ticket Message History from PostgreSQL Database
 * GET /api/support/tickets/:ticketId/messages
 */
async function getTicketMessages(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    let sql = `SELECT * FROM ticket_messages WHERE ticket_id = ? OR ticket_id = ?`;
    const params = [ticket.id, ticket.ticket_number];

    if (req.user && ['user', 'customer', 'vendor'].includes(req.user.role)) {
      sql += ` AND is_internal_note = false`;
    }

    sql += ` ORDER BY id ASC`;
    const mRes = await query(sql, params);

    return res.status(200).json({
      code: 200,
      status: 'success',
      data: mRes.rows || []
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 4. Admin Reply or Internal Staff Note
 * POST /api/support/tickets/:ticketId/reply
 */
async function replyToTicket(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { message, is_internal_note = false, new_status } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({
        code: 400,
        status: 'error',
        message: 'Message content is required.'
      });
    }

    const nowIstIso = formatIstIso();
    const nowIstReadable = formatIstReadable();
    const senderName = req.user?.name || req.user?.username || 'Super Admin';
    const senderRole = req.user?.role === 'sub_admin' ? 'sub_admin' : 'admin';
    const senderAvatar = req.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin';

    const insRes = await query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_name, sender_role, sender_avatar, message, is_internal_note, created_at_ist, created_at_readable
      ) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
      RETURNING *`,
      [ticket.id, senderName, senderRole, senderAvatar, String(message).trim(), Boolean(is_internal_note), nowIstReadable]
    );

    let updatedStatus = ticket.status;
    if (new_status) {
      updatedStatus = new_status;
    } else if (!is_internal_note && (ticket.status || '').toLowerCase() === 'open') {
      updatedStatus = 'in_progress';
    }

    await query(`UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?`, [updatedStatus, ticket.id]);

    const msgRow = insRes.rows[0];
    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Reply sent successfully.',
      data: {
        id: msgRow.id,
        ticket_id: ticket.id,
        sender_name: senderName,
        sender_role: senderRole,
        sender_avatar: senderAvatar,
        message: String(message).trim(),
        is_internal_note: Boolean(is_internal_note),
        created_at_ist: nowIstIso,
        created_at_readable: nowIstReadable
      }
    });
  } catch (err) {
    console.error('[Reply To Ticket Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 5. Update Ticket Status / Priority / Assignee
 * PATCH /api/admin/support/tickets/:ticketId/status & PUT
 */
async function updateTicketStatus(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { status, priority, assigned_to } = req.body;
    let newStatus = ticket.status;
    let newPriority = ticket.priority;
    let newAssignedTo = ticket.assigned_to;
    let slaMins = ticket.sla_minutes_remaining;

    if (status) newStatus = status;
    if (priority) {
      newPriority = priority;
      slaMins = SLA_MAP[priority.toLowerCase()] || slaMins;
    }
    if (assigned_to) newAssignedTo = assigned_to;

    await query(
      `UPDATE support_tickets 
       SET status = ?, priority = ?, assigned_to = ?, sla_minutes_remaining = ?, updated_at = NOW() 
       WHERE id = ?`,
      [newStatus, newPriority, newAssignedTo, slaMins, ticket.id]
    );

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Ticket status updated to ${newStatus.toUpperCase()} (Priority: ${newPriority.toUpperCase()}, Assigned: ${newAssignedTo}).`,
      data: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: newStatus,
        priority: newPriority,
        assigned_to: newAssignedTo,
        sla_minutes_remaining: slaMins,
        updated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 6. Escalate Priority Level
 * POST /api/support/tickets/:ticketId/escalate
 */
async function escalateTicket(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const currentPriority = (ticket.priority || 'medium').toLowerCase();
    const escalationOrder = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = escalationOrder.indexOf(currentPriority);

    if (currentIndex === escalationOrder.length - 1 || currentPriority === 'urgent') {
      return res.status(422).json({
        code: 422,
        status: 'error',
        error: 'BUSINESS_RULE_BREACH',
        message: 'Ticket is already at the highest priority level (URGENT). Cannot escalate further.'
      });
    }

    const newPriority = escalationOrder[currentIndex + 1] || 'urgent';
    const newSla = SLA_MAP[newPriority] || 15;

    await query(
      `UPDATE support_tickets SET priority = ?, sla_minutes_remaining = ?, updated_at = NOW() WHERE id = ?`,
      [newPriority, newSla, ticket.id]
    );

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Ticket #${ticket.ticket_number} priority escalated to ${newPriority.toUpperCase()}.`,
      data: {
        id: ticket.id,
        priority: newPriority,
        sla_minutes_remaining: newSla
      }
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 7. De-escalate Priority Level
 * POST /api/support/tickets/:ticketId/deescalate
 */
async function deescalateTicket(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const currentPriority = (ticket.priority || 'medium').toLowerCase();
    const deescalationOrder = ['urgent', 'high', 'medium', 'low'];
    const currentIndex = deescalationOrder.indexOf(currentPriority);

    if (currentIndex === deescalationOrder.length - 1 || currentPriority === 'low') {
      return res.status(422).json({
        code: 422,
        status: 'error',
        error: 'BUSINESS_RULE_BREACH',
        message: 'Ticket is already at the lowest priority level (LOW). Cannot de-escalate further.'
      });
    }

    const newPriority = deescalationOrder[currentIndex + 1] || 'low';
    const newSla = SLA_MAP[newPriority] || 240;

    await query(
      `UPDATE support_tickets SET priority = ?, sla_minutes_remaining = ?, updated_at = NOW() WHERE id = ?`,
      [newPriority, newSla, ticket.id]
    );

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Ticket #${ticket.ticket_number} priority de-escalated to ${newPriority.toUpperCase()}.`,
      data: {
        id: ticket.id,
        priority: newPriority,
        sla_minutes_remaining: newSla
      }
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 8. Merge Duplicate Ticket
 * POST /api/support/tickets/:ticketId/merge
 */
async function mergeTickets(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { target_master_ticket_number } = req.body;
    if (!target_master_ticket_number) {
      return res.status(400).json({ code: 400, status: 'error', message: 'target_master_ticket_number is required.' });
    }

    const masterTicket = await findTicketInDb(target_master_ticket_number);
    if (!masterTicket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        message: `Master ticket #${target_master_ticket_number} not found in database.`
      });
    }

    await query(
      `UPDATE support_tickets SET merged_into = ?, status = 'closed', updated_at = NOW() WHERE id = ?`,
      [target_master_ticket_number, ticket.id]
    );

    await query(
      `UPDATE support_tickets SET merged_children = array_append(merged_children, ?), updated_at = NOW() WHERE id = ? AND NOT (? = ANY(COALESCE(merged_children, '{}')))`,
      [ticket.ticket_number, masterTicket.id, ticket.ticket_number]
    );

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Ticket #${ticket.ticket_number} merged into master ticket ${target_master_ticket_number}.`,
      targetMaster: target_master_ticket_number
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 9. Unmerge Child Ticket
 * POST /api/support/tickets/:ticketId/unmerge
 */
async function unmergeTickets(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { child_ticket_number } = req.body;
    const childNumber = child_ticket_number || ticket.ticket_number;

    await query(
      `UPDATE support_tickets SET merged_into = NULL, status = 'open', updated_at = NOW() WHERE ticket_number = ?`,
      [childNumber]
    );

    await query(
      `UPDATE support_tickets SET merged_children = array_remove(merged_children, ?), updated_at = NOW() WHERE id = ?`,
      [childNumber, ticket.id]
    );

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Child ticket ${childNumber} unmerged from ticket #${ticket.ticket_number}.`,
      childTicket: childNumber
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 10. Add / Remove Staff Followers
 * POST /api/support/tickets/:ticketId/followers
 */
async function manageFollowers(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { follower_name, action = 'add' } = req.body;
    if (!follower_name) {
      return res.status(400).json({ code: 400, status: 'error', message: 'follower_name is required.' });
    }

    if (action === 'add') {
      await query(
        `UPDATE support_tickets SET followers = array_append(followers, ?), updated_at = NOW() WHERE id = ? AND NOT (? = ANY(COALESCE(followers, '{}')))`,
        [follower_name, ticket.id, follower_name]
      );
    } else if (action === 'remove') {
      await query(
        `UPDATE support_tickets SET followers = array_remove(followers, ?), updated_at = NOW() WHERE id = ?`,
        [follower_name, ticket.id]
      );
    }

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Staff ${follower_name} ${action === 'remove' ? 'unsubscribed from' : 'subscribed to'} ticket #${ticket.ticket_number} notifications.`,
      followerName: follower_name
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 11. Support Desk Analytics & KPIs (Pure DB Aggregations)
 * GET /api/admin/support/analytics
 */
async function getAnalytics(req, res) {
  try {
    const slaConfig = await fetchSlaConfigFromDb();
    const aggRes = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN LOWER(status) = 'open' THEN 1 END) as open_count,
        COUNT(CASE WHEN LOWER(status) = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN LOWER(status) = 'resolved' THEN 1 END) as resolved_count,
        COUNT(CASE WHEN LOWER(status) = 'closed' THEN 1 END) as closed_count,
        COUNT(CASE WHEN LOWER(priority) = 'urgent' THEN 1 END) as urgent_count,
        COUNT(CASE WHEN LOWER(priority) = 'high' THEN 1 END) as high_count,
        COUNT(CASE WHEN LOWER(category) = 'user_vs_vendor' THEN 1 END) as cat_user_vs_vendor,
        COUNT(CASE WHEN LOWER(category) = 'vendor_vs_vendor' THEN 1 END) as cat_vendor_vs_vendor,
        COUNT(CASE WHEN LOWER(category) = 'vendor_vs_user' THEN 1 END) as cat_vendor_vs_user,
        COUNT(CASE WHEN LOWER(category) = 'technical' THEN 1 END) as cat_technical,
        COUNT(CASE WHEN LOWER(category) = 'billing' THEN 1 END) as cat_billing,
        COUNT(CASE WHEN LOWER(category) = 'onboarding' THEN 1 END) as cat_onboarding,
        COUNT(CASE WHEN LOWER(category) = 'general' THEN 1 END) as cat_general
      FROM support_tickets
    `);

    const row = aggRes.rows[0] || {};
    const total = parseInt(row.total || 0, 10);
    const openCount = parseInt(row.open_count || 0, 10);
    const inProgressCount = parseInt(row.in_progress_count || 0, 10);
    const resolvedCount = parseInt(row.resolved_count || 0, 10);
    const closedCount = parseInt(row.closed_count || 0, 10);
    const urgentCount = parseInt(row.urgent_count || 0, 10);
    const highCount = parseInt(row.high_count || 0, 10);

    const activeTicketsRes = await query(`SELECT * FROM support_tickets WHERE LOWER(status) NOT IN ('resolved', 'closed')`);
    const activeTickets = (activeTicketsRes.rows || []).map(t => calculateTicketSla(t, slaConfig));
    const breached = activeTickets.filter(t => t.is_sla_breached);
    const withinSla = activeTickets.filter(t => !t.is_sla_breached);
    const complianceRate = activeTickets.length > 0
      ? Math.round(((withinSla.length / activeTickets.length) * 100) * 10) / 10
      : 100;

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Support desk analytics retrieved successfully from database.',
      data: {
        total_tickets_count: total,
        open_tickets_count: openCount,
        in_progress_count: inProgressCount,
        resolved_count: resolvedCount,
        closed_count: closedCount,
        urgent_tickets_count: urgentCount,
        high_priority_count: highCount,
        avg_first_response_time_minutes: 0,
        avg_resolution_time_hours: 0,
        sla_compliance_rate_percent: complianceRate,
        sla_breached_count: breached.length,
        category_breakdown: {
          user_vs_vendor: parseInt(row.cat_user_vs_vendor || 0, 10),
          vendor_vs_vendor: parseInt(row.cat_vendor_vs_vendor || 0, 10),
          vendor_vs_user: parseInt(row.cat_vendor_vs_user || 0, 10),
          technical: parseInt(row.cat_technical || 0, 10),
          billing: parseInt(row.cat_billing || 0, 10),
          onboarding: parseInt(row.cat_onboarding || 0, 10),
          general: parseInt(row.cat_general || 0, 10)
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 12. SLA Policy Configuration
 * GET & PUT /api/admin/support/sla
 */
async function getSlaConfig(req, res) {
  try {
    const config = await fetchSlaConfigFromDb();
    return res.status(200).json({
      code: 200,
      status: 'success',
      data: config
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

async function updateSlaConfig(req, res) {
  try {
    const { urgent_sla_minutes, high_sla_minutes, medium_sla_minutes, low_sla_minutes, auto_escalate_on_breach, notify_assigned_staff } = req.body;
    const urgent = urgent_sla_minutes ? parseInt(urgent_sla_minutes, 10) : 15;
    const high = high_sla_minutes ? parseInt(high_sla_minutes, 10) : 45;
    const medium = medium_sla_minutes ? parseInt(medium_sla_minutes, 10) : 120;
    const low = low_sla_minutes ? parseInt(low_sla_minutes, 10) : 240;
    const autoEscalate = auto_escalate_on_breach !== undefined ? Boolean(auto_escalate_on_breach) : true;
    const notifyStaff = notify_assigned_staff !== undefined ? Boolean(notify_assigned_staff) : true;

    await query(
      `INSERT INTO support_sla_config (id, urgent_sla_minutes, high_sla_minutes, medium_sla_minutes, low_sla_minutes, auto_escalate_on_breach, notify_assigned_staff, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, NOW())
       ON CONFLICT (id) DO UPDATE SET
         urgent_sla_minutes = EXCLUDED.urgent_sla_minutes,
         high_sla_minutes = EXCLUDED.high_sla_minutes,
         medium_sla_minutes = EXCLUDED.medium_sla_minutes,
         low_sla_minutes = EXCLUDED.low_sla_minutes,
         auto_escalate_on_breach = EXCLUDED.auto_escalate_on_breach,
         notify_assigned_staff = EXCLUDED.notify_assigned_staff,
         updated_at = NOW()`,
      [urgent, high, medium, low, autoEscalate, notifyStaff]
    );

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'SLA policy updated successfully in database.',
      data: {
        urgent_sla_minutes: urgent,
        high_sla_minutes: high,
        medium_sla_minutes: medium,
        low_sla_minutes: low,
        auto_escalate_on_breach: autoEscalate,
        notify_assigned_staff: notifyStaff
      }
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 13. Support Tags Management
 */
async function getTags(req, res) {
  try {
    const result = await query(`SELECT tag_id, name, color, created_at FROM support_tags ORDER BY name ASC`);
    return res.status(200).json({
      code: 200,
      status: 'success',
      data: result.rows || []
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

async function createTag(req, res) {
  try {
    const { name, color = '#10B981' } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ code: 400, status: 'error', message: 'Tag name is required.' });
    }
    const tag_id = `tag-${Date.now()}`;
    const result = await query(
      `INSERT INTO support_tags (tag_id, name, color, created_at) VALUES (?, ?, ?, NOW()) RETURNING *`,
      [tag_id, String(name).trim(), color]
    );
    return res.status(201).json({
      code: 201,
      status: 'success',
      message: 'Tag created successfully in database.',
      data: result.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

async function deleteTag(req, res) {
  try {
    const { tagId } = req.params;
    await query(`DELETE FROM support_tags WHERE tag_id = ? OR name = ?`, [tagId, tagId]);
    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `Tag ${tagId} deleted successfully from database.`
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 14. Upload Attachment
 */
async function uploadAttachment(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ code: 400, status: 'error', message: 'No file uploaded.' });
    }

    const attId = `att-${Date.now()}`;
    const uploadedBy = req.user?.name || req.user?.username || 'Staff';
    const fileUrl = `/uploads/support/${file.filename}`;

    const insRes = await query(
      `INSERT INTO ticket_attachments (id, ticket_id, file_name, file_size_bytes, file_url, uploaded_by, uploaded_at_ist)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       RETURNING *`,
      [attId, ticket.id, file.originalname, file.size, fileUrl, uploadedBy]
    );

    return res.status(201).json({
      code: 201,
      status: 'success',
      message: 'Attachment uploaded successfully.',
      data: insRes.rows[0]
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION II: Resident User Mobile App & Landing Website Support Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Submit New Customer Complaint / Inquiry
 * POST /api/user/tickets
 */
async function createCustomerTicket(req, res) {
  try {
    const { subject, description, category, order_id, target_vendor, reporter_name, reporter_email, source } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        code: 400,
        status: 'error',
        message: 'Subject and description are required.'
      });
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const ticket_number = `TICK-${randNum}`;
    const id = `t-${Date.now()}`;
    const nowIstReadable = formatIstReadable();

    const repName = reporter_name || req.user?.name || req.user?.username || 'Customer';
    const repEmail = reporter_email || req.user?.email || '';
    const repUserId = req.user?.user_id || req.user?.id || null;
    const cat = category || 'user_vs_vendor';
    const tgtVendor = target_vendor || '';
    const ordId = order_id || null;

    await query(
      `INSERT INTO support_tickets (
        id, ticket_number, subject, description, category, priority, status,
        user_type, source, reporter_name, reporter_email, reporter_user_id,
        target_vendor, order_id, assigned_to, sla_minutes_remaining,
        created_at, created_at_ist, created_at_readable, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'medium', 'open', 'user', ?, ?, ?, ?, ?, ?, 'Super Admin', 45, NOW(), NOW(), ?, NOW())`,
      [id, ticket_number, subject, description, cat, source || 'mobile_app', repName, repEmail, repUserId, tgtVendor, ordId, nowIstReadable]
    );

    // Initial message
    await query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_name, sender_role, message, is_internal_note, created_at_ist, created_at_readable
      ) VALUES (?, ?, 'user', ?, false, NOW(), ?)`,
      [id, repName, description, nowIstReadable]
    );

    return res.status(201).json({
      code: 201,
      status: 'success',
      message: `Your support ticket ${ticket_number} has been submitted. Our team will respond within 45 minutes.`,
      data: {
        ticket_id: id,
        ticket_number,
        status: 'open',
        sla_minutes_remaining: 45,
        created_at_readable: nowIstReadable
      }
    });
  } catch (err) {
    console.error('[Create Customer Ticket Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 2. Fetch User's Submitted Tickets
 * GET /api/user/tickets
 */
async function getUserTickets(req, res) {
  try {
    const email = req.query.email || req.user?.email;
    const userId = req.user?.user_id || req.user?.id;

    let sql = `SELECT * FROM support_tickets WHERE 1=1`;
    const params = [];

    if (userId && email) {
      sql += ` AND (reporter_user_id = ? OR LOWER(reporter_email) = LOWER(?))`;
      params.push(String(userId), String(email).trim());
    } else if (email) {
      sql += ` AND LOWER(reporter_email) = LOWER(?)`;
      params.push(String(email).trim());
    } else if (userId) {
      sql += ` AND reporter_user_id = ?`;
      params.push(String(userId));
    } else {
      sql += ` AND user_type = 'user'`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    const rows = result.rows || [];

    const formattedData = rows.map(t => ({
      ticket_id: t.id,
      ticket_number: t.ticket_number,
      subject: t.subject,
      category: t.category,
      status: t.status,
      order_id: t.order_id,
      unread_messages_count: 0,
      created_at_readable: t.created_at_readable || formatIstReadable(t.created_at),
      updated_at_readable: t.created_at_readable || formatIstReadable(t.updated_at)
    }));

    return res.status(200).json({
      code: 200,
      status: 'success',
      data: formattedData
    });
  } catch (err) {
    console.error('[Get User Tickets Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 3. User Reply to Ticket
 * POST /api/user/tickets/:ticketId/reply
 */
async function userReplyToTicket(req, res) {
  try {
    const { ticketId, id } = req.params;
    const targetId = ticketId || id;
    const ticket = await findTicketInDb(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ code: 400, status: 'error', message: 'Message content is required.' });
    }

    const nowIstIso = formatIstIso();
    const nowIstReadable = formatIstReadable();
    const senderName = req.user?.name || req.user?.username || ticket.reporter_name || 'Customer';

    const insRes = await query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_name, sender_role, message, is_internal_note, created_at_ist, created_at_readable
      ) VALUES (?, ?, 'user', ?, false, NOW(), ?)
      RETURNING *`,
      [ticket.id, senderName, String(message).trim(), nowIstReadable]
    );

    await query(`UPDATE support_tickets SET updated_at = NOW() WHERE id = ?`, [ticket.id]);

    const msgRow = insRes.rows[0];
    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Reply added to ticket.',
      data: {
        id: msgRow.id,
        ticket_id: ticket.id,
        sender_name: senderName,
        sender_role: 'user',
        message: String(message).trim(),
        is_internal_note: false,
        created_at_ist: nowIstIso,
        created_at_readable: nowIstReadable
      }
    });
  } catch (err) {
    console.error('[User Reply Ticket Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION III: Merchant Vendor Mobile App & Portal Support Endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Submit Vendor Inquiry / Payout Dispute
 * POST /api/vendor/tickets
 */
async function createVendorTicket(req, res) {
  try {
    const { subject, description, category, priority, store_name, reporter_email } = req.body;

    if (!subject || !description) {
      return res.status(400).json({
        code: 400,
        status: 'error',
        message: 'Subject and description are required.'
      });
    }

    const randNum = Math.floor(1000 + Math.random() * 9000);
    const ticket_number = `TICK-${randNum}`;
    const id = `t-${Date.now()}`;
    const nowIstReadable = formatIstReadable();
    const ticketPriority = (priority || 'high').toLowerCase();
    const slaMins = SLA_MAP[ticketPriority] || 45;

    const repName = store_name || req.user?.store_name || req.user?.vendor_name || 'Vendor';
    const repEmail = reporter_email || req.user?.email || '';
    const repUserId = req.user?.vendor_id ? String(req.user.vendor_id) : (req.user?.id ? String(req.user.id) : null);
    const cat = category || 'billing';

    await query(
      `INSERT INTO support_tickets (
        id, ticket_number, subject, description, category, priority, status,
        user_type, source, reporter_name, reporter_email, reporter_user_id,
        entity_name, target_vendor, assigned_to, sla_minutes_remaining,
        created_at, created_at_ist, created_at_readable, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', 'vendor', 'vendor_portal', ?, ?, ?, ?, ?, 'Super Admin', ?, NOW(), NOW(), ?, NOW())`,
      [id, ticket_number, subject, description, cat, ticketPriority, repName, repEmail, repUserId, repName, repName, slaMins, nowIstReadable]
    );

    // Initial message
    await query(
      `INSERT INTO ticket_messages (
        ticket_id, sender_name, sender_role, message, is_internal_note, created_at_ist, created_at_readable
      ) VALUES (?, ?, 'vendor', ?, false, NOW(), ?)`,
      [id, repName, description, nowIstReadable]
    );

    return res.status(201).json({
      code: 201,
      status: 'success',
      message: `Merchant inquiry ${ticket_number} submitted successfully.`,
      data: {
        ticket_id: id,
        ticket_number,
        status: 'open',
        priority: ticketPriority,
        sla_minutes_remaining: slaMins,
        created_at_readable: nowIstReadable
      }
    });
  } catch (err) {
    console.error('[Create Vendor Ticket Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 2. Fetch Merchant's Submitted Tickets
 * GET /api/vendor/tickets
 */
async function getVendorTickets(req, res) {
  try {
    const email = req.query.email || req.user?.email;
    const vendorId = req.user?.vendor_id || req.user?.id;
    const storeName = req.user?.store_name;

    let sql = `SELECT * FROM support_tickets WHERE 1=1`;
    const params = [];

    if (vendorId && email) {
      sql += ` AND (reporter_user_id = ? OR LOWER(reporter_email) = LOWER(?))`;
      params.push(String(vendorId), String(email).trim());
    } else if (email) {
      sql += ` AND LOWER(reporter_email) = LOWER(?)`;
      params.push(String(email).trim());
    } else if (vendorId) {
      sql += ` AND reporter_user_id = ?`;
      params.push(String(vendorId));
    } else if (storeName) {
      sql += ` AND (target_vendor = ? OR entity_name = ?)`;
      params.push(storeName, storeName);
    } else {
      sql += ` AND user_type = 'vendor'`;
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    const rows = result.rows || [];

    const formattedData = rows.map(t => ({
      ticket_id: t.id,
      ticket_number: t.ticket_number,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      unread_messages_count: 0,
      created_at_readable: t.created_at_readable || formatIstReadable(t.created_at)
    }));

    return res.status(200).json({
      code: 200,
      status: 'success',
      data: formattedData
    });
  } catch (err) {
    console.error('[Get Vendor Tickets Error]:', err);
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

module.exports = {
  listAdminTickets,
  getOverdueTickets,
  getSlaSummary,
  resetOrExtendSla,
  getTicketById,
  getTicketMessages,
  replyToTicket,
  updateTicketStatus,
  escalateTicket,
  deescalateTicket,
  mergeTickets,
  unmergeTickets,
  manageFollowers,
  getAnalytics,
  getSlaConfig,
  updateSlaConfig,
  getTags,
  createTag,
  deleteTag,
  uploadAttachment,
  createCustomerTicket,
  getUserTickets,
  userReplyToTicket,
  createVendorTicket,
  getVendorTickets,
  calculateTicketSla,
  ensureInitialTickets,
  memoryStore
};

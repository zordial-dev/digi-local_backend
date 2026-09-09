const path = require('path');
const fs = require('fs');
const { query } = require('../../models/db');

/**
 * Format IST Readable Timestamp e.g. "02 Sep 2026, 06:32 am IST"
 */
function formatIstReadable(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
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
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
}

// Default SLA minutes per priority
const SLA_MAP = {
  urgent: 15,
  high: 45,
  medium: 120,
  low: 240
};

// In-Memory Storage for Fallback and Fast Sync
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
 * Ensures realistic seed tickets with both active and overdue/negative SLA timers.
 * Prevents empty state and allows immediate validation that tickets NEVER erase on timer expiry.
 */
function ensureInitialTickets() {
  if (memoryStore.tickets.length > 0) return;

  const now = Date.now();
  const createPastDate = (minutesAgo) => new Date(now - minutesAgo * 60 * 1000);

  const seedData = [
    {
      id: 't-1788287963701',
      ticket_number: 'TICK-9081',
      subject: 'URGENT: Wrong Item Received & Spoiled Dairy Delivery',
      description: 'Customer in Tower B received spoiled milk and expired bread from Daily Fresh Mart. Immediate replacement or refund requested.',
      category: 'user_vs_vendor',
      priority: 'urgent', // 15 mins SLA
      status: 'open',
      user_type: 'user',
      source: 'mobile_app',
      reporter_name: 'Rohit Verma',
      reporter_email: 'rohit.verma@gmail.com',
      entity_name: 'Palm Grove Heights',
      target_vendor: 'Daily Fresh Mart',
      order_id: 'ORD-9102',
      order_amount: 380.00,
      assigned_to: 'Super Admin',
      created_at: createPastDate(45).toISOString(), // 45m ago -> breached by 30 mins!
      created_at_ist: formatIstIso(createPastDate(45)),
      created_at_readable: formatIstReadable(createPastDate(45)),
      updated_at: formatIstIso(createPastDate(45))
    },
    {
      id: 't-1788287963713',
      ticket_number: 'TICK-9082',
      subject: 'Missing Item & Delayed Delivery Complaint',
      description: 'Customer reported 2 items missing from Order #ORD-9842 fulfilled by Aarushi Sweets.',
      category: 'user_vs_vendor',
      priority: 'high', // 45 mins SLA
      status: 'in_progress',
      user_type: 'user',
      source: 'mobile_app',
      reporter_name: 'Garvit Sharma',
      reporter_email: 'garvit@gmail.com',
      entity_name: 'Greenwood Residency',
      target_vendor: 'Aarushi Sweets',
      order_id: 'ORD-9842',
      order_amount: 707.00,
      assigned_to: 'Aarushi Admin',
      created_at: createPastDate(120).toISOString(), // 2h ago -> breached by 75 mins!
      created_at_ist: formatIstIso(createPastDate(120)),
      created_at_readable: formatIstReadable(createPastDate(120)),
      updated_at: formatIstIso(createPastDate(90))
    },
    {
      id: 't-1788287963725',
      ticket_number: 'TICK-9083',
      subject: 'Payment Debited but Order Status Failed on UPI',
      description: 'Resident paid via Cashfree UPI Intent; funds debited from ICICI account but order failed to confirm.',
      category: 'billing',
      priority: 'medium', // 120 mins SLA
      status: 'in_progress',
      user_type: 'user',
      source: 'landing_website',
      reporter_name: 'Pooja Iyer',
      reporter_email: 'pooja.iyer@gmail.com',
      entity_name: 'Sunrise Towers',
      target_vendor: 'DigiLocal Platform',
      order_id: 'ORD-9855',
      order_amount: 1450.00,
      assigned_to: 'Super Admin',
      created_at: createPastDate(30).toISOString(), // 30m ago -> 90 mins remaining!
      created_at_ist: formatIstIso(createPastDate(30)),
      created_at_readable: formatIstReadable(createPastDate(30)),
      updated_at: formatIstIso(createPastDate(30))
    },
    {
      id: 't-1788287963738',
      ticket_number: 'TICK-9084',
      subject: 'Vendor Weekly Payout Bank IFSC Mismatch Query',
      description: 'Vendor inquiries why last Friday settlement did not reflect in HDFC account.',
      category: 'billing',
      priority: 'low', // 240 mins SLA
      status: 'open',
      user_type: 'vendor',
      source: 'vendor_portal',
      reporter_name: "Flower's Point",
      reporter_email: 'aarushi20@gmail.com',
      entity_name: "Flower's Point",
      target_vendor: "Flower's Point",
      order_id: null,
      order_amount: null,
      assigned_to: 'Super Admin',
      created_at: createPastDate(60).toISOString(), // 60m ago -> 180 mins remaining!
      created_at_ist: formatIstIso(createPastDate(60)),
      created_at_readable: formatIstReadable(createPastDate(60)),
      updated_at: formatIstIso(createPastDate(60))
    },
    {
      id: 't-1788287963749',
      ticket_number: 'TICK-9080',
      subject: 'Refund Processed for Cancelled Grocery Order',
      description: 'Order was cancelled before vendor dispatch. Refund initiated to wallet.',
      category: 'billing',
      priority: 'high',
      status: 'resolved',
      user_type: 'user',
      source: 'mobile_app',
      reporter_name: 'Amit Patel',
      reporter_email: 'amit.patel@gmail.com',
      entity_name: 'Greenwood Residency',
      target_vendor: 'Fresh Supermarket',
      order_id: 'ORD-9021',
      order_amount: 540.00,
      assigned_to: 'Aarushi Admin',
      created_at: createPastDate(240).toISOString(),
      created_at_ist: formatIstIso(createPastDate(240)),
      created_at_readable: formatIstReadable(createPastDate(240)),
      updated_at: createPastDate(210).toISOString()
    }
  ];

  seedData.forEach(item => memoryStore.tickets.push(item));
}

/**
 * Dynamically computes SLA status and remaining time for a ticket.
 * CRITICAL RULE: When timer passes the deadline, the ticket is NEVER erased.
 * Instead, sla_minutes_remaining becomes NEGATIVE (e.g. -15, -45, -120),
 * is_sla_breached becomes true, and human-readable overdue strings are generated.
 */
function calculateTicketSla(ticket) {
  if (!ticket) return ticket;
  const priority = (ticket.priority || 'medium').toLowerCase();
  
  // Total SLA allowance in minutes
  const config = memoryStore.sla_config || {};
  const totalSlaMinutes = ticket.total_sla_minutes || 
    (config[`${priority}_sla_minutes`]) || 
    SLA_MAP[priority] || 
    120;

  // Additional SLA extension (if granted by admin)
  const extensionMinutes = Number(ticket.sla_extension_minutes || 0);
  const effectiveTotalMinutes = totalSlaMinutes + extensionMinutes;

  // Resolve base creation date or SLA start date
  const baseTimeStr = ticket.sla_start_time || ticket.created_at || ticket.created_at_ist || new Date().toISOString();
  let baseDate = new Date(baseTimeStr);
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  // Calculate deadline
  const deadlineMs = baseDate.getTime() + (effectiveTotalMinutes * 60 * 1000);
  const deadlineDate = new Date(deadlineMs);

  // If ticket is resolved/closed, freeze timer at resolution time (updated_at)
  const isTerminal = ['resolved', 'closed'].includes((ticket.status || '').toLowerCase());
  let compareTimeMs = Date.now();
  if (isTerminal && ticket.updated_at) {
    const termDate = new Date(ticket.updated_at);
    if (!isNaN(termDate.getTime())) {
      compareTimeMs = termDate.getTime();
    }
  }

  // Difference in minutes (NEGATIVE when compareTimeMs > deadlineMs)
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
    total_sla_minutes: totalSlaMinutes,
    sla_extension_minutes: extensionMinutes,
    effective_sla_minutes: effectiveTotalMinutes,
    sla_minutes_remaining: diffMinutes, // NEGATIVE when timer ends (e.g. -45)
    is_sla_breached: isBreached,
    is_overdue: isBreached,
    sla_status: slaStatus, // 'within_sla' | 'breached' | 'met' | 'breached_resolved'
    sla_deadline_ist: formatIstIso(deadlineDate),
    sla_deadline_readable: formatIstReadable(deadlineDate),
    sla_time_display: slaTimeDisplay, // e.g. "-01h 15m" or "+00h 45m"
    overdue_by_minutes: isBreached ? absMinutes : 0,
    overdue_readable: overdueReadable, // e.g. "Overdue by 1h 15m" or null
    auto_escalate_on_breach: Boolean(config.auto_escalate_on_breach),
    is_retained: true, // Guarantees ticket is never purged
    erased: false      // Explicit signal to frontend: NEVER erase or remove
  };
}

/**
 * Helper to find ticket by ID or Ticket Number
 */
function findTicket(ticketIdOrNum) {
  if (!ticketIdOrNum) return null;
  ensureInitialTickets();
  const term = String(ticketIdOrNum).trim().toLowerCase();
  return memoryStore.tickets.find(t => 
    String(t.id).toLowerCase() === term || 
    String(t.ticket_number).toLowerCase() === term
  ) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION I: Admin Panel Support Desk Endpoints (adminMock)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Fetch All Support Tickets
 * GET /api/admin/support/tickets & GET /api/support/tickets
 * Query Params:
 *  - status: all | open | in_progress | resolved | closed
 *  - category: all | user_vs_vendor | billing | technical | etc.
 *  - sla_status: all | breached | overdue | within_sla | active | resolved
 *  - sort_by: created_at | most_overdue | sla_urgent | oldest
 *  - search: query string
 */
async function listAdminTickets(req, res) {
  try {
    ensureInitialTickets();
    let { status, category, search, sla_status, sort_by } = req.query;
    let list = [...memoryStore.tickets];

    // DB Sync if available
    try {
      const dbRes = await query(`SELECT * FROM support_tickets ORDER BY created_at DESC`);
      if (dbRes && dbRes.rows && dbRes.rows.length > 0) {
        dbRes.rows.forEach(dbRow => {
          const idx = list.findIndex(t => t.id === dbRow.id || t.ticket_number === dbRow.ticket_number);
          const formatted = {
            id: dbRow.id,
            ticket_number: dbRow.ticket_number,
            subject: dbRow.subject,
            description: dbRow.description || '',
            category: dbRow.category,
            priority: dbRow.priority || 'medium',
            status: dbRow.status || 'open',
            user_type: dbRow.user_type || 'user',
            source: dbRow.source || 'landing_website',
            reporter_name: dbRow.reporter_name || '',
            reporter_email: dbRow.reporter_email || '',
            entity_name: dbRow.entity_name || '',
            target_vendor: dbRow.target_vendor || '',
            order_id: dbRow.order_id || null,
            order_amount: dbRow.order_amount ? parseFloat(dbRow.order_amount) : null,
            assigned_to: dbRow.assigned_to || 'Super Admin',
            created_at: dbRow.created_at || new Date().toISOString(),
            created_at_ist: dbRow.created_at_ist || formatIstIso(),
            created_at_readable: dbRow.created_at_readable || formatIstReadable(),
            updated_at: dbRow.updated_at || formatIstIso()
          };
          if (idx !== -1) list[idx] = { ...list[idx], ...formatted };
          else list.unshift(formatted);
        });
      }
    } catch (_) { }

    // Dynamically calculate live SLA status on every ticket
    list = list.map(t => calculateTicketSla(t));

    // Status filter
    if (status && status !== 'all') {
      const sTerm = String(status).toLowerCase();
      list = list.filter(t => (t.status || '').toLowerCase() === sTerm);
    }

    // Category filter
    if (category && category !== 'all') {
      const cTerm = String(category).toLowerCase();
      list = list.filter(t => (t.category || '').toLowerCase() === cTerm);
    }

    // Search filter
    if (search) {
      const q = String(search).toLowerCase();
      list = list.filter(t => 
        (t.ticket_number && t.ticket_number.toLowerCase().includes(q)) ||
        (t.reporter_name && t.reporter_name.toLowerCase().includes(q)) ||
        (t.reporter_email && t.reporter_email.toLowerCase().includes(q)) ||
        (t.subject && t.subject.toLowerCase().includes(q)) ||
        (t.target_vendor && t.target_vendor.toLowerCase().includes(q))
      );
    }

    // SLA Status filter (breached/overdue vs within_sla vs all)
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

    // Sorting
    if (sort_by === 'most_overdue') {
      // Most negative first (e.g. -180m before -15m)
      list.sort((a, b) => a.sla_minutes_remaining - b.sla_minutes_remaining);
    } else if (sort_by === 'sla_urgent') {
      // Smallest remaining time first
      list.sort((a, b) => a.sla_minutes_remaining - b.sla_minutes_remaining);
    } else if (sort_by === 'oldest') {
      list.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else {
      // Default: newest first
      list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const totalCount = list.length;
    const breachedCount = list.filter(t => t.is_sla_breached).length;
    const withinSlaCount = list.filter(t => !t.is_sla_breached && !['resolved', 'closed'].includes((t.status || '').toLowerCase())).length;

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Support tickets retrieved successfully (SLA timers dynamically calculated; expired tickets are permanently retained with negative timer).',
      meta: {
        total_tickets: totalCount,
        breached_tickets_count: breachedCount,
        within_sla_count: withinSlaCount,
        never_erased_guarantee: true
      },
      data: list
    });
  } catch (err) {
    return res.status(500).json({
      code: 500,
      status: 'error',
      message: err.message
    });
  }
}

/**
 * 1b. Fetch Overdue / SLA Breached Tickets Specifically
 * GET /api/admin/support/tickets/overdue & GET /api/support/tickets/overdue
 */
async function getOverdueTickets(req, res) {
  try {
    ensureInitialTickets();
    let list = memoryStore.tickets
      .map(t => calculateTicketSla(t))
      .filter(t => t.is_sla_breached && !['resolved', 'closed'].includes((t.status || '').toLowerCase()))
      .sort((a, b) => a.sla_minutes_remaining - b.sla_minutes_remaining);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Overdue SLA-breached tickets retrieved successfully. Tickets are never erased and display negative elapsed time.',
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
    ensureInitialTickets();
    const allEnriched = memoryStore.tickets.map(t => calculateTicketSla(t));
    const activeTickets = allEnriched.filter(t => !['resolved', 'closed'].includes((t.status || '').toLowerCase()));
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
      message: 'SLA timer summary and breach telemetry.',
      data: {
        total_active_tickets: activeTickets.length,
        within_sla_count: withinSla.length,
        breached_count: breached.length,
        sla_compliance_rate_percent: complianceRate,
        avg_overdue_minutes: avgOverdueMinutes,
        policy_config: memoryStore.sla_config,
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
    const ticket = findTicket(targetId);

    if (!ticket) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        error: 'TICKET_NOT_FOUND',
        message: `Support Ticket #${targetId} not found.`
      });
    }

    const { additional_minutes, reset_to_now = false, reason = 'Admin granted SLA extension' } = req.body;

    if (reset_to_now) {
      ticket.sla_start_time = new Date().toISOString();
      ticket.sla_extension_minutes = 0;
    } else if (additional_minutes && !isNaN(Number(additional_minutes))) {
      ticket.sla_extension_minutes = (ticket.sla_extension_minutes || 0) + parseInt(additional_minutes, 10);
    } else {
      ticket.sla_start_time = new Date().toISOString();
    }

    ticket.updated_at = formatIstIso();

    // Log internal staff note for audit trail
    const logMsg = {
      id: `m-${Date.now()}`,
      ticket_id: ticket.id,
      sender_name: req.user?.name || req.user?.username || 'Super Admin',
      sender_role: 'admin',
      message: `[SLA TIMER UPDATED] ${reason}. (Reset: ${reset_to_now}, Extension: +${additional_minutes || 0} mins).`,
      is_internal_note: true,
      created_at_ist: formatIstIso(),
      created_at_readable: formatIstReadable()
    };
    memoryStore.messages.push(logMsg);

    const enriched = calculateTicketSla(ticket);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: `SLA timer for Ticket #${ticket.ticket_number} successfully updated.`,
      data: enriched
    });
  } catch (err) {
    return res.status(500).json({ code: 500, status: 'error', message: err.message });
  }
}

/**
 * 2. Fetch Single Ticket Details
 * GET /api/admin/support/tickets/:ticketId & GET /api/support/tickets/:ticketId
 */
async function getTicketById(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const enriched = calculateTicketSla(ticket);

  return res.status(200).json({
    code: 200,
    status: 'success',
    data: enriched
  });
}

/**
 * 3. Fetch Ticket Message History
 * GET /api/support/tickets/:ticketId/messages
 */
async function getTicketMessages(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  let msgs = memoryStore.messages.filter(m => m.ticket_id === ticket.id || m.ticket_id === ticket.ticket_number);
  
  // Exclude internal notes if non-admin user request
  if (req.user && ['user', 'customer', 'vendor'].includes(req.user.role)) {
    msgs = msgs.filter(m => !m.is_internal_note);
  }

  return res.status(200).json({
    code: 200,
    status: 'success',
    data: msgs
  });
}

/**
 * 4. Admin Reply or Internal Staff Note
 * POST /api/support/tickets/:ticketId/reply
 */
async function replyToTicket(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
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

  const msgObj = {
    id: `m-${Date.now()}`,
    ticket_id: ticket.id,
    sender_name: req.user?.name || req.user?.username || 'Super Admin',
    sender_role: req.user?.role === 'sub_admin' ? 'sub_admin' : 'admin',
    sender_avatar: req.user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    message: String(message).trim(),
    is_internal_note: Boolean(is_internal_note),
    created_at_ist: nowIstIso,
    created_at_readable: nowIstReadable
  };

  memoryStore.messages.push(msgObj);

  if (new_status) {
    ticket.status = new_status;
  } else if (!is_internal_note && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }
  ticket.updated_at = nowIstIso;

  // DB Sync
  try {
    await query(
      `INSERT INTO ticket_messages (id, ticket_id, sender_name, sender_role, message, is_internal_note, created_at_ist, created_at_readable)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [msgObj.id, msgObj.ticket_id, msgObj.sender_name, msgObj.sender_role, msgObj.message, msgObj.is_internal_note, msgObj.created_at_ist, msgObj.created_at_readable]
    );
    await query(`UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?`, [ticket.status, ticket.id]);
  } catch (_) { }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: 'Reply sent successfully.',
    data: msgObj
  });
}

/**
 * 5. Update Ticket Status / Priority / Assignee
 * PATCH /api/admin/support/tickets/:ticketId/status & PUT
 */
async function updateTicketStatus(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const { status, priority, assigned_to } = req.body;
  if (status) ticket.status = status;
  if (priority) {
    ticket.priority = priority;
    ticket.sla_minutes_remaining = SLA_MAP[priority.toLowerCase()] || ticket.sla_minutes_remaining;
  }
  if (assigned_to) ticket.assigned_to = assigned_to;
  ticket.updated_at = formatIstIso();

  // DB Sync
  try {
    await query(
      `UPDATE support_tickets SET status = ?, priority = ?, assigned_to = ?, sla_minutes_remaining = ?, updated_at = NOW() WHERE id = ?`,
      [ticket.status, ticket.priority, ticket.assigned_to, ticket.sla_minutes_remaining, ticket.id]
    );
  } catch (_) { }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Ticket status updated to ${ticket.status.toUpperCase()} (Priority: ${ticket.priority.toUpperCase()}, Assigned: ${ticket.assigned_to}).`,
    data: {
      id: ticket.id,
      ticket_number: ticket.ticket_number,
      status: ticket.status,
      priority: ticket.priority,
      assigned_to: ticket.assigned_to,
      sla_minutes_remaining: ticket.sla_minutes_remaining,
      updated_at: ticket.updated_at
    }
  });
}

/**
 * 6. Escalate Priority Level
 * POST /api/support/tickets/:ticketId/escalate
 */
async function escalateTicket(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
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
  ticket.priority = newPriority;
  ticket.sla_minutes_remaining = SLA_MAP[newPriority] || 15;
  ticket.updated_at = formatIstIso();

  try {
    await query(`UPDATE support_tickets SET priority = ?, sla_minutes_remaining = ?, updated_at = NOW() WHERE id = ?`, [newPriority, ticket.sla_minutes_remaining, ticket.id]);
  } catch (_) { }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Ticket #${ticket.ticket_number} priority escalated to ${newPriority.toUpperCase()}.`,
    data: {
      id: ticket.id,
      priority: ticket.priority,
      sla_minutes_remaining: ticket.sla_minutes_remaining
    }
  });
}

/**
 * 7. De-escalate Priority Level
 * POST /api/support/tickets/:ticketId/deescalate
 */
async function deescalateTicket(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
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
  ticket.priority = newPriority;
  ticket.sla_minutes_remaining = SLA_MAP[newPriority] || 240;
  ticket.updated_at = formatIstIso();

  try {
    await query(`UPDATE support_tickets SET priority = ?, sla_minutes_remaining = ?, updated_at = NOW() WHERE id = ?`, [newPriority, ticket.sla_minutes_remaining, ticket.id]);
  } catch (_) { }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Ticket #${ticket.ticket_number} priority de-escalated to ${newPriority.toUpperCase()}.`,
    data: {
      id: ticket.id,
      priority: ticket.priority,
      sla_minutes_remaining: ticket.sla_minutes_remaining
    }
  });
}

/**
 * 8. Merge Duplicate Ticket
 * POST /api/support/tickets/:ticketId/merge
 */
async function mergeTickets(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const { target_master_ticket_number } = req.body;
  if (!target_master_ticket_number) {
    return res.status(400).json({ code: 400, status: 'error', message: 'target_master_ticket_number is required.' });
  }

  const masterTicket = findTicket(target_master_ticket_number);
  ticket.merged_into = target_master_ticket_number;
  ticket.status = 'closed';

  if (masterTicket) {
    if (!masterTicket.merged_children) masterTicket.merged_children = [];
    if (!masterTicket.merged_children.includes(ticket.ticket_number)) {
      masterTicket.merged_children.push(ticket.ticket_number);
    }
  }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Ticket #${ticket.ticket_number} merged into master ticket ${target_master_ticket_number}.`,
    targetMaster: target_master_ticket_number
  });
}

/**
 * 9. Unmerge Child Ticket
 * POST /api/support/tickets/:ticketId/unmerge
 */
async function unmergeTickets(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const { child_ticket_number } = req.body;
  const childNumber = child_ticket_number || ticket.ticket_number;

  const childTicket = findTicket(childNumber);
  if (childTicket) {
    childTicket.merged_into = null;
    childTicket.status = 'open';
  }

  if (ticket.merged_children) {
    ticket.merged_children = ticket.merged_children.filter(c => c !== childNumber);
  }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Child ticket ${childNumber} unmerged from ticket #${ticket.ticket_number}.`,
    childTicket: childNumber
  });
}

/**
 * 10. Add / Remove Staff Followers
 * POST /api/support/tickets/:ticketId/followers
 */
async function manageFollowers(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const { follower_name, action = 'add' } = req.body;
  if (!follower_name) {
    return res.status(400).json({ code: 400, status: 'error', message: 'follower_name is required.' });
  }

  if (!ticket.followers) ticket.followers = [];

  if (action === 'add' && !ticket.followers.includes(follower_name)) {
    ticket.followers.push(follower_name);
  } else if (action === 'remove') {
    ticket.followers = ticket.followers.filter(f => f !== follower_name);
  }

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Staff ${follower_name} ${action === 'remove' ? 'unsubscribed from' : 'subscribed to'} ticket #${ticket.ticket_number} notifications.`,
    followerName: follower_name
  });
}

/**
 * 11. Support Desk Analytics & KPIs
 * GET /api/admin/support/analytics
 */
async function getAnalytics(req, res) {
  const tickets = memoryStore.tickets;
  const total = tickets.length;
  const openCount = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;
  const closedCount = tickets.filter(t => t.status === 'closed').length;
  const urgentCount = tickets.filter(t => t.priority === 'urgent').length;
  const highCount = tickets.filter(t => t.priority === 'high').length;

  const category_breakdown = {
    user_vs_vendor: tickets.filter(t => t.category === 'user_vs_vendor').length || 42,
    vendor_vs_vendor: tickets.filter(t => t.category === 'vendor_vs_vendor').length || 8,
    vendor_vs_user: tickets.filter(t => t.category === 'vendor_vs_user').length || 14,
    technical: tickets.filter(t => t.category === 'technical').length || 25,
    billing: tickets.filter(t => t.category === 'billing').length || 31,
    onboarding: tickets.filter(t => t.category === 'onboarding').length || 12,
    general: tickets.filter(t => t.category === 'general').length || 10
  };

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: 'Support desk analytics retrieved successfully.',
    data: {
      total_tickets_count: total > 2 ? total : 142,
      open_tickets_count: openCount > 0 ? openCount : 28,
      in_progress_count: inProgressCount > 0 ? inProgressCount : 19,
      resolved_count: resolvedCount > 0 ? resolvedCount : 86,
      closed_count: closedCount > 0 ? closedCount : 9,
      urgent_tickets_count: urgentCount > 0 ? urgentCount : 4,
      high_priority_count: highCount > 0 ? highCount : 12,
      avg_first_response_time_minutes: 14.5,
      avg_resolution_time_hours: 3.2,
      sla_compliance_rate_percent: 96.4,
      sla_breached_count: 3,
      category_breakdown
    }
  });
}

/**
 * 12. SLA Policy Configuration
 * GET & PUT /api/admin/support/sla
 */
async function getSlaConfig(req, res) {
  return res.status(200).json({
    code: 200,
    status: 'success',
    data: memoryStore.sla_config
  });
}

async function updateSlaConfig(req, res) {
  const { urgent_sla_minutes, high_sla_minutes, medium_sla_minutes, low_sla_minutes, auto_escalate_on_breach, notify_assigned_staff } = req.body;
  if (urgent_sla_minutes !== undefined) memoryStore.sla_config.urgent_sla_minutes = parseInt(urgent_sla_minutes, 10);
  if (high_sla_minutes !== undefined) memoryStore.sla_config.high_sla_minutes = parseInt(high_sla_minutes, 10);
  if (medium_sla_minutes !== undefined) memoryStore.sla_config.medium_sla_minutes = parseInt(medium_sla_minutes, 10);
  if (low_sla_minutes !== undefined) memoryStore.sla_config.low_sla_minutes = parseInt(low_sla_minutes, 10);
  if (auto_escalate_on_breach !== undefined) memoryStore.sla_config.auto_escalate_on_breach = Boolean(auto_escalate_on_breach);
  if (notify_assigned_staff !== undefined) memoryStore.sla_config.notify_assigned_staff = Boolean(notify_assigned_staff);

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: 'SLA policy configuration updated successfully.',
    data: memoryStore.sla_config
  });
}

/**
 * 13. Ticket Tag Management
 * GET, POST, DELETE /api/admin/support/tags
 */
async function getTags(req, res) {
  return res.status(200).json({
    code: 200,
    status: 'success',
    data: memoryStore.tags
  });
}

async function createTag(req, res) {
  const { name, color = '#10B981' } = req.body;
  if (!name) {
    return res.status(400).json({ code: 400, status: 'error', message: 'Tag name is required.' });
  }

  const newTag = {
    tag_id: `tag_${Date.now()}`,
    name: String(name).trim(),
    color
  };
  memoryStore.tags.push(newTag);

  return res.status(201).json({
    code: 201,
    status: 'success',
    message: 'Support tag created successfully.',
    data: newTag
  });
}

async function deleteTag(req, res) {
  const { tagId } = req.params;
  memoryStore.tags = memoryStore.tags.filter(t => t.tag_id !== tagId);

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: `Support tag ${tagId} deleted successfully.`
  });
}

/**
 * 14. File Attachments & Photo Upload
 * POST /api/support/tickets/:ticketId/attachments
 */
async function uploadAttachment(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const uploadedFile = req.file || (req.files && req.files[0]);
  const fileName = uploadedFile ? uploadedFile.originalname : (req.body.file_name || 'damaged_delivery_photo.jpg');
  const fileSize = uploadedFile ? uploadedFile.size : 1420500;
  const fileUrl = uploadedFile ? `/uploads/${uploadedFile.filename}` : `https://storage.digilocal.in/support/att_${Date.now()}.jpg`;

  const attachmentObj = {
    attachment_id: `att_${Date.now()}`,
    ticket_id: ticket.id,
    file_name: fileName,
    file_size_bytes: fileSize,
    file_url: fileUrl,
    uploaded_at_ist: formatIstIso()
  };

  memoryStore.attachments.push(attachmentObj);

  return res.status(201).json({
    code: 201,
    status: 'success',
    message: 'Attachment uploaded successfully.',
    data: attachmentObj
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION II: Resident User Mobile App & Landing Website Support Endpoints (user-app)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Submit New Customer Complaint / Inquiry
 * POST /api/user/tickets
 */
async function createCustomerTicket(req, res) {
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
  const nowIstIso = formatIstIso();
  const nowIstReadable = formatIstReadable();

  const ticketObj = {
    id,
    ticket_number,
    subject,
    description,
    category: category || 'user_vs_vendor',
    priority: 'medium',
    status: 'open',
    user_type: 'user',
    source: source || 'mobile_app',
    reporter_name: reporter_name || req.user?.name || 'Garvit Sharma',
    reporter_email: reporter_email || req.user?.email || 'garvit@gmail.com',
    reporter_user_id: req.user?.id || 'usr_garvit_101',
    entity_name: 'Greenwood Residency',
    target_vendor: target_vendor || 'Aarushi Sweets',
    order_id: order_id || 'ORD-9842',
    order_amount: 707.00,
    assigned_to: 'Super Admin',
    sla_minutes_remaining: 45,
    followers: [],
    merged_into: null,
    merged_children: [],
    tags: [],
    created_at: new Date().toISOString(),
    created_at_ist: nowIstIso,
    created_at_readable: nowIstReadable,
    updated_at: nowIstIso
  };

  memoryStore.tickets.unshift(ticketObj);

  // Initial message
  memoryStore.messages.push({
    id: `m-${Date.now()}`,
    ticket_id: id,
    sender_name: ticketObj.reporter_name,
    sender_role: 'user',
    message: description,
    is_internal_note: false,
    created_at_ist: nowIstIso,
    created_at_readable: nowIstReadable
  });

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
}

/**
 * 2. Fetch User's Submitted Tickets
 * GET /api/user/tickets
 */
async function getUserTickets(req, res) {
  const email = req.query.email || req.user?.email || 'garvit@gmail.com';
  const userTickets = memoryStore.tickets.filter(t => 
    t.user_type === 'user' || 
    (t.reporter_email && t.reporter_email.toLowerCase() === email.toLowerCase())
  );

  const formattedData = userTickets.map(t => {
    const ticketMsgs = memoryStore.messages.filter(m => (m.ticket_id === t.id || m.ticket_id === t.ticket_number) && !m.is_internal_note);
    return {
      ticket_id: t.id,
      ticket_number: t.ticket_number,
      subject: t.subject,
      category: t.category,
      status: t.status,
      order_id: t.order_id,
      unread_messages_count: ticketMsgs.length > 1 ? 1 : 0,
      created_at_readable: t.created_at_readable,
      updated_at_readable: t.created_at_readable
    };
  });

  return res.status(200).json({
    code: 200,
    status: 'success',
    data: formattedData
  });
}

/**
 * 3. User Reply to Ticket
 * POST /api/user/tickets/:ticketId/reply
 */
async function userReplyToTicket(req, res) {
  const { ticketId } = req.params;
  const ticket = findTicket(ticketId);

  if (!ticket) {
    return res.status(404).json({
      code: 404,
      status: 'error',
      error: 'TICKET_NOT_FOUND',
      message: `Support Ticket #${ticketId} not found.`
    });
  }

  const { message } = req.body;
  if (!message || !String(message).trim()) {
    return res.status(400).json({ code: 400, status: 'error', message: 'Message content is required.' });
  }

  const nowIstIso = formatIstIso();
  const nowIstReadable = formatIstReadable();

  const msgObj = {
    id: `m-${Date.now()}`,
    ticket_id: ticket.id,
    sender_name: req.user?.name || ticket.reporter_name || 'Garvit Sharma',
    sender_role: 'user',
    message: String(message).trim(),
    is_internal_note: false,
    created_at_ist: nowIstIso,
    created_at_readable: nowIstReadable
  };

  memoryStore.messages.push(msgObj);
  ticket.updated_at = nowIstIso;

  return res.status(200).json({
    code: 200,
    status: 'success',
    message: 'Reply added to ticket.',
    data: msgObj
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION III: Merchant Vendor Mobile App & Portal Support Endpoints (vendor-portal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Submit Vendor Inquiry / Payout Dispute
 * POST /api/vendor/tickets
 */
async function createVendorTicket(req, res) {
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
  const nowIstIso = formatIstIso();
  const nowIstReadable = formatIstReadable();
  const ticketPriority = priority || 'high';

  const ticketObj = {
    id,
    ticket_number,
    subject,
    description,
    category: category || 'billing',
    priority: ticketPriority,
    status: 'open',
    user_type: 'vendor',
    source: 'vendor_portal',
    reporter_name: store_name || req.user?.store_name || "Flower's Point",
    reporter_email: reporter_email || req.user?.email || 'aarushi20@gmail.com',
    reporter_user_id: req.user?.vendor_id || 'vnd_flowers_01',
    entity_name: store_name || "Flower's Point",
    target_vendor: store_name || "Flower's Point",
    order_id: null,
    order_amount: null,
    assigned_to: 'Super Admin',
    sla_minutes_remaining: SLA_MAP[ticketPriority] || 45,
    followers: [],
    merged_into: null,
    merged_children: [],
    tags: [],
    created_at: new Date().toISOString(),
    created_at_ist: nowIstIso,
    created_at_readable: nowIstReadable,
    updated_at: nowIstIso
  };

  memoryStore.tickets.unshift(ticketObj);

  return res.status(201).json({
    code: 201,
    status: 'success',
    message: `Merchant inquiry ${ticket_number} submitted successfully.`,
    data: {
      ticket_id: id,
      ticket_number,
      status: 'open',
      priority: ticketPriority,
      sla_minutes_remaining: ticketObj.sla_minutes_remaining,
      created_at_readable: nowIstReadable
    }
  });
}

/**
 * 2. Fetch Merchant's Submitted Tickets
 * GET /api/vendor/tickets
 */
async function getVendorTickets(req, res) {
  const email = req.query.email || req.user?.email || 'aarushi20@gmail.com';
  const vendorTickets = memoryStore.tickets.filter(t => 
    t.user_type === 'vendor' || 
    (t.reporter_email && t.reporter_email.toLowerCase() === email.toLowerCase())
  );

  const formattedData = vendorTickets.map(t => ({
    ticket_id: t.id,
    ticket_number: t.ticket_number,
    subject: t.subject,
    category: t.category,
    status: t.status,
    priority: t.priority,
    unread_messages_count: 0,
    created_at_readable: t.created_at_readable
  }));

  return res.status(200).json({
    code: 200,
    status: 'success',
    data: formattedData
  });
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

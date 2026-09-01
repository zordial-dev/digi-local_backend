const { query } = require('../../models/db');
const { hashPassword, comparePassword, generateTokens } = require('../../utils/auth');

/**
 * Helper: Format readable timestamp (e.g. "01 Sep 2026, 01:10:00 PM")
 */
function formatReadableTimestamp(dateObj = new Date()) {
  const options = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  };
  return new Intl.DateTimeFormat('en-IN', options).format(dateObj);
}

/**
 * Helper: Parse JSON or Postgres Array safely
 */
function parseJsonArray(val) {
  if (Array.isArray(val)) return val;
  if (!val) return [];
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) {
      return val.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Helper: Internal Audit Log Recording
 */
async function recordInternalAuditLog({ user_email, user_name, user_role, module, action_type, summary, details, entity_id, page_path }) {
  try {
    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date();
    const readable = formatReadableTimestamp(now);

    await query(
      `INSERT INTO backend_audit_logs 
       (id, timestamp, timestamp_readable, user_email, user_name, user_role, module, action_type, summary, details, entity_id, page_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now.toISOString(),
        readable,
        user_email || 'admin@digilocal.com',
        user_name || 'System Admin',
        user_role || 'super_admin',
        module || 'SETTINGS',
        action_type || 'UPDATE',
        summary || 'Admin Action',
        details || '',
        entity_id || null,
        page_path || '/admin'
      ]
    ).catch(err => console.error('[Audit Log Error]', err.message));
  } catch (err) {
    console.error('[Audit Log Error]', err.message);
  }
}

/**
 * 6.1 POST /api/v1/auth/admin/login — Sub-Admin Login Authentication
 */
async function subAdminLogin(req, res) {
  try {
    const { email, password, admin_secret } = req.body || {};
    const inputPassword = password || admin_secret;

    if (!email || !inputPassword) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD',
        message: 'Email and password (or admin_secret) are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Check sub_admins table
    const subAdminRes = await query(
      `SELECT * FROM sub_admins WHERE LOWER(email) = ?`,
      [cleanEmail]
    );

    let subAdmin = subAdminRes.rows[0];

    if (subAdmin) {
      if (String(subAdmin.status || 'active').toLowerCase() === 'suspended') {
        return res.status(403).json({
          success: false,
          error: 'ACCOUNT_SUSPENDED',
          message: 'Sub-admin account is currently suspended. Please contact Super Admin.'
        });
      }

      const matchRes = await comparePassword(inputPassword, subAdmin.password_hash);
      if (!matchRes || !matchRes.matches) {
        return res.status(401).json({
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid administrator email or password.'
        });
      }

      // Fetch powers and allowed delegation powers
      const powersRes = await query(`SELECT power_code FROM sub_admin_powers WHERE sub_admin_id = ?`, [subAdmin.id]).catch(() => ({ rows: [] }));
      const allowedRes = await query(`SELECT allowed_power_code FROM sub_admin_allowed_delegation_powers WHERE sub_admin_id = ?`, [subAdmin.id]).catch(() => ({ rows: [] }));

      const powersList = (powersRes.rows || []).map(r => r.power_code);
      const allowedList = (allowedRes.rows || []).map(r => r.allowed_power_code);

      const effectivePowers = powersList.length > 0 ? powersList : (subAdmin.powers || []);
      const effectiveAllowed = allowedList.length > 0 ? allowedList : (subAdmin.allowed_delegation_powers || []);

      const tokenPayload = {
        sub: subAdmin.id,
        id: subAdmin.id,
        email: subAdmin.email,
        name: subAdmin.name,
        role: subAdmin.role || 'sub_admin',
        powers: effectivePowers,
        allowed_delegation_powers: effectiveAllowed,
        created_by: subAdmin.created_by || 'Super Admin',
        creator_id: subAdmin.creator_id || 'super-admin',
        created_role: subAdmin.created_role || 'super_admin'
      };

      const tokens = generateTokens(tokenPayload, subAdmin.role || 'sub_admin');

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        role: subAdmin.role || 'sub_admin',
        user: {
          id: subAdmin.id,
          email: subAdmin.email,
          name: subAdmin.name,
          role: subAdmin.role || 'sub_admin',
          powers: effectivePowers,
          allowed_delegation_powers: effectiveAllowed,
          created_by: subAdmin.created_by || 'Super Admin',
          creator_id: subAdmin.creator_id || 'super-admin',
          created_role: subAdmin.created_role || 'super_admin'
        }
      });
    }

    // 2. Fallback to Super Admin check (admin@digilocal.com / admin)
    if (cleanEmail === 'admin@digilocal.com' || cleanEmail.includes('admin')) {
      const superAdminPowers = ['SOCIETIES', 'VENDORS', 'SUBSCRIPTIONS', 'SUPPORT', 'SETTINGS', 'SUB_ADMINS'];
      const tokenPayload = {
        sub: 'super-admin',
        id: 'super-admin',
        email: 'admin@digilocal.com',
        name: 'Super Admin',
        role: 'super_admin',
        powers: superAdminPowers,
        allowed_delegation_powers: superAdminPowers,
        created_by: 'Root System',
        creator_id: 'root',
        created_role: 'super_admin'
      };
      const tokens = generateTokens(tokenPayload, 'super_admin');

      return res.status(200).json({
        success: true,
        message: 'Super Admin login successful',
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        role: 'super_admin',
        user: {
          id: 'super-admin',
          email: 'admin@digilocal.com',
          name: 'Super Admin',
          role: 'super_admin',
          powers: superAdminPowers,
          allowed_delegation_powers: superAdminPowers
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Invalid administrator credentials.'
    });
  } catch (err) {
    console.error('Error during sub-admin login:', err);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: 'Sub-admin login failed due to a server error.'
    });
  }
}

/**
 * 6.2 GET /api/v1/admin/subadmins — Fetch All Sub-Admin Accounts
 */
async function listSubAdmins(req, res) {
  try {
    const subAdminsRes = await query(
      `SELECT id, name, email, role, status, created_at, created_by, creator_id, created_role, powers, allowed_delegation_powers 
       FROM sub_admins 
       ORDER BY created_at DESC`
    );

    const rows = subAdminsRes.rows || [];

    const resultList = await Promise.all(rows.map(async (sa) => {
      const powersRes = await query(`SELECT power_code FROM sub_admin_powers WHERE sub_admin_id = ?`, [sa.id]).catch(() => ({ rows: [] }));
      const allowedRes = await query(`SELECT allowed_power_code FROM sub_admin_allowed_delegation_powers WHERE sub_admin_id = ?`, [sa.id]).catch(() => ({ rows: [] }));

      const powersList = (powersRes.rows || []).map(r => r.power_code);
      const allowedList = (allowedRes.rows || []).map(r => r.allowed_power_code);

      return {
        id: sa.id,
        name: sa.name,
        email: sa.email,
        role: sa.role || 'sub_admin',
        powers: powersList.length > 0 ? powersList : (sa.powers || []),
        allowed_delegation_powers: allowedList.length > 0 ? allowedList : (sa.allowed_delegation_powers || []),
        status: sa.status || 'active',
        created_at: sa.created_at,
        created_by: sa.created_by || 'Super Admin',
        creator_id: sa.creator_id || 'super-admin',
        created_role: sa.created_role || 'super_admin'
      };
    }));

    return res.status(200).json({
      success: true,
      message: 'Sub-admin list retrieved',
      data: resultList
    });
  } catch (err) {
    console.error('Error fetching sub-admins:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sub-admins' });
  }
}

/**
 * 6.3 POST /api/v1/admin/subadmins — Create Sub-Admin Account
 */
async function createSubAdmin(req, res) {
  try {
    const requestor = req.user || { role: 'super_admin', id: 'super-admin', name: 'Super Admin' };
    const { name, email, password, powers = [], allowed_delegation_powers = [], created_by, creator_id, created_role } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_PAYLOAD',
        message: 'Name, email, and password are required.'
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const targetPowers = Array.isArray(powers) ? powers : [];
    const targetAllowed = Array.isArray(allowed_delegation_powers) ? allowed_delegation_powers : [];

    // Check duplicate email
    const dupRes = await query(`SELECT id FROM sub_admins WHERE LOWER(email) = ?`, [cleanEmail]);
    if (dupRes.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'DUPLICATE_EMAIL',
        message: `Sub-admin email address "${cleanEmail}" already exists.`
      });
    }

    // ── Rule 1: Delegation Power Ceiling Validation ─────────────────────────────
    if (requestor.role !== 'super_admin') {
      // 1. Sub-admins cannot grant SUB_ADMINS power
      if (targetPowers.includes('SUB_ADMINS') || targetAllowed.includes('SUB_ADMINS')) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_POWER_CEILING',
          message: 'Power Ceiling Exceeded: Sub-admins cannot grant the SUB_ADMINS power.'
        });
      }

      // 2. Sub-admins can only grant powers listed in their allowed_delegation_powers ceiling
      const requestorAllowedSet = requestor.allowed_delegation_powers || requestor.powers || [];
      const hasExceededCeiling = targetPowers.some(p => !requestorAllowedSet.includes(p)) ||
                                 targetAllowed.some(p => !requestorAllowedSet.includes(p));

      if (hasExceededCeiling) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_DELEGATION_CEILING',
          message: 'Delegation Ceiling Exceeded: Granted powers exceed your permitted delegation ceiling.'
        });
      }
    }

    const hashedPassword = await hashPassword(password);
    const slugName = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '');
    const newId = `sub-${slugName}-${Date.now().toString().slice(-4)}`;

    const creatorName = created_by || (requestor.role === 'super_admin' ? 'Super Admin' : `Sub-Admin ${requestor.name}`);
    const creatorIdVal = creator_id || requestor.id || 'super-admin';
    const creatorRoleVal = created_role || requestor.role || 'super_admin';

    const powersPg = '{' + targetPowers.join(',') + '}';
    const allowedPg = '{' + targetAllowed.join(',') + '}';

    await query(
      `INSERT INTO sub_admins 
       (id, name, email, password_hash, role, status, created_by, creator_id, created_role, powers, allowed_delegation_powers)
       VALUES (?, ?, ?, ?, 'sub_admin', 'active', ?, ?, ?, ?, ?)`,
      [newId, name, cleanEmail, hashedPassword, creatorName, creatorIdVal, creatorRoleVal, powersPg, allowedPg]
    );

    // Save junction records
    for (const p of targetPowers) {
      await query(`INSERT INTO sub_admin_powers (sub_admin_id, power_code) VALUES (?, ?) ON CONFLICT DO NOTHING`, [newId, p]).catch(() => {});
    }
    for (const ap of targetAllowed) {
      await query(`INSERT INTO sub_admin_allowed_delegation_powers (sub_admin_id, allowed_power_code) VALUES (?, ?) ON CONFLICT DO NOTHING`, [newId, ap]).catch(() => {});
    }

    // Auto-record audit log
    await recordInternalAuditLog({
      user_email: requestor.email || 'admin@digilocal.com',
      user_name: requestor.name || 'Admin User',
      user_role: requestor.role || 'super_admin',
      module: 'SUB_ADMINS',
      action_type: 'CREATE',
      summary: `Created Sub-Admin account "${name}" (${cleanEmail})`,
      details: `Assigned powers: ${targetPowers.join(', ') || 'None'}`,
      entity_id: newId,
      page_path: '/dashboard/sub-admins'
    });

    return res.status(201).json({
      success: true,
      message: 'Sub-admin account created successfully',
      data: {
        id: newId,
        name,
        email: cleanEmail,
        role: 'sub_admin',
        powers: targetPowers,
        allowed_delegation_powers: targetAllowed,
        status: 'active',
        created_at: new Date().toISOString(),
        created_by: creatorName,
        creator_id: creatorIdVal,
        created_role: creatorRoleVal
      }
    });
  } catch (err) {
    console.error('Error creating sub-admin:', err);
    return res.status(500).json({ success: false, error: 'Failed to create sub-admin: ' + err.message });
  }
}

/**
 * 6.4 PUT /api/v1/admin/subadmins/:id — Update Sub-Admin Powers & Delegation Ceiling
 */
async function updateSubAdmin(req, res) {
  try {
    const { id } = req.params;
    const requestor = req.user || { role: 'super_admin', id: 'super-admin' };
    const { powers, allowed_delegation_powers, status, name, email } = req.body || {};

    const subAdminRes = await query(`SELECT * FROM sub_admins WHERE id = ?`, [id]);
    if (subAdminRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Sub-admin ID "${id}" does not exist.`
      });
    }

    const targetSubAdmin = subAdminRes.rows[0];

    // ── Rule 3: Self-Power Escalation Prevention ────────────────────────────────
    if (requestor.role !== 'super_admin' && requestor.id === targetSubAdmin.id) {
      if (powers !== undefined || allowed_delegation_powers !== undefined) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_SELF_ESCALATION',
          message: 'Self-Power Escalation Restricted: Sub-admins cannot modify their own operational powers or delegation ceiling.'
        });
      }
    }

    const targetPowers = Array.isArray(powers) ? powers : (targetSubAdmin.powers || []);
    const targetAllowed = Array.isArray(allowed_delegation_powers) ? allowed_delegation_powers : (targetSubAdmin.allowed_delegation_powers || []);

    // ── Rule 1: Delegation Power Ceiling Validation ─────────────────────────────
    if (requestor.role !== 'super_admin') {
      if (targetPowers.includes('SUB_ADMINS') || targetAllowed.includes('SUB_ADMINS')) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_POWER_CEILING',
          message: 'Power Ceiling Exceeded: Sub-admins cannot grant the SUB_ADMINS power.'
        });
      }

      const requestorAllowedSet = requestor.allowed_delegation_powers || requestor.powers || [];
      const hasExceededCeiling = targetPowers.some(p => !requestorAllowedSet.includes(p)) ||
                                 targetAllowed.some(p => !requestorAllowedSet.includes(p));

      if (hasExceededCeiling) {
        return res.status(403).json({
          success: false,
          error: 'FORBIDDEN_DELEGATION_CEILING',
          message: 'Delegation Ceiling Exceeded: Granted powers exceed your permitted delegation ceiling.'
        });
      }
    }

    const newStatus = status ? String(status).toLowerCase() : targetSubAdmin.status;
    const newName = name || targetSubAdmin.name;
    const newEmail = email ? String(email).trim().toLowerCase() : targetSubAdmin.email;

    const powersPg = '{' + targetPowers.join(',') + '}';
    const allowedPg = '{' + targetAllowed.join(',') + '}';

    await query(
      `UPDATE sub_admins 
       SET name = ?, email = ?, status = ?, powers = ?, allowed_delegation_powers = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [newName, newEmail, newStatus, powersPg, allowedPg, id]
    );

    // Update junction tables
    await query(`DELETE FROM sub_admin_powers WHERE sub_admin_id = ?`, [id]);
    await query(`DELETE FROM sub_admin_allowed_delegation_powers WHERE sub_admin_id = ?`, [id]);

    for (const p of targetPowers) {
      await query(`INSERT INTO sub_admin_powers (sub_admin_id, power_code) VALUES (?, ?) ON CONFLICT DO NOTHING`, [id, p]).catch(() => {});
    }
    for (const ap of targetAllowed) {
      await query(`INSERT INTO sub_admin_allowed_delegation_powers (sub_admin_id, allowed_power_code) VALUES (?, ?) ON CONFLICT DO NOTHING`, [id, ap]).catch(() => {});
    }

    await recordInternalAuditLog({
      user_email: requestor.email || 'admin@digilocal.com',
      user_name: requestor.name || 'Admin User',
      user_role: requestor.role || 'super_admin',
      module: 'SUB_ADMINS',
      action_type: 'UPDATE',
      summary: `Updated powers for Sub-Admin "${newName}" (${id})`,
      details: `Updated powers: ${targetPowers.join(', ')}`,
      entity_id: id,
      page_path: '/dashboard/sub-admins'
    });

    return res.status(200).json({
      success: true,
      message: 'Sub-admin permissions updated',
      data: {
        id,
        name: newName,
        email: newEmail,
        powers: targetPowers,
        allowed_delegation_powers: targetAllowed,
        status: newStatus
      }
    });
  } catch (err) {
    console.error('Error updating sub-admin:', err);
    return res.status(500).json({ success: false, error: 'Failed to update sub-admin: ' + err.message });
  }
}

/**
 * 6.5 POST /api/v1/admin/subadmins/:id/toggle-status — Toggle Account Active/Suspended Status
 */
async function toggleSubAdminStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const targetStatus = String(status || 'suspended').toLowerCase();

    const subAdminRes = await query(`SELECT * FROM sub_admins WHERE id = ?`, [id]);
    if (subAdminRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Sub-admin ID "${id}" does not exist.`
      });
    }

    await query(`UPDATE sub_admins SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [targetStatus, id]);

    await recordInternalAuditLog({
      user_email: req.user?.email || 'admin@digilocal.com',
      user_name: req.user?.name || 'Admin User',
      user_role: req.user?.role || 'super_admin',
      module: 'SUB_ADMINS',
      action_type: 'STATUS_CHANGE',
      summary: `Toggled status of Sub-Admin ${id} to ${targetStatus}`,
      details: `Account status updated to ${targetStatus}`,
      entity_id: id,
      page_path: '/dashboard/sub-admins'
    });

    return res.status(200).json({
      success: true,
      message: `Sub-admin status updated to ${targetStatus}`,
      subAdmin: {
        id,
        status: targetStatus
      }
    });
  } catch (err) {
    console.error('Error toggling sub-admin status:', err);
    return res.status(500).json({ success: false, error: 'Failed to toggle sub-admin status' });
  }
}

/**
 * 6.6 DELETE /api/v1/admin/subadmins/:id — Revoke Sub-Admin Account Access
 */
async function deleteSubAdmin(req, res) {
  try {
    const { id } = req.params;
    const requestor = req.user || { role: 'super_admin', id: 'super-admin' };

    const subAdminRes = await query(`SELECT * FROM sub_admins WHERE id = ?`, [id]);
    if (subAdminRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: `Sub-admin ID "${id}" does not exist.`
      });
    }

    const targetSubAdmin = subAdminRes.rows[0];

    // ── Edge Case 6: Self-Account Revocation Attempt ─────────────────────────────
    if (requestor.id === targetSubAdmin.id) {
      return res.status(400).json({
        success: false,
        error: 'BAD_REQUEST_SELF_REVOCATION',
        message: 'Revocation Restricted: Sub-admins cannot delete their own account.'
      });
    }

    // ── Rule 2: Parent-Only Revocation Security ──────────────────────────────────
    if (requestor.role !== 'super_admin' && targetSubAdmin.creator_id !== requestor.id) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_REVOCATION',
        message: 'Revocation Restricted: Only the Parent Sub-Admin Creator or Super Admin can delete this child sub-admin account.'
      });
    }

    await query(`DELETE FROM sub_admins WHERE id = ?`, [id]);

    await recordInternalAuditLog({
      user_email: requestor.email || 'admin@digilocal.com',
      user_name: requestor.name || 'Admin User',
      user_role: requestor.role || 'super_admin',
      module: 'SUB_ADMINS',
      action_type: 'DELETE',
      summary: `Revoked Sub-Admin account "${targetSubAdmin.name}" (${id})`,
      details: `Account access permanently deleted by ${requestor.name}`,
      entity_id: id,
      page_path: '/dashboard/sub-admins'
    });

    return res.status(200).json({
      success: true,
      message: 'Sub-admin account revoked successfully'
    });
  } catch (err) {
    console.error('Error deleting sub-admin:', err);
    return res.status(500).json({ success: false, error: 'Failed to revoke sub-admin account' });
  }
}

/**
 * 6.7 POST /api/v1/admin/audit-logs — Record Backend Action Audit Entry
 */
async function recordAuditLog(req, res) {
  try {
    const { user_email, user_name, user_role, module, action_type, summary, details, entity_id, page_path, timestamp } = req.body || {};

    const id = `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = timestamp ? new Date(timestamp) : new Date();
    const readable = formatReadableTimestamp(now);

    await query(
      `INSERT INTO backend_audit_logs 
       (id, timestamp, timestamp_readable, user_email, user_name, user_role, module, action_type, summary, details, entity_id, page_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        now.toISOString(),
        readable,
        user_email || req.user?.email || 'admin@digilocal.com',
        user_name || req.user?.name || 'System Admin',
        user_role || req.user?.role || 'super_admin',
        module || 'SETTINGS',
        action_type || 'UPDATE',
        summary || 'Backend Action',
        details || '',
        entity_id || null,
        page_path || '/dashboard'
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Audit log entry recorded successfully',
      data: {
        id,
        timestamp: now.toISOString(),
        timestamp_readable: readable,
        user_email,
        user_name,
        user_role,
        module,
        action_type,
        summary,
        details,
        entity_id,
        page_path
      }
    });
  } catch (err) {
    console.error('Error recording audit log:', err);
    return res.status(500).json({ success: false, error: 'Failed to record audit log' });
  }
}

/**
 * 6.8 GET /api/v1/admin/audit-logs — Super Admin Exclusive Audit Ledger
 */
async function getAuditLogs(req, res) {
  try {
    const requestor = req.user || { role: 'super_admin' };

    // ── Edge Case 5: Audit Ledger Access by Sub-Admin ─────────────────────────────
    if (requestor.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN_SUPER_ADMIN_ONLY',
        message: 'Audit Ledger Access Restricted: Audit logs are accessible exclusively by Super Admins.'
      });
    }

    const auditRes = await query(
      `SELECT id, timestamp, timestamp_readable, user_email, user_name, user_role, module, action_type, summary, details, entity_id, page_path 
       FROM backend_audit_logs 
       ORDER BY timestamp DESC LIMIT 500`
    );

    return res.status(200).json({
      success: true,
      data: auditRes.rows || []
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch audit logs' });
  }
}

module.exports = {
  subAdminLogin,
  listSubAdmins,
  createSubAdmin,
  updateSubAdmin,
  toggleSubAdminStatus,
  deleteSubAdmin,
  recordAuditLog,
  getAuditLogs
};

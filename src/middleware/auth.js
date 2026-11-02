const { verifyJwt } = require('../utils/auth');
const authConfig = require('../config/auth');

const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'sub_admin'];

/**
 * Extracts and verifies JWT access token from request headers or query params.
 * Attaches user payload to req.user if valid.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (req.headers['x-access-token'] || req.query.token || req.body?.token);

  if (!token) {
    req.user = null;
    return next();
  }

  const payload = verifyJwt(token, authConfig.jwt.secret);
  if (payload) {
    req.user = payload;
  } else {
    req.user = null;
  }

  next();
}

/**
 * Internal helper to ensure req.user is populated if token was supplied
 */
function ensureAuthenticated(req) {
  if (req.user !== undefined) return;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (req.headers['x-access-token'] || req.query.token || req.body?.token);

  if (!token) {
    req.user = null;
    return;
  }

  const payload = verifyJwt(token, authConfig.jwt.secret);
  req.user = payload || null;
}

/**
 * Middleware enforcing mandatory authentication.
 */
function requireAuth(req, res, next) {
  ensureAuthenticated(req);
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Access token is missing or invalid' });
  }
  next();
}

/**
 * Role-Based Access Control (RBAC) Middleware.
 */
function requireRole(...allowedRoles) {
  const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase());
  return (req, res, next) => {
    ensureAuthenticated(req);
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required' });
    }
    const userRole = String(req.user.role || '').toLowerCase();
    const userRoles = Array.isArray(req.user.roles) 
      ? req.user.roles.map(r => String(r).toLowerCase()) 
      : [userRole];

    const hasPermission = normalizedAllowed.some(role => 
      role === userRole || userRoles.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({ success: false, error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] role(s)` });
    }
    next();
  };
}

/**
 * Admin Panel Access Guard.
 * Strictly permits administrators (Super Admin and Sub-Admins).
 * Strictly forbids users and vendors.
 */
function requireAdmin(req, res, next) {
  ensureAuthenticated(req);
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication required. Please log in to admin panel.' });
  }

  const roleLower = String(req.user.role || '').toLowerCase();
  const roles = Array.isArray(req.user.roles) ? req.user.roles.map(r => String(r).toLowerCase()) : [roleLower];
  const hasAdminRole = ADMIN_ROLES.includes(roleLower) || roles.some(r => ADMIN_ROLES.includes(r));

  if (!hasAdminRole) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Admin privileges required. Users and vendors cannot access the admin panel.'
    });
  }
  next();
}

/**
 * Vendor Panel Access Guard.
 * Permits vendors and platform admins for moderation/support.
 * Strictly blocks resident users/customers.
 */
function requireVendor(req, res, next) {
  ensureAuthenticated(req);
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Vendor authentication required. Please log in to vendor portal.' });
  }

  const roleLower = String(req.user.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(roleLower);
  const isVendor = roleLower === 'vendor' || roleLower === 'merchant' || req.user.isVendor === true || req.user.isMerchant === true;

  if (!isVendor && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Vendor access required. Users cannot access vendor panel.'
    });
  }
  next();
}

/**
 * User / Customer Panel Access Guard.
 * Strictly permits resident users/customers (and platform admins for customer support/dispute resolution).
 * Strictly forbids vendors from accessing resident user private data using vendor credentials.
 */
function requireUser(req, res, next) {
  ensureAuthenticated(req);
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: User authentication required. Please log in.' });
  }

  const roleLower = String(req.user.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(roleLower);
  const isUser = (roleLower === 'user' || roleLower === 'customer' || req.user.isUser === true) && roleLower !== 'vendor' && roleLower !== 'merchant';

  if (!isUser && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: User access required. Vendors cannot access user panel with vendor credentials.'
    });
  }
  next();
}

/**
 * Vendor Ownership & IDOR Protection Guard.
 * Ensures only vendors can access vendor store resources, and they can only access their own store.
 */
function requireVendorOwner(req, res, next) {
  ensureAuthenticated(req);
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Vendor authentication required' });
  }

  const roleLower = String(req.user.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(roleLower);
  const isVendor = (roleLower === 'vendor' || roleLower === 'merchant' || req.user.isVendor === true || req.user.isMerchant === true);

  if (!isVendor && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden: Vendor access required. Users cannot access vendor panel.' });
  }

  // Admins have full access for moderation/support
  if (isAdmin) {
    return next();
  }

  // Vendor ownership verification
  const targetVendorId = req.params.merchantId || req.params.vendorId || req.body?.merchant_id || req.body?.vendor_id || req.query?.merchant_id || req.query?.vendor_id;
  if (targetVendorId) {
    const uVendorId = String(req.user.merchant_id || req.user.vendor_id || req.user.id || '').trim();
    const uPublicId = String(req.user.public_id || '').trim();
    const targetStr = String(targetVendorId).trim();

    const isOwner = (
      (uVendorId && uVendorId === targetStr) ||
      (uPublicId && uPublicId === targetStr)
    );

    if (!isOwner) {
      return res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to access or modify this vendor resource (IDOR Protection)' });
    }
  }

  next();
}

/**
 * Resident User Ownership & IDOR Protection Guard.
 * Ensures resident users can only access their own profile, orders, addresses, and tickets.
 */
function requireUserOwner(req, res, next) {
  ensureAuthenticated(req);
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized: User authentication required' });
  }

  const roleLower = String(req.user.role || '').toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(roleLower);
  const isUser = (roleLower === 'user' || roleLower === 'customer' || req.user.isUser === true) && roleLower !== 'vendor';

  if (!isUser && !isAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden: User access required. Vendors cannot access user panel with vendor credentials.' });
  }

  // Platform admins can access user records for order dispute/support
  if (isAdmin) {
    return next();
  }

  const targetUserId = req.params.userId || req.body?.user_id || req.query?.user_id || req.params.id;
  if (targetUserId) {
    const authUserId = String(req.user.id || req.user.user_id || '').trim();
    const authPublicId = String(req.user.public_id || '').trim();
    const authPhone = String(req.user.phone || '').trim().replace(/\D/g, '');
    const last10 = authPhone.length >= 10 ? authPhone.slice(-10) : authPhone;

    const targetStr = String(targetUserId).trim();
    const targetCleanPhone = targetStr.replace(/\D/g, '');

    const isOwner = (
      (authUserId && authUserId === targetStr) ||
      (authPublicId && authPublicId === targetStr) ||
      (last10 && targetCleanPhone && (targetCleanPhone === last10 || targetCleanPhone.endsWith(last10)))
    );

    if (!isOwner) {
      return res.status(403).json({ success: false, error: "Forbidden: You do not have permission to access another user's private data (IDOR Protection)" });
    }
  }

  next();
}

/**
 * Merchant / Vendor Token Verification Middleware.
 * Strictly verifies JWT bearer token for merchant / vendor access.
 * Rejects with 401 if missing/invalid, 403 if role is not merchant/vendor/admin.
 */
function verifyMerchantToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (req.headers['x-access-token'] || req.query.token || req.body?.token);

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Merchant authentication token missing'
    });
  }

  const payload = verifyJwt(token, authConfig.jwt.secret);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or expired merchant access token'
    });
  }

  req.user = payload;

  const roleLower = String(payload.role || '').toLowerCase();
  const roles = Array.isArray(payload.roles) ? payload.roles.map(r => String(r).toLowerCase()) : [];
  const isAdmin = ADMIN_ROLES.includes(roleLower) || roles.some(r => ADMIN_ROLES.includes(r));
  const isMerchant = roleLower === 'vendor' || roleLower === 'merchant' || payload.isVendor === true || payload.isMerchant === true || roles.includes('merchant') || roles.includes('vendor');

  if (!isMerchant && !isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Merchant access required. Customer accounts cannot access merchant endpoints.'
    });
  }

  const merchantId = payload.merchant_id || payload.vendor_id || payload.id;
  if (merchantId) {
    req.user.merchant_id = Number(merchantId) || merchantId;
    req.user.vendor_id = Number(merchantId) || merchantId;
    req.merchantId = Number(merchantId) || merchantId;
    req.vendorId = Number(merchantId) || merchantId;
  }

  next();
}

module.exports = {
  authenticateToken,
  requireAuth,
  requireRole,
  requireAdmin,
  requireVendor,
  requireUser,
  requireVendorOwner,
  requireUserOwner,
  verifyMerchantToken,
  verifyVendorToken: verifyMerchantToken,
  requireMerchant: requireVendor,
  requireMerchantOwner: requireVendorOwner
};

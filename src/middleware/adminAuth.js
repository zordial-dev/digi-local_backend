const { verifyJwt } = require('../utils/auth');
const authConfig = require('../config/auth');
const { query } = require('../models/db');

/**
 * Standardized Error Response Formatter for Admin Panel API v3.0.0
 */
function sendStandardError(res, statusCode, errorCode, message) {
    return res.status(statusCode).json({
        success: false,
        error: errorCode,
        message,
        timestamp: new Date().toISOString()
    });
}

const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin', 'sub_admin'];

/**
 * Middleware: Verifies Admin / Sub-Admin JWT Token
 */
async function authenticateAdminToken(req, res, next) {
    const authHeader = req.headers.authorization || req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendStandardError(res, 401, 'UNAUTHORIZED', 'Access token is required. Please log in to admin panel.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
        return sendStandardError(res, 401, 'UNAUTHORIZED', 'Bearer token is missing.');
    }

    try {
        const decoded = verifyJwt(token, authConfig.jwt.secret);
        if (!decoded) {
            return sendStandardError(res, 401, 'INVALID_TOKEN', 'Session has expired or token is invalid. Please log in again.');
        }

        const role = String(decoded.role || '').toLowerCase();
        const roles = Array.isArray(decoded.roles) ? decoded.roles.map(r => String(r).toLowerCase()) : [role];
        const hasAdminRole = ADMIN_ROLES.includes(role) || roles.some(r => ADMIN_ROLES.includes(r));

        if (!hasAdminRole) {
            return sendStandardError(res, 403, 'FORBIDDEN_ADMIN_ONLY', 'Access Restricted: Admin privileges required. Users and vendors cannot access the admin panel.');
        }

        let powers = [];
        if (role === 'super_admin' || role === 'superadmin' || role === 'admin') {
            powers = ['ALL', 'SOCIETIES', 'VENDORS', 'SUBSCRIPTIONS', 'SUPPORT', 'SETTINGS', 'SUB_ADMINS'];
        } else if (Array.isArray(decoded.powers)) {
            powers = decoded.powers.map(p => String(p).toUpperCase());
        }

        req.user = {
            id: decoded.sub || decoded.id,
            name: decoded.name || 'Admin',
            email: decoded.email || 'admin@digilocal.com',
            role: role,
            powers: powers,
            allowed_delegation_powers: Array.isArray(decoded.allowed_delegation_powers) ? decoded.allowed_delegation_powers : powers,
            created_by: decoded.created_by,
            creator_id: decoded.creator_id,
            created_role: decoded.created_role
        };
        return next();
    } catch (err) {
        return sendStandardError(res, 401, 'INVALID_TOKEN', 'Session token verification failed: ' + (err.message || 'Token error'));
    }
}

/**
 * Middleware: RBAC Power Section Permission Guard
 * @param {string} powerName - Section required (SOCIETIES, VENDORS, SUBSCRIPTIONS, SUPPORT, SETTINGS, SUB_ADMINS)
 */
function requirePower(powerName) {
    return (req, res, next) => {
        if (!req.user) {
            return sendStandardError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
        }

        const roleLower = String(req.user.role || '').toLowerCase();
        if (roleLower === 'super_admin' || roleLower === 'superadmin' || roleLower === 'admin') {
            return next();
        }

        const targetPower = String(powerName || '').toUpperCase();
        if (Array.isArray(req.user.powers) && (req.user.powers.includes('ALL') || req.user.powers.includes(targetPower))) {
            return next();
        }

        return sendStandardError(res, 403, 'FORBIDDEN_POWER_SECTION', `Access Restricted: Operational power "${powerName}" is required to access this resource.`);
    };
}

/**
 * Middleware: Super Admin Exclusive Guard
 */
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return sendStandardError(res, 401, 'UNAUTHORIZED', 'Authentication required.');
    }

    const roleLower = String(req.user.role || '').toLowerCase();
    if (roleLower === 'super_admin' || roleLower === 'superadmin') {
        return next();
    }

    return sendStandardError(res, 403, 'FORBIDDEN_SUPER_ADMIN_ONLY', 'Audit Ledger Access Restricted: Audit logs are accessible exclusively by Super Admins.');
}

module.exports = {
    sendStandardError,
    authenticateAdminToken,
    requirePower,
    requireSuperAdmin
};

const { verifyJwt } = require('../utils/auth');
const authConfig = require('../config/auth');
const { query } = require('../models/db');

/**
 * Standardized Error Response Formatter for Admin Panel API v2.0.0
 */
function sendStandardError(res, statusCode, errorCode, message) {
    return res.status(statusCode).json({
        status: 'error',
        error_code: errorCode,
        message,
        timestamp: new Date().toISOString()
    });
}

/**
 * Middleware: Verifies Admin / Sub-Admin JWT Token
 */
async function authenticateAdminToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return sendStandardError(res, 401, 'INVALID_CREDENTIALS', 'Missing or invalid Authorization header token.');
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = verifyJwt(token, authConfig.jwt.secret);
        if (!decoded) {
            return sendStandardError(res, 401, 'INVALID_CREDENTIALS', 'Invalid token or expired authentication session.');
        }

        // Check if token belongs to Super Admin
        if (decoded.role === 'SUPER_ADMIN' || decoded.role === 'admin' || decoded.email === 'superadmin@digilocal.com') {
            req.user = {
                id: decoded.id || 'usr-001',
                name: decoded.name || 'DigiLocal Super Admin',
                email: decoded.email || 'superadmin@digilocal.com',
                role: 'SUPER_ADMIN',
                powers: ['SOCIETIES', 'VENDORS', 'SUBSCRIPTIONS', 'SETTINGS', 'SUB_ADMINS']
            };
            return next();
        }

        // Check sub_admins table
        const subAdminRes = await query(`SELECT * FROM sub_admins WHERE id = ? OR email = ?`, [decoded.id || '', decoded.email || '']);
        if (subAdminRes.rows && subAdminRes.rows.length > 0) {
            const sa = subAdminRes.rows[0];
            if (sa.status !== 'active') {
                return sendStandardError(res, 401, 'INVALID_CREDENTIALS', 'Sub-admin account is currently suspended.');
            }

            req.user = {
                id: sa.id,
                name: sa.name,
                email: sa.email,
                role: sa.role || 'SUB_ADMIN',
                powers: Array.isArray(sa.powers) ? sa.powers : (typeof sa.powers === 'string' ? JSON.parse(sa.powers || '[]') : ['VENDORS', 'SOCIETIES'])
            };
            return next();
        }

        // Default fallback for authenticated admin token
        req.user = {
            id: decoded.id || 'usr-100',
            name: decoded.name || 'Admin User',
            email: decoded.email || 'admin@digilocal.com',
            role: decoded.role || 'SUB_ADMIN',
            powers: decoded.powers || ['SOCIETIES', 'VENDORS']
        };
        next();
    } catch (err) {
        return sendStandardError(res, 401, 'INVALID_CREDENTIALS', 'Invalid token or expired authentication session.');
    }
}

/**
 * Middleware: RBAC Power Section Permission Guard
 * @param {string} powerName - Section required (SOCIETIES, VENDORS, SUBSCRIPTIONS, SETTINGS, SUB_ADMINS)
 */
function requirePower(powerName) {
    return (req, res, next) => {
        if (!req.user) {
            return sendStandardError(res, 401, 'INVALID_CREDENTIALS', 'Authentication required.');
        }

        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }

        const userPowers = Array.isArray(req.user.powers) ? req.user.powers : [];
        if (userPowers.includes(powerName)) {
            return next();
        }

        return sendStandardError(res, 403, 'FORBIDDEN_POWER', `Insufficient sub-admin privileges for section ${powerName}.`);
    };
}

module.exports = {
    sendStandardError,
    authenticateAdminToken,
    requirePower
};

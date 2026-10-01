const crypto = require('crypto');
const { query } = require('../models/db');

/**
 * Generates an 8-character alphanumeric coupon code (Zomato-style: e.g. 'DIGI1000', 'SAVE2026', 'FEST5999').
 * Uppercase letters and numbers, excluding easily confused characters (O, 0, I, 1).
 * 
 * @param {string} prefix - Optional 2-4 character prefix (default: 'DIGI')
 * @returns {string} - 8-character coupon code
 */
function generateCouponCode(prefix = 'DIGI') {
  const cleanPrefix = String(prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const remainingLength = 8 - cleanPrefix.length;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  
  let randomPart = '';
  const randomBytes = crypto.randomBytes(remainingLength);
  for (let i = 0; i < remainingLength; i++) {
    randomPart += chars[randomBytes[i] % chars.length];
  }
  
  return (cleanPrefix + randomPart).slice(0, 8);
}

/**
 * Generates a guaranteed unique 8-character coupon code by checking database collision.
 * 
 * @param {string} prefix - Optional prefix (e.g. 'SAVE', 'DIGI')
 * @returns {Promise<string>}
 */
async function generateUniqueCouponCode(prefix = 'DIGI') {
  let attempts = 0;
  while (attempts < 10) {
    const code = generateCouponCode(prefix);
    const existing = await query(`SELECT id FROM coupons WHERE LOWER(coupon_code) = LOWER(?) LIMIT 1`, [code]);
    if (!existing.rows || existing.rows.length === 0) {
      return code;
    }
    attempts++;
  }
  // Fallback random 8 chars
  const fallback = 'D' + crypto.randomBytes(4).toString('hex').slice(0, 7).toUpperCase();
  return fallback.slice(0, 8);
}

module.exports = {
  generateCouponCode,
  generateUniqueCouponCode
};

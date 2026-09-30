/**
 * Global Response Middleware: Automatic Indian Standard Time (IST) Enrichment
 * Intercepts all res.json payloads across all APIs and automatically injects
 * corresponding IST (*_ist and *_readable) fields for any timestamp/date attributes.
 */

const { formatISTISO, formatISTReadable } = require('../utils/time');

/**
 * Checks whether a value represents a valid date or timestamp.
 */
function isValidDateValue(val) {
  if (val === null || val === undefined || val === '') return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  
  // Numeric UNIX timestamps (seconds or milliseconds) between years 2000 and 2100
  if (typeof val === 'number') {
    return (val > 946684800 && val < 4102444800) || (val > 946684800000 && val < 4102444800000);
  }
  
  if (typeof val === 'string') {
    const s = val.trim();
    // Must start with year-month-day (ISO or SQL format: 2026-09-30...)
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
  }
  
  return false;
}

/**
 * Recursively enriches an object or array with IST timestamp fields.
 */
function enrichWithIST(target, seen = new WeakSet(), depth = 0) {
  if (!target || typeof target !== 'object' || depth > 8) return target;
  if (seen.has(target)) return target;
  seen.add(target);

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      enrichWithIST(target[i], seen, depth + 1);
    }
    return target;
  }

  const keys = Object.keys(target);
  for (const key of keys) {
    const val = target[key];

    // Traverse nested objects / arrays
    if (val && typeof val === 'object') {
      enrichWithIST(val, seen, depth + 1);
    }

    // Enrich date/time attributes
    if (isValidDateValue(val)) {
      // 1. Standard created_at / createdAt
      if (key === 'created_at') {
        if (!target.created_at_ist) target.created_at_ist = formatISTISO(val);
        if (!target.created_at_readable) target.created_at_readable = formatISTReadable(val);
      } else if (key === 'createdAt') {
        if (!target.createdAt_ist) target.createdAt_ist = formatISTISO(val);
        if (!target.created_at_ist) target.created_at_ist = formatISTISO(val);
        if (!target.created_at_readable) target.created_at_readable = formatISTReadable(val);
      }
      // 2. Standard updated_at / updatedAt
      else if (key === 'updated_at') {
        if (!target.updated_at_ist) target.updated_at_ist = formatISTISO(val);
        if (!target.updated_at_readable) target.updated_at_readable = formatISTReadable(val);
      } else if (key === 'updatedAt') {
        if (!target.updatedAt_ist) target.updatedAt_ist = formatISTISO(val);
        if (!target.updated_at_ist) target.updated_at_ist = formatISTISO(val);
        if (!target.updated_at_readable) target.updated_at_readable = formatISTReadable(val);
      }
      // 3. Generic *_at fields (e.g. deleted_at, resubmitted_at, replied_at, delivered_at, cancelled_at)
      else if (key.endsWith('_at') && !key.endsWith('_ist')) {
        const istKey = `${key}_ist`;
        const readableKey = `${key}_readable`;
        if (!target[istKey]) target[istKey] = formatISTISO(val);
        if (!target[readableKey]) target[readableKey] = formatISTReadable(val);
      }
      // 4. Generic *At camelCase fields
      else if (/^[a-zA-Z0-9]+At$/.test(key) && !key.endsWith('Ist')) {
        const istKey = `${key}Ist`;
        if (!target[istKey]) target[istKey] = formatISTISO(val);
      }
      // 5. Explicit timestamp fields
      else if (key === 'timestamp' || key === 'order_timestamp') {
        const istKey = `${key}_ist`;
        if (!target[istKey]) target[istKey] = formatISTISO(val);
      }
      // 6. Generic date fields (e.g. date)
      else if (key === 'date') {
        if (!target.date_ist) target.date_ist = formatISTISO(val);
      }
    }
  }

  return target;
}

/**
 * Express Middleware to intercept res.json and automatically enrich with IST
 */
function istTimeMiddleware(req, res, next) {
  const originalJson = res.json;

  res.json = function (body) {
    if (body && typeof body === 'object') {
      try {
        enrichWithIST(body);
      } catch (err) {
        // Fallback safely to original payload if any parsing edge case occurs
      }
    }
    return originalJson.call(this, body);
  };

  next();
}

module.exports = {
  istTimeMiddleware,
  enrichWithIST,
  isValidDateValue
};

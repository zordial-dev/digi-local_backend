const { query } = require('../models/db');

/**
 * Payment Eligibility & Banking Security Service
 * Centralizes vendor banking validation, masking, and payment eligibility calculation
 * across DigiLocal website, mobile applications, and backend APIs.
 */

// Strict Indian IFSC Format: 4 letters, followed by 0, followed by 6 alphanumeric characters
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

// Indian Bank Account Number: Standard length 9 to 18 digits
const ACC_REGEX = /^\d{9,18}$/;

/**
 * Masks a sensitive bank account number (showing only the last 4 digits).
 * Prevents account number leaks in API responses, logs, and frontend payloads.
 * Example: '123456789012' -> '••••••••9012'
 *
 * @param {string|number|null} accountNumber
 * @returns {string} Masked string or empty string
 */
function maskAccountNumber(accountNumber) {
  if (!accountNumber) return '';
  const clean = String(accountNumber).trim();
  if (!clean) return '';
  if (clean.length <= 4) {
    return '•'.repeat(clean.length);
  }
  const last4 = clean.slice(-4);
  const maskedPrefix = '•'.repeat(clean.length - 4);
  return `${maskedPrefix}${last4}`;
}

/**
 * Validates if an IFSC code matches the official RBI pattern.
 *
 * @param {string} ifsc
 * @returns {boolean}
 */
function isValidIfsc(ifsc) {
  if (!ifsc || typeof ifsc !== 'string') return false;
  return IFSC_REGEX.test(ifsc.trim().toUpperCase());
}

/**
 * Validates if a bank account number contains only digits and is between 9 and 18 characters.
 *
 * @param {string|number} acc
 * @returns {boolean}
 */
function isValidAccountNumber(acc) {
  if (!acc) return false;
  const str = String(acc).trim();
  return ACC_REGEX.test(str);
}

/**
 * Validates bank details payload submitted by a vendor during registration or profile update.
 * Note: Bank details are OPTIONAL. If not provided or empty, returns isValid: true, isProvided: false.
 * If provided, strict format validation is enforced.
 *
 * @param {object} payload
 * @returns {{ isValid: boolean, isProvided: boolean, error: string|null, cleaned: object }}
 */
function validateBankDetailsPayload(payload = {}) {
  const rawAcc = payload.account_number || payload.bank_account_number || payload.accountNumber || '';
  const rawIfsc = payload.ifsc_code || payload.ifsc || payload.ifscCode || '';
  const rawHolder = payload.account_holder_name || payload.accountHolderName || '';
  const rawBank = payload.bank_name || payload.bankName || payload.bank || '';

  const cleanAcc = String(rawAcc).trim();
  const cleanIfsc = String(rawIfsc).trim().toUpperCase();
  const cleanHolder = String(rawHolder).trim();
  const cleanBank = String(rawBank).trim();

  // If no bank fields provided or explicitly cleared, bank details are optionally omitted
  const hasAnyBankField = Boolean(cleanAcc || cleanIfsc || cleanHolder || cleanBank);

  if (!hasAnyBankField) {
    const emptyDetails = {
      account_number: null,
      bank_account_number: null,
      ifsc_code: null,
      account_holder_name: null,
      bank_name: null
    };
    return {
      isValid: true,
      isProvided: false,
      hasBankDetails: false,
      error: null,
      errors: [],
      error_code: null,
      code: null,
      cleaned: emptyDetails,
      normalized: emptyDetails
    };
  }

  const errors = [];
  if (!cleanAcc) {
    errors.push('Bank account number is required when submitting bank details.');
  } else if (!isValidAccountNumber(cleanAcc)) {
    errors.push('Invalid bank account number. Account number must be between 9 and 18 numeric digits.');
  }

  if (!cleanIfsc) {
    errors.push('IFSC code is required when submitting bank details.');
  } else if (!isValidIfsc(cleanIfsc)) {
    errors.push('Invalid IFSC code format. IFSC must be 11 characters (e.g. HDFC0001234).');
  }

  if (errors.length > 0) {
    const errObj = {
      account_number: cleanAcc || null,
      bank_account_number: cleanAcc || null,
      ifsc_code: cleanIfsc || null,
      account_holder_name: cleanHolder || null,
      bank_name: cleanBank || null
    };
    return {
      isValid: false,
      isProvided: true,
      hasBankDetails: true,
      error: errors[0],
      errors: errors,
      error_code: 'INVALID_BANK_DETAILS',
      code: 'INVALID_BANK_DETAILS',
      cleaned: errObj,
      normalized: errObj
    };
  }

  const validDetails = {
    account_number: cleanAcc,
    bank_account_number: cleanAcc,
    ifsc_code: cleanIfsc,
    account_holder_name: cleanHolder || null,
    bank_name: cleanBank || null
  };

  return {
    isValid: true,
    isProvided: true,
    hasBankDetails: true,
    error: null,
    errors: [],
    error_code: null,
    code: null,
    cleaned: validDetails,
    normalized: validDetails
  };
}

/**
 * Checks if a vendor's stored bank details meet active eligibility requirements for online payments.
 *
 * @param {object} vendor
 * @returns {boolean}
 */
function isVendorBankDetailsValid(vendor) {
  if (!vendor || typeof vendor !== 'object') return false;

  const acc = vendor.account_number || vendor.bank_account_number;
  const ifsc = vendor.ifsc_code;

  if (!acc || !ifsc) return false;

  // Filter out legacy dummy/placeholder values
  const badPlaceholders = ['abc', '1234', 'null', 'undefined', 'test', '0000'];
  if (badPlaceholders.includes(String(acc).trim().toLowerCase()) || badPlaceholders.includes(String(ifsc).trim().toLowerCase())) {
    return false;
  }

  return isValidAccountNumber(acc) && isValidIfsc(ifsc);
}

/**
 * Calculates payment eligibility for a single vendor.
 *
 * @param {number|string|object} vendorOrId
 * @returns {Promise<{ vendor_id: any, is_online_eligible: boolean, bank_details_configured: boolean, eligible_methods: string[], default_method: string, reason: string }>}
 */
async function getVendorPaymentEligibility(vendorOrId) {
  let vendor = null;

  if (vendorOrId && typeof vendorOrId === 'object' && (vendorOrId.vendor_id || vendorOrId.account_number !== undefined)) {
    vendor = vendorOrId;
  } else if (vendorOrId) {
    const isNum = !isNaN(Number(vendorOrId));
    const vRes = await query(
      `SELECT vendor_id, vendor_name, store_name, account_number, bank_account_number, ifsc_code, status
       FROM vendors
       WHERE vendor_id = ? OR public_id = ?`,
      [isNum ? Number(vendorOrId) : -1, String(vendorOrId)]
    ).catch(() => ({ rows: [] }));

    if (vRes.rows && vRes.rows.length > 0) {
      vendor = vRes.rows[0];
    }
  }

  if (!vendor) {
    return {
      vendor_id: vendorOrId || null,
      bank_details_configured: false,
      is_online_eligible: false,
      eligible_methods: ['COD'],
      default_method: 'COD',
      reason: 'Vendor not found or inactive. Online payments are unavailable.'
    };
  }

  const hasValidBankDetails = isVendorBankDetailsValid(vendor);

  if (hasValidBankDetails) {
    return {
      vendor_id: vendor.vendor_id,
      bank_details_configured: true,
      is_online_eligible: true,
      eligible_methods: ['COD', 'ONLINE'],
      default_method: 'COD', // COD remains available; customers can select either
      reason: 'Vendor has valid, verified bank details configured. Both Online Payment and Cash on Delivery (COD) are enabled.'
    };
  } else {
    return {
      vendor_id: vendor.vendor_id,
      bank_details_configured: false,
      is_online_eligible: false,
      eligible_methods: ['COD'],
      default_method: 'COD',
      reason: 'Vendor has not configured valid bank details. Online payment is unavailable. Orders must be placed using Cash on Delivery (COD).'
    };
  }
}

/**
 * Centralized payment eligibility checker for Orders, Cart Checkouts, and Payment Gateway initiation.
 * Handles single-vendor and multi-vendor orders.
 *
 * Rule: For multi-vendor carts, ALL vendors must have valid bank details to enable online payments.
 * If ANY vendor in an order lacks bank details, online payment is disabled for the entire order
 * to prevent settlement and escrow failures.
 *
 * @param {object} param0
 * @param {number|string} [param0.vendor_id]
 * @param {number|string} [param0.order_id]
 * @param {Array} [param0.items]
 * @returns {Promise<object>}
 */
async function checkOrderPaymentEligibility({ vendor_id, order_id, items = [] } = {}) {
  const vendorIds = new Set();

  if (vendor_id) {
    vendorIds.add(Number(vendor_id));
  }

  // If order_id is provided, fetch order details to inspect associated vendor
  if (order_id) {
    const oRes = await query(`SELECT vendor_id, items FROM orders WHERE order_id = ?`, [order_id]).catch(() => ({ rows: [] }));
    if (oRes.rows && oRes.rows.length > 0) {
      const ord = oRes.rows[0];
      if (ord.vendor_id) vendorIds.add(Number(ord.vendor_id));
      if (Array.isArray(ord.items)) {
        for (const itm of ord.items) {
          if (itm && itm.vendor_id) vendorIds.add(Number(itm.vendor_id));
        }
      }
    }
  }

  // Inspect cart/items if provided
  if (Array.isArray(items) && items.length > 0) {
    for (const itm of items) {
      if (itm && itm.vendor_id) {
        vendorIds.add(Number(itm.vendor_id));
      }
    }
  }

  // If no vendor found
  if (vendorIds.size === 0) {
    return {
      is_online_eligible: false,
      eligible_methods: ['COD'],
      default_method: 'COD',
      reason: 'No vendor identified for this checkout. Defaulting to Cash on Delivery (COD).',
      vendors_checked: []
    };
  }

  const vendorList = Array.from(vendorIds).filter(id => !isNaN(id) && id > 0);
  const vendorStatuses = [];
  let allEligible = true;
  const ineligibleVendors = [];

  for (const vId of vendorList) {
    const elig = await getVendorPaymentEligibility(vId);
    vendorStatuses.push(elig);
    if (!elig.is_online_eligible) {
      allEligible = false;
      ineligibleVendors.push(vId);
    }
  }

  if (allEligible) {
    return {
      is_online_eligible: true,
      eligible_methods: ['COD', 'ONLINE'],
      default_method: 'COD',
      reason: 'All vendors associated with this order have valid bank details configured.',
      mixed_vendor_order: vendorList.length > 1,
      vendors_checked: vendorStatuses
    };
  } else {
    const isMixed = vendorList.length > 1;
    const reasonMsg = isMixed
      ? `This order contains items from multiple vendors. Vendor(s) #${ineligibleVendors.join(', #')} have not configured valid bank details. Under DigiLocal multi-vendor settlement architecture, online payment cannot be accepted for mixed orders unless all participating vendors have valid bank details. Please proceed with Cash on Delivery (COD).`
      : `Online payment is not available for this vendor because verified bank account details have not been configured. Please proceed with Cash on Delivery (COD).`;

    return {
      is_online_eligible: false,
      eligible_methods: ['COD'],
      default_method: 'COD',
      reason: reasonMsg,
      mixed_vendor_order: isMixed,
      ineligible_vendor_ids: ineligibleVendors,
      vendors_checked: vendorStatuses
    };
  }
}

module.exports = {
  IFSC_REGEX,
  ACC_REGEX,
  maskAccountNumber,
  isValidIfsc,
  isValidAccountNumber,
  validateBankDetailsPayload,
  isVendorBankDetailsValid,
  getVendorPaymentEligibility,
  checkOrderPaymentEligibility
};

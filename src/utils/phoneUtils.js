/**
 * Phone Number Formatting & Country Code (+91) Helper Module
 */

/**
 * Extracts clean 10-digit national number from any phone input.
 * e.g. "+91 95712 40742" -> "9571240742", "09571240742" -> "9571240742"
 */
function get10DigitPhone(rawPhone) {
  if (!rawPhone) return '';
  const digits = String(rawPhone).replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Formats any raw phone input strictly with "+91" country code.
 * e.g. "9571240742" -> "+919571240742"
 */
function formatPhoneWithCountryCode(rawPhone) {
  const digits = get10DigitPhone(rawPhone);
  if (!digits) return '';
  return `+91${digits}`;
}

/**
 * Generates standardized phone payload object containing ONLY two fields:
 * - country_code: "+91"
 * - phone_number: "9571240742"
 */
function getPhonePayload(rawPhone) {
  const digits = get10DigitPhone(rawPhone);
  return {
    country_code: '+91',
    phone_number: digits
  };
}

module.exports = {
  get10DigitPhone,
  formatPhoneWithCountryCode,
  getPhonePayload
};

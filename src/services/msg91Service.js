'use strict';
const axios = require('axios');

const MSG91_AUTH_KEY = (process.env.MSG91_AUTH_KEY || '').trim();
const MSG91_TEMPLATE_ID = (process.env.MSG91_TEMPLATE_ID || '').trim();
const MSG91_SENDER_ID = (process.env.MSG91_SENDER_ID || 'DIGILC').trim();
const MSG91_OTP_EXPIRY = Number(process.env.MSG91_OTP_EXPIRY) || 5;
const MSG91_OTP_LENGTH = Number(process.env.MSG91_OTP_LENGTH) || 6;

/**
 * Normalizes phone number to standard format with country code (defaults to 91 for India).
 * @param {string} phone - Mobile number
 * @param {string} [countryCode] - Optional country code (e.g., '91', '+91', '1')
 */
function formatPhone(phone, countryCode) {
  let cleaned = String(phone).replace(/\D/g, '');
  let cc = String(countryCode || '').replace(/\D/g, '');
  if (!cc) cc = '91';

  if (cleaned.length === 10) {
    cleaned = cc + cleaned;
  }
  return cleaned;
}

/**
 * Sends OTP to a given mobile number using MSG91 v5 API.
 * @param {string} phone - Mobile number
 * @param {string} [countryCode] - Optional country code (e.g. '91', '+91')
 * @returns {Promise<Object>} Response object from MSG91 or simulation result
 */
async function sendOTP(phone, countryCode) {
  try {
    const formattedPhone = formatPhone(phone, countryCode);

    // Development/Simulation mode if auth key is missing or set to dummy
    if (!MSG91_AUTH_KEY || MSG91_AUTH_KEY.startsWith('dummy_')) {
      console.log(`[MSG91 SIMULATION] OTP send requested for ${formattedPhone}. (Auth key not configured)`);
      return {
        type: 'success',
        message: 'OTP sent successfully (Simulated mode)',
        mobile: formattedPhone
      };
    }

    const response = await axios.post(
      'https://control.msg91.com/api/v5/otp',
      {
        template_id: MSG91_TEMPLATE_ID,
        mobile: formattedPhone,
        otp_length: MSG91_OTP_LENGTH,
        otp_expiry: MSG91_OTP_EXPIRY
      },
      {
        headers: {
          authkey: MSG91_AUTH_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('MSG91 Send OTP Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'Failed to send OTP via MSG91');
  }
}

/**
 * Verifies OTP submitted by user using MSG91 v5 API.
 * @param {string} phone - Mobile number
 * @param {string} otp - OTP code entered by user
 * @param {string} [countryCode] - Optional country code (e.g. '91', '+91')
 * @returns {Promise<Object>} Response object from MSG91 or simulation result
 */
async function verifyOTP(phone, otp, countryCode) {
  try {
    const formattedPhone = formatPhone(phone, countryCode);

    // Development/Simulation mode if auth key is missing or set to dummy
    if (!MSG91_AUTH_KEY || MSG91_AUTH_KEY.startsWith('dummy_')) {
      console.log(`[MSG91 SIMULATION] OTP verification requested for ${formattedPhone} with OTP ${otp}`);
      if (otp === '123456' || otp === '999999') {
        return {
          type: 'success',
          message: 'OTP verified successfully (Simulated mode)',
          mobile: formattedPhone
        };
      }
      return {
        type: 'success',
        message: 'OTP verified successfully (Simulated mode)',
        mobile: formattedPhone
      };
    }

    const response = await axios.post(
      'https://control.msg91.com/api/v5/otp/verify',
      {
        mobile: formattedPhone,
        otp: otp
      },
      {
        headers: {
          authkey: MSG91_AUTH_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('MSG91 Verify OTP Error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.message || 'OTP verification failed via MSG91');
  }
}

module.exports = {
  formatPhone,
  sendOTP,
  verifyOTP
};

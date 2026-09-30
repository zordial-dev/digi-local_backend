'use strict';

/**
 * Progressive OTP Resend Cooldown Manager
 * Implements exponential backoff for OTP requests:
 * 1st OTP: wait 10 seconds
 * 2nd OTP: wait 20 seconds
 * 3rd OTP: wait 40 seconds
 * 4th OTP: wait 80 seconds
 * ... (formula: 10 * 2^(attempts - 1))
 */

// In-memory store: Map<cleanId, { attempts: number, lastSentAt: number, cooldownSeconds: number, nextAllowedAt: number }>
const cooldownStore = new Map();

// Base cooldown in seconds
const BASE_COOLDOWN_SECONDS = 10;
// Maximum cooldown ceiling in seconds (5 minutes)
const MAX_COOLDOWN_SECONDS = 300;
// Memory cleanup TTL (15 minutes of inactivity resets attempt history)
const STORE_TTL_MS = 15 * 60 * 1000;

/**
 * Normalizes identifier to clean phone digits or lowercase email.
 */
function normalizeIdentifier(rawId) {
  if (!rawId) return '';
  const str = String(rawId).trim();
  if (str.includes('@')) return str.toLowerCase();
  const digits = str.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Calculates cooldown duration for a given attempt index (1-based).
 * Attempt 1 -> 10s
 * Attempt 2 -> 20s
 * Attempt 3 -> 40s
 * Attempt 4 -> 80s
 */
function calculateCooldown(attemptCount) {
  const count = Math.max(1, attemptCount);
  const seconds = BASE_COOLDOWN_SECONDS * Math.pow(2, count - 1);
  return Math.min(seconds, MAX_COOLDOWN_SECONDS);
}

/**
 * Checks if an identifier is currently rate-limited by OTP cooldown.
 * @param {string} rawId - Phone number or email
 * @returns {{ allowed: boolean, retryAfter: number, cooldownSeconds: number, attempt: number }}
 */
function checkCooldown(rawId) {
  const cleanId = normalizeIdentifier(rawId);
  if (!cleanId) return { allowed: true, retryAfter: 0, cooldownSeconds: BASE_COOLDOWN_SECONDS, attempt: 0 };

  const entry = cooldownStore.get(cleanId);
  const now = Date.now();

  // If no previous record or record has expired beyond cleanup TTL
  if (!entry || (now - entry.lastSentAt > STORE_TTL_MS)) {
    if (entry) cooldownStore.delete(cleanId);
    return {
      allowed: true,
      retryAfter: 0,
      cooldownSeconds: BASE_COOLDOWN_SECONDS,
      attempt: 0
    };
  }

  // Active cooldown check
  if (now < entry.nextAllowedAt) {
    const remainingMs = entry.nextAllowedAt - now;
    const retryAfter = Math.ceil(remainingMs / 1000);
    return {
      allowed: false,
      retryAfter,
      cooldownSeconds: entry.cooldownSeconds,
      attempt: entry.attempts
    };
  }

  return {
    allowed: true,
    retryAfter: 0,
    cooldownSeconds: entry.cooldownSeconds,
    attempt: entry.attempts
  };
}

/**
 * Records that an OTP was successfully sent.
 * Advances attempt counter and sets the exponential cooldown.
 * @param {string} rawId - Phone number or email
 * @returns {{ cooldownSeconds: number, retryAfter: number, attempt: number, nextAllowedAt: number }}
 */
function recordOtpSent(rawId) {
  const cleanId = normalizeIdentifier(rawId);
  if (!cleanId) return { cooldownSeconds: BASE_COOLDOWN_SECONDS, retryAfter: BASE_COOLDOWN_SECONDS, attempt: 1 };

  const now = Date.now();
  const entry = cooldownStore.get(cleanId);

  let newAttempts = 1;
  if (entry && (now - entry.lastSentAt <= STORE_TTL_MS)) {
    newAttempts = entry.attempts + 1;
  }

  const cooldownSeconds = calculateCooldown(newAttempts);
  const nextAllowedAt = now + (cooldownSeconds * 1000);

  cooldownStore.set(cleanId, {
    attempts: newAttempts,
    lastSentAt: now,
    cooldownSeconds,
    nextAllowedAt
  });

  return {
    cooldownSeconds,
    retryAfter: cooldownSeconds,
    attempt: newAttempts,
    nextAllowedAt
  };
}

/**
 * Clears the cooldown entry upon successful verification, login, or registration.
 * @param {string} rawId - Phone number or email
 */
function resetCooldown(rawId) {
  const cleanId = normalizeIdentifier(rawId);
  if (cleanId) {
    cooldownStore.delete(cleanId);
  }
}

/**
 * Returns current cooldown status without modifying counters.
 */
function getCooldownStatus(rawId) {
  const cleanId = normalizeIdentifier(rawId);
  const now = Date.now();
  const entry = cooldownStore.get(cleanId);

  if (!entry || (now - entry.lastSentAt > STORE_TTL_MS)) {
    return {
      active: false,
      retryAfter: 0,
      nextCooldownSeconds: BASE_COOLDOWN_SECONDS,
      currentAttempt: 0
    };
  }

  const remainingMs = Math.max(0, entry.nextAllowedAt - now);
  const retryAfter = Math.ceil(remainingMs / 1000);

  return {
    active: retryAfter > 0,
    retryAfter,
    currentCooldownSeconds: entry.cooldownSeconds,
    nextCooldownSeconds: calculateCooldown(entry.attempts + 1),
    currentAttempt: entry.attempts
  };
}

module.exports = {
  checkCooldown,
  recordOtpSent,
  resetCooldown,
  getCooldownStatus,
  calculateCooldown,
  BASE_COOLDOWN_SECONDS
};

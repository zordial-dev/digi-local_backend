/**
 * Authentication and Authorization Configuration
 */
module.exports = {
  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_jwt_secret_for_local_development_only'),
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev_refresh_token_secret_for_local_development_only'),
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '90d'
  },

  // Password Security Policy (scrypt parameters)
  password: {
    saltBytes: 16,
    keyLen: 64,
    minPasswordLength: 6
  },

  // Brute-force & Account Lockout Policy
  lockout: {
    maxFailedAttempts: 5,
    lockoutDurationMs: 15 * 60 * 1000 // 15 minutes
  },

  // OTP Configuration
  otp: {
    digits: 6,
    ttlMs: 10 * 60 * 1000, // 10 minutes
    maxAttempts: 3
  }
};

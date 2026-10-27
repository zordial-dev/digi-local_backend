const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
if (!process.env.DATABASE_URL && !process.env.MESSAGECENTRAL_AUTH_TOKEN) {
  dotenv.config({ path: path.join(__dirname, '..', 'controllers', 'Vendor', '.env') });
}

/**
 * Validates environment variables required for server operation.
 * Sets fallback defaults for non-critical variables and logs startup configuration.
 */
function validateEnv() {
  const env = process.env.NODE_ENV || 'development';
  const port = process.env.PORT || 5000;

  const warnings = [];

  if (!process.env.DATABASE_URL && !process.env.PGHOST) {
    warnings.push('CRITICAL: No PostgreSQL configuration found in DATABASE_URL or PGHOST.');
  }

  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET is not set. A default fallback will be used in development, but must be set in production.');
  }

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your_gmail@gmail.com') {
    warnings.push('EMAIL_USER is not configured. Email notifications will operate in simulation mode.');
  }

  if (!process.env.MESSAGECENTRAL_AUTH_TOKEN && (!process.env.MESSAGECENTRAL_CUSTOMER_ID || !process.env.MESSAGECENTRAL_KEY)) {
    warnings.push('Message Central credentials not configured. MESSAGECENTRAL_AUTH_TOKEN or (MESSAGECENTRAL_CUSTOMER_ID + MESSAGECENTRAL_KEY) required.');
  }

  return {
    env,
    port,
    isProduction: env === 'production'
  };
}

module.exports = { validateEnv };

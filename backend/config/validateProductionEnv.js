/**
 * Fail fast in production on unsafe or incomplete configuration.
 */
function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const errors = [];

  const cors = String(process.env.CORS_ORIGIN || '').trim();
  if (!cors) {
    errors.push(
      'CORS_ORIGIN must be set in production (comma-separated browser origins for the SPA).'
    );
  }

  if (String(process.env.OTP_ECHO_TO_CLIENT || '').toLowerCase() === 'true') {
    errors.push('OTP_ECHO_TO_CLIENT must not be true in production.');
  }

  if (errors.length) {
    const { error } = require('../utils/logger');
    error('[Learn2Hire] Refusing to start — production configuration errors', {
      errors,
    });
    process.exit(1);
  }
}

module.exports = { validateProductionEnv };

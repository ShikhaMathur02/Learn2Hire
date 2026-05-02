/**
 * JWT secret resolution. Production requires a strong JWT_SECRET in backend/.env.
 */
function getJwtSecret() {
  const raw = process.env.JWT_SECRET;
  const trimmed = raw != null ? String(raw).trim() : '';
  const isProd = process.env.NODE_ENV === 'production';

  if (trimmed.length >= 32) return trimmed;

  if (isProd) {
    throw new Error(
      'JWT_SECRET must be set in production to a random string of at least 32 characters (backend/.env).'
    );
  }

  if (trimmed.length > 0) {
    console.warn(
      '[Learn2Hire] JWT_SECRET is shorter than 32 characters — acceptable for local dev only.'
    );
    return trimmed;
  }

  console.warn(
    '[Learn2Hire] JWT_SECRET not set — using insecure development default. Set JWT_SECRET before any shared/staging environment.'
  );
  return 'learn2hire-dev-insecure-change-me';
}

module.exports = { getJwtSecret };

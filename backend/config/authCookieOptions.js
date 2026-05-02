/** HttpOnly cookie name for JWT access token (not readable from JS). */
const AUTH_COOKIE_NAME = 'l2h_at';

/** Match JWT expiresIn: 7d */
const AUTH_COOKIE_MAX_MS = 7 * 24 * 60 * 60 * 1000;

module.exports = { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_MS };

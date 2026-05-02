const { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_MS } = require('./authCookieOptions');

/**
 * Attach httpOnly session cookie (JWT). Call on successful login.
 */
function attachAuthCookie(res, jwt) {
  res.cookie(AUTH_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_MS,
  });
}

/**
 * Clear session cookie (logout).
 */
function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
}

module.exports = { attachAuthCookie, clearAuthCookie };

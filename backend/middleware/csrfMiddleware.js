const crypto = require('crypto');
const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require('../config/csrfOptions');

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function timingSafeEqualStrings(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  try {
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

function issueCsrfCookie(res) {
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return token;
}

function clearCsrfCookie(res) {
  res.clearCookie(CSRF_COOKIE_NAME, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

/**
 * Require header === cookie for mutating /api requests (browser sends cookie automatically).
 */
function apiCsrfProtection(req, res, next) {
  const method = String(req.method || 'GET').toUpperCase();
  if (method === 'OPTIONS') {
    return next();
  }
  if (!MUTATING.has(method)) {
    return next();
  }

  const cookieTok = req.cookies && req.cookies[CSRF_COOKIE_NAME];
  const headerTok = req.headers[CSRF_HEADER_NAME];

  if (!timingSafeEqualStrings(String(headerTok || ''), String(cookieTok || ''))) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token. Refresh the page and try again.',
    });
  }

  return next();
}

module.exports = {
  issueCsrfCookie,
  clearCsrfCookie,
  apiCsrfProtection,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};

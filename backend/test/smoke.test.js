const test = require('node:test');
const assert = require('node:assert/strict');
const { AUTH_COOKIE_NAME } = require('../config/authCookieOptions');
const { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } = require('../config/csrfOptions');

test('auth session cookie name is stable', () => {
  assert.equal(AUTH_COOKIE_NAME, 'l2h_at');
});

test('logger info emits without throwing', () => {
  const logger = require('../utils/logger');
  assert.doesNotThrow(() => {
    logger.info('test_message', { suite: 'smoke' });
  });
});

test('csrf middleware blocks mutating request without matching token', () => {
  const { apiCsrfProtection } = require('../middleware/csrfMiddleware');
  let nextCalled = false;
  let statusCode;
  const req = {
    method: 'POST',
    originalUrl: '/api/auth/login',
    cookies: { [CSRF_COOKIE_NAME]: 'aaa' },
    headers: {},
  };
  const res = {
    status(c) {
      statusCode = c;
      return this;
    },
    json() {},
  };
  apiCsrfProtection(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(statusCode, 403);
});

test('csrf middleware allows mutating request when header matches cookie', () => {
  const { apiCsrfProtection } = require('../middleware/csrfMiddleware');
  let nextCalled = false;
  const token = 'a'.repeat(64);
  const req = {
    method: 'POST',
    originalUrl: '/api/auth/login',
    cookies: { [CSRF_COOKIE_NAME]: token },
    headers: { [CSRF_HEADER_NAME]: token },
  };
  const res = {
    status() {
      return this;
    },
    json() {},
  };
  apiCsrfProtection(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

/** Double-submit CSRF: readable cookie + matching header on mutating requests (pairs with httpOnly session cookie). */
const CSRF_COOKIE_NAME = 'l2h_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

module.exports = { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };

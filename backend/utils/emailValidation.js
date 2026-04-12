/** Same shape as frontend auth forms — basic RFC‑style sanity check. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function isValidEmail(email) {
  const v = typeof email === 'string' ? email.trim() : '';
  return v.length > 0 && EMAIL_PATTERN.test(v);
}

module.exports = {
  EMAIL_PATTERN,
  normalizeEmail,
  isValidEmail,
};

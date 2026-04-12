/** Fixed platform administrators (not creatable via signup). */
const BUILTIN_ADMIN_ACCOUNTS = [
  { email: 'admin1@gmail.com', name: 'Admin One' },
  { email: 'admin2@gmail.com', name: 'Admin Two' },
];

const BUILTIN_ADMIN_PASSWORD = 'Admin@123';

function normalizeAdminEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isBuiltinAdminEmail(email) {
  const e = normalizeAdminEmail(email);
  return BUILTIN_ADMIN_ACCOUNTS.some((a) => a.email === e);
}

module.exports = {
  BUILTIN_ADMIN_ACCOUNTS,
  BUILTIN_ADMIN_PASSWORD,
  normalizeAdminEmail,
  isBuiltinAdminEmail,
};

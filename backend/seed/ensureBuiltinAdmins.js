const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  BUILTIN_ADMIN_ACCOUNTS,
  BUILTIN_ADMIN_PASSWORD,
  normalizeAdminEmail,
} = require('../config/builtinAdmins');

/**
 * Upserts the two built-in admin accounts with the configured password.
 */
async function ensureBuiltinAdmins() {
  for (const { email, name } of BUILTIN_ADMIN_ACCOUNTS) {
    const normalized = normalizeAdminEmail(email);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(BUILTIN_ADMIN_PASSWORD, salt);

    await User.findOneAndUpdate(
      { email: normalized },
      {
        $set: {
          name,
          email: normalized,
          password: hashedPassword,
          role: 'admin',
        },
      },
      { upsert: true }
    );
  }
}

module.exports = { ensureBuiltinAdmins };

const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { BUILTIN_ADMIN_ACCOUNTS, normalizeAdminEmail } = require('../config/builtinAdmins');

/**
 * Resolves Mongo user ids for platform admins (in-app notification recipients).
 * Prefers role: admin; falls back to built-in admin emails if the role query is empty.
 */
async function getAdminRecipientIds() {
  const roleAdmins = await User.find({ role: 'admin' }).select('_id').lean();
  if (roleAdmins.length) {
    return roleAdmins.map((u) => u._id);
  }

  const emails = BUILTIN_ADMIN_ACCOUNTS.map((a) => normalizeAdminEmail(a.email)).filter(Boolean);
  if (!emails.length) return [];

  const byEmail = await User.find({ email: { $in: emails }, role: 'admin' }).select('_id').lean();
  return byEmail.map((u) => u._id);
}

/** Notify every platform admin (same shape as createBulkNotifications, without recipientIds). */
async function notifyPlatformAdmins(payload) {
  let recipientIds = await getAdminRecipientIds();
  if (!recipientIds.length) {
    const { ensureBuiltinAdmins } = require('../seed/ensureBuiltinAdmins');
    await ensureBuiltinAdmins();
    recipientIds = await getAdminRecipientIds();
  }
  if (!recipientIds.length) {
    console.warn(
      '[Learn2Hire] notifyPlatformAdmins: no admin users in DB — check config/builtinAdmins.js and MongoDB connectivity.'
    );
    return [];
  }
  return createBulkNotifications({ ...payload, recipientIds });
}

const createNotification = async ({
  recipient,
  title,
  message,
  category = 'system',
  type = 'general',
  actionUrl = '',
  metadata = {},
}) => {
  if (!recipient || !title || !message) return null;

  return Notification.create({
    recipient,
    title,
    message,
    category,
    type,
    actionUrl,
    metadata,
  });
};

const createBulkNotifications = async ({
  recipientIds = [],
  title,
  message,
  category = 'system',
  type = 'general',
  actionUrl = '',
  metadata = {},
}) => {
  const uniqueRecipients = [...new Set(recipientIds.map((id) => String(id)).filter(Boolean))];

  if (!uniqueRecipients.length || !title || !message) {
    return [];
  }

  const payload = uniqueRecipients.map((recipient) => ({
    recipient: new mongoose.Types.ObjectId(recipient),
    title,
    message,
    category,
    type,
    actionUrl,
    metadata,
  }));

  return Notification.insertMany(payload);
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getAdminRecipientIds,
  notifyPlatformAdmins,
};

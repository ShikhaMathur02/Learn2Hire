const Notification = require('../models/Notification');

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
    recipient,
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
};

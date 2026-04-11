const express = require('express');

const {
  getMyNotifications,
  getUnreadCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.get('/', getMyNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', markNotificationAsRead);

module.exports = router;

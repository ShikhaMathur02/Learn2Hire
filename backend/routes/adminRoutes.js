const express = require('express');
const multer = require('multer');

const {
  getAnalytics,
  importStudentsFromSheet,
  getPlatformInsights,
  getUsers,
  updateUserRole,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/analytics', getAnalytics);
router.get('/insights', getPlatformInsights);
router.post('/students/import', upload.single('file'), importStudentsFromSheet);
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);

module.exports = router;

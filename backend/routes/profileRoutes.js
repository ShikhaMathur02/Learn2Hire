const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  createProfile,
  updateProfile,
  updateSkills,
} = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// All profile routes require valid JWT
router.use(protect);

router.get('/', getMyProfile);
router.post('/', createProfile);
router.put('/', updateProfile);
router.patch('/skills', updateSkills);

module.exports = router;

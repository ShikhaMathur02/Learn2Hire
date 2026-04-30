const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getMyProfile,
  createProfile,
  updateProfile,
  updateSkills,
} = require('../controllers/profileController');
const { getProfileSummaryForViewer } = require('../controllers/profileSummaryController');
const {
  uploadMyProfilePhoto,
  deleteMyProfilePhoto,
} = require('../controllers/userAvatarController');
const { protect } = require('../middleware/authMiddleware');

/** Keep in sync with frontend `PROFILE_PHOTO_MAX_BYTES` in `avatarUtils.js`. */
const PROFILE_PHOTO_MAX_BYTES = 25 * 1024 * 1024;

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PROFILE_PHOTO_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed.'));
  },
});

// All profile routes require valid JWT
router.use(protect);

router.get('/summary/:userId', getProfileSummaryForViewer);
router.get('/', getMyProfile);
router.post('/photo', (req, res, next) => {
  avatarUpload.single('photo')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Profile photo must be 25 MB or smaller.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid upload.',
      });
    }
    next();
  });
}, uploadMyProfilePhoto);
router.delete('/photo', deleteMyProfilePhoto);

router.post('/', createProfile);
router.put('/', updateProfile);
router.patch('/skills', updateSkills);

module.exports = router;

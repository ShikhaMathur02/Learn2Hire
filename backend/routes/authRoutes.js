const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  requestSignupOtp,
  verifySignupOtp,
  listApprovedColleges,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.get('/approved-colleges', listApprovedColleges);
router.post('/request-signup-otp', requestSignupOtp);
router.post('/verify-signup-otp', verifySignupOtp);
router.post('/request-password-reset-otp', requestPasswordResetOtp);
router.post('/verify-password-reset-otp', verifyPasswordResetOtp);
router.post('/reset-password', resetPassword);
router.post('/signup', signup);
router.post('/login', login);

// Protected route: requires valid JWT in Authorization header
router.get('/me', protect, getMe);

module.exports = router;

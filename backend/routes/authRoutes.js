const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const {
  signup,
  login,
  logout,
  getMe,
  patchCompanyProfile,
  requestSignupOtp,
  verifySignupOtp,
  listApprovedColleges,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
} = require('../controllers/authController');
const { getCsrfToken } = require('../controllers/csrfController');
const { protect } = require('../middleware/authMiddleware');

const authStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_PER_15MIN || 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this device. Please try again in a few minutes.',
  },
});

router.get('/csrf-token', getCsrfToken);
router.post('/logout', logout);
router.get('/approved-colleges', listApprovedColleges);
router.post('/request-signup-otp', authStrictLimiter, requestSignupOtp);
router.post('/verify-signup-otp', authStrictLimiter, verifySignupOtp);
router.post('/request-password-reset-otp', authStrictLimiter, requestPasswordResetOtp);
router.post('/verify-password-reset-otp', authStrictLimiter, verifyPasswordResetOtp);
router.post('/reset-password', authStrictLimiter, resetPassword);
router.post('/signup', authStrictLimiter, signup);
router.post('/login', authStrictLimiter, login);

// Protected route: requires valid JWT in Authorization header
router.get('/me', protect, getMe);
router.patch('/me/company', protect, patchCompanyProfile);

module.exports = router;

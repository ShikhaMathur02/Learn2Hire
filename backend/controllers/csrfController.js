const { issueCsrfCookie } = require('../middleware/csrfMiddleware');

// @desc    Issue CSRF cookie + token (call once per browser session / after hard refresh)
// @route   GET /api/auth/csrf-token
// @access  Public
exports.getCsrfToken = (req, res) => {
  try {
    const csrfToken = issueCsrfCookie(res);
    res.status(200).json({ success: true, csrfToken });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Could not issue security token.',
    });
  }
};

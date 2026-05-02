/**
 * Use after `protect`. Ensures req.user is a platform admin.
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Only admin users can access this resource.',
    });
  }
  return next();
}

module.exports = { requireAdmin };

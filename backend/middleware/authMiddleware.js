const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isBuiltinAdminEmail } = require('../config/builtinAdmins');
const { isPlatformApprovalBlockingApi } = require('../utils/platformApproval');

/**
 * Protects routes by verifying the JWT token.
 * Expects: Authorization: Bearer <token>
 * On success: sets req.user to the logged-in user and calls next().
 * On failure: sends 401 and does not call next().
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'learn2hire-secret'
    );

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Token invalid.',
      });
    }

    const role = String(user.role || '')
      .trim()
      .toLowerCase();
    if (role === 'faculty') {
      const st = user.facultyApprovalStatus;
      if (st === 'pending' || st === 'rejected') {
        const url = String(req.originalUrl || '');
        const allowedWhilePending =
          url.startsWith('/api/auth/me') || url.startsWith('/api/profile/photo');
        if (!allowedWhilePending) {
          return res.status(403).json({
            success: false,
            message:
              st === 'pending'
                ? 'Your faculty account is awaiting approval from your college or a Learn2Hire administrator.'
                : 'Your faculty account was not approved. Contact your college or support for help.',
          });
        }
      }
    }

    if (role === 'company') {
      if (isPlatformApprovalBlockingApi(user)) {
        const url = String(req.originalUrl || '');
        const allowedWhilePending =
          url.startsWith('/api/auth/me') || url.startsWith('/api/profile/photo');
        if (!allowedWhilePending) {
          const pst = user.platformApprovalStatus;
          return res.status(403).json({
            success: false,
            message:
              pst === 'pending'
                ? 'Your company account is awaiting approval from a Learn2Hire administrator.'
                : 'Your company registration was not approved. Contact support for help.',
          });
        }
      }
    }

    if (role === 'college') {
      const cst = user.collegeApprovalStatus;
      if (cst === 'pending' || cst === 'rejected') {
        const url = String(req.originalUrl || '');
        if (!url.startsWith('/api/auth/me')) {
          return res.status(403).json({
            success: false,
            message:
              cst === 'pending'
                ? 'Your college account is awaiting approval from a Learn2Hire administrator.'
                : 'Your college account was not approved. Contact support for help.',
          });
        }
      }
    }

    if (role === 'admin' && !isBuiltinAdminEmail(user.email)) {
      const url = String(req.originalUrl || '');
      if (!url.startsWith('/api/auth/me')) {
        return res.status(403).json({
          success: false,
          message:
            'This administrator session is not valid. Sign in with an authorized admin account.',
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Token invalid or expired.',
    });
  }
};

/**
 * If Authorization: Bearer <token> is present and valid, sets req.user.
 * Otherwise continues without error (for public routes that filter by role/cohort).
 */
const optionalProtect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'learn2hire-secret'
    );

    const user = await User.findById(decoded.id);
    if (user) {
      const role = String(user.role || '')
        .trim()
        .toLowerCase();
      if (role === 'faculty') {
        const st = user.facultyApprovalStatus;
        if (st === 'pending' || st === 'rejected') {
          req.user = undefined;
        } else {
          req.user = user;
        }
      } else if (role === 'college') {
        const cst = user.collegeApprovalStatus;
        if (cst === 'pending' || cst === 'rejected') {
          req.user = undefined;
        } else {
          req.user = user;
        }
      } else if (role === 'company') {
        if (isPlatformApprovalBlockingApi(user)) {
          req.user = undefined;
        } else {
          req.user = user;
        }
      } else {
        req.user = user;
      }
    }
  } catch (err) {
    // Invalid or expired token — treat as anonymous for these routes
  }

  next();
};

module.exports = { protect, optionalProtect };

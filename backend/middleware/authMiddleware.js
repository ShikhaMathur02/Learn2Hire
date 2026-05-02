const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../config/secrets');
const { isBuiltinAdminEmail } = require('../config/builtinAdmins');
const { isPlatformApprovalBlockingApi } = require('../utils/platformApproval');
const { isStudentCampusAccessBlocked } = require('../utils/campusApproval');

const { AUTH_COOKIE_NAME } = require('../config/authCookieOptions');

/**
 * Read JWT from httpOnly cookie first, then Authorization: Bearer (legacy clients).
 */
function getTokenFromRequest(req) {
  const fromCookie = req.cookies && req.cookies[AUTH_COOKIE_NAME];
  if (fromCookie && String(fromCookie).trim()) {
    return String(fromCookie).trim();
  }
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    return req.headers.authorization.split(' ')[1];
  }
  return null;
}

/**
 * Protects routes by verifying the JWT token.
 * Uses httpOnly cookie (preferred) or Authorization: Bearer.
 * On success: sets req.user to the logged-in user and calls next().
 * On failure: sends 401 and does not call next().
 */
const protect = async (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. Sign in to continue.',
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

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

    if (role === 'student') {
      if (isStudentCampusAccessBlocked(user)) {
        const url = String(req.originalUrl || '');
        const allowedWhilePending =
          url.startsWith('/api/auth/me') || url.startsWith('/api/profile/photo');
        if (!allowedWhilePending) {
          const st = user.studentCampusApprovalStatus;
          return res.status(403).json({
            success: false,
            message:
              st === 'pending'
                ? 'Your student account is awaiting approval from your campus (college or faculty) or a Learn2Hire administrator.'
                : 'Your student registration was not approved. Contact your campus or support for help.',
          });
        }
      }
    }

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
        const method = String(req.method || 'GET').toUpperCase();
        const pathOnly = url.split('?')[0];
        /**
         * Pending companies can still sync session, edit company story, read notifications,
         * and browse their dashboard + job list (read-only). Creating/updating jobs, talent
         * search, and applications stay blocked until approved.
         */
        const allowedWhilePending =
          pathOnly.startsWith('/api/auth/me') ||
          pathOnly.startsWith('/api/profile/photo') ||
          pathOnly.startsWith('/api/notifications') ||
          (method === 'GET' &&
            (pathOnly.startsWith('/api/jobs/company/') || pathOnly === '/api/jobs'));
        if (!allowedWhilePending) {
          const pst = user.platformApprovalStatus;
          const pct = user.partnerCollegeApprovalStatus;
          const hasPartner = Boolean(user.partnerCollege);
          let msg =
            'Your company account is awaiting approval from a Learn2Hire administrator.';
          if (hasPartner && pct === 'pending' && pst === 'pending') {
            msg =
              'Your company account is awaiting approval from your partner campus and/or a Learn2Hire administrator.';
          } else if (hasPartner && pct === 'pending') {
            msg =
              'Your company account is awaiting approval from the partner campus you selected.';
          }
          return res.status(403).json({
            success: false,
            message:
              pst === 'rejected' && (pct === 'rejected' || !hasPartner)
                ? 'Your company registration was not approved. Contact support for help.'
                : pct === 'rejected' && pst !== 'approved'
                  ? 'Your partnership request was not approved by the campus. You can contact support or wait for platform review.'
                  : msg,
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
  const token = getTokenFromRequest(req);

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());

    const user = await User.findById(decoded.id);
    if (user) {
      const role = String(user.role || '')
        .trim()
        .toLowerCase();
      if (role === 'student') {
        if (isStudentCampusAccessBlocked(user)) {
          req.user = undefined;
        } else {
          req.user = user;
        }
      } else if (role === 'faculty') {
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

const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const EmailOtp = require('../models/EmailOtp');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isBuiltinAdminEmail } = require('../config/builtinAdmins');
const { normalizeEmail, isValidEmail } = require('../utils/emailValidation');
const {
  sendSignupOtpEmail,
  sendPasswordResetOtpEmail,
  humanizeSmtpError,
  isSmtpConfigured,
  smtpNotConfiguredClientMessage,
} = require('../utils/otpDelivery');
const { createNotification, notifyPlatformAdmins } = require('../utils/notificationService');
const { isCollegeNameTaken } = require('../utils/collegeNameNormalize');
const { isCompanySelfRegistrationBlocked } = require('../utils/campusApproval');

// Generate JWT token (expires in 7 days)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'learn2hire-secret', {
    expiresIn: '7d',
  });
};

const serializeAuthUser = (user) => {
  const doc = user && typeof user.toObject === 'function' ? user.toObject() : user;
  const base = {
    id: doc._id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
    facultyApprovalStatus: doc.facultyApprovalStatus,
    collegeApprovalStatus: doc.collegeApprovalStatus,
    platformApprovalStatus: doc.platformApprovalStatus,
    studentCampusApprovalStatus: doc.studentCampusApprovalStatus,
    partnerCollege: doc.partnerCollege,
    partnerCollegeApprovalStatus: doc.partnerCollegeApprovalStatus,
    affiliatedCollege: doc.affiliatedCollege,
    managedByCollege: doc.managedByCollege,
    profilePhoto: doc.profilePhoto || '',
  };
  if (doc.role === 'company') {
    return {
      ...base,
      companyBio: doc.companyBio || '',
      companyDetails: doc.companyDetails || '',
      companyGoals: doc.companyGoals || '',
      companyFocusAreas: doc.companyFocusAreas || '',
    };
  }
  return base;
};

const isStrongPassword = (password) => {
  const value = String(password || '');

  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};

const SIGNUP_OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const OTP_CODE_REGEX = /^\d{6}$/;

/**
 * Checks email OTP without removing it. Updates attempt count on wrong code.
 * @returns {Promise<{ ok: true } | { ok: false, status: number, message: string }>}
 */
async function validateEmailOtpCode(normEmail, otpStr, purpose) {
  if (!OTP_CODE_REGEX.test(otpStr)) {
    return {
      ok: false,
      status: 400,
      message: 'Enter the 6-digit verification code.',
    };
  }

  const otpRecord = await EmailOtp.findOne({
    email: normEmail,
    purpose,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!otpRecord) {
    return {
      ok: false,
      status: 400,
      message: 'Verification code expired or missing. Request a new code.',
    };
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await EmailOtp.deleteMany({ email: normEmail, purpose });
    return {
      ok: false,
      status: 400,
      message: 'Too many invalid attempts. Request a new verification code.',
    };
  }

  const otpOk = await bcrypt.compare(otpStr, otpRecord.codeHash);
  if (!otpOk) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const used = otpRecord.attempts;
    if (used >= MAX_OTP_ATTEMPTS) {
      await EmailOtp.deleteMany({ email: normEmail, purpose });
      return {
        ok: false,
        status: 400,
        message: `Wrong verification code (attempt ${used} of ${MAX_OTP_ATTEMPTS}). No attempts left—request a new code.`,
      };
    }
    const left = MAX_OTP_ATTEMPTS - used;
    return {
      ok: false,
      status: 400,
      message: `Wrong verification code (attempt ${used} of ${MAX_OTP_ATTEMPTS}). ${left} more attempt${left === 1 ? '' : 's'} allowed.`,
    };
  }

  return { ok: true };
}

/** Set OTP_ECHO_TO_CLIENT=true only for debugging (includes code in API response). Keep false with real SMTP. */
function shouldReturnOtpInApiResponse() {
  return String(process.env.OTP_ECHO_TO_CLIENT || '').toLowerCase() === 'true';
}

// @desc    Public list of colleges that can accept student/faculty sign-ups
// @route   GET /api/auth/approved-colleges
// @access  Public
exports.listApprovedColleges = async (req, res) => {
  try {
    const includePending =
      String(req.query.includePending || '').toLowerCase() === 'true' ||
      req.query.includePending === '1';

    const approvedOrLegacy = [
      { collegeApprovalStatus: { $exists: false } },
      { collegeApprovalStatus: null },
      { collegeApprovalStatus: 'approved' },
    ];
    const filter = {
      role: 'college',
      $or: includePending
        ? [...approvedOrLegacy, { collegeApprovalStatus: 'pending' }]
        : approvedOrLegacy,
    };

    const colleges = await User.find(filter)
      .select('name collegeApprovalStatus')
      .sort({ name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        colleges: colleges.map((c) => {
          const raw = c.collegeApprovalStatus;
          const collegeApprovalStatus =
            raw === 'pending' ? 'pending' : raw === 'rejected' ? 'rejected' : 'approved';
          return { id: c._id, name: c.name, collegeApprovalStatus };
        }),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Verify signup OTP (check only; code stays valid until signup completes)
// @route   POST /api/auth/verify-signup-otp
// @access  Public
exports.verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const norm = normalizeEmail(email);

    if (!norm || !isValidEmail(norm)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    const otpStr = String(otp || '').trim();
    const result = await validateEmailOtpCode(norm, otpStr, 'signup');
    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Code is correct. You can continue signing up.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Verify password-reset OTP (check only; code stays valid until reset completes)
// @route   POST /api/auth/verify-password-reset-otp
// @access  Public
exports.verifyPasswordResetOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const norm = normalizeEmail(email);

    if (!norm || !isValidEmail(norm)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    const otpStr = String(otp || '').trim();
    const result = await validateEmailOtpCode(norm, otpStr, 'password_reset');
    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message,
      });
    }

    res.status(200).json({
      success: true,
      verified: true,
      message: 'Code is correct. You can set your new password below.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Request email OTP for signup
// @route   POST /api/auth/request-signup-otp
// @access  Public
exports.requestSignupOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const norm = normalizeEmail(email);

    if (!norm || !isValidEmail(norm)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    const existingUser = await User.findOne({ email: norm });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Try signing in.',
      });
    }

    const echoSignup = shouldReturnOtpInApiResponse();
    if (!isSmtpConfigured() && !echoSignup) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: smtpNotConfiguredClientMessage(),
      });
    }

    const last = await EmailOtp.findOne({ email: norm, purpose: 'signup' }).sort({
      createdAt: -1,
    });
    if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        message: 'Please wait a minute before requesting another code.',
      });
    }

    await EmailOtp.deleteMany({ email: norm, purpose: 'signup' });

    const code = String(crypto.randomInt(100000, 1000000));
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);

    await EmailOtp.create({
      email: norm,
      purpose: 'signup',
      codeHash,
      expiresAt: new Date(Date.now() + SIGNUP_OTP_TTL_MS),
      attempts: 0,
    });

    if (isSmtpConfigured()) {
      try {
        await sendSignupOtpEmail(norm, code);
      } catch (mailErr) {
        await EmailOtp.deleteMany({ email: norm, purpose: 'signup' });
        console.error('[Learn2Hire] OTP email failed:', mailErr.message || mailErr);
        if (mailErr.response) {
          console.error('[Learn2Hire] SMTP response:', mailErr.response);
        }
        const message =
          mailErr.smtpClientMessage || humanizeSmtpError(mailErr);
        return res.status(502).json({
          success: false,
          message,
        });
      }
    } else {
      console.warn(
        '[Learn2Hire] SMTP not configured; returning signup OTP in API only (OTP_ECHO_TO_CLIENT=true).'
      );
    }

    res.status(200).json({
      success: true,
      /** Same address they typed on signup — OTP is always delivered here, not to SMTP_USER. */
      sentTo: norm,
      message: echoSignup
        ? `Verification code generated for ${norm} (debug: code also below).`
        : `Verification code sent to ${norm}. Check that inbox (and spam).`,
      ...(echoSignup ? { devCode: code } : {}),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

const PASSWORD_RESET_ROLES = ['student', 'faculty', 'college', 'company'];

// @desc    Request password reset code (student, faculty, college, company; not admin)
// @route   POST /api/auth/request-password-reset-otp
// @access  Public
exports.requestPasswordResetOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const norm = normalizeEmail(email);

    if (!norm || !isValidEmail(norm)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    const user = await User.findOne({ email: norm });
    const genericOk = () =>
      res.status(200).json({
        success: true,
        message:
          'If an account exists for that email, we sent a verification code. Check your inbox and spam folder.',
      });

    if (!user || !PASSWORD_RESET_ROLES.includes(user.role)) {
      return genericOk();
    }

    const echoReset = shouldReturnOtpInApiResponse();
    if (!isSmtpConfigured() && !echoReset) {
      return res.status(503).json({
        success: false,
        code: 'SMTP_NOT_CONFIGURED',
        message: smtpNotConfiguredClientMessage(),
      });
    }

    const last = await EmailOtp.findOne({ email: norm, purpose: 'password_reset' }).sort({
      createdAt: -1,
    });
    if (last && Date.now() - last.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      return res.status(429).json({
        success: false,
        message: 'Please wait a minute before requesting another code.',
      });
    }

    await EmailOtp.deleteMany({ email: norm, purpose: 'password_reset' });

    const code = String(crypto.randomInt(100000, 1000000));
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);

    await EmailOtp.create({
      email: norm,
      purpose: 'password_reset',
      codeHash,
      expiresAt: new Date(Date.now() + SIGNUP_OTP_TTL_MS),
      attempts: 0,
    });

    if (isSmtpConfigured()) {
      try {
        await sendPasswordResetOtpEmail(norm, code);
      } catch (mailErr) {
        await EmailOtp.deleteMany({ email: norm, purpose: 'password_reset' });
        console.error('[Learn2Hire] password reset email failed:', mailErr.message || mailErr);
        const message = mailErr.smtpClientMessage || humanizeSmtpError(mailErr);
        return res.status(502).json({
          success: false,
          message,
        });
      }
    } else {
      console.warn(
        '[Learn2Hire] SMTP not configured; returning password-reset OTP in API only (OTP_ECHO_TO_CLIENT=true).'
      );
    }

    res.status(200).json({
      success: true,
      sentTo: norm,
      message: echoReset
        ? `Reset code generated for ${norm} (debug: code also below).`
        : `Verification code sent to ${norm}. Check that inbox (and spam).`,
      ...(echoReset ? { devCode: code } : {}),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Set new password using email + reset code (same roles as request-password-reset-otp)
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const norm = normalizeEmail(email);

    if (!norm || !isValidEmail(norm)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    const user = await User.findOne({ email: norm }).select('+password');
    if (!user || !PASSWORD_RESET_ROLES.includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification code, or this account cannot be reset here.',
      });
    }

    const otpStr = String(otp || '').trim();
    const otpCheck = await validateEmailOtpCode(norm, otpStr, 'password_reset');
    if (!otpCheck.ok) {
      return res.status(otpCheck.status).json({
        success: false,
        message: otpCheck.message,
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await EmailOtp.deleteMany({ email: norm, purpose: 'password_reset' });

    res.status(200).json({
      success: true,
      message: 'Password updated. You can sign in with your new password.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Signup (register) new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;
    const normEmail = normalizeEmail(email);

    if (!name || !normEmail || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password and role',
      });
    }

    if (!isValidEmail(normEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    if (role === 'admin') {
      return res.status(403).json({
        success: false,
        message:
          'Administrator accounts cannot be registered. Use the authorized admin sign-in credentials.',
      });
    }

    const validRoles = ['student', 'faculty', 'company', 'college'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be one of: student, faculty, company, college',
      });
    }

    const existingUser = await User.findOne({ email: normEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    if (role === 'college' && (await isCollegeNameTaken(User, name))) {
      return res.status(400).json({
        success: false,
        message:
          'A college is already registered with this name. Use a distinct institution name or contact support if this is your campus.',
      });
    }

    const otpStr = String(otp || '').trim();
    const otpCheck = await validateEmailOtpCode(normEmail, otpStr, 'signup');
    if (!otpCheck.ok) {
      return res.status(otpCheck.status).json({
        success: false,
        message: otpCheck.message,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let collegeDoc = null;
    if (role === 'student' || role === 'faculty') {
      const collegeId = req.body.collegeId;
      if (!collegeId || !mongoose.Types.ObjectId.isValid(String(collegeId))) {
        return res.status(400).json({
          success: false,
          message: 'Select an approved college before signing up.',
        });
      }
      collegeDoc = await User.findById(collegeId);
      if (!collegeDoc || collegeDoc.role !== 'college') {
        return res.status(400).json({
          success: false,
          message: 'The selected college is not valid.',
        });
      }
      const cst = collegeDoc.collegeApprovalStatus;
      if (cst === 'pending' || cst === 'rejected') {
        return res.status(400).json({
          success: false,
          message:
            cst === 'pending'
              ? 'This college is still awaiting platform approval and cannot accept members yet.'
              : 'This college cannot accept new sign-ups.',
        });
      }
    }

    const userPayload = {
      name,
      email: normEmail,
      password: hashedPassword,
      role,
    };

    if (role === 'college') {
      userPayload.collegeApprovalStatus = 'pending';
    }

    if (role === 'faculty') {
      userPayload.facultyApprovalStatus = 'pending';
      userPayload.affiliatedCollege = collegeDoc._id;
    }

    if (role === 'student') {
      userPayload.managedByCollege = collegeDoc._id;
      userPayload.affiliatedCollege = collegeDoc._id;
      userPayload.studentCampusApprovalStatus = 'pending';
    }

    if (role === 'company') {
      userPayload.platformApprovalStatus = 'pending';
      const rawPartner = req.body.partnerCollegeId;
      if (rawPartner != null && String(rawPartner).trim()) {
        const pid = String(rawPartner).trim();
        if (!mongoose.Types.ObjectId.isValid(pid)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid partner campus selection.',
          });
        }
        const partnerDoc = await User.findById(pid);
        if (!partnerDoc || partnerDoc.role !== 'college') {
          return res.status(400).json({
            success: false,
            message: 'Partner campus is not valid.',
          });
        }
        const pcst = partnerDoc.collegeApprovalStatus;
        if (pcst === 'pending' || pcst === 'rejected') {
          return res.status(400).json({
            success: false,
            message:
              pcst === 'pending'
                ? 'That campus is still awaiting platform approval and cannot be selected as a partner yet.'
                : 'That campus cannot be selected as a partner.',
          });
        }
        userPayload.partnerCollege = partnerDoc._id;
        userPayload.partnerCollegeApprovalStatus = 'pending';
      }
    }

    const user = await User.create(userPayload);

    if (role === 'college') {
      await EmailOtp.deleteMany({ email: normEmail, purpose: 'signup' });
      try {
        await notifyPlatformAdmins({
          title: 'College registration pending',
          message: `${name} (${normEmail}) registered a new college and needs platform approval.`,
          category: 'system',
          type: 'college_pending',
          actionUrl: '/dashboard',
          metadata: { collegeUserId: user._id },
        });
      } catch (notifyErr) {
        console.error('[Learn2Hire] college signup notify:', notifyErr.message || notifyErr);
      }
      return res.status(201).json({
        success: true,
        message:
          'Registration received. A Learn2Hire administrator must approve your college before you can sign in.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            collegeApprovalStatus: 'pending',
          },
          token: null,
          requiresApproval: true,
        },
      });
    }

    if (role === 'student') {
      const { course, branch, year, semester } = req.body;
      const c = typeof course === 'string' ? course.trim() : '';
      const b = typeof branch === 'string' ? branch.trim() : '';
      const y = typeof year === 'string' ? year.trim() : '';
      const sem = typeof semester === 'string' ? semester.trim() : '';
      if (!c || !b || !y || !sem) {
        await User.findByIdAndDelete(user._id);
        return res.status(400).json({
          success: false,
          message:
            'Students must provide program, branch, year, and semester.',
        });
      }
      try {
        await StudentProfile.create({
          user: user._id,
          course: c,
          branch: b,
          year: y,
          semester: sem,
        });
      } catch (profileErr) {
        await User.findByIdAndDelete(user._id);
        return res.status(500).json({
          success: false,
          message: profileErr.message || 'Could not create student profile.',
        });
      }

      try {
        await createNotification({
          recipient: collegeDoc._id,
          title: 'Student approval needed',
          message: `${name} (${normEmail}) registered under your college. Approve or reject pending students in your dashboard.`,
          category: 'system',
          type: 'student_joined_college',
          actionUrl: '/dashboard',
          metadata: { studentId: user._id },
        });
        await notifyPlatformAdmins({
          title: 'Student awaiting campus approval',
          message: `${name} (${normEmail}) registered as a student under ${collegeDoc.name}. A campus approver or administrator must approve them before they can use the platform.`,
          category: 'system',
          type: 'student_pending_campus',
          actionUrl: '/dashboard',
          metadata: { studentId: user._id, collegeId: collegeDoc._id },
        });
      } catch (notifyErr) {
        console.error('[Learn2Hire] student signup notify:', notifyErr.message || notifyErr);
      }

      await EmailOtp.deleteMany({ email: normEmail, purpose: 'signup' });
      return res.status(201).json({
        success: true,
        message:
          'Registration received. Your campus (college or faculty) or a Learn2Hire administrator must approve your student account before you can use the platform.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            studentCampusApprovalStatus: 'pending',
            affiliatedCollege: collegeDoc._id,
            managedByCollege: collegeDoc._id,
          },
          token: null,
          requiresApproval: true,
        },
      });
    }

    if (role === 'faculty') {
      await EmailOtp.deleteMany({ email: normEmail, purpose: 'signup' });
      try {
        await createNotification({
          recipient: collegeDoc._id,
          title: 'Faculty approval needed',
          message: `${name} (${normEmail}) requested to join ${collegeDoc.name} as faculty. Review pending faculty to approve or reject.`,
          category: 'system',
          type: 'faculty_pending_college',
          actionUrl: '/dashboard',
          metadata: { facultyId: user._id },
        });
        await notifyPlatformAdmins({
          title: 'Faculty registration pending approval',
          message: `${name} (${normEmail}) requested faculty access for ${collegeDoc.name}. Their college or a Learn2Hire administrator can approve this request.`,
          category: 'system',
          type: 'faculty_pending_admin',
          actionUrl: '/dashboard',
          metadata: { facultyId: user._id, collegeId: collegeDoc._id },
        });
      } catch (notifyErr) {
        console.error('[Learn2Hire] faculty signup notify:', notifyErr.message || notifyErr);
      }
      return res.status(201).json({
        success: true,
        message:
          'Registration received. Your college or a Learn2Hire administrator must approve your faculty account before you can sign in.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            facultyApprovalStatus: 'pending',
            affiliatedCollege: collegeDoc._id,
          },
          token: null,
          requiresApproval: true,
        },
      });
    }

    if (role === 'company') {
      await EmailOtp.deleteMany({ email: normEmail, purpose: 'signup' });
      try {
        await notifyPlatformAdmins({
          title: user.partnerCollege ? 'Company pending approval' : 'Company pending platform approval',
          message: user.partnerCollege
            ? `${name} (${normEmail}) registered a company and requested partnership with a campus. A platform admin or that campus can approve the account.`
            : `${name} (${normEmail}) registered a company account. Approve or reject this account in the admin dashboard.`,
          category: 'system',
          type: 'company_pending_platform',
          actionUrl: '/dashboard',
          metadata: { companyUserId: user._id },
        });
        if (user.partnerCollege) {
          await createNotification({
            recipient: user.partnerCollege,
            title: 'Company partnership request',
            message: `${name} registered on Learn2Hire and selected your campus as a partner. Approve or reject in your college dashboard.`,
            category: 'system',
            type: 'company_partner_pending',
            actionUrl: '/dashboard',
            metadata: { companyUserId: user._id },
          });
        }
      } catch (notifyErr) {
        console.error('[Learn2Hire] company signup notify:', notifyErr.message || notifyErr);
      }
      return res.status(201).json({
        success: true,
        message: user.partnerCollege
          ? 'Registration received. Your partner campus and/or a Learn2Hire administrator must approve your company before you can sign in.'
          : 'Registration received. A Learn2Hire administrator must approve your company account before you can sign in.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            platformApprovalStatus: 'pending',
            partnerCollege: user.partnerCollege || null,
            partnerCollegeApprovalStatus: user.partnerCollegeApprovalStatus || null,
          },
          token: null,
          requiresApproval: true,
        },
      });
    }

    console.error('[Learn2Hire] signup: unexpected fallthrough for role', role);
    return res.status(500).json({
      success: false,
      message: 'Registration could not be completed.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const normEmail = normalizeEmail(email);
    const rawTrim = String(email || '').trim();

    if (!normEmail || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    if (!isValidEmail(normEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid email address.',
      });
    }

    let user = await User.findOne({ email: normEmail }).select('+password');
    if (!user && rawTrim && rawTrim !== normEmail) {
      user = await User.findOne({ email: rawTrim }).select('+password');
    }
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.role === 'admin' && !isBuiltinAdminEmail(user.email)) {
      return res.status(403).json({
        success: false,
        message: 'This administrator account is not authorized. Use an official admin login.',
      });
    }

    if (user.role === 'college') {
      const cst = user.collegeApprovalStatus;
      if (cst === 'pending') {
        return res.status(403).json({
          success: false,
          message:
            'Your college account is awaiting approval from a Learn2Hire administrator. You will be able to sign in after approval.',
        });
      }
      if (cst === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your college registration was not approved. Contact support if you need help.',
        });
      }
    }

    if (user.role === 'company') {
      if (isCompanySelfRegistrationBlocked(user)) {
        const pst = user.platformApprovalStatus;
        const pct = user.partnerCollegeApprovalStatus;
        const hasPartner = Boolean(user.partnerCollege);
        if (pst === 'rejected' && (!hasPartner || pct === 'rejected')) {
          return res.status(403).json({
            success: false,
            message: 'Your company registration was not approved. Contact support if you need help.',
          });
        }
        if (hasPartner && pct === 'rejected' && pst !== 'approved') {
          return res.status(403).json({
            success: false,
            message:
              'Your partnership request was not approved by the campus. Contact support if you need help.',
          });
        }
        return res.status(403).json({
          success: false,
          message:
            hasPartner && (pct === 'pending' || pct == null) && pst === 'pending'
              ? 'Your company account is awaiting approval from your partner campus and/or a Learn2Hire administrator. You will be able to sign in after approval.'
              : 'Your company account is awaiting approval from a Learn2Hire administrator. You will be able to sign in after approval.',
        });
      }
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: serializeAuthUser(user),
        token,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get current logged-in user (uses auth middleware)
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = req.user;
    res.status(200).json({
      success: true,
      data: {
        user: serializeAuthUser(user),
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update company narrative profile (employer accounts only)
// @route   PATCH /api/auth/me/company
// @access  Private (company)
exports.patchCompanyProfile = async (req, res) => {
  try {
    if (req.user.role !== 'company') {
      return res.status(403).json({
        success: false,
        message: 'Only company accounts can update this profile.',
      });
    }

    const { companyBio, companyDetails, companyGoals, companyFocusAreas } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (companyBio !== undefined) user.companyBio = String(companyBio ?? '').trim();
    if (companyDetails !== undefined) {
      user.companyDetails = String(companyDetails ?? '').trim();
    }
    if (companyGoals !== undefined) user.companyGoals = String(companyGoals ?? '').trim();
    if (companyFocusAreas !== undefined) {
      user.companyFocusAreas = String(companyFocusAreas ?? '').trim();
    }

    await user.save();

    try {
      await notifyPlatformAdmins({
        title: 'Company profile updated',
        message: `${user.name} (${user.email}) updated their company profile.`,
        category: 'system',
        type: 'company_profile_updated',
        actionUrl: '/dashboard',
        metadata: { companyUserId: user._id },
      });
    } catch (e) {
      console.error('[Learn2Hire] company profile admin notify:', e.message || e);
    }

    res.status(200).json({
      success: true,
      message: 'Company profile updated.',
      data: {
        user: serializeAuthUser(user),
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(' '),
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

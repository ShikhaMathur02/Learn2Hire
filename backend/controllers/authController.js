const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isBuiltinAdminEmail } = require('../config/builtinAdmins');

// Generate JWT token (expires in 7 days)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'learn2hire-secret', {
    expiresIn: '7d',
  });
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

// @desc    Signup (register) new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password and role',
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

    const validRoles = ['student', 'alumni', 'faculty', 'company', 'college'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be one of: student, alumni, faculty, company, college',
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userPayload = {
      name,
      email,
      password: hashedPassword,
      role,
    };

    if (role === 'faculty') {
      userPayload.facultyApprovalStatus = 'pending';
    }

    const user = await User.create(userPayload);

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
            'Students must provide program (e.g. B.Tech), branch (e.g. CSE), year (e.g. 4th year), and semester (e.g. 7th sem).',
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
    }

    if (role === 'faculty') {
      return res.status(201).json({
        success: true,
        message:
          'Registration received. A college administrator must approve your faculty account before you can sign in.',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            facultyApprovalStatus: 'pending',
          },
          token: null,
          requiresApproval: true,
        },
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
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

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    const user = await User.findOne({ email }).select('+password');
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

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          facultyApprovalStatus: user.facultyApprovalStatus,
        },
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
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          facultyApprovalStatus: user.facultyApprovalStatus,
          managedByCollege: user.managedByCollege,
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');

const validRoles = ['student', 'alumni', 'faculty', 'company', 'admin', 'college'];

const ensureAdmin = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Only admin users can access this resource.',
    });
    return false;
  }

  return true;
};

// @desc    Get admin analytics overview
// @route   GET /api/admin/analytics
// @access  Private (admin only)
exports.getAnalytics = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const [
      totalUsers,
      totalProfiles,
      totalAssessments,
      totalSubmissions,
      totalJobs,
      totalApplications,
      roleBreakdown,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      StudentProfile.countDocuments(),
      Assessment.countDocuments(),
      AssessmentSubmission.countDocuments(),
      Job.countDocuments(),
      JobApplication.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.find().select('name email role createdAt').sort({ createdAt: -1 }).limit(6),
    ]);

    const roles = {
      student: 0,
      alumni: 0,
      faculty: 0,
      company: 0,
      admin: 0,
      college: 0,
    };

    roleBreakdown.forEach((item) => {
      roles[item._id] = item.count;
    });

    res.status(200).json({
      success: true,
      data: {
        totals: {
          totalUsers,
          totalProfiles,
          totalAssessments,
          totalSubmissions,
          totalJobs,
          totalApplications,
        },
        roles,
        recentUsers,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get all users for admin management
// @route   GET /api/admin/users
// @access  Private (admin only)
exports.getUsers = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const query = {};
    const { role, search } = req.query;

    if (role && validRoles.includes(role)) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('name email role createdAt updatedAt')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: { users },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update user role
// @route   PATCH /api/admin/users/:id/role
// @access  Private (admin only)
exports.updateUserRole = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID',
      });
    }

    const { role } = req.body;
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((error) => error.message);
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

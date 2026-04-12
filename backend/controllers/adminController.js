const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const LearningProgress = require('../models/LearningProgress');
const Notification = require('../models/Notification');
const SavedJob = require('../models/SavedJob');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { asString, parseWorkbookRows } = require('../utils/uploadParsers');
const { isBuiltinAdminEmail } = require('../config/builtinAdmins');

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

    if (role === 'admin' && !isBuiltinAdminEmail(user.email)) {
      return res.status(400).json({
        success: false,
        message: 'Only built-in administrator accounts can have the admin role.',
      });
    }

    if (user.role === 'admin' && isBuiltinAdminEmail(user.email) && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Built-in administrator accounts cannot be reassigned to another role.',
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

// @desc    Get full platform insights for admin dashboard
// @route   GET /api/admin/insights
// @access  Private (admin only)
exports.getPlatformInsights = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const [
      users,
      jobs,
      applications,
      roleBreakdown,
      applicationBreakdown,
      jobStatusBreakdown,
    ] = await Promise.all([
      User.find()
        .select(
          'name email role managedByCollege facultyApprovalStatus createdAt updatedAt'
        )
        .sort({ createdAt: -1 })
        .limit(300)
        .populate('managedByCollege', 'name email role')
        .lean(),
      Job.find()
        .select('title status location employmentType createdBy createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(120)
        .populate('createdBy', 'name email role')
        .lean(),
      JobApplication.find()
        .select('status student job createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('student', 'name email role managedByCollege')
        .populate({
          path: 'job',
          select: 'title status createdBy location employmentType',
          populate: { path: 'createdBy', select: 'name email role' },
        })
        .lean(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      JobApplication.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);

    const roleCounts = {
      student: 0,
      alumni: 0,
      faculty: 0,
      company: 0,
      admin: 0,
      college: 0,
    };
    roleBreakdown.forEach((row) => {
      if (row?._id) roleCounts[row._id] = row.count;
    });

    const appStatusCounts = {
      applied: 0,
      reviewing: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
    };
    applicationBreakdown.forEach((row) => {
      if (row?._id) appStatusCounts[row._id] = row.count;
    });

    const jobStatusCounts = {
      draft: 0,
      open: 0,
      closed: 0,
    };
    jobStatusBreakdown.forEach((row) => {
      if (row?._id) jobStatusCounts[row._id] = row.count;
    });

    const pendingFacultyCount = users.filter(
      (u) => u.role === 'faculty' && u.facultyApprovalStatus === 'pending'
    ).length;
    const managedStudentsCount = users.filter(
      (u) => u.role === 'student' && u.managedByCollege
    ).length;

    const studentIds = users.filter((u) => u.role === 'student').map((u) => u._id);
    const profileSelect =
      'user course branch year semester bio studentPhone fatherName motherName fatherPhone motherPhone address city state pincode dateOfBirth bloodGroup emergencyContactName emergencyContactPhone';
    const studentProfiles =
      studentIds.length > 0
        ? await StudentProfile.find({ user: { $in: studentIds } }).select(profileSelect).lean()
        : [];
    const profileByUserId = new Map(studentProfiles.map((p) => [String(p.user), p]));
    const people = users.map((u) => {
      const row = { ...u };
      if (u.role === 'student') {
        const p = profileByUserId.get(String(u._id));
        if (p) {
          for (const key of profileSelect.split(' ')) {
            if (key === 'user') continue;
            row[key] = p[key] || '';
          }
        } else {
          for (const key of profileSelect.split(' ')) {
            if (key === 'user') continue;
            row[key] = '';
          }
        }
      }
      return row;
    });

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals: {
          totalUsers: users.length,
          totalJobs: jobs.length,
          totalApplications: applications.length,
          pendingFacultyCount,
          managedStudentsCount,
        },
        roleCounts,
        jobStatusCounts,
        appStatusCounts,
        people,
        jobs,
        applications,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Bulk import students from Excel (admin)
// @route   POST /api/admin/students/import
// @access  Private (admin only)
exports.importStudentsFromSheet = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel file.',
      });
    }

    const rows = parseWorkbookRows(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Sheet is empty.',
      });
    }

    const outcomes = [];
    for (const row of rows) {
      const name = asString(row.name);
      const email = asString(row.email).toLowerCase();
      const password = asString(row.password);

      if (!name || !email || !password) {
        outcomes.push({ email, ok: false, message: 'Missing name/email/password' });
        continue;
      }

      const exists = await User.findOne({ email });
      if (exists) {
        outcomes.push({ email, ok: false, message: 'Email already exists' });
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'student',
      });
      outcomes.push({ email, ok: true, message: 'Created' });
    }

    const created = outcomes.filter((o) => o.ok).length;
    const failed = outcomes.length - created;

    res.status(200).json({
      success: true,
      message: `Student import finished. Created: ${created}, Failed: ${failed}`,
      data: { created, failed, results: outcomes },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update student academic cohort (admin)
// @route   PATCH /api/admin/users/:id/student-profile
// @access  Private (admin only)
exports.patchStudentCohort = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findById(id);
    if (!target || target.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student user not found.',
      });
    }

    const body = req.body || {};
    const t = (v) => (typeof v === 'string' ? v.trim() : '');

    const profile = await StudentProfile.findOneAndUpdate(
      { user: id },
      {
        $set: {
          course: t(body.course),
          branch: t(body.branch),
          year: t(body.year),
          semester: t(body.semester),
          bio: t(body.bio),
          studentPhone: t(body.studentPhone),
          fatherName: t(body.fatherName),
          motherName: t(body.motherName),
          fatherPhone: t(body.fatherPhone),
          motherPhone: t(body.motherPhone),
          address: t(body.address),
          city: t(body.city),
          state: t(body.state),
          pincode: t(body.pincode),
          dateOfBirth: t(body.dateOfBirth),
          bloodGroup: t(body.bloodGroup),
          emergencyContactName: t(body.emergencyContactName),
          emergencyContactPhone: t(body.emergencyContactPhone),
        },
        $setOnInsert: { user: id },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    ).populate('user', 'name email role');

    res.status(200).json({
      success: true,
      message: 'Student profile updated.',
      data: { profile },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Delete user (admin) — full cascade for students/alumni only
// @route   DELETE /api/admin/users/:id
// @access  Private (admin only)
exports.deleteUser = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (String(req.user._id) === String(id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.',
      });
    }

    const target = await User.findById(id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (target.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete admin accounts.',
      });
    }

    if (target.role === 'student' || target.role === 'alumni') {
      await StudentProfile.deleteMany({ user: id });
      await LearningProgress.deleteMany({ user: id });
      await AssessmentSubmission.deleteMany({ user: id });
      await JobApplication.deleteMany({ student: id });
      await SavedJob.deleteMany({ student: id });
      await Notification.deleteMany({ recipient: id });
      await User.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'User and related learner data removed.',
      });
    }

    return res.status(400).json({
      success: false,
      message:
        'Automated delete is only enabled for student and alumni accounts. Remove or reassign other roles manually.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

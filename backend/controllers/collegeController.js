const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const { asString, parseWorkbookRows } = require('../utils/uploadParsers');
const { createBulkNotifications } = require('../utils/notificationService');

const normalizeRole = (r) => String(r || '').trim().toLowerCase();

const isCollegeOrAdmin = (req) => {
  const r = normalizeRole(req.user?.role);
  return r === 'college' || r === 'admin';
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

// @desc    List campus roster (students & faculty created by this college)
// @route   GET /api/college/roster
exports.getRoster = async (req, res) => {
  try {
    if (!isCollegeOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only college or admin users can view the roster',
      });
    }

    if (normalizeRole(req.user.role) === 'college') {
      const roster = await User.find({
        managedByCollege: req.user._id,
        role: { $in: ['student', 'faculty'] },
      })
        .select('name email role facultyApprovalStatus createdAt')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: roster.length,
        data: { users: roster },
      });
    }

    const roster = await User.find({
      managedByCollege: { $ne: null },
      role: { $in: ['student', 'faculty'] },
    })
      .select('name email role facultyApprovalStatus managedByCollege createdAt')
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      count: roster.length,
      data: { users: roster },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Faculty accounts waiting for college approval
// @route   GET /api/college/faculty/pending
exports.getPendingFaculty = async (req, res) => {
  try {
    if (!isCollegeOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only college or admin users can review faculty approvals',
      });
    }

    const pending = await User.find({
      role: 'faculty',
      facultyApprovalStatus: 'pending',
    })
      .select('name email facultyApprovalStatus managedByCollege createdAt')
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: pending.length,
      data: { users: pending },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Add student or faculty account (pre-approved faculty)
// @route   POST /api/college/roster
exports.createRosterUser = async (req, res) => {
  try {
    if (!isCollegeOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only college or admin users can add roster accounts',
      });
    }

    const { name, email, password, role } = req.body;
    const targetRole = normalizeRole(role);

    if (!name || !email || !password || !targetRole) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, password, and role',
      });
    }

    if (!['student', 'faculty'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: 'Roster role must be student or faculty',
      });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const collegeId =
      normalizeRole(req.user.role) === 'college' ? req.user._id : null;

    const doc = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      managedByCollege: collegeId,
    };

    if (targetRole === 'faculty') {
      doc.facultyApprovalStatus = 'approved';
    }

    const user = await User.create(doc);

    res.status(201).json({
      success: true,
      message: 'Account created',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          facultyApprovalStatus: user.facultyApprovalStatus || 'approved',
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

// @desc    Approve or reject a faculty account
// @route   PATCH /api/college/faculty/:id/approval
exports.setFacultyApproval = async (req, res) => {
  try {
    if (!isCollegeOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only college or admin users can approve faculty',
      });
    }

    const { id } = req.params;
    const { decision } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'decision must be approved or rejected',
      });
    }

    const user = await User.findById(id);
    if (!user || user.role !== 'faculty') {
      return res.status(404).json({
        success: false,
        message: 'Faculty user not found',
      });
    }

    user.facultyApprovalStatus = decision;
    if (decision === 'approved' && normalizeRole(req.user.role) === 'college') {
      user.managedByCollege = req.user._id;
    }
    await user.save();

    if (decision === 'approved') {
      const students = await User.find({ role: 'student' }).select('_id').lean();
      if (students.length) {
        await createBulkNotifications({
          recipientIds: students.map((s) => s._id),
          title: 'New faculty member',
          message: `${user.name} has joined the teaching team.`,
          category: 'system',
          type: 'faculty_joined',
          actionUrl: '/dashboard/learning',
          metadata: { facultyId: user._id },
        });
      }
    }

    res.status(200).json({
      success: true,
      message:
        decision === 'approved'
          ? 'Faculty account approved. They can sign in now.'
          : 'Faculty account rejected.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          facultyApprovalStatus: user.facultyApprovalStatus,
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

// @desc    Live overview: campus roster, companies, open jobs, student applications
// @route   GET /api/college/insights
exports.getCollegeInsights = async (req, res) => {
  try {
    if (!isCollegeOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only college or admin users can view placement insights',
      });
    }

    const isCollege = normalizeRole(req.user.role) === 'college';
    const collegeId = isCollege ? req.user._id : null;

    const campusFilter = isCollege
      ? { managedByCollege: collegeId }
      : { managedByCollege: { $ne: null } };

    const [
      rosterStudents,
      rosterFaculty,
      pendingFacultyCount,
      registeredCompanies,
      companyCount,
      openJobsList,
      openJobsCount,
      campusStudentDocs,
    ] = await Promise.all([
      User.countDocuments({ ...campusFilter, role: 'student' }),
      User.countDocuments({ ...campusFilter, role: 'faculty' }),
      User.countDocuments({ role: 'faculty', facultyApprovalStatus: 'pending' }),
      User.find({ role: 'company' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      User.countDocuments({ role: 'company' }),
      Job.find({ status: 'open' })
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Job.countDocuments({ status: 'open' }),
      User.find({ ...campusFilter, role: 'student' }).select('_id').lean(),
    ]);

    const campusStudentIds = campusStudentDocs.map((u) => u._id);

    const applicationsTotal =
      campusStudentIds.length === 0
        ? 0
        : await JobApplication.countDocuments({
            student: { $in: campusStudentIds },
          });

    let applicationsByStatus = {};
    if (campusStudentIds.length) {
      const agg = await JobApplication.aggregate([
        { $match: { student: { $in: campusStudentIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);
      applicationsByStatus = Object.fromEntries(
        agg.map((row) => [row._id, row.count])
      );
    }

    const recentApplications =
      campusStudentIds.length === 0
        ? []
        : await JobApplication.find({ student: { $in: campusStudentIds } })
            .populate('student', 'name email')
            .populate({
              path: 'job',
              select: 'title status location employmentType createdAt',
              populate: { path: 'createdBy', select: 'name email' },
            })
            .sort({ updatedAt: -1 })
            .limit(35)
            .lean();

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        campus: {
          rosterStudents,
          rosterFaculty,
          rosterTotal: rosterStudents + rosterFaculty,
          pendingFacultyReview: pendingFacultyCount,
        },
        hiring: {
          registeredCompanies: companyCount,
          openRoles: openJobsCount,
          companies: registeredCompanies,
          openJobs: openJobsList,
        },
        placements: {
          applicationsTotal,
          applicationsByStatus,
          recentApplications,
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

// @desc    Bulk import students through Excel sheet (college/admin)
// @route   POST /api/college/roster/import/students
exports.importStudentsFromSheet = async (req, res) => {
  try {
    if (!isCollegeOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only college or admin users can import students',
      });
    }

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

    const collegeId = normalizeRole(req.user.role) === 'college' ? req.user._id : null;
    const results = [];

    // Expected headers: name, email, password
    for (const row of rows) {
      const name = asString(row.name);
      const email = asString(row.email).toLowerCase();
      const password = asString(row.password);

      if (!name || !email || !password) {
        results.push({ email, ok: false, message: 'Missing name/email/password' });
        continue;
      }
      if (!isStrongPassword(password)) {
        results.push({ email, ok: false, message: 'Weak password' });
        continue;
      }

      const exists = await User.findOne({ email });
      if (exists) {
        results.push({ email, ok: false, message: 'Email already exists' });
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'student',
        managedByCollege: collegeId,
      });

      results.push({ email, ok: true, message: 'Created' });
    }

    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;

    res.status(200).json({
      success: true,
      message: `Student import finished. Created: ${created}, Failed: ${failed}`,
      data: { created, failed, results },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

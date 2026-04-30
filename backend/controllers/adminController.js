const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobStudentInterest = require('../models/JobStudentInterest');
const LearningProgress = require('../models/LearningProgress');
const Notification = require('../models/Notification');
const SavedJob = require('../models/SavedJob');
const StudentProfile = require('../models/StudentProfile');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { asString, parseTabularFileRows } = require('../utils/uploadParsers');
const { isBuiltinAdminEmail } = require('../config/builtinAdmins');
const { createNotification } = require('../utils/notificationService');
const { sendApprovalGrantedEmail } = require('../utils/otpDelivery');
const { isCollegeNameTaken } = require('../utils/collegeNameNormalize');
const {
  CONTACT_PROFILE_KEYS,
  validateStudentProfileContactFields,
} = require('../utils/studentProfileFieldValidation');
const { JOB_CREATED_BY_SELECT } = require('../constants/jobCreatedBySelect');
const { syncCompanyFullyApproved } = require('../utils/campusApproval');

const validRoles = ['student', 'faculty', 'company', 'admin', 'college'];

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
      applicationCountRows,
      roleBreakdown,
      recentUsers,
    ] = await Promise.all([
      User.countDocuments(),
      StudentProfile.countDocuments(),
      Assessment.countDocuments(),
      AssessmentSubmission.countDocuments(),
      Job.countDocuments(),
      JobApplication.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'student',
            foreignField: '_id',
            as: 'stu',
          },
        },
        { $unwind: { path: '$stu', preserveNullAndEmptyArrays: true } },
        { $count: 'c' },
      ]),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.find()
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .limit(6),
    ]);

    const totalApplications = applicationCountRows[0]?.c ?? 0;

    const roles = {
      student: 0,
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
      .select('name email role createdAt updatedAt platformApprovalStatus')
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

// @desc    Admin user profile (single) — populated campus links + student profile
// @route   GET /api/admin/users/:id
// @access  Private (admin only)
exports.getAdminUserDetail = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const user = await User.findById(id)
      .select(
        'name email role createdAt updatedAt facultyApprovalStatus collegeApprovalStatus platformApprovalStatus affiliatedCollege managedByCollege facultyQualification facultySubjects'
      )
      .populate('affiliatedCollege', 'name email role collegeApprovalStatus createdAt')
      .populate('managedByCollege', 'name email role collegeApprovalStatus createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = await StudentProfile.findOne({ user: id })
        .select(
          'course branch year semester bio studentPhone fatherName motherName fatherPhone motherPhone address city state pincode dateOfBirth bloodGroup emergencyContactName emergencyContactPhone'
        )
        .lean();
    }

    res.status(200).json({
      success: true,
      data: { user, studentProfile },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update faculty qualification / subjects (admin)
// @route   PATCH /api/admin/users/:id/faculty-profile
// @access  Private (admin only)
exports.patchFacultyProfile = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findById(id);
    if (!target || target.role !== 'faculty') {
      return res.status(404).json({
        success: false,
        message: 'Faculty user not found.',
      });
    }

    const body = req.body || {};
    const t = (v) => (typeof v === 'string' ? v.trim() : '');
    if (body.facultyQualification !== undefined) {
      target.facultyQualification = t(body.facultyQualification);
    }
    if (body.facultySubjects !== undefined) {
      target.facultySubjects = t(body.facultySubjects);
    }
    await target.save();

    const user = await User.findById(id)
      .select(
        'name email role facultyQualification facultySubjects facultyApprovalStatus affiliatedCollege managedByCollege createdAt updatedAt'
      )
      .populate('affiliatedCollege', 'name email')
      .populate('managedByCollege', 'name email')
      .lean();

    res.status(200).json({
      success: true,
      message: 'Faculty profile updated.',
      data: { user },
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
    if (role === 'college' && !user.collegeApprovalStatus) {
      user.collegeApprovalStatus = 'approved';
    }
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
      jobStatusBreakdown,
      pendingCollegesCount,
      pendingColleges,
      pendingPlatformCount,
      pendingPlatformUsers,
      registeredColleges,
      registeredCompanies,
      registeredFaculty,
      collegeAccountCount,
      pendingStudentCampusCount,
    ] = await Promise.all([
      User.find()
        .select(
          'name email role managedByCollege facultyApprovalStatus studentCampusApprovalStatus collegeApprovalStatus platformApprovalStatus affiliatedCollege facultyQualification facultySubjects createdAt updatedAt'
        )
        .sort({ createdAt: -1 })
        .limit(300)
        .populate('managedByCollege', 'name email role')
        .populate('affiliatedCollege', 'name email role')
        .lean(),
      Job.find()
        .select('title status location employmentType createdBy createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(120)
        .populate('createdBy', JOB_CREATED_BY_SELECT)
        .lean(),
      JobApplication.find()
        .select('status student job createdAt updatedAt')
        .sort({ createdAt: -1 })
        .limit(200)
        .populate('student', 'name email role managedByCollege')
        .populate({
          path: 'job',
          select: 'title status createdBy location employmentType',
          populate: { path: 'createdBy', select: JOB_CREATED_BY_SELECT },
        })
        .lean(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      User.countDocuments({ role: 'college', collegeApprovalStatus: 'pending' }),
      User.find({ role: 'college', collegeApprovalStatus: 'pending' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(80)
        .lean(),
      User.countDocuments({
        role: 'company',
        platformApprovalStatus: 'pending',
      }),
      User.find({
        role: 'company',
        platformApprovalStatus: 'pending',
      })
        .select('name email role createdAt')
        .sort({ createdAt: -1 })
        .limit(80)
        .lean(),
      User.find({ role: 'college' })
        .select('name email collegeApprovalStatus createdAt updatedAt')
        .sort({ name: 1 })
        .limit(200)
        .lean(),
      User.find({ role: 'company' })
        .select('name email createdAt updatedAt')
        .sort({ name: 1 })
        .limit(200)
        .lean(),
      User.find({ role: 'faculty' })
        .select('name email facultyApprovalStatus affiliatedCollege managedByCollege createdAt')
        .populate('affiliatedCollege', 'name')
        .populate('managedByCollege', 'name')
        .sort({ name: 1 })
        .limit(250)
        .lean(),
      User.countDocuments({ role: 'college' }),
      User.countDocuments({ role: 'student', studentCampusApprovalStatus: 'pending' }),
    ]);

    const roleCounts = {
      student: 0,
      faculty: 0,
      company: 0,
      admin: 0,
      college: 0,
    };
    roleBreakdown.forEach((row) => {
      if (row?._id) roleCounts[row._id] = row.count;
    });
    // Single source of truth for college accounts (aggregate can drift from find/count).
    roleCounts.college = collegeAccountCount;

    const appStatusCounts = {
      applied: 0,
      reviewing: 0,
      shortlisted: 0,
      rejected: 0,
      hired: 0,
    };
    applications.forEach((a) => {
      const s = a.status;
      if (s && Object.prototype.hasOwnProperty.call(appStatusCounts, s)) {
        appStatusCounts[s] += 1;
      }
    });

    const jobStatusCounts = {
      draft: 0,
      open: 0,
      closed: 0,
    };
    jobStatusBreakdown.forEach((row) => {
      if (row?._id) jobStatusCounts[row._id] = row.count;
    });

    const usersForAdmin = users;

    const pendingFacultyCount = usersForAdmin.filter(
      (u) => u.role === 'faculty' && u.facultyApprovalStatus === 'pending'
    ).length;
    const managedStudentsCount = usersForAdmin.filter(
      (u) => u.role === 'student' && u.managedByCollege
    ).length;

    const studentIds = usersForAdmin
      .filter((u) => u.role === 'student')
      .map((u) => u._id);
    const profileSelect =
      'user course department branch year semester bio studentPhone fatherName motherName fatherPhone motherPhone address city state pincode dateOfBirth bloodGroup emergencyContactName emergencyContactPhone';
    const studentProfiles =
      studentIds.length > 0
        ? await StudentProfile.find({ user: { $in: studentIds } }).select(profileSelect).lean()
        : [];
    const profileByUserId = new Map(studentProfiles.map((p) => [String(p.user), p]));
    const people = usersForAdmin.map((u) => {
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

    const facultyDirectory = registeredFaculty.map((f) => ({
      _id: f._id,
      name: f.name,
      email: f.email,
      facultyApprovalStatus: f.facultyApprovalStatus,
      campusName:
        (f.managedByCollege && f.managedByCollege.name) ||
        (f.affiliatedCollege && f.affiliatedCollege.name) ||
        null,
      createdAt: f.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        totals: {
          totalUsers: usersForAdmin.length,
          totalJobs: jobs.length,
          totalApplications: applications.length,
          pendingFacultyCount,
          pendingStudentCampusCount,
          pendingCollegesCount,
          pendingPlatformCount,
          managedStudentsCount,
          collegeAccountsTotal: collegeAccountCount,
        },
        pendingColleges,
        pendingPlatformUsers,
        registeredColleges,
        registeredCompanies,
        facultyDirectory,
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
        message: 'Please upload an Excel (.xlsx, .xls) or CSV file.',
      });
    }

    const rows = parseTabularFileRows(req.file.buffer, req.file.originalname || '');
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

    const contactPick = {};
    for (const k of CONTACT_PROFILE_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, k)) contactPick[k] = body[k];
    }
    let normalizedContact = {};
    if (Object.keys(contactPick).length) {
      const contactCheck = validateStudentProfileContactFields(contactPick);
      if (!contactCheck.ok) {
        return res.status(400).json({
          success: false,
          message: contactCheck.errors.join(' '),
        });
      }
      normalizedContact = contactCheck.normalized;
    }

    const setDoc = {
      course: t(body.course),
      branch: t(body.branch),
      year: t(body.year),
      semester: t(body.semester),
      bio: t(body.bio),
      address: t(body.address),
      city: t(body.city),
      state: t(body.state),
      bloodGroup: t(body.bloodGroup),
      emergencyContactName: '',
      emergencyContactPhone: '',
      ...normalizedContact,
    };

    const profile = await StudentProfile.findOneAndUpdate(
      { user: id },
      {
        $set: setDoc,
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

// @desc    Delete user (admin) — cascade by role (student, faculty, company)
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

    if (target.role === 'faculty') {
      const assessmentIds = (await Assessment.find({ createdBy: id }).select('_id').lean()).map((a) => a._id);
      if (assessmentIds.length) {
        await AssessmentSubmission.deleteMany({ assessment: { $in: assessmentIds } });
        await Assessment.deleteMany({ _id: { $in: assessmentIds } });
      }
      await AssessmentSubmission.deleteMany({ user: id });
      await StudyMaterial.deleteMany({ createdBy: id });
      await LearningProgress.deleteMany({ user: id });
      await Notification.deleteMany({ recipient: id });
      await User.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message:
          'Faculty account removed. Assessments and materials they created were deleted; submissions they took were cleared.',
      });
    }

    if (target.role === 'company') {
      const jobIds = (await Job.find({ createdBy: id }).select('_id').lean()).map((j) => j._id);
      if (jobIds.length) {
        await JobApplication.deleteMany({ job: { $in: jobIds } });
        await SavedJob.deleteMany({ job: { $in: jobIds } });
        await JobStudentInterest.deleteMany({ job: { $in: jobIds } });
      }
      await Job.deleteMany({ createdBy: id });
      await AssessmentSubmission.deleteMany({ user: id });
      await LearningProgress.deleteMany({ user: id });
      await Notification.deleteMany({ recipient: id });
      await User.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message:
          'Company account removed. Their job postings, applications, and saved-job links for those roles were deleted.',
      });
    }

    return res.status(400).json({
      success: false,
      message:
        'Automated delete is not enabled for this account type (e.g. college — use the campus delete flow).',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

const isStrongPasswordAdmin = (password) => {
  const value = String(password || '');
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
};

// @desc    Create an approved college account (admin)
// @route   POST /api/admin/colleges
// @access  Private (admin only)
exports.createCollegeAccount = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { name, email, password } = req.body || {};
    const norm = String(email || '').trim().toLowerCase();
    if (!name?.trim() || !norm || !password) {
      return res.status(400).json({
        success: false,
        message: 'Provide name, email, and password.',
      });
    }

    if (!isStrongPasswordAdmin(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be at least 8 characters and include uppercase, lowercase, number, and special character.',
      });
    }

    const exists = await User.findOne({ email: norm });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    if (await isCollegeNameTaken(User, name)) {
      return res.status(400).json({
        success: false,
        message: 'A college with this name is already registered.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: norm,
      password: hashedPassword,
      role: 'college',
      collegeApprovalStatus: 'approved',
    });

    res.status(201).json({
      success: true,
      message: 'College account created and approved. They can sign in immediately.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeApprovalStatus: user.collegeApprovalStatus,
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

// @desc    Approve or reject a self-registered college
// @route   PATCH /api/admin/colleges/:id/approval
// @access  Private (admin only)
exports.setCollegeApproval = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const { decision } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'decision must be approved or rejected',
      });
    }

    const user = await User.findById(id);
    if (!user || user.role !== 'college') {
      return res.status(404).json({
        success: false,
        message: 'College account not found',
      });
    }

    user.collegeApprovalStatus = decision;
    await user.save();

    let approvalEmailSent = false;
    let approvalEmailNote = '';

    if (decision === 'approved') {
      try {
        await createNotification({
          recipient: user._id,
          title: 'College account approved',
          message: 'Your college is approved on Learn2Hire. You can sign in and manage your campus.',
          category: 'system',
          type: 'college_approved',
          actionUrl: '/dashboard',
          metadata: {},
        });
      } catch (e) {
        console.error('[Learn2Hire] college approval in-app notify:', e.message || e);
      }

      const mailResult = await sendApprovalGrantedEmail(user.email, {
        recipientName: user.name,
        variant: 'college',
      });
      approvalEmailSent = Boolean(mailResult.sent);
      if (!mailResult.sent) {
        approvalEmailNote =
          mailResult.reason === 'smtp_not_configured'
            ? 'SMTP is not configured on the server — approval was saved but no email was sent. Set SMTP_USER, SMTP_PASS, and SMTP_HOST (or SMTP_SERVICE) in backend/.env.'
            : mailResult.reason === 'send_failed'
              ? `Email could not be sent: ${mailResult.error || 'check SMTP settings and server logs.'}`
              : 'Email was not sent.';
      }
    }

    res.status(200).json({
      success: true,
      message:
        decision === 'approved'
          ? 'College approved. They can sign in now.'
          : 'College registration rejected.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          collegeApprovalStatus: user.collegeApprovalStatus,
        },
        approvalEmailSent,
        approvalEmailNote,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Approve or reject self-registered company (platform approval)
// @route   PATCH /api/admin/users/:id/platform-approval
// @access  Private (admin only)
exports.setPlatformUserApproval = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const { decision } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'decision must be approved or rejected',
      });
    }

    const user = await User.findById(id);
    if (!user || user.role !== 'company') {
      return res.status(404).json({
        success: false,
        message: 'Company account not found or this user is not a self-service company registration.',
      });
    }

    if (decision === 'approved') {
      syncCompanyFullyApproved(user);
    } else {
      user.platformApprovalStatus = decision;
    }
    await user.save();

    let approvalEmailSent = false;
    let approvalEmailNote = '';

    if (decision === 'approved') {
      try {
        await createNotification({
          recipient: user._id,
          title: 'Account approved',
          message:
            'Your company account is approved on Learn2Hire. You can sign in and post roles.',
          category: 'system',
          type: 'platform_approved',
          actionUrl: '/dashboard',
          metadata: {},
        });
      } catch (e) {
        console.error('[Learn2Hire] platform approval in-app notify:', e.message || e);
      }

      const mailResult = await sendApprovalGrantedEmail(user.email, {
        recipientName: user.name,
        variant: 'company',
      });
      approvalEmailSent = Boolean(mailResult.sent);
      if (!mailResult.sent) {
        approvalEmailNote =
          mailResult.reason === 'smtp_not_configured'
            ? 'SMTP is not configured on the server — approval was saved but no email was sent. Set SMTP_USER, SMTP_PASS, and SMTP_HOST (or SMTP_SERVICE) in backend/.env.'
            : mailResult.reason === 'send_failed'
              ? `Email could not be sent: ${mailResult.error || 'check SMTP settings and server logs.'}`
              : 'Email was not sent.';
      }
    } else {
      try {
        await createNotification({
          recipient: user._id,
          title: 'Account not approved',
          message:
            'Your registration was not approved by the platform. Contact support if you have questions.',
          category: 'system',
          type: 'platform_rejected',
          actionUrl: '/dashboard',
          metadata: {},
        });
      } catch (e) {
        console.error('[Learn2Hire] platform rejection notify:', e.message || e);
      }
    }

    res.status(200).json({
      success: true,
      message:
        decision === 'approved'
          ? 'Account approved.'
          : 'Registration rejected for this account.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          platformApprovalStatus: user.platformApprovalStatus,
          partnerCollegeApprovalStatus: user.partnerCollegeApprovalStatus || null,
        },
        approvalEmailSent,
        approvalEmailNote,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

const COLLEGE_DETAIL_PROFILE_SELECT =
  'user course branch year semester bio studentPhone fatherName motherName fatherPhone motherPhone address city state pincode dateOfBirth bloodGroup emergencyContactName emergencyContactPhone';

// @desc    College campus detail (admin): roster-style view
// @route   GET /api/admin/colleges/:id
// @access  Private (admin only)
exports.getCollegeDetail = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const college = await User.findOne({ _id: id, role: 'college' })
      .select('name email role collegeApprovalStatus affiliatedCollege managedByCollege createdAt updatedAt')
      .lean();

    if (!college) {
      return res.status(404).json({
        success: false,
        message: 'College account not found',
      });
    }

    const collegeOid = new mongoose.Types.ObjectId(id);

    const [students, faculty] = await Promise.all([
      User.find({
        role: 'student',
        $or: [{ managedByCollege: collegeOid }, { affiliatedCollege: collegeOid }],
      })
        .select('name email role managedByCollege affiliatedCollege createdAt updatedAt')
        .sort({ name: 1 })
        .lean(),
      User.find({
        role: 'faculty',
        $or: [{ managedByCollege: collegeOid }, { affiliatedCollege: collegeOid }],
      })
        .select(
          'name email role facultyApprovalStatus managedByCollege affiliatedCollege createdAt updatedAt'
        )
        .sort({ name: 1 })
        .lean(),
    ]);

    const studentIds = students.map((s) => s._id);
    const profiles =
      studentIds.length > 0
        ? await StudentProfile.find({ user: { $in: studentIds } })
            .select(COLLEGE_DETAIL_PROFILE_SELECT)
            .lean()
        : [];
    const profileByUserId = new Map(profiles.map((p) => [String(p.user), p]));

    const studentsWithProfile = students.map((s) => {
      const p = profileByUserId.get(String(s._id));
      const profile = p
        ? Object.fromEntries(
            COLLEGE_DETAIL_PROFILE_SELECT.split(' ')
              .filter((k) => k !== 'user')
              .map((k) => [k, p[k] ?? ''])
          )
        : null;
      return { ...s, profile };
    });

    const pendingFacultyCount = faculty.filter((f) => f.facultyApprovalStatus === 'pending').length;

    const facultyIds = faculty.map((f) => f._id);
    const creatorIds = [collegeOid, ...facultyIds];
    const campusAssessments =
      creatorIds.length > 0
        ? await Assessment.find({ createdBy: { $in: creatorIds } })
            .select('title status createdAt maxScore')
            .populate('createdBy', 'name email role')
            .sort({ createdAt: -1 })
            .limit(100)
            .lean()
        : [];

    res.status(200).json({
      success: true,
      data: {
        college,
        stats: {
          studentCount: students.length,
          facultyCount: faculty.length,
          pendingFacultyCount,
        },
        students: studentsWithProfile,
        faculty,
        campusAssessments,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Delete a college campus account (admin); detaches linked students/faculty
// @route   DELETE /api/admin/colleges/:id
// @access  Private (admin only)
exports.deleteCollege = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    const target = await User.findById(id);
    if (!target || target.role !== 'college') {
      return res.status(404).json({
        success: false,
        message: 'College account not found',
      });
    }

    const collegeOid = new mongoose.Types.ObjectId(id);

    const detach = await User.updateMany(
      {
        $or: [{ affiliatedCollege: collegeOid }, { managedByCollege: collegeOid }],
      },
      {
        $set: {
          affiliatedCollege: null,
          managedByCollege: null,
        },
      }
    );

    const assessmentRows = await Assessment.find({ createdBy: id }).select('_id').lean();
    const assessmentIds = assessmentRows.map((a) => a._id);
    if (assessmentIds.length) {
      await AssessmentSubmission.deleteMany({ assessment: { $in: assessmentIds } });
      await Assessment.deleteMany({ _id: { $in: assessmentIds } });
    }

    await Notification.deleteMany({ recipient: id });
    await User.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message:
        'College account removed. Linked students and faculty were detached from this campus (college fields cleared).',
      data: {
        detachedUserCount: detach.modifiedCount ?? 0,
        removedAssessments: assessmentIds.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const {
  asString,
  parseTabularFileRows,
  extractStudentBulkRow,
  cohortRowMatchesTarget,
  displayNameFromEmail,
  defaultStudentPasswordFromRow,
  STUDENT_ROSTER_SHEET_FORMAT_HINT,
} = require('../utils/uploadParsers');
const { createBulkNotifications } = require('../utils/notificationService');
const { sendApprovalGrantedEmail } = require('../utils/otpDelivery');
const {
  getCampusStudentIds,
  resolveCollegeIdForFacultyApproval,
} = require('../utils/campusNotificationRecipients');
const { JOB_CREATED_BY_SELECT } = require('../constants/jobCreatedBySelect');
const { openJobVisibilityFilterForViewer } = require('../utils/jobPostingVisibility');
const { syncCompanyFullyApproved } = require('../utils/campusApproval');

const normalizeRole = (r) => String(r || '').trim().toLowerCase();

const isCollegeOrAdmin = (req) => {
  const r = normalizeRole(req.user?.role);
  return r === 'college' || r === 'admin';
};

const isApprovedFaculty = (req) => {
  if (normalizeRole(req.user?.role) !== 'faculty') return false;
  const st = req.user.facultyApprovalStatus;
  return st === 'approved' || st === undefined;
};

/** College, admin, or approved faculty adding students; college/admin may add faculty too. */
const canCreateRosterUser = (req, targetRole) => {
  const r = normalizeRole(req.user?.role);
  if (r === 'admin' || r === 'college') return true;
  if (r === 'faculty' && isApprovedFaculty(req)) {
    return targetRole === 'student';
  }
  return false;
};

const resolveRosterCollegeId = async (req) => {
  const role = normalizeRole(req.user.role);
  if (role === 'college') {
    return req.user._id;
  }
  if (role === 'faculty') {
    const cid = req.user.affiliatedCollege || req.user.managedByCollege;
    if (!cid) {
      throw new Error('FACULTY_NO_COLLEGE');
    }
    return cid;
  }
  if (role === 'admin') {
    const rawCid = req.body.collegeId;
    if (!rawCid || !mongoose.Types.ObjectId.isValid(String(rawCid))) {
      throw new Error('ADMIN_COLLEGE_REQUIRED');
    }
    const collegeUser = await User.findById(rawCid);
    if (!collegeUser || collegeUser.role !== 'college') {
      throw new Error('ADMIN_COLLEGE_INVALID');
    }
    const cst = collegeUser.collegeApprovalStatus;
    if (cst === 'pending' || cst === 'rejected') {
      throw new Error('ADMIN_COLLEGE_NOT_APPROVED');
    }
    return collegeUser._id;
  }
  throw new Error('ROLE');
};

/** College, platform admin, or approved faculty (imports go to their affiliated college). */
const canBulkImportStudents = (req) => {
  const r = normalizeRole(req.user?.role);
  if (r === 'admin' || r === 'college') return true;
  if (r === 'faculty') return isApprovedFaculty(req);
  return false;
};

const studentCampusCollegeId = (u) => u.managedByCollege || u.affiliatedCollege;

const canReviewStudentCampusApproval = (req, studentUser) => {
  if (!studentUser || studentUser.role !== 'student') return false;
  const r = normalizeRole(req.user.role);
  if (r === 'admin') return true;
  const campusId = studentCampusCollegeId(studentUser);
  if (!campusId) return false;
  if (r === 'college' && String(req.user._id) === String(campusId)) return true;
  if (r === 'faculty' && isApprovedFaculty(req)) {
    const fid = req.user.affiliatedCollege || req.user.managedByCollege;
    return fid && String(fid) === String(campusId);
  }
  return false;
};

const isCollegeFacultyOrAdmin = (req) => {
  const r = normalizeRole(req.user.role);
  if (r === 'college' || r === 'admin') return true;
  return r === 'faculty' && isApprovedFaculty(req);
};

const resolveStudentImportCollegeId = async (req) => {
  const role = normalizeRole(req.user.role);
  if (role === 'college') {
    return req.user._id;
  }
  if (role === 'faculty') {
    const cid = req.user.affiliatedCollege;
    if (!cid) {
      throw new Error('FACULTY_NO_COLLEGE');
    }
    return cid;
  }
  if (role === 'admin') {
    const rawCid = req.body.collegeId;
    if (!rawCid || !mongoose.Types.ObjectId.isValid(String(rawCid))) {
      throw new Error('ADMIN_COLLEGE_REQUIRED');
    }
    const collegeUser = await User.findById(rawCid);
    if (!collegeUser || collegeUser.role !== 'college') {
      throw new Error('ADMIN_COLLEGE_INVALID');
    }
    const cst = collegeUser.collegeApprovalStatus;
    if (cst === 'pending' || cst === 'rejected') {
      throw new Error('ADMIN_COLLEGE_NOT_APPROVED');
    }
    return collegeUser._id;
  }
  throw new Error('ROLE');
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

    const query = {
      role: 'faculty',
      facultyApprovalStatus: 'pending',
    };
    if (normalizeRole(req.user.role) === 'college') {
      query.affiliatedCollege = req.user._id;
    }

    const pending = await User.find(query)
      .select('name email facultyApprovalStatus affiliatedCollege managedByCollege createdAt')
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

// @desc    Students awaiting campus approval (self-service signups)
// @route   GET /api/college/students/pending
exports.getPendingStudents = async (req, res) => {
  try {
    if (!isCollegeFacultyOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only an approved college account, approved faculty, or admin can view pending students.',
      });
    }

    const q = { role: 'student', studentCampusApprovalStatus: 'pending' };
    const r = normalizeRole(req.user.role);
    if (r === 'college') {
      q.$or = [
        { affiliatedCollege: req.user._id },
        { managedByCollege: req.user._id },
      ];
    } else if (r === 'faculty') {
      const cid = req.user.affiliatedCollege || req.user.managedByCollege;
      if (!cid) {
        return res.status(200).json({ success: true, count: 0, data: { users: [] } });
      }
      q.$or = [{ affiliatedCollege: cid }, { managedByCollege: cid }];
    }

    const pending = await User.find(q)
      .select(
        'name email affiliatedCollege managedByCollege studentCampusApprovalStatus createdAt'
      )
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

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

// @desc    Approve or reject a self-registered student for a campus
// @route   PATCH /api/college/students/:id/campus-approval
exports.setStudentCampusApproval = async (req, res) => {
  try {
    if (!isCollegeFacultyOrAdmin(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only an approved college account, approved faculty, or admin can approve students.',
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
    if (!user || user.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student user not found',
      });
    }

    if (!canReviewStudentCampusApproval(req, user)) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to approve this student.',
      });
    }

    user.studentCampusApprovalStatus = decision;
    await user.save();

    if (decision === 'approved') {
      try {
        await createNotification({
          recipient: user._id,
          title: 'Campus approval granted',
          message: 'Your student account was approved. You can now use Learn2Hire.',
          category: 'system',
          type: 'student_campus_approved',
          actionUrl: '/dashboard',
          metadata: { studentId: user._id },
        });
      } catch (e) {
        console.error('[Learn2Hire] student campus approval notify:', e.message || e);
      }
    }

    res.status(200).json({
      success: true,
      message:
        decision === 'approved'
          ? 'Student account approved.'
          : 'Student registration was not approved.',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          studentCampusApprovalStatus: user.studentCampusApprovalStatus,
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

// @desc    Partner college approves or rejects a company that selected this campus
// @route   PATCH /api/college/companies/:id/partner-approval
exports.setCompanyPartnerApproval = async (req, res) => {
  try {
    if (normalizeRole(req.user.role) !== 'college') {
      return res.status(403).json({
        success: false,
        message: 'Only campus accounts can respond to partnership requests.',
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

    const companyUser = await User.findById(id);
    if (!companyUser || companyUser.role !== 'company') {
      return res.status(404).json({
        success: false,
        message: 'Company account not found',
      });
    }

    if (
      !companyUser.partnerCollege ||
      String(companyUser.partnerCollege) !== String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message: 'This employer did not request partnership with your campus.',
      });
    }

    if (decision === 'approved') {
      syncCompanyFullyApproved(companyUser);
    } else {
      companyUser.partnerCollegeApprovalStatus = 'rejected';
    }
    await companyUser.save();

    if (decision === 'approved') {
      try {
        await createNotification({
          recipient: companyUser._id,
          title: 'Partnership approved',
          message: `${req.user.name} approved your campus partnership on Learn2Hire. You can sign in if you have not already.`,
          category: 'system',
          type: 'company_partner_approved',
          actionUrl: '/login',
          metadata: { companyId: companyUser._id },
        });
      } catch (e) {
        console.error('[Learn2Hire] company partner notify:', e.message || e);
      }
    }

    res.status(200).json({
      success: true,
      message:
        decision === 'approved'
          ? 'Partnership approved. The company account is fully approved on the platform.'
          : 'Partnership request was not approved.',
      data: {
        user: {
          id: companyUser._id,
          platformApprovalStatus: companyUser.platformApprovalStatus,
          partnerCollegeApprovalStatus: companyUser.partnerCollegeApprovalStatus,
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

// @desc    Add student or faculty to campus roster. Students require class (course, branch, year); optional semester/department.
//          College or admin may add students or faculty; approved faculty may add students only.
// @route   POST /api/college/roster
exports.createRosterUser = async (req, res) => {
  try {
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

    if (!canCreateRosterUser(req, targetRole)) {
      const r = normalizeRole(req.user.role);
      return res.status(403).json({
        success: false,
        message:
          r === 'faculty'
            ? 'Faculty can add students to the roster. To add another teacher, ask your college admin.'
            : 'You are not allowed to create roster accounts.',
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

    let collegeId;
    try {
      collegeId = await resolveRosterCollegeId(req);
    } catch (e) {
      const code = e.message;
      if (code === 'FACULTY_NO_COLLEGE') {
        return res.status(400).json({
          success: false,
          message: 'Your faculty profile must be linked to a college before adding students.',
        });
      }
      if (code === 'ADMIN_COLLEGE_REQUIRED') {
        return res.status(400).json({
          success: false,
          message: 'Admin must specify collegeId (approved college user id) when adding roster accounts.',
        });
      }
      if (code === 'ADMIN_COLLEGE_INVALID') {
        return res.status(400).json({
          success: false,
          message: 'Invalid collegeId. Must be an existing college account.',
        });
      }
      if (code === 'ADMIN_COLLEGE_NOT_APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'That college is not approved yet; choose an approved college.',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Not allowed to resolve college for this roster action.',
      });
    }

    let course = '';
    let branch = '';
    let year = '';
    let semester = '';
    let department = '';

    if (targetRole === 'student') {
      course = asString(req.body.course);
      branch = asString(req.body.branch);
      year = asString(req.body.year);
      semester = asString(req.body.semester);
      department = asString(req.body.department);
      if (!course || !branch || !year) {
        return res.status(400).json({
          success: false,
          message:
            'For each student, provide class details: program (course), branch, and year. Optional: semester, department.',
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const doc = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: targetRole,
      managedByCollege: collegeId,
      affiliatedCollege: collegeId,
    };

    if (targetRole === 'student') {
      doc.studentCampusApprovalStatus = 'approved';
    }

    if (targetRole === 'faculty') {
      doc.facultyApprovalStatus = 'approved';
    }

    const user = await User.create(doc);

    if (targetRole === 'student') {
      await StudentProfile.create({
        user: user._id,
        course,
        branch,
        year,
        semester: semester || '',
        department: department || '',
      });
    }

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
    if (decision === 'approved') {
      if (normalizeRole(req.user.role) === 'college') {
        user.managedByCollege = req.user._id;
      } else {
        user.managedByCollege = user.affiliatedCollege || user.managedByCollege;
      }
    }
    await user.save();

    let approvalEmailSent = false;
    let approvalEmailNote = '';

    if (decision === 'approved') {
      const campusId = resolveCollegeIdForFacultyApproval(req, user);
      const recipientIds = campusId ? await getCampusStudentIds(campusId) : [];
      if (recipientIds.length) {
        try {
          await createBulkNotifications({
            recipientIds,
            title: 'New faculty member',
            message: `${user.name} has joined the teaching team.`,
            category: 'system',
            type: 'faculty_joined',
            actionUrl: '/dashboard/learning',
            metadata: { facultyId: user._id },
          });
        } catch (e) {
          console.error('[Learn2Hire] faculty approval campus notify:', e.message || e);
        }
      }

      const mailResult = await sendApprovalGrantedEmail(user.email, {
        recipientName: user.name,
        variant: 'faculty_full',
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

    const openJobsQuery = isCollege
      ? { status: 'open', ...openJobVisibilityFilterForViewer(req.user) }
      : { status: 'open' };

    const pendingFacultyQuery = isCollege
      ? {
          role: 'faculty',
          facultyApprovalStatus: 'pending',
          affiliatedCollege: collegeId,
        }
      : { role: 'faculty', facultyApprovalStatus: 'pending' };

    const pendingStudentQuery = isCollege
      ? {
          role: 'student',
          studentCampusApprovalStatus: 'pending',
          $or: [
            { affiliatedCollege: collegeId },
            { managedByCollege: collegeId },
          ],
        }
      : {
          role: 'student',
          studentCampusApprovalStatus: 'pending',
        };

    const [
      rosterStudents,
      rosterFaculty,
      pendingFacultyCount,
      pendingStudentsCount,
      registeredCompanies,
      companyCount,
      openJobsList,
      openJobsCount,
      campusStudentDocs,
    ] = await Promise.all([
      User.countDocuments({ ...campusFilter, role: 'student' }),
      User.countDocuments({ ...campusFilter, role: 'faculty' }),
      User.countDocuments(pendingFacultyQuery),
      User.countDocuments(pendingStudentQuery),
      User.find({ role: 'company' })
        .select('name email createdAt')
        .sort({ createdAt: -1 })
        .limit(40)
        .lean(),
      User.countDocuments({ role: 'company' }),
      Job.find(openJobsQuery)
        .populate('createdBy', JOB_CREATED_BY_SELECT)
        .populate('targetCollege', 'name email role')
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      Job.countDocuments(openJobsQuery),
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

    let pendingPartnerCompanies = [];
    if (isCollege) {
      pendingPartnerCompanies = await User.find({
        role: 'company',
        partnerCollege: collegeId,
        partnerCollegeApprovalStatus: 'pending',
      })
        .select(
          'name email platformApprovalStatus partnerCollegeApprovalStatus createdAt'
        )
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
    }

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        campus: {
          rosterStudents,
          rosterFaculty,
          rosterTotal: rosterStudents + rosterFaculty,
          pendingFacultyReview: pendingFacultyCount,
          pendingStudentReview: pendingStudentsCount,
        },
        hiring: {
          registeredCompanies: companyCount,
          openRoles: openJobsCount,
          companies: registeredCompanies,
          openJobs: openJobsList,
          pendingPartnerCompanies,
          pendingPartnerReview: pendingPartnerCompanies.length,
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

// @desc    Bulk import students (Excel or CSV). College, approved faculty, or admin.
//          Form fields: targetCourse, targetProgram, targetYear, targetSemester (optional).
//          Admin also sends collegeId. Each row must match the target class (course, branch, year).
//          Sheet headers: S.No., Name, Department, Branch, Course, Semester, Year, Contact number, Email id
//          (Branch may be labeled Program). Password default: Firstname@123
// @route   POST /api/college/roster/import/students
exports.importStudentsFromSheet = async (req, res) => {
  try {
    if (!canBulkImportStudents(req)) {
      return res.status(403).json({
        success: false,
        message:
          'Only an approved college account, approved faculty, or admin can import students.',
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel (.xlsx, .xls) or CSV file.',
      });
    }

    let collegeId;
    try {
      collegeId = await resolveStudentImportCollegeId(req);
    } catch (e) {
      const code = e.message;
      if (code === 'FACULTY_NO_COLLEGE') {
        return res.status(400).json({
          success: false,
          message: 'Your faculty profile must be linked to a college before importing students.',
        });
      }
      if (code === 'ADMIN_COLLEGE_REQUIRED') {
        return res.status(400).json({
          success: false,
          message: 'Admin must pass collegeId (approved college user id) with this import.',
        });
      }
      if (code === 'ADMIN_COLLEGE_INVALID') {
        return res.status(400).json({
          success: false,
          message: 'Invalid collegeId.',
        });
      }
      if (code === 'ADMIN_COLLEGE_NOT_APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'That college is not approved yet.',
        });
      }
      return res.status(403).json({
        success: false,
        message: 'Not allowed to resolve college for import.',
      });
    }

    const targetCourse = asString(req.body.targetCourse);
    const targetProgram = asString(req.body.targetProgram);
    const targetYear = asString(req.body.targetYear);
    const targetSemester = asString(req.body.targetSemester);

    if (!targetCourse || !targetProgram || !targetYear) {
      return res.status(400).json({
        success: false,
        message:
          'Specify the class for this upload: targetCourse, targetProgram, and targetYear must match each row in the file.',
      });
    }

    const target = { course: targetCourse, program: targetProgram, year: targetYear };
    const rows = parseTabularFileRows(req.file.buffer, req.file.originalname || '');
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Sheet is empty.',
      });
    }

    const results = [];

    for (const raw of rows) {
      const extracted = extractStudentBulkRow(raw);
      const email = asString(extracted.email).toLowerCase();

      if (!email) {
        results.push({
          email: '',
          ok: false,
          message: 'Missing email',
          sno: extracted.sno || '',
        });
        continue;
      }

      if (!cohortRowMatchesTarget(extracted, target)) {
        results.push({
          email,
          ok: false,
          message: `Row class (${extracted.course} / ${extracted.branch || extracted.program} / ${extracted.year}) does not match selected class (${targetCourse} / ${targetProgram} / ${targetYear}).`,
          sno: extracted.sno || '',
        });
        continue;
      }

      const displayName = asString(extracted.name) || displayNameFromEmail(email);
      const plainPassword = defaultStudentPasswordFromRow({
        ...extracted,
        email,
        name: extracted.name,
      });

      const exists = await User.findOne({ email });
      if (exists) {
        results.push({ email, ok: false, message: 'Email already exists', sno: extracted.sno || '' });
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);

      const user = await User.create({
        name: displayName,
        email,
        password: hashedPassword,
        role: 'student',
        managedByCollege: collegeId,
        affiliatedCollege: collegeId,
        studentCampusApprovalStatus: 'approved',
      });

      const semesterVal = asString(extracted.semester) || asString(targetSemester);

      await StudentProfile.create({
        user: user._id,
        course: extracted.course,
        department: asString(extracted.department),
        branch: extracted.branch || extracted.program,
        year: extracted.year,
        semester: semesterVal,
        studentPhone: asString(extracted.contact),
      });

      results.push({
        email,
        ok: true,
        message: 'Created',
        sno: extracted.sno || '',
        defaultPasswordHint: 'Firstname@123',
      });
    }

    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;

    res.status(200).json({
      success: true,
      message: `Student import finished. Created: ${created}, Failed: ${failed}`,
      data: {
        created,
        failed,
        results,
        templateHint: STUDENT_ROSTER_SHEET_FORMAT_HINT,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

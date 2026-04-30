const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const JobStudentInterest = require('../models/JobStudentInterest');
const SavedJob = require('../models/SavedJob');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const LearningProgress = require('../models/LearningProgress');
const { getLearnerInsights } = require('../utils/learnerInsights');
const {
  createBulkNotifications,
  createNotification,
} = require('../utils/notificationService');
const { JOB_CREATED_BY_SELECT } = require('../constants/jobCreatedBySelect');
const {
  isAllowedPrivateResumeRel,
  persistResumeBufferForUser,
  removeResumeFile,
} = require('./studentResumeController');
const {
  LEARNER_JOB_BROWSER_ROLES,
  canViewerSeeOpenJob,
  openJobVisibilityFilterForViewer,
} = require('../utils/jobPostingVisibility');

const companyRoles = ['company'];
const applicantRoles = ['student'];

const TARGET_COLLEGE_SELECT = 'name email role collegeApprovalStatus';

async function resolvePostingFields(body) {
  const rawAudience = String(body.postingAudience || body.posting_audience || '').toLowerCase();
  const postingAudience =
    rawAudience === 'single_college' || rawAudience === 'single' ? 'single_college' : 'all_colleges';

  if (postingAudience === 'all_colleges') {
    return { postingAudience: 'all_colleges', targetCollege: null };
  }

  const targetCollegeId = body.targetCollegeId || body.targetCollege || body.collegeId;
  if (!targetCollegeId || !mongoose.Types.ObjectId.isValid(String(targetCollegeId))) {
    return {
      error: 'Choose a partner college for a campus-specific job, or post to all colleges.',
    };
  }

  const collegeUser = await User.findOne({
    _id: targetCollegeId,
    role: 'college',
    $or: [
      { collegeApprovalStatus: { $exists: false } },
      { collegeApprovalStatus: null },
      { collegeApprovalStatus: 'approved' },
    ],
  }).select('_id');

  if (!collegeUser) {
    return {
      error: 'That campus was not found or is not approved for hiring on Learn2Hire yet.',
    };
  }

  return { postingAudience: 'single_college', targetCollege: collegeUser._id };
}

async function studentIdsToNotifyForOpenJob(job) {
  if (job.postingAudience === 'single_college' && job.targetCollege) {
    const tid = job.targetCollege;
    const studs = await User.find({
      role: 'student',
      $or: [{ managedByCollege: tid }, { affiliatedCollege: tid }],
    })
      .select('_id')
      .lean();
    return studs.map((s) => s._id);
  }

  const studs = await User.find({ role: 'student' }).select('_id').lean();
  return studs.map((s) => s._id);
}

const normalizeSkills = (skillsRequired) => {
  if (!Array.isArray(skillsRequired)) return [];

  return skillsRequired
    .map((skill) => String(skill || '').trim())
    .filter(Boolean);
};

const ensureValidId = (id, label) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return `${label} ID is invalid`;
  }

  return null;
};

function sanitizeJobApplicationClient(applicationDoc) {
  const base = applicationDoc.toObject ? applicationDoc.toObject() : { ...applicationDoc };
  const hasResumeFile = Boolean(base.resumeRelativePath);
  const resumeOriginalName = base.resumeOriginalName || '';
  delete base.resumeRelativePath;
  return { ...base, hasResumeFile, resumeOriginalName };
}

const buildJobFilters = (query, user) => {
  const filters = { ...getJobQueryByRole(user) };
  const visibilityOr = filters.$or;

  if (query.search) {
    const searchOr = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { location: { $regex: query.search, $options: 'i' } },
    ];
    if (visibilityOr) {
      filters.$and = [{ $or: visibilityOr }, { $or: searchOr }];
      delete filters.$or;
    } else {
      filters.$or = searchOr;
    }
  }

  if (query.location) {
    filters.location = { $regex: query.location, $options: 'i' };
  }

  if (query.employmentType) {
    filters.employmentType = query.employmentType;
  }

  if (query.skill) {
    filters.skillsRequired = { $regex: query.skill, $options: 'i' };
  }

  if (query.status && (user.role === 'admin' || companyRoles.includes(user.role))) {
    filters.status = query.status;
  }

  return filters;
};

const getJobQueryByRole = (user) => {
  if (user.role === 'admin') {
    return {};
  }

  if (companyRoles.includes(user.role)) {
    return { createdBy: user._id };
  }

  if (LEARNER_JOB_BROWSER_ROLES.includes(user.role)) {
    return { status: 'open', ...openJobVisibilityFilterForViewer(user) };
  }

  return { status: 'open' };
};

const normalizeForMatch = (value) => String(value || '').trim().toLowerCase();

const getMatchedSkills = (skillsRequired, learnerSkills) => {
  const normalizedRequired = normalizeSkills(skillsRequired).map(normalizeForMatch);

  return learnerSkills.filter((learnerSkill) =>
    normalizedRequired.some(
      (requiredSkill) =>
        requiredSkill.includes(learnerSkill) || learnerSkill.includes(requiredSkill)
    )
  );
};

// @desc    Get jobs based on current user role
// @route   GET /api/jobs
// @access  Private
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find(buildJobFilters(req.query, req.user))
      .populate('createdBy', JOB_CREATED_BY_SELECT)
      .populate('targetCollege', TARGET_COLLEGE_SELECT)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: jobs.length,
      data: { jobs },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get personalized job suggestions
// @route   GET /api/jobs/suggestions/me
// @access  Private (student only)
exports.getSuggestedJobs = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can view job suggestions.',
      });
    }

    const [profile, applications, savedJobs, jobs] = await Promise.all([
      StudentProfile.findOne({ user: req.user._id }).select('skills').lean(),
      JobApplication.find({ student: req.user._id }).select('job').lean(),
      SavedJob.find({ student: req.user._id }).select('job').lean(),
      Job.find({
        status: 'open',
        ...openJobVisibilityFilterForViewer(req.user),
      })
        .populate('createdBy', JOB_CREATED_BY_SELECT)
        .populate('targetCollege', TARGET_COLLEGE_SELECT)
        .sort({ createdAt: -1 }),
    ]);

    const insights = profile ? null : await getLearnerInsights(req.user._id);

    const learnerSkills = ((profile?.skills || insights?.skills || []))
      .map((skill) => normalizeForMatch(skill.name))
      .filter(Boolean);

    const appliedJobIds = new Set(applications.map((item) => item.job?.toString()).filter(Boolean));
    const savedJobIds = new Set(savedJobs.map((item) => item.job?.toString()).filter(Boolean));

    const suggestions = jobs
      .map((job) => {
        const matchedSkills = getMatchedSkills(job.skillsRequired, learnerSkills);
        const score =
          matchedSkills.length * 10 +
          (savedJobIds.has(job._id.toString()) ? 2 : 0) +
          (job.employmentType === 'internship' ? 1 : 0);

        return {
          ...job.toObject(),
          matchedSkills,
          isSaved: savedJobIds.has(job._id.toString()),
          suggestionScore: score,
          suggestionReason: matchedSkills.length
            ? `Matches your skills: ${matchedSkills.join(', ')}`
            : learnerSkills.length
              ? 'Recommended from current open jobs based on your learner activity.'
              : 'Latest open opportunity available for your account.',
        };
      })
      .filter((job) => !appliedJobIds.has(job._id.toString()))
      .sort((a, b) => b.suggestionScore - a.suggestionScore || new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 6);

    res.status(200).json({
      success: true,
      count: suggestions.length,
      data: {
        jobs: suggestions,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get single job
// @route   GET /api/jobs/:id
// @access  Private
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id)
      .populate('createdBy', JOB_CREATED_BY_SELECT)
      .populate('targetCollege', TARGET_COLLEGE_SELECT);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const isOwner = job.createdBy._id.toString() === req.user._id.toString();
    const canView =
      req.user.role === 'admin' ||
      isOwner ||
      (job.status === 'open' &&
        LEARNER_JOB_BROWSER_ROLES.includes(req.user.role) &&
        canViewerSeeOpenJob(job, req.user));

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this job',
      });
    }

    let studentHasExpressedInterest = false;
    if (applicantRoles.includes(req.user.role)) {
      const interest = await JobStudentInterest.findOne({
        job: id,
        student: req.user._id,
      })
        .select('_id')
        .lean();
      studentHasExpressedInterest = Boolean(interest);
    }

    res.status(200).json({
      success: true,
      data: { job, studentHasExpressedInterest },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Create job
// @route   POST /api/jobs
// @access  Private (company only)
exports.createJob = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company or admin users can create job posts.',
      });
    }

    const { title, description, location, employmentType, skillsRequired, status } =
      req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a job title',
      });
    }

    const posting = await resolvePostingFields(req.body);
    if (posting.error) {
      return res.status(400).json({
        success: false,
        message: posting.error,
      });
    }

    const job = await Job.create({
      title,
      description: description || '',
      location: location || '',
      employmentType: employmentType || 'full-time',
      skillsRequired: normalizeSkills(skillsRequired),
      status: status || 'draft',
      createdBy: req.user._id,
      postingAudience: posting.postingAudience,
      targetCollege: posting.targetCollege,
    });

    const populatedJob = await Job.findById(job._id)
      .populate('createdBy', JOB_CREATED_BY_SELECT)
      .populate('targetCollege', TARGET_COLLEGE_SELECT);

    if (job.status === 'open') {
      const recipientIds = await studentIdsToNotifyForOpenJob(job);
      const scopeNote =
        job.postingAudience === 'single_college'
          ? ' This role is shared with your campus only.'
          : '';

      await createBulkNotifications({
        recipientIds,
        title: 'New job posted',
        message: `${job.title} is now open for applications.${scopeNote} Check the listing for details and any uploaded job description (JD).`,
        category: 'job',
        type: 'job_posted',
        actionUrl: `/jobs/${job._id}`,
        metadata: {
          jobId: job._id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: { job: populatedJob },
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

// @desc    Update job
// @route   PUT /api/jobs/:id
// @access  Private (company owner only)
exports.updateJob = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company or admin users can update job posts.',
      });
    }

    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (
      req.user.role !== 'admin' &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own job posts.',
      });
    }

    const previousStatus = job.status;

    const { title, description, location, employmentType, skillsRequired, status } =
      req.body;

    if (title !== undefined) job.title = title;
    if (description !== undefined) job.description = description;
    if (location !== undefined) job.location = location;
    if (employmentType !== undefined) job.employmentType = employmentType;
    if (skillsRequired !== undefined) {
      job.skillsRequired = normalizeSkills(skillsRequired);
    }
    if (status !== undefined) job.status = status;

    const postingKeys = ['postingAudience', 'posting_audience', 'targetCollegeId', 'targetCollege', 'collegeId'];
    if (postingKeys.some((k) => Object.prototype.hasOwnProperty.call(req.body, k))) {
      const posting = await resolvePostingFields(req.body);
      if (posting.error) {
        return res.status(400).json({
          success: false,
          message: posting.error,
        });
      }
      job.postingAudience = posting.postingAudience;
      job.targetCollege = posting.targetCollege;
    }

    await job.save();

    const populatedJob = await Job.findById(job._id)
      .populate('createdBy', JOB_CREATED_BY_SELECT)
      .populate('targetCollege', TARGET_COLLEGE_SELECT);

    if (previousStatus !== 'open' && job.status === 'open') {
      const recipientIds = await studentIdsToNotifyForOpenJob(job);
      const scopeNote =
        job.postingAudience === 'single_college'
          ? ' This role is shared with your campus only.'
          : '';

      await createBulkNotifications({
        recipientIds,
        title: 'Job is now open',
        message: `${job.title} is now available for applications.${scopeNote}`,
        category: 'job',
        type: 'job_opened',
        actionUrl: `/jobs/${job._id}`,
        metadata: {
          jobId: job._id,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: { job: populatedJob },
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

// @desc    Delete job
// @route   DELETE /api/jobs/:id
// @access  Private (company owner only)
exports.deleteJob = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company or admin users can delete job posts.',
      });
    }

    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (
      req.user.role !== 'admin' &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own job posts.',
      });
    }

    await JobApplication.deleteMany({ job: job._id });
    await SavedJob.deleteMany({ job: job._id });
    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Apply to job
// @route   POST /api/jobs/:id/apply
// @access  Private (student only)
exports.applyToJob = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can apply to jobs.',
      });
    }

    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job || job.status !== 'open') {
      return res.status(404).json({
        success: false,
        message: 'Open job not found',
      });
    }

    if (!canViewerSeeOpenJob(job, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'This role is posted for a different campus.',
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message:
          'Please upload your résumé as a PDF or Word file (form field name: resume).',
      });
    }

    let resumeRelativePath = '';
    let resumeOriginalName = '';
    try {
      ({ resumeRelativePath, resumeOriginalName } = persistResumeBufferForUser(
        req.user._id,
        req.file
      ));
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: e.message || 'Invalid résumé file.',
      });
    }

    let application;
    try {
      application = await JobApplication.create({
        job: job._id,
        student: req.user._id,
        coverLetter: String(req.body.coverLetter || '').trim(),
        portfolioLink: String(req.body.portfolioLink || '').trim(),
        resumeRelativePath,
        resumeOriginalName,
      });
    } catch (createErr) {
      removeResumeFile(resumeRelativePath);
      throw createErr;
    }

    const populatedApplication = await JobApplication.findById(application._id)
      .populate('job', 'title description location employmentType status skillsRequired')
      .populate('student', 'name email role');

    const hasResumeFile = Boolean(application.resumeRelativePath);

    await createNotification({
      recipient: req.user._id,
      title: 'Job application submitted',
      message: `Your application for ${job.title} has been sent successfully.`,
      category: 'job',
      type: 'job_application_submitted',
      actionUrl: `/jobs/${job._id}`,
      metadata: {
        jobId: job._id,
        applicationId: application._id,
      },
    });

    await createNotification({
      recipient: job.createdBy,
      title: 'New job application',
      message: `${req.user.name} applied for ${job.title}.${hasResumeFile ? ' A résumé file is attached—download it from the applicant list.' : ''}`,
      category: 'job',
      type: 'job_application_received',
      actionUrl: '/company/jobs',
      metadata: {
        jobId: job._id,
        applicationId: application._id,
        applicantId: req.user._id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application: sanitizeJobApplicationClient(populatedApplication) },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job.',
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Student expresses interest in a job (notifies company)
// @route   POST /api/jobs/student/express-interest  body: { jobId, message? }
// @access  Private (student only)
exports.expressStudentJobInterest = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can express interest in a job.',
      });
    }

    const id = req.body?.jobId;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job || job.status !== 'open') {
      return res.status(404).json({
        success: false,
        message: 'Open job not found',
      });
    }

    if (!canViewerSeeOpenJob(job, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'This role is posted for a different campus.',
      });
    }

    const existingApplication = await JobApplication.findOne({
      job: job._id,
      student: req.user._id,
    })
      .select('_id')
      .lean();
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already applied for this role. The company has been notified.',
      });
    }

    const note = String(req.body?.message || '').trim().slice(0, 500);

    await JobStudentInterest.create({
      job: job._id,
      student: req.user._id,
      message: note,
      resumeRelativePath: '',
      resumeOriginalName: '',
    });

    const interestLine = note ? ` Note: "${note}"` : '';

    await createNotification({
      recipient: job.createdBy,
      title: 'Student expressed interest',
      message: `${req.user.name} is interested in your post "${job.title}".${interestLine}`,
      category: 'job',
      type: 'student_expressed_job_interest',
      actionUrl: '/company/jobs',
      metadata: {
        jobId: job._id,
        studentId: req.user._id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'The company has been notified of your interest.',
      data: { studentHasExpressedInterest: true },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already expressed interest in this job.',
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get my job applications
// @route   GET /api/jobs/applications/me
// @access  Private (student only)
exports.getMyApplications = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their applications.',
      });
    }

    const applications = await JobApplication.find({ student: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'createdBy',
          select: JOB_CREATED_BY_SELECT,
        },
      })
      .sort({ appliedAt: -1 });

    const safe = applications.map((a) => sanitizeJobApplicationClient(a));

    res.status(200).json({
      success: true,
      count: safe.length,
      data: { applications: safe },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get my saved jobs
// @route   GET /api/jobs/saved/me
// @access  Private (student only)
exports.getSavedJobs = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can view saved jobs.',
      });
    }

    const savedJobs = await SavedJob.find({ student: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'createdBy',
          select: JOB_CREATED_BY_SELECT,
        },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: savedJobs.length,
      data: { savedJobs },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Save job
// @route   POST /api/jobs/:id/save
// @access  Private (student only)
exports.saveJob = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can save jobs.',
      });
    }

    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job || job.status !== 'open') {
      return res.status(404).json({
        success: false,
        message: 'Open job not found',
      });
    }

    if (!canViewerSeeOpenJob(job, req.user)) {
      return res.status(403).json({
        success: false,
        message: 'This role is posted for a different campus.',
      });
    }

    const savedJob = await SavedJob.create({
      student: req.user._id,
      job: id,
    });

    const populatedSavedJob = await SavedJob.findById(savedJob._id).populate({
      path: 'job',
      populate: {
        path: 'createdBy',
        select: JOB_CREATED_BY_SELECT,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Job saved successfully',
      data: { savedJob: populatedSavedJob },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already saved this job.',
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Unsave job
// @route   DELETE /api/jobs/:id/save
// @access  Private (student only)
exports.unsaveJob = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students can remove saved jobs.',
      });
    }

    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    await SavedJob.findOneAndDelete({
      student: req.user._id,
      job: id,
    });

    res.status(200).json({
      success: true,
      message: 'Saved job removed successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get applications for a company job
// @route   GET /api/jobs/:id/applications
// @access  Private (company owner/admin)
exports.getApplicationsForJob = async (req, res) => {
  try {
    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const isOwner = job.createdBy.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only review applications for your own jobs.',
      });
    }

    const applications = await JobApplication.find({ job: id })
      .populate('student', 'name email role')
      .sort({ appliedAt: -1 });

    const studentIds = applications.map((item) => item.student?._id).filter(Boolean);
    const profiles = await StudentProfile.find({ user: { $in: studentIds } })
      .select('user bio overallScore skills stats')
      .lean();

    const profileMap = Object.fromEntries(
      profiles.map((profile) => [profile.user.toString(), profile])
    );

    const enrichedApplications = applications.map((application) => {
      const studentId = application.student?._id?.toString();
      const base = sanitizeJobApplicationClient(application);

      return {
        ...base,
        studentProfile: studentId ? profileMap[studentId] || null : null,
      };
    });

    res.status(200).json({
      success: true,
      count: enrichedApplications.length,
      data: {
        applications: enrichedApplications,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Interested students for a job (no full application yet)
// @route   GET /api/jobs/:id/interests
// @access  Private (company owner / admin)
exports.getInterestsForJob = async (req, res) => {
  try {
    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const isOwner = job.createdBy.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only view interest for your own jobs.',
      });
    }

    const interests = await JobStudentInterest.find({ job: id })
      .populate('student', 'name email role')
      .sort({ createdAt: -1 });

    const data = interests.map((item) => {
      const o = item.toObject();
      const hasResumeFile = Boolean(o.resumeRelativePath);
      const resumeOriginalName = o.resumeOriginalName || '';
      delete o.resumeRelativePath;
      return { ...o, hasResumeFile, resumeOriginalName };
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data: { interests: data },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Download applicant / interested student résumé (uploaded file)
// @route   GET /api/jobs/:id/students/:studentId/resume
// @access  Private (company owner / admin)
exports.downloadJobApplicantResume = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const invalidJob = ensureValidId(id, 'Job');
    if (invalidJob) {
      return res.status(400).json({
        success: false,
        message: invalidJob,
      });
    }
    const invalidStudent = ensureValidId(studentId, 'User');
    if (invalidStudent) {
      return res.status(400).json({
        success: false,
        message: invalidStudent,
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const isOwner = job.createdBy.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this résumé.',
      });
    }

    let rel = '';
    let downloadName = 'resume.pdf';

    const application = await JobApplication.findOne({
      job: id,
      student: studentId,
    });
    if (application?.resumeRelativePath) {
      rel = application.resumeRelativePath;
      downloadName = application.resumeOriginalName || downloadName;
    } else {
      const interest = await JobStudentInterest.findOne({
        job: id,
        student: studentId,
      });
      if (interest?.resumeRelativePath) {
        rel = interest.resumeRelativePath;
        downloadName = interest.resumeOriginalName || downloadName;
      }
    }

    if (!rel || !isAllowedPrivateResumeRel(rel)) {
      return res.status(404).json({
        success: false,
        message: 'No résumé file on record for this candidate and job.',
      });
    }

    const abs = path.join(__dirname, '..', rel);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({
        success: false,
        message: 'File is no longer available.',
      });
    }

    return res.download(abs, downloadName);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update application status
// @route   PATCH /api/jobs/applications/:applicationId/status
// @access  Private (company owner/admin)
exports.updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const invalidId = ensureValidId(applicationId, 'Application');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const application = await JobApplication.findById(applicationId).populate('job');
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const isOwner =
      application.job?.createdBy?.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'You can only update applications for your own jobs.',
      });
    }

    if (!req.body.status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an application status',
      });
    }

    application.status = req.body.status;
    await application.save();

    const updatedApplication = await JobApplication.findById(applicationId)
      .populate('student', 'name email role')
      .populate('job', 'title location employmentType status');

    const jobTitle = application.job?.title || 'this job';
    const statusMessages = {
      shortlisted: `You've been shortlisted for "${jobTitle}". The company may reach out with next steps.`,
      hired: `Congratulations — your application for "${jobTitle}" was marked as hired.`,
      rejected: `Your application for "${jobTitle}" was not moved forward this time.`,
      reviewing: `Your application for "${jobTitle}" is now under review.`,
    };
    const body =
      statusMessages[application.status] ||
      `Your application for ${jobTitle} is now ${application.status}.`;

    await createNotification({
      recipient: application.student,
      title:
        application.status === 'shortlisted'
          ? 'You were shortlisted'
          : 'Application status updated',
      message: body,
      category: 'job',
      type: 'job_application_status_updated',
      actionUrl: `/jobs/${application.job?._id || ''}`,
      metadata: {
        jobId: application.job?._id,
        applicationId: application._id,
        status: application.status,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Application status updated successfully',
      data: { application: sanitizeJobApplicationClient(updatedApplication) },
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

// @desc    Get company dashboard data
// @route   GET /api/jobs/company/dashboard
// @access  Private (company only)
exports.getCompanyDashboard = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company users can view this dashboard.',
      });
    }

    const jobs = await Job.find({ createdBy: req.user._id })
      .populate('targetCollege', TARGET_COLLEGE_SELECT)
      .sort({ createdAt: -1 });
    const jobIds = jobs.map((job) => job._id);

    const applications = await JobApplication.find({ job: { $in: jobIds } })
      .populate('student', 'name email role')
      .populate('job', 'title status location employmentType')
      .sort({ appliedAt: -1 });

    const studentIds = applications.map((item) => item.student?._id).filter(Boolean);
    const profiles = await StudentProfile.find({ user: { $in: studentIds } })
      .select('user bio overallScore skills stats')
      .lean();

    const profileMap = Object.fromEntries(
      profiles.map((profile) => [profile.user.toString(), profile])
    );

    const enrichedApplications = applications.map((application) => {
      const studentId = application.student?._id?.toString();
      const base = sanitizeJobApplicationClient(application);

      return {
        ...base,
        studentProfile: studentId ? profileMap[studentId] || null : null,
      };
    });

    const shortlistedCount = enrichedApplications.filter(
      (application) => application.status === 'shortlisted'
    ).length;

    const dashboard = {
      metrics: {
        totalJobs: jobs.length,
        openJobs: jobs.filter((job) => job.status === 'open').length,
        totalApplications: enrichedApplications.length,
        shortlistedCount,
      },
      recentJobs: jobs.slice(0, 5),
      recentApplications: enrichedApplications.slice(0, 8),
    };

    res.status(200).json({
      success: true,
      data: dashboard,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Upload or replace job description PDF (JD)
// @route   POST /api/jobs/:id/jd
// @access  Private (company owner / admin) — use multipart field name "jd"
exports.uploadJobJD = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company or admin users can upload a job description.',
      });
    }

    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a PDF file (field name: jd).',
      });
    }

    const job = await Job.findById(id);
    if (!job) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    if (
      req.user.role !== 'admin' &&
      job.createdBy.toString() !== req.user._id.toString()
    ) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: 'You can only attach documents to your own job posts.',
      });
    }

    if (job.jdRelativePath) {
      const oldAbs = path.join(__dirname, '..', job.jdRelativePath);
      if (fs.existsSync(oldAbs)) {
        try {
          fs.unlinkSync(oldAbs);
        } catch {
          /* ignore */
        }
      }
    }

    const rel = path
      .relative(path.join(__dirname, '..'), req.file.path)
      .replace(/\\/g, '/');
    job.jdRelativePath = rel;
    job.jdOriginalName = req.file.originalname || 'job-description.pdf';
    await job.save();

    if (job.status === 'open') {
      const recipientIds = await studentIdsToNotifyForOpenJob(job);

      await createBulkNotifications({
        recipientIds,
        title: 'Job description available',
        message: `${job.title}: a detailed JD (PDF) has been uploaded.`,
        category: 'job',
        type: 'job_jd_uploaded',
        actionUrl: `/jobs/${job._id}`,
        metadata: {
          jobId: job._id,
        },
      });
    }

    const populatedJob = await Job.findById(job._id)
      .populate('createdBy', JOB_CREATED_BY_SELECT)
      .populate('targetCollege', TARGET_COLLEGE_SELECT);

    res.status(200).json({
      success: true,
      message: 'Job description uploaded.',
      data: { job: populatedJob },
    });
  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        /* ignore */
      }
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Download job JD PDF
// @route   GET /api/jobs/:id/jd
// @access  Private (company owner, admin, or applicants viewing open job)
exports.downloadJobJD = async (req, res) => {
  try {
    const { id } = req.params;
    const invalidId = ensureValidId(id, 'Job');
    if (invalidId) {
      return res.status(400).json({
        success: false,
        message: invalidId,
      });
    }

    const job = await Job.findById(id);
    if (!job || !job.jdRelativePath) {
      return res.status(404).json({
        success: false,
        message: 'No job description file for this role.',
      });
    }

    const isOwner = job.createdBy.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isApplicant =
      applicantRoles.includes(req.user.role) && job.status === 'open';

    if (!isOwner && !isAdmin && !isApplicant) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download this document.',
      });
    }

    const abs = path.join(__dirname, '..', job.jdRelativePath);
    if (!fs.existsSync(abs)) {
      return res.status(404).json({
        success: false,
        message: 'File is no longer available.',
      });
    }

    return res.download(abs, job.jdOriginalName || 'job-description.pdf');
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Search students for recruiting (talent pool)
// @route   GET /api/jobs/company/talent
// @access  Private (company / admin)
exports.searchCompanyTalent = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company users can browse the talent pool.',
      });
    }

    const q = String(req.query.q || '').trim();
    const skill = String(req.query.skill || '').trim();

    const profiles = await StudentProfile.find({
      visibleToCompanies: { $ne: false },
    })
      .populate({
        path: 'user',
        match: { role: 'student' },
        select: 'name email role',
      })
      .sort({ updatedAt: -1 })
      .limit(120)
      .lean();

    let list = profiles.filter((p) => p.user);

    if (q) {
      const ql = q.toLowerCase();
      list = list.filter(
        (p) =>
          (p.bio || '').toLowerCase().includes(ql) ||
          (p.course || '').toLowerCase().includes(ql) ||
          (p.branch || '').toLowerCase().includes(ql) ||
          (p.year || '').toLowerCase().includes(ql) ||
          (p.user.name || '').toLowerCase().includes(ql) ||
          (p.toolsAndTechnologies || []).some((t) =>
            (t || '').toLowerCase().includes(ql)
          )
      );
    }

    if (skill) {
      const sl = skill.toLowerCase();
      list = list.filter((p) =>
        (p.skills || []).some((s) => (s.name || '').toLowerCase().includes(sl))
      );
    }

    const talent = list.slice(0, 60).map((p) => ({
      userId: p.user._id,
      name: p.user.name,
      email: p.user.email,
      role: p.user.role,
      bio: p.bio || '',
      course: p.course || '',
      branch: p.branch || '',
      year: p.year || '',
      semester: p.semester || '',
      skills: (p.skills || []).map((s) => ({
        name: s.name,
        level: s.level,
        progress: s.progress,
      })),
      toolsAndTechnologies: p.toolsAndTechnologies || [],
      overallScore: p.overallScore,
      stats: p.stats || {},
    }));

    res.status(200).json({
      success: true,
      count: talent.length,
      data: { talent },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Student learning & skills detail for recruiters
// @route   GET /api/jobs/company/students/:userId
// @access  Private (company / admin)
exports.getCompanyStudentDetail = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only company users can view candidate profiles.',
      });
    }

    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user id',
      });
    }

    const user = await User.findById(userId).select('name email role').lean();
    if (!user || user.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const profile = await StudentProfile.findOne({ user: userId }).lean();
    if (profile && profile.visibleToCompanies === false) {
      return res.status(403).json({
        success: false,
        message: 'This learner has chosen to hide their profile from companies.',
      });
    }

    const insights = await getLearnerInsights(userId);
    const learningActivity = await LearningProgress.find({ user: userId })
      .populate('material', 'title slug materialType estimatedReadMinutes category')
      .sort({ lastViewedAt: -1 })
      .limit(40)
      .lean();

    const activity = learningActivity.map((row) => ({
      progressPercent: row.progressPercent,
      completed: row.completed,
      timeSpentMinutes: row.timeSpentMinutes,
      lastViewedAt: row.lastViewedAt,
      material: row.material
        ? {
            title: row.material.title,
            slug: row.material.slug,
            materialType: row.material.materialType,
            estimatedReadMinutes: row.material.estimatedReadMinutes,
          }
        : null,
    }));

    res.status(200).json({
      success: true,
      data: {
        user,
        profile: profile || null,
        derivedSkills: insights.skills,
        learningStats: insights.stats,
        learningSummary: insights.learningSummary,
        learningActivity: activity,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Company signals interest in a student (notifies the student)
// @route   POST /api/jobs/company/express-interest
// @access  Private (company)
exports.expressCompanyInterest = async (req, res) => {
  try {
    if (!companyRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company accounts can express interest.',
      });
    }

    const { studentUserId, jobId, message } = req.body;

    if (!studentUserId || !mongoose.Types.ObjectId.isValid(studentUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid studentUserId',
      });
    }

    const student = await User.findById(studentUserId).select('name role').lean();
    if (!student || student.role !== 'student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const profile = await StudentProfile.findOne({
      user: studentUserId,
    }).select('visibleToCompanies').lean();
    if (profile && profile.visibleToCompanies === false) {
      return res.status(403).json({
        success: false,
        message: 'This learner is not open to company outreach.',
      });
    }

    let jobTitle = '';
    if (jobId && mongoose.Types.ObjectId.isValid(jobId)) {
      const job = await Job.findById(jobId).select('title createdBy').lean();
      if (!job) {
        return res.status(404).json({
          success: false,
          message: 'Job not found',
        });
      }
      if (job.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only link interest to your own job posts.',
        });
      }
      jobTitle = job.title || '';
    }

    const company = await User.findById(req.user._id).select('name email').lean();
    const note = typeof message === 'string' ? message.trim() : '';
    const msg =
      note ||
      (jobTitle
        ? `${company.name} is interested in you regarding "${jobTitle}".`
        : `${company.name} is interested in your profile for upcoming opportunities.`);

    await createNotification({
      recipient: studentUserId,
      title: `Recruiter interest: ${company.name}`,
      message: msg,
      category: 'job',
      type: 'company_expressed_interest',
      actionUrl: jobId ? `/jobs/${jobId}` : '/jobs',
      metadata: {
        companyId: req.user._id,
        jobId: jobId || null,
      },
    });

    res.status(200).json({
      success: true,
      message: 'The student has been notified.',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

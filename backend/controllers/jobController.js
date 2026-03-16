const mongoose = require('mongoose');

const Job = require('../models/Job');
const JobApplication = require('../models/JobApplication');
const SavedJob = require('../models/SavedJob');
const StudentProfile = require('../models/StudentProfile');
const User = require('../models/User');
const { getLearnerInsights } = require('../utils/learnerInsights');
const {
  createBulkNotifications,
  createNotification,
} = require('../utils/notificationService');

const companyRoles = ['company'];
const applicantRoles = ['student', 'alumni'];

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

const buildJobFilters = (query, user) => {
  const filters = { ...getJobQueryByRole(user) };

  if (query.search) {
    filters.$or = [
      { title: { $regex: query.search, $options: 'i' } },
      { description: { $regex: query.search, $options: 'i' } },
      { location: { $regex: query.search, $options: 'i' } },
    ];
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
      .populate('createdBy', 'name email role')
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
// @access  Private (student/alumni only)
exports.getSuggestedJobs = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students or alumni can view job suggestions.',
      });
    }

    const [profile, applications, savedJobs, jobs] = await Promise.all([
      StudentProfile.findOne({ user: req.user._id }).select('skills').lean(),
      JobApplication.find({ student: req.user._id }).select('job').lean(),
      SavedJob.find({ student: req.user._id }).select('job').lean(),
      Job.find({ status: 'open' }).populate('createdBy', 'name email role').sort({ createdAt: -1 }),
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

    const job = await Job.findById(id).populate('createdBy', 'name email role');
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
      (job.status === 'open' && applicantRoles.includes(req.user.role));

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this job',
      });
    }

    res.status(200).json({
      success: true,
      data: { job },
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
    if (!companyRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only company users can create job posts.',
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

    const job = await Job.create({
      title,
      description: description || '',
      location: location || '',
      employmentType: employmentType || 'full-time',
      skillsRequired: normalizeSkills(skillsRequired),
      status: status || 'draft',
      createdBy: req.user._id,
    });

    const populatedJob = await Job.findById(job._id).populate(
      'createdBy',
      'name email role'
    );

    if (job.status === 'open') {
      const learners = await User.find({ role: { $in: applicantRoles } })
        .select('_id')
        .lean();

      await createBulkNotifications({
        recipientIds: learners.map((user) => user._id),
        title: 'New job posted',
        message: `${job.title} is now open for applications.`,
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

    await job.save();

    const populatedJob = await Job.findById(job._id).populate(
      'createdBy',
      'name email role'
    );

    if (previousStatus !== 'open' && job.status === 'open') {
      const learners = await User.find({ role: { $in: applicantRoles } })
        .select('_id')
        .lean();

      await createBulkNotifications({
        recipientIds: learners.map((user) => user._id),
        title: 'Job is now open',
        message: `${job.title} is now available for applications.`,
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
// @access  Private (student/alumni only)
exports.applyToJob = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students or alumni can apply to jobs.',
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

    const application = await JobApplication.create({
      job: job._id,
      student: req.user._id,
      coverLetter: req.body.coverLetter || '',
      resumeLink: req.body.resumeLink || '',
      portfolioLink: req.body.portfolioLink || '',
    });

    const populatedApplication = await JobApplication.findById(application._id)
      .populate('job', 'title description location employmentType status skillsRequired')
      .populate('student', 'name email role');

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
      message: `${req.user.name} applied for ${job.title}.`,
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
      data: { application: populatedApplication },
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

// @desc    Get my job applications
// @route   GET /api/jobs/applications/me
// @access  Private (student/alumni only)
exports.getMyApplications = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students or alumni can view their applications.',
      });
    }

    const applications = await JobApplication.find({ student: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'createdBy',
          select: 'name email role',
        },
      })
      .sort({ appliedAt: -1 });

    res.status(200).json({
      success: true,
      count: applications.length,
      data: { applications },
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
// @access  Private (student/alumni only)
exports.getSavedJobs = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students or alumni can view saved jobs.',
      });
    }

    const savedJobs = await SavedJob.find({ student: req.user._id })
      .populate({
        path: 'job',
        populate: {
          path: 'createdBy',
          select: 'name email role',
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
// @access  Private (student/alumni only)
exports.saveJob = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students or alumni can save jobs.',
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

    const savedJob = await SavedJob.create({
      student: req.user._id,
      job: id,
    });

    const populatedSavedJob = await SavedJob.findById(savedJob._id).populate({
      path: 'job',
      populate: {
        path: 'createdBy',
        select: 'name email role',
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
// @access  Private (student/alumni only)
exports.unsaveJob = async (req, res) => {
  try {
    if (!applicantRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only students or alumni can remove saved jobs.',
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

      return {
        ...application.toObject(),
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

    await createNotification({
      recipient: application.student,
      title: 'Application status updated',
      message: `Your application for ${application.job?.title || 'this job'} is now ${application.status}.`,
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
      data: { application: updatedApplication },
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

    const jobs = await Job.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
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

      return {
        ...application.toObject(),
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

const AssessmentSubmission = require('../models/AssessmentSubmission');
const Assessment = require('../models/Assessment');
const StudentProfile = require('../models/StudentProfile');
const mongoose = require('mongoose');
const { createNotification } = require('../utils/notificationService');

// Grade answers against assessment questions
const gradeSubmission = (assessment, answers) => {
  let score = 0;
  const questions = assessment.questions || [];

  for (const ans of answers) {
    const idx = ans.questionIndex;
    if (idx < 0 || idx >= questions.length) continue;

    const q = questions[idx];
    const correct = String(q.correctAnswer).trim().toLowerCase();
    const selected = String(ans.selectedAnswer || '').trim().toLowerCase();

    if (correct === selected) {
      score += q.marks || 1;
    }
  }

  return score;
};

// @desc    Submit assessment
// @route   POST /api/submissions
// @access  Private (students only)
exports.submitAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can submit assessments.',
      });
    }

    const { assessmentId, answers } = req.body;

    if (!assessmentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide assessmentId',
      });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide answers array',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID',
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    if (assessment.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Assessment is not available for submission.',
      });
    }

    const isDocumentOnly =
      assessment.deliveryMode === 'document' &&
      (!assessment.questions || assessment.questions.length === 0);
    if (isDocumentOnly) {
      return res.status(400).json({
        success: false,
        message:
          'This assessment is provided as a downloadable document only. Open the assessment page to view or download the paper.',
      });
    }

    const existing = await AssessmentSubmission.findOne({
      user: req.user._id,
      assessment: assessmentId,
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this assessment.',
      });
    }

    const score = gradeSubmission(assessment, answers);
    const maxScore = assessment.maxScore || 0;

    const submission = await AssessmentSubmission.create({
      user: req.user._id,
      assessment: assessmentId,
      answers,
      score,
      maxScore,
    });

    // Update StudentProfile stats
    await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { 'stats.assessmentsTaken': 1 } }
    );

    const populated = await AssessmentSubmission.findById(submission._id)
      .populate('user', 'name email')
      .populate('assessment', 'title skill maxScore');

    await createNotification({
      recipient: req.user._id,
      title: 'Assessment submitted',
      message: `Your submission for ${assessment.title} has been recorded.`,
      category: 'assessment',
      type: 'assessment_submitted',
      actionUrl: `/assessments/${assessment._id}`,
      metadata: {
        assessmentId: assessment._id,
        submissionId: submission._id,
      },
    });

    await createNotification({
      recipient: assessment.createdBy,
      title: 'New assessment submission',
      message: `${req.user.name} submitted ${assessment.title}.`,
      category: 'assessment',
      type: 'assessment_submission_received',
      actionUrl: '/dashboard',
      metadata: {
        assessmentId: assessment._id,
        submissionId: submission._id,
        studentId: req.user._id,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Assessment submitted',
      data: { submission: populated },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already submitted this assessment.',
      });
    }
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get my submissions
// @route   GET /api/submissions
// @access  Private
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await AssessmentSubmission.find({
      user: req.user._id,
    })
      .populate('assessment', 'title skill maxScore')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: { submissions },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get single submission by ID
// @route   GET /api/submissions/:id
// @access  Private (owner or faculty who created the assessment)
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid submission ID',
      });
    }

    const submission = await AssessmentSubmission.findById(id)
      .populate('user', 'name email')
      .populate('assessment');

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found',
      });
    }

    const isOwner = submission.user._id.toString() === req.user._id.toString();
    const isAuthor =
      (req.user.role === 'faculty' || req.user.role === 'college') &&
      submission.assessment?.createdBy?.toString() === req.user._id.toString();

    if (!isOwner && !isAuthor) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this submission',
      });
    }

    res.status(200).json({
      success: true,
      data: { submission },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get submissions for an assessment (faculty only)
// @route   GET /api/submissions/assessment/:assessmentId
// @access  Private (faculty, creator of assessment)
exports.getSubmissionsByAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID',
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    if (req.user.role !== 'faculty' && req.user.role !== 'college') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty or college authors can view submissions by assessment.',
      });
    }

    if (assessment.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only view submissions for your own assessments.',
      });
    }

    const submissions = await AssessmentSubmission.find({
      assessment: assessmentId,
    })
      .populate('user', 'name email')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: { submissions },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

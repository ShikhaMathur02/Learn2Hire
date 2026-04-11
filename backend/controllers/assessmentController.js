const Assessment = require('../models/Assessment');
const mongoose = require('mongoose');
const User = require('../models/User');
const { createBulkNotifications } = require('../utils/notificationService');

// Strip correctAnswer from questions (for students taking assessment)
const stripAnswers = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map(({ question, options, marks }) => ({
    question,
    options,
    marks: marks || 1,
  }));
};

// @desc    Get all assessments
// @route   GET /api/assessments
// @access  Private (students: published only, faculty: all)
exports.getAllAssessments = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student') {
      query.status = 'published';
    }

    const assessments = await Assessment.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: assessments.length,
      data: { assessments },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get single assessment by ID
// @route   GET /api/assessments/:id
// @access  Private (students: published only, exclude answers for students)
exports.getAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID',
      });
    }

    const assessment = await Assessment.findById(id).populate(
      'createdBy',
      'name email'
    );

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    if (req.user.role === 'student' && assessment.status !== 'published') {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    const isCreator =
      assessment.createdBy._id.toString() === req.user._id.toString();

    let data = assessment.toObject();
    if (req.user.role === 'student' && !isCreator) {
      data.questions = stripAnswers(data.questions);
    }

    res.status(200).json({
      success: true,
      data: { assessment: data },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Create assessment
// @route   POST /api/assessments
// @access  Private (faculty only)
exports.createAssessment = async (req, res) => {
  try {
    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty or admin can create assessments.',
      });
    }

    const { title, description, skill, questions, timeLimit, status } =
      req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a title',
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one question',
      });
    }

    const assessment = await Assessment.create({
      title,
      description: description || '',
      createdBy: req.user._id,
      skill: skill || '',
      questions,
      timeLimit: timeLimit || null,
      status: status || 'draft',
    });

    const populated = await Assessment.findById(assessment._id).populate(
      'createdBy',
      'name email'
    );

    if (assessment.status === 'published') {
      const students = await User.find({ role: 'student' }).select('_id').lean();

      await createBulkNotifications({
        recipientIds: students.map((user) => user._id),
        title: 'New assignment available',
        message: `${assessment.title} is now published — you can take it from Assessments.`,
        category: 'assessment',
        type: 'assessment_published',
        actionUrl: `/assessments/${assessment._id}`,
        metadata: {
          assessmentId: assessment._id,
        },
      });
    }

    res.status(201).json({
      success: true,
      message: 'Assessment created',
      data: { assessment: populated },
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

// @desc    Update assessment
// @route   PUT /api/assessments/:id
// @access  Private (faculty only, creator only)
exports.updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID',
      });
    }

    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty or admin can update assessments.',
      });
    }

    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    if (
      req.user.role !== 'admin' &&
      assessment.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own assessments.',
      });
    }

    const previousStatus = assessment.status;

    const { title, description, skill, questions, timeLimit, status } =
      req.body;

    if (title !== undefined) assessment.title = title;
    if (description !== undefined) assessment.description = description;
    if (skill !== undefined) assessment.skill = skill;
    if (questions !== undefined) {
      assessment.questions = questions;
      assessment.maxScore = 0; // trigger pre-save recalc
    }
    if (timeLimit !== undefined) assessment.timeLimit = timeLimit;
    if (status !== undefined) assessment.status = status;

    await assessment.save();

    const populated = await Assessment.findById(assessment._id).populate(
      'createdBy',
      'name email'
    );

    if (previousStatus !== 'published' && assessment.status === 'published') {
      const students = await User.find({ role: 'student' }).select('_id').lean();

      await createBulkNotifications({
        recipientIds: students.map((user) => user._id),
        title: 'New assignment published',
        message: `${assessment.title} is now available under Assessments.`,
        category: 'assessment',
        type: 'assessment_published',
        actionUrl: `/assessments/${assessment._id}`,
        metadata: {
          assessmentId: assessment._id,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Assessment updated',
      data: { assessment: populated },
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

// @desc    Delete assessment
// @route   DELETE /api/assessments/:id
// @access  Private (faculty only, creator only)
exports.deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID',
      });
    }

    const assessment = await Assessment.findById(id);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found',
      });
    }

    if (req.user.role !== 'faculty' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty or admin can delete assessments.',
      });
    }

    if (
      req.user.role !== 'admin' &&
      assessment.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own assessments.',
      });
    }

    await Assessment.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Assessment deleted',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

const fs = require('fs/promises');
const path = require('path');
const Assessment = require('../models/Assessment');
const mongoose = require('mongoose');
const { createBulkNotifications } = require('../utils/notificationService');
const {
  getStudentRecipientIdsForEditor,
} = require('../utils/campusNotificationRecipients');

const canAuthorAssessment = (role) =>
  role === 'faculty' || role === 'admin' || role === 'college';

const stripAnswers = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map(({ question, options, marks }) => ({
    question,
    options,
    marks: marks || 1,
  }));
};

const unlinkQuestionPaperFile = async (relativePath) => {
  if (!relativePath || typeof relativePath !== 'string') return;
  if (!relativePath.startsWith('/uploads/assessments/')) return;
  const abs = path.join(__dirname, '..', relativePath.replace(/^\//, ''));
  try {
    await fs.unlink(abs);
  } catch (_) {
    /* ignore */
  }
};

const writeQuestionPaperFile = async (userId, file) => {
  const dir = path.join(__dirname, '..', 'uploads', 'assessments');
  await fs.mkdir(dir, { recursive: true });
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowed = ['.pdf', '.doc', '.docx'];
  const safeExt = allowed.includes(ext) ? ext : '.pdf';
  const fname = `${userId}-${Date.now()}${safeExt}`;
  const full = path.join(dir, fname);
  await fs.writeFile(full, file.buffer);
  return {
    relativePath: `/uploads/assessments/${fname}`,
    originalName: file.originalname || fname,
    mimeType: file.mimetype || '',
  };
};

const parseQuestionsFromBody = (raw) => {
  if (raw === undefined || raw === null) return undefined;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }
  return [];
};

// @desc    Get all assessments
// @route   GET /api/assessments
// @access  Private (students: published only, others: all)
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

// @desc    Create assessment (JSON or multipart with optional questionPaper file)
// @route   POST /api/assessments
// @access  Private (faculty, college, admin)
exports.createAssessment = async (req, res) => {
  try {
    if (!canAuthorAssessment(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty, college, or admin can create assessments.',
      });
    }

    let title;
    let description = '';
    let skill = '';
    let timeLimit = null;
    let status = 'draft';
    let questions = [];

    if (req.file) {
      title = (req.body.title || '').trim();
      description = (req.body.description || '').trim();
      skill = (req.body.skill || '').trim();
      if (req.body.timeLimit) {
        const n = Number(req.body.timeLimit);
        timeLimit = Number.isFinite(n) && n > 0 ? n : null;
      }
      if (req.body.status) status = req.body.status;
      questions = parseQuestionsFromBody(req.body.questions);
    } else {
      ({
        title,
        description = '',
        skill = '',
        questions = [],
        timeLimit = null,
        status = 'draft',
      } = req.body);
      if (!Array.isArray(questions)) questions = [];
    }

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a title',
      });
    }

    if (!req.file && (!Array.isArray(questions) || questions.length === 0)) {
      return res.status(400).json({
        success: false,
        message:
          'Add at least one question, or upload a question paper (PDF or Word) using multipart form field questionPaper.',
      });
    }

    let questionPaper = { relativePath: '', originalName: '', mimeType: '' };
    if (req.file) {
      questionPaper = await writeQuestionPaperFile(req.user._id, req.file);
    }

    const assessment = await Assessment.create({
      title,
      description: description || '',
      createdBy: req.user._id,
      skill: skill || '',
      questions,
      questionPaper,
      timeLimit: timeLimit || null,
      status: status || 'draft',
    });

    const populated = await Assessment.findById(assessment._id).populate(
      'createdBy',
      'name email'
    );

    if (assessment.status === 'published') {
      const recipientIds = await getStudentRecipientIdsForEditor(req.user);

      await createBulkNotifications({
        recipientIds,
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
    if (err.message) {
      return res.status(400).json({
        success: false,
        message: err.message,
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
// @access  Private (faculty, college, admin; creator except admin)
exports.updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID',
      });
    }

    if (!canAuthorAssessment(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty, college, or admin can update assessments.',
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

    let title;
    let description;
    let skill;
    let questions;
    let timeLimit;
    let status;

    if (req.file) {
      if (req.body.title !== undefined) title = req.body.title;
      if (req.body.description !== undefined) description = req.body.description;
      if (req.body.skill !== undefined) skill = req.body.skill;
      if (req.body.timeLimit !== undefined) timeLimit = req.body.timeLimit;
      if (req.body.status !== undefined) status = req.body.status;
      if (Object.prototype.hasOwnProperty.call(req.body, 'questions')) {
        questions = parseQuestionsFromBody(req.body.questions);
      }
    } else {
      ({
        title,
        description,
        skill,
        questions,
        timeLimit,
        status,
      } = req.body);
    }

    if (title !== undefined) assessment.title = title;
    if (description !== undefined) assessment.description = description;
    if (skill !== undefined) assessment.skill = skill;
    if (questions !== undefined) {
      assessment.questions = Array.isArray(questions) ? questions : [];
      assessment.maxScore = 0;
    }
    if (timeLimit !== undefined) {
      const n = Number(timeLimit);
      assessment.timeLimit = Number.isFinite(n) && n > 0 ? n : null;
    }
    if (status !== undefined) assessment.status = status;

    if (req.file) {
      await unlinkQuestionPaperFile(assessment.questionPaper?.relativePath);
      assessment.questionPaper = await writeQuestionPaperFile(
        req.user._id,
        req.file
      );
    }

    await assessment.save();

    const populated = await Assessment.findById(assessment._id).populate(
      'createdBy',
      'name email'
    );

    if (previousStatus !== 'published' && assessment.status === 'published') {
      const recipientIds = await getStudentRecipientIdsForEditor(req.user);

      await createBulkNotifications({
        recipientIds,
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
    if (err.message) {
      return res.status(400).json({
        success: false,
        message: err.message,
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
// @access  Private (faculty, college, admin; creator except admin)
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

    if (!canAuthorAssessment(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only faculty, college, or admin can delete assessments.',
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

    await unlinkQuestionPaperFile(assessment.questionPaper?.relativePath);
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

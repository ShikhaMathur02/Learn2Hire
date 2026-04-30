const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length >= 2,
        message: 'At least 2 options required',
      },
    },
    correctAnswer: {
      type: String,
      required: true,
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: true }
);

const questionPaperSchema = new mongoose.Schema(
  {
    relativePath: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
  },
  { _id: false }
);

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a title'],
    },
    description: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    skill: {
      type: String,
      default: '',
    },
    /** MCQ list and/or uploaded question paper (PDF / Word). */
    deliveryMode: {
      type: String,
      enum: ['mcq', 'document', 'mixed'],
      default: 'mcq',
    },
    questionPaper: {
      type: questionPaperSchema,
      default: () => ({}),
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    maxScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    timeLimit: {
      type: Number,
      default: null,
      min: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'published'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
  }
);

assessmentSchema.pre('validate', function (next) {
  const hasPaper = !!(this.questionPaper && this.questionPaper.relativePath);
  const hasMcq = Array.isArray(this.questions) && this.questions.length > 0;
  if (!hasPaper && !hasMcq) {
    return next(
      new Error('Add at least one question or upload a question paper (PDF or Word).')
    );
  }
  if (hasPaper && hasMcq) {
    this.deliveryMode = 'mixed';
  } else if (hasPaper) {
    this.deliveryMode = 'document';
  } else {
    this.deliveryMode = 'mcq';
  }
  next();
});

// Calculate maxScore from questions if not set
assessmentSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0 && this.maxScore === 0) {
    this.maxScore = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }
  if (this.deliveryMode === 'document' && (!this.questions || this.questions.length === 0)) {
    this.maxScore = 0;
  }
  next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;

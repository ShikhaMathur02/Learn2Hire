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
    questions: {
      type: [questionSchema],
      default: [],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one question required',
      },
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

// Calculate maxScore from questions if not set
assessmentSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0 && this.maxScore === 0) {
    this.maxScore = this.questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  }
  next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;

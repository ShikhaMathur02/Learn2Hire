const mongoose = require('mongoose');

const assessmentSubmissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: true,
    },
    answers: [
      {
        questionIndex: {
          type: Number,
          required: true,
          min: 0,
        },
        selectedAnswer: {
          type: String,
          required: true,
        },
      },
    ],
    score: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// One submission per user per assessment
assessmentSubmissionSchema.index({ user: 1, assessment: 1 }, { unique: true });

const AssessmentSubmission = mongoose.model(
  'AssessmentSubmission',
  assessmentSubmissionSchema
);

module.exports = AssessmentSubmission;

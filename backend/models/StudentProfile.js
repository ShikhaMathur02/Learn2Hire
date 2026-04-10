const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      default: '',
    },
    // Cohort — used to show faculty-targeted study materials (course + branch + year must all match)
    course: {
      type: String,
      default: '',
      trim: true,
    },
    branch: {
      type: String,
      default: '',
      trim: true,
    },
    year: {
      type: String,
      default: '',
      trim: true,
    },
    // Skill tracking: list of skills with level and progress
    skills: [
      {
        name: {
          type: String,
          required: true,
        },
        level: {
          type: String,
          enum: ['beginner', 'intermediate', 'advanced', 'expert'],
          default: 'beginner',
        },
        progress: {
          type: Number,
          min: 0,
          max: 100,
          default: 0,
        },
      },
    ],
    // Dashboard stats (updated when courses/assessments are added later)
    stats: {
      coursesEnrolled: { type: Number, default: 0 },
      coursesCompleted: { type: Number, default: 0 },
      assessmentsTaken: { type: Number, default: 0 },
    },
    // Future scoring system: overall score and history over time
    overallScore: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    scoreHistory: [
      {
        score: { type: Number, required: true },
        date: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const StudentProfile = mongoose.model('StudentProfile', studentProfileSchema);

module.exports = StudentProfile;

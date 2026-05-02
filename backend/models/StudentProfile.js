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
    /** School / institute department (e.g. School of Engineering) — optional, can be set via roster import. */
    department: {
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
    semester: {
      type: String,
      default: '',
      trim: true,
    },
    /** S.No. / roll from roster spreadsheet imports; optional. */
    serialNumber: {
      type: String,
      default: '',
      trim: true,
    },
    // Student contact & placement-style records (optional; filled in profile UI)
    studentPhone: {
      type: String,
      default: '',
      trim: true,
    },
    fatherName: {
      type: String,
      default: '',
      trim: true,
    },
    motherName: {
      type: String,
      default: '',
      trim: true,
    },
    fatherPhone: {
      type: String,
      default: '',
      trim: true,
    },
    motherPhone: {
      type: String,
      default: '',
      trim: true,
    },
    address: {
      type: String,
      default: '',
      trim: true,
    },
    city: {
      type: String,
      default: '',
      trim: true,
    },
    state: {
      type: String,
      default: '',
      trim: true,
    },
    pincode: {
      type: String,
      default: '',
      trim: true,
    },
    dateOfBirth: {
      type: String,
      default: '',
      trim: true,
    },
    bloodGroup: {
      type: String,
      default: '',
      trim: true,
    },
    emergencyContactName: {
      type: String,
      default: '',
      trim: true,
    },
    emergencyContactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    // Tools & tech stack (for recruiters) — e.g. React, Docker, AWS
    toolsAndTechnologies: {
      type: [String],
      default: [],
    },
    // When false, student is hidden from company talent search
    visibleToCompanies: {
      type: Boolean,
      default: true,
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

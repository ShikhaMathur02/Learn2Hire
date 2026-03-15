const mongoose = require('mongoose');

const jobApplicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    coverLetter: {
      type: String,
      default: '',
      trim: true,
    },
    resumeLink: {
      type: String,
      default: '',
      trim: true,
    },
    portfolioLink: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['applied', 'reviewing', 'shortlisted', 'rejected', 'hired'],
      default: 'applied',
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

jobApplicationSchema.index({ job: 1, student: 1 }, { unique: true });

const JobApplication = mongoose.model('JobApplication', jobApplicationSchema);

module.exports = JobApplication;

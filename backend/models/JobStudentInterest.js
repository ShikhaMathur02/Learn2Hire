const mongoose = require('mongoose');

const jobStudentInterestSchema = new mongoose.Schema(
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
    message: {
      type: String,
      default: '',
      trim: true,
    },
    resumeRelativePath: {
      type: String,
      default: '',
      trim: true,
    },
    resumeOriginalName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

jobStudentInterestSchema.index({ job: 1, student: 1 }, { unique: true });

const JobStudentInterest = mongoose.model('JobStudentInterest', jobStudentInterestSchema);

module.exports = JobStudentInterest;

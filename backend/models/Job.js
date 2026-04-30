const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a job title'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ['internship', 'full-time', 'part-time', 'contract'],
      default: 'full-time',
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'open', 'closed'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** all_colleges: every partner campus; single_college: only learners tied to targetCollege */
    postingAudience: {
      type: String,
      enum: ['all_colleges', 'single_college'],
      default: 'all_colleges',
    },
    targetCollege: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    jdOriginalName: {
      type: String,
      default: '',
      trim: true,
    },
    jdRelativePath: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

jobSchema.set('toJSON', {
  transform(_doc, ret) {
    const hadFile = Boolean(ret.jdRelativePath);
    delete ret.jdRelativePath;
    ret.hasJdDocument = hadFile;
    return ret;
  },
});

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

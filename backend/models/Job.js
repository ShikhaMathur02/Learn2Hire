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

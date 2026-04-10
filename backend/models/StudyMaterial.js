const mongoose = require('mongoose');

const studyMaterialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a material title'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a material slug'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    summary: {
      type: String,
      default: '',
      trim: true,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    materialType: {
      type: String,
      enum: ['article', 'pdf', 'video', 'link'],
      default: 'article',
    },
    resourceUrl: {
      type: String,
      default: '',
      trim: true,
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    tags: {
      type: [String],
      default: [],
    },
    estimatedReadMinutes: {
      type: Number,
      default: 5,
      min: 1,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LearningCategory',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    // global = everyone; cohort = only students with matching course, branch, year on their profile
    audience: {
      type: String,
      enum: ['global', 'cohort'],
      default: 'global',
    },
    targetCourse: {
      type: String,
      default: '',
      trim: true,
    },
    targetBranch: {
      type: String,
      default: '',
      trim: true,
    },
    targetYear: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);

module.exports = StudyMaterial;

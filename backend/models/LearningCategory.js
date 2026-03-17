const mongoose = require('mongoose');

const learningCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a category name'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Please provide a category slug'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    icon: {
      type: String,
      default: '',
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const LearningCategory = mongoose.model('LearningCategory', learningCategorySchema);

module.exports = LearningCategory;

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      select: false, // don't return password in find() by default
    },
    role: {
      type: String,
      enum: {
        values: ['student', 'alumni', 'faculty', 'company', 'admin', 'college'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Please provide a role'],
    },
    // Faculty self-registration: pending until a college (or admin) approves. Omitted / approved for other roles.
    facultyApprovalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
    },
    // College self-registration: pending until a platform admin approves. Omitted or "approved" for legacy colleges.
    collegeApprovalStatus: {
      type: String,
      enum: ['approved', 'pending', 'rejected'],
    },
    // Student/faculty: campus they selected at signup (faculty also uses this while approval is pending).
    affiliatedCollege: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // College user who registered this account (students/faculty added by the college).
    managedByCollege: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /** Optional faculty metadata (admin-managed; shown on admin user profile). */
    facultyQualification: {
      type: String,
      default: '',
      trim: true,
    },
    facultySubjects: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;

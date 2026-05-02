const mongoose = require('mongoose');

const Assessment = require('../models/Assessment');
const AssessmentSubmission = require('../models/AssessmentSubmission');
const JobApplication = require('../models/JobApplication');
const LearningProgress = require('../models/LearningProgress');
const Notification = require('../models/Notification');
const SavedJob = require('../models/SavedJob');
const StudentProfile = require('../models/StudentProfile');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');

/**
 * Same cascade as admin delete for students / alumni (learner data).
 * @param {mongoose.Types.ObjectId|string} userId
 */
async function cascadeDeleteStudentLikeUser(userId) {
  const id = userId;
  await StudentProfile.deleteMany({ user: id });
  await LearningProgress.deleteMany({ user: id });
  await AssessmentSubmission.deleteMany({ user: id });
  await JobApplication.deleteMany({ student: id });
  await SavedJob.deleteMany({ student: id });
  await Notification.deleteMany({ recipient: id });
  await User.findByIdAndDelete(id);
}

/**
 * Same cascade as admin delete for faculty.
 * @param {mongoose.Types.ObjectId|string} userId
 */
async function cascadeDeleteFacultyUser(userId) {
  const id = userId;
  const assessmentIds = (await Assessment.find({ createdBy: id }).select('_id').lean()).map((a) => a._id);
  if (assessmentIds.length) {
    await AssessmentSubmission.deleteMany({ assessment: { $in: assessmentIds } });
    await Assessment.deleteMany({ _id: { $in: assessmentIds } });
  }
  await AssessmentSubmission.deleteMany({ user: id });
  await StudyMaterial.deleteMany({ createdBy: id });
  await LearningProgress.deleteMany({ user: id });
  await Notification.deleteMany({ recipient: id });
  await User.findByIdAndDelete(id);
}

/**
 * @param {string} role
 * @param {mongoose.Types.ObjectId|string} userId
 */
async function cascadeDeleteLimitedUser(role, userId) {
  if (role === 'student' || role === 'alumni') {
    await cascadeDeleteStudentLikeUser(userId);
    return;
  }
  if (role === 'faculty') {
    await cascadeDeleteFacultyUser(userId);
    return;
  }
  const err = new Error('UNSUPPORTED_ROLE');
  err.code = 'UNSUPPORTED_ROLE';
  throw err;
}

module.exports = {
  cascadeDeleteStudentLikeUser,
  cascadeDeleteFacultyUser,
  cascadeDeleteLimitedUser,
};

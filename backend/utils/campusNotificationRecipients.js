const User = require('../models/User');

/**
 * College user id for scoping notifications to campus learners.
 * - college role → own id
 * - faculty → managedByCollege or affiliatedCollege
 * - admin / others → null (caller should fall back to all students)
 */
function resolveCollegeIdForEditor(user) {
  if (!user) return null;
  const role = String(user.role || '')
    .trim()
    .toLowerCase();
  if (role === 'college') return user._id;
  if (role === 'faculty') {
    return user.managedByCollege || user.affiliatedCollege || null;
  }
  return null;
}

/**
 * Students linked to a college (signup or roster import).
 */
async function getCampusStudentIds(collegeUserId) {
  if (!collegeUserId) return [];
  const list = await User.find({
    role: 'student',
    $or: [{ affiliatedCollege: collegeUserId }, { managedByCollege: collegeUserId }],
  })
    .select('_id')
    .lean();
  return list.map((u) => u._id);
}

/**
 * For faculty approval: college that should receive the "new faculty" notice.
 */
function resolveCollegeIdForFacultyApproval(req, facultyUser) {
  const role = String(req.user?.role || '')
    .trim()
    .toLowerCase();
  if (role === 'college') return req.user._id;
  return facultyUser.managedByCollege || facultyUser.affiliatedCollege || null;
}

/**
 * Student ids to notify for an editor action: campus-only when college can be resolved, otherwise all students (admin).
 */
async function getStudentRecipientIdsForEditor(editorUser) {
  const collegeId = resolveCollegeIdForEditor(editorUser);
  if (!collegeId) {
    const all = await User.find({ role: 'student' }).select('_id').lean();
    return all.map((u) => u._id);
  }
  return getCampusStudentIds(collegeId);
}

module.exports = {
  resolveCollegeIdForEditor,
  getCampusStudentIds,
  resolveCollegeIdForFacultyApproval,
  getStudentRecipientIdsForEditor,
};

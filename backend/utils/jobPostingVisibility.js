/**
 * Visibility rules for open jobs shown to students, faculty, and college accounts.
 * Companies see only their own jobs via a separate query ({ createdBy }).
 */

const LEARNER_JOB_BROWSER_ROLES = ['student', 'faculty', 'college'];

function campusIdsForUser(user) {
  if (!user) return [];
  if (user.role === 'college') return [user._id].filter(Boolean);
  const ids = [];
  if (user.managedByCollege) ids.push(user.managedByCollege);
  if (user.affiliatedCollege) {
    const a = user.affiliatedCollege;
    if (!ids.some((i) => i.toString() === a.toString())) ids.push(a);
  }
  return ids;
}

/** Mongo filter fragment to AND with `{ status: 'open' }` for role-based job listings. */
function openJobVisibilityFilterForViewer(user) {
  if (user.role === 'college') {
    return {
      $or: [
        { postingAudience: { $ne: 'single_college' } },
        { targetCollege: user._id },
      ],
    };
  }
  const camp = campusIdsForUser(user);
  if (camp.length === 0) {
    return { $or: [{ postingAudience: { $ne: 'single_college' } }] };
  }
  return {
    $or: [
      { postingAudience: { $ne: 'single_college' } },
      { targetCollege: { $in: camp } },
    ],
  };
}

function canViewerSeeOpenJob(job, user) {
  if (!job || job.status !== 'open') return false;
  if (job.postingAudience !== 'single_college') return true;
  const target = job.targetCollege?.toString();
  if (!target) return false;
  return campusIdsForUser(user).some((id) => id.toString() === target);
}

module.exports = {
  LEARNER_JOB_BROWSER_ROLES,
  campusIdsForUser,
  openJobVisibilityFilterForViewer,
  canViewerSeeOpenJob,
};

/**
 * Student self-registration: must be approved by campus (college / faculty) or admin.
 * Legacy users with no field behave as approved.
 */
function isLegacyStudentCampusClear(status) {
  return status === undefined || status === null || status === 'approved';
}

function isStudentCampusAccessBlocked(user) {
  if (!user || String(user.role || '').toLowerCase() !== 'student') return false;
  const s = user.studentCampusApprovalStatus;
  if (s === 'pending' || s === 'rejected') return true;
  return false;
}

/**
 * Company self-registration:
 * - No partner college: only platform (admin) approval applies (legacy: no platform field => ok).
 * - With partner college: either admin OR that college can approve. The first approval should call
 *   `syncCompanyFullyApproved` so both `platformApprovalStatus` and `partnerCollegeApprovalStatus` become
 *   `approved`, keeping every dashboard in sync.
 */
function isCompanySelfRegistrationBlocked(user) {
  if (!user || String(user.role || '').toLowerCase() !== 'company') return false;

  const p = user.platformApprovalStatus;
  const pc = user.partnerCollegeApprovalStatus;
  const hasPartner = Boolean(user.partnerCollege);

  if (p === 'approved' || pc === 'approved') return false;

  if (p === 'rejected' && !hasPartner) return true;
  if (p === 'rejected' && pc !== 'approved') return true;
  if (hasPartner && pc === 'rejected' && p !== 'approved') return true;

  /* Legacy employers created before approval flags */
  if (!hasPartner && p == null && pc == null) return false;

  if (p === 'pending') return true;
  if (hasPartner && (pc === 'pending' || pc == null)) return true;

  return false;
}

/** When any approval authority accepts a partner company, sync so all views show approved. */
function syncCompanyFullyApproved(user) {
  user.platformApprovalStatus = 'approved';
  if (user.partnerCollege) {
    user.partnerCollegeApprovalStatus = 'approved';
  }
}

module.exports = {
  isLegacyStudentCampusClear,
  isStudentCampusAccessBlocked,
  isCompanySelfRegistrationBlocked,
  syncCompanyFullyApproved,
};

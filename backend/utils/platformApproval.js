/**
 * Platform (admin) approval for company self-registrations (with optional partner college).
 * Students use studentCampusApprovalStatus; faculty use facultyApprovalStatus.
 * Legacy company accounts with no flags behave as approved.
 */

const { isCompanySelfRegistrationBlocked } = require('./campusApproval');

const ROLES_WITH_PLATFORM_APPROVAL = ['company'];

function isPendingPlatformApproval(status) {
  return status === 'pending' || status === 'rejected';
}

function roleUsesPlatformApproval(role) {
  return ROLES_WITH_PLATFORM_APPROVAL.includes(String(role || '').toLowerCase());
}

/** True when API access should be limited to auth/me (and profile photo) for this user. */
function isPlatformApprovalBlockingApi(user) {
  if (!user || !roleUsesPlatformApproval(user.role)) return false;
  return isCompanySelfRegistrationBlocked(user);
}

module.exports = {
  ROLES_WITH_PLATFORM_APPROVAL,
  isPendingPlatformApproval,
  roleUsesPlatformApproval,
  isPlatformApprovalBlockingApi,
};

/**
 * Platform (admin) approval for company self-registrations only.
 * Students register without this gate; faculty use facultyApprovalStatus (college or admin).
 * Undefined / missing status means approved (legacy accounts).
 */

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
  return isPendingPlatformApproval(user.platformApprovalStatus);
}

module.exports = {
  ROLES_WITH_PLATFORM_APPROVAL,
  isPendingPlatformApproval,
  roleUsesPlatformApproval,
  isPlatformApprovalBlockingApi,
};

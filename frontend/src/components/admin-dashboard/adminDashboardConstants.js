/** Roles shown in admin charts and filters. */
export const ADMIN_DASHBOARD_ROLES = ["student", "faculty", "company", "admin", "college"];

export const DIRECTORY_PREVIEW_ROWS = 5;

export const emptyAnalytics = {
  totals: {
    totalUsers: 0,
    totalProfiles: 0,
    totalAssessments: 0,
    totalSubmissions: 0,
    totalJobs: 0,
    totalApplications: 0,
  },
  roles: {
    student: 0,
    faculty: 0,
    company: 0,
    admin: 0,
    college: 0,
  },
  recentUsers: [],
};

export const emptyInsights = {
  totals: {
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    pendingFacultyCount: 0,
    pendingStudentCampusCount: 0,
    pendingCollegesCount: 0,
    pendingPlatformCount: 0,
    managedStudentsCount: 0,
    collegeAccountsTotal: 0,
  },
  roleCounts: {
    student: 0,
    faculty: 0,
    company: 0,
    admin: 0,
    college: 0,
  },
  jobStatusCounts: { draft: 0, open: 0, closed: 0 },
  appStatusCounts: { applied: 0, reviewing: 0, shortlisted: 0, rejected: 0, hired: 0 },
  people: [],
  jobs: [],
  applications: [],
  pendingColleges: [],
  pendingPlatformUsers: [],
  registeredColleges: [],
  registeredCompanies: [],
  facultyDirectory: [],
};

const fs = require("fs");
const paths = [
  "src/components/student-dashboard/StudentDashboard.jsx",
  "src/components/faculty-dashboard/FacultyDashboard.jsx",
  "src/components/college-dashboard/CollegeDashboard.jsx",
  "src/components/company-dashboard/CompanyDashboard.jsx",
  "src/components/admin-dashboard/AdminDashboard.jsx",
  "src/pages/LearningHomePage.jsx",
  "src/pages/AdminUserProfilePage.jsx",
  "src/pages/CompanyJobsPage.jsx",
  "src/pages/CompanyTalentPage.jsx",
  "src/pages/CreateAssessment.jsx",
  "src/pages/AssessmentsList.jsx",
  "src/pages/AdminCollegeDetailPage.jsx",
  "src/pages/JobsPage.jsx",
  "src/pages/StudentAssessment.jsx",
  "src/pages/AdminJobsPage.jsx",
  "src/pages/JobDetailsPage.jsx",
  "src/pages/Dashboard.jsx",
  "src/pages/LearnerSummaryPage.jsx",
  "src/components/auth/AuthLayout.jsx",
];
const subs = [
  [/l2h-dark-ui /g, ""],
  [
    /min-h-screen bg-\[radial-gradient\(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%\)\][^\s\"]*/g,
    "min-h-screen bg-[var(--bg-app)]",
  ],
  [
    /flex min-h-screen items-center justify-center bg-\[radial-gradient[^\]]+\][^\s\"]*( text-slate-[^\s\"]*)?/g,
    "flex min-h-screen items-center justify-center bg-[var(--bg-app)] text-slate-600",
  ],
  [/border-white\/10/g, "border-slate-200"],
  [/border-white\/20/g, "border-slate-200"],
  [/bg-white\/5\b/g, "bg-white"],
  [/bg-white\/10\b/g, "bg-slate-50"],
  [/bg-slate-900\/60\b/g, "bg-slate-50"],
  [/bg-slate-900\/50\b/g, "bg-slate-50"],
  [/bg-slate-900\/70\b/g, "bg-white"],
  [/bg-slate-900\/80\b/g, "bg-white"],
];
for (const p of paths) {
  if (!fs.existsSync(p)) {
    console.log("skip", p);
    continue;
  }
  let s = fs.readFileSync(p, "utf8");
  for (const [re, rep] of subs) s = s.replace(re, rep);
  fs.writeFileSync(p, s, "utf8");
  console.log("ok", p);
}

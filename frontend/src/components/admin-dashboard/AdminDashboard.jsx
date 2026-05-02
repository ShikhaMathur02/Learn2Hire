import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Factory,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  MessageSquareQuote,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../dashboard/DashboardTopNav";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { VisibleFileInput } from "../ui/visible-file-input";
import { StudentRosterSheetFormatHelp } from "../bulk-import/StudentRosterSheetFormatHelp";
import {
  STUDENT_ROSTER_DEFAULT_PASSWORD,
  STUDENT_ROSTER_IMPORT_MATCH_RULES,
  STUDENT_ROSTER_IMPORT_SUMMARY,
} from "../../lib/studentRosterImportFormat";
import { BULK_SPREADSHEET_ACCEPT } from "../../lib/bulkSpreadsheetAccept";
import {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "../../lib/studentCohortFieldOptions";
import { clearAuthSession } from "../../lib/authSession";
import {
  saveAdminDashboardScrollBeforeNavigate,
  readAndClearAdminDashboardScroll,
} from "./adminDashboardScroll";
import {
  ADMIN_DASHBOARD_ROLES,
  DIRECTORY_PREVIEW_ROWS,
  emptyAnalytics,
  emptyInsights,
} from "./adminDashboardConstants";
import { MetricCard, DirectorySection, CollapsibleSection } from "./adminDashboardPieces";

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const goAdminSubpage = useCallback((to) => {
    saveAdminDashboardScrollBeforeNavigate();
    navigate(to);
  }, [navigate]);

  const goLearnerSummary = useCallback((id) => {
    saveAdminDashboardScrollBeforeNavigate();
    navigate(`/dashboard/learners/${id}`);
  }, [navigate]);

  /** Jump to a dashboard section (opens collapsible when hash matches). */
  const goToAdminHash = useCallback(
    (hashKey, navState) => {
      const h = hashKey.startsWith("#") ? hashKey : `#${hashKey}`;
      navigate(
        { pathname: location.pathname, search: location.search, hash: h },
        navState ? { state: navState } : undefined
      );
    },
    [navigate, location.pathname, location.search]
  );

  const openAdminPeopleRow = useCallback(
    (person) => {
      if (person.role === "college") {
        goAdminSubpage(`/admin/colleges/${person._id}`);
      } else {
        goLearnerSummary(person._id);
      }
    },
    [goAdminSubpage, goLearnerSummary]
  );

  useLayoutEffect(() => {
    const y = readAndClearAdminDashboardScroll();
    if (y == null) return;
    requestAnimationFrame(() => {
      window.scrollTo({ top: y, left: 0, behavior: "auto" });
    });
  }, []);
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [insights, setInsights] = useState(emptyInsights);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [peopleRoleFilter, setPeopleRoleFilter] = useState("all");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [studentSheetFile, setStudentSheetFile] = useState(null);
  const [materialSheetFile, setMaterialSheetFile] = useState(null);
  const [materialImageFile, setMaterialImageFile] = useState(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialCategoryId, setMaterialCategoryId] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [campusStudentSheetFile, setCampusStudentSheetFile] = useState(null);
  const [campusImportCollegeId, setCampusImportCollegeId] = useState("");
  const [campusImportCourse, setCampusImportCourse] = useState("");
  const [campusImportProgram, setCampusImportProgram] = useState("");
  const [campusImportYear, setCampusImportYear] = useState("");
  const [campusImportSemester, setCampusImportSemester] = useState("");
  const [campusImportBusy, setCampusImportBusy] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deletingJobId, setDeletingJobId] = useState("");
  const [collegeApprovalBusyId, setCollegeApprovalBusyId] = useState("");
  const [platformApprovalBusyId, setPlatformApprovalBusyId] = useState("");
  const [pendingCampusStudents, setPendingCampusStudents] = useState([]);
  const [studentCampusApprovalBusyId, setStudentCampusApprovalBusyId] = useState("");
  const [deletingCollegeId, setDeletingCollegeId] = useState("");
  /** Directory tables: show 5 rows until expanded. */
  const [showAllDirColleges, setShowAllDirColleges] = useState(false);
  const [showAllDirCompanies, setShowAllDirCompanies] = useState(false);
  const [showAllDirFaculty, setShowAllDirFaculty] = useState(false);

  const fetchDashboard = useCallback(
    async ({ silent } = {}) => {
      if (!user?.email) {
        navigate("/login");
        return;
      }

      if (!silent) setRefreshing(true);

      try {
        setError("");
        const headers = {};

        const [analyticsRes, insightsRes, pendingStudentsRes] = await Promise.all([
          fetch("/api/admin/analytics", { cache: "no-store", headers }),
          fetch("/api/admin/insights", { cache: "no-store", headers }),
          fetch("/api/college/students/pending", { cache: "no-store", headers }),
        ]);

        const [analyticsData, insightsData, pendingStudentsData] = await Promise.all([
          readApiResponse(analyticsRes),
          readApiResponse(insightsRes),
          readApiResponse(pendingStudentsRes),
        ]);

        if (
          analyticsRes.status === 401 ||
          insightsRes.status === 401 ||
          pendingStudentsRes.status === 401
        ) {
          clearAuthSession();
          navigate("/login");
          return;
        }

        if (!analyticsRes.ok) {
          throw new Error(analyticsData.message || "Failed to load admin analytics.");
        }
        if (!insightsRes.ok) {
          throw new Error(insightsData.message || "Failed to load admin insights.");
        }

        setAnalytics(analyticsData.data || emptyAnalytics);
        const nextInsights = insightsData.data || emptyInsights;
        setInsights(nextInsights);
        setPendingCampusStudents(
          pendingStudentsRes.ok ? pendingStudentsData.data?.users || [] : []
        );
      } catch (err) {
        setError(err.message || "Unable to load admin dashboard.");
      } finally {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    },
    [navigate, user?.email]
  );

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchDashboard({ silent: true });
    }, 45000);
    return () => window.clearInterval(id);
  }, [fetchDashboard]);

  useEffect(() => {
    const role = location.state?.adminPeopleRole;
    if (role && ADMIN_DASHBOARD_ROLES.includes(role)) {
      setPeopleRoleFilter(role);
    }
  }, [location.state, location.hash]);

  useEffect(() => {
    const h = (location.hash || "").replace(/^#/, "");
    if (h !== "admin-pending-colleges") return undefined;
    const t = window.setTimeout(() => {
      document.getElementById("admin-pending-colleges")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => window.clearTimeout(t);
  }, [location.hash]);

  const filteredPeople = useMemo(() => {
    const search = peopleSearch.trim().toLowerCase();
    return (insights.people || []).filter((u) => {
      if (peopleRoleFilter !== "all" && u.role !== peopleRoleFilter) return false;
      if (!search) return true;
      const hay = [
        u.name,
        u.email,
        u.role,
        u.course,
        u.branch,
        u.year,
        u.semester,
        u.bio,
        u.department,
        u.studentPhone,
        u.fatherName,
        u.motherName,
        u.fatherPhone,
        u.motherPhone,
        u.city,
        u.state,
        u.pincode,
      ]
        .map((x) => String(x || "").toLowerCase())
        .join(" ");
      return hay.includes(search);
    });
  }, [insights.people, peopleRoleFilter, peopleSearch]);

  const recentJobs = useMemo(() => (insights.jobs || []).slice(0, 8), [insights.jobs]);
  const recentApplications = useMemo(
    () => (insights.applications || []).slice(0, 10),
    [insights.applications]
  );

  const roleBarTotal = useMemo(() => {
    const c = insights.roleCounts || {};
    return ADMIN_DASHBOARD_ROLES.reduce((acc, role) => acc + (Number(c[role]) || 0), 0);
  }, [insights.roleCounts]);

  const registeredCollegesList = useMemo(() => insights.registeredColleges || [], [insights.registeredColleges]);

  const approvedCollegesForImport = useMemo(
    () =>
      registeredCollegesList.filter(
        (c) => c.collegeApprovalStatus !== "pending" && c.collegeApprovalStatus !== "rejected"
      ),
    [registeredCollegesList]
  );

  /** Same total as Live overview "Colleges" card and role distribution (server countDocuments). */
  const collegeAccountsTotal = useMemo(
    () => insights.totals?.collegeAccountsTotal ?? registeredCollegesList.length,
    [insights.totals?.collegeAccountsTotal, registeredCollegesList.length]
  );
  const registeredCompaniesList = useMemo(() => insights.registeredCompanies || [], [insights.registeredCompanies]);
  const facultyDirectoryList = useMemo(() => insights.facultyDirectory || [], [insights.facultyDirectory]);

  const collegesTableRows = useMemo(
    () =>
      showAllDirColleges ? registeredCollegesList : registeredCollegesList.slice(0, DIRECTORY_PREVIEW_ROWS),
    [registeredCollegesList, showAllDirColleges]
  );
  const companiesTableRows = useMemo(
    () =>
      showAllDirCompanies ? registeredCompaniesList : registeredCompaniesList.slice(0, DIRECTORY_PREVIEW_ROWS),
    [registeredCompaniesList, showAllDirCompanies]
  );
  const facultyTableRows = useMemo(
    () =>
      showAllDirFaculty ? facultyDirectoryList : facultyDirectoryList.slice(0, DIRECTORY_PREVIEW_ROWS),
    [facultyDirectoryList, showAllDirFaculty]
  );

  const handleCollegeApproval = async (collegeUserId, decision) => {
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setCollegeApprovalBusyId(collegeUserId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/colleges/${collegeUserId}/approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.message || "Could not update college.");
      }
      setSuccess(data.message || "Updated.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "College approval failed.");
    } finally {
      setCollegeApprovalBusyId("");
    }
  };

  const handlePlatformUserApproval = async (targetUserId, decision) => {
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setPlatformApprovalBusyId(targetUserId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/platform-approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.message || "Could not update account approval.");
      }
      setSuccess(data.message || "Updated.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Platform approval failed.");
    } finally {
      setPlatformApprovalBusyId("");
    }
  };

  const handleAdminStudentCampusApproval = async (studentUserId, decision) => {
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setStudentCampusApprovalBusyId(studentUserId);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/college/students/${studentUserId}/campus-approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.message || "Could not update student approval.");
      }
      setSuccess(data.message || "Updated.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Student campus approval failed.");
    } finally {
      setStudentCampusApprovalBusyId("");
    }
  };

  const formatLiveStamp = (iso) => {
    if (!iso) return "—";
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return "—";
    const d = Date.now() - t;
    if (d < 5000) return "just now";
    if (d < 60000) return `${Math.floor(d / 1000)}s ago`;
    if (d < 3600000) return `${Math.floor(d / 60000)}m ago`;
    return new Date(iso).toLocaleString();
  };

  const handleDeleteCollege = async (collegeUserId) => {
    if (
      !window.confirm(
        "Delete this college account? Student and faculty accounts remain, but campus links are cleared. Assessments created by this college login are removed. Continue?"
      )
    ) {
      return;
    }
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setDeletingCollegeId(collegeUserId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/colleges/${collegeUserId}`, {
        method: "DELETE",
        headers: {},
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete college.");
      }
      setSuccess(data.message || "College removed.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "College delete failed.");
    } finally {
      setDeletingCollegeId("");
    }
  };

  const handleDeleteUser = async (userId, roleLabel) => {
    const msg =
      roleLabel === "faculty"
        ? "Delete this faculty account? Assessments and study materials they created will be removed. This cannot be undone."
        : roleLabel === "company"
          ? "Delete this company account? All their job postings and applications for those jobs will be removed. This cannot be undone."
          : `Delete this ${roleLabel} account? This cannot be undone. Related learner data will be removed.`;
    if (!window.confirm(msg)) {
      return;
    }
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setDeletingUserId(userId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {},
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete user.");
      }
      setSuccess(data.message || "User removed.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Delete failed.");
    } finally {
      setDeletingUserId("");
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Delete this job and its applications/saves?")) return;
    if (!user?.email) {
      navigate("/login");
      return;
    }
    setDeletingJobId(jobId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: {},
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete job.");
      }
      setSuccess("Job deleted.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Job delete failed.");
    } finally {
      setDeletingJobId("");
    }
  };

  const handleAdminStudentImport = async () => {
    if (!user?.email || !studentSheetFile) return;
    setError("");
    setSuccess("");
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", studentSheetFile);
      const response = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Student import failed.");
      setSuccess(data.message || "Student import completed.");
      setStudentSheetFile(null);
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Student import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleAdminCampusStudentImport = async () => {
    if (!user?.email || !campusStudentSheetFile) return;
    if (
      !campusImportCollegeId.trim() ||
      !campusImportCourse.trim() ||
      !campusImportProgram.trim() ||
      !campusImportYear.trim()
    ) {
      setError("Choose an approved college and the class (course, program, year) that matches each row in the file.");
      setSuccess("");
      return;
    }
    setError("");
    setSuccess("");
    setCampusImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", campusStudentSheetFile);
      fd.append("collegeId", campusImportCollegeId.trim());
      fd.append("targetCourse", campusImportCourse.trim());
      fd.append("targetProgram", campusImportProgram.trim());
      fd.append("targetYear", campusImportYear.trim());
      fd.append("targetSemester", campusImportSemester.trim());
      const response = await fetch("/api/college/roster/import/students", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Campus student import failed.");
      setSuccess(data.message || "Campus student import completed.");
      setCampusStudentSheetFile(null);
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Campus student import failed.");
    } finally {
      setCampusImportBusy(false);
    }
  };

  const handleMaterialSheetImport = async () => {
    if (!user?.email || !materialSheetFile) return;
    setError("");
    setSuccess("");
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", materialSheetFile);
      const response = await fetch("/api/learning/manage/materials/import", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Material import failed.");
      setSuccess(data.message || "Material import completed.");
      setMaterialSheetFile(null);
    } catch (err) {
      setError(err.message || "Material import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  const handleMaterialImageCreate = async () => {
    if (!user?.email || !materialImageFile || !materialTitle.trim() || !materialCategoryId.trim()) return;
    setError("");
    setSuccess("");
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", materialImageFile);
      fd.append("title", materialTitle.trim());
      fd.append("categoryId", materialCategoryId.trim());
      const response = await fetch("/api/learning/manage/materials/from-image", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.message || "Material create from image failed.");
      setSuccess(data.message || "Material created from image.");
      setMaterialTitle("");
      setMaterialImageFile(null);
    } catch (err) {
      setError(err.message || "Material create from image failed.");
    } finally {
      setImportBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] text-slate-600">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div
      className="l2h-workspace-canvas relative min-h-screen text-[var(--text)]"
      data-l2h-workspace="admin"
    >
      <div className="l2h-container-app relative w-full py-5 sm:py-7">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Admin Workspace"
          title="Platform command center"
          user={{ name: user.name, email: user.email, role: user.role }}
          showHistoryBack
          onLogout={onLogout}
          actionItems={[
            { label: "Manage learning", to: "/dashboard/learning/manage", icon: ClipboardCheck },
            { label: "Create assessment", to: "/assessments/create", icon: BarChart3 },
            { label: "Landing stories", to: "/admin/testimonials", icon: MessageSquareQuote },
            { label: "Manage jobs", to: "/admin/jobs", icon: BriefcaseBusiness },
            { label: "Go to home", onClick: () => navigate("/") },
          ]}
        />

        <div className="mt-4 rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/92 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] backdrop-blur-md">
          <div className="space-y-6 p-5 sm:p-6 xl:p-7">
          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
              {success}
            </div>
          ) : null}

          <div className="relative mt-2 overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-card)]/95 p-5 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] sm:p-6">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--primary)]/15 blur-3xl" aria-hidden />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-[var(--primary)] ring-1 ring-slate-950/[0.04]">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)]">
                    Live overview
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
                    <Activity className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden />
                    <span>Updated {formatLiveStamp(insights.generatedAt)}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                className="shrink-0 gap-2 shadow-md shadow-[var(--primary)]/15"
                onClick={() => fetchDashboard({ silent: false })}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh data"}
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Total Users"
                value={analytics.totals.totalUsers}
                subtitle="All people on Learn2Hire"
                icon={Users}
                onClick={() => goToAdminHash("admin-section-all-people")}
              />
              <MetricCard
                title="Colleges"
                value={collegeAccountsTotal}
                subtitle="Campus accounts (matches roster below)"
                icon={Building2}
                onClick={() => goToAdminHash("admin-section-campus-accounts")}
              />
              <MetricCard
                title="Companies"
                value={insights.roleCounts.company || 0}
                subtitle="Recruiting organizations"
                icon={Factory}
                onClick={() => goToAdminHash("admin-section-companies")}
              />
              <MetricCard
                title="Open Jobs"
                value={insights.jobStatusCounts.open || 0}
                subtitle="Active opportunities"
                icon={BriefcaseBusiness}
                onClick={() => goAdminSubpage("/admin/jobs")}
              />
              <MetricCard
                title="Applications"
                value={analytics.totals.totalApplications}
                subtitle="Submitted by students"
                icon={BarChart3}
                onClick={() => goToAdminHash("admin-section-recent-jobs")}
              />
            </div>
          </div>

            <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Students"
                value={insights.roleCounts.student || 0}
                subtitle="Learner accounts"
                icon={GraduationCap}
                onClick={() =>
                  goToAdminHash("admin-section-all-people", { adminPeopleRole: "student" })
                }
              />
              <MetricCard
                title="Faculty Pending"
                value={insights.totals.pendingFacultyCount || 0}
                subtitle="Waiting for approval"
                icon={ShieldCheck}
                onClick={() => goToAdminHash("admin-section-faculty")}
              />
              <MetricCard
                title="Students Pending"
                value={insights.totals.pendingStudentCampusCount || 0}
                subtitle="Campus signup review"
                icon={UserPlus}
                onClick={() =>
                  goToAdminHash(
                    pendingCampusStudents.length > 0 ? "admin-pending-students" : "admin-section-all-people"
                  )
                }
              />
              <MetricCard
                title="Colleges Pending"
                value={insights.totals.pendingCollegesCount || 0}
                subtitle="Awaiting platform approval"
                icon={Building2}
                onClick={() =>
                  goToAdminHash(
                    (insights.pendingColleges || []).length > 0
                      ? "admin-pending-colleges"
                      : "admin-section-campus-accounts"
                  )
                }
              />
              <MetricCard
                title="Companies Pending"
                value={insights.totals.pendingPlatformCount || 0}
                subtitle="Self-service company sign-ups"
                icon={UserCheck}
                onClick={() =>
                  goToAdminHash(
                    (insights.pendingPlatformUsers || []).length > 0
                      ? "admin-pending-platform"
                      : "admin-section-all-people"
                  )
                }
              />
              <MetricCard
                title="Managed Students"
                value={insights.totals.managedStudentsCount || 0}
                subtitle="Assigned to colleges"
                icon={Users}
                onClick={() => goToAdminHash("admin-section-campus-accounts")}
              />
              <MetricCard
                title="Assessments"
                value={analytics.totals.totalAssessments}
                subtitle="Published and draft"
                icon={ClipboardCheck}
                onClick={() => goAdminSubpage("/assessments")}
              />
            </div>

            {(insights.pendingColleges || []).length > 0 ? (
              <Card
                id="admin-pending-colleges"
                className="scroll-mt-28 overflow-hidden border border-amber-200 bg-amber-50/70 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300 bg-amber-100 text-amber-900 shadow-sm">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text)] sm:text-xl">
                        College registrations pending approval
                      </h2>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        Self-service college sign-ups. Approve so students and faculty can join under that campus.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {(insights.pendingColleges || []).map((c) => (
                      <li
                        key={c._id}
                        role="button"
                        tabIndex={0}
                        className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-amber-300/60 hover:bg-amber-50/50 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => goAdminSubpage(`/admin/colleges/${c._id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goAdminSubpage(`/admin/colleges/${c._id}`);
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text)]">{c.name}</p>
                          <p className="truncate text-sm text-[var(--text-muted)]">{c.email}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              goAdminSubpage(`/admin/colleges/${c._id}`);
                            }}
                          >
                            View campus
                          </Button>
                          <Button
                            type="button"
                            variant="success"
                            className="h-10"
                            disabled={collegeApprovalBusyId === c._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollegeApproval(c._id, "approved");
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="h-10"
                            disabled={collegeApprovalBusyId === c._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollegeApproval(c._id, "rejected");
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {pendingCampusStudents.length > 0 ? (
              <Card
                id="admin-pending-students"
                className="scroll-mt-28 overflow-hidden border border-indigo-200 bg-indigo-50/70 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-300 bg-indigo-100 text-indigo-900 shadow-sm">
                      <UserPlus className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text)] sm:text-xl">
                        Student signups pending campus approval
                      </h2>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        Learners who registered under a college. Approve or reject here—the same action college and
                        faculty approvers can take from their campus dashboards.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {pendingCampusStudents.map((u) => (
                      <li
                        key={u._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text)]">{u.name}</p>
                          <p className="truncate text-sm text-[var(--text-muted)]">{u.email}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10"
                            onClick={() => {
                              saveAdminDashboardScrollBeforeNavigate();
                              navigate(`/dashboard/learners/${u._id}`);
                            }}
                          >
                            View profile
                          </Button>
                          <Button
                            type="button"
                            variant="success"
                            className="h-10"
                            disabled={studentCampusApprovalBusyId === u._id}
                            onClick={() => handleAdminStudentCampusApproval(u._id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="h-10"
                            disabled={studentCampusApprovalBusyId === u._id}
                            onClick={() => handleAdminStudentCampusApproval(u._id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}

            {(insights.pendingPlatformUsers || []).length > 0 ? (
              <Card
                id="admin-pending-platform"
                className="scroll-mt-28 overflow-hidden border border-sky-200 bg-sky-50/70 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-300 bg-sky-100 text-sky-950 shadow-sm">
                      <UserCheck className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-[var(--text)] sm:text-xl">
                        Company registrations pending approval
                      </h2>
                      <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                        Self-service company sign-ups. If the employer chose a partner campus, either that campus
                        or you can approve — the first approval fully activates them across the platform. Companies
                        without a partner campus appear here for platform administrators only.
                      </p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {(insights.pendingPlatformUsers || []).map((u) => (
                      <li
                        key={u._id}
                        role="button"
                        tabIndex={0}
                        className="group flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300/60 hover:bg-sky-50/40 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => {
                          saveAdminDashboardScrollBeforeNavigate();
                          navigate(`/dashboard/learners/${u._id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            saveAdminDashboardScrollBeforeNavigate();
                            navigate(`/dashboard/learners/${u._id}`);
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text)]">
                            {u.name}{" "}
                            <span className="font-normal capitalize text-[var(--text-muted)]">
                              · {u.role}
                            </span>
                          </p>
                          <p className="truncate text-sm text-[var(--text-muted)]">{u.email}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Requested {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveAdminDashboardScrollBeforeNavigate();
                              navigate(`/dashboard/learners/${u._id}`);
                            }}
                          >
                            View profile
                          </Button>
                          <Button
                            type="button"
                            variant="success"
                            className="h-10"
                            disabled={platformApprovalBusyId === u._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlatformUserApproval(u._id, "approved");
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="h-10"
                            disabled={platformApprovalBusyId === u._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlatformUserApproval(u._id, "rejected");
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div id="admin-insights-grid" className="scroll-mt-28 mt-5 grid gap-6 xl:grid-cols-3">
            <Card className="overflow-hidden border border-[var(--border)] bg-white/95 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-[var(--text)]">Role distribution</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Share of users by role. Click a row to open matching accounts below.
                </p>
                <div className="mt-5 space-y-3">
                  {ADMIN_DASHBOARD_ROLES.map((role) => {
                    const count = insights.roleCounts[role] || 0;
                    const pct = roleBarTotal > 0 ? Math.min(100, Math.round((count / roleBarTotal) * 100)) : 0;
                    return (
                      <button
                        key={role}
                        type="button"
                        className="group w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-[color:var(--primary)]/35 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                        onClick={() => goToAdminHash("admin-section-all-people", { adminPeopleRole: role })}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize text-slate-700 group-hover:text-slate-900">{role}</span>
                          <span className="font-semibold tabular-nums text-slate-900 group-hover:text-slate-950">
                            {count}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] via-sky-500 to-indigo-500 transition-[width] duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border border-[var(--border)] bg-white/95 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-[var(--text)]">Job status</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Posting lifecycle across the platform. Click to manage jobs.
                </p>
                <div className="mt-5 space-y-3">
                  {Object.entries(insights.jobStatusCounts || {}).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/35"
                      onClick={() => goAdminSubpage("/admin/jobs")}
                    >
                      <span className="capitalize text-slate-700 group-hover:text-slate-900">{k}</span>
                      <span className="font-semibold tabular-nums text-slate-900 group-hover:text-emerald-900">{v}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border border-[var(--border)] bg-white/95 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-[var(--text)]">Application pipeline</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  Student applications by stage. Click to review recent activity.
                </p>
                <div className="mt-5 space-y-3">
                  {Object.entries(insights.appStatusCounts || {}).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35"
                      onClick={() => goToAdminHash("admin-section-recent-jobs")}
                    >
                      <span className="capitalize text-slate-700 group-hover:text-slate-900">{k}</span>
                      <span className="font-semibold tabular-nums text-slate-900 group-hover:text-violet-900">{v}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--primary)]">
                    Signed in
                  </p>
                  <p className="mt-2 font-semibold text-[var(--text)]">{user?.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <CollapsibleSection
            title="Bulk imports & materials"
            subtitle="Student and learning content uploads—collapsed by default to keep the page short."
            defaultOpen={false}
            sectionId="admin-section-bulk-imports"
          >
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-3">
            <Card className="border border-[var(--border)] bg-white/95 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] transition hover:border-[color:var(--primary)]/25">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text)]">Bulk students (platform)</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Creates student logins not tied to a campus. Upload{" "}
                  <code className="rounded bg-slate-100 px-1 font-mono text-slate-800">.xlsx</code>, <code className="rounded bg-slate-100 px-1 font-mono text-slate-800">.xls</code>, or{" "}
                  <code className="rounded bg-slate-100 px-1 font-mono text-slate-800">.csv</code> with columns:{" "}
                  <strong className="text-[var(--text)]">name</strong>,{" "}
                  <strong className="text-[var(--text)]">email</strong>, <strong className="text-[var(--text)]">password</strong>{" "}
                  (one row per student).
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  To import learners under an approved college with the roster sheet (S.No., Department, Branch, …), use
                  <span className="text-slate-400"> Campus roster import</span> below.
                </p>
                <input
                  type="file"
                  accept={BULK_SPREADSHEET_ACCEPT}
                  className="mt-4 w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={(e) => setStudentSheetFile(e.target.files?.[0] || null)}
                />
                <Button className="mt-4 w-full" disabled={!studentSheetFile || importBusy} onClick={handleAdminStudentImport}>
                  Import students
                </Button>
              </CardContent>
            </Card>
            <Card className="border border-[var(--border)] bg-white/95 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] transition hover:border-[color:var(--primary)]/25">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text)]">Bulk materials (Excel or CSV)</h3>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Use title, summary, content, categorySlug/categoryId columns.
                </p>
                <input
                  type="file"
                  accept={BULK_SPREADSHEET_ACCEPT}
                  className="mt-4 w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={(e) => setMaterialSheetFile(e.target.files?.[0] || null)}
                />
                <Button className="mt-4 w-full" disabled={!materialSheetFile || importBusy} onClick={handleMaterialSheetImport}>
                  Import materials
                </Button>
              </CardContent>
            </Card>
            <Card className="border border-[var(--border)] bg-white/95 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] transition hover:border-[color:var(--primary)]/25">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text)]">Material from image</h3>
                <input
                  placeholder="Material title"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                />
                <input
                  placeholder="Category ID"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={materialCategoryId}
                  onChange={(e) => setMaterialCategoryId(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="mt-3 w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                  onChange={(e) => setMaterialImageFile(e.target.files?.[0] || null)}
                />
                <Button
                  className="mt-4 w-full"
                  disabled={!materialImageFile || !materialTitle.trim() || !materialCategoryId.trim() || importBusy}
                  onClick={handleMaterialImageCreate}
                >
                  Create from image
                </Button>
              </CardContent>
            </Card>
          </div>
            <Card className="border border-sky-200 bg-sky-50/80 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text)]">Campus roster import (Excel or CSV)</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">
                      Adds students to an <strong className="text-[var(--text)]">approved</strong> college with managed campus
                      accounts. {STUDENT_ROSTER_IMPORT_SUMMARY} {STUDENT_ROSTER_IMPORT_MATCH_RULES}{" "}
                      <span className="text-slate-600">Default password: </span>
                      <code className="rounded bg-white px-1 font-mono text-sm font-semibold text-[var(--primary)]">
                        {STUDENT_ROSTER_DEFAULT_PASSWORD}
                      </code>
                      .
                    </p>
                  </div>
                  <StudentRosterSheetFormatHelp className="shrink-0 !border-[var(--border)] !bg-white !text-[var(--primary)] hover:!bg-slate-50" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <label className="text-xs font-medium text-slate-400">College</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={campusImportCollegeId}
                      onChange={(e) => setCampusImportCollegeId(e.target.value)}
                      disabled={campusImportBusy}
                    >
                      <option value="">Select college</option>
                      {approvedCollegesForImport.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Course (match file)</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={campusImportCourse}
                      onChange={(e) => setCampusImportCourse(e.target.value)}
                      disabled={campusImportBusy}
                    >
                      <option value="">Select</option>
                      {STUDENT_COHORT_PROGRAM_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Program / branch</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={campusImportProgram}
                      onChange={(e) => setCampusImportProgram(e.target.value)}
                      disabled={campusImportBusy}
                    >
                      <option value="">Select</option>
                      {STUDENT_COHORT_BRANCH_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Year</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={campusImportYear}
                      onChange={(e) => setCampusImportYear(e.target.value)}
                      disabled={campusImportBusy}
                    >
                      <option value="">Select</option>
                      {STUDENT_COHORT_YEAR_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400">Semester (optional)</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                      value={campusImportSemester}
                      onChange={(e) => setCampusImportSemester(e.target.value)}
                      disabled={campusImportBusy}
                    >
                      <option value="">—</option>
                      {STUDENT_COHORT_SEMESTER_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <VisibleFileInput
                  className="mt-4"
                  id="admin-campus-roster-file"
                  label="Spreadsheet file"
                  accept={BULK_SPREADSHEET_ACCEPT}
                  onChange={(e) => setCampusStudentSheetFile(e.target.files?.[0] || null)}
                  disabled={campusImportBusy}
                />
                <Button
                  className="mt-4 w-full sm:w-auto"
                  disabled={
                    campusImportBusy ||
                    !campusStudentSheetFile ||
                    !campusImportCollegeId.trim() ||
                    !campusImportCourse.trim() ||
                    !campusImportProgram.trim() ||
                    !campusImportYear.trim()
                  }
                  onClick={handleAdminCampusStudentImport}
                >
                  {campusImportBusy ? "Importing…" : "Import campus students"}
                </Button>
              </CardContent>
            </Card>
          </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Campus accounts (colleges)"
            subtitle={
              collegeAccountsTotal > DIRECTORY_PREVIEW_ROWS
                ? `Campus roster (${collegeAccountsTotal} total). The table shows the first ${DIRECTORY_PREVIEW_ROWS} rows until you expand — same count as the Colleges card above.`
                : "Campus roster, approval state, and removal — same count as the Colleges card above."
            }
            badge={collegeAccountsTotal ? `${collegeAccountsTotal}` : ""}
            defaultOpen={false}
            sectionId="admin-section-campus-accounts"
          >
            <DirectorySection
              icon={Building2}
              eyebrow="Campuses"
              title="Campus accounts (colleges)"
              description="Full roster, approval state, and safe removal—same as before, with a clearer layout."
            >
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Campus name</th>
                      <th className="px-4 py-3.5 font-semibold">Login email</th>
                      <th className="px-4 py-3.5 font-semibold">Platform status</th>
                      <th className="px-4 py-3.5 font-semibold">Registered</th>
                      <th className="px-4 py-3.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredCollegesList.length ? (
                      collegesTableRows.map((c) => (
                        <tr
                          key={c._id}
                          className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.08]"
                          onClick={() => goAdminSubpage(`/admin/colleges/${c._id}`)}
                        >
                          <td className="px-4 py-3.5 font-medium text-[var(--text)]">{c.name}</td>
                          <td className="px-4 py-3.5 text-slate-300">{c.email}</td>
                          <td className="px-4 py-3.5 capitalize text-slate-400">
                            {c.collegeApprovalStatus === "pending"
                              ? "pending"
                              : c.collegeApprovalStatus === "rejected"
                                ? "rejected"
                                : "approved"}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {c.createdAt ? new Date(c.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-9 min-w-[9rem] justify-center text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goAdminSubpage(`/admin/colleges/${c._id}`);
                                }}
                              >
                                Campus profile
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-9 min-w-[9rem] justify-center text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goAdminSubpage(`/admin/users/${c._id}`);
                                }}
                              >
                                Login details
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCollege(c._id);
                                }}
                                disabled={deletingCollegeId === c._id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingCollegeId === c._id ? "…" : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                          No college accounts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DirectorySection>
            {registeredCollegesList.length > DIRECTORY_PREVIEW_ROWS ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowAllDirColleges((v) => !v)}
                >
                  {showAllDirColleges
                    ? `Show only first ${DIRECTORY_PREVIEW_ROWS}`
                    : `Show all ${registeredCollegesList.length} campuses`}
                </Button>
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="Company accounts"
            subtitle="Recruiters and hiring teams. Open the section to preview five rows; show all when needed."
            badge={registeredCompaniesList.length ? `${registeredCompaniesList.length}` : ""}
            defaultOpen={false}
            sectionId="admin-section-companies"
          >
            <DirectorySection
              icon={Factory}
              eyebrow="Employers"
              title="Company accounts"
              description="Recruiters and hiring teams on the platform. Open a profile to adjust roles or review details in one place."
            >
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Company name</th>
                      <th className="px-4 py-3.5 font-semibold">Login email</th>
                      <th className="px-4 py-3.5 font-semibold">Registered</th>
                      <th className="px-4 py-3.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredCompaniesList.length ? (
                      companiesTableRows.map((co) => (
                        <tr
                          key={co._id}
                          className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.08]"
                          onClick={() => goLearnerSummary(co._id)}
                        >
                          <td className="px-4 py-3.5 font-medium text-[var(--text)]">{co.name}</td>
                          <td className="px-4 py-3.5 text-slate-300">{co.email}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {co.createdAt ? new Date(co.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-9 min-w-[9rem] justify-center text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goLearnerSummary(co._id);
                                }}
                              >
                                View profile
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="soft"
                                className="min-h-9 min-w-[9rem] justify-center text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goAdminSubpage(`/admin/users/${co._id}`);
                                }}
                              >
                                Admin record
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(co._id, "company");
                                }}
                                disabled={deletingUserId === co._id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingUserId === co._id ? "…" : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                          No company accounts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DirectorySection>
            {registeredCompaniesList.length > DIRECTORY_PREVIEW_ROWS ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowAllDirCompanies((v) => !v)}
                >
                  {showAllDirCompanies
                    ? `Show only first ${DIRECTORY_PREVIEW_ROWS}`
                    : `Show all ${registeredCompaniesList.length} companies`}
                </Button>
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="Faculty directory"
            subtitle="Teaching staff by campus and approval. Open to preview five rows; expand the list for the full directory."
            badge={facultyDirectoryList.length ? `${facultyDirectoryList.length}` : ""}
            defaultOpen={false}
            sectionId="admin-section-faculty"
          >
            <DirectorySection
              icon={UserRound}
              eyebrow="Teaching staff"
              title="Faculty directory"
              description="Each row shows the campus they belong to (approved assignment or signup selection) and their approval state."
            >
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold">Faculty name</th>
                      <th className="px-4 py-3.5 font-semibold">Email</th>
                      <th className="px-4 py-3.5 font-semibold">Campus</th>
                      <th className="px-4 py-3.5 font-semibold">Approval</th>
                      <th className="px-4 py-3.5 font-semibold">Joined</th>
                      <th className="px-4 py-3.5 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facultyDirectoryList.length ? (
                      facultyTableRows.map((f) => (
                        <tr
                          key={f._id}
                          className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.08]"
                          onClick={() => goLearnerSummary(f._id)}
                        >
                          <td className="px-4 py-3.5 font-medium text-[var(--text)]">{f.name}</td>
                          <td className="px-4 py-3.5 text-slate-300">{f.email}</td>
                          <td className="max-w-[14rem] px-4 py-3.5 text-slate-300">
                            <span className="line-clamp-2" title={f.campusName || ""}>
                              {f.campusName || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs capitalize text-slate-400">
                            {f.facultyApprovalStatus || "approved"}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="min-h-9 min-w-[9rem] justify-center text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goLearnerSummary(f._id);
                                }}
                              >
                                View profile
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="soft"
                                className="min-h-9 min-w-[9rem] justify-center text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goAdminSubpage(`/admin/users/${f._id}`);
                                }}
                              >
                                Admin record
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteUser(f._id, "faculty");
                                }}
                                disabled={deletingUserId === f._id}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingUserId === f._id ? "…" : "Delete"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                          No faculty accounts yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DirectorySection>
            {facultyDirectoryList.length > DIRECTORY_PREVIEW_ROWS ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setShowAllDirFaculty((v) => !v)}
                >
                  {showAllDirFaculty
                    ? `Show only first ${DIRECTORY_PREVIEW_ROWS}`
                    : `Show all ${facultyDirectoryList.length} faculty`}
                </Button>
              </div>
            ) : null}
          </CollapsibleSection>

          <CollapsibleSection
            title="All people management"
            subtitle="Search and edit accounts from the latest synced sample. Expand when you need bulk edits."
            badge={filteredPeople.length ? `${filteredPeople.length} shown` : ""}
            defaultOpen={false}
            sectionId="admin-section-all-people"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <select
                  value={peopleRoleFilter}
                  onChange={(e) => setPeopleRoleFilter(e.target.value)}
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="all">All roles</option>
                  {ADMIN_DASHBOARD_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <input
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Search name or email"
                  className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                />
              </div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 shadow-sm">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Campus</th>
                    <th className="px-3 py-3 font-semibold">Faculty</th>
                    <th className="px-3 py-3 font-semibold">Course details</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.length ? (
                    filteredPeople.map((person) => {
                      const cohortLine =
                        person.role === "student"
                          ? [person.course, person.branch, person.year, person.semester]
                              .filter(Boolean)
                              .join(" · ") || "—"
                          : "—";
                      const campusName =
                        person.managedByCollege?.name || person.affiliatedCollege?.name || "";
                      return (
                        <tr
                          key={person._id}
                          className="cursor-pointer border-b border-white/5 transition last:border-0 hover:bg-white/[0.08]"
                          onClick={() => openAdminPeopleRow(person)}
                        >
                          <td className="px-3 py-3 align-top text-[var(--text)]">
                            <span className="block max-w-[10rem] truncate" title={person.name || ""}>
                              {person.name}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-slate-300">
                            <span className="block max-w-[12rem] truncate" title={person.email || ""}>
                              {person.email}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top capitalize">{person.role}</td>
                          <td className="px-3 py-3 align-top text-slate-400">
                            <span className="block max-w-[10rem] truncate text-xs" title={campusName}>
                              {campusName || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top text-xs capitalize text-slate-400">
                            {person.role === "faculty"
                              ? person.facultyApprovalStatus || "approved"
                              : "—"}
                          </td>
                          <td className="max-w-[14rem] px-3 py-3 align-top text-xs text-slate-400">
                            <span className="line-clamp-2" title={cohortLine}>
                              {cohortLine}
                            </span>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                              {person.role === "college" ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="min-h-9 min-w-[9rem] justify-center text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goAdminSubpage(`/admin/colleges/${person._id}`);
                                    }}
                                  >
                                    Campus profile
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="min-h-9 min-w-[9rem] justify-center text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goAdminSubpage(`/admin/users/${person._id}`);
                                    }}
                                  >
                                    Login details
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCollege(person._id);
                                    }}
                                    disabled={deletingCollegeId === person._id}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {deletingCollegeId === person._id ? "…" : "Delete"}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="min-h-9 min-w-[9rem] justify-center text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goLearnerSummary(person._id);
                                    }}
                                  >
                                    View profile
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="soft"
                                    className="min-h-9 min-w-[9rem] justify-center text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      goAdminSubpage(`/admin/users/${person._id}`);
                                    }}
                                  >
                                    Admin record
                                  </Button>
                                  {person.role === "student" && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteUser(person._id, person.role);
                                      }}
                                      disabled={deletingUserId === person._id}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {deletingUserId === person._id ? "…" : "Delete"}
                                    </Button>
                                  )}
                                  {person.role === "faculty" && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteUser(person._id, "faculty");
                                      }}
                                      disabled={deletingUserId === person._id}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {deletingUserId === person._id ? "…" : "Delete"}
                                    </Button>
                                  )}
                                  {person.role === "company" && (
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      className="min-h-9 min-w-[9rem] justify-center gap-1 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteUser(person._id, "company");
                                      }}
                                      disabled={deletingUserId === person._id}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      {deletingUserId === person._id ? "…" : "Delete"}
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                        No users match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Recent jobs & applications"
            subtitle="Latest postings and who applied—expand to review or remove a job."
            defaultOpen={true}
            sectionId="admin-section-recent-jobs"
          >
          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-[var(--text)]">Recent Jobs</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">Latest roles posted by companies.</p>
                <div className="mt-4 space-y-3">
                  {recentJobs.length ? (
                    recentJobs.map((job) => (
                      <div
                        key={job._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-stretch sm:justify-between"
                      >
                        <Link
                          to={`/jobs/${job._id}`}
                          className="min-w-0 flex-1 rounded-xl p-1 text-left transition hover:bg-slate-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/35"
                          onClick={() => saveAdminDashboardScrollBeforeNavigate()}
                        >
                          <p className="font-semibold text-[var(--text)]">{job.title}</p>
                          <p className="mt-1 text-sm text-[var(--text-muted)]">
                            {job.createdBy?.name || "Company"} · {job.location || "Remote"} ·{" "}
                            <span className="capitalize">{job.status}</span>
                          </p>
                          <p className="mt-2 text-xs font-semibold text-[var(--primary)]">View job posting →</p>
                        </Link>
                        <div className="flex shrink-0 flex-col gap-2 sm:items-end sm:justify-center">
                          {job.createdBy?._id ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full min-w-[9rem] sm:w-auto"
                              onClick={() => goAdminSubpage(`/admin/users/${job.createdBy._id}`)}
                            >
                              Company account
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="gap-1"
                            onClick={() => handleDeleteJob(job._id)}
                            disabled={deletingJobId === job._id}
                          >
                            <Trash2 className="h-4 w-4" />
                            {deletingJobId === job._id ? "…" : "Delete"}
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                      No job records yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold text-[var(--text)]">Recent Applications</h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Latest student applications.
                </p>
                <div className="mt-4 space-y-3">
                  {recentApplications.length ? (
                    recentApplications.map((item) => (
                      <div
                        key={item._id}
                        role="button"
                        tabIndex={0}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-[color:var(--primary)]/30 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/30"
                        onClick={() => {
                          if (item.job?._id) {
                            saveAdminDashboardScrollBeforeNavigate();
                            goAdminSubpage(`/jobs/${item.job._id}`);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (item.job?._id) {
                              saveAdminDashboardScrollBeforeNavigate();
                              goAdminSubpage(`/jobs/${item.job._id}`);
                            }
                          }
                        }}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--text)]">
                              {item.student?.name || "Applicant"} → {item.job?.title || "Job"}
                            </p>
                            <p className="mt-1 text-sm text-[var(--text-muted)]">
                              {item.job?.createdBy?.name || "Company"} ·{" "}
                              <span className="capitalize">{item.status}</span>
                            </p>
                            <p className="mt-2 text-xs font-semibold text-[var(--primary)]">Click for job details →</p>
                          </div>
                          <div className="flex shrink-0 flex-wrap gap-2">
                            {item.student?._id ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goLearnerSummary(item.student._id);
                                }}
                              >
                                Applicant profile
                              </Button>
                            ) : null}
                            {item.job?.createdBy?._id ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goAdminSubpage(`/admin/users/${item.job.createdBy._id}`);
                                }}
                              >
                                Company
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                      No application records yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;


import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  Factory,
  GraduationCap,
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { cn } from "../../lib/utils";

/** Persist scroll when opening admin profile/campus routes so browser "back" returns to the same place. */
const ADMIN_DASHBOARD_SCROLL_KEY = "learn2hire_admin_dashboard_scroll";
const ADMIN_DASHBOARD_SCROLL_MAX_AGE_MS = 5 * 60 * 1000;

function saveAdminDashboardScrollBeforeNavigate() {
  try {
    sessionStorage.setItem(
      ADMIN_DASHBOARD_SCROLL_KEY,
      JSON.stringify({ y: window.scrollY, t: Date.now() })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

function readAndClearAdminDashboardScroll() {
  try {
    const raw = sessionStorage.getItem(ADMIN_DASHBOARD_SCROLL_KEY);
    sessionStorage.removeItem(ADMIN_DASHBOARD_SCROLL_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (typeof p?.y !== "number" || typeof p?.t !== "number") return null;
    if (Date.now() - p.t > ADMIN_DASHBOARD_SCROLL_MAX_AGE_MS) return null;
    return Math.max(0, p.y);
  } catch {
    return null;
  }
}

function MetricCard({ title, value, subtitle, icon: Icon, className, onClick }) {
  const interactive = typeof onClick === "function";
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] shadow-[0_20px_50px_-18px_rgba(0,0,0,0.55)] backdrop-blur-sm transition duration-300 hover:border-cyan-400/20 hover:shadow-[0_28px_60px_-20px_rgba(34,211,238,0.12)]",
        interactive &&
          "cursor-pointer hover:border-cyan-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
        className
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={interactive ? `View ${title}: ${subtitle}` : undefined}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-cyan-400/10 blur-2xl transition duration-500 group-hover:bg-cyan-400/[0.18]" />
      <CardContent className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
            <h3 className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">{value}</h3>
            <p className="mt-2 text-sm leading-snug text-slate-400">{subtitle}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-200 ring-1 ring-white/10">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Consistent shell for directory tables (colleges, companies, faculty). */
function DirectorySection({ icon: Icon, eyebrow, title, description, children }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-[0_24px_64px_-16px_rgba(15,23,42,0.7)] backdrop-blur-md sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/25 to-indigo-600/20 text-cyan-100 ring-1 ring-white/10">
            <Icon className="h-6 w-6" aria-hidden />
          </div>
          <div>
            {eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/80">{eyebrow}</p>
            ) : null}
            <h2 className="mt-0.5 text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Large sections (people, jobs, imports) — disclosure to reduce scroll clutter. */
function CollapsibleSection({ title, subtitle, badge, defaultOpen = false, sectionId, children }) {
  const location = useLocation();
  const hash = (location.hash || "").replace(/^#/, "");
  const matchHash = Boolean(sectionId && hash === sectionId);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (matchHash) setOpen(true);
  }, [matchHash]);

  useEffect(() => {
    if (!matchHash || !sectionId) return undefined;
    const t = window.setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 320);
    return () => window.clearTimeout(t);
  }, [matchHash, sectionId]);

  return (
    <div
      id={sectionId}
      className="scroll-mt-28 rounded-3xl border border-white/10 bg-slate-950/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] backdrop-blur-sm"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left sm:px-6 sm:py-5"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold tracking-tight text-white sm:text-xl">{title}</h2>
            {badge != null && badge !== "" ? (
              <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-xs font-medium text-cyan-100 ring-1 ring-cyan-400/25">
                {badge}
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition duration-300 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div className="border-t border-white/10 px-5 pb-5 pt-1 sm:px-6">{children}</div>
      ) : null}
    </div>
  );
}

/** Roles shown in admin charts and filters — alumni excluded (no alumni workspace in admin). */
const ADMIN_DASHBOARD_ROLES = ["student", "faculty", "company", "admin", "college"];

const DIRECTORY_PREVIEW_ROWS = 5;

const emptyAnalytics = {
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
    alumni: 0,
    faculty: 0,
    company: 0,
    admin: 0,
    college: 0,
  },
  recentUsers: [],
};

const emptyInsights = {
  totals: {
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    pendingFacultyCount: 0,
    pendingCollegesCount: 0,
    managedStudentsCount: 0,
    collegeAccountsTotal: 0,
  },
  roleCounts: {
    student: 0,
    alumni: 0,
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
  registeredColleges: [],
  registeredCompanies: [],
  facultyDirectory: [],
};

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const goAdminSubpage = useCallback((to) => {
    saveAdminDashboardScrollBeforeNavigate();
    navigate(to);
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
        goAdminSubpage(`/admin/users/${person._id}`);
      }
    },
    [goAdminSubpage]
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
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deletingJobId, setDeletingJobId] = useState("");
  const [collegeApprovalBusyId, setCollegeApprovalBusyId] = useState("");
  const [deletingCollegeId, setDeletingCollegeId] = useState("");
  /** Directory tables: show 5 rows until expanded. */
  const [showAllDirColleges, setShowAllDirColleges] = useState(false);
  const [showAllDirCompanies, setShowAllDirCompanies] = useState(false);
  const [showAllDirFaculty, setShowAllDirFaculty] = useState(false);

  const fetchDashboard = useCallback(
    async ({ silent } = {}) => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      if (!silent) setRefreshing(true);

      try {
        setError("");
        const headers = { Authorization: `Bearer ${token}` };

        const [analyticsRes, insightsRes] = await Promise.all([
          fetch("/api/admin/analytics", { cache: "no-store", headers }),
          fetch("/api/admin/insights", { cache: "no-store", headers }),
        ]);

        const [analyticsData, insightsData] = await Promise.all([
          readApiResponse(analyticsRes),
          readApiResponse(insightsRes),
        ]);

        if (analyticsRes.status === 401 || insightsRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
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
      } catch (err) {
        setError(err.message || "Unable to load admin dashboard.");
      } finally {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    },
    [navigate]
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

  const peopleExcludingAlumni = useMemo(
    () => (insights.people || []).filter((u) => u.role !== "alumni"),
    [insights.people]
  );

  const filteredPeople = useMemo(() => {
    const search = peopleSearch.trim().toLowerCase();
    return peopleExcludingAlumni.filter((u) => {
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
  }, [peopleExcludingAlumni, peopleRoleFilter, peopleSearch]);

  const recentJobs = useMemo(() => (insights.jobs || []).slice(0, 8), [insights.jobs]);
  const recentApplications = useMemo(
    () =>
      (insights.applications || [])
        .filter((a) => a.student?.role !== "alumni")
        .slice(0, 10),
    [insights.applications]
  );

  const roleBarTotal = useMemo(() => {
    const c = insights.roleCounts || {};
    return ADMIN_DASHBOARD_ROLES.reduce((acc, role) => acc + (Number(c[role]) || 0), 0);
  }, [insights.roleCounts]);

  const registeredCollegesList = useMemo(() => insights.registeredColleges || [], [insights.registeredColleges]);

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
    const token = localStorage.getItem("token");
    if (!token) {
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
          Authorization: `Bearer ${token}`,
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
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setDeletingCollegeId(collegeUserId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/colleges/${collegeUserId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setDeletingUserId(userId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setDeletingJobId(jobId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");
    if (!token || !studentSheetFile) return;
    setError("");
    setSuccess("");
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", studentSheetFile);
      const response = await fetch("/api/admin/students/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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

  const handleMaterialSheetImport = async () => {
    const token = localStorage.getItem("token");
    if (!token || !materialSheetFile) return;
    setError("");
    setSuccess("");
    setImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", materialSheetFile);
      const response = await fetch("/api/learning/manage/materials/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");
    if (!token || !materialImageFile || !materialTitle.trim() || !materialCategoryId.trim()) return;
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
        headers: { Authorization: `Bearer ${token}` },
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(56,189,248,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_100%_40%,rgba(129,140,248,0.12),transparent_45%)]"
        aria-hidden
      />
      <div className="relative w-full px-3 py-5 sm:px-4 sm:py-7">
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
            { label: "Manage jobs", to: "/admin/jobs", icon: BriefcaseBusiness },
            { label: "Go to home", onClick: () => navigate("/") },
          ]}
        />

        <div className="mt-4 rounded-[28px] border border-white/10 bg-slate-950/45 shadow-[0_40px_100px_-24px_rgba(0,0,0,0.65)] ring-1 ring-white/5 backdrop-blur-xl">
          <div className="space-y-6 p-5 sm:p-6 xl:p-7">
          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          <div className="relative mt-2 overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-950/80 via-slate-950/50 to-indigo-950/30 p-5 shadow-[0_20px_60px_-24px_rgba(34,211,238,0.15)] sm:p-6">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/20">
                  <Sparkles className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/90">Live overview</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    <Activity className="h-3.5 w-3.5 text-cyan-400" aria-hidden />
                    <span>Updated {formatLiveStamp(insights.generatedAt)}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="default"
                className="shrink-0 gap-2 shadow-lg shadow-cyan-500/10"
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
                className="scroll-mt-28 overflow-hidden border border-amber-400/35 bg-gradient-to-br from-amber-500/[0.12] via-slate-950/40 to-transparent shadow-[0_20px_50px_-20px_rgba(245,158,11,0.15)]"
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/25">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white sm:text-xl">College registrations pending approval</h2>
                      <p className="mt-0.5 text-sm text-slate-400">
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
                        className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/55 p-4 transition hover:border-amber-400/30 hover:bg-slate-900/70 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => goAdminSubpage(`/admin/colleges/${c._id}`)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            goAdminSubpage(`/admin/colleges/${c._id}`);
                          }
                        }}
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{c.name}</p>
                          <p className="truncate text-sm text-slate-400">{c.email}</p>
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
          </div>

          <div id="admin-insights-grid" className="scroll-mt-28 mt-5 grid gap-6 xl:grid-cols-3">
            <Card className="overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent shadow-none backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-white">Role distribution</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Share of users by role (alumni excluded). Click a row to open matching accounts below.
                </p>
                <div className="mt-5 space-y-3">
                  {ADMIN_DASHBOARD_ROLES.map((role) => {
                    const count = insights.roleCounts[role] || 0;
                    const pct = roleBarTotal > 0 ? Math.min(100, Math.round((count / roleBarTotal) * 100)) : 0;
                    return (
                      <button
                        key={role}
                        type="button"
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-left transition hover:border-cyan-400/35 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                        onClick={() => goToAdminHash("admin-section-all-people", { adminPeopleRole: role })}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="capitalize text-slate-300">{role}</span>
                          <span className="font-semibold tabular-nums text-white">{count}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800/80">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-500 transition-[width] duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent shadow-none backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-white">Job status</h3>
                <p className="mt-1 text-xs text-slate-500">Posting lifecycle across the platform. Click to manage jobs.</p>
                <div className="mt-5 space-y-3">
                  {Object.entries(insights.jobStatusCounts || {}).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-left transition hover:border-emerald-400/40 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/35"
                      onClick={() => goAdminSubpage("/admin/jobs")}
                    >
                      <span className="capitalize text-slate-300">{k}</span>
                      <span className="font-semibold tabular-nums text-white">{v}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="overflow-hidden border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent shadow-none backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold tracking-tight text-white">Application pipeline</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Student applications by stage (alumni applications are not listed here). Click to review recent activity.
                </p>
                <div className="mt-5 space-y-3">
                  {Object.entries(insights.appStatusCounts || {}).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3 text-left transition hover:border-violet-400/40 hover:bg-slate-900/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35"
                      onClick={() => goToAdminHash("admin-section-recent-jobs")}
                    >
                      <span className="capitalize text-slate-300">{k}</span>
                      <span className="font-semibold tabular-nums text-white">{v}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-indigo-500/5 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-200/80">Signed in</p>
                  <p className="mt-2 font-semibold text-white">{user?.name}</p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
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
          <div className="grid gap-6 xl:grid-cols-3">
            <Card className="border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:border-white/15">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white">Bulk students (Excel)</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Upload `.xlsx` with name, email, password columns.
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="mt-4 w-full text-sm text-slate-300"
                  onChange={(e) => setStudentSheetFile(e.target.files?.[0] || null)}
                />
                <Button className="mt-4 w-full" disabled={!studentSheetFile || importBusy} onClick={handleAdminStudentImport}>
                  Import students
                </Button>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:border-white/15">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white">Bulk materials (Excel)</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Use title, summary, content, categorySlug/categoryId columns.
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="mt-4 w-full text-sm text-slate-300"
                  onChange={(e) => setMaterialSheetFile(e.target.files?.[0] || null)}
                />
                <Button className="mt-4 w-full" disabled={!materialSheetFile || importBusy} onClick={handleMaterialSheetImport}>
                  Import materials
                </Button>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-gradient-to-b from-white/[0.05] to-transparent shadow-[0_16px_40px_-24px_rgba(0,0,0,0.5)] backdrop-blur-sm transition hover:border-white/15">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white">Material from image</h3>
                <input
                  placeholder="Material title"
                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                />
                <input
                  placeholder="Category ID"
                  className="mt-3 w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm"
                  value={materialCategoryId}
                  onChange={(e) => setMaterialCategoryId(e.target.value)}
                />
                <input
                  type="file"
                  accept="image/*"
                  className="mt-3 w-full text-sm text-slate-300"
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
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
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
                          <td className="px-4 py-3.5 font-medium text-white">{c.name}</td>
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
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
                <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
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
                          onClick={() => goAdminSubpage(`/admin/users/${co._id}`)}
                        >
                          <td className="px-4 py-3.5 font-medium text-white">{co.name}</td>
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
                                  goAdminSubpage(`/admin/users/${co._id}`);
                                }}
                              >
                                View profile
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
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/40">
                <table className="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
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
                          onClick={() => goAdminSubpage(`/admin/users/${f._id}`)}
                        >
                          <td className="px-4 py-3.5 font-medium text-white">{f.name}</td>
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
                                  goAdminSubpage(`/admin/users/${f._id}`);
                                }}
                              >
                                View profile
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
                  className="h-11 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm"
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
                  className="h-11 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-white placeholder:text-slate-500"
                />
              </div>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/30">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Campus</th>
                    <th className="px-3 py-3 font-semibold">Faculty</th>
                    <th className="px-3 py-3 font-semibold">Student summary</th>
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
                          <td className="px-3 py-3 align-top text-white">
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
                                      goAdminSubpage(`/admin/users/${person._id}`);
                                    }}
                                  >
                                    View profile
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
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold">Recent Jobs</h2>
                <p className="mt-1 text-sm text-slate-400">Latest roles posted by companies.</p>
                <div className="mt-4 space-y-3">
                  {recentJobs.length ? (
                    recentJobs.map((job) => (
                      <div
                        key={job._id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-stretch sm:justify-between"
                      >
                        <Link
                          to={`/jobs/${job._id}`}
                          className="min-w-0 flex-1 rounded-xl p-1 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                          onClick={() => saveAdminDashboardScrollBeforeNavigate()}
                        >
                          <p className="font-semibold text-white">{job.title}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {job.createdBy?.name || "Company"} · {job.location || "Remote"} ·{" "}
                            <span className="capitalize">{job.status}</span>
                          </p>
                          <p className="mt-2 text-xs font-medium text-cyan-300">View job posting →</p>
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
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-500">
                      No job records yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold">Recent Applications</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Latest student applications (alumni applications are not shown here).
                </p>
                <div className="mt-4 space-y-3">
                  {recentApplications.length ? (
                    recentApplications.map((item) => (
                      <div
                        key={item._id}
                        role="button"
                        tabIndex={0}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 text-left transition hover:border-cyan-400/25 hover:bg-slate-900/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
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
                            <p className="font-semibold text-white">
                              {item.student?.name || "Applicant"} → {item.job?.title || "Job"}
                            </p>
                            <p className="mt-1 text-sm text-slate-400">
                              {item.job?.createdBy?.name || "Company"} ·{" "}
                              <span className="capitalize">{item.status}</span>
                            </p>
                            <p className="mt-2 text-xs text-cyan-300/90">Click for job details →</p>
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
                                  goAdminSubpage(`/admin/users/${item.student._id}`);
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
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-500">
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

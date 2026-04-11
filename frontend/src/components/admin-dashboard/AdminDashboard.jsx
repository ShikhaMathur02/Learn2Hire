import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import { DashboardTopNav } from "../dashboard/DashboardTopNav";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

function MetricCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card className="border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.25)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <h3 className="mt-3 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const roleOptions = ["student", "alumni", "faculty", "company", "admin", "college"];

const emptyStudentProfileForm = {
  course: "",
  branch: "",
  year: "",
  semester: "",
  bio: "",
  studentPhone: "",
  fatherName: "",
  motherName: "",
  fatherPhone: "",
  motherPhone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  dateOfBirth: "",
  bloodGroup: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

function studentFormFromPerson(person) {
  return {
    course: person.course || "",
    branch: person.branch || "",
    year: person.year || "",
    semester: person.semester || "",
    bio: person.bio || "",
    studentPhone: person.studentPhone || "",
    fatherName: person.fatherName || "",
    motherName: person.motherName || "",
    fatherPhone: person.fatherPhone || "",
    motherPhone: person.motherPhone || "",
    address: person.address || "",
    city: person.city || "",
    state: person.state || "",
    pincode: person.pincode || "",
    dateOfBirth: person.dateOfBirth || "",
    bloodGroup: person.bloodGroup || "",
    emergencyContactName: person.emergencyContactName || "",
    emergencyContactPhone: person.emergencyContactPhone || "",
  };
}

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
    managedStudentsCount: 0,
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
};

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(emptyAnalytics);
  const [insights, setInsights] = useState(emptyInsights);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [peopleRoleFilter, setPeopleRoleFilter] = useState("all");
  const [peopleSearch, setPeopleSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tick, setTick] = useState(0);
  const [studentSheetFile, setStudentSheetFile] = useState(null);
  const [materialSheetFile, setMaterialSheetFile] = useState(null);
  const [materialImageFile, setMaterialImageFile] = useState(null);
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialCategoryId, setMaterialCategoryId] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [peopleModal, setPeopleModal] = useState(null);
  const [savingPeopleModal, setSavingPeopleModal] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState("");
  const [deletingJobId, setDeletingJobId] = useState("");
  const [deletingAssessmentId, setDeletingAssessmentId] = useState("");

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

        const [analyticsRes, insightsRes, assessmentsRes] = await Promise.all([
          fetch("/api/admin/analytics", { cache: "no-store", headers }),
          fetch("/api/admin/insights", { cache: "no-store", headers }),
          fetch("/api/assessments", { cache: "no-store", headers }),
        ]);

        const [analyticsData, insightsData, assessmentsData] = await Promise.all([
          readApiResponse(analyticsRes),
          readApiResponse(insightsRes),
          readApiResponse(assessmentsRes),
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

        if (assessmentsRes.ok) {
          setAssessments(assessmentsData.data?.assessments || []);
        } else {
          setAssessments([]);
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
    const id = window.setInterval(() => setTick((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchDashboard({ silent: true });
    }, 45000);
    return () => window.clearInterval(id);
  }, [fetchDashboard]);

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

  const openPeopleProfileModal = (person) => {
    setPeopleModal({
      person,
      role: person.role,
      student: person.role === "student" ? studentFormFromPerson(person) : null,
    });
  };

  const closePeopleProfileModal = () => {
    setPeopleModal(null);
  };

  const savePeopleProfileModal = async () => {
    if (!peopleModal) return;
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const { person, role, student } = peopleModal;
    const userId = person._id;

    setSavingPeopleModal(true);
    setError("");
    setSuccess("");

    try {
      if (role && role !== person.role) {
        const response = await fetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role }),
        });
        const data = await readApiResponse(response);
        if (!response.ok) {
          throw new Error(data.message || "Failed to update user role.");
        }
      }

      if (role === "student" && student) {
        const response = await fetch(`/api/admin/users/${userId}/student-profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(student),
        });
        const data = await readApiResponse(response);
        if (!response.ok) {
          throw new Error(data.message || "Failed to save student profile.");
        }
      }

      setSuccess("Profile saved.");
      closePeopleProfileModal();
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Unable to save.");
    } finally {
      setSavingPeopleModal(false);
    }
  };

  const handleDeleteUser = async (userId, roleLabel) => {
    if (
      !window.confirm(
        `Delete this ${roleLabel} account? This cannot be undone. (Only student/alumni are fully removed automatically.)`
      )
    ) {
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

  const handleDeleteAssessment = async (assessmentId) => {
    if (!window.confirm("Delete this assessment permanently?")) return;
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    setDeletingAssessmentId(assessmentId);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Failed to delete assessment.");
      }
      setSuccess("Assessment deleted.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Assessment delete failed.");
    } finally {
      setDeletingAssessmentId("");
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="w-full px-3 py-5 sm:px-4 sm:py-6">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/45 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <DashboardTopNav
            className="mb-0 rounded-none border-x-0 border-t-0 bg-slate-950/55 px-5 py-3 backdrop-blur-xl sm:px-6 sm:py-4 xl:px-7"
            workspaceLabel="Admin Workspace"
            title="Global Platform Control Center"
            description="Handle everything in one place: every user, every role, colleges, companies, jobs, and applications."
            user={{ name: user.name, email: user.email, role: user.role }}
            onLogout={onLogout}
            actionItems={[
              { label: "Manage learning", to: "/dashboard/learning/manage", icon: ClipboardCheck },
              { label: "Create assessment", to: "/assessments/create", icon: BarChart3 },
              { label: "Manage jobs", to: "/admin/jobs", icon: BriefcaseBusiness },
              { label: "Go to home", onClick: () => navigate("/") },
            ]}
          />

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

          <div className="mt-5 rounded-3xl border border-cyan-400/20 bg-slate-950/55 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Activity className="h-4 w-4 text-cyan-300" />
                {tick >= 0 && <span>Live data snapshot: {formatLiveStamp(insights.generatedAt)}</span>}
              </div>
              <Button
                variant="default"
                onClick={() => fetchDashboard({ silent: false })}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricCard
                title="Total Users"
                value={analytics.totals.totalUsers}
                subtitle="All people on Learn2Hire"
                icon={Users}
              />
              <MetricCard
                title="Colleges"
                value={insights.roleCounts.college || 0}
                subtitle="College administrators"
                icon={Building2}
              />
              <MetricCard
                title="Companies"
                value={insights.roleCounts.company || 0}
                subtitle="Recruiting organizations"
                icon={Workflow}
              />
              <MetricCard
                title="Open Jobs"
                value={insights.jobStatusCounts.open || 0}
                subtitle="Active opportunities"
                icon={BriefcaseBusiness}
              />
              <MetricCard
                title="Applications"
                value={analytics.totals.totalApplications}
                subtitle="Submitted by students/alumni"
                icon={BarChart3}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-3">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold">Role Distribution</h3>
                <div className="mt-4 space-y-3">
                  {roleOptions.map((role) => (
                    <div
                      key={role}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3"
                    >
                      <span className="capitalize text-slate-300">{role}</span>
                      <span className="font-semibold text-white">{insights.roleCounts[role] || 0}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold">Job Status</h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(insights.jobStatusCounts || {}).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3"
                    >
                      <span className="capitalize text-slate-300">{k}</span>
                      <span className="font-semibold text-white">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold">Application Pipeline</h3>
                <div className="mt-4 space-y-3">
                  {Object.entries(insights.appStatusCounts || {}).map(([k, v]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3"
                    >
                      <span className="capitalize text-slate-300">{k}</span>
                      <span className="font-semibold text-white">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Logged in admin</p>
                  <p className="mt-2 font-semibold text-white">{user?.name}</p>
                  <p className="text-sm text-slate-400">{user?.email}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-3">
            <Card className="border border-white/10 bg-white/5 shadow-none">
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
            <Card className="border border-white/10 bg-white/5 shadow-none">
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
            <Card className="border border-white/10 bg-white/5 shadow-none">
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

          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-bold">All People Management</h2>
              <div className="flex flex-wrap gap-2">
                <select
                  value={peopleRoleFilter}
                  onChange={(e) => setPeopleRoleFilter(e.target.value)}
                  className="h-11 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm"
                >
                  <option value="all">All roles</option>
                  {roleOptions.map((role) => (
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
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Name</th>
                    <th className="px-3 py-3 font-semibold">Email</th>
                    <th className="px-3 py-3 font-semibold">Role</th>
                    <th className="px-3 py-3 font-semibold">Managed</th>
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
                      return (
                        <tr key={person._id} className="border-b border-white/5 last:border-0">
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
                            <span
                              className="block max-w-[8rem] truncate text-xs"
                              title={person.managedByCollege?.name || ""}
                            >
                              {person.managedByCollege?.name || "—"}
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
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => openPeopleProfileModal(person)}
                              >
                                Open profile
                              </Button>
                              {(person.role === "student" || person.role === "alumni") && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="justify-center gap-1 text-xs"
                                  onClick={() => handleDeleteUser(person._id, person.role)}
                                  disabled={deletingUserId === person._id}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  {deletingUserId === person._id ? "…" : "Delete"}
                                </Button>
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
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/55 p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold">Assessments (admin)</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Create, review, or remove assessments.{" "}
                  <Link to="/assessments/create" className="text-cyan-300 underline">
                    New assessment
                  </Link>
                </p>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[640px] table-fixed text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="w-[18%] px-3 py-2">Status</th>
                    <th className="w-[22%] px-3 py-2">Created by</th>
                    <th className="w-[14%] px-3 py-2">Open</th>
                    <th className="w-[12%] px-3 py-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {assessments.length ? (
                    assessments.map((a) => (
                      <tr key={a._id} className="border-b border-white/5">
                        <td className="px-3 py-2 text-white">
                          <span className="line-clamp-2">{a.title}</span>
                        </td>
                        <td className="px-3 py-2 capitalize text-slate-300">{a.status}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">
                          {a.createdBy?.name || "—"}
                        </td>
                        <td className="px-3 py-2">
                          <Link
                            to={`/assessments/${a._id}`}
                            className="text-xs text-cyan-300 underline"
                          >
                            View
                          </Link>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="h-8 gap-1 px-2 text-xs"
                            onClick={() => handleDeleteAssessment(a._id)}
                            disabled={deletingAssessmentId === a._id}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                        No assessments loaded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold">Recent Jobs</h2>
                <p className="mt-1 text-sm text-slate-400">Latest roles posted by companies.</p>
                <div className="mt-4 space-y-3">
                  {recentJobs.length ? (
                    recentJobs.map((job) => (
                      <div
                        key={job._id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-white">{job.title}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {job.createdBy?.name || "Company"} · {job.location || "Remote"} ·{" "}
                            <span className="capitalize">{job.status}</span>
                          </p>
                          <Link
                            to={`/jobs/${job._id}`}
                            className="mt-2 inline-block text-xs text-cyan-300 underline"
                          >
                            Open job
                          </Link>
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="shrink-0 gap-1"
                          onClick={() => handleDeleteJob(job._id)}
                          disabled={deletingJobId === job._id}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deletingJobId === job._id ? "…" : "Delete"}
                        </Button>
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
                <p className="mt-1 text-sm text-slate-400">Latest student/alumni application activity.</p>
                <div className="mt-4 space-y-3">
                  {recentApplications.length ? (
                    recentApplications.map((item) => (
                      <div
                        key={item._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <p className="font-semibold text-white">
                          {item.student?.name || "Applicant"} → {item.job?.title || "Job"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.job?.createdBy?.name || "Company"} ·{" "}
                          <span className="capitalize">{item.status}</span>
                        </p>
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

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Students"
              value={insights.roleCounts.student || 0}
              subtitle="Learner accounts"
              icon={GraduationCap}
            />
            <MetricCard
              title="Faculty Pending"
              value={insights.totals.pendingFacultyCount || 0}
              subtitle="Waiting for approval"
              icon={ShieldCheck}
            />
            <MetricCard
              title="Managed Students"
              value={insights.totals.managedStudentsCount || 0}
              subtitle="Assigned to colleges"
              icon={Users}
            />
            <MetricCard
              title="Assessments"
              value={analytics.totals.totalAssessments}
              subtitle="Published and draft"
              icon={ClipboardCheck}
            />
          </div>
          </div>
        </div>
      </div>

      {peopleModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="people-profile-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close profile editor"
            onClick={closePeopleProfileModal}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-3xl border border-white/10 bg-slate-950 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <h2 id="people-profile-title" className="text-lg font-bold text-white">
                  {peopleModal.person.name}
                </h2>
                <p className="mt-1 truncate text-sm text-slate-400">{peopleModal.person.email}</p>
              </div>
              <button
                type="button"
                className="rounded-xl p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
                onClick={closePeopleProfileModal}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              <label className="block text-xs font-medium text-slate-400">Role</label>
              <select
                value={peopleModal.role}
                onChange={(e) => {
                  const nextRole = e.target.value;
                  setPeopleModal((m) => ({
                    ...m,
                    role: nextRole,
                    student:
                      nextRole === "student"
                        ? m.student ?? studentFormFromPerson(m.person)
                        : null,
                  }));
                }}
                className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 text-sm text-white"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Saving applies role changes and, for students, the full academic and contact record
                below.
              </p>

              {peopleModal.role === "student" && peopleModal.student ? (
                <div className="mt-6 space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Academic cohort</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ["course", "Program / course"],
                        ["branch", "Branch"],
                        ["year", "Year"],
                        ["semester", "Semester"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                            value={peopleModal.student[key]}
                            onChange={(e) =>
                              setPeopleModal((m) => ({
                                ...m,
                                student: { ...m.student, [key]: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Bio</h3>
                    <textarea
                      className="mt-2 min-h-[80px] w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                      value={peopleModal.student.bio}
                      onChange={(e) =>
                        setPeopleModal((m) => ({
                          ...m,
                          student: { ...m.student, bio: e.target.value },
                        }))
                      }
                      placeholder="Short bio"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Parents &amp; contacts</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ["studentPhone", "Student phone"],
                        ["fatherName", "Father name"],
                        ["fatherPhone", "Father phone"],
                        ["motherName", "Mother name"],
                        ["motherPhone", "Mother phone"],
                      ].map(([key, label]) => (
                        <div key={key} className={key === "studentPhone" ? "sm:col-span-2" : ""}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                            value={peopleModal.student[key]}
                            onChange={(e) =>
                              setPeopleModal((m) => ({
                                ...m,
                                student: { ...m.student, [key]: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Address</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-slate-400">Street / address</label>
                        <input
                          className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                          value={peopleModal.student.address}
                          onChange={(e) =>
                            setPeopleModal((m) => ({
                              ...m,
                              student: { ...m.student, address: e.target.value },
                            }))
                          }
                        />
                      </div>
                      {[
                        ["city", "City"],
                        ["state", "State"],
                        ["pincode", "PIN / ZIP"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                            value={peopleModal.student[key]}
                            onChange={(e) =>
                              setPeopleModal((m) => ({
                                ...m,
                                student: { ...m.student, [key]: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Other</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ["dateOfBirth", "Date of birth (YYYY-MM-DD)"],
                        ["bloodGroup", "Blood group"],
                        ["emergencyContactName", "Emergency contact name"],
                        ["emergencyContactPhone", "Emergency contact phone"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-white"
                            value={peopleModal.student[key]}
                            onChange={(e) =>
                              setPeopleModal((m) => ({
                                ...m,
                                student: { ...m.student, [key]: e.target.value },
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <Button type="button" variant="outline" onClick={closePeopleProfileModal}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={savePeopleProfileModal}
                disabled={savingPeopleModal}
              >
                {savingPeopleModal ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AdminDashboard;

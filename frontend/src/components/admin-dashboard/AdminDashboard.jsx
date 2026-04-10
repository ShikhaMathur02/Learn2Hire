import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardCheck,
  GraduationCap,
  LoaderCircle,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
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
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState("");
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

  const hydrateRoleDrafts = useCallback((people) => {
    setRoleDrafts(Object.fromEntries((people || []).map((u) => [u._id, u.role])));
  }, []);

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
        hydrateRoleDrafts(nextInsights.people || []);
      } catch (err) {
        setError(err.message || "Unable to load admin dashboard.");
      } finally {
        setLoading(false);
        if (!silent) setRefreshing(false);
      }
    },
    [hydrateRoleDrafts, navigate]
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
      return (
        String(u.name || "").toLowerCase().includes(search) ||
        String(u.email || "").toLowerCase().includes(search)
      );
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

  const handleRoleUpdate = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const role = roleDrafts[userId];
    if (!role) return;

    setUpdatingUserId(userId);
    setError("");
    setSuccess("");

    try {
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

      setSuccess("User role updated successfully.");
      await fetchDashboard({ silent: true });
    } catch (err) {
      setError(err.message || "Unable to update role.");
    } finally {
      setUpdatingUserId("");
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
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 sm:py-6">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur sm:p-6 xl:p-7">
          <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Admin Workspace</p>
              <h1 className="mt-2 text-3xl font-bold">Global Platform Control Center</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                Handle everything in one place: every user, every role, colleges, companies, jobs,
                and applications.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/dashboard/learning/manage">
                  <ClipboardCheck className="h-4 w-4" />
                  Manage Learning
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Link>
              </Button>
              <Button asChild>
                <Link to="/admin/jobs">Manage Jobs</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
              >
                Go to Home
              </Button>
              <Button
                variant="outline"
                onClick={onLogout}
                className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

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
                variant="outline"
                className="border-cyan-400/30 text-cyan-100 hover:bg-cyan-500/10"
                onClick={() => fetchDashboard({ silent: false })}
                disabled={refreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
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
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-slate-900/60 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Managed By</th>
                    <th className="px-4 py-3">Faculty Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeople.length ? (
                    filteredPeople.map((person) => (
                      <tr key={person._id} className="border-b border-white/5 last:border-0">
                        <td className="px-4 py-3 text-white">{person.name}</td>
                        <td className="px-4 py-3 text-slate-300">{person.email}</td>
                        <td className="px-4 py-3 capitalize">{person.role}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {person.managedByCollege?.name || "—"}
                        </td>
                        <td className="px-4 py-3 capitalize text-slate-400">
                          {person.role === "faculty" ? person.facultyApprovalStatus || "approved" : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={roleDrafts[person._id] || person.role}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({ ...prev, [person._id]: e.target.value }))
                              }
                              className="h-9 rounded-xl border border-white/10 bg-slate-900/80 px-3 text-xs"
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <Button
                              size="sm"
                              onClick={() => handleRoleUpdate(person._id)}
                              disabled={updatingUserId === person._id}
                            >
                              {updatingUserId === person._id ? "Saving..." : "Save"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        No users match this filter.
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
                      <div key={job._id} className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <p className="font-semibold text-white">{job.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {job.createdBy?.name || "Company"} · {job.location || "Remote"} ·{" "}
                          <span className="capitalize">{job.status}</span>
                        </p>
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
  );
}

export default AdminDashboard;

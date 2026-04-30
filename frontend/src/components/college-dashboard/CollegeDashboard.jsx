import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Factory,
  GraduationCap,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "../../lib/studentCohortFieldOptions";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../dashboard/DashboardTopNav";
import { DashboardMetricCard } from "../dashboard/DashboardMetricCard";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { VisibleFileInput } from "../ui/visible-file-input";

function formatSnapshotLabel(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(iso).toLocaleString();
}

function applicationStatusClass(status) {
  switch (status) {
    case "hired":
      return "border-emerald-400/30 bg-emerald-500/15 text-emerald-200";
    case "shortlisted":
      return "border-cyan-400/30 bg-cyan-500/15 text-cyan-100";
    case "reviewing":
      return "border-amber-400/30 bg-amber-500/15 text-amber-100";
    case "rejected":
      return "border-rose-400/30 bg-rose-500/15 text-rose-100";
    default:
      return "border-white/10 bg-slate-900/60 text-slate-300";
  }
}

const strongPasswordHint =
  "8+ characters with uppercase, lowercase, number, and special character.";

function CollegeDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [me, setMe] = useState(user);
  const [assessments, setAssessments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [roster, setRoster] = useState([]);
  const [pendingFaculty, setPendingFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [peopleMessage, setPeopleMessage] = useState("");
  const [peopleError, setPeopleError] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("student");
  const [addingUser, setAddingUser] = useState(false);
  const [approvalBusyId, setApprovalBusyId] = useState("");
  const [insights, setInsights] = useState(null);
  const [insightsError, setInsightsError] = useState("");
  const [insightsRefreshing, setInsightsRefreshing] = useState(false);
  const [snapshotTick, setSnapshotTick] = useState(0);
  const [studentSheetFile, setStudentSheetFile] = useState(null);
  const [materialSheetFile, setMaterialSheetFile] = useState(null);
  const [materialImageFile, setMaterialImageFile] = useState(null);
  const [materialCategoryId, setMaterialCategoryId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importCourse, setImportCourse] = useState("");
  const [importProgram, setImportProgram] = useState("");
  const [importYear, setImportYear] = useState("");
  const [importSemester, setImportSemester] = useState("");

  const fetchInsights = useCallback(
    async ({ silent } = {}) => {
      const token = localStorage.getItem("token");
      if (!token) return null;

      if (!silent) setInsightsRefreshing(true);
      setInsightsError("");

      try {
        const res = await fetch("/api/college/insights", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await readApiResponse(res);
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return null;
        }
        if (!res.ok) {
          throw new Error(data.message || "Could not load placement insights.");
        }
        setInsights(data.data || null);
        return data.data;
      } catch (err) {
        setInsightsError(err.message || "Could not load placement insights.");
        return null;
      } finally {
        if (!silent) setInsightsRefreshing(false);
      }
    },
    [navigate]
  );

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [meRes, assessmentsRes, jobsRes, rosterRes, pendingRes, insightsRes] =
        await Promise.all([
          fetch("/api/auth/me", { headers }),
          fetch("/api/assessments", { headers }),
          fetch("/api/jobs", { headers }),
          fetch("/api/college/roster", { cache: "no-store", headers }),
          fetch("/api/college/faculty/pending", { cache: "no-store", headers }),
          fetch("/api/college/insights", { cache: "no-store", headers }),
        ]);

      const [meData, assessmentsData, jobsData, rosterData, pendingData, insightsJson] =
        await Promise.all([
          readApiResponse(
            meRes,
            "API returned HTML instead of JSON. Restart the backend server and refresh the page."
          ),
          readApiResponse(
            assessmentsRes,
            "API returned HTML instead of JSON. Restart the backend server and refresh the page."
          ),
          readApiResponse(
            jobsRes,
            "API returned HTML instead of JSON. Restart the backend server and refresh the page."
          ),
          readApiResponse(rosterRes),
          readApiResponse(pendingRes),
          readApiResponse(insightsRes),
        ]);

      if (
        [meRes, assessmentsRes, jobsRes, rosterRes, pendingRes, insightsRes].some(
          (response) => response.status === 401
        )
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!meRes.ok) {
        throw new Error(meData.message || "Failed to load college profile.");
      }

      if (!assessmentsRes.ok) {
        throw new Error(assessmentsData.message || "Failed to load assessments.");
      }

      if (!jobsRes.ok) {
        throw new Error(jobsData.message || "Failed to load jobs.");
      }
      if (rosterRes.ok) {
        setRoster(rosterData.data?.users || []);
      }
      if (pendingRes.ok) {
        setPendingFaculty(pendingData.data?.users || []);
      }

      if (insightsRes.ok) {
        setInsights(insightsJson.data || null);
        setInsightsError("");
      } else if (insightsRes.status !== 401) {
        setInsightsError(insightsJson.message || "Could not load placement insights.");
      }

      setMe(meData.data?.user || user);
      setAssessments(assessmentsData.data?.assessments || []);
      setJobs(jobsData.data?.jobs || []);
    } catch (err) {
      setError(err.message || "Unable to load college dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnapshotTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const publishedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.status === "published"),
    [assessments]
  );

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === "open"),
    [jobs]
  );

  const refreshPeople = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [rosterRes, pendingRes] = await Promise.all([
        fetch("/api/college/roster", { cache: "no-store", headers }),
        fetch("/api/college/faculty/pending", { cache: "no-store", headers }),
      ]);
      const rosterData = await readApiResponse(rosterRes);
      const pendingData = await readApiResponse(pendingRes);
      if (rosterRes.ok) setRoster(rosterData.data?.users || []);
      if (pendingRes.ok) setPendingFaculty(pendingData.data?.users || []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchInsights({ silent: true });
      refreshPeople();
    }, 45000);
    return () => window.clearInterval(id);
  }, [fetchInsights, refreshPeople]);

  const handleAddRosterUser = async (e) => {
    e.preventDefault();
    setPeopleError("");
    setPeopleMessage("");
    const token = localStorage.getItem("token");
    if (!token) return;
    setAddingUser(true);
    try {
      const res = await fetch("/api/college/roster", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
        }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Could not create account.");
      }
      setPeopleMessage(
        addRole === "faculty"
          ? "Faculty account created. They can sign in immediately with this email and password."
          : "Student account created. They can sign in with this email and password."
      );
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      await refreshPeople();
      await fetchInsights({ silent: true });
    } catch (err) {
      setPeopleError(err.message || "Could not create account.");
    } finally {
      setAddingUser(false);
    }
  };

  const handleFacultyApproval = async (userId, decision) => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setPeopleError("");
    setPeopleMessage("");
    setApprovalBusyId(userId);
    try {
      const res = await fetch(`/api/college/faculty/${userId}/approval`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Update failed.");
      }
      setPeopleMessage(data.message || "Updated.");
      await refreshPeople();
    } catch (err) {
      setPeopleError(err.message || "Could not update approval.");
    } finally {
      setApprovalBusyId("");
    }
  };

  const handleCollegeStudentImport = async () => {
    const token = localStorage.getItem("token");
    if (!token || !studentSheetFile) return;
    if (!importCourse.trim() || !importProgram.trim() || !importYear.trim()) {
      setPeopleError("Select the class (course, program, year) this file belongs to. Each row must match those values.");
      return;
    }
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", studentSheetFile);
      fd.append("targetCourse", importCourse.trim());
      fd.append("targetProgram", importProgram.trim());
      fd.append("targetYear", importYear.trim());
      fd.append("targetSemester", importSemester.trim());
      const res = await fetch("/api/college/roster/import/students", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Student import failed.");
      setPeopleMessage(data.message || "Student import completed.");
      setStudentSheetFile(null);
      await refreshPeople();
    } catch (err) {
      setPeopleError(err.message || "Student import failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMaterialSheetImport = async () => {
    const token = localStorage.getItem("token");
    if (!token || !materialSheetFile) return;
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", materialSheetFile);
      const res = await fetch("/api/learning/manage/materials/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Material import failed.");
      setPeopleMessage(data.message || "Material import completed.");
      setMaterialSheetFile(null);
    } catch (err) {
      setPeopleError(err.message || "Material import failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleMaterialImageCreate = async () => {
    const token = localStorage.getItem("token");
    if (!token || !materialImageFile || !materialCategoryId.trim() || !materialTitle.trim()) return;
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", materialImageFile);
      fd.append("title", materialTitle.trim());
      fd.append("categoryId", materialCategoryId.trim());
      const res = await fetch("/api/learning/manage/materials/from-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Image material creation failed.");
      setPeopleMessage(data.message || "Image material created.");
      setMaterialImageFile(null);
      setMaterialTitle("");
    } catch (err) {
      setPeopleError(err.message || "Image material creation failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const topAssessmentSkills = useMemo(() => {
    const counts = {};
    publishedAssessments.forEach((assessment) => {
      const skill = assessment.skill || "General";
      counts[skill] = (counts[skill] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [publishedAssessments]);

  if (loading) {
    return (
      <div className="l2h-dark-ui flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-slate-200">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading college dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="l2h-dark-ui min-h-screen bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-slate-50">
      <div className="w-full px-3 py-5 sm:px-4 sm:py-6">
        <DashboardTopNav
          compact
          className={cn(
            workspaceDashboardHeaderClassName,
            "mb-2 px-3 shadow-[0_12px_36px_-20px_rgba(0,0,0,0.5)] sm:px-4 xl:px-5"
          )}
          workspaceLabel="College Workspace"
          title={`Welcome, ${me.name}`}
          user={{ name: me.name, email: me.email, role: me.role }}
          onLogout={onLogout}
          actionItems={[
            { label: "Manage learning", to: "/dashboard/learning/manage", icon: BookOpenCheck },
            { label: "Go to home", onClick: () => navigate("/") },
          ]}
        />

        <div className="mt-4 rounded-[32px] border border-slate-400/30 bg-slate-800/50 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur">
          <div className="space-y-6 p-5 sm:p-6 xl:p-7">
          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {insightsError ? (
            <div className="mt-6 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              {insightsError}
            </div>
          ) : null}

          <div className="mt-5 rounded-[28px] border border-cyan-500/20 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-indigo-950/30 p-5 shadow-[0_24px_60px_rgba(8,47,73,0.35)] sm:p-6 xl:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Live snapshot
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                    <Activity className="h-3.5 w-3.5 text-cyan-300" />
                    {/* snapshotTick keeps “Xs ago” updating without polling */}
                    {snapshotTick >= 0 && (
                      <span>
                        Data as of{" "}
                        {insights?.generatedAt
                          ? formatSnapshotLabel(insights.generatedAt)
                          : "—"}
                      </span>
                    )}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">Campus & hiring intelligence</h2>
                <p className="max-w-3xl text-sm text-slate-400">
                  Companies registered on Learn2Hire, active job posts, and how your students are moving
                  through the hiring pipeline. Student application counts include only learners attached
                  to your college roster. Open roles from employers are visible platform-wide to every
                  partner college, not only your campus.
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                disabled={insightsRefreshing}
                className="shrink-0"
                onClick={() => fetchInsights({ silent: false })}
              >
                <RefreshCw
                  className={`h-4 w-4 ${insightsRefreshing ? "animate-spin" : ""}`}
                />
                {insightsRefreshing ? "Refreshing…" : "Refresh now"}
              </Button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              <DashboardMetricCard
                title="Your students"
                value={insights?.campus?.rosterStudents ?? "—"}
                subtitle="Accounts on your roster"
                icon={GraduationCap}
                scrollTargetId="college-dash-roster"
              />
              <DashboardMetricCard
                title="Your faculty"
                value={insights?.campus?.rosterFaculty ?? "—"}
                subtitle="Teachers & mentors"
                icon={Users}
                scrollTargetId="college-dash-roster"
              />
              <DashboardMetricCard
                title="Faculty in review"
                value={insights?.campus?.pendingFacultyReview ?? "—"}
                subtitle="Self-signed faculty awaiting action"
                icon={ShieldCheck}
                scrollTargetId="college-dash-pending-faculty"
              />
              <DashboardMetricCard
                title="Recruiters"
                value={insights?.hiring?.registeredCompanies ?? "—"}
                subtitle="Company accounts on the platform"
                icon={Factory}
                scrollTargetId="college-dash-companies"
              />
              <DashboardMetricCard
                title="Open roles"
                value={insights?.hiring?.openRoles ?? openJobs.length}
                subtitle="Shared across all colleges"
                icon={BriefcaseBusiness}
                scrollTargetId="college-dash-open-jobs"
              />
              <DashboardMetricCard
                title="Student applications"
                value={insights?.placements?.applicationsTotal ?? "—"}
                subtitle="Your students' job applications"
                icon={Building2}
                scrollTargetId="college-dash-applications"
              />
            </div>

            {insights?.placements?.applicationsByStatus &&
            Object.keys(insights.placements.applicationsByStatus).length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(insights.placements.applicationsByStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([st, count]) => (
                    <span
                      key={st}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${applicationStatusClass(st)}`}
                    >
                      {st}: {count}
                    </span>
                  ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-6 xl:grid-cols-3">
              <Card
                id="college-dash-companies"
                tabIndex={-1}
                className="scroll-mt-28 border border-white/10 bg-slate-950/50 shadow-none outline-none focus:outline-none xl:col-span-1"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-white">Registered companies</h3>
                  <p className="mt-1 text-sm text-slate-500">Organizations recruiting via the platform.</p>
                  <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {insights?.hiring?.companies?.length ? (
                      insights.hiring.companies.map((c) => (
                        <div
                          key={c._id}
                          className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3"
                        >
                          <p className="font-medium text-white">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.email}</p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            Joined {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-sm text-slate-500">
                        No company accounts yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                id="college-dash-open-jobs"
                tabIndex={-1}
                className="scroll-mt-28 border border-white/10 bg-slate-950/50 shadow-none outline-none focus:outline-none xl:col-span-1"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-white">Open job posts</h3>
                  <p className="mt-1 text-sm text-slate-500">Roles companies are hiring for now.</p>
                  <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {insights?.hiring?.openJobs?.length ? (
                      insights.hiring.openJobs.map((job) => (
                        <div
                          key={job._id}
                          className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3"
                        >
                          <p className="font-medium text-white">{job.title}</p>
                          <p className="mt-1 text-xs text-slate-400">
                            {job.createdBy?.name || "Company"} · {job.location || "Location TBD"} ·{" "}
                            {job.employmentType?.replace?.("-", " ") || job.employmentType}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-sm text-slate-500">
                        No open jobs right now.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                id="college-dash-applications"
                tabIndex={-1}
                className="scroll-mt-28 border border-white/10 bg-slate-950/50 shadow-none outline-none focus:outline-none xl:col-span-1"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-white">Your students applying</h3>
                  <p className="mt-1 text-sm text-slate-500">Latest activity from your roster.</p>
                  <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {insights?.placements?.recentApplications?.length ? (
                      insights.placements.recentApplications.map((row) => (
                        <div
                          key={row._id}
                          className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-3"
                        >
                          <p className="font-medium text-white">
                            {row.student?.name || "Student"} → {row.job?.title || "Job"}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {row.job?.createdBy?.name || "Company"} ·{" "}
                            <span
                              className={`inline rounded-md border px-1.5 py-0.5 capitalize ${applicationStatusClass(row.status)}`}
                            >
                              {row.status}
                            </span>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/30 p-6 text-sm text-slate-500">
                        No applications from your students yet, or roster has no students.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-10 rounded-[28px] border border-white/10 bg-slate-950/55 p-6 xl:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-300">People management</p>
                <h2 className="mt-1 text-2xl font-bold text-white">Campus roster & faculty approval</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-400">
                  Approve self-registered faculty, then add student and faculty accounts your college
                  owns. Faculty who sign up on the public form stay pending until you approve them
                  here.
                </p>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-cyan-200">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            {peopleMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                {peopleMessage}
              </div>
            ) : null}
            {peopleError ? (
              <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {peopleError}
              </div>
            ) : null}

            <div className="mt-5 grid gap-6 xl:grid-cols-2">
              <Card
                id="college-dash-pending-faculty"
                tabIndex={-1}
                className="scroll-mt-28 border border-amber-400/20 bg-amber-500/5 shadow-none outline-none focus:outline-none"
              >
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white">Pending faculty (self-registration)</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    Approve or reject faculty who signed up from the public signup page.
                  </p>
                  <div className="mt-4 space-y-3">
                    {pendingFaculty.length ? (
                      pendingFaculty.map((u) => (
                        <div
                          key={u._id}
                          className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-white">{u.name}</p>
                            <p className="text-sm text-slate-400">{u.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="success"
                              disabled={approvalBusyId === u._id}
                              onClick={() => handleFacultyApproval(u._id, "approved")}
                            >
                              {approvalBusyId === u._id ? "…" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={approvalBusyId === u._id}
                              onClick={() => handleFacultyApproval(u._id, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                        No faculty are waiting for approval.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-white/10 bg-white/5 shadow-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-cyan-200">
                    <UserPlus className="h-5 w-5" />
                    <h3 className="text-lg font-semibold text-white">Add student or faculty</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">
                    Creates an active account attached to your college. {strongPasswordHint}
                  </p>
                  <form className="mt-4 space-y-4" onSubmit={handleAddRosterUser}>
                    <div>
                      <label className="text-xs font-medium text-slate-400" htmlFor="cr-name">
                        Full name
                      </label>
                      <input
                        id="cr-name"
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                        value={addName}
                        onChange={(e) => setAddName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400" htmlFor="cr-email">
                        Email
                      </label>
                      <input
                        id="cr-email"
                        type="email"
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                        value={addEmail}
                        onChange={(e) => setAddEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400" htmlFor="cr-role">
                        Role
                      </label>
                      <select
                        id="cr-role"
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white"
                        value={addRole}
                        onChange={(e) => setAddRole(e.target.value)}
                      >
                        <option value="student">Student</option>
                        <option value="faculty">Faculty</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-400" htmlFor="cr-password">
                        Initial password
                      </label>
                      <input
                        id="cr-password"
                        type="password"
                        autoComplete="new-password"
                        className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder:text-slate-500"
                        value={addPassword}
                        onChange={(e) => setAddPassword(e.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={addingUser}
                      className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 sm:w-auto"
                    >
                      {addingUser ? "Creating…" : "Create account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            <div
              id="college-dash-roster"
              tabIndex={-1}
              className="scroll-mt-28 mt-5 outline-none focus:outline-none"
            >
              <h3 className="text-lg font-semibold text-white">Your campus roster</h3>
              <p className="mt-1 text-sm text-slate-400">
                Students and faculty created by your college ({roster.length} accounts).
              </p>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[560px] text-left text-sm text-slate-300">
                  <thead>
                    <tr className="border-b border-white/10 bg-slate-900/50 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Faculty status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.length ? (
                      roster.map((u) => (
                        <tr key={u._id} className="border-b border-white/5 last:border-0">
                          <td className="px-4 py-3 text-white">{u.name}</td>
                          <td className="px-4 py-3 text-slate-400">{u.email}</td>
                          <td className="px-4 py-3 capitalize">{u.role}</td>
                          <td className="px-4 py-3 capitalize text-slate-400">
                            {u.role === "faculty"
                              ? u.facultyApprovalStatus || "approved"
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-9 min-w-[8.5rem] justify-center text-xs"
                              onClick={() => navigate(`/dashboard/learners/${u._id}`)}
                            >
                              View profile
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          No roster accounts yet. Use the form above to add students or faculty.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-6">
            <Card className="border border-slate-400/30 bg-slate-800/40 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white">Bulk students (Excel or CSV)</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Standard columns: <strong className="text-slate-200">S.No</strong>,{" "}
                  <strong className="text-slate-200">Course</strong>,{" "}
                  <strong className="text-slate-200">Program</strong>,{" "}
                  <strong className="text-slate-200">Year</strong>,{" "}
                  <strong className="text-slate-200">Contact number</strong>,{" "}
                  <strong className="text-slate-200">Email id</strong>. Optional:{" "}
                  <strong className="text-slate-200">Name</strong> (recommended for display name and default
                  password). Every row must match the class you select below. Default password pattern:{" "}
                  <code className="text-cyan-200">Firstname@123</code>.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Course (must match file)</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-400/35 bg-slate-800/90 px-3 py-2 text-sm text-slate-50"
                      value={importCourse}
                      onChange={(e) => setImportCourse(e.target.value)}
                    >
                      <option value="">Select course</option>
                      {STUDENT_COHORT_PROGRAM_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Program / branch</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-400/35 bg-slate-800/90 px-3 py-2 text-sm text-slate-50"
                      value={importProgram}
                      onChange={(e) => setImportProgram(e.target.value)}
                    >
                      <option value="">Select program</option>
                      {STUDENT_COHORT_BRANCH_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Year</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-400/35 bg-slate-800/90 px-3 py-2 text-sm text-slate-50"
                      value={importYear}
                      onChange={(e) => setImportYear(e.target.value)}
                    >
                      <option value="">Select year</option>
                      {STUDENT_COHORT_YEAR_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300">Semester (optional)</label>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-400/35 bg-slate-800/90 px-3 py-2 text-sm text-slate-50"
                      value={importSemester}
                      onChange={(e) => setImportSemester(e.target.value)}
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
                  id="college-bulk-students"
                  label="Spreadsheet file"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => setStudentSheetFile(e.target.files?.[0] || null)}
                  disabled={bulkBusy}
                />
                <Button
                  className="mt-4 w-full sm:w-auto"
                  disabled={
                    !studentSheetFile ||
                    !importCourse.trim() ||
                    !importProgram.trim() ||
                    !importYear.trim() ||
                    bulkBusy
                  }
                  onClick={handleCollegeStudentImport}
                >
                  Import students
                </Button>
              </CardContent>
            </Card>
            <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border border-slate-400/30 bg-slate-800/40 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white">Bulk materials (Excel)</h3>
                <p className="mt-1 text-sm text-slate-300">
                  Columns: title, summary, content, categorySlug/categoryId.
                </p>
                <VisibleFileInput
                  className="mt-4"
                  id="college-bulk-materials"
                  label="Materials spreadsheet"
                  accept=".xlsx,.xls"
                  onChange={(e) => setMaterialSheetFile(e.target.files?.[0] || null)}
                  disabled={bulkBusy}
                />
                <Button className="mt-4 w-full" disabled={!materialSheetFile || bulkBusy} onClick={handleMaterialSheetImport}>
                  Import materials
                </Button>
              </CardContent>
            </Card>
            <Card className="border border-slate-400/30 bg-slate-800/40 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white">Create material from image</h3>
                <input
                  placeholder="Material title"
                  className="mt-3 w-full rounded-xl border border-slate-400/35 bg-slate-800/85 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                />
                <input
                  placeholder="Category ID"
                  className="mt-3 w-full rounded-xl border border-slate-400/35 bg-slate-800/85 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  value={materialCategoryId}
                  onChange={(e) => setMaterialCategoryId(e.target.value)}
                />
                <VisibleFileInput
                  className="mt-3"
                  id="college-material-image"
                  label="Image file"
                  accept="image/*"
                  onChange={(e) => setMaterialImageFile(e.target.files?.[0] || null)}
                  disabled={bulkBusy}
                />
                <Button
                  className="mt-4 w-full"
                  disabled={!materialImageFile || !materialCategoryId.trim() || !materialTitle.trim() || bulkBusy}
                  onClick={handleMaterialImageCreate}
                >
                  Create from image
                </Button>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              title="Published Assessments"
              value={publishedAssessments.length}
              subtitle="Current assessments available to learners"
              icon={BookOpenCheck}
              to="/assessments"
            />
            <DashboardMetricCard
              title="Open Jobs"
              value={openJobs.length}
              subtitle="Company opportunities visible right now"
              icon={BriefcaseBusiness}
              scrollTargetId="college-dash-open-jobs"
            />
            <DashboardMetricCard
              title="Institution Role"
              value="Active"
              subtitle="College access is enabled"
              icon={Building2}
            />
            <DashboardMetricCard
              title="Campus Readiness"
              value={publishedAssessments.length || openJobs.length ? "Live" : "Setup"}
              subtitle="Platform opportunities are being tracked"
              icon={GraduationCap}
              scrollTargetId="college-dash-overview"
            />
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <Card
              id="college-dash-overview"
              tabIndex={-1}
              className="scroll-mt-28 border border-white/10 bg-white/5 shadow-none outline-none focus:outline-none"
            >
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">College Overview</h2>
                <p className="mt-2 text-sm text-slate-400">
                  A dedicated college dashboard is now active for this role.
                </p>
                <Button asChild className="mt-4" variant="default">
                  <Link to="/assessments/create">Create assessment (MCQ or question paper)</Link>
                </Button>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">College Name</p>
                    <p className="mt-2 text-lg font-semibold text-white">{me.name}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Email</p>
                    <p className="mt-2 text-lg font-semibold text-white">{me.email}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Role</p>
                    <p className="mt-2 text-lg font-semibold capitalize text-white">{me.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-white">Top Assessment Skills</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Skills that appear most often in the currently published assessments.
                </p>

                <div className="mt-6 space-y-3">
                  {topAssessmentSkills.length ? (
                    topAssessmentSkills.map(([skill, count]) => (
                      <div
                        key={skill}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-cyan-300" />
                          <span className="text-sm text-white">{skill}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-300">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No published assessment skill data available yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Recent Published Assessments</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Latest assessments that learners can attempt across the platform.
                </p>

                <div className="mt-6 space-y-4">
                  {publishedAssessments.slice(0, 5).length ? (
                    publishedAssessments.slice(0, 5).map((assessment) => (
                      <div
                        key={assessment._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <h3 className="font-semibold text-white">{assessment.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {assessment.skill || "General"} · {assessment.questions?.length || 0} questions
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No published assessments available right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Recent Open Jobs</h2>
                <p className="mt-2 text-sm text-slate-400">
                  The same open postings every partner college sees—use them for placement planning and
                  student outreach.
                </p>

                <div className="mt-6 space-y-4">
                  {openJobs.slice(0, 5).length ? (
                    openJobs.slice(0, 5).map((job) => (
                      <div
                        key={job._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <h3 className="font-semibold text-white">{job.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {job.createdBy?.name || "Company"} · {job.location || "Remote"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No open jobs available right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollegeDashboard;


import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  LoaderCircle,
  LogOut,
  Sparkles,
  Users,
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

function CollegeDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [me, setMe] = useState(user);
  const [assessments, setAssessments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

      const [meRes, assessmentsRes, jobsRes] = await Promise.all([
        fetch("/api/auth/me", { headers }),
        fetch("/api/assessments", { headers }),
        fetch("/api/jobs", { headers }),
      ]);

      const [meData, assessmentsData, jobsData] = await Promise.all([
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
      ]);

      if ([meRes, assessmentsRes, jobsRes].some((response) => response.status === 401)) {
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

  const publishedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.status === "published"),
    [assessments]
  );

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === "open"),
    [jobs]
  );

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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading college dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur xl:p-8">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">College Workspace</p>
              <h1 className="mt-2 text-3xl font-bold">Welcome, {me.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Track platform opportunities, view published assessments, and coordinate placement
                readiness for your institution.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/learn/manage">
                  <BookOpenCheck className="h-4 w-4" />
                  Manage Learning
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                Go to Home
              </Button>
              <Button
                variant="outline"
                onClick={onLogout}
                className="border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
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

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Published Assessments"
              value={publishedAssessments.length}
              subtitle="Current assessments available to learners"
              icon={BookOpenCheck}
            />
            <MetricCard
              title="Open Jobs"
              value={openJobs.length}
              subtitle="Company opportunities visible right now"
              icon={BriefcaseBusiness}
            />
            <MetricCard
              title="Institution Role"
              value="Active"
              subtitle="College access is enabled"
              icon={Building2}
            />
            <MetricCard
              title="Campus Readiness"
              value={publishedAssessments.length || openJobs.length ? "Live" : "Setup"}
              subtitle="Platform opportunities are being tracked"
              icon={GraduationCap}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">College Overview</h2>
                <p className="mt-2 text-sm text-slate-400">
                  A dedicated college dashboard is now active for this role.
                </p>

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

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
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
                  Open opportunities that can support student placement planning.
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
  );
}

export default CollegeDashboard;

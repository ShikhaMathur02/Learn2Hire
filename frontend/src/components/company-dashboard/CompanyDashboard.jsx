import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  Building2,
  FileSearch,
  LoaderCircle,
  PlusCircle,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { DashboardTopNav } from "../dashboard/DashboardTopNav";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { readApiResponse } from "../../lib/api";

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

const initialForm = {
  title: "",
  description: "",
  location: "",
  employmentType: "full-time",
  skillsRequired: "",
  status: "draft",
};

function CompanyDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState({
    metrics: {
      totalJobs: 0,
      openJobs: 0,
      totalApplications: 0,
      shortlistedCount: 0,
    },
    recentJobs: [],
    recentApplications: [],
  });
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setError("");
      const response = await fetch("/api/jobs/company/dashboard", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to load company dashboard.");
      }

      setDashboard(
        data.data || {
          metrics: {
            totalJobs: 0,
            openJobs: 0,
            totalApplications: 0,
            shortlistedCount: 0,
          },
          recentJobs: [],
          recentApplications: [],
        }
      );
    } catch (err) {
      setError(err.message || "Unable to load company dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!form.title.trim()) {
      setError("Please provide a job title.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          skillsRequired: form.skillsRequired
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to create job.");
      }

      setForm(initialForm);
      setSuccess("Job post created successfully.");
      await fetchDashboard();
    } catch (err) {
      setError(err.message || "Unable to create job.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (applicationId, status) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setUpdatingApplicationId(applicationId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/jobs/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to update application status.");
      }

      setSuccess("Applicant status updated.");
      await fetchDashboard();
    } catch (err) {
      setError(err.message || "Unable to update application.");
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const inputClassName =
    "h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading company dashboard...
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
            workspaceLabel="Company Workspace"
            title={`Welcome, ${user.name}`}
            description="Create job posts, monitor applicant activity, and track hiring progress in one place."
            user={{ name: user.name, email: user.email, role: user.role }}
            onLogout={onLogout}
            actionItems={[
              { label: "Manage jobs", to: "/company/jobs" },
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

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Job Posts"
              value={dashboard.metrics.totalJobs}
              subtitle="Total roles created by your company"
              icon={BriefcaseBusiness}
            />
            <MetricCard
              title="Open Roles"
              value={dashboard.metrics.openJobs}
              subtitle="Visible to student and alumni applicants"
              icon={Building2}
            />
            <MetricCard
              title="Applications"
              value={dashboard.metrics.totalApplications}
              subtitle="All incoming candidate applications"
              icon={Users}
            />
            <MetricCard
              title="Shortlisted"
              value={dashboard.metrics.shortlistedCount}
              subtitle="Candidates moved to shortlist"
              icon={FileSearch}
            />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <PlusCircle className="h-6 w-6 text-cyan-300" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Create Job Post</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Add a new opening for students and alumni to apply.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateJob} className="mt-6 space-y-4">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Job title"
                    className={inputClassName}
                  />
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="Location"
                      className={inputClassName}
                    />
                    <select
                      value={form.employmentType}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, employmentType: e.target.value }))
                      }
                      className={inputClassName}
                    >
                      <option value="full-time">Full-time</option>
                      <option value="internship">Internship</option>
                      <option value="part-time">Part-time</option>
                      <option value="contract">Contract</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={form.skillsRequired}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, skillsRequired: e.target.value }))
                    }
                    placeholder="Skills required, separated by commas"
                    className={inputClassName}
                  />
                  <select
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                    className={inputClassName}
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Describe the role, expectations, and required experience"
                    rows={5}
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Creating..." : "Create Job"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Company Profile</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Your company account details used across job posting and review workflows.
                </p>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Company Name</p>
                    <p className="mt-2 text-lg font-semibold text-white">{user.name}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Email</p>
                    <p className="mt-2 text-lg font-semibold text-white">{user.email}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Role</p>
                    <p className="mt-2 text-lg font-semibold capitalize text-white">{user.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Recent Job Posts</h2>
                <p className="mt-2 text-sm text-slate-400">
                  The latest job openings created by your company account.
                </p>
                <div className="mt-4">
                  <Button asChild variant="default">
                    <Link to="/company/jobs">Open Job Manager</Link>
                  </Button>
                </div>

                <div className="mt-6 space-y-4">
                  {dashboard.recentJobs.length ? (
                    dashboard.recentJobs.map((job) => (
                      <div
                        key={job._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{job.title}</h3>
                            <p className="mt-1 text-sm text-slate-400">
                              {job.location || "Remote"} · {job.employmentType}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {job.skillsRequired?.length
                                ? job.skillsRequired.join(", ")
                                : "No skills added yet"}
                            </p>
                          </div>
                          <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
                            {job.status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No job posts yet. Create your first role from the form above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Recent Applicants</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Review candidate applications and move them through your hiring pipeline.
                </p>

                <div className="mt-6 space-y-4">
                  {dashboard.recentApplications.length ? (
                    dashboard.recentApplications.map((application) => (
                      <div
                        key={application._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-semibold text-white">
                                {application.student?.name || "Applicant"}
                              </h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {application.job?.title || "Job"} · {application.student?.email}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">
                                Score: {application.studentProfile?.overallScore ?? 0}% · Applied{" "}
                                {new Date(
                                  application.appliedAt || application.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium capitalize text-slate-200">
                              {application.status}
                            </span>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                              value={application.status}
                              onChange={(e) =>
                                handleStatusUpdate(application._id, e.target.value)
                              }
                              disabled={updatingApplicationId === application._id}
                              className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-cyan-400"
                            >
                              <option value="applied">Applied</option>
                              <option value="reviewing">Reviewing</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="rejected">Rejected</option>
                              <option value="hired">Hired</option>
                            </select>
                            <p className="text-xs text-slate-500">
                              Status updates are saved immediately.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No applicants yet. Once students or alumni apply, they will appear here.
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

export default CompanyDashboard;

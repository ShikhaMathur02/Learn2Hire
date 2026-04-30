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

import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../dashboard/DashboardTopNav";
import { DashboardMetricCard } from "../dashboard/DashboardMetricCard";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { readApiResponse } from "../../lib/api";

const initialForm = {
  title: "",
  description: "",
  location: "",
  employmentType: "full-time",
  skillsRequired: "",
  status: "draft",
  postingAudience: "all_colleges",
  targetCollegeId: "",
};

function CompanyDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [profileForm, setProfileForm] = useState({
    companyBio: "",
    companyDetails: "",
    companyGoals: "",
    companyFocusAreas: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
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
  const [colleges, setColleges] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/approved-colleges");
        const data = await readApiResponse(
          res,
          "Colleges list returned an unexpected response."
        );
        if (!res.ok || cancelled) return;
        const list = data.data?.colleges ?? [];
        setColleges(list.filter((c) => c.collegeApprovalStatus !== "rejected"));
      } catch {
        /* optional: company can still post platform-wide */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setError("");
      const [dashRes, meRes] = await Promise.all([
        fetch("/api/jobs/company/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [dashData, meData] = await Promise.all([
        readApiResponse(
          dashRes,
          "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          meRes,
          "Auth API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
      ]);

      if (dashRes.status === 401 || meRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!dashRes.ok) {
        throw new Error(dashData.message || "Failed to load company dashboard.");
      }

      if (meRes.ok && meData.data?.user) {
        const u = meData.data.user;
        setProfileForm({
          companyBio: u.companyBio || "",
          companyDetails: u.companyDetails || "",
          companyGoals: u.companyGoals || "",
          companyFocusAreas: u.companyFocusAreas || "",
        });
        try {
          const raw = localStorage.getItem("user");
          const prev = raw ? JSON.parse(raw) : {};
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...prev,
              companyBio: u.companyBio || "",
              companyDetails: u.companyDetails || "",
              companyGoals: u.companyGoals || "",
              companyFocusAreas: u.companyFocusAreas || "",
            })
          );
        } catch {
          /* ignore */
        }
      }

      setDashboard(
        dashData.data || {
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

  const handleSaveCompanyProfile = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setProfileSaving(true);
    try {
      const response = await fetch("/api/auth/me/company", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileForm),
      });
      const data = await readApiResponse(
        response,
        "Auth API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );
      if (!response.ok) {
        throw new Error(data.message || "Failed to save company profile.");
      }
      const u = data.data?.user;
      if (u) {
        setProfileForm({
          companyBio: u.companyBio || "",
          companyDetails: u.companyDetails || "",
          companyGoals: u.companyGoals || "",
          companyFocusAreas: u.companyFocusAreas || "",
        });
        try {
          const raw = localStorage.getItem("user");
          const prev = raw ? JSON.parse(raw) : {};
          localStorage.setItem("user", JSON.stringify({ ...prev, ...u }));
        } catch {
          /* ignore */
        }
      }
      setSuccess("Company profile saved. Learners will see this on your job listings.");
    } catch (err) {
      setError(err.message || "Unable to save company profile.");
    } finally {
      setProfileSaving(false);
    }
  };

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

    if (form.postingAudience === "single_college" && !form.targetCollegeId.trim()) {
      setError('Select a college for a campus-only listing, or choose "All partner colleges".');
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
          targetCollegeId:
            form.postingAudience === "single_college" ? form.targetCollegeId.trim() : undefined,
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
      <div className="l2h-dark-ui flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading company dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="l2h-dark-ui min-h-screen bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-white">
      <div className="w-full px-3 py-5 sm:px-4 sm:py-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Company Workspace"
          title={`Welcome, ${user.name}`}
          description="Post roles visible across every partner college, manage applicants, and share your company story with candidates."
          user={{ name: user.name, email: user.email, role: user.role }}
          onLogout={onLogout}
          actionItems={[
            { label: "Manage jobs", to: "/company/jobs" },
            { label: "Talent pool", to: "/company/talent" },
            { label: "Go to home", onClick: () => navigate("/") },
          ]}
        />

        <div className="mt-4 rounded-[32px] border border-white/10 bg-slate-950/45 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
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
            <DashboardMetricCard
              title="Job Posts"
              value={dashboard.metrics.totalJobs}
              subtitle="Total roles created by your company"
              icon={BriefcaseBusiness}
              scrollTargetId="company-dash-recent-jobs"
            />
            <DashboardMetricCard
              title="Open Roles"
              value={dashboard.metrics.openJobs}
              subtitle="Listed platform-wide for students at all colleges"
              icon={Building2}
              to="/company/jobs"
            />
            <DashboardMetricCard
              title="Applications"
              value={dashboard.metrics.totalApplications}
              subtitle="All incoming candidate applications"
              icon={Users}
              scrollTargetId="company-dash-applications"
            />
            <DashboardMetricCard
              title="Shortlisted"
              value={dashboard.metrics.shortlistedCount}
              subtitle="Candidates moved to shortlist"
              icon={FileSearch}
              to="/company/talent"
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
                      Choose whether this role is open to every partner college or restricted to one
                      campus. Only students tied to that campus will see a campus-only listing.
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
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Visibility
                    </label>
                    <select
                      value={form.postingAudience}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          postingAudience: e.target.value,
                          targetCollegeId:
                            e.target.value === "single_college" ? prev.targetCollegeId : "",
                        }))
                      }
                      className={inputClassName}
                    >
                      <option value="all_colleges">All partner colleges on Learn2Hire</option>
                      <option value="single_college">One specific college only</option>
                    </select>
                  </div>
                  {form.postingAudience === "single_college" ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        College
                      </label>
                      <select
                        value={form.targetCollegeId}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, targetCollegeId: e.target.value }))
                        }
                        className={inputClassName}
                        required
                      >
                        <option value="">Select a college…</option>
                        {colleges.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      {colleges.length === 0 ? (
                        <p className="mt-2 text-xs text-amber-200/90">
                          No approved colleges loaded. You can still save as draft and try again, or
                          post to all colleges.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
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
                  Account details plus your story—bio, what you do, goals, and focus areas—shown to
                  candidates on job pages.
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
                </div>

                <form onSubmit={handleSaveCompanyProfile} className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Short bio
                    </label>
                    <textarea
                      value={profileForm.companyBio}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, companyBio: e.target.value }))
                      }
                      placeholder="One or two sentences about who you are as an employer."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Company details
                    </label>
                    <textarea
                      value={profileForm.companyDetails}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, companyDetails: e.target.value }))
                      }
                      placeholder="What you build, your culture, team size, locations, or products."
                      rows={4}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Goals
                    </label>
                    <textarea
                      value={profileForm.companyGoals}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, companyGoals: e.target.value }))
                      }
                      placeholder="Hiring objectives, growth plans, or what you want from campus talent."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Focus areas
                    </label>
                    <textarea
                      value={profileForm.companyFocusAreas}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, companyFocusAreas: e.target.value }))
                      }
                      placeholder="Industries, technologies, or domains you work in (comma-separated or short paragraphs)."
                      rows={3}
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />
                  </div>
                  <Button type="submit" disabled={profileSaving} variant="outline">
                    {profileSaving ? "Saving…" : "Save company profile"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Card
              id="company-dash-recent-jobs"
              tabIndex={-1}
              className="scroll-mt-28 border border-white/10 bg-white/5 shadow-none outline-none focus:outline-none"
            >
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

            <Card
              id="company-dash-applications"
              tabIndex={-1}
              className="scroll-mt-28 border border-white/10 bg-white/5 shadow-none outline-none focus:outline-none"
            >
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
                      No applicants yet. Once students apply, they will appear here.
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


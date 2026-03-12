import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, LoaderCircle, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  employmentType: "full-time",
  skillsRequired: "",
  status: "draft",
};

function mapJobToForm(job) {
  if (!job) return emptyForm;

  return {
    title: job.title || "",
    description: job.description || "",
    location: job.location || "",
    employmentType: job.employmentType || "full-time",
    skillsRequired: Array.isArray(job.skillsRequired) ? job.skillsRequired.join(", ") : "",
    status: job.status || "draft",
  };
}

function CompanyJobsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const fetchJobs = useCallback(async () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return [];
    }

    let parsedUser;

    try {
      parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
      return [];
    }

    if (parsedUser.role !== "company") {
      setError("This page is available only for company accounts.");
      setLoading(false);
      return [];
    }

    const response = await fetch("/api/jobs", {
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
      return [];
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to load jobs.");
    }

    return data.data?.jobs || [];
  }, [navigate]);

  const fetchApplications = useCallback(
    async (jobId) => {
      if (!jobId) {
        setApplications([]);
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${jobId}/applications`, {
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
        throw new Error(data.message || "Failed to load applications.");
      }

      setApplications(data.data?.applications || []);
    },
    [navigate]
  );

  const refreshPage = useCallback(async () => {
    try {
      setError("");
      const nextJobs = await fetchJobs();
      setJobs(nextJobs);

      const nextSelectedJobId =
        nextJobs.find((job) => job._id === selectedJobId)?._id || nextJobs[0]?._id || "";

      setSelectedJobId(nextSelectedJobId);
      const nextSelectedJob = nextJobs.find((job) => job._id === nextSelectedJobId) || null;
      setForm(mapJobToForm(nextSelectedJob));

      if (nextSelectedJobId) {
        await fetchApplications(nextSelectedJobId);
      } else {
        setApplications([]);
      }
    } catch (err) {
      setError(err.message || "Unable to load company jobs.");
    } finally {
      setLoading(false);
    }
  }, [fetchApplications, fetchJobs, selectedJobId]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage]);

  useEffect(() => {
    if (selectedJob) {
      setForm(mapJobToForm(selectedJob));
    }
  }, [selectedJob]);

  const handleSelectJob = async (job) => {
    setSelectedJobId(job._id);
    setForm(mapJobToForm(job));
    setError("");
    setSuccess("");

    try {
      await fetchApplications(job._id);
    } catch (err) {
      setError(err.message || "Unable to load applications for this job.");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedJobId) {
      setError("Select a job first.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${selectedJobId}`, {
        method: "PUT",
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
        throw new Error(data.message || "Failed to update job.");
      }

      setSuccess("Job updated successfully.");
      await refreshPage();
    } catch (err) {
      setError(err.message || "Unable to update job.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedJobId) {
      setError("Select a job first.");
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${selectedJobId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete job.");
      }

      setSuccess("Job deleted successfully.");
      await refreshPage();
    } catch (err) {
      setError(err.message || "Unable to delete job.");
    } finally {
      setDeleting(false);
    }
  };

  const handleApplicationStatus = async (applicationId, status) => {
    setUpdatingApplicationId(applicationId);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

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
        throw new Error(data.message || "Failed to update applicant status.");
      }

      setSuccess("Applicant status updated.");
      await fetchApplications(selectedJobId);
    } catch (err) {
      setError(err.message || "Unable to update applicant status.");
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
          Loading company jobs...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-300">Manage Jobs</span>
            </div>
            <p className="text-sm font-medium text-cyan-300">Company Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">Manage Job Posts</h1>
            <p className="mt-2 text-sm text-slate-400">
              Update role details, change status, review applicants, and remove old openings.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white">Your Jobs</h2>
              <p className="mt-2 text-sm text-slate-400">
                Select a role to edit details and review applicants.
              </p>

              <div className="mt-6 space-y-4">
                {jobs.length ? (
                  jobs.map((job) => (
                    <button
                      key={job._id}
                      type="button"
                      onClick={() => handleSelectJob(job)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedJobId === job._id
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-slate-900/60 hover:border-indigo-400/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                              <BriefcaseBusiness className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-white">{job.title}</h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {job.location || "Remote"} · {job.employmentType}
                              </p>
                            </div>
                          </div>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium capitalize text-slate-200">
                          {job.status}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No jobs created yet. Go back to the company dashboard to create your first job
                    post.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Edit Job</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Keep this opening updated for applicants.
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    {user ? `Signed in as ${user.name}` : null}
                  </div>
                </div>

                {selectedJob ? (
                  <form onSubmit={handleSave} className="mt-6 space-y-4">
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
                        onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
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
                      rows={5}
                      placeholder="Describe the role, responsibilities, and expectations"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                    />

                    <div className="flex flex-wrap justify-between gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="border-rose-400/40 text-rose-200 hover:bg-rose-500/10 hover:text-rose-100"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "Deleting..." : "Delete Job"}
                      </Button>

                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    Select a job from the left to start managing it.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Applicants</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Review applications for the selected job and move candidates through the pipeline.
                </p>

                <div className="mt-6 space-y-4">
                  {applications.length ? (
                    applications.map((application) => (
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
                                {application.student?.email}
                              </p>
                              <p className="mt-2 text-xs text-slate-500">
                                Overall Score: {application.studentProfile?.overallScore ?? 0}% ·
                                Applied{" "}
                                {new Date(
                                  application.appliedAt || application.createdAt
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium capitalize text-slate-200">
                              {application.status}
                            </span>
                          </div>

                          {application.coverLetter ? (
                            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm leading-6 text-slate-300">
                              {application.coverLetter}
                            </div>
                          ) : null}

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                              value={application.status}
                              onChange={(e) =>
                                handleApplicationStatus(application._id, e.target.value)
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
                              Changes save immediately.
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No applicants for the selected job yet.
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

export default CompanyJobsPage;

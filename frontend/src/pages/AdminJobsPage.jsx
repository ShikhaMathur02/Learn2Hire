import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  LoaderCircle,
  Search,
  Trash2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function AdminJobsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [interests, setInterests] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    company: "",
    status: "",
  }); 
  const [statusDraft, setStatusDraft] = useState("draft");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = filters.search
        ? `${job.title} ${job.description || ""}`.toLowerCase().includes(filters.search.toLowerCase())
        : true;
      const matchesCompany = filters.company
        ? (job.createdBy?.name || "").toLowerCase().includes(filters.company.toLowerCase())
        : true;
      const matchesStatus = filters.status ? job.status === filters.status : true;

      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [filters, jobs]);

  const selectedJob = useMemo(
    () => filteredJobs.find((job) => job._id === selectedJobId) || jobs.find((job) => job._id === selectedJobId) || null,
    [filteredJobs, jobs, selectedJobId]
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

    if (parsedUser.role !== "admin") {
      setError("This page is available only for admin accounts.");
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

      if (!response.ok) {
        throw new Error(data.message || "Failed to load applications.");
      }

      setApplications(data.data?.applications || []);
    },
    [navigate]
  );

  const fetchInterests = useCallback(
    async (jobId) => {
      if (!jobId) {
        setInterests([]);
        return;
      }
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      const response = await fetch(`/api/jobs/${jobId}/interests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );
      if (!response.ok) {
        setInterests([]);
        return;
      }
      setInterests(data.data?.interests || []);
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

      const nextSelected = nextJobs.find((job) => job._id === nextSelectedJobId) || null;
      setStatusDraft(nextSelected?.status || "draft");

      if (nextSelectedJobId) {
        await fetchApplications(nextSelectedJobId);
        await fetchInterests(nextSelectedJobId);
      } else {
        setApplications([]);
        setInterests([]);
      }
    } catch (err) {
      setError(err.message || "Unable to load admin jobs.");
    } finally {
      setLoading(false);
    }
  }, [fetchApplications, fetchInterests, fetchJobs, selectedJobId]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage]);

  useEffect(() => {
    if (selectedJob) {
      setStatusDraft(selectedJob.status || "draft");
    }
  }, [selectedJob]);

  const handleStatusSave = async () => {
    if (!selectedJob) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${selectedJob._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: statusDraft }),
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to update job status.");
      }

      setSuccess("Job status updated successfully.");
      await refreshPage();
    } catch (err) {
      setError(err.message || "Unable to update job status.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!selectedJob) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${selectedJob._id}`, {
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
      await fetchInterests(selectedJobId);
    } catch (err) {
      setError(err.message || "Unable to update applicant status.");
    } finally {
      setUpdatingApplicationId("");
    }
  };

  const handleDownloadApplicantResume = async (studentId, downloadName) => {
    const token = localStorage.getItem("token");
    if (!token || !selectedJobId || !studentId) return;
    setError("");
    try {
      const res = await fetch(`/api/jobs/${selectedJobId}/students/${studentId}/resume`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await readApiResponse(res);
        throw new Error(data.message || "Could not download résumé.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName || "resume.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Résumé download failed.");
    }
  };

  if (loading) {
    return (
      <div className="l2h-dark-ui flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading admin job management...
        </div>
      </div>
    );
  }

  return (
    <div className="l2h-dark-ui min-h-screen bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] px-3 py-5 text-white sm:px-4 sm:py-6">
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-300">Admin Jobs</span>
            </div>
            <p className="text-sm font-medium text-cyan-300">Admin Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">Jobs Management</h1>
            <p className="mt-2 text-sm text-slate-400">
              Review all company jobs, manage status, and inspect applications across the platform.
            </p>
          </div>

          <Button
            variant="default"
            onClick={() => navigate("/dashboard")}
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

        <Card className="mb-6 border border-white/10 bg-white/5 shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <Search className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold text-white">Filters</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="Search by title"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
              <input
                type="text"
                value={filters.company}
                onChange={(e) => setFilters((prev) => ({ ...prev, company: e.target.value }))}
                placeholder="Filter by company"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              >
                <option value="">All status</option>
                <option value="draft">Draft</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white">All Jobs</h2>
              <p className="mt-2 text-sm text-slate-400">
                Choose a job to manage its status and review applicants.
              </p>

              <div className="mt-6 space-y-4">
                {filteredJobs.length ? (
                  filteredJobs.map((job) => (
                    <button
                      key={job._id}
                      type="button"
                      onClick={async () => {
                        setSelectedJobId(job._id);
                        setStatusDraft(job.status || "draft");
                        await fetchApplications(job._id);
                        await fetchInterests(job._id);
                      }}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        selectedJobId === job._id
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-white/10 bg-slate-900/60 hover:border-indigo-400/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                            <BriefcaseBusiness className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-white">{job.title}</h3>
                            <p className="mt-1 text-sm text-slate-400">
                              {job.createdBy?.name || "Company"} · {job.location || "Remote"}
                            </p>
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
                    No jobs match the current filters.
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
                    <h2 className="text-2xl font-bold text-white">Job Controls</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      {selectedJob
                        ? `Managing ${selectedJob.title}`
                        : "Select a job to manage its state."}
                    </p>
                  </div>
                  <div className="text-sm text-slate-400">
                    {user ? `Signed in as ${user.name}` : null}
                  </div>
                </div>

                {selectedJob ? (
                  <div className="mt-6 space-y-5">
                    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-white">{selectedJob.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {selectedJob.createdBy?.name || "Company"} · {selectedJob.createdBy?.email}
                          </p>
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {selectedJob.description || "No description available."}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
                          {selectedJob.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <select
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                        className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      >
                        <option value="draft">Draft</option>
                        <option value="open">Open</option>
                        <option value="closed">Closed</option>
                      </select>
                      <Button onClick={handleStatusSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Status"}
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteJob} disabled={deleting}>
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "Deleting..." : "Delete Job"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    Select a job from the left to start managing it.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Applications</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Review the selected job’s applicant pipeline.
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
                                Overall Score: {application.studentProfile?.overallScore ?? 0}%
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

                          {application.studentProfile?.skills?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {application.studentProfile.skills.slice(0, 6).map((skill) => (
                                <span
                                  key={skill._id || `${application._id}-${skill.name}`}
                                  className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300"
                                >
                                  {skill.name}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap gap-3">
                            {application.portfolioLink ? (
                              <a
                                href={application.portfolioLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                              >
                                Portfolio Link
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                            {application.hasResumeFile && application.student?._id ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="border-cyan-400/40 text-cyan-100"
                                onClick={() =>
                                  handleDownloadApplicantResume(
                                    application.student._id,
                                    application.resumeOriginalName
                                  )
                                }
                              >
                                <FileText className="h-4 w-4" />
                                Download résumé
                              </Button>
                            ) : null}
                          </div>

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
                      No applications for the selected job yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Interested candidates</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Interest-only notifications for the selected job (snapshot résumé if uploaded).
                </p>
                <div className="mt-6 space-y-4">
                  {interests.length ? (
                    interests.map((row) => (
                      <div
                        key={row._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-white">
                              {row.student?.name || "Learner"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-400">{row.student?.email}</p>
                            {row.message ? (
                              <p className="mt-2 text-sm text-slate-300">{row.message}</p>
                            ) : null}
                          </div>
                          {row.hasResumeFile && row.student?._id ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 border-cyan-400/40 text-cyan-100"
                              onClick={() =>
                                handleDownloadApplicantResume(
                                  row.student._id,
                                  row.resumeOriginalName
                                )
                              }
                            >
                              <FileText className="h-4 w-4" />
                              Download résumé
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-500">No file résumé on record</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No interest entries for this job.
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

export default AdminJobsPage;


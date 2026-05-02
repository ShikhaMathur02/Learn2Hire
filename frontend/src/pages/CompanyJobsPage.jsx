import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  LoaderCircle,
  Trash2,
  Upload,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import { workspaceRootProps } from "../lib/workspaceTheme";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const emptyForm = {
  title: "",
  description: "",
  location: "",
  employmentType: "full-time",
  skillsRequired: "",
  status: "draft",
  postingAudience: "all_colleges",
  targetCollegeId: "",
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
    postingAudience: job.postingAudience === "single_college" ? "single_college" : "all_colleges",
    targetCollegeId: job.targetCollege?._id || job.targetCollege || "",
  };
}

function CompanyJobsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [applications, setApplications] = useState([]);
  const [interests, setInterests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingApplicationId, setUpdatingApplicationId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [colleges, setColleges] = useState([]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job._id === selectedJobId) || null,
    [jobs, selectedJobId]
  );

  const fetchJobs = useCallback(async () => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
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
      headers: {},
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

      if (!user) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${jobId}/applications`, {
        headers: {},
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
    [navigate, user]
  );

  const fetchInterests = useCallback(
    async (jobId) => {
      if (!jobId) {
        setInterests([]);
        return;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${jobId}/interests`, {
        headers: {},
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
        setInterests([]);
        return;
      }

      setInterests(data.data?.interests || []);
    },
    [navigate, user]
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
        await fetchInterests(nextSelectedJobId);
      } else {
        setApplications([]);
        setInterests([]);
      }
    } catch (err) {
      setError(err.message || "Unable to load company jobs.");
    } finally {
      setLoading(false);
    }
  }, [fetchApplications, fetchInterests, fetchJobs, selectedJobId]);

  useEffect(() => {
    refreshPage();
  }, [refreshPage]);

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
        /* non-blocking */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      await fetchInterests(job._id);
    } catch (err) {
      setError(err.message || "Unable to load applications for this job.");
    }
  };

  const handleDownloadApplicantResume = async (studentId, downloadName) => {
    if (!selectedJobId || !studentId) return;
    setError("");
    try {
      const res = await fetch(`/api/jobs/${selectedJobId}/students/${studentId}/resume`, {
        headers: {},
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

  const handleSave = async (e) => {
    e.preventDefault();

    if (!selectedJobId) {
      setError("Select a job first.");
      return;
    }

    if (form.postingAudience === "single_college" && !form.targetCollegeId.trim()) {
      setError('Select a college for a campus-only listing, or choose "All partner colleges".');
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!user) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${selectedJobId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
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
      if (!user) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/${selectedJobId}`, {
        method: "DELETE",
        headers: {},
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

  const handleJdFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedJobId) return;
    if (file.type !== "application/pdf") {
      setError("Please choose a PDF file for the job description.");
      return;
    }
    if (!user) {
      navigate("/login");
      return;
    }
    setJdUploading(true);
    setError("");
    setSuccess("");
    try {
      const fd = new FormData();
      fd.append("jd", file);
      const res = await fetch(`/api/jobs/${selectedJobId}/jd`, {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(
        res,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );
      if (!res.ok) throw new Error(data.message || "JD upload failed.");
      setSuccess("Job description (PDF) uploaded. Students were notified for open roles.");
      await refreshPage();
    } catch (err) {
      setError(err.message || "Could not upload JD.");
    } finally {
      setJdUploading(false);
    }
  };

  const handleDownloadJd = async () => {
    if (!selectedJobId) return;
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const res = await fetch(`/api/jobs/${selectedJobId}/jd`, {
        headers: {},
      });
      if (!res.ok) {
        const data = await readApiResponse(res);
        throw new Error(data.message || "Download failed.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = selectedJob?.jdOriginalName || "job-description.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download JD.");
    }
  };

  const handleApplicationStatus = async (applicationId, status) => {
    setUpdatingApplicationId(applicationId);
    setError("");
    setSuccess("");

    try {
      if (!user) {
        navigate("/login");
        return;
      }

      const response = await fetch(`/api/jobs/applications/${applicationId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
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
    "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20";

  if (loading) {
    return (
      <div {...workspaceRootProps("company", "flex min-h-screen items-center justify-center text-slate-600")}>
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading company jobs...
        </div>
      </div>
    );
  }

  return (
    <div {...workspaceRootProps("company", "l2h-container-app min-h-screen py-5 sm:py-6")}>
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              <Link
                to="/dashboard"
                className="font-medium text-[var(--primary)] transition hover:underline"
              >
                Dashboard
              </Link>
              <span>/</span>
              <span className="font-medium text-[var(--text)]">Manage Jobs</span>
              <span className="text-[var(--text-subtle)]">·</span>
              <Link
                to="/company/talent"
                className="font-medium text-[var(--primary)] transition hover:underline"
              >
                Talent pool
              </Link>
            </div>
            <p className="text-sm font-semibold text-[var(--primary)]">Company Workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-[var(--text)]">Manage Job Posts</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Update role details, change status, review applicants, and remove old openings.
            </p>
          </div>

          <Button variant="default" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-slate-900">Your Jobs</h2>
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
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-slate-200 bg-slate-50 hover:border-[var(--primary)]/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                              <BriefcaseBusiness className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">{job.title}</h3>
                              <p className="mt-1 text-sm text-slate-400">
                                {job.location || "Remote"} · {job.employmentType}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                            {job.status}
                          </span>
                          {job.postingAudience === "single_college" && job.targetCollege?.name ? (
                            <span className="max-w-[10rem] text-right text-[11px] text-amber-800/90">
                              {job.targetCollege.name} only
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">All colleges</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                    No jobs created yet. Go back to the company dashboard to create your first job
                    post.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Edit Job</h2>
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
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
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
                        <label className="mb-2 block text-sm font-medium text-[var(--text-muted)]">
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
                      </div>
                    ) : null}
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      rows={5}
                      placeholder="Describe the role, responsibilities, and expectations"
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                    />

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-3">
                          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              Job description document (PDF)
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              Upload a formal JD. Students get a notification when you add or replace
                              it on an <span className="font-semibold text-slate-800">open</span> role.
                            </p>
                            {selectedJob?.hasJdDocument ? (
                              <p className="mt-2 text-xs text-emerald-800">
                                Current file: {selectedJob.jdOriginalName || "job-description.pdf"}
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-slate-500">No PDF attached yet.</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob?.hasJdDocument ? (
                            <Button type="button" variant="outline" onClick={handleDownloadJd}>
                              <ExternalLink className="h-4 w-4" />
                              Download
                            </Button>
                          ) : null}
                          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-2 text-sm font-medium text-[var(--primary-dark)] transition hover:bg-[var(--primary)]/20">
                            <Upload className="h-4 w-4" />
                            {jdUploading ? "Uploading…" : "Upload PDF"}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              disabled={jdUploading}
                              onChange={handleJdFile}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-3">
                      <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "Deleting..." : "Delete Job"}
                      </Button>

                      <Button type="submit" disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                    Select a job from the left to start managing it.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-slate-900">Applicants</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Review applications for the selected job and move candidates through the pipeline.
                </p>

                <div className="mt-6 space-y-4">
                  {applications.length ? (
                    applications.map((application) => (
                      <div
                        key={application._id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3 className="font-semibold text-slate-900">
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
                            <span className="rounded-full bg-slate-50 px-3 py-1 text-xs font-medium capitalize text-slate-600">
                              {application.status}
                            </span>
                          </div>

                          {application.studentProfile?.bio ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                              {application.studentProfile.bio}
                            </div>
                          ) : null}

                          {application.coverLetter ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                              {application.coverLetter}
                            </div>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Skills
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">
                                {application.studentProfile?.skills?.length || 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Courses
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">
                                {application.studentProfile?.stats?.coursesCompleted || 0}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Assessments
                              </p>
                              <p className="mt-2 text-lg font-semibold text-slate-900">
                                {application.studentProfile?.stats?.assessmentsTaken || 0}
                              </p>
                            </div>
                          </div>

                          {application.studentProfile?.skills?.length ? (
                            <div className="flex flex-wrap gap-2">
                              {application.studentProfile.skills.slice(0, 6).map((skill) => (
                                <span
                                  key={skill._id || `${application._id}-${skill.name}`}
                                  className="rounded-full bg-[var(--primary)]/12 px-3 py-1 text-xs text-[var(--primary-dark)]"
                                >
                                  {skill.name} {typeof skill.progress === "number" ? `· ${skill.progress}%` : ""}
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
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-50"
                              >
                                Portfolio Link
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                            {application.hasResumeFile && application.student?._id ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="border-[var(--primary)]/40 text-[var(--primary-dark)]"
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
                              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
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
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                      No applicants for the selected job yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-slate-900">Interested candidates</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Learners who notified you of interest before applying. Their snapshot résumé (if any)
                  is from when they clicked interest.
                </p>
                <div className="mt-6 space-y-4">
                  {interests.length ? (
                    interests.map((row) => (
                      <div
                        key={row._id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">
                              {row.student?.name || "Learner"}
                            </h3>
                            <p className="mt-1 text-sm text-slate-400">{row.student?.email}</p>
                            {row.message ? (
                              <p className="mt-2 text-sm text-slate-600">{row.message}</p>
                            ) : null}
                          </div>
                          {row.hasResumeFile && row.student?._id ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="shrink-0 border-[var(--primary)]/40 text-[var(--primary-dark)]"
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
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                      No interest notifications for this job yet.
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


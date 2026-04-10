import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  Heart,
  LoaderCircle,
  MapPin,
  Send,
} from "lucide-react";

import { readApiResponse } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [form, setForm] = useState({
    coverLetter: "",
    resumeLink: "",
    portfolioLink: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const existingApplication = useMemo(
    () =>
      applications.find(
        (application) => application.job?._id === id || application.job === id
      ) || null,
    [applications, id]
  );

  const isSaved = useMemo(
    () => savedJobs.some((savedJob) => savedJob.job?._id === id || savedJob.job === id),
    [id, savedJobs]
  );

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    let parsedUser;

    try {
      parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
      return;
    }

    if (!["student", "alumni"].includes(parsedUser.role)) {
      setError("This page is available only for student and alumni accounts.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [jobRes, applicationsRes, savedRes] = await Promise.all([
        fetch(`/api/jobs/${id}`, { headers }),
        fetch("/api/jobs/applications/me", { headers }),
        fetch("/api/jobs/saved/me", { headers }),
      ]);

      const [jobData, applicationsData, savedData] = await Promise.all([
        readApiResponse(
          jobRes,
          "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          applicationsRes,
          "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          savedRes,
          "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
      ]);

      if ([jobRes, applicationsRes, savedRes].some((response) => response.status === 401)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!jobRes.ok) {
        throw new Error(jobData.message || "Failed to load job.");
      }

      if (!applicationsRes.ok) {
        throw new Error(applicationsData.message || "Failed to load applications.");
      }

      if (!savedRes.ok) {
        throw new Error(savedData.message || "Failed to load saved jobs.");
      }

      setJob(jobData.data?.job || null);
      setApplications(applicationsData.data?.applications || []);
      setSavedJobs(savedData.data?.savedJobs || []);
    } catch (err) {
      setError(err.message || "Unable to load job details.");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveToggle = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/jobs/${id}/save`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to update saved job.");
      }

      setSuccess(isSaved ? "Job removed from saved list." : "Job saved successfully.");
      await fetchData();
    } catch (err) {
      setError(err.message || "Unable to update saved job.");
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();

    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/jobs/${id}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coverLetter: form.coverLetter.trim(),
          resumeLink: form.resumeLink.trim(),
          portfolioLink: form.portfolioLink.trim(),
        }),
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit application.");
      }

      setSuccess("Application submitted successfully.");
      await fetchData();
    } catch (err) {
      setError(err.message || "Unable to submit application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading job details...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-3 py-5 text-white sm:px-4 sm:py-6">
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <span>/</span>
              <Link to="/jobs" className="transition hover:text-white">
                Jobs
              </Link>
              <span>/</span>
              <span className="text-slate-300">Details</span>
            </div>
            <p className="text-sm font-medium text-cyan-300">Career Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">{job?.title || "Job Details"}</h1>
            <p className="mt-2 text-sm text-slate-400">
              Review the full opportunity details and complete your application with links and a
              short note.
            </p>
          </div>

          <Button variant="default" onClick={() => navigate("/jobs")}>
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

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                    <BriefcaseBusiness className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{job?.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {job?.createdBy?.name || "Company"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="default" onClick={handleSaveToggle} disabled={saving}>
                    <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                    {saving ? "Saving..." : isSaved ? "Saved" : "Save Job"}
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
                  <MapPin className="h-3.5 w-3.5" />
                  {job?.location || "Remote"}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-slate-200">
                  {job?.employmentType}
                </span>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs capitalize text-emerald-300">
                  {existingApplication ? existingApplication.status : job?.status}
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <h3 className="text-lg font-semibold text-white">About this role</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {job?.description || "No description provided for this role."}
                </p>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white">Required skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job?.skillsRequired?.length ? (
                    job.skillsRequired.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">
                      General role
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">Company Info</h2>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Company</p>
                    <p className="mt-2 text-lg font-semibold text-white">
                      {job?.createdBy?.name || "Company"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Contact</p>
                    <p className="mt-2 text-sm text-white">{job?.createdBy?.email || "Not shared"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                    <p className="text-sm text-slate-400">Your Role</p>
                    <p className="mt-2 text-lg font-semibold capitalize text-white">
                      {user?.role || "learner"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                {existingApplication ? (
                  <>
                    <h2 className="text-2xl font-bold text-white">Application Submitted</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Your application is already recorded for this role.
                    </p>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                        <p className="text-sm text-slate-400">Status</p>
                        <p className="mt-2 text-lg font-semibold capitalize text-white">
                          {existingApplication.status}
                        </p>
                      </div>
                      {existingApplication.coverLetter ? (
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                          <p className="text-sm text-slate-400">Cover Letter</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">
                            {existingApplication.coverLetter}
                          </p>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        {existingApplication.resumeLink ? (
                          <a
                            href={existingApplication.resumeLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                          >
                            Resume Link
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                        {existingApplication.portfolioLink ? (
                          <a
                            href={existingApplication.portfolioLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                          >
                            Portfolio Link
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-white">Apply to this job</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Add a cover letter and optional links to help the company review your profile.
                    </p>

                    <form onSubmit={handleApply} className="mt-6 space-y-4">
                      <textarea
                        value={form.coverLetter}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, coverLetter: e.target.value }))
                        }
                        rows={5}
                        placeholder="Write a short note about your skills, projects, or why this role fits you."
                        className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      />
                      <input
                        type="url"
                        value={form.resumeLink}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, resumeLink: e.target.value }))
                        }
                        placeholder="Resume link (optional)"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      />
                      <input
                        type="url"
                        value={form.portfolioLink}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, portfolioLink: e.target.value }))
                        }
                        placeholder="Portfolio or project link (optional)"
                        className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                      />
                      <Button type="submit" disabled={submitting} className="w-full">
                        {submitting ? "Submitting..." : "Submit Application"}
                        {!submitting ? <Send className="h-4 w-4" /> : null}
                      </Button>
                    </form>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobDetailsPage;

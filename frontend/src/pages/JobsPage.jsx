import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, LoaderCircle, Send } from "lucide-react";

import { readApiResponse } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function JobsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchJobsData = useCallback(async () => {
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
      setError("This jobs page is available only for student and alumni accounts.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [jobsRes, applicationsRes] = await Promise.all([
        fetch("/api/jobs", { headers }),
        fetch("/api/jobs/applications/me", { headers }),
      ]);

      const [jobsData, applicationsData] = await Promise.all([
        readApiResponse(
          jobsRes,
          "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          applicationsRes,
          "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
      ]);

      if (jobsRes.status === 401 || applicationsRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!jobsRes.ok) {
        throw new Error(jobsData.message || "Failed to load jobs.");
      }

      if (!applicationsRes.ok) {
        throw new Error(applicationsData.message || "Failed to load applications.");
      }

      setJobs(jobsData.data?.jobs || []);
      setApplications(applicationsData.data?.applications || []);
    } catch (err) {
      setError(err.message || "Unable to load jobs right now.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchJobsData();
  }, [fetchJobsData]);

  const applicationMap = useMemo(
    () =>
      Object.fromEntries(
        applications
          .filter((application) => application.job?._id)
          .map((application) => [application.job._id, application])
      ),
    [applications]
  );

  const handleApply = async (jobId) => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    setApplyingJobId(jobId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/jobs/${jobId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          coverLetter: coverLetter.trim(),
        }),
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to apply for this job.");
      }

      setSuccess("Application submitted successfully.");
      setSelectedJobId("");
      setCoverLetter("");
      await fetchJobsData();
    } catch (err) {
      setError(err.message || "Unable to submit application.");
    } finally {
      setApplyingJobId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading jobs...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-300">Jobs</span>
            </div>
            <p className="text-sm font-medium text-cyan-300">Career Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">Open Jobs</h1>
            <p className="mt-2 text-sm text-slate-400">
              Browse company openings and submit applications directly from Learn2Hire.
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

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Available Jobs</p>
              <p className="mt-2 text-lg font-semibold text-white">{jobs.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">My Applications</p>
              <p className="mt-2 text-lg font-semibold text-white">{applications.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Account Role</p>
              <p className="mt-2 text-lg font-semibold capitalize text-white">
                {user?.role || "learner"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white">My Applications</h2>
              <p className="mt-2 text-sm text-slate-400">
                Track jobs you have already applied to and their latest status.
              </p>

              <div className="mt-6 space-y-4">
                {applications.length ? (
                  applications.map((application) => (
                    <div
                      key={application._id}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-white">
                            {application.job?.title || "Job"}
                          </h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {application.job?.createdBy?.name || "Company"} ·{" "}
                            {application.job?.location || "Remote"}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            Applied{" "}
                            {new Date(
                              application.appliedAt || application.createdAt
                            ).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
                          {application.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No applications yet. Start by applying to an open role.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white">Browse Opportunities</h2>
              <p className="mt-2 text-sm text-slate-400">
                Explore open company roles and submit your application when you are ready.
              </p>

              <div className="mt-6 space-y-4">
                {jobs.length ? (
                  jobs.map((job) => {
                    const existingApplication = applicationMap[job._id];
                    const applying = applyingJobId === job._id;
                    const isExpanded = selectedJobId === job._id;

                    return (
                      <div
                        key={job._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                                <BriefcaseBusiness className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-white">{job.title}</h3>
                                <p className="mt-1 text-sm text-slate-400">
                                  {job.createdBy?.name || "Company"} · {job.location || "Remote"}
                                </p>
                              </div>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-300">
                              {job.description || "No description provided for this job."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-slate-200">
                                {job.employmentType}
                              </span>
                              {job.skillsRequired?.map((skill) => (
                                <span
                                  key={`${job._id}-${skill}`}
                                  className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs text-cyan-300"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col items-start gap-3 sm:items-end">
                            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium capitalize text-emerald-300">
                              {existingApplication ? existingApplication.status : job.status}
                            </span>

                            {existingApplication ? (
                              <Button disabled className="min-w-36">
                                Already Applied
                              </Button>
                            ) : (
                              <Button
                                variant={isExpanded ? "outline" : "default"}
                                onClick={() =>
                                  setSelectedJobId((prev) => (prev === job._id ? "" : job._id))
                                }
                                className="min-w-36"
                              >
                                {isExpanded ? "Close" : "Apply Now"}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isExpanded && !existingApplication ? (
                          <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                            <label className="block text-sm font-medium text-white">
                              Cover Letter
                            </label>
                            <textarea
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                              rows={4}
                              placeholder="Write a short note about your skills, experience, or interest in this job."
                              className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                            />
                            <div className="mt-4 flex justify-end">
                              <Button onClick={() => handleApply(job._id)} disabled={applying}>
                                {applying ? "Submitting..." : "Submit Application"}
                                {!applying ? <Send className="h-4 w-4" /> : null}
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No open jobs available right now. Check back again soon.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default JobsPage;

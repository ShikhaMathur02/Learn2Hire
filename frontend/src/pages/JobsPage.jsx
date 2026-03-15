import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Heart,
  LoaderCircle,
  MapPin,
  Search,
} from "lucide-react";

import { readApiResponse } from "../lib/api";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function JobsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingJobId, setSavingJobId] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    location: "",
    employmentType: "",
    savedOnly: false,
  });
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

      const [jobsRes, applicationsRes, savedRes] = await Promise.all([
        fetch("/api/jobs", { headers }),
        fetch("/api/jobs/applications/me", { headers }),
        fetch("/api/jobs/saved/me", { headers }),
      ]);

      const [jobsData, applicationsData, savedData] = await Promise.all([
        readApiResponse(
          jobsRes,
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

      if ([jobsRes, applicationsRes, savedRes].some((response) => response.status === 401)) {
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

      if (!savedRes.ok) {
        throw new Error(savedData.message || "Failed to load saved jobs.");
      }

      setJobs(jobsData.data?.jobs || []);
      setApplications(applicationsData.data?.applications || []);
      setSavedJobs(savedData.data?.savedJobs || []);
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

  const savedJobMap = useMemo(
    () =>
      Object.fromEntries(
        savedJobs
          .filter((item) => item.job?._id)
          .map((item) => [item.job._id, item])
      ),
    [savedJobs]
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = filters.search
        ? `${job.title} ${job.description} ${job.createdBy?.name || ""}`
            .toLowerCase()
            .includes(filters.search.toLowerCase())
        : true;

      const matchesLocation = filters.location
        ? (job.location || "").toLowerCase().includes(filters.location.toLowerCase())
        : true;

      const matchesType = filters.employmentType
        ? job.employmentType === filters.employmentType
        : true;

      const matchesSaved = filters.savedOnly ? Boolean(savedJobMap[job._id]) : true;

      return matchesSearch && matchesLocation && matchesType && matchesSaved;
    });
  }, [filters, jobs, savedJobMap]);

  const handleSaveToggle = async (jobId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const isSaved = Boolean(savedJobMap[jobId]);
    setSavingJobId(jobId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/jobs/${jobId}/save`, {
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
      await fetchJobsData();
    } catch (err) {
      setError(err.message || "Unable to update saved jobs.");
    } finally {
      setSavingJobId("");
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
              Search roles, save opportunities, and open full job details before applying.
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

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Available Jobs</p>
              <p className="mt-2 text-lg font-semibold text-white">{jobs.length}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Saved Jobs</p>
              <p className="mt-2 text-lg font-semibold text-white">{savedJobs.length}</p>
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

        <Card className="mb-6 border border-white/10 bg-white/5 shadow-none">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <Search className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold text-white">Filters</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <input
                type="text"
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search title or company"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
              <input
                type="text"
                value={filters.location}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, location: e.target.value }))
                }
                placeholder="Filter by location"
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
              <select
                value={filters.employmentType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, employmentType: e.target.value }))
                }
                className="h-12 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              >
                <option value="">All types</option>
                <option value="full-time">Full-time</option>
                <option value="internship">Internship</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
              </select>
              <label className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={filters.savedOnly}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, savedOnly: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-white/20 bg-slate-950/70"
                />
                Show saved jobs only
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white">My Applications</h2>
              <p className="mt-2 text-sm text-slate-400">
                Review submitted applications, cover notes, and your shared links.
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

                      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                        {application.resumeLink ? (
                          <a
                            href={application.resumeLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white/10 px-3 py-1 text-slate-200 transition hover:bg-white/20"
                          >
                            Resume Link
                          </a>
                        ) : null}
                        {application.portfolioLink ? (
                          <a
                            href={application.portfolioLink}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full bg-white/10 px-3 py-1 text-slate-200 transition hover:bg-white/20"
                          >
                            Portfolio Link
                          </a>
                        ) : null}
                        <Link
                          to={`/jobs/${application.job?._id}`}
                          className="rounded-full bg-indigo-500/20 px-3 py-1 text-cyan-200 transition hover:bg-indigo-500/30"
                        >
                          View Job
                        </Link>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No applications yet. Open a job to submit your first application.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-white">Browse Opportunities</h2>
              <p className="mt-2 text-sm text-slate-400">
                Filter open roles, save interesting ones, and open the details page when you are
                ready to apply.
              </p>

              <div className="mt-6 space-y-4">
                {filteredJobs.length ? (
                  filteredJobs.map((job) => {
                    const existingApplication = applicationMap[job._id];
                    const isSaved = Boolean(savedJobMap[job._id]);

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
                                  {job.createdBy?.name || "Company"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-slate-200">
                                <MapPin className="h-3.5 w-3.5" />
                                {job.location || "Remote"}
                              </span>
                              <span className="rounded-full bg-white/10 px-3 py-1 capitalize text-slate-200">
                                {job.employmentType}
                              </span>
                            </div>

                            <p className="mt-4 text-sm leading-6 text-slate-300">
                              {job.description || "No description provided for this job."}
                            </p>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {job.skillsRequired?.length ? (
                                job.skillsRequired.map((skill) => (
                                  <span
                                    key={`${job._id}-${skill}`}
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

                          <div className="flex flex-col items-start gap-3 sm:items-end">
                            <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium capitalize text-emerald-300">
                              {existingApplication ? existingApplication.status : job.status}
                            </span>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                onClick={() => handleSaveToggle(job._id)}
                                disabled={savingJobId === job._id}
                              >
                                <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                                {savingJobId === job._id
                                  ? "Saving..."
                                  : isSaved
                                    ? "Saved"
                                    : "Save"}
                              </Button>
                              <Button asChild>
                                <Link to={`/jobs/${job._id}`}>
                                  {existingApplication ? "View Application" : "View Details"}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                    No jobs match your current filters. Try changing search or filter options.
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

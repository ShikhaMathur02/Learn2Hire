import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ExternalLink,
  FileText,
  Heart,
  HeartHandshake,
  LoaderCircle,
  MapPin,
  Send,
  Sparkles,
} from "lucide-react";

import { readApiResponse } from "../lib/api";
import { workspaceRootProps } from "../lib/workspaceTheme";
import { studentNavItems } from "../config/studentNavItems";
import { clearAuthSession } from "../lib/authSession";
import { DarkWorkspaceShell } from "../components/layout/DarkWorkspaceShell";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function readStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function JobDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(() => readStoredUser());
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [form, setForm] = useState({
    coverLetter: "",
    portfolioLink: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [interestSubmitting, setInterestSubmitting] = useState(false);
  const [hasExpressedInterest, setHasExpressedInterest] = useState(false);
  const [interestNote, setInterestNote] = useState("");
  const [applyResumeFile, setApplyResumeFile] = useState(null);
  /** Apply form only — shown next to Submit so validation/API feedback is visible while scrolled to the footer. */
  const [applyBanner, setApplyBanner] = useState(null);
  const applyCardRef = useRef(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useLayoutEffect(() => {
    if (!applyBanner?.text || !applyCardRef.current) return;
    applyCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [applyBanner]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

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
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
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

    if (parsedUser.role !== "student") {
      setError("This page is available only for student accounts.");
      setLoading(false);
      return;
    }

    try {
      setError("");

      const headers = {      };

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
      setHasExpressedInterest(Boolean(jobData.data?.studentHasExpressedInterest));
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
    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/jobs/${id}/save`, {
        method: isSaved ? "DELETE" : "POST",
        headers: {},
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

  const handleDownloadJd = async () => {
    if (!id) return;
    if (!localStorage.getItem("user")) return;
    try {
      const res = await fetch(`/api/jobs/${id}/jd`, {
        headers: {},
      });
      if (!res.ok) {
        const data = await readApiResponse(res);
        throw new Error(data.message || "Could not download JD.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = job?.jdOriginalName || "job-description.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download JD.");
    }
  };

  const handleExpressInterest = async () => {
    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }

    setInterestSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/jobs/student/express-interest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",        },
        body: JSON.stringify({ jobId: id, message: interestNote.trim() }),
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Could not notify the company.");
      }

      setHasExpressedInterest(true);
      setSuccess("The company has been notified that you're interested in this role.");
      window.dispatchEvent(new CustomEvent("learn2hire-notifications-changed"));
    } catch (err) {
      setError(err.message || "Unable to send interest.");
    } finally {
      setInterestSubmitting(false);
    }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }

    if (!applyResumeFile) {
      setError("");
      setSuccess("");
      setApplyBanner({
        variant: "error",
        text: "Please attach your résumé (PDF or Word) before submitting.",
      });
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");
    setApplyBanner(null);

    try {
      const fd = new FormData();
      fd.append("coverLetter", form.coverLetter.trim());
      fd.append("portfolioLink", form.portfolioLink.trim());
      fd.append("resume", applyResumeFile);

      const response = await fetch(`/api/jobs/${id}/apply`, {
        method: "POST",
        headers: {},
        body: fd,
      });

      const data = await readApiResponse(
        response,
        "Jobs API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to submit application.");
      }

      setApplyBanner({
        variant: "success",
        text: "Application submitted successfully.",
      });
      setApplyResumeFile(null);
      window.dispatchEvent(new CustomEvent("learn2hire-notifications-changed"));
      await fetchData();
      setApplyBanner(null);
    } catch (err) {
      setApplyBanner({
        variant: "error",
        text: err.message || "Unable to submit application.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const shellUser = user || {
    name: "Learner",
    email: "",
    role: "student",
  };

  if (loading) {
    return (
      <DarkWorkspaceShell
        title="Job details"
        description="Loading role information…"
        workspaceLabel="Student Workspace"
        brandSubtitle="Student Workspace"
        showHistoryBack={false}
        navItems={studentNavItems}
        onNavSectionSelect={(sid) =>
          navigate("/dashboard", { state: { studentSection: sid } })
        }
        user={{
          name: shellUser.name || "Learner",
          email: shellUser.email || "",
          role: shellUser.role || "student",
        }}
        onLogout={handleLogout}
        actionItems={[
          {
            label: "Back to jobs",
            onClick: () => navigate("/jobs"),
            icon: ArrowLeft,
          },
        ]}
      >
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            Loading job details...
          </div>
        </div>
      </DarkWorkspaceShell>
    );
  }

  if (user && user.role !== "student" && error) {
    return (
      <div {...workspaceRootProps(user.role, "flex min-h-screen items-center justify-center px-4 text-center")}>
        <p className="max-w-md text-sm text-[var(--text)]">{error}</p>
      </div>
    );
  }

  return (
    <DarkWorkspaceShell
      title={job?.title || "Job details"}
      description="Review the full opportunity details and submit your application with a résumé, optional links, and a short note."
      workspaceLabel="Student Workspace"
      brandSubtitle="Student Workspace"
      showHistoryBack={false}
      navItems={studentNavItems}
      onNavSectionSelect={(sid) =>
        navigate("/dashboard", { state: { studentSection: sid } })
      }
      user={{
        name: user?.name || "Learner",
        email: user?.email || "",
        role: user?.role || "student",
      }}
      onLogout={handleLogout}
      actionItems={[
        {
          label: "Back to jobs",
          onClick: () => navigate("/jobs"),
          icon: ArrowLeft,
        },
      ]}
    >
        {error ? (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950"
          >
            {error}
          </div>
        ) : null}

        {success ? (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950"
          >
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                    <BriefcaseBusiness className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text)]">{job?.title}</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      {job?.createdBy?.name || "Company"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {job?.postingAudience === "single_college" && job?.targetCollege?.name
                        ? `Listed for students at ${job.targetCollege.name} only.`
                        : "Open to students at all partner colleges on Learn2Hire."}
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
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-[var(--text)]">
                  <MapPin className="h-3.5 w-3.5" />
                  {job?.location || "Remote"}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-[var(--text)]">
                  {job?.employmentType}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize text-emerald-900">
                  {existingApplication ? existingApplication.status : job?.status}
                </span>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-lg font-semibold text-[var(--text)]">About this role</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
                  {job?.description || "No description provided for this role."}
                </p>
              </div>

              {job?.hasJdDocument ? (
                <div className="mt-6 rounded-2xl border border-sky-200/90 bg-white p-5 ring-1 ring-sky-500/15">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" />
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text)]">Official job description</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          PDF provided by the employer: {job.jdOriginalName || "job-description.pdf"}
                        </p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={handleDownloadJd}>
                      <ExternalLink className="h-4 w-4" />
                      Download JD (PDF)
                    </Button>
                  </div>
                </div>
              ) : null}

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-[var(--text)]">Required skills</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job?.skillsRequired?.length ? (
                    job.skillsRequired.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-950"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-[var(--text-muted)]">
                      General role
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[var(--text)]">Company Info</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Employers on Learn2Hire reach students at every partner college.
                </p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-400">Company</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                      {job?.createdBy?.name || "Company"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm text-slate-400">Contact</p>
                    <p className="mt-2 text-sm font-medium text-[var(--text)]">{job?.createdBy?.email || "Not shared"}</p>
                  </div>
                  {job?.createdBy?.companyBio?.trim() ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-400">Bio</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                        {job.createdBy.companyBio}
                      </p>
                    </div>
                  ) : null}
                  {job?.createdBy?.companyDetails?.trim() ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-400">About the company</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                        {job.createdBy.companyDetails}
                      </p>
                    </div>
                  ) : null}
                  {job?.createdBy?.companyGoals?.trim() ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-400">Goals</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                        {job.createdBy.companyGoals}
                      </p>
                    </div>
                  ) : null}
                  {job?.createdBy?.companyFocusAreas?.trim() ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-400">Focus areas</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--text-muted)]">
                        {job.createdBy.companyFocusAreas}
                      </p>
                    </div>
                  ) : null}
                  {!job?.createdBy?.companyBio?.trim() &&
                  !job?.createdBy?.companyDetails?.trim() &&
                  !job?.createdBy?.companyGoals?.trim() &&
                  !job?.createdBy?.companyFocusAreas?.trim() ? (
                    <p className="text-sm text-slate-500">
                      This employer has not added a profile narrative yet.
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div
              ref={applyCardRef}
              tabIndex={-1}
              className="scroll-mt-28 outline-none lg:scroll-mt-32"
            >
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                {existingApplication ? (
                  <>
                    <h2 className="text-2xl font-bold text-[var(--text)]">Application Submitted</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Your application is already recorded for this role.
                    </p>

                    <div className="mt-6 space-y-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm text-slate-400">Status</p>
                        <p className="mt-2 text-lg font-semibold capitalize text-[var(--text)]">
                          {existingApplication.status}
                        </p>
                      </div>
                      {existingApplication.coverLetter ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm text-slate-400">Cover Letter</p>
                          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                            {existingApplication.coverLetter}
                          </p>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        {existingApplication.hasResumeFile ? (
                          <span className="text-xs text-slate-400">
                            Résumé file submitted:{" "}
                            {existingApplication.resumeOriginalName || "attachment"}
                          </span>
                        ) : null}
                        {existingApplication.portfolioLink ? (
                          <a
                            href={existingApplication.portfolioLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[var(--primary)] shadow-sm transition hover:bg-slate-50"
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
                    <h2 className="text-2xl font-bold text-[var(--text)]">Apply to this job</h2>
                    <p className="mt-2 text-sm text-slate-400">
                      Attach your résumé (PDF or Word, max 5 MB), add an optional cover letter and
                      links, then submit. Your file is stored securely and shared only with this
                      employer for this application.
                    </p>

                    {hasExpressedInterest ? (
                      <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                        <p className="font-semibold text-sky-950">Interest sent</p>
                        <p className="mt-1 text-sky-900">
                          The employer was notified that you are interested. You can still submit a
                          full application below.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-[var(--text)]">Show interest (optional)</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Sends the company a notification without submitting a full application
                          yet. To share your résumé, complete the application form below.
                        </p>
                        <textarea
                          value={interestNote}
                          onChange={(e) => setInterestNote(e.target.value)}
                          rows={2}
                          maxLength={500}
                          placeholder="Optional short note to the recruiter (max 500 characters)"
                          className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-3 w-full border-slate-200 text-[var(--primary)] hover:bg-blue-50"
                          disabled={interestSubmitting}
                          onClick={handleExpressInterest}
                        >
                          {interestSubmitting ? (
                            "Sending..."
                          ) : (
                            <>
                              <HeartHandshake className="h-4 w-4" />
                              Notify company of interest
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    <form onSubmit={handleApply} className="mt-6 space-y-4">
                      <textarea
                        value={form.coverLetter}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, coverLetter: e.target.value }))
                        }
                        rows={5}
                        placeholder="Write a short note about your skills, projects, or why this role fits you."
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <label className="text-sm font-semibold text-[var(--text)]" htmlFor="apply-resume">
                          Résumé <span className="text-rose-600">*</span>
                        </label>
                        <p className="mt-1 text-xs text-slate-400">
                          PDF, .doc, or .docx — required for this application.
                        </p>
                        <input
                          id="apply-resume"
                          type="file"
                          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                          className="mt-3 block w-full text-sm text-[var(--text)] file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            setApplyResumeFile(f);
                            if (f) setApplyBanner(null);
                          }}
                        />
                        {applyResumeFile ? (
                          <p className="mt-2 text-xs font-semibold text-emerald-800">
                            Selected: {applyResumeFile.name}
                          </p>
                        ) : null}
                      </div>
                      <input
                        type="url"
                        value={form.portfolioLink}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, portfolioLink: e.target.value }))
                        }
                        placeholder="Portfolio or project link (optional)"
                        className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      />
                      {applyBanner ? (
                        <div
                          role={applyBanner.variant === "error" ? "alert" : "status"}
                          aria-live={applyBanner.variant === "error" ? "assertive" : "polite"}
                          className={
                            applyBanner.variant === "error"
                              ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950 shadow-sm ring-1 ring-rose-500/15"
                              : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 shadow-sm ring-1 ring-emerald-500/15"
                          }
                        >
                          {applyBanner.text}
                        </div>
                      ) : null}
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
    </DarkWorkspaceShell>
  );
}

export default JobDetailsPage;


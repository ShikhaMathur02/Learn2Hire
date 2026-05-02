import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  LoaderCircle,
  Pencil,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { facultyNavItems } from "../../config/facultyNavItems";
import { readApiResponse } from "../../lib/api";
import {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "../../lib/studentCohortFieldOptions";
import { COHORT_OTHER } from "../../lib/cohortPresets";
import {
  PROFILE_PHOTO_MAX_BYTES,
  persistUserProfilePhotoInLocalStorage,
} from "../../lib/avatarUtils";
import { DarkWorkspaceShell } from "../layout/DarkWorkspaceShell";
import { DashboardMetricCard } from "../dashboard/DashboardMetricCard";
import { ProfileAvatarBlock } from "../profile/ProfileAvatarBlock";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { VisibleFileInput } from "../ui/visible-file-input";
import { StudentRosterSheetFormatHelp } from "../bulk-import/StudentRosterSheetFormatHelp";
import {
  STUDENT_ROSTER_DEFAULT_PASSWORD,
  STUDENT_ROSTER_IMPORT_MATCH_RULES,
  STUDENT_ROSTER_IMPORT_SUMMARY,
} from "../../lib/studentRosterImportFormat";
import { BULK_SPREADSHEET_ACCEPT } from "../../lib/bulkSpreadsheetAccept";

function SectionTitle({ title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <Card className="border border-slate-200 bg-white shadow-none">
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
          <Sparkles className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function FacultyDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [me, setMe] = useState(user);
  const [assessments, setAssessments] = useState([]);
  const [submissionsByAssessment, setSubmissionsByAssessment] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [photoCacheBust, setPhotoCacheBust] = useState(0);
  const [importCourse, setImportCourse] = useState("");
  const [importProgram, setImportProgram] = useState("");
  const [importYear, setImportYear] = useState("");
  const [importSemester, setImportSemester] = useState("");
  const [studentSheetFile, setStudentSheetFile] = useState(null);
  const [bulkImportBusy, setBulkImportBusy] = useState(false);
  const [bulkImportMessage, setBulkImportMessage] = useState("");
  const [bulkImportError, setBulkImportError] = useState("");
  const [pendingStudents, setPendingStudents] = useState([]);
  const [studentCampusBusyId, setStudentCampusBusyId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualCourse, setManualCourse] = useState("");
  const [manualBranch, setManualBranch] = useState("");
  const [manualBranchCustom, setManualBranchCustom] = useState("");
  const [manualYear, setManualYear] = useState("");
  const [manualSemester, setManualSemester] = useState("");
  const [manualDepartment, setManualDepartment] = useState("");
  const [manualAddBusy, setManualAddBusy] = useState(false);
  const [singleAddMessage, setSingleAddMessage] = useState("");
  const [singleAddError, setSingleAddError] = useState("");

  useEffect(() => {
    const sid = location.state?.facultySection;
    if (
      typeof sid === "string" &&
      facultyNavItems.some((i) => i.id === sid && !i.path)
    ) {
      setActiveSection(sid);
    }
  }, [location.state]);

  useEffect(() => {
    if (!user?.email) return;

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {};

        const meRes = await fetch("/api/auth/me", { headers });
        const meData = await meRes.json();

        if (meRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return;
        }

        if (!meRes.ok) {
          throw new Error(meData.message || "Failed to load faculty profile.");
        }

        const currentUser = meData.data?.user || user;
        setMe(currentUser);
        setPhotoCacheBust(0);

        const assessmentsRes = await fetch("/api/assessments", { headers });
        const assessmentsData = await assessmentsRes.json();

        if (!assessmentsRes.ok) {
          throw new Error(assessmentsData.message || "Failed to load assessments.");
        }

        const ownAssessments = (assessmentsData.data?.assessments || []).filter(
          (assessment) =>
            assessment.createdBy?._id === currentUser.id ||
            assessment.createdBy?._id === currentUser._id
        );

        setAssessments(ownAssessments);

        let pendingStudentRows = [];
        const facSt = currentUser.facultyApprovalStatus;
        const facApproved =
          currentUser.role === "faculty" &&
          (facSt === "approved" || facSt === undefined || facSt === null);
        if (facApproved) {
          const psRes = await fetch("/api/college/students/pending", { headers });
          const psData = await readApiResponse(psRes);
          if (psRes.ok) pendingStudentRows = psData.data?.users || [];
        }
        setPendingStudents(pendingStudentRows);

        const submissionEntries = await Promise.all(
          ownAssessments.map(async (assessment) => {
            const response = await fetch(
              `/api/submissions/assessment/${assessment._id}`,
              { headers }
            );
            const data = await response.json();

            if (!response.ok) {
              return [assessment._id, []];
            }

            return [assessment._id, data.data?.submissions || []];
          })
        );

        setSubmissionsByAssessment(Object.fromEntries(submissionEntries));
      } catch (err) {
        setError(err.message || "Unable to load faculty dashboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAvatarUpload = async (file) => {
    if (!user?.email || !file) return;
    setProfilePhotoError("");
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setProfilePhotoError(
        "Profile photo must be 5 MB or smaller. Choose a smaller image and try again."
      );
      return;
    }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not upload photo.");
      const path = data.data?.profilePhoto || "";
      setPhotoCacheBust(Date.now());
      setMe((m) => ({ ...m, profilePhoto: path }));
      persistUserProfilePhotoInLocalStorage(path);
    } catch (e) {
      setProfilePhotoError(e.message || "Photo upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarRemove = async () => {
    if (!user?.email) return;
    setProfilePhotoError("");
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/profile/photo", {
        method: "DELETE",
        headers: {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not remove photo.");
      setPhotoCacheBust(0);
      setMe((m) => ({ ...m, profilePhoto: "" }));
      persistUserProfilePhotoInLocalStorage("");
    } catch (e) {
      setProfilePhotoError(e.message || "Remove photo failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const totalSubmissions = useMemo(
    () =>
      Object.values(submissionsByAssessment).reduce(
        (sum, submissions) => sum + submissions.length,
        0
      ),
    [submissionsByAssessment]
  );

  const averageScore = useMemo(() => {
    const allSubmissions = Object.values(submissionsByAssessment).flat();
    if (!allSubmissions.length) return 0;

    const percentageTotal = allSubmissions.reduce((sum, submission) => {
      if (!submission.maxScore) return sum;
      return sum + (submission.score / submission.maxScore) * 100;
    }, 0);

    return Math.round(percentageTotal / allSubmissions.length);
  }, [submissionsByAssessment]);

  const publishedAssessments = assessments.filter(
    (assessment) => assessment.status === "published"
  );
  const draftAssessments = assessments.filter(
    (assessment) => assessment.status === "draft"
  );
  const recentAssessments = assessments.slice(0, 4);

  const handleStudentCampusApproval = async (userId, decision) => {
    if (!user?.email) return;
    setBulkImportError("");
    setBulkImportMessage("");
    setStudentCampusBusyId(userId);
    try {
      const res = await fetch(`/api/college/students/${userId}/campus-approval`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(data.message || "Update failed.");
      setBulkImportMessage(data.message || "Updated.");
      const psRes = await fetch("/api/college/students/pending", { headers: {} });
      const psData = await readApiResponse(psRes);
      if (psRes.ok) setPendingStudents(psData.data?.users || []);
    } catch (err) {
      setBulkImportError(err.message || "Could not update student.");
    } finally {
      setStudentCampusBusyId("");
    }
  };

  const handleAddOneRosterStudent = async (e) => {
    e.preventDefault();
    if (!user?.email) return;
    const branchVal =
      manualBranch === COHORT_OTHER ? manualBranchCustom.trim() : manualBranch.trim();
    if (!manualName.trim() || !manualEmail.trim() || !manualPassword.trim()) {
      setSingleAddError("Enter the student’s name, email, and initial password.");
      return;
    }
    if (!manualCourse.trim() || !branchVal || !manualYear.trim()) {
      setSingleAddError("Select program (course), branch, and year for this student’s class.");
      return;
    }
    setSingleAddError("");
    setSingleAddMessage("");
    setBulkImportError("");
    setBulkImportMessage("");
    setManualAddBusy(true);
    try {
      const res = await fetch("/api/college/roster", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: manualName.trim(),
          email: manualEmail.trim(),
          password: manualPassword,
          role: "student",
          course: manualCourse.trim(),
          branch: branchVal,
          year: manualYear.trim(),
          semester: manualSemester.trim(),
          department: manualDepartment.trim(),
        }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(data.message || "Could not create student.");
      setSingleAddMessage(data.message || "Student account created with the class you selected.");
      setManualName("");
      setManualEmail("");
      setManualPassword("");
      setManualCourse("");
      setManualBranch("");
      setManualBranchCustom("");
      setManualYear("");
      setManualSemester("");
      setManualDepartment("");
    } catch (err) {
      setSingleAddError(err.message || "Could not create student.");
    } finally {
      setManualAddBusy(false);
    }
  };

  const handleFacultyStudentImport = async () => {
    if (!user?.email || !studentSheetFile) return;
    if (!importCourse.trim() || !importProgram.trim() || !importYear.trim()) {
      setBulkImportError(
        "Select course, program, and year. Each row in the file must match that class."
      );
      return;
    }
    setBulkImportError("");
    setBulkImportMessage("");
    setSingleAddError("");
    setSingleAddMessage("");
    setBulkImportBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", studentSheetFile);
      fd.append("targetCourse", importCourse.trim());
      fd.append("targetProgram", importProgram.trim());
      fd.append("targetYear", importYear.trim());
      fd.append("targetSemester", importSemester.trim());
      const res = await fetch("/api/college/roster/import/students", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) throw new Error(data.message || "Student import failed.");
      setBulkImportMessage(data.message || "Import completed.");
      setStudentSheetFile(null);
    } catch (err) {
      setBulkImportError(err.message || "Student import failed.");
    } finally {
      setBulkImportBusy(false);
    }
  };

  const assessmentProgress = assessments.map((assessment) => {
    const submissions = submissionsByAssessment[assessment._id] || [];
    return {
      ...assessment,
      submissionCount: submissions.length,
      average:
        submissions.length > 0
          ? Math.round(
              submissions.reduce((sum, item) => {
                if (!item.maxScore) return sum;
                return sum + (item.score / item.maxScore) * 100;
              }, 0) / submissions.length
            )
          : 0,
    };
  });

  const goToProgressSection = useCallback(() => {
    setActiveSection("progress");
    const tryScroll = (attemptsLeft) => {
      const el = document.getElementById("faculty-dash-progress");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        try {
          el.focus({ preventScroll: true });
        } catch {
          /* not focusable */
        }
        return;
      }
      if (attemptsLeft > 0) requestAnimationFrame(() => tryScroll(attemptsLeft - 1));
    };
    requestAnimationFrame(() => tryScroll(32));
  }, []);

  const renderDashboard = () => (
    <div className="space-y-5">
      <SectionTitle
        title="Faculty Dashboard"
        description="Monitor created assessments, submission activity, and class performance from one place."
        action={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="default">
              <Link to="/dashboard/learning/manage">
                <BookOpenCheck className="h-4 w-4" />
                Manage learning
              </Link>
            </Button>
            <Button onClick={() => navigate("/assessments/create")}>Create Assessment</Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Assessments Created"
          value={assessments.length}
          subtitle="Owned by this faculty account"
          icon={ClipboardList}
          to="/assessments"
        />
        <DashboardMetricCard
          title="Published"
          value={publishedAssessments.length}
          subtitle="Visible to students"
          icon={BookOpenCheck}
          scrollTargetId="faculty-dash-mix"
        />
        <DashboardMetricCard
          title="Total Submissions"
          value={totalSubmissions}
          subtitle="Across your assessments"
          icon={BarChart3}
          onActivate={goToProgressSection}
        />
        <DashboardMetricCard
          title="Average Score"
          value={`${averageScore}%`}
          subtitle="Average student performance"
          icon={Sparkles}
          onActivate={goToProgressSection}
        />
      </div>

      {pendingStudents.length > 0 ? (
        <Card className="border border-sky-400/25 bg-sky-500/5 shadow-none">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2 text-sky-900">
              <ShieldCheck className="h-5 w-5 shrink-0 text-sky-700" aria-hidden />
              <h3 className="text-lg font-semibold text-[var(--text)]">Students awaiting campus approval</h3>
            </div>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Learners who signed up under your college. Approve or reject so they can use Learn2Hire.
            </p>
            <div className="mt-4 space-y-3">
              {pendingStudents.map((u) => (
                <div
                  key={u._id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-[var(--text)]">{u.name}</p>
                    <p className="text-sm text-slate-400">{u.email}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="success"
                      disabled={studentCampusBusyId === u._id}
                      onClick={() => handleStudentCampusApproval(u._id, "approved")}
                    >
                      {studentCampusBusyId === u._id ? "…" : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={studentCampusBusyId === u._id}
                      onClick={() => handleStudentCampusApproval(u._id, "rejected")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border border-slate-200 bg-white shadow-none">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2 text-cyan-950">
            <UserPlus className="h-5 w-5 shrink-0 text-cyan-700" aria-hidden />
            <h3 className="text-lg font-semibold text-[var(--text)]">Add one student</h3>
          </div>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Creates an approved student account under your campus. Set their class (program, branch,
            year) so materials and cohort filters match.
          </p>
          {singleAddMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {singleAddMessage}
            </div>
          ) : null}
          {singleAddError ? (
            <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {singleAddError}
            </div>
          ) : null}
          <form className="mt-4 space-y-4" onSubmit={handleAddOneRosterStudent}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-course">
                  Program (course)
                </label>
                <select
                  id="fac-cr-course"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualCourse}
                  onChange={(e) => setManualCourse(e.target.value)}
                  required
                >
                  <option value="">Select program</option>
                  {STUDENT_COHORT_PROGRAM_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-branch">
                  Branch
                </label>
                <select
                  id="fac-cr-branch"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualBranch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setManualBranch(v);
                    if (v !== COHORT_OTHER) setManualBranchCustom("");
                  }}
                  required
                >
                  <option value="">Select branch</option>
                  {STUDENT_COHORT_BRANCH_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                  <option value={COHORT_OTHER}>Other…</option>
                </select>
                {manualBranch === COHORT_OTHER ? (
                  <input
                    id="fac-cr-branch-custom"
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                    value={manualBranchCustom}
                    onChange={(e) => setManualBranchCustom(e.target.value)}
                    placeholder="Type branch"
                    autoComplete="off"
                  />
                ) : null}
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-year">
                  Year
                </label>
                <select
                  id="fac-cr-year"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualYear}
                  onChange={(e) => setManualYear(e.target.value)}
                  required
                >
                  <option value="">Select</option>
                  {STUDENT_COHORT_YEAR_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-sem">
                  Semester (optional)
                </label>
                <select
                  id="fac-cr-sem"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualSemester}
                  onChange={(e) => setManualSemester(e.target.value)}
                >
                  <option value="">—</option>
                  {STUDENT_COHORT_SEMESTER_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-dept">
                  Department (optional)
                </label>
                <input
                  id="fac-cr-dept"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                  value={manualDepartment}
                  onChange={(e) => setManualDepartment(e.target.value)}
                  placeholder="e.g. School of Engineering"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-name">
                  Full name
                </label>
                <input
                  id="fac-cr-name"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-email">
                  Email
                </label>
                <input
                  id="fac-cr-email"
                  type="email"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-[var(--text-muted)]" htmlFor="fac-cr-pw">
                  Initial password
                </label>
                <input
                  id="fac-cr-pw"
                  type="password"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={manualPassword}
                  onChange={(e) => setManualPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={
                manualAddBusy ||
                !manualName.trim() ||
                !manualEmail.trim() ||
                !manualPassword.trim() ||
                !manualCourse.trim() ||
                !(manualBranch === COHORT_OTHER ? manualBranchCustom.trim() : manualBranch.trim()) ||
                !manualYear.trim()
              }
            >
              {manualAddBusy ? "Creating…" : "Create student"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border border-slate-400/30 bg-slate-800/40 shadow-none">
        <CardContent className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-cyan-200">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 shrink-0" />
                  <h3 className="text-lg font-semibold text-[var(--text)]">Bulk student import</h3>
                </div>
                <StudentRosterSheetFormatHelp className="!border-cyan-400/40 !text-cyan-100 hover:!bg-cyan-400/10" />
              </div>
              <p className="mt-2 text-sm text-slate-300">
                {STUDENT_ROSTER_IMPORT_SUMMARY} {STUDENT_ROSTER_IMPORT_MATCH_RULES}{" "}
                <span className="text-slate-300">
                  Default password for new accounts:{" "}
                  <code className="rounded bg-black/25 px-1.5 py-0.5 font-mono font-semibold text-cyan-200">
                    {STUDENT_ROSTER_DEFAULT_PASSWORD}
                  </code>
                  .
                </span>
              </p>
            </div>
          </div>
          {bulkImportMessage ? (
            <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              {bulkImportMessage}
            </div>
          ) : null}
          {bulkImportError ? (
            <div className="mt-4 rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {bulkImportError}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-slate-300">Course</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                value={importCourse}
                onChange={(e) => setImportCourse(e.target.value)}
              >
                <option value="">Select</option>
                {STUDENT_COHORT_PROGRAM_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Program</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                value={importProgram}
                onChange={(e) => setImportProgram(e.target.value)}
              >
                <option value="">Select</option>
                {STUDENT_COHORT_BRANCH_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Year</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                value={importYear}
                onChange={(e) => setImportYear(e.target.value)}
              >
                <option value="">Select</option>
                {STUDENT_COHORT_YEAR_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Semester (optional)</label>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                value={importSemester}
                onChange={(e) => setImportSemester(e.target.value)}
              >
                <option value="">—</option>
                {STUDENT_COHORT_SEMESTER_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <VisibleFileInput
            className="mt-4"
            id="faculty-bulk-students"
            label="Spreadsheet file"
            accept={BULK_SPREADSHEET_ACCEPT}
            onChange={(e) => setStudentSheetFile(e.target.files?.[0] || null)}
            disabled={bulkImportBusy}
          />
          <Button
            type="button"
            className="mt-4"
            disabled={
              bulkImportBusy ||
              !studentSheetFile ||
              !importCourse.trim() ||
              !importProgram.trim() ||
              !importYear.trim()
            }
            onClick={handleFacultyStudentImport}
          >
            {bulkImportBusy ? "Importing…" : "Import students"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          id="faculty-dash-recent"
          tabIndex={-1}
          className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-6">
            <SectionTitle
              title="Recent Assessments"
              description="Quick view of your latest created tests."
            />
            <div className="mt-6 space-y-4">
              {recentAssessments.length ? (
                recentAssessments.map((assessment) => (
                  <div
                    key={assessment._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">{assessment.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {assessment.skill || "General"} · {assessment.questions?.length || 0} questions
                        </p>
                      </div>
                      <span className="rounded-full border border-slate-200 bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-[var(--primary)]">
                        {assessment.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No assessments created yet"
                  description="Use your existing faculty assessment API flow to create assessments, and they will appear here."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          id="faculty-dash-mix"
          tabIndex={-1}
          className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-6">
            <SectionTitle
              title="Assessment Mix"
              description="See how much of your work is draft versus published."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-400">Draft Assessments</p>
                <p className="mt-3 text-3xl font-bold text-[var(--text)]">{draftAssessments.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-400">Published Assessments</p>
                <p className="mt-3 text-3xl font-bold text-[var(--text)]">{publishedAssessments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProfile = () => (
    <Card className="overflow-hidden border border-slate-200 bg-white shadow-none">
      <CardContent className="p-0">
        {!profileEditMode ? (
          <>
            <div className="relative bg-gradient-to-br from-violet-600/35 via-slate-900 to-slate-950 px-6 py-8 sm:px-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                  <ProfileAvatarBlock
                    name={me.name}
                    profilePhoto={me.profilePhoto}
                    photoCacheBust={photoCacheBust}
                    frameClass="h-32 w-32 sm:h-36 sm:w-36"
                  />
                  <div className="text-center sm:text-left">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">
                      Faculty
                    </p>
                    <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{me.name}</h2>
                    <p className="mt-1 break-all text-sm text-slate-300">{me.email}</p>
                    <p className="mt-2 text-sm capitalize text-slate-400">Role: {me.role}</p>
                  </div>
                </div>
                <Button
                  type="button"
                  className="h-11 shrink-0 gap-2 self-start border border-white/25 bg-white/10 text-white shadow-sm hover:bg-white/20"
                  onClick={() => {
                    setError("");
                    setProfilePhotoError("");
                    setProfileEditMode(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit details
                </Button>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-sm text-slate-400">
                Tap <strong className="text-slate-200">Edit details</strong> to upload or change your profile
                photo. Without a photo we show your initials.
              </p>
            </div>
          </>
        ) : (
          <div className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <SectionTitle
                title="Edit faculty profile"
                description="Update your profile photo. Name and email are tied to your account."
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-slate-200 hover:bg-slate-50"
                onClick={() => {
                  setProfileEditMode(false);
                  setError("");
                  setProfilePhotoError("");
                }}
              >
                Done
              </Button>
            </div>
            {profilePhotoError ? (
              <div
                className="mt-4 rounded-xl border border-rose-400/35 bg-rose-500/15 px-4 py-3 text-sm text-rose-100"
                role="alert"
              >
                {profilePhotoError}
              </div>
            ) : null}
            <div className="mt-8 flex flex-col gap-6 border-t border-slate-200 pt-8 sm:flex-row sm:items-start">
              <ProfileAvatarBlock
                name={me.name}
                profilePhoto={me.profilePhoto}
                photoCacheBust={photoCacheBust}
                editable
                uploading={avatarUploading}
                onFileSelected={handleAvatarUpload}
                onRemovePhoto={handleAvatarRemove}
              />
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-400">Name</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">{me.name}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="mt-2 text-base font-semibold text-[var(--text)]">{me.email}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                  <p className="text-sm text-slate-400">Role</p>
                  <p className="mt-2 text-base font-semibold capitalize text-[var(--text)]">{me.role}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderAssessments = () => (
    <Card className="border border-slate-200 bg-white shadow-none">
      <CardContent className="p-6">
        <SectionTitle
          title="Assessment Library"
          description="All assessments created by this faculty account."
          action={
            <Button onClick={() => navigate("/assessments/create")}>
              Create Assessment
            </Button>
          }
        />
        <div className="mt-6 space-y-4">
          {assessments.length ? (
            assessments.map((assessment) => (
              <div
                key={assessment._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-400/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{assessment.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {assessment.description || "No description provided."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Skill: {assessment.skill || "General"} · Questions:{" "}
                      {assessment.questions?.length || 0} · Max Score: {assessment.maxScore || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-blue-50 px-3 py-1 text-xs font-medium capitalize text-[var(--primary)]">
                      {assessment.status}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                      {submissionsByAssessment[assessment._id]?.length || 0} submissions
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No faculty assessments yet"
              description="Create assessments through your existing API flow and they will appear here."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderProgress = () => (
    <Card
      id="faculty-dash-progress"
      tabIndex={-1}
      className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
    >
      <CardContent className="p-6">
        <SectionTitle
          title="Assessment Progress"
          description="Track submission counts and average scores for each created assessment."
        />
        <div className="mt-6 space-y-4">
          {assessmentProgress.length ? (
            assessmentProgress.map((assessment) => (
              <div
                key={assessment._id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-[var(--text)]">{assessment.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {assessment.submissionCount} submissions · Average score {assessment.average}%
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Average result</span>
                      <span>{assessment.average}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#22d3ee_100%)]"
                        style={{ width: `${assessment.average}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No progress data yet"
              description="Once students submit your assessments, the performance summary will appear here."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DarkWorkspaceShell
      title="Faculty Dashboard"
      workspaceLabel="Faculty Workspace"
      brandSubtitle="Faculty Workspace"
      navItems={facultyNavItems}
      activeSection={activeSection}
      onNavSectionSelect={setActiveSection}
      user={{ name: me.name, email: me.email, role: me.role }}
      onLogout={onLogout}
      actionItems={[
        { label: "Manage learning", to: "/dashboard/learning/manage", icon: BookOpenCheck },
      ]}
    >
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
          <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading your faculty dashboard...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-[28px] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
          <h2 className="text-lg font-semibold">Unable to load dashboard</h2>
          <p className="mt-2 text-sm text-rose-100/80">{error}</p>
        </div>
      ) : (
        <>
          {activeSection === "dashboard" && renderDashboard()}
          {activeSection === "profile" && renderProfile()}
          {activeSection === "assessments" && renderAssessments()}
          {activeSection === "progress" && renderProgress()}
        </>
      )}
    </DarkWorkspaceShell>
  );
}

export default FacultyDashboard;

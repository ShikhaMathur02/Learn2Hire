import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LoaderCircle,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import {
  digitsOnly,
  validateStudentProfileExtraFields,
} from "../../lib/studentProfileValidation";
import {
  PROFILE_PHOTO_MAX_BYTES,
  persistUserProfilePhotoInLocalStorage,
} from "../../lib/avatarUtils";
import {
  ALL_COHORT_DEGREE_PRESETS,
  COHORT_BRANCH_PRESETS,
  COHORT_OTHER,
  COHORT_SEMESTER_PRESETS,
  COHORT_YEAR_PRESETS,
  alignCohortSemesterToSignupOptions,
  alignCohortYearToSignupOptions,
  canonicalizeCohortPreset,
} from "../../lib/cohortPresets";
import { clearAuthSession } from "../../lib/authSession";
import { studentNavItems } from "../../config/studentNavItems";
import { DarkWorkspaceShell } from "../layout/DarkWorkspaceShell";
import { DashboardMetricCard } from "../dashboard/DashboardMetricCard";
import { ProfileAvatarBlock } from "../profile/ProfileAvatarBlock";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import dashboardProgressImg from "../../assets/illustrations/progress-banner.png";
import learningEmptyImg from "../../assets/illustrations/empty-state.png";

const COHORT_FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none";

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
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <img
          src={learningEmptyImg}
          alt=""
          className="mx-auto w-full max-w-[180px] opacity-80"
        />
        <div>
          <h3 className="text-lg font-semibold text-[var(--text)]">{title}</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function StudentDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [profile, setProfile] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [suggestedJobs, setSuggestedJobs] = useState([]);
  const [recommendedMaterials, setRecommendedMaterials] = useState([]);
  const [learningSummary, setLearningSummary] = useState({
    totalStarted: 0,
    totalCompleted: 0,
    inProgressCount: 0,
    totalTimeSpentMinutes: 0,
    averageProgress: 0,
  });
  const [learningProgress, setLearningProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cohortCourse, setCohortCourse] = useState("");
  const [cohortBranch, setCohortBranch] = useState("");
  const [cohortYear, setCohortYear] = useState("");
  const [cohortSemester, setCohortSemester] = useState("");
  const [cohortCustomCourse, setCohortCustomCourse] = useState(false);
  const [cohortCustomBranch, setCohortCustomBranch] = useState(false);
  const [cohortCustomYear, setCohortCustomYear] = useState(false);
  const [cohortCustomSemester, setCohortCustomSemester] = useState(false);
  const [cohortSaving, setCohortSaving] = useState(false);
  const [cohortMessage, setCohortMessage] = useState("");
  /** Shown at the top of the edit-profile card (e.g. photo too large). */
  const [profilePhotoError, setProfilePhotoError] = useState("");
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [showFullProfileReadonly, setShowFullProfileReadonly] = useState(false);
  /** Bumped after a successful photo upload so the browser reloads the image (cache bust). */
  const [photoCacheBust, setPhotoCacheBust] = useState(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  /** When non-null, overrides profile.user.profilePhoto until next full fetch. */
  const [photoOverride, setPhotoOverride] = useState(null);
  /** Ignore late / duplicate profile loads (e.g. React Strict Mode or overlapping fetches). */
  const profileLoadGenerationRef = useRef(0);
  const [extraProfile, setExtraProfile] = useState({
    bio: "",
    toolsAndTechnologies: "",
    visibleToCompanies: true,
    studentPhone: "",
    fatherName: "",
    motherName: "",
    fatherPhone: "",
    motherPhone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    dateOfBirth: "",
    bloodGroup: "",
  });

  const applyCohortFromProfileFields = useCallback((course, branch, year, semester) => {
    const c = canonicalizeCohortPreset(ALL_COHORT_DEGREE_PRESETS, course);
    const b = canonicalizeCohortPreset(COHORT_BRANCH_PRESETS, branch);
    const yAligned = alignCohortYearToSignupOptions(year);
    const y = canonicalizeCohortPreset(COHORT_YEAR_PRESETS, yAligned);
    const sAligned = alignCohortSemesterToSignupOptions(semester);
    const s = canonicalizeCohortPreset(COHORT_SEMESTER_PRESETS, sAligned);
    setCohortCourse(c);
    setCohortBranch(b);
    setCohortYear(y);
    setCohortSemester(s);
    setCohortCustomCourse(Boolean(c && !ALL_COHORT_DEGREE_PRESETS.includes(c)));
    setCohortCustomBranch(Boolean(b && !COHORT_BRANCH_PRESETS.includes(b)));
    setCohortCustomYear(Boolean(y && !COHORT_YEAR_PRESETS.includes(y)));
    setCohortCustomSemester(Boolean(s && !COHORT_SEMESTER_PRESETS.includes(s)));
  }, []);

  useEffect(() => {
    const sid = location.state?.studentSection;
    if (
      typeof sid === "string" &&
      studentNavItems.some((i) => i.id === sid && !i.path)
    ) {
      setActiveSection(sid);
    }
  }, [location.state]);

  useEffect(() => {
    if (!user?.email) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      const loadGen = ++profileLoadGenerationRef.current;
      setLoading(true);
      setError("");

      try {
        const headers = {};

        const [
          profileRes,
          assessmentsRes,
          submissionsRes,
          learningProgressRes,
          suggestedJobsRes,
          recommendedMaterialsRes,
        ] = await Promise.all([
          fetch("/api/profile", { headers }),
          fetch("/api/assessments", { headers }),
          fetch("/api/submissions", { headers }),
          fetch("/api/learning/progress/me", { headers }),
          fetch("/api/jobs/suggestions/me", { headers }),
          fetch("/api/learning/materials/recommended/me", { headers }),
        ]);

        if (
          [
            profileRes,
            assessmentsRes,
            submissionsRes,
            learningProgressRes,
            suggestedJobsRes,
            recommendedMaterialsRes,
          ].some((res) => res.status === 401)
        ) {
          clearAuthSession();
          navigate("/login");
          return;
        }

        if (loadGen !== profileLoadGenerationRef.current) return;

        const profileData = await readApiResponse(profileRes);
        const assessmentsData = await readApiResponse(assessmentsRes);
        const submissionsData = await readApiResponse(submissionsRes);
        const learningProgressData = await readApiResponse(learningProgressRes);
        const suggestedJobsData = await readApiResponse(suggestedJobsRes);
        const recommendedMaterialsData = await readApiResponse(recommendedMaterialsRes);

        if (!profileRes.ok) {
          throw new Error(profileData.message || "Failed to load profile.");
        }

        if (!assessmentsRes.ok) {
          throw new Error(assessmentsData.message || "Failed to load assessments.");
        }

        if (!submissionsRes.ok) {
          throw new Error(submissionsData.message || "Failed to load submissions.");
        }

        if (!learningProgressRes.ok) {
          throw new Error(learningProgressData.message || "Failed to load learning progress.");
        }

        if (!suggestedJobsRes.ok) {
          throw new Error(suggestedJobsData.message || "Failed to load job suggestions.");
        }

        if (!recommendedMaterialsRes.ok) {
          throw new Error(
            recommendedMaterialsData.message || "Failed to load recommended materials."
          );
        }

        if (loadGen !== profileLoadGenerationRef.current) return;

        const nextProfile = profileData.data?.profile ?? null;
        setProfile(nextProfile);
        setPhotoOverride(null);
        setPhotoCacheBust(0);
        if (nextProfile) {
          applyCohortFromProfileFields(
            nextProfile.course,
            nextProfile.branch,
            nextProfile.year,
            nextProfile.semester
          );
          setExtraProfile({
            bio: nextProfile.bio || "",
            toolsAndTechnologies: Array.isArray(nextProfile.toolsAndTechnologies)
              ? nextProfile.toolsAndTechnologies.join(", ")
              : "",
            visibleToCompanies: nextProfile.visibleToCompanies !== false,
            studentPhone: nextProfile.studentPhone || "",
            fatherName: nextProfile.fatherName || "",
            motherName: nextProfile.motherName || "",
            fatherPhone: nextProfile.fatherPhone || "",
            motherPhone: nextProfile.motherPhone || "",
            address: nextProfile.address || "",
            city: nextProfile.city || "",
            state: nextProfile.state || "",
            pincode: nextProfile.pincode || "",
            dateOfBirth: nextProfile.dateOfBirth || "",
            bloodGroup: nextProfile.bloodGroup || "",
          });
        } else {
          applyCohortFromProfileFields("", "", "", "");
          setExtraProfile({
            bio: "",
            toolsAndTechnologies: "",
            visibleToCompanies: true,
            studentPhone: "",
            fatherName: "",
            motherName: "",
            fatherPhone: "",
            motherPhone: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            dateOfBirth: "",
            bloodGroup: "",
          });
        }
        setAssessments(assessmentsData.data?.assessments ?? []);
        setSubmissions(submissionsData.data?.submissions ?? []);
        setSuggestedJobs(suggestedJobsData.data?.jobs ?? []);
        setRecommendedMaterials(recommendedMaterialsData.data?.materials ?? []);
        setLearningSummary(
          learningProgressData.data?.summary ?? {
            totalStarted: 0,
            totalCompleted: 0,
            inProgressCount: 0,
            totalTimeSpentMinutes: 0,
            averageProgress: 0,
          }
        );
        setLearningProgress(learningProgressData.data?.progress ?? []);
      } catch (err) {
        if (loadGen === profileLoadGenerationRef.current) {
          setError(err.message || "Unable to load dashboard data right now.");
        }
      } finally {
        if (loadGen === profileLoadGenerationRef.current) {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [navigate, applyCohortFromProfileFields, user?.email]);

  const displayUser = useMemo(() => {
    const base = profile?.user || user;
    const photo =
      photoOverride !== null
        ? photoOverride
        : (base && base.profilePhoto) || user?.profilePhoto || "";
    return { ...base, profilePhoto: photo || "" };
  }, [profile?.user, user, photoOverride]);

  const skills = profile?.skills || [];
  const stats = profile?.stats || {
    coursesEnrolled: 0,
    coursesCompleted: 0,
    assessmentsTaken: 0,
  };

  const overallScore = useMemo(() => {
    if (typeof profile?.overallScore === "number") return profile.overallScore;
    if (!skills.length) return 0;
    const total = skills.reduce((sum, skill) => sum + (skill.progress || 0), 0);
    return Math.round(total / skills.length);
  }, [profile?.overallScore, skills]);

  const recentResults = submissions.slice(0, 3);
  const availableAssessments = assessments.slice(0, 4);
  const recentLearningMaterials = learningProgress.slice(0, 3);
  const topSuggestedJobs = suggestedJobs.slice(0, 3);

  const handleAvatarUpload = async (file) => {
    if (!user?.email || !file) return;
    setProfilePhotoError("");
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setProfilePhotoError("Profile photo must be 5 MB or smaller. Choose a smaller image and try again.");
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
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Could not upload photo.");
      const path = data.data?.profilePhoto || "";
      setPhotoOverride(path);
      setPhotoCacheBust(Date.now());
      setProfile((p) => (p && p.user ? { ...p, user: { ...p.user, profilePhoto: path } } : p));
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
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Could not remove photo.");
      setPhotoOverride("");
      setPhotoCacheBust(0);
      setProfile((p) => (p && p.user ? { ...p, user: { ...p.user, profilePhoto: "" } } : p));
      persistUserProfilePhotoInLocalStorage("");
    } catch (e) {
      setProfilePhotoError(e.message || "Remove photo failed.");
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveCohort = async () => {
    if (!user?.email) return;
    setCohortSaving(true);
    setCohortMessage("");
    setProfilePhotoError("");
    try {
      const trim = (s) => (typeof s === "string" ? s.trim() : "");
      const contactValidation = validateStudentProfileExtraFields(extraProfile);
      if (!contactValidation.ok) {
        setCohortMessage(contactValidation.errors.join(" "));
        return;
      }
      const n = contactValidation.normalized;
      const cohortPayload = {
        course: trim(cohortCourse),
        branch: trim(cohortBranch),
        year: trim(cohortYear),
        semester: trim(cohortSemester),
      };
      const detailPayload = {
        bio: trim(extraProfile.bio),
        toolsAndTechnologies: trim(extraProfile.toolsAndTechnologies),
        visibleToCompanies: Boolean(extraProfile.visibleToCompanies),
        studentPhone: n.studentPhone ?? "",
        fatherName: n.fatherName ?? "",
        motherName: n.motherName ?? "",
        fatherPhone: n.fatherPhone ?? "",
        motherPhone: n.motherPhone ?? "",
        address: trim(extraProfile.address),
        city: trim(extraProfile.city),
        state: trim(extraProfile.state),
        pincode: n.pincode ?? "",
        dateOfBirth: n.dateOfBirth ?? "",
        bloodGroup: trim(extraProfile.bloodGroup),
      };
      const payload = { ...cohortPayload, ...detailPayload };
      const hasStoredProfile = profile && profile._id && !profile.isAutoGenerated;

      if (hasStoredProfile) {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
        },
          body: JSON.stringify(payload),
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || "Update failed");
        const updated = data.data?.profile ?? profile;
        setProfile(updated);
        if (updated) {
          applyCohortFromProfileFields(
            updated.course,
            updated.branch,
            updated.year,
            updated.semester
          );
          setExtraProfile({
            bio: updated.bio || "",
            toolsAndTechnologies: Array.isArray(updated.toolsAndTechnologies)
              ? updated.toolsAndTechnologies.join(", ")
              : "",
            visibleToCompanies: updated.visibleToCompanies !== false,
            studentPhone: updated.studentPhone || "",
            fatherName: updated.fatherName || "",
            motherName: updated.motherName || "",
            fatherPhone: updated.fatherPhone || "",
            motherPhone: updated.motherPhone || "",
            address: updated.address || "",
            city: updated.city || "",
            state: updated.state || "",
            pincode: updated.pincode || "",
            dateOfBirth: updated.dateOfBirth || "",
            bloodGroup: updated.bloodGroup || "",
          });
        }
      } else {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
        },
          body: JSON.stringify({
            skills: profile?.skills || [],
            ...payload,
          }),
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || "Could not save profile");
        const created = data.data?.profile ?? null;
        setProfile(created);
        if (created) {
          applyCohortFromProfileFields(
            created.course,
            created.branch,
            created.year,
            created.semester
          );
          setExtraProfile({
            bio: created.bio || "",
            toolsAndTechnologies: Array.isArray(created.toolsAndTechnologies)
              ? created.toolsAndTechnologies.join(", ")
              : "",
            visibleToCompanies: created.visibleToCompanies !== false,
            studentPhone: created.studentPhone || "",
            fatherName: created.fatherName || "",
            motherName: created.motherName || "",
            fatherPhone: created.fatherPhone || "",
            motherPhone: created.motherPhone || "",
            address: created.address || "",
            city: created.city || "",
            state: created.state || "",
            pincode: created.pincode || "",
            dateOfBirth: created.dateOfBirth || "",
            bloodGroup: created.bloodGroup || "",
          });
        }
      }
      setProfileEditMode(false);
      setCohortMessage("Profile saved. Course fields should match how faculty labels class materials.");
    } catch (err) {
      setCohortMessage(err.message || "Could not save.");
    } finally {
      setCohortSaving(false);
    }
  };

  const renderDashboard = () => (
    <div className="space-y-5">
      <SectionTitle
        title="Student Dashboard"
        description="Track your skill growth, upcoming assessments, and recent performance at a glance."
      />

      <div className="mt-2 flex flex-wrap gap-3">
        <Button size="sm" asChild>
          <Link to="/dashboard/learning#learning-explore-catalog">
            <BookOpen className="h-4 w-4" />
            Start Learning
          </Link>
        </Button>
        <Button size="sm" variant="default" asChild>
          <Link to="/dashboard/learning/progress">
            <BarChart3 className="h-4 w-4" />
            Learning Progress
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Skill Progress"
          value={skills.length ? `${skills.length} skills` : "No skills"}
          subtitle={skills.length ? "Tracked in your profile" : "Add skills to start tracking"}
          icon={BookOpen}
          scrollTargetId="student-dash-skills"
        />
        <DashboardMetricCard
          title="Available Assessments"
          value={assessments.length}
          subtitle="Published assessments ready to take"
          icon={ClipboardList}
          scrollTargetId="student-dash-assessments"
        />
        <DashboardMetricCard
          title="Learning Started"
          value={learningSummary.totalStarted}
          subtitle={`${learningSummary.totalCompleted} completed materials`}
          icon={BarChart3}
          scrollTargetId="student-dash-materials"
        />
        <DashboardMetricCard
          title="Overall Score"
          value={`${overallScore || 0}%`}
          subtitle="Based on your current skill progress"
          icon={Gauge}
          scrollTargetId="student-dash-readiness"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          id="student-dash-skills"
          tabIndex={-1}
          className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-6">
            <SectionTitle
              title="Skill Progress"
              description="Current skill confidence across your tracked areas."
            />
            <div className="mt-6 space-y-4">
              {skills.length ? (
                skills.map((skill) => (
                  <div key={skill._id || skill.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-[var(--text)]">{skill.name}</span>
                        <span className="ml-2 capitalize text-slate-500">{skill.level}</span>
                      </div>
                      <span className="text-[var(--primary)]">{skill.progress || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#22d3ee_100%)]"
                        style={{ width: `${skill.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No skill progress yet"
                  description="Create or update your profile so Learn2Hire can show progress here."
                  action={
                    <Button variant="default" onClick={() => setActiveSection("profile")}>
                      Go to Profile
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          id="student-dash-assessments"
          tabIndex={-1}
          className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-6">
            <SectionTitle
              title="Available Assessments"
              description="Published tests you can attempt right now."
              action={
                <Button asChild variant="default">
                  <Link to="/assessments">View all</Link>
                </Button>
              }
            />
            <div className="mt-6 space-y-4">
              {availableAssessments.length ? (
                availableAssessments.map((assessment) => (
                  <div
                    key={assessment._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-400/30"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">{assessment.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {assessment.skill || "General"} · {assessment.questions?.length || 0} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-[var(--primary)]">
                          {assessment.status}
                        </span>
                        <Button asChild variant="default">
                          <Link to={`/assessments/${assessment._id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No assessments available"
                  description="Published assessments from faculty will appear here when they are ready."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 bg-white shadow-none">
          <CardContent className="p-6">
            <SectionTitle
              title="Job Suggestions"
              description="Live opportunities matched from your profile and current open jobs."
            />
            <div className="mt-6 space-y-4">
              {topSuggestedJobs.length ? (
                topSuggestedJobs.map((job) => (
                  <div
                    key={job._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">{job.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {job.createdBy?.name || "Company"} · {job.location || "Remote"}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">{job.suggestionReason}</p>
                      </div>
                      <Button asChild variant="default">
                        <Link to={`/jobs/${job._id}`}>View</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-[var(--primary)]">
                      <BriefcaseBusiness className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[var(--text)]">No suggestions yet</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Add more skills in your profile and browse jobs to get more relevant live
                        suggestions here.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          id="student-dash-materials"
          tabIndex={-1}
          className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-6">
            <SectionTitle
              title="Study materials"
              description="Recommended topics from the learning library. Open any item to read and track progress."
              action={
                <Button asChild variant="default">
                  <Link to="/dashboard/learning#learning-explore-catalog">Learning hub</Link>
                </Button>
              }
            />
            <div className="mt-6 space-y-3">
              {recommendedMaterials.length ? (
                recommendedMaterials.slice(0, 5).map((m) => (
                  <Link
                    key={m._id}
                    to={`/dashboard/learning/topic/${m.slug}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-400/40"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--text)]">{m.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {m.category?.name || "General"} · {m.estimatedReadMinutes || "—"} min read
                        </p>
                        {m.recommendationReason ? (
                          <p className="mt-2 text-xs text-slate-500">{m.recommendationReason}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-medium text-[var(--primary)]">Open →</span>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No study materials loaded"
                  description="We could not load recommendations. Open the learning hub to browse all subjects."
                  action={
                    <Button asChild>
                      <Link to="/dashboard/learning#learning-explore-catalog">Browse learning hub</Link>
                    </Button>
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card
          id="student-dash-results"
          tabIndex={-1}
          className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-6">
            <SectionTitle
              title="Recent Assessment Results"
              description="Your latest submissions and scores."
            />
            <div className="mt-6 space-y-4">
              {recentResults.length ? (
                recentResults.map((submission) => (
                  <div
                    key={submission._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-[var(--text)]">
                          {submission.assessment?.title || "Assessment"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {submission.assessment?.skill || "General"} ·{" "}
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-[var(--primary)]">
                          {submission.score}/{submission.maxScore}
                        </p>
                        <p className="text-xs text-slate-500">Score</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No assessment results yet"
                  description="Once you submit an assessment, your latest results will appear here."
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card
          id="student-dash-readiness"
          tabIndex={-1}
          className="scroll-mt-28 overflow-hidden border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
        >
          <CardContent className="p-0">
            <div className="relative overflow-hidden">
              <img
                src={dashboardProgressImg}
                alt=""
                className="h-36 w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/90" />
              <p className="absolute bottom-3 left-5 text-sm font-semibold text-white">Overall Score</p>
            </div>
            <div className="p-6">
              <SectionTitle
                title="Readiness Snapshot"
                description="A quick snapshot of your current readiness."
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-400">Overall Score</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--text)]">{overallScore || 0}%</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-400">Courses Enrolled</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--text)]">{stats.coursesEnrolled || 0}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-400">Assessments Taken</p>
                  <p className="mt-2 text-3xl font-bold text-[var(--text)]">{stats.assessmentsTaken || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProfile = () => {
    const pv = (v) => (v != null && String(v).trim() !== "" ? String(v).trim() : null);
    const cohortLineCompact =
      [cohortCourse, cohortBranch, cohortYear, cohortSemester].filter(Boolean).join(" · ") || null;

    const profileSummaryCard = !profileEditMode ? (
      <Card className="overflow-hidden border border-slate-200 bg-white shadow-none">
        <CardContent className="p-0">
          <div className="relative bg-gradient-to-br from-indigo-600/35 via-slate-900 to-slate-950 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
                <ProfileAvatarBlock
                  name={displayUser.name}
                  profilePhoto={displayUser.profilePhoto}
                  photoCacheBust={photoCacheBust}
                  frameClass="h-28 w-28 sm:h-32 sm:w-32"
                />
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-200/90">
                    Student profile
                  </p>
                  <h2 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{displayUser.name}</h2>
                  <p className="mt-1 break-all text-sm text-slate-300">{displayUser.email}</p>
                  <p className="mt-3 text-sm text-slate-400">
                    <span className="text-slate-500">Course:</span> {cohortLineCompact || "Not set yet"}
                  </p>
                  {pv(extraProfile.bio) ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-200">
                      {extraProfile.bio}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No bio yet — add one when you edit.</p>
                  )}
                  {pv(extraProfile.toolsAndTechnologies) ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-400">Tools:</span>{" "}
                      {extraProfile.toolsAndTechnologies}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">
                    Talent pool:{" "}
                    <span className="text-slate-300">
                      {extraProfile.visibleToCompanies ? "Visible" : "Hidden"}
                    </span>
                  </p>
                </div>
              </div>
              <Button
                type="button"
                className="h-11 shrink-0 gap-2 self-start border border-white/25 bg-white/10 text-white shadow-sm hover:bg-white/20"
                onClick={() => {
                  setCohortMessage("");
                  setProfilePhotoError("");
                  setShowFullProfileReadonly(false);
                  setProfileEditMode(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                Edit details
              </Button>
            </div>
          </div>
          <div className="border-t border-slate-200 px-6 py-4 sm:px-8">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-slate-200 hover:bg-slate-50"
              onClick={() => setShowFullProfileReadonly((v) => !v)}
            >
              {showFullProfileReadonly ? "Hide full saved record" : "Show full saved record"}
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              Contact and address fields stay here until you expand or open edit.
            </p>
          </div>
          {showFullProfileReadonly ? (
          <div className="space-y-8 border-t border-slate-200 p-6 sm:p-8">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">About &amp; visibility</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Bio</p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--text)]">{pv(extraProfile.bio) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Tools &amp; technologies
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.toolsAndTechnologies) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Visible to companies (talent pool)
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">
                    {extraProfile.visibleToCompanies ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Program &amp; course</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Program</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(cohortCourse) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Branch</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(cohortBranch) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Year</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(cohortYear) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Semester</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(cohortSemester) || "—"}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Contact &amp; family</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Your mobile</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.studentPhone) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Father&apos;s name
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.fatherName) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Father&apos;s phone
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.fatherPhone) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Mother&apos;s name
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.motherName) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Mother&apos;s phone
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.motherPhone) || "—"}</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">Address &amp; other details</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Address</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.address) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">City</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.city) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">State</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.state) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">PIN code</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.pincode) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date of birth
                  </p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.dateOfBirth) || "—"}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Blood group</p>
                  <p className="mt-1 text-sm text-[var(--text)]">{pv(extraProfile.bloodGroup) || "—"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3">
              <p className="text-sm text-indigo-100/90">
                Profile photo: use <strong>Edit details</strong>, then upload your picture (or keep the
                default initials).
              </p>
            </div>
          </div>
          ) : null}
        </CardContent>
      </Card>
    ) : null;

    const profileEditBioCard = profileEditMode ? (
      <Card className="border border-slate-200 bg-white shadow-none">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              title="Edit profile"
              description="Update how you appear to faculty and recruiters. Save changes at the bottom of the form."
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 border-slate-200 hover:bg-slate-50"
              onClick={() => {
                setProfileEditMode(false);
                setCohortMessage("");
                setProfilePhotoError("");
              }}
            >
              Cancel
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
          <div className="mt-6 flex flex-col gap-6 border-b border-slate-200 pb-6 lg:flex-row lg:items-start">
            <ProfileAvatarBlock
              name={displayUser.name}
              profilePhoto={displayUser.profilePhoto}
              photoCacheBust={photoCacheBust}
              editable
              uploading={avatarUploading}
              onFileSelected={handleAvatarUpload}
              onRemovePhoto={handleAvatarRemove}
              frameClass="h-28 w-28 sm:h-32 sm:w-32"
            />
            <p className="max-w-md text-sm text-slate-400">
              Upload a clear photo (optional). If you remove it, we show initials from your name.
            </p>
          </div>

          {profile ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-400">Name</p>
                <p className="mt-2 text-base font-semibold text-[var(--text)]">{displayUser.name}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-400">Email</p>
                <p className="mt-2 text-base font-semibold text-[var(--text)]">{displayUser.email}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <label className="text-sm text-slate-400" htmlFor="st-bio">
                  Bio
                </label>
                <textarea
                  id="st-bio"
                  className="mt-2 min-h-[88px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25"
                  placeholder="Short introduction for recruiters and faculty"
                  value={extraProfile.bio}
                  onChange={(e) => setExtraProfile((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
                <label className="text-sm text-slate-400" htmlFor="st-tools">
                  Tools &amp; technologies
                </label>
                <input
                  id="st-tools"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/25"
                  placeholder="e.g. React, Git, Docker, AWS (comma-separated)"
                  value={extraProfile.toolsAndTechnologies}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, toolsAndTechnologies: e.target.value }))
                  }
                />
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border border-slate-200 bg-white text-[var(--primary)]"
                    checked={extraProfile.visibleToCompanies}
                    onChange={(e) =>
                      setExtraProfile((p) => ({
                        ...p,
                        visibleToCompanies: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    Let companies discover my profile in the talent pool (learning activity, skills,
                    and tools above).
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title="No profile record yet"
                description="Fill in the sections below and click Save profile to create your record."
              />
            </div>
          )}
        </CardContent>
      </Card>
    ) : null;

    return (
    <div className="space-y-5">
      {profileSummaryCard}
      {profileEditBioCard}

      {profileEditMode ? (
      <Card className="border border-slate-200 bg-white shadow-none">
        <CardContent className="p-6">
          <SectionTitle
            title="Program, course & contact details"
            description="Use the same program, branch, year, and semester lists as signup so your profile matches faculty course labels on materials."
          />
          <div className="mt-6 space-y-4">
            <p className="text-xs text-slate-500">
              Values are stored exactly as chosen and matched to course-targeted study materials (case-insensitive).
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="min-w-[160px] flex-1">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-program-select">
                  Program
                </label>
                <select
                  id="st-program-select"
                  className={COHORT_FIELD_CLASS}
                  value={
                    !cohortCourse
                      ? ""
                      : ALL_COHORT_DEGREE_PRESETS.includes(cohortCourse)
                        ? cohortCourse
                        : COHORT_OTHER
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setCohortCourse("");
                      setCohortCustomCourse(false);
                    } else if (v === COHORT_OTHER) {
                      setCohortCustomCourse(true);
                      setCohortCourse("");
                    } else {
                      setCohortCustomCourse(false);
                      setCohortCourse(v);
                    }
                  }}
                >
                  <option value="">Select program</option>
                  {ALL_COHORT_DEGREE_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value={COHORT_OTHER}>Other…</option>
                </select>
                {cohortCustomCourse ? (
                  <input
                    id="st-program-custom"
                    className={COHORT_FIELD_CLASS}
                    value={cohortCourse}
                    onChange={(e) => setCohortCourse(e.target.value)}
                    placeholder="e.g. B.Arch"
                    aria-label="Custom program"
                  />
                ) : null}
              </div>
              <div className="min-w-[160px] flex-1">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-branch-select">
                  Branch
                </label>
                <select
                  id="st-branch-select"
                  className={COHORT_FIELD_CLASS}
                  value={
                    !cohortBranch
                      ? ""
                      : COHORT_BRANCH_PRESETS.includes(cohortBranch)
                        ? cohortBranch
                        : COHORT_OTHER
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setCohortBranch("");
                      setCohortCustomBranch(false);
                    } else if (v === COHORT_OTHER) {
                      setCohortCustomBranch(true);
                      setCohortBranch("");
                    } else {
                      setCohortCustomBranch(false);
                      setCohortBranch(v);
                    }
                  }}
                >
                  <option value="">Select branch</option>
                  {COHORT_BRANCH_PRESETS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value={COHORT_OTHER}>Other…</option>
                </select>
                {cohortCustomBranch ? (
                  <input
                    id="st-branch-custom"
                    className={COHORT_FIELD_CLASS}
                    value={cohortBranch}
                    onChange={(e) => setCohortBranch(e.target.value)}
                    placeholder="e.g. Aerospace"
                    aria-label="Custom branch"
                  />
                ) : null}
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-year-select">
                  Year
                </label>
                <select
                  id="st-year-select"
                  className={COHORT_FIELD_CLASS}
                  value={
                    !cohortYear
                      ? ""
                      : COHORT_YEAR_PRESETS.includes(cohortYear)
                        ? cohortYear
                        : COHORT_OTHER
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setCohortYear("");
                      setCohortCustomYear(false);
                    } else if (v === COHORT_OTHER) {
                      setCohortCustomYear(true);
                      setCohortYear("");
                    } else {
                      setCohortCustomYear(false);
                      setCohortYear(v);
                    }
                  }}
                >
                  <option value="">Select year</option>
                  {COHORT_YEAR_PRESETS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                  <option value={COHORT_OTHER}>Other…</option>
                </select>
                {cohortCustomYear ? (
                  <input
                    id="st-year"
                    className={COHORT_FIELD_CLASS}
                    value={cohortYear}
                    onChange={(e) => setCohortYear(e.target.value)}
                    placeholder="e.g. 5th year"
                    aria-label="Custom year"
                  />
                ) : null}
              </div>
              <div className="min-w-[140px] flex-1">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-semester-select">
                  Semester
                </label>
                <select
                  id="st-semester-select"
                  className={COHORT_FIELD_CLASS}
                  value={
                    cohortSemester === ""
                      ? ""
                      : COHORT_SEMESTER_PRESETS.includes(cohortSemester)
                        ? cohortSemester
                        : COHORT_OTHER
                  }
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setCohortSemester("");
                      setCohortCustomSemester(false);
                    } else if (v === COHORT_OTHER) {
                      setCohortCustomSemester(true);
                      setCohortSemester("");
                    } else {
                      setCohortCustomSemester(false);
                      setCohortSemester(v);
                    }
                  }}
                >
                  <option value="">Select semester</option>
                  {COHORT_SEMESTER_PRESETS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value={COHORT_OTHER}>Other…</option>
                </select>
                {cohortCustomSemester ? (
                  <input
                    id="st-semester"
                    className={COHORT_FIELD_CLASS}
                    value={cohortSemester}
                    onChange={(e) => setCohortSemester(e.target.value)}
                    placeholder="e.g. Semester 11"
                    aria-label="Custom semester"
                  />
                ) : null}
                <p className="mt-1 text-[11px] text-slate-500">
                  Set your current semester so faculty can target materials to your term.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-[var(--text)]">Your phone &amp; parents</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-phone">
                  Your mobile
                </label>
                <input
                  id="st-phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.studentPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({
                      ...p,
                      studentPhone: digitsOnly(e.target.value).slice(0, 15),
                    }))
                  }
                  placeholder="10–15 digits only"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-father">
                  Father&apos;s name
                </label>
                <input
                  id="st-father"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.fatherName}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, fatherName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-father-phone">
                  Father&apos;s phone
                </label>
                <input
                  id="st-father-phone"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.fatherPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({
                      ...p,
                      fatherPhone: digitsOnly(e.target.value).slice(0, 15),
                    }))
                  }
                  placeholder="10–15 digits only"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-mother">
                  Mother&apos;s name
                </label>
                <input
                  id="st-mother"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.motherName}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, motherName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-mother-phone">
                  Mother&apos;s phone
                </label>
                <input
                  id="st-mother-phone"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.motherPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({
                      ...p,
                      motherPhone: digitsOnly(e.target.value).slice(0, 15),
                    }))
                  }
                  placeholder="10–15 digits only"
                />
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h3 className="text-sm font-semibold text-[var(--text)]">Address &amp; other details</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-address">
                  Address
                </label>
                <input
                  id="st-address"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.address}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-city">
                  City
                </label>
                <input
                  id="st-city"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.city}
                  onChange={(e) => setExtraProfile((p) => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-state">
                  State
                </label>
                <input
                  id="st-state"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.state}
                  onChange={(e) => setExtraProfile((p) => ({ ...p, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-pin">
                  PIN code
                </label>
                <input
                  id="st-pin"
                  inputMode="numeric"
                  maxLength={6}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.pincode}
                  onChange={(e) =>
                    setExtraProfile((p) => ({
                      ...p,
                      pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  placeholder="6 digits"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-dob">
                  Date of birth
                </label>
                <input
                  id="st-dob"
                  type="date"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.dateOfBirth}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-blood">
                  Blood group
                </label>
                <input
                  id="st-blood"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.bloodGroup}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, bloodGroup: e.target.value }))
                  }
                  placeholder="e.g. O+"
                />
              </div>
            </div>
          </div>

          {cohortMessage ? (
            <p className="mt-4 text-sm text-slate-300">{cohortMessage}</p>
          ) : null}
          <div className="mt-4">
            <Button type="button" onClick={saveCohort} disabled={cohortSaving}>
              {cohortSaving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </CardContent>
      </Card>
      ) : null}

      <Card className="border border-slate-200 bg-white shadow-none">
        <CardContent className="p-6">
          <SectionTitle
            title="Skills & subjects"
            description="Progress by subject updates as you complete study materials (synced to your profile)."
          />
          <div className="mt-6 space-y-4">
            {skills.length ? (
              skills.map((skill) => (
                <div key={skill._id || skill.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium text-[var(--text)]">{skill.name}</span>
                      <span className="ml-2 capitalize text-slate-500">{skill.level}</span>
                    </div>
                    <span className="text-[var(--primary)]">{skill.progress || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#22d3ee_100%)]"
                      style={{ width: `${skill.progress || 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                No subject progress yet. Open topics from{" "}
                <Link className="text-[var(--primary)] underline" to="/dashboard/learning#learning-explore-catalog">
                  Learning
                </Link>{" "}
                to build your skill bars.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 bg-white shadow-none">
        <CardContent className="p-6">
          <SectionTitle
            title="Study materials"
            description="Recommended readings from the catalog. Progress is saved when you are logged in."
            action={
              <Button asChild variant="default" size="sm">
                <Link to="/dashboard/learning#learning-explore-catalog">All subjects</Link>
              </Button>
            }
          />
          <div className="mt-6 space-y-3">
            {recommendedMaterials.length ? (
              recommendedMaterials.slice(0, 8).map((m) => (
                <Link
                  key={m._id}
                  to={`/dashboard/learning/topic/${m.slug}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-400/40"
                >
                  <p className="font-semibold text-[var(--text)]">{m.title}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {m.category?.name || "General"} · {m.level || "beginner"}
                  </p>
                  {m.summary ? (
                    <p className="mt-2 line-clamp-2 text-xs text-slate-500">{m.summary}</p>
                  ) : null}
                </Link>
              ))
            ) : (
              <EmptyState
                title="No materials to show"
                description="Recommendations will appear here once the learning API returns topics."
                action={
                  <Button asChild>
                    <Link to="/dashboard/learning#learning-explore-catalog">Open learning hub</Link>
                  </Button>
                }
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
    );
  };

  const renderAssessments = () => (
    <Card className="border border-slate-200 bg-white shadow-none">
      <CardContent className="p-6">
        <SectionTitle
          title="Assessments"
          description="Published assessments fetched from the backend."
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
                      {assessment.description || "No description"} 
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Skill: {assessment.skill || "General"} · Max Score: {assessment.maxScore || 0}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant="default">
                      <Link to={`/assessments/${assessment._id}`}>View details</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/assessments">All assessments</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title="No assessments found"
              description="When faculty publish assessments, they will appear here for students."
            />
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderProgress = () => (
    <Card className="border border-slate-200 bg-white shadow-none">
      <CardContent className="p-6">
        <SectionTitle
          title="Progress"
            description="Review your learning activity, recent submissions, and tracked progress."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">Skill breakdown</h3>
            <div className="mt-4 space-y-4">
              {skills.length ? (
                skills.map((skill) => (
                  <div key={skill._id || skill.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-[var(--text)]">{skill.name}</span>
                      <span className="text-[var(--primary)]">{skill.progress || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-[linear-gradient(90deg,#6366f1_0%,#22d3ee_100%)]"
                        style={{ width: `${skill.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No progress data available yet.</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">Recent submissions</h3>
            <div className="mt-4 space-y-3">
              {submissions.length ? (
                submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-medium text-[var(--text)]">
                      {submission.assessment?.title || "Assessment"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {submission.score}/{submission.maxScore} ·{" "}
                      {new Date(submission.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No submissions yet.</p>
              )}
            </div>
          </div>
        </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-[var(--text)]">Recent learning activity</h3>
            <div className="mt-4 space-y-3">
              {recentLearningMaterials.length ? (
                recentLearningMaterials.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-[var(--text)]">
                          {item.material?.title || "Study material"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.material?.category?.name || "General"} · Last opened{" "}
                          {new Date(item.lastViewedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-[var(--primary)]">
                          {item.progressPercent || 0}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.completed ? "Completed" : "In progress"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  Open materials from the learning hub and your progress will appear here.
                </p>
              )}
            </div>
          </div>
      </CardContent>
    </Card>
  );

  const renderLearning = () => (
    <Card className="border border-slate-200 bg-white shadow-none">
      <CardContent className="p-6">
        <SectionTitle
          title="Learning"
          description="See your recent learning activity and jump into study materials from your dashboard."
          action={
            <Button asChild variant="default">
              <Link to="/dashboard/learning/progress">Open full learning view</Link>
            </Button>
          }
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">Recent learning activity</h3>
            <div className="mt-4 space-y-3">
              {recentLearningMaterials.length ? (
                recentLearningMaterials.map((item) => (
                  <Link
                    key={item._id}
                    to={`/dashboard/learning/topic/${item.material?.slug}`}
                    className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-400/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-[var(--text)]">
                          {item.material?.title || "Study material"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.material?.category?.name || "General"} ·{" "}
                          {new Date(item.lastViewedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--primary)]">
                          {item.progressPercent || 0}%
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.completed ? "Completed" : "In progress"}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <EmptyState
                  title="No learning activity yet"
                  description="Open study materials from the learning hub and your progress will show here."
                  action={
                    <Button asChild>
                      <Link to="/dashboard/learning#learning-explore-catalog">Browse learning hub</Link>
                    </Button>
                  }
                />
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--text)]">Summary</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <DashboardMetricCard
                title="Started"
                value={learningSummary.totalStarted}
                subtitle="Materials you have opened"
                icon={BookOpen}
                to="/dashboard/learning/progress"
              />
              <DashboardMetricCard
                title="Completed"
                value={learningSummary.totalCompleted}
                subtitle="Marked as finished"
                icon={CheckCircle2}
                to="/dashboard/learning/progress"
              />
              <DashboardMetricCard
                title="In progress"
                value={learningSummary.inProgressCount}
                subtitle="Currently being studied"
                icon={Gauge}
                to="/dashboard/learning/progress"
              />
              <DashboardMetricCard
                title="Avg. completion"
                value={`${learningSummary.averageProgress || 0}%`}
                subtitle="Across saved materials"
                icon={Sparkles}
                to="/dashboard/learning/progress"
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-[var(--text)]">Recommended study materials</h3>
          <p className="mt-1 text-sm text-slate-400">
            Picks from the library based on your skills and recent content.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recommendedMaterials.length ? (
              recommendedMaterials.slice(0, 6).map((m) => (
                <Link
                  key={m._id}
                  to={`/dashboard/learning/topic/${m.slug}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-indigo-400/40"
                >
                  <p className="font-medium text-[var(--text)]">{m.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{m.category?.name || "General"}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-400 sm:col-span-2">
                No recommendations yet.{" "}
                <Link className="text-[var(--primary)] underline" to="/dashboard/learning#learning-explore-catalog">
                  Browse the catalog
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DarkWorkspaceShell
      title="Student Dashboard"
      workspaceLabel="Student Workspace"
      brandSubtitle="Student Workspace"
      navItems={studentNavItems}
      activeSection={activeSection}
      onNavSectionSelect={setActiveSection}
      user={{
        name: displayUser.name,
        email: displayUser.email,
        role: displayUser.role,
      }}
      onLogout={onLogout}
    >
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading your dashboard...
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
          {activeSection === "learning" && renderLearning()}
          {activeSection === "progress" && renderProgress()}
        </>
      )}
    </DarkWorkspaceShell>
  );
}

export default StudentDashboard;

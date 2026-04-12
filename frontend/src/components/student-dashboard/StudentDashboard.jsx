import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Gauge,
  LoaderCircle,
  Sparkles,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
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
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import dashboardProgressImg from "../../assets/illustrations/progress-banner.png";
import learningEmptyImg from "../../assets/illustrations/empty-state.png";

const COHORT_FIELD_CLASS =
  "mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none";

function SectionTitle({ title, description, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ title, description, action }) {
  return (
    <Card className="border border-white/10 bg-white/5 shadow-none">
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <img
          src={learningEmptyImg}
          alt=""
          className="mx-auto w-full max-w-[180px] opacity-80"
        />
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-2 text-sm text-slate-400">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card className="border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.25)] transition-transform hover:-translate-y-1">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <h3 className="mt-3 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
            <Icon className="h-6 w-6" />
          </div>
        </div>
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
    emergencyContactName: "",
    emergencyContactPhone: "",
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
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

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

        const nextProfile = profileData.data?.profile ?? null;
        setProfile(nextProfile);
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
            emergencyContactName: nextProfile.emergencyContactName || "",
            emergencyContactPhone: nextProfile.emergencyContactPhone || "",
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
            emergencyContactName: "",
            emergencyContactPhone: "",
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
        setError(err.message || "Unable to load dashboard data right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, applyCohortFromProfileFields]);

  const displayUser = profile?.user || user;
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

  const saveCohort = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setCohortSaving(true);
    setCohortMessage("");
    try {
      const trim = (s) => (typeof s === "string" ? s.trim() : "");
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
        studentPhone: trim(extraProfile.studentPhone),
        fatherName: trim(extraProfile.fatherName),
        motherName: trim(extraProfile.motherName),
        fatherPhone: trim(extraProfile.fatherPhone),
        motherPhone: trim(extraProfile.motherPhone),
        address: trim(extraProfile.address),
        city: trim(extraProfile.city),
        state: trim(extraProfile.state),
        pincode: trim(extraProfile.pincode),
        dateOfBirth: trim(extraProfile.dateOfBirth),
        bloodGroup: trim(extraProfile.bloodGroup),
        emergencyContactName: trim(extraProfile.emergencyContactName),
        emergencyContactPhone: trim(extraProfile.emergencyContactPhone),
      };
      const payload = { ...cohortPayload, ...detailPayload };
      const hasStoredProfile = profile && profile._id && !profile.isAutoGenerated;

      if (hasStoredProfile) {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
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
            emergencyContactName: updated.emergencyContactName || "",
            emergencyContactPhone: updated.emergencyContactPhone || "",
          });
        }
      } else {
        const res = await fetch("/api/profile", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
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
            emergencyContactName: created.emergencyContactName || "",
            emergencyContactPhone: created.emergencyContactPhone || "",
          });
        }
      }
      setCohortMessage("Profile saved. Cohort fields should match how faculty labels class materials.");
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
        <MetricCard
          title="Skill Progress"
          value={skills.length ? `${skills.length} skills` : "No skills"}
          subtitle={skills.length ? "Tracked in your profile" : "Add skills to start tracking"}
          icon={BookOpen}
        />
        <MetricCard
          title="Available Assessments"
          value={assessments.length}
          subtitle="Published assessments ready to take"
          icon={ClipboardList}
        />
        <MetricCard
          title="Learning Started"
          value={learningSummary.totalStarted}
          subtitle={`${learningSummary.totalCompleted} completed materials`}
          icon={BarChart3}
        />
        <MetricCard
          title="Overall Score"
          value={`${overallScore || 0}%`}
          subtitle="Based on your current skill progress"
          icon={Gauge}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 shadow-none">
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
                        <span className="font-medium text-white">{skill.name}</span>
                        <span className="ml-2 capitalize text-slate-500">{skill.level}</span>
                      </div>
                      <span className="text-cyan-300">{skill.progress || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
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

        <Card className="border border-white/10 bg-white/5 shadow-none">
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
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/30"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{assessment.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {assessment.skill || "General"} · {assessment.questions?.length || 0} questions
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
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

        <Card className="border border-white/10 bg-white/5 shadow-none">
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
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{job.title}</h3>
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
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                      <BriefcaseBusiness className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">No suggestions yet</h3>
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

        <Card className="border border-white/10 bg-white/5 shadow-none">
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
                    className="block rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/40"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{m.title}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {m.category?.name || "General"} · {m.estimatedReadMinutes || "—"} min read
                        </p>
                        {m.recommendationReason ? (
                          <p className="mt-2 text-xs text-slate-500">{m.recommendationReason}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-sm font-medium text-cyan-300">Open →</span>
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
        <Card className="border border-white/10 bg-white/5 shadow-none">
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
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">
                          {submission.assessment?.title || "Assessment"}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {submission.assessment?.skill || "General"} ·{" "}
                          {new Date(submission.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-cyan-300">
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

        <Card className="overflow-hidden border border-white/10 bg-white/5 shadow-none">
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
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Overall Score</p>
                  <p className="mt-2 text-3xl font-bold text-white">{overallScore || 0}%</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Courses Enrolled</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.coursesEnrolled || 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Assessments Taken</p>
                  <p className="mt-2 text-3xl font-bold text-white">{stats.assessmentsTaken || 0}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-5">
      <Card className="border border-white/10 bg-white/5 shadow-none">
        <CardContent className="p-6">
          <SectionTitle
            title="Profile"
            description="Your account details from the student profile API."
          />
          {profile ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">Name</p>
                <p className="mt-2 text-base font-semibold text-white">{displayUser.name}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">Email</p>
                <p className="mt-2 text-base font-semibold text-white">{displayUser.email}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:col-span-2">
                <label className="text-sm text-slate-400" htmlFor="st-bio">
                  Bio
                </label>
                <textarea
                  id="st-bio"
                  className="mt-2 min-h-[88px] w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm leading-6 text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder="Short introduction for recruiters and faculty"
                  value={extraProfile.bio}
                  onChange={(e) => setExtraProfile((p) => ({ ...p, bio: e.target.value }))}
                />
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:col-span-2">
                <label className="text-sm text-slate-400" htmlFor="st-tools">
                  Tools &amp; technologies
                </label>
                <input
                  id="st-tools"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  placeholder="e.g. React, Git, Docker, AWS (comma-separated)"
                  value={extraProfile.toolsAndTechnologies}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, toolsAndTechnologies: e.target.value }))
                  }
                />
                <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-white/20 bg-slate-950/50"
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
                description="Create a profile via POST /api/profile or continue learning — skills can still update from your study progress."
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-white/5 shadow-none">
        <CardContent className="p-6">
          <SectionTitle
            title="Program, cohort & contact details"
            description="Use the same program, branch, year, and semester lists as signup so your profile matches faculty cohort labels on materials."
          />
          <div className="mt-6 space-y-4">
            <p className="text-xs text-slate-500">
              Values are stored exactly as chosen and matched to cohort-targeted study materials (case-insensitive).
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

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-slate-200">Your phone &amp; parents</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-phone">
                  Your mobile
                </label>
                <input
                  id="st-phone"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.studentPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, studentPhone: e.target.value }))
                  }
                  placeholder="+91 …"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-father">
                  Father&apos;s name
                </label>
                <input
                  id="st-father"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.fatherPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, fatherPhone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-mother">
                  Mother&apos;s name
                </label>
                <input
                  id="st-mother"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.motherPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, motherPhone: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-slate-200">Address &amp; emergency</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-400" htmlFor="st-address">
                  Address
                </label>
                <input
                  id="st-address"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
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
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.pincode}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, pincode: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-dob">
                  Date of birth
                </label>
                <input
                  id="st-dob"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.dateOfBirth}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, dateOfBirth: e.target.value }))
                  }
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-blood">
                  Blood group
                </label>
                <input
                  id="st-blood"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.bloodGroup}
                  onChange={(e) =>
                    setExtraProfile((p) => ({ ...p, bloodGroup: e.target.value }))
                  }
                  placeholder="e.g. O+"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-em-name">
                  Emergency contact name
                </label>
                <input
                  id="st-em-name"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.emergencyContactName}
                  onChange={(e) =>
                    setExtraProfile((p) => ({
                      ...p,
                      emergencyContactName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400" htmlFor="st-em-phone">
                  Emergency contact phone
                </label>
                <input
                  id="st-em-phone"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none"
                  value={extraProfile.emergencyContactPhone}
                  onChange={(e) =>
                    setExtraProfile((p) => ({
                      ...p,
                      emergencyContactPhone: e.target.value,
                    }))
                  }
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

      <Card className="border border-white/10 bg-white/5 shadow-none">
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
                      <span className="font-medium text-white">{skill.name}</span>
                      <span className="ml-2 capitalize text-slate-500">{skill.level}</span>
                    </div>
                    <span className="text-cyan-300">{skill.progress || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
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
                <Link className="text-cyan-300 underline" to="/dashboard/learning#learning-explore-catalog">
                  Learning
                </Link>{" "}
                to build your skill bars.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-white/10 bg-white/5 shadow-none">
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
                  className="block rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/40"
                >
                  <p className="font-semibold text-white">{m.title}</p>
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

  const renderAssessments = () => (
    <Card className="border border-white/10 bg-white/5 shadow-none">
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
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{assessment.title}</h3>
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
    <Card className="border border-white/10 bg-white/5 shadow-none">
      <CardContent className="p-6">
        <SectionTitle
          title="Progress"
            description="Review your learning activity, recent submissions, and tracked progress."
        />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-white">Skill breakdown</h3>
            <div className="mt-4 space-y-4">
              {skills.length ? (
                skills.map((skill) => (
                  <div key={skill._id || skill.name}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-white">{skill.name}</span>
                      <span className="text-cyan-300">{skill.progress || 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
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
            <h3 className="text-lg font-semibold text-white">Recent submissions</h3>
            <div className="mt-4 space-y-3">
              {submissions.length ? (
                submissions.map((submission) => (
                  <div
                    key={submission._id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <p className="font-medium text-white">
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
            <h3 className="text-lg font-semibold text-white">Recent learning activity</h3>
            <div className="mt-4 space-y-3">
              {recentLearningMaterials.length ? (
                recentLearningMaterials.map((item) => (
                  <div
                    key={item._id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-white">
                          {item.material?.title || "Study material"}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {item.material?.category?.name || "General"} · Last opened{" "}
                          {new Date(item.lastViewedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-lg font-bold text-cyan-300">
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
    <Card className="border border-white/10 bg-white/5 shadow-none">
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
            <h3 className="text-lg font-semibold text-white">Recent learning activity</h3>
            <div className="mt-4 space-y-3">
              {recentLearningMaterials.length ? (
                recentLearningMaterials.map((item) => (
                  <Link
                    key={item._id}
                    to={`/dashboard/learning/topic/${item.material?.slug}`}
                    className="block rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/40"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-white">
                          {item.material?.title || "Study material"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {item.material?.category?.name || "General"} ·{" "}
                          {new Date(item.lastViewedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-cyan-300">
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
            <h3 className="text-lg font-semibold text-white">Summary</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetricCard
                title="Started"
                value={learningSummary.totalStarted}
                subtitle="Materials you have opened"
                icon={BookOpen}
              />
              <MetricCard
                title="Completed"
                value={learningSummary.totalCompleted}
                subtitle="Marked as finished"
                icon={CheckCircle2}
              />
              <MetricCard
                title="In progress"
                value={learningSummary.inProgressCount}
                subtitle="Currently being studied"
                icon={Gauge}
              />
              <MetricCard
                title="Avg. completion"
                value={`${learningSummary.averageProgress || 0}%`}
                subtitle="Across saved materials"
                icon={Sparkles}
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white">Recommended study materials</h3>
          <p className="mt-1 text-sm text-slate-400">
            Picks from the library based on your skills and recent content.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {recommendedMaterials.length ? (
              recommendedMaterials.slice(0, 6).map((m) => (
                <Link
                  key={m._id}
                  to={`/dashboard/learning/topic/${m.slug}`}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/40"
                >
                  <p className="font-medium text-white">{m.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{m.category?.name || "General"}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-slate-400 sm:col-span-2">
                No recommendations yet.{" "}
                <Link className="text-cyan-300 underline" to="/dashboard/learning#learning-explore-catalog">
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
      headerIcon={Sparkles}
    >
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
          <div className="flex items-center gap-3 text-slate-300">
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

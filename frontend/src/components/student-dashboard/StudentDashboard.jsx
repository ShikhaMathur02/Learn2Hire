import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  Gauge,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
  { id: "learning", label: "Learning", icon: BookOpen, path: "/learn" },
  { id: "jobs", label: "Jobs", icon: BriefcaseBusiness, path: "/jobs" },
  { id: "progress", label: "Progress", icon: BarChart3 },
];

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
      <CardContent className="flex flex-col items-start gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
          <Sparkles className="h-6 w-6" />
        </div>
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
          localStorage.removeItem("token");
          localStorage.removeItem("user");
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

        setProfile(profileData.data?.profile ?? null);
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
  }, [navigate]);

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
  const topRecommendedMaterials = recommendedMaterials.slice(0, 3);

  const renderDashboard = () => (
    <div className="space-y-6">
      <SectionTitle
        title="Student Dashboard"
        description="Track your skill growth, upcoming assessments, and recent performance at a glance."
      />

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
                    <Button variant="outline" onClick={() => setActiveSection("profile")}>
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
                <Button asChild variant="outline">
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
                        <Button asChild variant="outline">
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
                      <Button asChild variant="outline">
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
              title="Learning Hub"
              description="Live recommended study materials based on your profile and learning activity."
              action={
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="outline">
                    <Link to="/learn">Open learning</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/learn/progress">My progress</Link>
                  </Button>
                </div>
              }
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">Started</p>
                <p className="mt-2 text-3xl font-bold text-white">{learningSummary.totalStarted}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">Completed</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {learningSummary.totalCompleted}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <p className="text-sm text-slate-400">Average Progress</p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {learningSummary.averageProgress}%
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {topRecommendedMaterials.length ? (
                topRecommendedMaterials.map((material) => (
                  <div
                    key={material._id}
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-white">{material.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {material.category?.name || "General"} · {material.level}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          {material.recommendationReason}
                        </p>
                      </div>
                      <Button asChild variant="outline">
                        <Link to={`/learn/material/${material.slug}`}>Open</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">
                  Open the learning hub to start getting personalized material recommendations.
                </p>
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

        <Card className="border border-white/10 bg-white/5 shadow-none">
          <CardContent className="p-6">
            <SectionTitle
              title="Overall Score"
              description="A quick snapshot of your current readiness."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderProfile = () => (
    <Card className="border border-white/10 bg-white/5 shadow-none">
      <CardContent className="p-6">
        <SectionTitle
          title="Profile"
          description="Information loaded from your student profile API."
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
              <p className="text-sm text-slate-400">Bio</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {profile.bio || "No bio added yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="No profile created yet"
              description="Your student profile has not been created yet. Use the backend profile API to create one, then it will show here."
            />
          </div>
        )}
      </CardContent>
    </Card>
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
                    <Button asChild variant="outline">
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

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-white/10 bg-slate-950/50 backdrop-blur lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r">
          <div className="flex h-full flex-col p-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-semibold text-white">Learn2Hire</p>
                <p className="text-sm text-slate-500">Student Workspace</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = !item.path && activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (item.path) {
                        navigate(item.path);
                        return;
                      }

                      setActiveSection(item.id);
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                      isActive
                        ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto pt-8">
              <Button
                variant="outline"
                onClick={onLogout}
                className="w-full justify-center border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          <header className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_24px_60px_rgba(2,6,23,0.25)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-300">Learn2Hire</p>
                <h1 className="mt-1 text-3xl font-bold text-white">Student Dashboard</h1>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  asChild
                  variant="outline"
                  className="hidden border-white/15 text-slate-200 hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  <Link to="/learn">
                    <BookOpen className="h-4 w-4" />
                    Learning
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="hidden border-white/15 text-slate-200 hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  <Link to="/learn/progress">My Progress</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="hidden border-white/15 text-slate-200 hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  <Link to="/notifications">
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Link>
                </Button>
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-cyan-300 sm:inline-flex">
                  {displayUser.role}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <p className="text-sm font-semibold text-white">{displayUser.name}</p>
                  <p className="text-xs text-slate-400">{displayUser.email}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={onLogout}
                  className="hidden border-white/15 text-slate-200 hover:bg-white/10 hover:text-white md:inline-flex"
                >
                  Logout
                </Button>
              </div>
            </div>
          </header>

          {loading ? (
            <div className="flex min-h-[360px] items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
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
              {activeSection === "progress" && renderProgress()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "assessments", label: "Assessments", icon: ClipboardList },
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

function FacultyDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [me, setMe] = useState(user);
  const [assessments, setAssessments] = useState([]);
  const [submissionsByAssessment, setSubmissionsByAssessment] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

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

  const renderDashboard = () => (
    <div className="space-y-6">
      <SectionTitle
        title="Faculty Dashboard"
        description="Monitor created assessments, submission activity, and class performance from one place."
        action={
          <Button onClick={() => navigate("/assessments/create")}>
            Create Assessment
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Assessments Created"
          value={assessments.length}
          subtitle="Owned by this faculty account"
          icon={ClipboardList}
        />
        <MetricCard
          title="Published"
          value={publishedAssessments.length}
          subtitle="Visible to students"
          icon={BookOpenCheck}
        />
        <MetricCard
          title="Total Submissions"
          value={totalSubmissions}
          subtitle="Across your assessments"
          icon={BarChart3}
        />
        <MetricCard
          title="Average Score"
          value={`${averageScore}%`}
          subtitle="Average student performance"
          icon={Sparkles}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border border-white/10 bg-white/5 shadow-none">
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
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-white">{assessment.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {assessment.skill || "General"} · {assessment.questions?.length || 0} questions
                        </p>
                      </div>
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
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

        <Card className="border border-white/10 bg-white/5 shadow-none">
          <CardContent className="p-6">
            <SectionTitle
              title="Assessment Mix"
              description="See how much of your work is draft versus published."
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-400">Draft Assessments</p>
                <p className="mt-3 text-3xl font-bold text-white">{draftAssessments.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <p className="text-sm text-slate-400">Published Assessments</p>
                <p className="mt-3 text-3xl font-bold text-white">{publishedAssessments.length}</p>
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
          title="Faculty Profile"
          description="Current account details loaded from the backend."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">Name</p>
            <p className="mt-2 text-base font-semibold text-white">{me.name}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
            <p className="text-sm text-slate-400">Email</p>
            <p className="mt-2 text-base font-semibold text-white">{me.email}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 md:col-span-2">
            <p className="text-sm text-slate-400">Role</p>
            <p className="mt-2 text-base font-semibold capitalize text-white">{me.role}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderAssessments = () => (
    <Card className="border border-white/10 bg-white/5 shadow-none">
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
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:border-indigo-400/30"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{assessment.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {assessment.description || "No description provided."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Skill: {assessment.skill || "General"} · Questions:{" "}
                      {assessment.questions?.length || 0} · Max Score: {assessment.maxScore || 0}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium capitalize text-cyan-300">
                      {assessment.status}
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300">
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
    <Card className="border border-white/10 bg-white/5 shadow-none">
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
                className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{assessment.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {assessment.submissionCount} submissions · Average score {assessment.average}%
                    </p>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Average result</span>
                      <span>{assessment.average}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
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
                <p className="text-sm text-slate-500">Faculty Workspace</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
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
                <h1 className="mt-1 text-3xl font-bold text-white">Faculty Dashboard</h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium capitalize text-cyan-300 sm:inline-flex">
                  {me.role}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <p className="text-sm font-semibold text-white">{me.name}</p>
                  <p className="text-xs text-slate-400">{me.email}</p>
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
        </div>
      </div>
    </div>
  );
}

export default FacultyDashboard;

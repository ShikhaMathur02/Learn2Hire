import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  LoaderCircle,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { facultyNavItems } from "../../config/facultyNavItems";
import {
  PROFILE_PHOTO_MAX_BYTES,
  persistUserProfilePhotoInLocalStorage,
} from "../../lib/avatarUtils";
import { DarkWorkspaceShell } from "../layout/DarkWorkspaceShell";
import { ProfileAvatarBlock } from "../profile/ProfileAvatarBlock";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

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
    const token = localStorage.getItem("token");
    if (!token || !file) return;
    setProfilePhotoError("");
    if (file.size > PROFILE_PHOTO_MAX_BYTES) {
      setProfilePhotoError(
        "Profile photo must be 25 MB or smaller. Choose a smaller image and try again."
      );
      return;
    }
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");
    if (!token) return;
    setProfilePhotoError("");
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/profile/photo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
    <Card className="overflow-hidden border border-white/10 bg-white/5 shadow-none">
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
                  className="h-11 shrink-0 gap-2 self-start border-white/20 bg-white/10 text-white hover:bg-white/20"
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
                className="shrink-0 border-white/20 text-white hover:bg-white/10"
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
            <div className="mt-8 flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row sm:items-start">
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
            </div>
          </div>
        )}
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
    <DarkWorkspaceShell
      title="Faculty Dashboard"
      workspaceLabel="Faculty Workspace"
      brandSubtitle="Faculty Workspace"
      navItems={facultyNavItems}
      activeSection={activeSection}
      onNavSectionSelect={setActiveSection}
      user={{ name: me.name, email: me.email, role: me.role }}
      onLogout={onLogout}
      headerIcon={Sparkles}
      actionItems={[
        { label: "Manage learning", to: "/dashboard/learning/manage", icon: BookOpenCheck },
      ]}
    >
      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-white/10 bg-white/5">
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
    </DarkWorkspaceShell>
  );
}

export default FacultyDashboard;

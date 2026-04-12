import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  LoaderCircle,
  Search,
  Send,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../components/dashboard/DashboardTopNav";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function CompanyTalentPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filterQ, setFilterQ] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [appliedSkill, setAppliedSkill] = useState("");
  const [talent, setTalent] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailUserId, setDetailUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pickJobId, setPickJobId] = useState("");
  const [pickNote, setPickNote] = useState("");
  const [pickSending, setPickSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (!token || !raw) {
      navigate("/login");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.role !== "company") {
        navigate("/dashboard");
        return;
      }
      setUser(parsed);
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  const loadTalent = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (appliedQ.trim()) params.set("q", appliedQ.trim());
      if (appliedSkill.trim()) params.set("skill", appliedSkill.trim());
      const tRes = await fetch(`/api/jobs/company/talent?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const tData = await readApiResponse(tRes);
      if (!tRes.ok) throw new Error(tData.message || "Failed to load talent.");
      setTalent(tData.data?.talent || []);
    } catch (e) {
      setError(e.message || "Unable to load candidates.");
    } finally {
      setLoading(false);
    }
  }, [appliedQ, appliedSkill]);

  const loadJobs = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const jRes = await fetch("/api/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jData = await readApiResponse(jRes);
      if (jRes.ok) setJobs(jData.data?.jobs || []);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadJobs();
  }, [user, loadJobs]);

  useEffect(() => {
    if (!user) return;
    loadTalent();
  }, [user, loadTalent]);

  const openDetail = async (userId) => {
    setDetailUserId(userId);
    setDetail(null);
    setPickJobId("");
    setPickNote("");
    setDetailLoading(true);
    setError("");
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`/api/jobs/company/students/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Could not load profile.");
      setDetail(data.data);
    } catch (e) {
      setError(e.message || "Could not load profile.");
      setDetailUserId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const sendInterest = async () => {
    if (!detailUserId) return;
    const token = localStorage.getItem("token");
    if (!token) return;
    setPickSending(true);
    setSuccess("");
    setError("");
    try {
      const res = await fetch("/api/jobs/company/express-interest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentUserId: detailUserId,
          jobId: pickJobId || undefined,
          message: pickNote.trim() || undefined,
        }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Could not notify student.");
      setSuccess("The student has been notified.");
      setPickNote("");
    } catch (e) {
      setError(e.message || "Could not send.");
    } finally {
      setPickSending(false);
    }
  };

  const applyFilters = () => {
    setAppliedQ(filterQ);
    setAppliedSkill(filterSkill);
  };

  const inputClass =
    "h-11 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <LoaderCircle className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="w-full px-3 py-5 sm:px-4 sm:py-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Company Workspace"
          title="Talent pool"
          description="Browse learners who opted in, see what they study and which tools they use, then express interest for a role."
          user={{ name: user.name, email: user.email, role: user.role }}
          onLogout={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
          actionItems={[
            { label: "Manage jobs", to: "/company/jobs" },
            { label: "Company home", onClick: () => navigate("/dashboard") },
          ]}
        />

        <div className="mt-4 rounded-[32px] border border-white/10 bg-slate-950/45 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <div className="space-y-6 p-5 sm:p-6 xl:p-7">
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Link
                to="/company/jobs"
                className="text-sm text-cyan-300 underline-offset-4 hover:underline"
              >
                Job manager
              </Link>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                {success}
              </div>
            ) : null}

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-400" htmlFor="talent-q">
                      Search
                    </label>
                    <input
                      id="talent-q"
                      className={`${inputClass} mt-1`}
                      value={filterQ}
                      onChange={(e) => setFilterQ(e.target.value)}
                      placeholder="Name, bio, course, tools…"
                    />
                  </div>
                  <div className="w-full lg:w-56">
                    <label className="text-xs font-medium text-slate-400" htmlFor="talent-skill">
                      Skill contains
                    </label>
                    <input
                      id="talent-skill"
                      className={`${inputClass} mt-1`}
                      value={filterSkill}
                      onChange={(e) => setFilterSkill(e.target.value)}
                      placeholder="e.g. React"
                    />
                  </div>
                  <Button type="button" onClick={applyFilters} className="shrink-0">
                    <Search className="h-4 w-4" />
                    Apply filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading candidates…
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
                <div className="space-y-3">
                  {talent.length ? (
                    talent.map((row) => (
                      <div
                        key={row.userId}
                        role="button"
                        tabIndex={0}
                        onClick={() => openDetail(row.userId)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openDetail(row.userId);
                          }
                        }}
                        className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 ${
                          detailUserId === row.userId
                            ? "border-cyan-400/50 bg-cyan-500/10"
                            : "border-white/10 bg-slate-900/50 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-cyan-300">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white">{row.name}</p>
                            <p className="truncate text-xs text-slate-400">{row.email}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {[row.course, row.branch, row.year].filter(Boolean).join(" · ") ||
                                "Course not set"}
                            </p>
                            {row.toolsAndTechnologies?.length ? (
                              <p className="mt-2 line-clamp-2 text-xs text-slate-400">
                                {row.toolsAndTechnologies.slice(0, 6).join(", ")}
                                {row.toolsAndTechnologies.length > 6 ? "…" : ""}
                              </p>
                            ) : null}
                            <Link
                              to={`/dashboard/learners/${row.userId}`}
                              className="mt-2 inline-block text-xs font-medium text-cyan-300 underline-offset-4 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                              onKeyDown={(e) => e.stopPropagation()}
                            >
                              Open profile page
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">No matching learners right now.</p>
                  )}
                </div>

                <Card className="border border-white/10 bg-white/5 shadow-none lg:min-h-[420px]">
                  <CardContent className="p-6">
                    {!detailUserId ? (
                      <p className="text-sm text-slate-400">
                        Select a candidate to view learning activity, skills, and tools.
                      </p>
                    ) : detailLoading ? (
                      <div className="flex items-center gap-2 text-slate-400">
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Loading profile…
                      </div>
                    ) : detail ? (
                      <div className="space-y-5">
                        <div>
                          <h2 className="text-xl font-bold text-white">{detail.user?.name}</h2>
                          <p className="text-sm text-slate-400">{detail.user?.email}</p>
                          {detail.profile?.bio ? (
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {detail.profile.bio}
                            </p>
                          ) : null}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                          <h3 className="text-sm font-semibold text-white">Tools & technologies</h3>
                          <p className="mt-2 text-sm text-slate-300">
                            {(detail.profile?.toolsAndTechnologies || []).length
                              ? detail.profile.toolsAndTechnologies.join(", ")
                              : "Not listed yet."}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                          <h3 className="text-sm font-semibold text-white">Skills & assessments</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(detail.derivedSkills || []).map((s) => (
                              <span
                                key={s.name}
                                className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200"
                              >
                                {s.name} · {Math.round(s.progress ?? 0)}%
                              </span>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-slate-500">
                            Assessments taken: {detail.learningStats?.assessmentsTaken ?? 0} ·
                            Materials started: {detail.learningStats?.coursesEnrolled ?? 0}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                          <h3 className="text-sm font-semibold text-white">Learning activity</h3>
                          <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto text-sm text-slate-300">
                            {(detail.learningActivity || []).slice(0, 12).map((row) => (
                              <li key={`${row.material?.slug}-${row.lastViewedAt}`} className="flex justify-between gap-2">
                                <span className="truncate">
                                  {row.material?.title || "Material"}
                                  {row.completed ? " · done" : ""}
                                </span>
                                <span className="shrink-0 text-xs text-slate-500">
                                  {row.progressPercent ?? 0}%
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                          <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                            <BriefcaseBusiness className="h-4 w-4 text-cyan-300" />
                            Express interest
                          </h3>
                          <p className="mt-1 text-xs text-slate-400">
                            Sends an in-app notification to the student (optional: link to one of
                            your jobs).
                          </p>
                          <select
                            className={`${inputClass} mt-3`}
                            value={pickJobId}
                            onChange={(e) => setPickJobId(e.target.value)}
                          >
                            <option value="">No specific job (general interest)</option>
                            {jobs
                              .filter((j) => j.status === "open")
                              .map((j) => (
                                <option key={j._id} value={j._id}>
                                  {j.title}
                                </option>
                              ))}
                          </select>
                          <textarea
                            className="mt-3 min-h-[72px] w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                            value={pickNote}
                            onChange={(e) => setPickNote(e.target.value)}
                            placeholder="Short message (optional)"
                          />
                          <Button
                            type="button"
                            className="mt-3"
                            onClick={sendInterest}
                            disabled={pickSending}
                          >
                            {pickSending ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                            Notify student
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanyTalentPage;

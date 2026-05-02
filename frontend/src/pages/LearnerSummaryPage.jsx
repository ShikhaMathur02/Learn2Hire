import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { readApiResponse } from "../lib/api";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../components/dashboard/DashboardTopNav";
import { ProfileAvatarBlock } from "../components/profile/ProfileAvatarBlock";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { workspaceRootProps } from "../lib/workspaceTheme";

function workspaceCopy(role) {
  const r = String(role || "").toLowerCase();
  if (r === "admin") return { label: "Admin", backHint: "Back to dashboard" };
  if (r === "college") return { label: "College workspace", backHint: "Back to dashboard" };
  if (r === "faculty") return { label: "Faculty workspace", backHint: "Back to dashboard" };
  if (r === "company") return { label: "Company workspace", backHint: "Back to talent pool" };
  return { label: "Dashboard", backHint: "Back" };
}

export default function LearnerSummaryPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!localStorage.getItem("user") || !raw) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      setViewer(JSON.parse(raw));
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!viewer || !userId) return;

    const allowed = ["admin", "college", "faculty", "company"].includes(
      String(viewer.role).toLowerCase()
    );
    if (!allowed) {
      setError("You do not have access to this profile view.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/profile/summary/${userId}`, {
          headers: {},
        });
        const data = await readApiResponse(res);
        if (!res.ok) {
          throw new Error(data.message || "Could not load profile.");
        }
        if (!cancelled) setSummary(data.data?.summary || null);
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewer, userId]);

  const ws = useMemo(() => workspaceCopy(viewer?.role), [viewer?.role]);

  const cohortLine = useMemo(() => {
    if (!summary) return "";
    return [summary.course, summary.branch, summary.year, summary.semester].filter(Boolean).join(" · ");
  }, [summary]);

  const handleBack = () => {
    if (String(viewer?.role).toLowerCase() === "company") {
      navigate("/company/talent");
      return;
    }
    navigate("/dashboard");
  };

  if (!viewer) {
    return (
      <div {...workspaceRootProps("", "flex min-h-screen items-center justify-center text-slate-600")}>
        <LoaderCircle className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div {...workspaceRootProps(viewer?.role)}>
      <div className="l2h-container-app w-full py-5 sm:py-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel={ws.label}
          title="Profile preview"
          description="Shared view: name, campus, course, and skills—without private contact or address fields."
          user={{ name: viewer.name, email: viewer.email, role: viewer.role }}
          onLogout={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
        />

        <div className="mt-4 rounded-[32px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-card)] backdrop-blur sm:p-7">
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
            {ws.backHint}
          </Button>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="mt-10 flex items-center justify-center gap-2 text-[var(--text-muted)]">
              <LoaderCircle className="h-6 w-6 animate-spin" />
              Loading profile…
            </div>
          ) : summary ? (
            <div className="mt-8 space-y-6">
              <Card className="overflow-hidden border border-slate-200 bg-white shadow-none">
                <CardContent className="p-0">
                  <div className="relative bg-gradient-to-br from-violet-600/35 via-slate-900 to-slate-950 px-6 py-8 sm:px-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                      <ProfileAvatarBlock
                        name={summary.name}
                        profilePhoto={summary.profilePhoto}
                        frameClass="h-28 w-28 sm:h-32 sm:w-32"
                      />
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <p className="text-xs font-semibold uppercase tracking-wider text-violet-200/90">
                          {summary.role}
                        </p>
                        <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{summary.name}</h1>
                        <p className="mt-1 break-all text-sm text-slate-300">{summary.email}</p>
                        <p className="mt-3 text-sm text-slate-400">
                          <span className="text-slate-500">Campus:</span> {summary.collegeName || "—"}
                        </p>
                        {summary.role === "student" && summary.serialNumber?.trim() ? (
                          <p className="mt-1 text-sm text-slate-300">
                            <span className="text-slate-500">S.no.:</span>{" "}
                            <span className="tabular-nums">{summary.serialNumber.trim()}</span>
                          </p>
                        ) : null}
                        {cohortLine ? (
                          <p className="mt-1 text-sm text-slate-300">{cohortLine}</p>
                        ) : null}
                        {typeof summary.overallScore === "number" ? (
                          <p className="mt-2 text-sm font-medium text-cyan-200/90">
                            Overall score: {Math.round(summary.overallScore)}%
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {summary.bio ? (
                <Card className="border border-slate-200 bg-white shadow-none">
                  <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-[var(--text)]">Bio</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{summary.bio}</p>
                  </CardContent>
                </Card>
              ) : null}

              {summary.facultyDesignation || summary.facultyQualification || summary.facultySubjects ? (
                <Card className="border border-slate-200 bg-white shadow-none">
                  <CardContent className="p-6 space-y-3">
                    <h2 className="text-sm font-semibold text-[var(--text)]">Faculty</h2>
                    {summary.facultyDesignation ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text)]">Designation:</span>{" "}
                        {summary.facultyDesignation}
                      </p>
                    ) : null}
                    {summary.facultyQualification ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text)]">Qualification:</span>{" "}
                        {summary.facultyQualification}
                      </p>
                    ) : null}
                    {summary.facultySubjects ? (
                      <p className="text-sm text-[var(--text-muted)]">
                        <span className="font-medium text-[var(--text)]">Subjects:</span>{" "}
                        {summary.facultySubjects}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}

              {summary.toolsAndTechnologies?.length ? (
                <Card className="border border-slate-200 bg-white shadow-none">
                  <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-[var(--text)]">Tools & technologies</h2>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">
                      {summary.toolsAndTechnologies.join(", ")}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-sm font-semibold text-[var(--text)]">Skills</h2>
                  {summary.skills?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {summary.skills.map((s) => (
                        <span
                          key={`${s.name}-${s.level}`}
                          className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium text-[var(--text)]"
                        >
                          {s.name}
                          {typeof s.progress === "number" ? ` · ${Math.round(s.progress)}%` : ""}
                          {s.level ? ` · ${s.level}` : ""}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No skills listed yet.</p>
                  )}
                </CardContent>
              </Card>

              {summary.stats && Object.keys(summary.stats).length > 0 ? (
                <Card className="border border-slate-200 bg-white shadow-none">
                  <CardContent className="p-6">
                    <h2 className="text-sm font-semibold text-[var(--text)]">Activity snapshot</h2>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {Object.entries(summary.stats).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 shadow-sm"
                        >
                          <dt className="font-medium text-[var(--text-muted)] capitalize">
                            {k.replace(/([A-Z])/g, " $1")}
                          </dt>
                          <dd className="font-semibold tabular-nums text-[var(--text)]">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : !error ? (
            <p className="mt-8 text-sm text-[var(--text-muted)]">No data.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}


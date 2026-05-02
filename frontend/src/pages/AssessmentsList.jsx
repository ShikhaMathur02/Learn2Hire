import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "../components/ui/button";
import { workspaceRootProps } from "../lib/workspaceTheme";
import { Card, CardContent } from "../components/ui/card";

function AssessmentsList() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {

    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {        };

        const [assessmentsRes, submissionsRes] = await Promise.all([
          fetch("/api/assessments", { headers }),
          fetch("/api/submissions", { headers }),
        ]);

        if (assessmentsRes.status === 401 || submissionsRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        const assessmentsData = await assessmentsRes.json();
        const submissionsData = await submissionsRes.json();

        if (!assessmentsRes.ok) {
          throw new Error(assessmentsData.message || "Failed to load assessments.");
        }

        if (!submissionsRes.ok) {
          throw new Error(submissionsData.message || "Failed to load submissions.");
        }

        setAssessments(assessmentsData.data?.assessments || []);
        setSubmissions(submissionsData.data?.submissions || []);
      } catch (err) {
        setError(err.message || "Unable to load assessments.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const submissionMap = useMemo(
    () =>
      Object.fromEntries(
        submissions.map((submission) => [
          submission.assessment?._id || submission.assessment,
          submission,
        ])
      ),
    [submissions]
  );

  if (loading) {
    return (
      <div {...workspaceRootProps("student", "flex min-h-screen items-center justify-center text-slate-600")}>
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading assessments...
        </div>
      </div>
    );
  }

  return (
    <div {...workspaceRootProps("student", "l2h-container-app min-h-screen py-5 sm:py-6")}>
      <div className="w-full">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
              <Link
                to="/dashboard"
                className="underline-offset-4 transition hover:text-[var(--primary)] hover:underline"
              >
                Dashboard
              </Link>
              <span className="text-[var(--text-subtle)]">/</span>
              <span className="font-medium text-[var(--text)]">Assessments</span>
            </div>
            <p className="text-sm font-semibold text-[var(--primary)]">Student Workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">
              Published Assessments
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-muted)]">
              Access all currently published assessments and continue from your dashboard.
            </p>
          </div>

          <Button variant="default" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
            {error}
          </div>
        ) : assessments.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {assessments.map((assessment) => {
              const submission = submissionMap[assessment._id];
              const attempted = Boolean(submission);
              const percentage = submission?.maxScore
                ? Math.round((submission.score / submission.maxScore) * 100)
                : 0;
              const qCount = assessment.questions?.length || 0;
              const hasPaper = Boolean(assessment.questionPaper?.relativePath);
              const isDocumentOnly = hasPaper && qCount === 0;

              return (
                <Card
                  key={assessment._id}
                  className="border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                        <ClipboardList className="h-6 w-6" aria-hidden />
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-[var(--text-muted)]">
                        {assessment.status}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-[var(--text)]">{assessment.title}</h2>
                    <p className="mt-2 min-h-[48px] text-sm leading-relaxed text-[var(--text-muted)]">
                      {assessment.description || "No description provided for this assessment."}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                      <p>
                        <span className="font-semibold text-[var(--text)]">Skill:</span>{" "}
                        {assessment.skill || "General"}
                      </p>
                      <p>
                        {isDocumentOnly
                          ? "Format: Question paper (download)"
                          : `Questions: ${qCount}`}
                      </p>
                      <p>
                        Time Limit:{" "}
                        {assessment.timeLimit ? `${assessment.timeLimit} mins` : "No limit"}
                      </p>
                    </div>

                    {attempted && !isDocumentOnly ? (
                      <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                        <p className="text-sm font-semibold text-emerald-950">Already submitted</p>
                        <p className="mt-1 text-sm text-emerald-900/90">
                          Score: {submission.score}/{submission.maxScore} ({percentage}%)
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <Button asChild className="w-full">
                        <Link to={`/assessments/${assessment._id}`}>
                          {attempted && !isDocumentOnly
                            ? "View Result"
                            : isDocumentOnly
                              ? "Open question paper"
                              : "Start Assessment"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                <Sparkles className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">No assessments available</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Published assessments will appear here when faculty make them available.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AssessmentsList;


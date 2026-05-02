import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  LoaderCircle,
  Trophy,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { workspaceRootProps } from "../lib/workspaceTheme";
import { Card, CardContent } from "../components/ui/card";

function formatTime(seconds) {
  const safeSeconds = Math.max(seconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getPerformanceLabel(percentage) {
  if (percentage >= 85) return "Excellent";
  if (percentage >= 70) return "Strong";
  if (percentage >= 50) return "Good start";
  return "Keep practicing";
}

function StudentAssessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {

    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }

    const fetchAssessment = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {        };

        const [assessmentRes, submissionsRes] = await Promise.all([
          fetch(`/api/assessments/${id}`, { headers }),
          fetch("/api/submissions", { headers }),
        ]);

        if (assessmentRes.status === 401 || submissionsRes.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        const assessmentData = await assessmentRes.json();
        const submissionsData = await submissionsRes.json();

        if (!assessmentRes.ok) {
          throw new Error(assessmentData.message || "Failed to load assessment.");
        }

        if (!submissionsRes.ok) {
          throw new Error(submissionsData.message || "Failed to load submissions.");
        }

        setAssessment(assessmentData.data?.assessment || null);
        setSubmissions(submissionsData.data?.submissions || []);
      } catch (err) {
        setError(err.message || "Unable to load assessment.");
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [id, navigate]);

  const existingSubmission = useMemo(
    () =>
      submissions.find(
        (submission) => submission.assessment?._id === id || submission.assessment === id
      ),
    [id, submissions]
  );

  const questionPaperPath = assessment?.questionPaper?.relativePath || "";
  const questionPaperName =
    assessment?.questionPaper?.originalName || "Question paper";
  const totalQuestions = assessment?.questions?.length || 0;
  const isDocumentOnly = Boolean(questionPaperPath) && totalQuestions === 0;
  const answeredCount = Object.keys(answers).length;
  const hasTimeLimit = Boolean(assessment?.timeLimit) && totalQuestions > 0;
  const percentage = existingSubmission?.maxScore
    ? Math.round((existingSubmission.score / existingSubmission.maxScore) * 100)
    : 0;

  useEffect(() => {
    if (!assessment || existingSubmission) {
      setTimeLeft(null);
      return;
    }

    const qn = assessment.questions?.length || 0;
    if (assessment.timeLimit && qn > 0) {
      setTimeLeft(assessment.timeLimit * 60);
      setTimeExpired(false);
    } else {
      setTimeLeft(null);
    }
  }, [assessment, existingSubmission]);

  useEffect(() => {
    if (!hasTimeLimit || existingSubmission || submitting || timeLeft === null || timeLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [existingSubmission, hasTimeLimit, submitting, timeLeft]);

  const submitAssessment = useCallback(
    async ({ autoSubmit = false } = {}) => {
      setError("");
      setSuccess("");
      if (!localStorage.getItem("user")) {
        navigate("/login");
        return;
      }

      if (!assessment?.questions?.length) {
        setError("This assessment has no online questions to submit.");
        return;
      }

      const formattedAnswers = assessment.questions
        .map((_, index) => ({
          questionIndex: index,
          selectedAnswer: answers[index],
        }))
        .filter((item) => item.selectedAnswer);

      if (!autoSubmit && formattedAnswers.length !== assessment.questions.length) {
        setError("Please answer all questions before submitting.");
        return;
      }

      if (autoSubmit && formattedAnswers.length === 0) {
        setError("Time is up. No answers were selected before auto-submit.");
        return;
      }

      setSubmitting(true);

      try {
        const response = await fetch("/api/submissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
        },
          body: JSON.stringify({
            assessmentId: id,
            answers: formattedAnswers,
          }),
        });

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          setError(data.message || "Failed to submit assessment.");
          return;
        }

        setSuccess(
          autoSubmit
            ? "Time ended, so your available answers were submitted automatically."
            : "Assessment submitted successfully."
        );
        setSubmissions((prev) => [data.data?.submission, ...prev]);
      } catch (err) {
        setError("Something went wrong. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [answers, assessment, id, navigate]
  );

  useEffect(() => {
    if (!hasTimeLimit || loading || submitting || existingSubmission || timeLeft !== 0 || timeExpired) {
      return;
    }

    setTimeExpired(true);
    submitAssessment({ autoSubmit: true });
  }, [
    existingSubmission,
    hasTimeLimit,
    loading,
    submitAssessment,
    submitting,
    timeExpired,
    timeLeft,
  ]);

  const handleAnswerChange = (questionIndex, option) => {
    if (timeExpired || existingSubmission) {
      return;
    }

    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitAssessment();
  };

  if (loading) {
    return (
      <div {...workspaceRootProps("student", "flex min-h-screen items-center justify-center text-slate-600")}>
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading assessment...
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
              <Link
                to="/assessments"
                className="underline-offset-4 transition hover:text-[var(--primary)] hover:underline"
              >
                Assessments
              </Link>
              <span className="text-[var(--text-subtle)]">/</span>
              <span className="font-medium text-[var(--text)]">Assessment</span>
            </div>
            <p className="text-sm font-semibold text-[var(--primary)]">Student Workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-[var(--text)]">
              {assessment?.title || "Assessment"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {assessment?.description ||
                (isDocumentOnly
                  ? "Download or open the question paper using the buttons below."
                  : "Complete all questions and submit your answers.")}
            </p>
          </div>

          <Button variant="default" onClick={() => navigate("/assessments")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">Skill</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                {assessment?.skill || "General"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">Format</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                {isDocumentOnly ? "Document" : totalQuestions > 0 ? "Online MCQ" : "—"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">Questions</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text)]">{totalQuestions}</p>
            </CardContent>
          </Card>
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-[var(--text-muted)]">Time Limit</p>
              <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                {assessment?.timeLimit ? `${assessment.timeLimit} mins` : "No limit"}
              </p>
            </CardContent>
          </Card>
          {totalQuestions > 0 ? (
            <Card className="border border-slate-200 bg-white shadow-none sm:col-span-2 xl:col-span-4">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-[var(--text-muted)]">Answered</p>
                <p className="mt-2 text-lg font-semibold text-[var(--text)]">
                  {answeredCount}/{totalQuestions}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {questionPaperPath ? (
          <Card className="mb-6 border border-sky-200/90 bg-white shadow-none ring-1 ring-sky-500/15">
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-[var(--primary)]">
                  <FileText className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-sky-900">Question paper</p>
                  <p className="mt-1 text-sm font-medium text-[var(--text)]">{questionPaperName}</p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">
                    Open in the browser or download to complete offline, per your instructor&apos;s
                    instructions.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="default" className="gap-2">
                  <a href={questionPaperPath} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Open
                  </a>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <a href={questionPaperPath} download={questionPaperName}>
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {existingSubmission ? (
          <Card className="border border-emerald-200 bg-emerald-50/90 shadow-none ring-1 ring-emerald-600/15">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                    <span className="text-sm font-semibold">
                      {success || "Assessment already submitted"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-emerald-950">
                    {getPerformanceLabel(percentage)}
                  </h2>
                  <p className="mt-2 text-sm text-emerald-900/85">
                    Your score has been recorded and you can review the summary below.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-300/90 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-800">
                      Score
                    </p>
                    <p className="mt-2 text-2xl font-bold text-[var(--text)]">
                      {existingSubmission.score}/{existingSubmission.maxScore}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-300/90 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-800">Result</p>
                    <p className="mt-2 text-2xl font-bold text-[var(--primary)]">{percentage}%</p>
                  </div>
                  <div className="rounded-2xl border border-slate-300/90 bg-white p-4 shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-800">
                      Submitted
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text)]">
                      {existingSubmission.submittedAt
                        ? new Date(existingSubmission.submittedAt).toLocaleString()
                        : "Recorded"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate("/assessments")}>Back to Assessments</Button>
                <Button variant="default" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : isDocumentOnly ? (
          <Card className="border border-slate-200 bg-white shadow-none">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-[var(--text)]">Document assessment</h2>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                This assessment is delivered as a file only. Use Open or Download above. There is no
                online answer sheet for this test.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={() => navigate("/assessments")}>
                  Back to Assessments
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04]">
                <div className="flex items-center gap-3 text-sm font-medium text-[var(--text)]">
                  <Trophy className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
                  {answeredCount} of {totalQuestions} questions answered
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200/90">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-indigo-500 transition-all"
                    style={{
                      width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <Card
                className={`border shadow-none ${
                  timeExpired
                    ? "border-rose-200 bg-rose-50 ring-1 ring-rose-500/15"
                    : "border-slate-200 bg-white"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Clock3
                      className={`h-5 w-5 shrink-0 ${timeExpired ? "text-rose-600" : "text-[var(--primary)]"}`}
                      aria-hidden
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--text-muted)]">Timer</p>
                      <p className="mt-1 text-2xl font-bold tracking-tight text-[var(--text)] tabular-nums">
                        {hasTimeLimit && timeLeft !== null ? formatTime(timeLeft) : "No limit"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[var(--text-muted)]">
                    {hasTimeLimit
                      ? "When time ends, your selected answers are submitted automatically."
                      : "Take your time and submit when you are ready."}
                  </p>
                </CardContent>
              </Card>
            </div>

            {assessment?.questions?.map((question, questionIndex) => (
              <Card
                key={question._id || `question-${questionIndex}`}
                className="border border-slate-200 bg-white shadow-none"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--primary)]">
                        Question {questionIndex + 1}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold leading-snug text-[var(--text)]">
                        {question.question}
                      </h2>
                    </div>
                    <span className="rounded-full border border-[var(--border)] bg-slate-100 px-3 py-1 text-xs font-semibold text-[var(--text-muted)]">
                      {question.marks || 1} mark{(question.marks || 1) > 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {question.options?.map((option, optionIndex) => {
                      const selected = answers[questionIndex] === option;
                      return (
                        <button
                          key={`${questionIndex}-${optionIndex}`}
                          type="button"
                          onClick={() => handleAnswerChange(questionIndex, option)}
                          disabled={timeExpired}
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium leading-relaxed transition ${
                            selected
                              ? "border-[var(--primary)] bg-blue-50 text-[var(--text)] shadow-sm ring-1 ring-[color:var(--primary)]/20"
                              : "border-[var(--border)] bg-[var(--bg-card)] text-[var(--text)] hover:border-[color:var(--primary)]/40 hover:bg-blue-50/60"
                          } ${timeExpired ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
                {success}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting || timeExpired}
                className="shadow-lg shadow-indigo-600/20"
              >
                {submitting ? "Submitting..." : timeExpired ? "Time Ended" : "Submit Assessment"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default StudentAssessment;


import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Trophy,
} from "lucide-react";

import { Button } from "../components/ui/button";
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
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/login");
      return;
    }

    const fetchAssessment = async () => {
      setLoading(true);
      setError("");

      try {
        const headers = {
          Authorization: `Bearer ${token}`,
        };

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

  const totalQuestions = assessment?.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  const hasTimeLimit = Boolean(assessment?.timeLimit);
  const percentage = existingSubmission?.maxScore
    ? Math.round((existingSubmission.score / existingSubmission.maxScore) * 100)
    : 0;

  useEffect(() => {
    if (!assessment || existingSubmission) {
      setTimeLeft(null);
      return;
    }

    if (assessment.timeLimit) {
      setTimeLeft(assessment.timeLimit * 60);
      setTimeExpired(false);
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

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      if (!assessment?.questions?.length) {
        setError("This assessment has no questions.");
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
            Authorization: `Bearer ${token}`,
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading assessment...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <span>/</span>
              <Link to="/assessments" className="transition hover:text-white">
                Assessments
              </Link>
              <span>/</span>
              <span className="text-slate-300">Assessment</span>
            </div>
            <p className="text-sm font-medium text-cyan-300">Student Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">
              {assessment?.title || "Assessment"}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              {assessment?.description || "Complete all questions and submit your answers."}
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/assessments")}
            className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Skill</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {assessment?.skill || "General"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Questions</p>
              <p className="mt-2 text-lg font-semibold text-white">{totalQuestions}</p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Time Limit</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {assessment?.timeLimit ? `${assessment.timeLimit} mins` : "No limit"}
              </p>
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="p-5">
              <p className="text-sm text-slate-400">Answered</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {answeredCount}/{totalQuestions}
              </p>
            </CardContent>
          </Card>
        </div>

        {existingSubmission ? (
          <Card className="border border-emerald-400/20 bg-emerald-500/10 shadow-none">
            <CardContent className="p-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-200">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium">
                      {success || "Assessment already submitted"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-white">
                    {getPerformanceLabel(percentage)}
                  </h2>
                  <p className="mt-2 text-sm text-emerald-100/80">
                    Your score has been recorded and you can review the summary below.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Score</p>
                    <p className="mt-2 text-2xl font-bold text-white">
                      {existingSubmission.score}/{existingSubmission.maxScore}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Result</p>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">{percentage}%</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Submitted</p>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {existingSubmission.submittedAt
                        ? new Date(existingSubmission.submittedAt).toLocaleString()
                        : "Recorded"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate("/assessments")}>Back to Assessments</Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                  className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
                >
                  Go to Dashboard
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Trophy className="h-5 w-5 text-cyan-300" />
                  {answeredCount} of {totalQuestions} questions answered
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all"
                    style={{
                      width: `${totalQuestions ? (answeredCount / totalQuestions) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <Card
                className={`border shadow-none ${
                  timeExpired
                    ? "border-rose-400/30 bg-rose-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-cyan-300" />
                    <div>
                      <p className="text-sm text-slate-400">Timer</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {hasTimeLimit && timeLeft !== null ? formatTime(timeLeft) : "No limit"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-400">
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
                className="border border-white/10 bg-white/5 shadow-none"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-cyan-300">
                        Question {questionIndex + 1}
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-white">
                        {question.question}
                      </h2>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
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
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-cyan-400 bg-cyan-400/10 text-white"
                              : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-indigo-400/40 hover:bg-slate-900"
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
              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
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

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, LoaderCircle } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

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

  const handleAnswerChange = (questionIndex, option) => {
    setAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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

    if (formattedAnswers.length !== assessment.questions.length) {
      setError("Please answer all questions before submitting.");
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

      setSuccess("Assessment submitted successfully.");
      setSubmissions((prev) => [data.data?.submission, ...prev]);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
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
            onClick={() => navigate("/dashboard")}
            className="border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
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
              <p className="mt-2 text-lg font-semibold text-white">
                {assessment?.questions?.length || 0}
              </p>
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
        </div>

        {existingSubmission ? (
          <Card className="border border-emerald-400/20 bg-emerald-500/10 shadow-none">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-emerald-100">
                Assessment already submitted
              </h2>
              <p className="mt-2 text-sm text-emerald-100/80">
                You have already submitted this assessment.
              </p>
              <p className="mt-3 text-sm text-emerald-200">
                Score: {existingSubmission.score}/{existingSubmission.maxScore}
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
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
                          className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                            selected
                              ? "border-cyan-400 bg-cyan-400/10 text-white"
                              : "border-white/10 bg-slate-900/60 text-slate-300 hover:border-indigo-400/40 hover:bg-slate-900"
                          }`}
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
              <Button type="submit" disabled={submitting} className="shadow-lg shadow-indigo-600/20">
                {submitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default StudentAssessment;

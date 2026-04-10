import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ClipboardList, LoaderCircle, Sparkles } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

function AssessmentsList() {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading assessments...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-300">Assessments</span>
            </div>
            <p className="text-sm font-medium text-cyan-300">Student Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">Published Assessments</h1>
            <p className="mt-2 text-sm text-slate-400">
              Access all currently published assessments and continue from your dashboard.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
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

              return (
                <Card
                  key={assessment._id}
                  className="border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(2,6,23,0.25)]"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
                        <ClipboardList className="h-6 w-6" />
                      </div>
                      <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                        {assessment.status}
                      </span>
                    </div>

                    <h2 className="text-xl font-semibold text-white">{assessment.title}</h2>
                    <p className="mt-2 min-h-[48px] text-sm text-slate-400">
                      {assessment.description || "No description provided for this assessment."}
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-slate-400">
                      <p>Skill: {assessment.skill || "General"}</p>
                      <p>Questions: {assessment.questions?.length || 0}</p>
                      <p>
                        Time Limit:{" "}
                        {assessment.timeLimit ? `${assessment.timeLimit} mins` : "No limit"}
                      </p>
                    </div>

                    {attempted ? (
                      <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                        <p className="text-sm font-medium text-emerald-200">Already submitted</p>
                        <p className="mt-1 text-sm text-emerald-100/80">
                          Score: {submission.score}/{submission.maxScore} ({percentage}%)
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <Button asChild className="w-full">
                        <Link to={`/assessments/${assessment._id}`}>
                          {attempted ? "View Result" : "Start Assessment"}
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border border-white/10 bg-white/5 shadow-none">
            <CardContent className="flex flex-col items-start gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-cyan-300">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">No assessments available</h2>
                <p className="mt-2 text-sm text-slate-400">
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

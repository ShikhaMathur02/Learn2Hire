import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { VisibleFileInput } from "../components/ui/visible-file-input";

const emptyQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  marks: 1,
});

const AUTHOR_ROLES = new Set(["faculty", "college", "admin"]);

function CreateAssessment() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [viewerRole, setViewerRole] = useState("faculty");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [status, setStatus] = useState("draft");
  const [deliveryMode, setDeliveryMode] = useState("mcq");
  const [questionPaperFile, setQuestionPaperFile] = useState(null);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const totalMarks = useMemo(
    () => questions.reduce((sum, question) => sum + Number(question.marks || 0), 0),
    [questions]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      const role = parsedUser.role;

      if (!AUTHOR_ROLES.has(role)) {
        navigate("/dashboard");
        return;
      }

      setViewerRole(role);
      setAuthChecked(true);
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
    }
  }, [navigate]);

  const updateQuestionField = (index, field, value) => {
    setQuestions((prev) =>
      prev.map((question, idx) =>
        idx === index ? { ...question, [field]: value } : question
      )
    );
  };

  const updateQuestionOption = (questionIndex, optionIndex, value) => {
    setQuestions((prev) =>
      prev.map((question, idx) => {
        if (idx !== questionIndex) return question;

        const nextOptions = [...question.options];
        nextOptions[optionIndex] = value;

        return {
          ...question,
          options: nextOptions,
          correctAnswer:
            question.correctAnswer === question.options[optionIndex]
              ? value
              : question.correctAnswer,
        };
      })
    );
  };

  const addQuestion = () => {
    setQuestions((prev) => [...prev, emptyQuestion()]);
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const validateForm = () => {
    if (!title.trim()) return "Please provide a title.";
    if (deliveryMode === "document") {
      if (!questionPaperFile) return "Please choose a PDF or Word file for the question paper.";
      return "";
    }
    if (deliveryMode === "mcq") {
      if (questions.length === 0) return "Please add at least one question.";
      for (let i = 0; i < questions.length; i += 1) {
        const question = questions[i];
        if (!question.question.trim()) {
          return `Question ${i + 1} needs question text.`;
        }
        if (question.options.some((option) => !option.trim())) {
          return `Question ${i + 1} needs all options filled.`;
        }
        if (!question.correctAnswer.trim()) {
          return `Question ${i + 1} needs a correct answer selected.`;
        }
        if (!question.options.includes(question.correctAnswer)) {
          return `Question ${i + 1} has an invalid correct answer.`;
        }
      }
    }
    return "";
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

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (deliveryMode === "document") {
        const fd = new FormData();
        fd.append("title", title.trim());
        fd.append("description", description.trim());
        fd.append("skill", skill.trim());
        fd.append("status", status);
        if (timeLimit.trim()) {
          fd.append("timeLimit", String(Number(timeLimit)));
        }
        fd.append("questionPaper", questionPaperFile);

        const response = await fetch("/api/assessments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: fd,
        });

        const data = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return;
        }

        if (!response.ok) {
          setError(data.message || "Failed to create assessment.");
          return;
        }

        setSuccess("Assessment created successfully.");
        setTimeout(() => navigate("/dashboard"), 800);
        return;
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        skill: skill.trim(),
        questions: questions.map((question) => ({
          question: question.question.trim(),
          options: question.options.map((option) => option.trim()),
          correctAnswer: question.correctAnswer.trim(),
          marks: Number(question.marks) || 1,
        })),
        status,
      };

      if (timeLimit.trim()) {
        payload.timeLimit = Number(timeLimit);
      }

      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!response.ok) {
        setError(data.message || "Failed to create assessment.");
        return;
      }

      setSuccess("Assessment created successfully.");
      setTimeout(() => navigate("/dashboard"), 800);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-12 w-full rounded-2xl border border-slate-400/35 bg-slate-800/85 px-4 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20";

  const textAreaClassName =
    "w-full rounded-2xl border border-slate-400/35 bg-slate-800/85 px-4 py-3 text-slate-50 outline-none transition placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20";

  const workspaceLabel =
    viewerRole === "college"
      ? "College Workspace"
      : viewerRole === "admin"
        ? "Admin"
        : "Faculty Workspace";

  if (!authChecked) {
    return (
      <div className="l2h-dark-ui flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-slate-200">
        Checking access...
      </div>
    );
  }

  return (
    <div className="l2h-dark-ui min-h-screen bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] px-3 py-5 text-slate-50 sm:px-4 sm:py-6">
      <div className="w-full">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-300">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-slate-200">Create Assessment</span>
            </div>

            <p className="text-sm font-medium text-cyan-200">{workspaceLabel}</p>
            <h1 className="mt-1 text-3xl font-bold text-white">Create Assessment</h1>
            <p className="mt-2 text-sm text-slate-300">
              Build an online MCQ assessment, or publish a PDF / Word question paper students can open
              and download.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Faculty, college, or admin
            </div>
          </div>

          <Button variant="default" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-slate-400/30 bg-slate-800/40 shadow-[0_24px_60px_rgba(2,6,23,0.2)]">
            <CardContent className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Assessment Title
                  </label>
                  <input
                    className={inputClassName}
                    placeholder="e.g. JavaScript Fundamentals Quiz"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Description
                  </label>
                  <textarea
                    className={textAreaClassName}
                    rows={4}
                    placeholder="Add a short description for students."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Skill
                  </label>
                  <input
                    className={inputClassName}
                    placeholder="e.g. JavaScript"
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Time Limit (minutes)
                  </label>
                  <input
                    className={inputClassName}
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Status
                  </label>
                  <select
                    className={inputClassName}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">
                    Delivery
                  </label>
                  <select
                    className={inputClassName}
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value)}
                  >
                    <option value="mcq">Interactive (MCQ in app)</option>
                    <option value="document">Question paper file (PDF / Word)</option>
                  </select>
                </div>

                {deliveryMode === "document" ? (
                  <div className="md:col-span-2">
                    <VisibleFileInput
                      id="create-assessment-question-paper"
                      label="Question paper file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setQuestionPaperFile(e.target.files?.[0] || null)}
                      hint="Students will open or download this file from the assessment page. Online submission is not used for document-only assessments."
                    />
                  </div>
                ) : null}

                <div className="rounded-2xl border border-slate-400/30 bg-slate-800/60 p-4">
                  <p className="text-sm text-slate-300">Summary</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {deliveryMode === "document"
                      ? "Document assessment"
                      : `${questions.length} question${questions.length > 1 ? "s" : ""}`}
                  </p>
                  {deliveryMode === "mcq" ? (
                    <p className="mt-1 text-sm text-slate-300">Total marks: {totalMarks}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {deliveryMode === "mcq" ? (
            <div className="space-y-4">
              {questions.map((question, index) => (
                <Card
                  key={`question-${index + 1}`}
                  className="border border-slate-400/30 bg-slate-800/40 shadow-[0_24px_60px_rgba(2,6,23,0.2)]"
                >
                  <CardContent className="p-6">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-cyan-300">Question {index + 1}</p>
                        <p className="mt-1 text-sm text-slate-300">
                          Add the prompt, options, correct answer, and marks.
                        </p>
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => removeQuestion(index)}
                        disabled={questions.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Question Text
                        </label>
                        <textarea
                          className={textAreaClassName}
                          rows={3}
                          placeholder="Write the question here"
                          value={question.question}
                          onChange={(e) =>
                            updateQuestionField(index, "question", e.target.value)
                          }
                        />
                      </div>

                      {question.options.map((option, optionIndex) => (
                        <div key={`question-${index + 1}-option-${optionIndex + 1}`}>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Option {optionIndex + 1}
                        </label>
                          <input
                            className={inputClassName}
                            placeholder={`Option ${optionIndex + 1}`}
                            value={option}
                            onChange={(e) =>
                              updateQuestionOption(index, optionIndex, e.target.value)
                            }
                          />
                        </div>
                      ))}

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Correct Answer
                        </label>
                        <select
                          className={inputClassName}
                          value={question.correctAnswer}
                          onChange={(e) =>
                            updateQuestionField(index, "correctAnswer", e.target.value)
                          }
                        >
                          <option value="">Select correct answer</option>
                          {question.options.map((option, optionIndex) => (
                            <option
                              key={`correct-${index + 1}-${optionIndex + 1}`}
                              value={option}
                              disabled={!option.trim()}
                            >
                              {option.trim() || `Option ${optionIndex + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-200">
                          Marks
                        </label>
                        <input
                          className={inputClassName}
                          type="number"
                          min="1"
                          value={question.marks}
                          onChange={(e) =>
                            updateQuestionField(index, "marks", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : null}

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {deliveryMode === "mcq" ? (
              <Button type="button" variant="default" onClick={addQuestion}>
                <Plus className="h-4 w-4" />
                Add More
              </Button>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              disabled={loading}
              className="shadow-lg shadow-indigo-600/20"
            >
              {loading ? "Creating Assessment..." : "Create Assessment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateAssessment;


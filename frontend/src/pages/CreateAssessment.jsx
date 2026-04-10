import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Plus, ShieldCheck, Trash2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const emptyQuestion = () => ({
  question: "",
  options: ["", "", "", ""],
  correctAnswer: "",
  marks: 1,
});

function CreateAssessment() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skill, setSkill] = useState("");
  const [timeLimit, setTimeLimit] = useState("");
  const [status, setStatus] = useState("draft");
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

      if (parsedUser.role !== "faculty") {
        navigate("/dashboard");
        return;
      }

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
    "h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  const textAreaClassName =
    "w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10";

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        Checking access...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] px-4 py-5 text-white sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <Link to="/dashboard" className="transition hover:text-white">
                Dashboard
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-slate-300">Create Assessment</span>
            </div>

            <p className="text-sm font-medium text-cyan-300">Faculty Workspace</p>
            <h1 className="mt-1 text-3xl font-bold">Create Assessment</h1>
            <p className="mt-2 text-sm text-slate-400">
              Build a new assessment and publish it to students without changing
              your existing backend API.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
              <ShieldCheck className="h-4 w-4" />
              Faculty only
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(2,6,23,0.25)]">
            <CardContent className="p-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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
                  <label className="mb-2 block text-sm font-medium text-slate-300">
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

                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Summary</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {questions.length} question{questions.length > 1 ? "s" : ""}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Total marks: {totalMarks}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card
                key={`question-${index + 1}`}
                className="border border-white/10 bg-white/5 shadow-[0_24px_60px_rgba(2,6,23,0.25)]"
              >
                <CardContent className="p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-cyan-300">
                        Question {index + 1}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Add the prompt, options, correct answer, and marks.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeQuestion(index)}
                      disabled={questions.length === 1}
                      className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <label className="mb-2 block text-sm font-medium text-slate-300">
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
                        <label className="mb-2 block text-sm font-medium text-slate-300">
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
                      <label className="mb-2 block text-sm font-medium text-slate-300">
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
                      <label className="mb-2 block text-sm font-medium text-slate-300">
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
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
              className="!border-white/15 !bg-white/10 !text-slate-100 hover:!bg-white/20 hover:!text-white"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>

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

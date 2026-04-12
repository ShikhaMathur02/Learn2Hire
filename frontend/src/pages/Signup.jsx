import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronLeft, GraduationCap } from "lucide-react";

import AuthField from "../components/auth/AuthField";
import AuthLayout from "../components/auth/AuthLayout";
import { Button } from "../components/ui/button";
import signupSideImage from "../assets/illustrations/hero-landing.png";
import { notifyAuthChange } from "../lib/authSession";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const passwordCriteriaMessage =
  "Use 8+ characters with uppercase, lowercase, number, and special character.";

const signupSidePanelBullets = [
  "Study materials matched to your program and branch.",
  "Assessments and progress in one student profile.",
  "Roles for students, faculty, colleges, and employers—admins use dedicated accounts.",
];

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [course, setCourse] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** Students complete signup in two steps so the form (and right panel) stay balanced. */
  const [studentStep, setStudentStep] = useState(1);

  useEffect(() => {
    if (role !== "student") setStudentStep(1);
  }, [role]);

  const validate = (includeStudentAcademic = true) => {
    const nextErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Name is required.";
    } else if (name.trim().length < 2) {
      nextErrors.name = "Name should be at least 2 characters.";
    }

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (!strongPasswordPattern.test(password)) {
      nextErrors.password = passwordCriteriaMessage;
    }

    if (!role) {
      nextErrors.role = "Select a role.";
    }

    if (includeStudentAcademic && role === "student") {
      if (!course.trim()) nextErrors.course = "Program is required (e.g. B.Tech).";
      if (!branch.trim()) nextErrors.branch = "Branch is required (e.g. CSE).";
      if (!year.trim()) nextErrors.year = "Year is required (e.g. 4th year).";
      if (!semester.trim()) nextErrors.semester = "Semester is required (e.g. 7th sem).";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goToStudentStep2 = () => {
    setError("");
    if (validate(false)) setStudentStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (role === "student" && studentStep === 1) return;
    if (!validate(true)) return;

    setLoading(true);

    try {
      const payload = { name, email, password, role };
      if (role === "student") {
        payload.course = course.trim();
        payload.branch = branch.trim();
        payload.year = year.trim();
        payload.semester = semester.trim();
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      if (data.data?.requiresApproval && role === "faculty") {
        setError("");
        navigate("/login", {
          state: {
            notice:
              data.message ||
              "Your faculty registration was received. Sign in after a college admin approves your account.",
          },
        });
        return;
      }

      if (!data.data?.token) {
        setError("Signup did not return a session. Please try again or sign in.");
        return;
      }

      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      notifyAuthChange();
      navigate("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50";

  const handlePasswordChange = (value) => {
    setPassword(value);

    setErrors((prev) => {
      if (!value.trim()) {
        if (!prev.password) return prev;
        const nextErrors = { ...prev };
        delete nextErrors.password;
        return nextErrors;
      }

      if (strongPasswordPattern.test(value)) {
        const nextErrors = { ...prev };
        delete nextErrors.password;
        return nextErrors;
      }

      return {
        ...prev,
        password: passwordCriteriaMessage,
      };
    });
  };

  return (
    <AuthLayout
      formMaxWidthClass="max-w-md"
      badge="Create account"
      title="Create your account"
      subtitle="Use your official email. Students add program details on the next step."
      sidePanelImage={signupSideImage}
      sidePanelImageAlt="Learn2Hire platform illustration"
      sidePanelEyebrow="Why Learn2Hire"
      sidePanelHeading="Learning and placements, organized for your campus."
      sidePanelDescription="Keep materials, mocks, and drives in one place—aligned to how your cohort is set up."
      sidePanelBullets={signupSidePanelBullets}
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {role !== "student" || studentStep === 1 ? (
          <>
            <AuthField label="Name" htmlFor="name" error={errors.name}>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => validate(false)}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={loading}
                className={inputClassName}
              />
            </AuthField>

            <AuthField label="Email" htmlFor="email" error={errors.email}>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => validate(false)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className={inputClassName}
              />
            </AuthField>

            <AuthField label="Password" htmlFor="password" error={errors.password}>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => validate(false)}
                placeholder="Create a secure password"
                autoComplete="new-password"
                disabled={loading}
                className={inputClassName}
              />
            </AuthField>

            <AuthField label="Role" htmlFor="role" error={errors.role}>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onBlur={() => validate(false)}
                disabled={loading}
                className={inputClassName}
              >
                <option value="student">Student</option>
                <option value="alumni">Alumni</option>
                <option value="faculty">Faculty</option>
                <option value="college">College</option>
                <option value="company">Company</option>
              </select>
            </AuthField>
          </>
        ) : null}

        {role === "student" && studentStep === 2 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
            <div className="mb-4 flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <GraduationCap className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">Program details</p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Match the labels your faculty use for class materials.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField label="Program" htmlFor="course" error={errors.course}>
                <input
                  id="course"
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  onBlur={() => validate(true)}
                  placeholder="B.Tech, B.E., MCA…"
                  disabled={loading}
                  className={inputClassName}
                />
              </AuthField>
              <AuthField label="Branch" htmlFor="branch" error={errors.branch}>
                <input
                  id="branch"
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  onBlur={() => validate(true)}
                  placeholder="CSE, IT, ECE…"
                  disabled={loading}
                  className={inputClassName}
                />
              </AuthField>
              <AuthField label="Year" htmlFor="year" error={errors.year}>
                <input
                  id="year"
                  type="text"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  onBlur={() => validate(true)}
                  placeholder="e.g. 2, 4th year"
                  disabled={loading}
                  className={inputClassName}
                />
              </AuthField>
              <AuthField label="Semester" htmlFor="semester" error={errors.semester}>
                <input
                  id="semester"
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  onBlur={() => validate(true)}
                  placeholder="e.g. 4, 7th sem"
                  disabled={loading}
                  className={inputClassName}
                />
              </AuthField>
            </div>
          </div>
        ) : null}

        {role === "student" && studentStep === 1 ? (
          <Button
            type="button"
            disabled={loading}
            onClick={goToStudentStep2}
            className="h-11 w-full justify-center rounded-lg text-sm"
          >
            Continue to program details
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : null}

        {role !== "student" || studentStep === 2 ? (
          <div className={role === "student" && studentStep === 2 ? "flex flex-col gap-3 sm:flex-row" : ""}>
            {role === "student" && studentStep === 2 ? (
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setStudentStep(1);
                }}
                className="h-11 shrink-0 justify-center rounded-lg text-sm sm:w-auto sm:px-5"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className={`h-11 justify-center rounded-lg text-sm ${
                role === "student" && studentStep === 2 ? "flex-1" : "w-full"
              }`}
            >
              {loading ? "Creating account..." : "Sign up"}
              {!loading ? <ArrowRight className="h-4 w-4" /> : null}
            </Button>
          </div>
        ) : null}
      </form>
    </AuthLayout>
  );
}

export default Signup;

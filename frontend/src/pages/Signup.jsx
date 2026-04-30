import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, ChevronLeft, GraduationCap, X } from "lucide-react";

import AuthField from "../components/auth/AuthField";
import PasswordInput from "../components/auth/PasswordInput";
import AuthLayout from "../components/auth/AuthLayout";
import { Button } from "../components/ui/button";
import signupSideImage from "../assets/illustrations/hero-landing.png";
import { notifyAuthChange } from "../lib/authSession";
import { COHORT_OTHER } from "../lib/cohortPresets";
import {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "../lib/studentCohortFieldOptions";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const passwordCriteriaMessage =
  "Use 8+ characters with uppercase, lowercase, number, and special character.";

/** Inline SVG chevron for native selects (Tailwind-friendly). */
const selectChevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
};

const signupSidePanelBullets = [
  "Study materials matched to your program and branch.",
  "Assessments and progress in one student profile.",
  "Roles for students, faculty, colleges, and employers—admins use dedicated accounts.",
];

function PasswordRequirementsList({ password }) {
  if (!password.length) return null;

  const rules = [
    { id: "len", label: "At least 8 characters", ok: password.length >= 8 },
    { id: "upper", label: "One uppercase letter (A–Z)", ok: /[A-Z]/.test(password) },
    { id: "lower", label: "One lowercase letter (a–z)", ok: /[a-z]/.test(password) },
    { id: "num", label: "One number (0–9)", ok: /\d/.test(password) },
    { id: "special", label: "One special character (e.g. !@#$%)", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const firstFail = rules.findIndex((r) => !r.ok);
  const visible = firstFail === -1 ? rules : rules.slice(0, firstFail + 1);

  return (
    <ul className="mt-2 space-y-1.5" aria-live="polite">
      {visible.map((r) => (
        <li
          key={r.id}
          className={`flex items-start gap-2 text-xs leading-snug ${r.ok ? "text-emerald-700" : "text-rose-600"}`}
        >
          {r.ok ? (
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          ) : (
            <X className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          )}
          <span>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

function FormAlert({ messages }) {
  if (!messages || messages.length === 0) return null;
  return (
    <div
      id="signup-form-alert"
      role="alert"
      aria-live="assertive"
      className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-900"
    >
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <>
          <p className="font-medium text-rose-950">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {messages.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [course, setCourse] = useState("");
  const [branch, setBranch] = useState("");
  const [branchCustom, setBranchCustom] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  /** Top-of-form messages only (no per-field text — avoids layout shift). */
  const [alertLines, setAlertLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpNotice, setOtpNotice] = useState("");
  const [otpRequestLoading, setOtpRequestLoading] = useState(false);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [studentStep, setStudentStep] = useState(1);
  const [collegeId, setCollegeId] = useState("");
  const [partnerCollegeId, setPartnerCollegeId] = useState("");
  const [colleges, setColleges] = useState([]);
  const [collegesLoading, setCollegesLoading] = useState(true);

  useEffect(() => {
    if (role !== "student") setStudentStep(1);
  }, [role]);

  useEffect(() => {
    const q = searchParams.get("email");
    if (q && typeof q === "string") {
      setEmail(decodeURIComponent(q.trim()));
    }
  }, [searchParams]);

  useEffect(() => {
    setOtpVerified(false);
  }, [email]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCollegesLoading(true);
      try {
        const res = await fetch("/api/auth/approved-colleges?includePending=1", { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && Array.isArray(data.data?.colleges)) {
          setColleges(data.data.colleges);
        } else if (!cancelled) {
          setColleges([]);
        }
      } catch {
        if (!cancelled) setColleges([]);
      } finally {
        if (!cancelled) setCollegesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (role !== "student" && role !== "faculty") {
      setCollegeId("");
    }
    if (role !== "company") {
      setPartnerCollegeId("");
    }
  }, [role]);

  const validate = (includeStudentAcademic = true, requireOtp = false) => {
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

    if (requireOtp) {
      const o = otp.trim();
      if (!/^\d{6}$/.test(o)) {
        nextErrors.otp = "Enter the 6-digit code sent to your email.";
      }
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    } else if (!strongPasswordPattern.test(password)) {
      nextErrors.password = passwordCriteriaMessage;
    }

    if (!role) {
      nextErrors.role = "Select a role.";
    }

    if ((role === "student" || role === "faculty") && !String(collegeId || "").trim()) {
      nextErrors.college = "Select the college you belong to.";
    }

    if (includeStudentAcademic && role === "student") {
      const courseValue = course.trim();
      const branchValue = branch === COHORT_OTHER ? branchCustom.trim() : branch.trim();
      if (!courseValue) nextErrors.course = "Select your program.";
      if (!branchValue) nextErrors.branch = "Select your branch.";
      if (!year.trim()) nextErrors.year = "Select your year.";
      if (!semester.trim()) nextErrors.semester = "Select your semester.";
    }

    const lines = Object.values(nextErrors);
    if (lines.length > 0) {
      setAlertLines(lines);
      return false;
    }
    setAlertLines([]);
    return true;
  };

  const requestSignupOtp = async () => {
    setOtpNotice("");
    setAlertLines([]);
    if (!password.trim() || !strongPasswordPattern.test(password)) {
      setAlertLines(["Choose a valid password first, then request the verification code.", passwordCriteriaMessage]);
      return;
    }
    if (!email.trim() || !emailPattern.test(email)) {
      setAlertLines(["Enter a valid email before requesting a code."]);
      return;
    }
    setOtpRequestLoading(true);
    try {
      const res = await fetch("/api/auth/request-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setAlertLines([
          res.status === 404
            ? "OTP API not found. Restart the backend and open the app from http://localhost:3000."
            : "Unexpected response from the server. Is the API running on port 5000?",
        ]);
        return;
      }
      if (!res.ok) {
        setAlertLines([data.message || "Could not send verification code."]);
        return;
      }
      setAlertLines([]);
      setOtpVerified(false);
      const sentTo = typeof data.sentTo === "string" ? data.sentTo.trim() : "";
      if (data.devCode && /^\d{6}$/.test(String(data.devCode))) {
        setOtp(String(data.devCode));
        setOtpNotice(
          sentTo
            ? `Code sent to ${sentTo}. Debug: ${data.devCode} (OTP_ECHO_TO_CLIENT is on—turn off in production).`
            : `Your verification code is ${data.devCode}. (OTP_ECHO_TO_CLIENT is enabled—disable in production.)`
        );
      } else {
        setOtpNotice(
          data.message ||
            (sentTo ? `Verification code sent to ${sentTo}. Check your inbox.` : "Verification code sent. Check your email.")
        );
      }
    } catch {
      setAlertLines(["Network error. Is the backend running, and are you using http://localhost:3000?"]);
    } finally {
      setOtpRequestLoading(false);
    }
  };

  const verifySignupOtp = async () => {
    setAlertLines([]);
    if (!email.trim() || !emailPattern.test(email)) {
      setAlertLines(["Enter a valid email."]);
      return;
    }
    const o = otp.trim();
    if (!/^\d{6}$/.test(o)) {
      setAlertLines(["Enter the full 6-digit code, then click Verify."]);
      return;
    }
    setOtpVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/verify-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: o }),
      });
      const raw = await res.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        setAlertLines(["Could not read server response. Try again."]);
        setOtpVerified(false);
        return;
      }
      if (!res.ok) {
        setOtpVerified(false);
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : "Wrong verification code. Check the code and try again.";
        setAlertLines([msg]);
        queueMicrotask(() =>
          document.getElementById("signup-form-alert")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        );
        return;
      }
      setAlertLines([]);
      setOtpVerified(true);
    } catch {
      setOtpVerified(false);
      setAlertLines(["Network error while verifying."]);
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const goToStudentStep2 = () => {
    setAlertLines([]);
    if (!otpVerified) {
      setAlertLines(["Click Verify to confirm your email code before continuing."]);
      return;
    }
    if (validate(false, true)) setStudentStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlertLines([]);

    if (!otpVerified) {
      setAlertLines(["Click Verify to confirm your email code before signing up."]);
      return;
    }

    if (role === "student" && studentStep === 1) return;
    const includeAcademic = role === "student";
    if (!validate(includeAcademic, true)) return;

    setLoading(true);

    try {
      const payload = { name, email, password, role, otp: otp.trim() };
      if (role === "student" || role === "faculty") {
        payload.collegeId = collegeId.trim();
      }
      if (role === "student") {
        payload.course = course.trim();
        payload.branch = branch === COHORT_OTHER ? branchCustom.trim() : branch.trim();
        payload.year = year.trim();
        payload.semester = semester.trim();
      }

      if (role === "company" && partnerCollegeId.trim()) {
        payload.partnerCollegeId = partnerCollegeId.trim();
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          typeof data.message === "string" && data.message.trim()
            ? data.message.trim()
            : "Signup failed.";
        setAlertLines([msg]);
        queueMicrotask(() =>
          document.getElementById("signup-form-alert")?.scrollIntoView({ behavior: "smooth", block: "nearest" })
        );
        return;
      }

      if (data.data?.requiresApproval && role === "student") {
        setAlertLines([]);
        navigate("/login", {
          state: {
            notice:
              data.message ||
              "Your student registration was received. Your college, an approved faculty member on your campus, or a Learn2Hire administrator must approve your account before you can sign in.",
          },
        });
        return;
      }

      if (data.data?.requiresApproval && role === "faculty") {
        setAlertLines([]);
        navigate("/login", {
          state: {
            notice:
              data.message ||
              "Your faculty registration was received. Your college or a Learn2Hire administrator must approve your account before you can sign in.",
          },
        });
        return;
      }

      if (data.data?.requiresApproval && role === "company") {
        setAlertLines([]);
        navigate("/login", {
          state: {
            notice:
              data.message ||
              "Your company registration was received. If you chose a partner campus, that college or a Learn2Hire administrator can approve your account; otherwise only an administrator can approve it.",
          },
        });
        return;
      }

      if (data.data?.requiresApproval && role === "college") {
        setAlertLines([]);
        navigate("/login", {
          state: {
            notice:
              data.message ||
              "Your college registration was received. A platform administrator will approve it before you can sign in.",
          },
        });
        return;
      }

      if (!data.data?.token) {
        setAlertLines(["Signup did not return a session. Please try again or sign in."]);
        return;
      }

      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      notifyAuthChange();
      navigate("/dashboard");
    } catch (err) {
      setAlertLines(["Something went wrong. Please try again."]);
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50";

  const selectClassName = `${inputClassName} appearance-none bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat pr-9`;

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
      sidePanelDescription="Keep materials, mocks, and drives in one place—aligned to how your course is set up."
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
        <FormAlert messages={alertLines} />

        {role !== "student" || studentStep === 1 ? (
          <>
            <AuthField label="Name" htmlFor="name">
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={loading}
                className={inputClassName}
              />
            </AuthField>

            <AuthField label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={loading}
                className={inputClassName}
              />
            </AuthField>

            <AuthField label="Password" htmlFor="password">
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
                autoComplete="new-password"
                disabled={loading}
                className={inputClassName}
              />
              <PasswordRequirementsList password={password} />
            </AuthField>

            <AuthField label="Role" htmlFor="role">
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
                className={selectClassName}
                style={selectChevronStyle}
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="college">College</option>
                <option value="company">Company</option>
              </select>
            </AuthField>

            {role === "student" || role === "faculty" ? (
              <AuthField label="College" htmlFor="collegeId">
                <select
                  id="collegeId"
                  value={collegeId}
                  onChange={(e) => setCollegeId(e.target.value)}
                  disabled={loading || collegesLoading}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="">
                    {collegesLoading ? "Loading colleges…" : "Select your college"}
                  </option>
                  {colleges.map((c) => {
                    const pending = c.collegeApprovalStatus === "pending";
                    return (
                      <option key={c.id} value={c.id} disabled={pending}>
                        {pending ? `${c.name} (awaiting platform approval)` : c.name}
                      </option>
                    );
                  })}
                </select>
                {!collegesLoading && colleges.length === 0 ? (
                  <p className="mt-1.5 text-xs text-amber-800">
                    No colleges are listed yet. A college can register on this page; after a platform admin approves it,
                    students and faculty can select it here.
                  </p>
                ) : null}
                {!collegesLoading &&
                colleges.length > 0 &&
                !colleges.some((c) => c.collegeApprovalStatus !== "pending") ? (
                  <p className="mt-1.5 text-xs text-slate-600">
                    Every campus below is still awaiting platform approval. You can sign up as soon as an administrator
                    approves your college.
                  </p>
                ) : null}
              </AuthField>
            ) : null}

            {role === "company" ? (
              <AuthField label="Partner campus (optional)" htmlFor="partnerCollegeId">
                <select
                  id="partnerCollegeId"
                  value={partnerCollegeId}
                  onChange={(e) => setPartnerCollegeId(e.target.value)}
                  disabled={loading || collegesLoading}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="">No specific campus (platform admin approval only)</option>
                  {colleges.map((c) => {
                    const pending = c.collegeApprovalStatus === "pending";
                    return (
                      <option key={c.id} value={c.id} disabled={pending}>
                        {pending ? `${c.name} (awaiting platform approval)` : c.name}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 text-xs text-slate-600">
                  Select a campus if you plan to hire or collaborate mainly there—either that college or a platform
                  admin can approve your company.
                </p>
              </AuthField>
            ) : null}

            <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3.5 py-3">
              <p className="mb-3 text-xs font-medium text-slate-700">Verify your email</p>
              <AuthField label="Email verification code" htmlFor="otp">
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setOtpVerified(false);
                  }}
                  placeholder="6-digit code"
                  disabled={loading}
                  className={inputClassName}
                />
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={
                      loading ||
                      otpRequestLoading ||
                      !email.trim() ||
                      !emailPattern.test(email) ||
                      !password.trim() ||
                      !strongPasswordPattern.test(password)
                    }
                    onClick={requestSignupOtp}
                    className="h-11 shrink-0 justify-center rounded-lg text-sm sm:min-w-[9rem]"
                  >
                    {otpRequestLoading ? "Sending…" : "Send code"}
                  </Button>
                  <Button
                    type="button"
                    variant="success"
                    disabled={
                      loading ||
                      otpVerifyLoading ||
                      !/^\d{6}$/.test(otp.trim()) ||
                      !email.trim() ||
                      !emailPattern.test(email)
                    }
                    onClick={verifySignupOtp}
                    className="h-11 shrink-0 justify-center rounded-lg text-sm sm:min-w-[9rem]"
                  >
                    {otpVerifyLoading ? "Checking…" : "Verify"}
                  </Button>
                </div>
              </AuthField>
              {otpVerified ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Code verified with the server—you can continue or sign up.
                </p>
              ) : null}
              {otpNotice ? <p className="mt-2 text-xs text-emerald-800">{otpNotice}</p> : null}
              {!otpNotice && !otpVerified ? (
                <p className="mt-2 text-xs text-slate-600">
                  Send a code to your email, enter all six digits, then click Verify to confirm before you sign up.
                </p>
              ) : null}
            </div>
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
                  Choose your program, branch, year, and semester from the lists below.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField label="Program" htmlFor="course">
                <select
                  id="course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  disabled={loading}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="">Select program</option>
                  {STUDENT_COHORT_PROGRAM_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </AuthField>
              <AuthField label="Branch" htmlFor="branch">
                <select
                  id="branch"
                  value={branch}
                  onChange={(e) => {
                    const v = e.target.value;
                    setBranch(v);
                    if (v !== COHORT_OTHER) setBranchCustom("");
                  }}
                  disabled={loading}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="">Select branch</option>
                  {STUDENT_COHORT_BRANCH_OPTIONS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  <option value={COHORT_OTHER}>Other…</option>
                </select>
                {branch === COHORT_OTHER ? (
                  <input
                    id="branch-custom"
                    type="text"
                    value={branchCustom}
                    onChange={(e) => setBranchCustom(e.target.value)}
                    disabled={loading}
                    placeholder="Type your branch"
                    className={`${selectClassName} mt-2`}
                    style={selectChevronStyle}
                    autoComplete="off"
                  />
                ) : null}
              </AuthField>
              <AuthField label="Year" htmlFor="year">
                <select
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  disabled={loading}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="">Select year</option>
                  {STUDENT_COHORT_YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </AuthField>
              <AuthField label="Semester" htmlFor="semester">
                <select
                  id="semester"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  disabled={loading}
                  className={selectClassName}
                  style={selectChevronStyle}
                >
                  <option value="">Select semester</option>
                  {STUDENT_COHORT_SEMESTER_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </AuthField>
            </div>
          </div>
        ) : null}

        {role === "student" && studentStep === 1 ? (
          <Button
            type="button"
            disabled={loading || !otpVerified}
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
                  setAlertLines([]);
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

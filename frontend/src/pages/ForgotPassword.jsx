import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft } from "lucide-react";

import AuthField from "../components/auth/AuthField";
import AuthLayout from "../components/auth/AuthLayout";
import PasswordInput from "../components/auth/PasswordInput";
import { Button } from "../components/ui/button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const passwordCriteriaMessage =
  "Use 8+ characters with uppercase, lowercase, number, and special character.";

function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const fromQuery = searchParams.get("email");
    if (fromQuery && typeof fromQuery === "string") {
      setEmail(decodeURIComponent(fromQuery.trim()));
    }
  }, [searchParams]);

  const inputClassName =
    "h-11 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50";

  const requestCode = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim() || !emailPattern.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setRequestLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Could not send reset code.");
        return;
      }

      if (data.sentTo) {
        setCodeSent(true);
      }
      setNotice(
        data.sentTo
          ? `${data.message || "Check your email for the code."} The message includes a link to this page.`
          : data.message ||
              "If an account exists for that email, we sent a verification code. Check your inbox and spam folder."
      );
      if (data.devCode) {
        setNotice((prev) => `${prev} (Dev: code is ${data.devCode})`);
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setRequestLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (!email.trim() || !emailPattern.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (!/^\d{6}$/.test(String(otp || "").trim())) {
      setError("Enter the 6-digit code from your email.");
      return;
    }
    if (!strongPasswordPattern.test(newPassword)) {
      setError(passwordCriteriaMessage);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || "Could not reset password.");
        return;
      }

      navigate("/login", {
        replace: true,
        state: {
          notice: data.message || "Password updated. Sign in with your new password.",
        },
      });
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <AuthLayout
      badge="Reset password"
      title="Forgot your password?"
      subtitle="For student, faculty, and college accounts. We email a 6-digit code and a link back to this page."
      footer={
        <p>
          Remember your password?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-4">
        <Link
          to="/login"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-indigo-600"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
          Back to sign in
        </Link>
      </div>

      {notice ? (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <form onSubmit={requestCode} className="space-y-4">
        <AuthField label="Email" htmlFor="fp-email">
          <input
            id="fp-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={requestLoading || resetLoading}
            className={inputClassName}
          />
        </AuthField>

        <Button
          type="submit"
          disabled={requestLoading || resetLoading}
          className="h-11 w-full justify-center rounded-lg text-sm"
        >
          {requestLoading ? "Sending…" : codeSent ? "Resend code" : "Send verification code"}
          {!requestLoading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center" aria-hidden>
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-500">Then set a new password</span>
        </div>
      </div>

      <form onSubmit={resetPassword} className="space-y-4">
        <AuthField label="Verification code" htmlFor="fp-otp">
          <input
            id="fp-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            disabled={resetLoading}
            className={inputClassName}
          />
        </AuthField>

        <AuthField label="New password" htmlFor="fp-new">
          <PasswordInput
            id="fp-new"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            disabled={resetLoading}
            className={inputClassName}
          />
        </AuthField>

        <AuthField label="Confirm new password" htmlFor="fp-confirm">
          <PasswordInput
            id="fp-confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            autoComplete="new-password"
            disabled={resetLoading}
            className={inputClassName}
          />
        </AuthField>

        <p className="text-xs text-slate-500">{passwordCriteriaMessage}</p>

        <Button
          type="submit"
          disabled={resetLoading}
          className="h-11 w-full justify-center rounded-lg text-sm"
        >
          {resetLoading ? "Updating…" : "Update password"}
          {!resetLoading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;

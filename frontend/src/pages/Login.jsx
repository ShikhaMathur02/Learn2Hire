import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import AuthField from "../components/auth/AuthField";
import AuthLayout from "../components/auth/AuthLayout";
import { Button } from "../components/ui/button";
import { notifyAuthChange } from "../lib/authSession";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const n = location.state?.notice;
    if (typeof n === "string" && n.trim()) {
      setNotice(n.trim());
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const validate = () => {
    const nextErrors = {};

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(email)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed");
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

  return (
    <AuthLayout
      badge="Sign in"
      title="Sign in to your account"
      subtitle="Use the email and password for your Learn2Hire account."
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {notice ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
            {notice}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        <AuthField label="Email" htmlFor="email" error={errors.email}>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={validate}
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
            onChange={(e) => setPassword(e.target.value)}
            onBlur={validate}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={loading}
            className={inputClassName}
          />
        </AuthField>

        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full justify-center rounded-lg text-sm"
        >
          {loading ? "Signing in..." : "Sign in"}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Login;

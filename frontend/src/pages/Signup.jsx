import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import AuthField from "../components/auth/AuthField";
import AuthLayout from "../components/auth/AuthLayout";
import { Button } from "../components/ui/button";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const validate = () => {
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
    } else if (password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (!role) {
      nextErrors.role = "Select a role.";
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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }

      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(data.data.user));
      navigate("/dashboard");
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100";

  return (
    <AuthLayout
      badge="Create Account"
      title="Create your Learn2Hire account"
      subtitle="Set up your workspace to start tracking skills, assessments, and placement readiness."
      footer={
        <p>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Login
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <AuthField label="Name" htmlFor="name" error={errors.name}>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={validate}
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
            onBlur={validate}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading}
            className={inputClassName}
          />
        </AuthField>

        <AuthField label="Password" htmlFor="password" error={errors.password} hint="Minimum 6 characters">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={validate}
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
            onBlur={validate}
            disabled={loading}
            className={inputClassName}
          >
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
          </select>
        </AuthField>

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full justify-center rounded-2xl text-sm shadow-lg shadow-indigo-600/20"
        >
          {loading ? "Creating account..." : "Sign up"}
          {!loading ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default Signup;

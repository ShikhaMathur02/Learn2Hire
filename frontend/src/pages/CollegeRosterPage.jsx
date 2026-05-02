import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CollegeDashboard from "../components/college-dashboard/CollegeDashboard";
import { clearAuthSession } from "../lib/authSession";

export default function CollegeRosterPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (String(parsed?.role).toLowerCase() !== "college") {
        navigate("/dashboard", { replace: true });
        return;
      }
      setUser(parsed);
    } catch {
      clearAuthSession();
      navigate("/login", { replace: true });
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] text-slate-600">
        Loading your list…
      </div>
    );
  }

  return <CollegeDashboard user={user} onLogout={handleLogout} campusDirectoryPage />;
}

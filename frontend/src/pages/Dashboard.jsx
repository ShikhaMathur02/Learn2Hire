import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import AdminDashboard from "../components/admin-dashboard/AdminDashboard";
import CollegeDashboard from "../components/college-dashboard/CollegeDashboard";
import CompanyDashboard from "../components/company-dashboard/CompanyDashboard";
import FacultyDashboard from "../components/faculty-dashboard/FacultyDashboard";
import StudentDashboard from "../components/student-dashboard/StudentDashboard";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../components/dashboard/DashboardTopNav";
import { Card, CardContent } from "../components/ui/card";
import { clearAuthSession } from "../lib/authSession";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login");
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      clearAuthSession();
      navigate("/login");
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
      <div className="l2h-dark-ui flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        Loading...
      </div>
    );
  }

  if (user.role === "student") {
    return <StudentDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "faculty") {
    return <FacultyDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "company") {
    return <CompanyDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "college") {
    return <CollegeDashboard user={user} onLogout={handleLogout} />;
  }

  if (user.role === "admin") {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="l2h-dark-ui min-h-screen bg-[radial-gradient(circle_at_top_left,#6366f1_0%,#4b5e8a_38%,#334155_100%)] text-white">
      <div className="w-full px-3 py-5 sm:px-4 sm:py-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Dashboard"
          title={`Welcome, ${user.name}`}
          description={`You are logged in as ${user.role}.`}
          user={{ name: user.name, email: user.email, role: user.role }}
          onLogout={handleLogout}
        />
        <div className="mt-4 rounded-[32px] border border-white/10 bg-slate-950/45 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur">
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-5 sm:p-8">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-semibold text-white">Workspace setup in progress</h2>
                <p className="mt-2 text-slate-400">
                  A dedicated dashboard for the <span className="capitalize">{user.role}</span>{" "}
                  role is not added yet. Your account is working correctly, and you can log in with
                  this role now.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;


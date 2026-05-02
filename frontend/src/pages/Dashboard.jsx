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
import { workspaceRootProps } from "../lib/workspaceTheme";

function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] text-slate-600">
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
    <div {...workspaceRootProps(user.role, "min-h-screen")}>
      <div className="l2h-container-app w-full py-5 sm:py-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Dashboard"
          title={`Welcome, ${user.name}`}
          description={`You are logged in as ${user.role}.`}
          user={{ name: user.name, email: user.email, role: user.role }}
          onLogout={handleLogout}
        />
        <div className="mt-6 rounded-[10px] border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-[var(--surface-elevated)] sm:p-8">
          <Card className="border-0 bg-transparent shadow-none">
            <CardContent className="p-0 sm:p-2">
              <div className="rounded-[10px] border border-[var(--border)] bg-slate-50/80 px-6 py-5">
                <h2 className="text-xl font-semibold text-slate-900">Workspace setup in progress</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
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


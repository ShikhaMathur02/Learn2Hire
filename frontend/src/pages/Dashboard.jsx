import { useEffect, useState } from "react";
import { BriefcaseBusiness } from "lucide-react";
import { useNavigate } from "react-router-dom";

import AdminDashboard from "../components/admin-dashboard/AdminDashboard";
import CollegeDashboard from "../components/college-dashboard/CollegeDashboard";
import CompanyDashboard from "../components/company-dashboard/CompanyDashboard";
import FacultyDashboard from "../components/faculty-dashboard/FacultyDashboard";
import StudentDashboard from "../components/student-dashboard/StudentDashboard";
import { DashboardTopNav } from "../components/dashboard/DashboardTopNav";
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
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
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

  if (user.role === "alumni") {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardTopNav
          theme="light"
          className="mb-0 border-slate-200/90 bg-white shadow-sm shadow-slate-200/40"
          workspaceLabel="Alumni"
          title={`Welcome, ${user.name}`}
          description="Browse open company roles and track your applications from Learn2Hire."
          user={{ name: user.name, email: user.email, role: user.role }}
          onLogout={handleLogout}
          actions={
            <DashboardTopNav.ToolbarLink to="/jobs" icon={BriefcaseBusiness} theme="light">
              Browse jobs
            </DashboardTopNav.ToolbarLink>
          }
        />
        <div className="w-full px-3 py-8 sm:px-4">
          <Card className="border border-slate-200/80 shadow-sm">
            <CardContent className="p-8">
              <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Career Opportunities</h2>
                <p className="mt-2 text-slate-600">
                  Your alumni account now has access to the jobs workspace. Open the jobs page to
                  review company openings and apply directly.
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Learning Hub</h2>
                <p className="mt-2 text-slate-600">
                  Your alumni account can open the public learning hub to read study materials and
                  placement preparation content.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardTopNav
        theme="light"
        className="mb-0 border-slate-200/90 bg-white shadow-sm shadow-slate-200/40"
        workspaceLabel="Dashboard"
        title={`Welcome, ${user.name}`}
        description={`You are logged in as ${user.role}.`}
        user={{ name: user.name, email: user.email, role: user.role }}
        onLogout={handleLogout}
      />
      <div className="w-full px-3 py-8 sm:px-4">
        <Card className="border border-slate-200/80 shadow-sm">
          <CardContent className="p-8">
            <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Workspace setup in progress</h2>
              <p className="mt-2 text-slate-600">
                A dedicated dashboard for the <span className="capitalize">{user.role}</span> role
                is not added yet. Your account is working correctly, and you can log in with this
                role now.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import AdminDashboard from "../components/admin-dashboard/AdminDashboard";
import CollegeDashboard from "../components/college-dashboard/CollegeDashboard";
import CompanyDashboard from "../components/company-dashboard/CompanyDashboard";
import FacultyDashboard from "../components/faculty-dashboard/FacultyDashboard";
import StudentDashboard from "../components/student-dashboard/StudentDashboard";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

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
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      navigate("/login");
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
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
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-5xl">
          <Card className="border-0">
            <CardContent className="p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Alumni Dashboard</p>
                  <h1 className="mt-1 text-3xl font-bold text-slate-900">
                    Welcome, {user.name}
                  </h1>
                  <p className="mt-2 text-slate-600">
                    Browse open company roles and track your applications from Learn2Hire.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button asChild variant="outline">
                    <Link to="/notifications">
                      <Bell className="h-4 w-4" />
                      Notifications
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/learn">Browse Learning</Link>
                  </Button>
                  <Button asChild>
                    <Link to="/jobs">Browse Jobs</Link>
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <h2 className="text-xl font-semibold text-slate-900">Career Opportunities</h2>
                <p className="mt-2 text-slate-600">
                  Your alumni account now has access to the jobs workspace. Open the jobs page to
                  review company openings and apply directly.
                </p>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl">
        <Card className="border-0">
          <CardContent className="p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">Dashboard</p>
                <h1 className="mt-1 text-3xl font-bold text-slate-900">
                  Welcome, {user.name}
                </h1>
                <p className="mt-2 text-slate-600">
                  You are logged in as <span className="capitalize">{user.role}</span>.
                </p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6">
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

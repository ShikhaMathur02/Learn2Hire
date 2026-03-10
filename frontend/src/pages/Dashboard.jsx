import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

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

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <StudentDashboard user={user} onLogout={handleLogout} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;

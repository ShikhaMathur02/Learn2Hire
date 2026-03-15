import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  ClipboardCheck,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";

function MetricCard({ title, value, subtitle, icon: Icon }) {
  return (
    <Card className="border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(2,6,23,0.25)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-400">{title}</p>
            <h3 className="mt-3 text-3xl font-bold text-white">{value}</h3>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-cyan-300">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const roleOptions = ["student", "alumni", "faculty", "company", "admin"];

function AdminDashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState({
    totals: {
      totalUsers: 0,
      totalProfiles: 0,
      totalAssessments: 0,
      totalSubmissions: 0,
      totalJobs: 0,
      totalApplications: 0,
    },
    roles: {
      student: 0,
      alumni: 0,
      faculty: 0,
      company: 0,
      admin: 0,
    },
    recentUsers: [],
  });
  const [users, setUsers] = useState([]);
  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [analyticsRes, usersRes] = await Promise.all([
        fetch("/api/admin/analytics", { headers }),
        fetch("/api/admin/users", { headers }),
      ]);

      const [analyticsData, usersData] = await Promise.all([
        readApiResponse(
          analyticsRes,
          "Admin API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          usersRes,
          "Admin API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
      ]);

      if (analyticsRes.status === 401 || usersRes.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!analyticsRes.ok) {
        throw new Error(analyticsData.message || "Failed to load analytics.");
      }

      if (!usersRes.ok) {
        throw new Error(usersData.message || "Failed to load users.");
      }

      setAnalytics(
        analyticsData.data || {
          totals: {
            totalUsers: 0,
            totalProfiles: 0,
            totalAssessments: 0,
            totalSubmissions: 0,
            totalJobs: 0,
            totalApplications: 0,
          },
          roles: {
            student: 0,
            alumni: 0,
            faculty: 0,
            company: 0,
            admin: 0,
          },
          recentUsers: [],
        }
      );
      const nextUsers = usersData.data?.users || [];
      setUsers(nextUsers);
      setRoleDrafts(
        Object.fromEntries(nextUsers.map((currentUser) => [currentUser._id, currentUser.role]))
      );
    } catch (err) {
      setError(err.message || "Unable to load admin dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const recentUsers = useMemo(() => users.slice(0, 8), [users]);

  const handleRoleUpdate = async (userId) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const role = roleDrafts[userId];
    if (!role) return;

    setUpdatingUserId(userId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await readApiResponse(
        response,
        "Admin API returned HTML instead of JSON. Restart the backend server and refresh the page."
      );

      if (!response.ok) {
        throw new Error(data.message || "Failed to update user role.");
      }

      setSuccess("User role updated successfully.");
      await fetchDashboard();
    } catch (err) {
      setError(err.message || "Unable to update role.");
    } finally {
      setUpdatingUserId("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-slate-300">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading admin dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#312e81_0%,#0f172a_45%,#020617_100%)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-slate-950/45 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur xl:p-8">
          <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-cyan-300">Admin Workspace</p>
              <h1 className="mt-2 text-3xl font-bold">Platform Control Center</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Track platform analytics, monitor user distribution, and manage account roles from
                one place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/notifications">
                  <Bell className="h-4 w-4" />
                  Notifications
                </Link>
              </Button>
              <Button asChild>
                <Link to="/admin/jobs">Manage Jobs</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                Go to Home
              </Button>
              <Button
                variant="outline"
                onClick={onLogout}
                className="border-white/15 text-slate-200 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {success ? (
            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              {success}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Total Users"
              value={analytics.totals.totalUsers}
              subtitle="All registered Learn2Hire accounts"
              icon={Users}
            />
            <MetricCard
              title="Assessments"
              value={analytics.totals.totalAssessments}
              subtitle="Published and draft assessments"
              icon={ClipboardCheck}
            />
            <MetricCard
              title="Jobs"
              value={analytics.totals.totalJobs}
              subtitle="Company roles created on the platform"
              icon={Workflow}
            />
            <MetricCard
              title="Applications"
              value={analytics.totals.totalApplications}
              subtitle="Student and alumni job applications"
              icon={BarChart3}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-6 w-6 text-cyan-300" />
                  <div>
                    <h2 className="text-2xl font-bold text-white">Role Breakdown</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Current distribution of account types across the platform.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  {roleOptions.map((role) => (
                    <div
                      key={role}
                      className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm text-slate-400 capitalize">{role}</p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {analytics.roles[role] || 0}
                          </p>
                        </div>
                        <span className="rounded-full bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-300">
                          users
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-400">Administrator</p>
                  <p className="mt-2 text-lg font-semibold text-white">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-white/5 shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Review recent users and update role assignments when needed.
                </p>

                <div className="mt-6 space-y-4">
                  {recentUsers.length ? (
                    recentUsers.map((currentUser) => (
                      <div
                        key={currentUser._id}
                        className="rounded-2xl border border-white/10 bg-slate-900/60 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <h3 className="font-semibold text-white">{currentUser.name}</h3>
                            <p className="mt-1 text-sm text-slate-400">{currentUser.email}</p>
                            <p className="mt-2 text-xs text-slate-500">
                              Joined {new Date(currentUser.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <select
                              value={roleDrafts[currentUser._id] || currentUser.role}
                              onChange={(e) =>
                                setRoleDrafts((prev) => ({
                                  ...prev,
                                  [currentUser._id]: e.target.value,
                                }))
                              }
                              disabled={updatingUserId === currentUser._id}
                              className="h-11 rounded-2xl border border-white/10 bg-slate-950/70 px-4 text-sm text-white outline-none focus:border-cyan-400"
                            >
                              {roleOptions.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                            <Button
                              onClick={() => handleRoleUpdate(currentUser._id)}
                              disabled={updatingUserId === currentUser._id}
                            >
                              {updatingUserId === currentUser._id ? "Saving..." : "Save Role"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-slate-900/40 p-6 text-sm text-slate-400">
                      No users found yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;

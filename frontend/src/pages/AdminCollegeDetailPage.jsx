import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  GraduationCap,
  LoaderCircle,
  Trash2,
  Users,
} from "lucide-react";

import { readApiResponse } from "../lib/api";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../components/dashboard/DashboardTopNav";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { workspaceRootProps } from "../lib/workspaceTheme";

function formatStatus(c) {
  const s = c?.collegeApprovalStatus;
  if (s === "pending") return "Pending approval";
  if (s === "rejected") return "Rejected";
  return "Approved";
}

function AdminCollegeDetailPage() {
  const { collegeId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!localStorage.getItem("user") || !raw) {
      navigate("/login", { replace: true });
      return;
    }
    try {
      const u = JSON.parse(raw);
      if (u.role !== "admin") {
        navigate("/dashboard", { replace: true });
        return;
      }
      setUser(u);
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const load = useCallback(async () => {
    if (!localStorage.getItem("user") || !collegeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}`, {
        cache: "no-store",
        headers: {},
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Could not load campus.");
      }
      setDetail(data.data || null);
    } catch (e) {
      setError(e.message || "Failed to load.");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [collegeId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Delete this college login permanently? Students and faculty stay on the platform but will no longer be linked to this campus. Any assessments created by this college account will be removed. Continue?"
      )
    ) {
      return;
    }
    if (!localStorage.getItem("user")) {
      navigate("/login");
      return;
    }
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/colleges/${collegeId}`, {
        method: "DELETE",
        headers: {},
      });
      const data = await readApiResponse(res);
      if (!res.ok) {
        throw new Error(data.message || "Delete failed.");
      }
      setSuccess(data.message || "College removed.");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <div {...workspaceRootProps("admin", "flex min-h-screen items-center justify-center text-slate-600")}>
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const college = detail?.college;
  const stats = detail?.stats;
  const students = detail?.students || [];
  const faculty = detail?.faculty || [];
  const campusAssessments = detail?.campusAssessments || [];

  return (
    <div {...workspaceRootProps("admin", "min-h-screen")}>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Admin · Campus"
          title={college?.name || "Campus profile"}
          description={
            college
              ? `${college.email} · ${formatStatus(college)}`
              : "Loading campus record…"
          }
          user={{ name: user.name, email: user.email, role: user.role }}
          showHistoryBack
          onLogout={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            navigate("/login");
          }}
          actionItems={[
            {
              label: "Back to admin dashboard",
              onClick: () => navigate("/dashboard"),
              icon: ArrowLeft,
            },
          ]}
        />

        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-950">
            {success}
          </div>
        ) : null}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-[var(--text-muted)]">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            Loading campus data…
          </div>
        ) : !college ? (
          <p className="text-slate-400">No campus data.</p>
        ) : (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[var(--text)]">{college.name}</h1>
                <p className="mt-1 text-slate-400">{college.email}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Registered {college.createdAt ? new Date(college.createdAt).toLocaleString() : "—"}
                  {college.updatedAt && college.updatedAt !== college.createdAt
                    ? ` · Updated ${new Date(college.updatedAt).toLocaleString()}`
                    : ""}
                </p>
                <p className="mt-2 text-sm font-medium capitalize text-amber-900">
                  Platform status: {formatStatus(college)}
                </p>
              </div>
              <Button
                type="button"
                variant="destructive"
                className="shrink-0 gap-2"
                disabled={deleting}
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? "Removing…" : "Delete campus account"}
              </Button>
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Students</p>
                    <p className="text-2xl font-bold">{stats?.studentCount ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)]">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Faculty</p>
                    <p className="text-2xl font-bold">{stats?.facultyCount ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-800">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Faculty pending</p>
                    <p className="text-2xl font-bold">{stats?.pendingFacultyCount ?? 0}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="mb-6 border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Assessments (this campus)</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Created by this college account or faculty linked to this campus.
                    </p>
                  </div>
                  <Link
                    to="/assessments/create"
                    className="shrink-0 text-sm font-medium text-[var(--primary)] underline hover:text-[var(--primary-dark)]"
                  >
                    Create assessment
                  </Link>
                </div>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Title</th>
                        <th className="px-3 py-2">Creator</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Updated</th>
                        <th className="px-3 py-2">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campusAssessments.length ? (
                        campusAssessments.map((a) => (
                          <tr key={a._id} className="border-t border-slate-200">
                            <td className="px-3 py-2 font-medium text-slate-900">{a.title}</td>
                            <td className="px-3 py-2 text-xs text-slate-400">
                              {a.createdBy?.name || "—"}{" "}
                              <span className="text-slate-500">({a.createdBy?.role || "—"})</span>
                            </td>
                            <td className="px-3 py-2 capitalize text-slate-700">{a.status}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Link
                                to={`/assessments/${a._id}`}
                                className="text-xs font-medium text-[var(--primary)] underline"
                              >
                                View
                              </Link>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                            No assessments from this campus yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-900">Students linked to this campus</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Sign-ups or roster imports that reference this college.
                </p>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Program / course</th>
                        <th className="px-3 py-2">Contact</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.length ? (
                        students.map((s) => {
                          const p = s.profile;
                          const cohort = p
                            ? [p.course, p.branch, p.year, p.semester].filter(Boolean).join(" · ")
                            : "—";
                          return (
                            <tr key={s._id} className="border-t border-slate-200">
                              <td className="px-3 py-2 text-slate-900">{s.name}</td>
                              <td className="px-3 py-2 text-slate-400">{s.email}</td>
                              <td className="px-3 py-2 text-slate-700">{cohort || "—"}</td>
                              <td className="px-3 py-2 text-xs text-slate-400">
                                {p?.studentPhone || p?.city || "—"}
                              </td>
                              <td className="px-3 py-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-9 min-w-[8rem] justify-center text-xs"
                                  onClick={() => navigate(`/dashboard/learners/${s._id}`)}
                                >
                                  View profile
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                            No students are linked to this campus.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-lg font-bold text-slate-900">Faculty linked to this campus</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Includes pending approvals that selected this institution at signup.
                </p>
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Approval</th>
                        <th className="px-3 py-2">Joined</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faculty.length ? (
                        faculty.map((f) => (
                          <tr key={f._id} className="border-t border-slate-200">
                            <td className="px-3 py-2 text-slate-900">{f.name}</td>
                            <td className="px-3 py-2 text-slate-400">{f.email}</td>
                            <td className="px-3 py-2 capitalize text-slate-700">
                              {f.facultyApprovalStatus || "approved"}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {f.createdAt ? new Date(f.createdAt).toLocaleString() : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 min-w-[8rem] justify-center text-xs"
                                onClick={() => navigate(`/dashboard/learners/${f._id}`)}
                              >
                                View profile
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                            No faculty linked to this campus.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

export default AdminCollegeDetailPage;


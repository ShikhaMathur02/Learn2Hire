import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Factory,
  GraduationCap,
  LoaderCircle,
  Trash2,
  UserRound,
} from "lucide-react";

import { readApiResponse } from "../lib/api";
import { digitsOnly, validateStudentProfileExtraFields } from "../lib/studentProfileValidation";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../components/dashboard/DashboardTopNav";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { workspaceRootProps } from "../lib/workspaceTheme";

const roleOptions = ["student", "faculty", "company", "admin", "college"];

const emptyStudentForm = {
  course: "",
  branch: "",
  year: "",
  semester: "",
  bio: "",
  studentPhone: "",
  fatherName: "",
  motherName: "",
  fatherPhone: "",
  motherPhone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  dateOfBirth: "",
  bloodGroup: "",
};

function studentFormFromProfile(sp) {
  if (!sp) return { ...emptyStudentForm };
  return {
    course: sp.course || "",
    branch: sp.branch || "",
    year: sp.year || "",
    semester: sp.semester || "",
    bio: sp.bio || "",
    studentPhone: sp.studentPhone || "",
    fatherName: sp.fatherName || "",
    motherName: sp.motherName || "",
    fatherPhone: sp.fatherPhone || "",
    motherPhone: sp.motherPhone || "",
    address: sp.address || "",
    city: sp.city || "",
    state: sp.state || "",
    pincode: sp.pincode || "",
    dateOfBirth: sp.dateOfBirth || "",
    bloodGroup: sp.bloodGroup || "",
  };
}

function formatCollegeStatus(c) {
  const s = c?.collegeApprovalStatus;
  if (s === "pending") return "Pending approval";
  if (s === "rejected") return "Rejected";
  return "Approved";
}

function formatPlatformStatus(s) {
  if (s === "pending") return "Pending platform approval";
  if (s === "rejected") return "Rejected by platform";
  if (s === "approved") return "Approved";
  return "Approved (legacy)";
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 text-sm text-slate-900">{value ?? "—"}</div>
    </div>
  );
}

export default function AdminUserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [viewer, setViewer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [user, setUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [facultyDesignation, setFacultyDesignation] = useState("");
  const [facultyQualification, setFacultyQualification] = useState("");
  const [facultySubjects, setFacultySubjects] = useState("");
  const [platformApprovalBusy, setPlatformApprovalBusy] = useState(false);

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
      setViewer(u);
    } catch {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const load = useCallback(async () => {
    if (!localStorage.getItem("user") || !userId) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        cache: "no-store",
        headers: {},
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Could not load user.");
      }
      const u = data.data?.user;
      const sp = data.data?.studentProfile;
      setUser(u || null);
      setStudentProfile(sp || null);
      setEditRole(u?.role || "");
      setStudentForm(studentFormFromProfile(sp));
      setFacultyDesignation(u?.facultyDesignation || "");
      setFacultyQualification(u?.facultyQualification || "");
      setFacultySubjects(u?.facultySubjects || "");
    } catch (e) {
      setError(e.message || "Failed to load.");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [userId, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const campusLinkId = useMemo(() => {
    if (!user) return null;
    return user.managedByCollege?._id || user.affiliatedCollege?._id || null;
  }, [user]);

  const canDelete =
    user &&
    viewer &&
    String(viewer._id ?? viewer.id ?? "") !== String(user._id) &&
    ["student", "faculty", "company"].includes(user.role);

  const handleSave = async () => {
    if (!localStorage.getItem("user") || !user) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (editRole && editRole !== user.role) {
        const res = await fetch(`/api/admin/users/${userId}/role`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role: editRole }),
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || "Role update failed.");
      }

      if (editRole === "student" && studentForm) {
        const contactCheck = validateStudentProfileExtraFields(studentForm);
        if (!contactCheck.ok) {
          setError(contactCheck.errors.join(" "));
          return;
        }
        const studentPayload = { ...studentForm, ...contactCheck.normalized };
        const res = await fetch(`/api/admin/users/${userId}/student-profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(studentPayload),
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || "Profile save failed.");
      }

      if (editRole === "faculty") {
        const res = await fetch(`/api/admin/users/${userId}/faculty-profile`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ facultyDesignation, facultyQualification, facultySubjects }),
        });
        const data = await readApiResponse(res);
        if (!res.ok) throw new Error(data.message || "Faculty profile save failed.");
      }

      setSuccess("Saved.");
      await load();
    } catch (e) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const handlePlatformApproval = async (decision) => {
    if (!localStorage.getItem("user") || !userId) return;
    setPlatformApprovalBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/users/${userId}/platform-approval`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Approval update failed.");
      setSuccess(data.message || "Updated.");
      await load();
    } catch (e) {
      setError(e.message || "Approval update failed.");
    } finally {
      setPlatformApprovalBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !canDelete) return;
    const msg =
      user.role === "faculty"
        ? "Permanently delete this faculty account and related data created by them?"
        : user.role === "company"
          ? "Permanently delete this company account? All jobs they posted and applications for those jobs will be removed."
          : "Permanently delete this user and their learner data?";
    if (!window.confirm(msg)) return;
    if (!localStorage.getItem("user")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {},
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Delete failed.");
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e.message || "Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  if (!viewer) {
    return (
      <div {...workspaceRootProps("admin", "flex min-h-screen items-center justify-center text-slate-600")}>
        <LoaderCircle className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const roleIcon =
    user?.role === "college"
      ? Building2
      : user?.role === "company"
        ? Factory
        : user?.role === "faculty"
          ? UserRound
          : user?.role === "student"
            ? GraduationCap
            : UserRound;

  return (
    <div {...workspaceRootProps("admin", "min-h-screen")}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <DashboardTopNav
          className={workspaceDashboardHeaderClassName}
          workspaceLabel="Admin · User profile"
          title={user?.name || "User profile"}
          description={
            user ? `${user.email} · ${user.role}` : loading ? "Loading…" : "Not found"
          }
          user={{ name: viewer.name, email: viewer.email, role: viewer.role }}
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
            Loading profile…
          </div>
        ) : !user ? (
          <p className="text-slate-400">User not found.</p>
        ) : (
          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)]/15 text-[var(--primary)] shadow-sm ring-1 ring-black/5">
                      {(() => {
                        const Icon = roleIcon;
                        return <Icon className="h-7 w-7" aria-hidden />;
                      })()}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">{user.name}</h1>
                      <p className="mt-1 text-slate-400">{user.email}</p>
                      <p className="mt-2 text-xs uppercase tracking-wide text-slate-500">
                        Registered{" "}
                        {user.createdAt ? new Date(user.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[11rem]">
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="destructive"
                        className="w-full justify-center gap-2 sm:min-h-[2.5rem]"
                        disabled={deleting}
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? "…" : "Delete account"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="space-y-4 p-6">
                <h2 className="text-lg font-semibold text-slate-900">Account</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Role" value={<span className="capitalize">{user.role}</span>} />
                  <InfoRow
                    label="Updated"
                    value={user.updatedAt ? new Date(user.updatedAt).toLocaleString() : "—"}
                  />
                </div>

                {user.role === "company" ? (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-900">
                      Company registration (admin)
                    </p>
                    <p className="mt-1 text-sm text-slate-800">{formatPlatformStatus(user.platformApprovalStatus)}</p>
                    {user.platformApprovalStatus === "pending" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="success"
                          className="h-10"
                          disabled={platformApprovalBusy}
                          onClick={() => handlePlatformApproval("approved")}
                        >
                          Approve account
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="h-10"
                          disabled={platformApprovalBusy}
                          onClick={() => handlePlatformApproval("rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <label className="text-xs font-medium text-slate-400">Change role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={user.role === "admin"}
                    className="mt-2 h-11 w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 disabled:opacity-50"
                  >
                    {roleOptions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {user.role === "admin" ? (
                    <p className="mt-2 text-xs text-slate-500">Built-in admin roles cannot be reassigned here.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {user.role === "college" ? (
              <Card className="border border-[var(--border)] bg-[var(--bg-card)] shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900">Campus (college account)</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Platform status:{" "}
                    <span className="text-amber-200/90">{formatCollegeStatus(user)}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button type="button" asChild variant="default" className="gap-2">
                      <Link to={`/admin/colleges/${user._id}`}>Open full campus profile</Link>
                    </Button>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    Roster, assessments, and approvals are on the campus profile page.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {user.role === "company" ? (
              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="p-6">
                  <h2 className="text-lg font-semibold text-slate-900">Company</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Recruiter account. Deleting removes their user login and all jobs they posted (including
                    applications and saved-job entries for those roles).
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoRow label="Display name" value={user.name} />
                    <InfoRow label="Login email" value={user.email} />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {user.role === "faculty" ? (
              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="space-y-4 p-6">
                  <h2 className="text-lg font-semibold text-slate-900">Faculty</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <InfoRow
                      label="Approval"
                      value={<span className="capitalize">{user.facultyApprovalStatus || "approved"}</span>}
                    />
                    <InfoRow
                      label="Campus (managed by)"
                      value={user.managedByCollege?.name || "—"}
                    />
                    <InfoRow
                      label="Campus (affiliated / signup)"
                      value={user.affiliatedCollege?.name || "—"}
                    />
                  </div>
                  {campusLinkId ? (
                    <p className="text-sm">
                      <Link
                        to={`/admin/colleges/${campusLinkId}`}
                        className="text-[var(--primary)] underline hover:text-[var(--primary-dark)]"
                      >
                        View campus profile
                      </Link>
                    </p>
                  ) : null}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Designation / title</h3>
                    <input
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      value={facultyDesignation}
                      onChange={(e) => setFacultyDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor, HOD CS"
                      maxLength={200}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Qualification</h3>
                    <textarea
                      className="mt-2 min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      value={facultyQualification}
                      onChange={(e) => setFacultyQualification(e.target.value)}
                      placeholder="Degrees, certifications…"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Subjects / courses taught</h3>
                    <textarea
                      className="mt-2 min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      value={facultySubjects}
                      onChange={(e) => setFacultySubjects(e.target.value)}
                      placeholder="e.g. Data Structures, DBMS…"
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {user.role === "student" ? (
              <Card className="border border-slate-200 bg-white shadow-none">
                <CardContent className="space-y-5 p-6">
                  <h2 className="text-lg font-semibold text-slate-900">Student record</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ["course", "Program / course"],
                      ["branch", "Branch"],
                      ["year", "Year"],
                      ["semester", "Semester"],
                    ].map(([key, label]) => (
                      <div key={key}>
                        <label className="text-xs text-slate-400">{label}</label>
                        <input
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                          value={studentForm[key]}
                          onChange={(e) =>
                            setStudentForm((f) => ({ ...f, [key]: e.target.value }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Bio</label>
                    <textarea
                      className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                      value={studentForm.bio}
                      onChange={(e) => setStudentForm((f) => ({ ...f, bio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Parents &amp; contacts</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ["studentPhone", "Student phone"],
                        ["fatherName", "Father name"],
                        ["fatherPhone", "Father phone"],
                        ["motherName", "Mother name"],
                        ["motherPhone", "Mother phone"],
                      ].map(([key, label]) => (
                        <div key={key} className={key === "studentPhone" ? "sm:col-span-2" : ""}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            inputMode={key.endsWith("Phone") ? "numeric" : undefined}
                            placeholder={key.endsWith("Phone") ? "10–15 digits" : undefined}
                            value={studentForm[key]}
                            onChange={(e) => {
                              let v = e.target.value;
                              if (key.endsWith("Phone")) v = digitsOnly(v).slice(0, 15);
                              setStudentForm((f) => ({ ...f, [key]: v }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Address</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-slate-400">Street / address</label>
                        <input
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                          value={studentForm.address}
                          onChange={(e) =>
                            setStudentForm((f) => ({ ...f, address: e.target.value }))
                          }
                        />
                      </div>
                      {[
                        ["city", "City"],
                        ["state", "State"],
                        ["pincode", "PIN / ZIP"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            inputMode={key === "pincode" ? "numeric" : undefined}
                            maxLength={key === "pincode" ? 6 : undefined}
                            placeholder={key === "pincode" ? "6 digits" : undefined}
                            value={studentForm[key]}
                            onChange={(e) => {
                              let v = e.target.value;
                              if (key === "pincode") v = v.replace(/\D/g, "").slice(0, 6);
                              setStudentForm((f) => ({ ...f, [key]: v }));
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Other</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {[
                        ["dateOfBirth", "Date of birth"],
                        ["bloodGroup", "Blood group"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <label className="text-xs text-slate-400">{label}</label>
                          <input
                            className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            type={key === "dateOfBirth" ? "date" : "text"}
                            value={studentForm[key]}
                            onChange={(e) =>
                              setStudentForm((f) => ({ ...f, [key]: e.target.value }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {(user.managedByCollege?.name || user.affiliatedCollege?.name) && (
                    <div className="rounded-xl border border-slate-200 bg-slate-900/30">
                      <p className="px-4 py-3 text-sm text-slate-400">
                        Campus:{" "}
                        <span className="text-slate-200">
                          {user.managedByCollege?.name || user.affiliatedCollege?.name}
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {user.role !== "company" && user.role !== "admin" ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </div>
            ) : user.role === "company" ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                  Close
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save role changes"}
                </Button>
              </div>
            ) : user.role === "admin" ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                  Close
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}


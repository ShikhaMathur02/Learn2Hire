import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ArrowRight,
  Factory,
  GraduationCap,
  Handshake,
  Info,
  Layers,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { readApiResponse } from "../../lib/api";
import {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "../../lib/studentCohortFieldOptions";
import {
  DashboardTopNav,
  workspaceDashboardHeaderClassName,
} from "../dashboard/DashboardTopNav";
import { DashboardMetricCard } from "../dashboard/DashboardMetricCard";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Card, CardContent } from "../ui/card";
import { VisibleFileInput } from "../ui/visible-file-input";
import { StudentRosterSheetFormatHelp } from "../bulk-import/StudentRosterSheetFormatHelp";
import { STUDENT_ROSTER_DEFAULT_PASSWORD } from "../../lib/studentRosterImportFormat";
import { BULK_SPREADSHEET_ACCEPT } from "../../lib/bulkSpreadsheetAccept";
import { campusRosterStudentSerial, compareRosterPersonByName, rosterRowId } from "../../lib/campusRosterTree";
import { COHORT_OTHER } from "../../lib/cohortPresets";
import { CollegeRosterGroupedPanel } from "./CollegeRosterGroupedPanel";

const CAMPUS_ROSTER_PREVIEW_MAX = 10;

let collegePeopleFullListChunkPrefetchStarted = false;

/** Starts loading the lazy page chunk early (hover/focus) so navigating to the full people list feels faster. */
function prefetchCollegePeopleFullListChunk() {
  if (collegePeopleFullListChunkPrefetchStarted) return;
  collegePeopleFullListChunkPrefetchStarted = true;
  void import("../../pages/CollegeRosterPage.jsx");
}

function formatSnapshotLabel(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Date.now() - t;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(iso).toLocaleString();
}

function applicationStatusClass(status) {
  switch (status) {
    case "hired":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "shortlisted":
      return "border-sky-200 bg-sky-50 text-sky-950";
    case "reviewing":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "rejected":
      return "border-rose-200 bg-rose-50 text-rose-950";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

const strongPasswordHint =
  "8+ characters with uppercase, lowercase, number, and special character.";

/** Use API counters + samples so “Created 0 / Failed N” surfaces real reasons inline. */
function buildStudentBulkBannerPayload(data) {
  const results = Array.isArray(data?.data?.results) ? data.data.results : [];
  let created =
    typeof data?.data?.created === "number" ? data.data.created : results.filter((r) => r.ok).length;
  let failed =
    typeof data?.data?.failed === "number" ? data.data.failed : results.filter((r) => !r.ok).length;

  const baseMsg =
    (typeof data.message === "string" && data.message.trim()) || "Student import finished.";

  const uniqSamples = [];
  const seenSample = new Set();
  for (const r of results) {
    if (r.ok) continue;
    const line = typeof r.message === "string" ? r.message.trim() : "";
    if (!line || seenSample.has(line)) continue;
    seenSample.add(line);
    uniqSamples.push(line);
    if (uniqSamples.length >= 4) break;
  }

  const sampleTail = uniqSamples.length
    ? ` Sample issues (${failed} failed): ${uniqSamples.join(" · ")}`
    : "";

  let variant = "success";
  if (failed > 0 && created === 0) variant = "error";
  else if (failed > 0) variant = "partial";

  return { variant, text: `${baseMsg}${sampleTail}` };
}

function studentImportCreatedCount(data) {
  if (typeof data?.data?.created === "number") return data.data.created;
  const results = Array.isArray(data?.data?.results) ? data.data.results : [];
  return results.filter((r) => r.ok).length;
}

function CollegeDashboard({ user, onLogout, campusDirectoryPage = false }) {
  const navigate = useNavigate();
  const [me, setMe] = useState(user);
  const [assessments, setAssessments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [roster, setRoster] = useState([]);
  const [pendingFaculty, setPendingFaculty] = useState([]);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [peopleMessage, setPeopleMessage] = useState("");
  const [peopleError, setPeopleError] = useState("");
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("student");
  const [rosterAddCourse, setRosterAddCourse] = useState("");
  const [rosterAddBranch, setRosterAddBranch] = useState("");
  const [rosterAddBranchCustom, setRosterAddBranchCustom] = useState("");
  const [rosterAddYear, setRosterAddYear] = useState("");
  const [rosterAddSemester, setRosterAddSemester] = useState("");
  const [rosterAddDepartment, setRosterAddDepartment] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const [approvalBusyId, setApprovalBusyId] = useState("");
  const [studentCampusBusyId, setStudentCampusBusyId] = useState("");
  const [partnerApprovalBusyId, setPartnerApprovalBusyId] = useState("");
  const [insights, setInsights] = useState(null);
  const [insightsError, setInsightsError] = useState("");
  const [insightsRefreshing, setInsightsRefreshing] = useState(false);
  const [snapshotTick, setSnapshotTick] = useState(0);
  const [studentSheetFile, setStudentSheetFile] = useState(null);
  const [facultySheetFile, setFacultySheetFile] = useState(null);
  const [materialSheetFile, setMaterialSheetFile] = useState(null);
  const [materialImageFile, setMaterialImageFile] = useState(null);
  const [materialCategoryId, setMaterialCategoryId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  /** Which long-running bulk action is in flight (so labels stay accurate per button). */
  const [bulkBusyKind, setBulkBusyKind] = useState(null);
  const bulkBusy = bulkBusyKind !== null;
  const [studentBulkBanner, setStudentBulkBanner] = useState(null);
  const [facultyBulkBanner, setFacultyBulkBanner] = useState(null);
  const [bulkSpreadsheetUploadType, setBulkSpreadsheetUploadType] = useState("student");
  const [campusPeopleSearchQuery, setCampusPeopleSearchQuery] = useState("");
  const [campusPeopleKindFilter, setCampusPeopleKindFilter] = useState("all");
  const bulkSpreadsheetSectionRef = useRef(null);
  const [importCourse, setImportCourse] = useState("");
  const [importProgram, setImportProgram] = useState("");
  const [importYear, setImportYear] = useState("");
  const [importSemester, setImportSemester] = useState("");
  const [campusGroupedPanelOpen, setCampusGroupedPanelOpen] = useState(false);
  const [rosterRemovalMode, setRosterRemovalMode] = useState(false);
  const [rosterRemovalPickIds, setRosterRemovalPickIds] = useState([]);
  const [rosterBulkDeleteBusy, setRosterBulkDeleteBusy] = useState(false);
  const rosterHeaderCheckboxRef = useRef(null);

  const scrollIntoBulkPanel = (el) => {
    window.requestAnimationFrame(() => {
      el?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    });
  };

  const fetchInsights = useCallback(
    async ({ silent } = {}) => {
      if (!user?.email) return null;

      if (!silent) setInsightsRefreshing(true);
      setInsightsError("");

      try {
        const res = await fetch("/api/college/insights", {
          cache: "no-store",
          headers: {},
        });
        const data = await readApiResponse(res);
        if (res.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          navigate("/login");
          return null;
        }
        if (!res.ok) {
          throw new Error(data.message || "Could not load placement insights.");
        }
        setInsights(data.data || null);
        return data.data;
      } catch (err) {
        setInsightsError(err.message || "Could not load placement insights.");
        return null;
      } finally {
        if (!silent) setInsightsRefreshing(false);
      }
    },
    [navigate, user?.email]
  );

  const fetchData = useCallback(async () => {
    if (!user?.email) {
      navigate("/login");
      return;
    }

    try {
      setError("");

      const headers = {};

      const [
        meRes,
        assessmentsRes,
        jobsRes,
        rosterRes,
        pendingFacultyRes,
        pendingStudentsRes,
        insightsRes,
      ] = await Promise.all([
        fetch("/api/auth/me", { headers }),
        fetch("/api/assessments", { headers }),
        fetch("/api/jobs", { headers }),
        fetch("/api/college/roster", { cache: "no-store", headers }),
        fetch("/api/college/faculty/pending", { cache: "no-store", headers }),
        fetch("/api/college/students/pending", { cache: "no-store", headers }),
        fetch("/api/college/insights", { cache: "no-store", headers }),
      ]);

      const [
        meData,
        assessmentsData,
        jobsData,
        rosterData,
        pendingFacultyData,
        pendingStudentsData,
        insightsJson,
      ] = await Promise.all([
        readApiResponse(
          meRes,
          "API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          assessmentsRes,
          "API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(
          jobsRes,
          "API returned HTML instead of JSON. Restart the backend server and refresh the page."
        ),
        readApiResponse(rosterRes),
        readApiResponse(pendingFacultyRes),
        readApiResponse(pendingStudentsRes),
        readApiResponse(insightsRes),
      ]);

      if (
        [meRes, assessmentsRes, jobsRes, rosterRes, pendingFacultyRes, pendingStudentsRes, insightsRes].some(
          (response) => response.status === 401
        )
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }

      if (!meRes.ok) {
        throw new Error(meData.message || "Failed to load college profile.");
      }

      if (!assessmentsRes.ok) {
        throw new Error(assessmentsData.message || "Failed to load assessments.");
      }

      if (!jobsRes.ok) {
        throw new Error(jobsData.message || "Failed to load jobs.");
      }
      if (rosterRes.ok) {
        setRoster(rosterData.data?.users || []);
      }
      if (pendingFacultyRes.ok) {
        setPendingFaculty(pendingFacultyData.data?.users || []);
      }
      if (pendingStudentsRes.ok) {
        setPendingStudents(pendingStudentsData.data?.users || []);
      }

      if (insightsRes.ok) {
        setInsights(insightsJson.data || null);
        setInsightsError("");
      } else if (insightsRes.status !== 401) {
        setInsightsError(insightsJson.message || "Could not load placement insights.");
      }

      setMe(meData.data?.user || user);
      setAssessments(assessmentsData.data?.assessments || []);
      setJobs(jobsData.data?.jobs || []);
    } catch (err) {
      setError(err.message || "Unable to load college dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSnapshotTick((n) => n + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const publishedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.status === "published"),
    [assessments]
  );

  const openJobs = useMemo(
    () => jobs.filter((job) => job.status === "open"),
    [jobs]
  );

  const refreshPeople = useCallback(async () => {
    if (!user?.email) return;
    const headers = {};
    try {
      const [rosterRes, pendingFacultyRes, pendingStudentsRes] = await Promise.all([
        fetch("/api/college/roster", { cache: "no-store", headers }),
        fetch("/api/college/faculty/pending", { cache: "no-store", headers }),
        fetch("/api/college/students/pending", { cache: "no-store", headers }),
      ]);
      const rosterData = await readApiResponse(rosterRes);
      const pendingFacultyData = await readApiResponse(pendingFacultyRes);
      const pendingStudentsData = await readApiResponse(pendingStudentsRes);
      if (rosterRes.ok) setRoster(rosterData.data?.users || []);
      if (pendingFacultyRes.ok) setPendingFaculty(pendingFacultyData.data?.users || []);
      if (pendingStudentsRes.ok) setPendingStudents(pendingStudentsData.data?.users || []);
    } catch {
      /* ignore */
    }
  }, [user?.email]);

  const clearRemovalPickIds = useCallback(() => setRosterRemovalPickIds([]), []);

  useEffect(() => {
    if (campusDirectoryPage) return;
    setCampusGroupedPanelOpen(false);
    setRosterRemovalMode(false);
    clearRemovalPickIds();
  }, [campusDirectoryPage, clearRemovalPickIds]);

  const toggleRemovalPickId = useCallback((id) => {
    const s = String(id || "").trim();
    if (!s) return;
    setRosterRemovalPickIds((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }, []);

  const addRemovalPickIds = useCallback((ids) => {
    setRosterRemovalPickIds((prev) => [...new Set([...prev, ...ids.map(String)])]);
  }, []);

  const runCampusMemberDelete = useCallback(
    async (ids, { collapseGroupedPanel = false } = {}) => {
      const uniq = [...new Set(ids.map(String).map((x) => x.trim()).filter(Boolean))];
      if (!uniq.length || !user?.email) return false;

      const n = uniq.length;
      const sentence =
        n === 1
          ? "Remove this person from your campus forever? Their learner-related data tied to Learn2Hire will be cleared too."
          : `Remove ${n} people from your campus forever? Their learner-related data tied to Learn2Hire will be cleared too.`;
      if (!window.confirm(sentence)) return false;

      setRosterBulkDeleteBusy(true);
      setPeopleError("");
      const fetchOpts = { cache: "no-store" };

      /** Applies server-confirmed removals to the loaded people list so the UI updates immediately. */
      const applyRemovedLocally = (removedIds) => {
        const setRm = new Set(removedIds.map(String));
        if (!setRm.size) return;
        setRoster((prev) => prev.filter((u) => !setRm.has(rosterRowId(u))));
        setRosterRemovalPickIds((prev) => prev.filter((id) => !setRm.has(String(id))));
      };

      try {
        if (uniq.length === 1) {
          const res = await fetch(`/api/college/roster/members/${encodeURIComponent(uniq[0])}`, {
            method: "DELETE",
            headers: {},
            ...fetchOpts,
          });
          const data = await readApiResponse(res);
          if (res.status === 401) {
            navigate("/login");
            return false;
          }
          if (!res.ok || data.success === false) {
            throw new Error(data.message || "Could not delete.");
          }
          applyRemovedLocally([uniq[0]]);
          setPeopleMessage(data.message || "Removed.");
        } else {
          const res = await fetch("/api/college/roster/members/delete-many", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userIds: uniq }),
            ...fetchOpts,
          });
          const data = await readApiResponse(res);
          if (res.status === 401) {
            navigate("/login");
            return false;
          }
          if (!res.ok || data.success === false) {
            throw new Error(data.message || "Could not delete.");
          }
          const removed = Array.isArray(data.data?.removed) ? data.data.removed.map(String) : [];
          const failed = Array.isArray(data.data?.failed) ? data.data.failed : [];
          if (removed.length === 0) {
            throw new Error(data.message || "No accounts were removed.");
          }
          applyRemovedLocally(removed);
          if (failed.length > 0 && removed.length < uniq.length) {
            setPeopleMessage(data.message || `Removed ${removed.length} of ${uniq.length}.`);
          } else {
            setPeopleMessage(data.message || "Removed.");
          }
        }
        await refreshPeople();
        await fetchInsights({ silent: true });
        if (collapseGroupedPanel) setCampusGroupedPanelOpen(false);
        return true;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Delete failed.";
        setPeopleError(message);
        return false;
      } finally {
        setRosterBulkDeleteBusy(false);
      }
    },
    [user?.email, navigate, refreshPeople, fetchInsights]
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      fetchInsights({ silent: true });
      refreshPeople();
    }, 45000);
    return () => window.clearInterval(id);
  }, [fetchInsights, refreshPeople]);

  const handleAddRosterUser = async (e) => {
    e.preventDefault();
    setPeopleError("");
    setPeopleMessage("");
    if (!user?.email) return;

    if (addRole === "student") {
      const branchVal =
        rosterAddBranch === COHORT_OTHER ? rosterAddBranchCustom.trim() : rosterAddBranch.trim();
      if (!rosterAddCourse.trim() || !branchVal || !rosterAddYear.trim()) {
        setPeopleError("Choose the student’s class: program (course), branch, and year.");
        return;
      }
    }

    setAddingUser(true);
    try {
      const branchResolved =
        rosterAddBranch === COHORT_OTHER ? rosterAddBranchCustom.trim() : rosterAddBranch.trim();
      const res = await fetch("/api/college/roster", {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
          ...(addRole === "student"
            ? {
                course: rosterAddCourse.trim(),
                branch: branchResolved,
                year: rosterAddYear.trim(),
                semester: rosterAddSemester.trim(),
                department: rosterAddDepartment.trim(),
              }
            : {}),
        }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Could not create account.");
      }
      setPeopleMessage(
        addRole === "faculty"
          ? "Teacher account created. They can sign in immediately with this email and password."
          : "Student account created. They can sign in with this email and password."
      );
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setRosterAddCourse("");
      setRosterAddBranch("");
      setRosterAddBranchCustom("");
      setRosterAddYear("");
      setRosterAddSemester("");
      setRosterAddDepartment("");
      await refreshPeople();
      await fetchInsights({ silent: true });
    } catch (err) {
      setPeopleError(err.message || "Could not create account.");
    } finally {
      setAddingUser(false);
    }
  };

  const handleFacultyApproval = async (userId, decision) => {
    if (!user?.email) return;
    setPeopleError("");
    setPeopleMessage("");
    setApprovalBusyId(userId);
    try {
      const res = await fetch(`/api/college/faculty/${userId}/approval`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Update failed.");
      }
      setPeopleMessage(data.message || "Updated.");
      await refreshPeople();
    } catch (err) {
      setPeopleError(err.message || "Could not update approval.");
    } finally {
      setApprovalBusyId("");
    }
  };

  const handleStudentCampusApproval = async (userId, decision) => {
    if (!user?.email) return;
    setPeopleError("");
    setPeopleMessage("");
    setStudentCampusBusyId(userId);
    try {
      const res = await fetch(`/api/college/students/${userId}/campus-approval`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Update failed.");
      }
      setPeopleMessage(data.message || "Updated.");
      await refreshPeople();
      await fetchInsights({ silent: true });
    } catch (err) {
      setPeopleError(err.message || "Could not update student approval.");
    } finally {
      setStudentCampusBusyId("");
    }
  };

  const handlePartnerCompanyApproval = async (companyUserId, decision) => {
    if (!user?.email) return;
    setPeopleError("");
    setPeopleMessage("");
    setPartnerApprovalBusyId(companyUserId);
    try {
      const res = await fetch(`/api/college/companies/${companyUserId}/partner-approval`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Update failed.");
      }
      setPeopleMessage(data.message || "Updated.");
      await fetchInsights({ silent: true });
    } catch (err) {
      setPeopleError(err.message || "Could not update partnership.");
    } finally {
      setPartnerApprovalBusyId("");
    }
  };

  const handleCollegeStudentImport = async () => {
    if (!user?.email || !studentSheetFile) return;
    if (!importCourse.trim() || !importProgram.trim() || !importYear.trim()) {
      setStudentBulkBanner({
        variant: "error",
        text: "Select the class (course, program, year) this file belongs to. Each row must match those values.",
      });
      scrollIntoBulkPanel(bulkSpreadsheetSectionRef.current);
      return;
    }
    setStudentBulkBanner(null);
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusyKind("students");
    try {
      const fd = new FormData();
      fd.append("file", studentSheetFile);
      fd.append("targetCourse", importCourse.trim());
      fd.append("targetProgram", importProgram.trim());
      fd.append("targetYear", importYear.trim());
      fd.append("targetSemester", importSemester.trim());
      const res = await fetch("/api/college/roster/import/students", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Student import failed.");
      setStudentBulkBanner(buildStudentBulkBannerPayload(data));
      const created = studentImportCreatedCount(data);
      if (created > 0) {
        setStudentSheetFile(null);
        await refreshPeople();
      }
      scrollIntoBulkPanel(bulkSpreadsheetSectionRef.current);
    } catch (err) {
      setStudentBulkBanner({
        variant: "error",
        text: err.message || "Student import failed.",
      });
      scrollIntoBulkPanel(bulkSpreadsheetSectionRef.current);
    } finally {
      setBulkBusyKind(null);
    }
  };

  const handleCollegeFacultyImport = async () => {
    if (!user?.email || !facultySheetFile) return;
    setFacultyBulkBanner(null);
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusyKind("faculty");
    try {
      const fd = new FormData();
      fd.append("file", facultySheetFile);
      const res = await fetch("/api/college/roster/import/faculty", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(res);
      if (res.status === 401) {
        navigate("/login");
        return;
      }
      if (!res.ok) throw new Error(data.message || "Faculty import failed.");
      const created =
        typeof data?.data?.created === "number"
          ? data.data.created
          : Array.isArray(data?.data?.results)
            ? data.data.results.filter((r) => r.ok).length
            : 0;
      const failed =
        typeof data?.data?.failed === "number"
          ? data.data.failed
          : Array.isArray(data?.data?.results)
            ? data.data.results.filter((r) => !r.ok).length
            : 0;
      let variant = "success";
      if (failed > 0 && created === 0) variant = "error";
      else if (failed > 0) variant = "partial";
      setFacultyBulkBanner({
        variant,
        text: data.message || "Faculty import finished.",
      });
      if (created > 0) {
        setFacultySheetFile(null);
        await refreshPeople();
      }
      scrollIntoBulkPanel(bulkSpreadsheetSectionRef.current);
    } catch (err) {
      setFacultyBulkBanner({
        variant: "error",
        text: err.message || "Faculty import failed.",
      });
      scrollIntoBulkPanel(bulkSpreadsheetSectionRef.current);
    } finally {
      setBulkBusyKind(null);
    }
  };

  const handleMaterialSheetImport = async () => {
    if (!user?.email || !materialSheetFile) return;
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusyKind("materials");
    try {
      const fd = new FormData();
      fd.append("file", materialSheetFile);
      const res = await fetch("/api/learning/manage/materials/import", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Material import failed.");
      setPeopleMessage(data.message || "Material import completed.");
      setMaterialSheetFile(null);
    } catch (err) {
      setPeopleError(err.message || "Material import failed.");
    } finally {
      setBulkBusyKind(null);
    }
  };

  const handleMaterialImageCreate = async () => {
    if (!user?.email || !materialImageFile || !materialCategoryId.trim() || !materialTitle.trim()) return;
    setPeopleError("");
    setPeopleMessage("");
    setBulkBusyKind("image");
    try {
      const fd = new FormData();
      fd.append("image", materialImageFile);
      fd.append("title", materialTitle.trim());
      fd.append("categoryId", materialCategoryId.trim());
      const res = await fetch("/api/learning/manage/materials/from-image", {
        method: "POST",
        headers: {},
        body: fd,
      });
      const data = await readApiResponse(res);
      if (!res.ok) throw new Error(data.message || "Image material creation failed.");
      setPeopleMessage(data.message || "Image material created.");
      setMaterialImageFile(null);
      setMaterialTitle("");
    } catch (err) {
      setPeopleError(err.message || "Image material creation failed.");
    } finally {
      setBulkBusyKind(null);
    }
  };

  const sortedRoster = useMemo(
    () => [...roster].sort(compareRosterPersonByName),
    [roster]
  );

  const filteredCampusPeople = useMemo(() => {
    let list =
      campusPeopleKindFilter === "student"
        ? sortedRoster.filter((u) => u.role === "student")
        : campusPeopleKindFilter === "faculty"
          ? sortedRoster.filter((u) => u.role === "faculty")
          : [...sortedRoster];

    const q = campusPeopleSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const cls = u.studentClass;
        const roleLabel = u.role === "student" ? "student" : "faculty";
        const hay = [
          u.name,
          u.email,
          roleLabel,
          u.role,
          u.facultyDesignation,
          cls?.course,
          cls?.branch,
          cls?.serialNumber,
          cls?.year,
          cls?.semester,
          cls?.department,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return [...list].sort(compareRosterPersonByName);
  }, [sortedRoster, campusPeopleKindFilter, campusPeopleSearchQuery]);

  const rosterPreviewRows = useMemo(() => {
    return sortedRoster.slice(0, CAMPUS_ROSTER_PREVIEW_MAX);
  }, [sortedRoster]);

  const rosterPreviewRowsSerialMeta = useMemo(() => {
    let studentN = 0;
    let facultyN = 0;
    return rosterPreviewRows.map((u) => {
      if (u.role === "student") {
        studentN += 1;
        return { studentOrdinal: studentN, facultyOrdinal: null };
      }
      facultyN += 1;
      return { studentOrdinal: null, facultyOrdinal: facultyN };
    });
  }, [rosterPreviewRows]);

  const filteredCampusRowsOrdinal = useMemo(() => {
    let studentN = 0;
    let facultyN = 0;
    return filteredCampusPeople.map((u) => {
      if (u.role === "student") {
        studentN += 1;
        return { user: u, studentOrdinal: studentN, facultyOrdinal: null };
      }
      facultyN += 1;
      return { user: u, studentOrdinal: null, facultyOrdinal: facultyN };
    });
  }, [filteredCampusPeople]);

  /** Search narrows rows only; header select-all stays off until you show Everyone with no search. */
  const rosterListNarrowedBySearchOrKind = useMemo(() => {
    const q = campusPeopleSearchQuery.trim();
    return q.length > 0 || campusPeopleKindFilter !== "all";
  }, [campusPeopleSearchQuery, campusPeopleKindFilter]);

  const rosterHeaderSelectAllDisabled =
    filteredCampusPeople.length === 0 || rosterBulkDeleteBusy || rosterListNarrowedBySearchOrKind;

  useEffect(() => {
    const vis = filteredCampusPeople.map((u) => rosterRowId(u)).filter(Boolean);
    const el = rosterHeaderCheckboxRef.current;
    if (rosterListNarrowedBySearchOrKind) {
      if (el) {
        el.checked = false;
        el.indeterminate = false;
      }
      return;
    }
    const nSel = vis.filter((id) => rosterRemovalPickIds.includes(id)).length;
    if (el) {
      el.indeterminate = vis.length > 0 && nSel > 0 && nSel < vis.length;
    }
  }, [filteredCampusPeople, rosterRemovalPickIds, rosterListNarrowedBySearchOrKind]);

  const rosterTableColSpanExpanded = rosterRemovalMode ? 11 : 10;

  const rosterPreviewColSpan = 5;

  const allFilteredMarked =
    filteredCampusPeople.length > 0 &&
    filteredCampusPeople.every((u) => {
      const id = rosterRowId(u);
      return id && rosterRemovalPickIds.includes(id);
    });

  const toggleSelectAllFiltered = useCallback(() => {
    const q = campusPeopleSearchQuery.trim();
    const narrowed = q.length > 0 || campusPeopleKindFilter !== "all";
    if (narrowed) return;
    setRosterRemovalPickIds((prev) => {
      const vis = filteredCampusPeople.map((u) => rosterRowId(u)).filter(Boolean);
      const full = vis.length > 0 && vis.every((id) => prev.includes(id));
      if (full) return prev.filter((id) => !vis.includes(id));
      return [...new Set([...prev, ...vis])];
    });
  }, [filteredCampusPeople, campusPeopleSearchQuery, campusPeopleKindFilter]);

  const topAssessmentSkills = useMemo(() => {
    const counts = {};
    publishedAssessments.forEach((assessment) => {
      const skill = assessment.skill || "General";
      counts[skill] = (counts[skill] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [publishedAssessments]);

  const bothPendingQueuesEmpty =
    pendingFaculty.length === 0 && pendingStudents.length === 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-app)] text-slate-600">
        <div className="flex items-center gap-3">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          {campusDirectoryPage ? "Loading your list…" : "Loading college dashboard…"}
        </div>
      </div>
    );
  }

  return (
    <>
    <div
      className="l2h-workspace-canvas min-h-screen text-[var(--text)]"
      data-l2h-workspace="college"
    >
      <div className="l2h-container-app w-full py-5 sm:py-6">
        <DashboardTopNav
          compact
          className={cn(workspaceDashboardHeaderClassName, "mb-2 px-3 sm:px-4 xl:px-5")}
          workspaceLabel="College Workspace"
          title={campusDirectoryPage ? "People on campus" : `Welcome, ${me.name}`}
          description={
            campusDirectoryPage
              ? `${roster.length} ${roster.length === 1 ? "person" : "people"} your campus manages · search only narrows what you see`
              : undefined
          }
          user={{ name: me.name, email: me.email, role: me.role }}
          onLogout={onLogout}
          actionItems={
            campusDirectoryPage
              ? [
                  { label: "College overview", to: "/dashboard", icon: ArrowLeft },
                  { label: "Manage learning", to: "/dashboard/learning/manage", icon: BookOpenCheck },
                  { label: "Go to home", onClick: () => navigate("/") },
                ]
              : [
                  { label: "Manage learning", to: "/dashboard/learning/manage", icon: BookOpenCheck },
                  { label: "Go to home", onClick: () => navigate("/") },
                ]
          }
        />

        <div className="mt-4 rounded-[32px] border border-[var(--border)] bg-[var(--bg-card)]/92 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] backdrop-blur-md">
          <div className="space-y-6 p-5 sm:p-6 xl:p-7">
          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-950">
              {error}
            </div>
          ) : null}

          {insightsError ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-950">
              {insightsError}
            </div>
          ) : null}

          {!campusDirectoryPage ? (
          <div className="mt-5 rounded-[28px] border border-[var(--border)] bg-[var(--bg-card)]/95 p-5 shadow-[var(--surface-elevated)] ring-1 ring-slate-950/[0.04] sm:p-6 xl:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                    </span>
                    Live snapshot
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    <Activity className="h-3.5 w-3.5 text-[var(--primary)]" />
                    {/* snapshotTick keeps “Xs ago” updating without polling */}
                    {snapshotTick >= 0 && (
                      <span>
                        Data as of{" "}
                        {insights?.generatedAt
                          ? formatSnapshotLabel(insights.generatedAt)
                          : "—"}
                      </span>
                    )}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[var(--text)]">Campus & hiring intelligence</h2>
                <p className="max-w-3xl text-sm font-medium leading-relaxed text-[var(--text-muted)]">
                  Companies registered on Learn2Hire, active job posts, and how your students are moving
                  through the hiring pipeline. Application counts include only learners your campus manages. Open roles
                  from employers are visible platform-wide to every
                  partner college, not only your campus.
                </p>
              </div>
              <Button
                type="button"
                variant="default"
                disabled={insightsRefreshing}
                className="shrink-0"
                onClick={() => fetchInsights({ silent: false })}
              >
                <RefreshCw
                  className={`h-4 w-4 ${insightsRefreshing ? "animate-spin" : ""}`}
                />
                {insightsRefreshing ? "Refreshing…" : "Refresh now"}
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              <DashboardMetricCard
                title="Your students"
                value={insights?.campus?.rosterStudents ?? "—"}
                subtitle="Added under your campus"
                icon={GraduationCap}
                scrollTargetId="college-dash-roster"
              />
              <DashboardMetricCard
                title="Your teachers"
                value={insights?.campus?.rosterFaculty ?? "—"}
                subtitle="Teachers & mentors"
                icon={Users}
                scrollTargetId="college-dash-roster"
              />
              <DashboardMetricCard
                title="Teachers in review"
                value={insights?.campus?.pendingFacultyReview ?? "—"}
                subtitle="Teachers who signed up and need a decision"
                icon={ShieldCheck}
                scrollTargetId="college-dash-pending-faculty"
              />
              <DashboardMetricCard
                title="Students in review"
                value={insights?.campus?.pendingStudentReview ?? "—"}
                subtitle="Self-signups awaiting campus action"
                icon={UserPlus}
                scrollTargetId="college-dash-pending-students"
              />
              <DashboardMetricCard
                title="Recruiters"
                value={insights?.hiring?.registeredCompanies ?? "—"}
                subtitle="Company accounts on the platform"
                icon={Factory}
                scrollTargetId="college-dash-companies"
              />
              <DashboardMetricCard
                title="Open roles"
                value={insights?.hiring?.openRoles ?? openJobs.length}
                subtitle="Shared across all colleges"
                icon={BriefcaseBusiness}
                scrollTargetId="college-dash-open-jobs"
              />
              <DashboardMetricCard
                title="Employer requests"
                value={insights?.hiring?.pendingPartnerReview ?? "—"}
                subtitle="Campus partnership pending"
                icon={Handshake}
                scrollTargetId="college-dash-partner-employers"
              />
              <DashboardMetricCard
                title="Student applications"
                value={insights?.placements?.applicationsTotal ?? "—"}
                subtitle="Your students' job applications"
                icon={Building2}
                scrollTargetId="college-dash-applications"
              />
            </div>

            {insights?.placements?.applicationsByStatus &&
            Object.keys(insights.placements.applicationsByStatus).length > 0 ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {Object.entries(insights.placements.applicationsByStatus)
                  .sort((a, b) => b[1] - a[1])
                  .map(([st, count]) => (
                    <span
                      key={st}
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium capitalize ${applicationStatusClass(st)}`}
                    >
                      {st}: {count}
                    </span>
                  ))}
              </div>
            ) : null}

            <div className="mt-5 grid gap-6 xl:grid-cols-3">
              <Card
                id="college-dash-companies"
                tabIndex={-1}
                className="scroll-mt-28 border border-[var(--border)] bg-white/95 shadow-sm outline-none ring-1 ring-slate-950/[0.04] focus:outline-none xl:col-span-1"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Registered companies</h3>
                  <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">Organizations recruiting via the platform.</p>
                  <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {insights?.hiring?.companies?.length ? (
                      insights.hiring.companies.map((c) => (
                        <div
                          key={c._id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <p className="font-medium text-[var(--text)]">{c.name}</p>
                          <p className="text-xs font-medium text-slate-700">{c.email}</p>
                          <p className="mt-1 text-[11px] font-medium text-slate-700">
                            Joined {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                        No company accounts yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                id="college-dash-open-jobs"
                tabIndex={-1}
                className="scroll-mt-28 border border-[var(--border)] bg-white/95 shadow-sm outline-none ring-1 ring-slate-950/[0.04] focus:outline-none xl:col-span-1"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Open job posts</h3>
                  <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">Roles companies are hiring for now.</p>
                  <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {insights?.hiring?.openJobs?.length ? (
                      insights.hiring.openJobs.map((job) => (
                        <div
                          key={job._id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <p className="font-medium text-[var(--text)]">{job.title}</p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {job.createdBy?.name || "Company"} · {job.location || "Location TBD"} ·{" "}
                            {job.employmentType?.replace?.("-", " ") || job.employmentType}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                        No open jobs right now.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card
                id="college-dash-applications"
                tabIndex={-1}
                className="scroll-mt-28 border border-[var(--border)] bg-white/95 shadow-sm outline-none ring-1 ring-slate-950/[0.04] focus:outline-none xl:col-span-1"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Your students applying</h3>
                  <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">Latest activity from your students.</p>
                  <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
                    {insights?.placements?.recentApplications?.length ? (
                      insights.placements.recentApplications.map((row) => (
                        <div
                          key={row._id}
                          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                        >
                          <p className="font-medium text-[var(--text)]">
                            {row.student?.name || "Student"} → {row.job?.title || "Job"}
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {row.job?.createdBy?.name || "Company"} ·{" "}
                            <span
                              className={`inline rounded-md border px-1.5 py-0.5 capitalize ${applicationStatusClass(row.status)}`}
                            >
                              {row.status}
                            </span>
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                        No applications from your students yet, or none of your students have applied yet.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {insights?.hiring?.pendingPartnerCompanies?.length ? (
              <Card
                id="college-dash-partner-employers"
                tabIndex={-1}
                className="scroll-mt-28 mt-5 border border-[var(--primary)]/25 bg-[var(--primary)]/[0.08] shadow-none outline-none focus:outline-none"
              >
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold text-[var(--text)]">Employer partnership requests</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-[var(--text-muted)]">
                    Companies that chose your campus at signup. Approving here fully activates their account (same as
                    an admin platform approval).
                  </p>
                  <div className="mt-4 space-y-3">
                    {insights.hiring.pendingPartnerCompanies.map((c) => (
                      <div
                        key={c._id}
                        className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-[var(--text)]">{c.name}</p>
                          <p className="text-sm font-medium text-slate-700">{c.email}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            disabled={partnerApprovalBusyId === c._id}
                            onClick={() => handlePartnerCompanyApproval(c._id, "approved")}
                          >
                            {partnerApprovalBusyId === c._id ? "…" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={partnerApprovalBusyId === c._id}
                            onClick={() => handlePartnerCompanyApproval(c._id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
          ) : null}

          <div className="mt-10 rounded-2xl border border-slate-200/90 bg-[var(--bg-card)] p-6 shadow-sm sm:p-7 xl:p-8">
            {!campusDirectoryPage ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">People management</p>
                  <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Manage people & sign-up approvals</h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text-muted)]">
                    Approve students and teachers who signed up on their own, then add more accounts your campus
                    manages. Students stay waiting until someone at your college or a platform admin lets them in.
                  </p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-[var(--primary)] shadow-sm">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--primary)]">Campus directory</p>
                  <h2 className="mt-1 text-2xl font-bold text-[var(--text)]">Everyone your campus added</h2>
                  <p className="mt-2 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text-muted)]">
                    Approve sign-ups and add accounts stay on the college overview. Search here only filters the table;
                    it doesn&apos;t replace row-by-row selection.
                  </p>
                </div>
                <Button asChild type="button" variant="outline" size="sm" className="h-10 shrink-0 rounded-xl font-semibold shadow-sm">
                  <Link to="/dashboard">Back to overview</Link>
                </Button>
              </div>
            )}

            {peopleMessage ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950">
                {peopleMessage}
              </div>
            ) : null}
            {peopleError ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950">
                {peopleError}
              </div>
            ) : null}

            {!campusDirectoryPage ? (
            <div className="mt-5 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-100/80 to-slate-50/70 p-3 ring-1 ring-slate-200/60 sm:p-4 lg:p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-start lg:gap-5 lg:content-start">
                <div className="flex min-h-0 min-w-0 flex-col gap-3 lg:col-span-5 lg:self-start xl:col-span-5">
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-950/[0.04] sm:px-5 sm:py-3">
                    <h3 className="text-base font-semibold text-[var(--text)] sm:text-lg">
                      Review incoming sign-ups
                    </h3>
                    <p className="mt-0.5 text-xs font-medium leading-relaxed text-[var(--text-muted)] sm:text-sm">
                      Teachers and students who pick your institution at signup show up here for approval.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:gap-4">
                  {bothPendingQueuesEmpty ? (
                    <>
                      <Card
                        id="college-dash-pending-faculty"
                        tabIndex={-1}
                        className="scroll-mt-28 flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-sm ring-1 ring-slate-950/[0.04]"
                      >
                        <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800"
                                aria-hidden
                              >
                                <Users className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">Teachers</p>
                                <p className="text-[11px] font-medium text-slate-600">Self-registration</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                              Clear
                            </span>
                          </div>
                          <p
                            role="status"
                            className="mt-4 flex flex-1 flex-col justify-end text-sm font-medium leading-snug text-slate-700"
                          >
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2
                                className="h-4 w-4 shrink-0 text-emerald-600"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                              No teachers pending review.
                            </span>
                          </p>
                        </CardContent>
                      </Card>
                      <Card
                        id="college-dash-pending-students"
                        tabIndex={-1}
                        className="scroll-mt-28 flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-sm ring-1 ring-slate-950/[0.04]"
                      >
                        <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary-dark)]"
                                aria-hidden
                              >
                                <GraduationCap className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">Students</p>
                                <p className="text-[11px] font-medium text-slate-600">Self-registration</p>
                              </div>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                              Clear
                            </span>
                          </div>
                          <p
                            role="status"
                            className="mt-4 flex flex-1 flex-col justify-end text-sm font-medium leading-snug text-slate-700"
                          >
                            <span className="inline-flex items-center gap-2">
                              <CheckCircle2
                                className="h-4 w-4 shrink-0 text-emerald-600"
                                strokeWidth={2.25}
                                aria-hidden
                              />
                              No students pending review.
                            </span>
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <>
                      <Card
                        id="college-dash-pending-faculty"
                        tabIndex={-1}
                        className="scroll-mt-28 flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-sm ring-1 ring-slate-950/[0.04]"
                      >
                        <CardContent className="flex min-h-[12rem] flex-1 flex-col p-4 sm:p-5">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800"
                                aria-hidden
                              >
                                <Users className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">Teachers</p>
                                <p className="text-[11px] font-medium text-slate-600 sm:text-xs">Self-registration</p>
                              </div>
                            </div>
                            {pendingFaculty.length > 0 ? (
                              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-950">
                                {pendingFaculty.length} pending
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                                Clear
                              </span>
                            )}
                          </div>
                          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 sm:max-h-[min(340px,50vh)]">
                            {pendingFaculty.length ? (
                              pendingFaculty.map((u) => (
                                <div
                                  key={u._id}
                                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">{u.name}</p>
                                    <p className="truncate text-sm font-medium text-slate-700">{u.email}</p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      disabled={approvalBusyId === u._id}
                                      onClick={() => handleFacultyApproval(u._id, "approved")}
                                    >
                                      {approvalBusyId === u._id ? "…" : "Approve"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={approvalBusyId === u._id}
                                      onClick={() => handleFacultyApproval(u._id, "rejected")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div
                                role="status"
                                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:py-4"
                              >
                                <CheckCircle2
                                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                                  strokeWidth={2.25}
                                  aria-hidden
                                />
                                <p className="text-sm font-medium leading-snug text-slate-800">
                                  <span className="text-slate-900">All clear.</span> No teachers need review right now.
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card
                        id="college-dash-pending-students"
                        tabIndex={-1}
                        className="scroll-mt-28 flex h-full min-h-0 min-w-0 flex-col overflow-hidden border border-slate-200 bg-white shadow-sm ring-1 ring-slate-950/[0.04]"
                      >
                        <CardContent className="flex min-h-[12rem] flex-1 flex-col p-4 sm:p-5">
                          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/15 text-[var(--primary-dark)]"
                                aria-hidden
                              >
                                <GraduationCap className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900">Students</p>
                                <p className="text-[11px] font-medium text-slate-600 sm:text-xs">Self-registration</p>
                              </div>
                            </div>
                            {pendingStudents.length > 0 ? (
                              <span className="shrink-0 rounded-full bg-[var(--primary)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--primary-dark)]">
                                {pendingStudents.length} pending
                              </span>
                            ) : (
                              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-900">
                                Clear
                              </span>
                            )}
                          </div>
                          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 sm:max-h-[min(340px,50vh)]">
                            {pendingStudents.length ? (
                              pendingStudents.map((u) => (
                                <div
                                  key={u._id}
                                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                                >
                                  <div className="min-w-0">
                                    <p className="truncate font-semibold text-slate-900">{u.name}</p>
                                    <p className="truncate text-sm font-medium text-slate-700">{u.email}</p>
                                  </div>
                                  <div className="flex shrink-0 flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="success"
                                      disabled={studentCampusBusyId === u._id}
                                      onClick={() => handleStudentCampusApproval(u._id, "approved")}
                                    >
                                      {studentCampusBusyId === u._id ? "…" : "Approve"}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      disabled={studentCampusBusyId === u._id}
                                      onClick={() => handleStudentCampusApproval(u._id, "rejected")}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div
                                role="status"
                                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:py-4"
                              >
                                <CheckCircle2
                                  className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                                  strokeWidth={2.25}
                                  aria-hidden
                                />
                                <p className="text-sm font-medium leading-snug text-slate-800">
                                  <span className="text-slate-900">All clear.</span> No students waiting for campus
                                  approval.
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                  </div>
                </div>

              <Card className="flex h-fit min-h-0 min-w-0 flex-col border border-slate-200 bg-white shadow-sm ring-1 ring-slate-950/[0.04] lg:col-span-7 lg:self-start xl:col-span-7">
                <CardContent className="p-5 sm:p-6 lg:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary-dark)]">
                        <UserPlus className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--text)]">Add a student or teacher</h3>
                        <p className="mt-1 max-w-xl text-sm font-medium leading-relaxed text-[var(--text-muted)]">
                          Creates an active user tied to your college. Ask them to change the password after first login.
                        </p>
                      </div>
                    </div>
                  </div>

                  <form className="mt-5 space-y-6" onSubmit={handleAddRosterUser}>
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Role</span>
                      <div
                        className="flex max-w-md rounded-xl border border-slate-200 bg-slate-50 p-1"
                        role="group"
                        aria-label="Account role"
                      >
                        <button
                          type="button"
                          aria-pressed={addRole === "student"}
                          onClick={() => setAddRole("student")}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                            addRole === "student"
                              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <GraduationCap className="h-4 w-4 shrink-0" aria-hidden />
                          Student
                        </button>
                        <button
                          type="button"
                          aria-pressed={addRole === "faculty"}
                          onClick={() => setAddRole("faculty")}
                          className={cn(
                            "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                            addRole === "faculty"
                              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          )}
                        >
                          <Users className="h-4 w-4 shrink-0" aria-hidden />
                          Teacher
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2 xl:gap-8">
                      <fieldset className="min-w-0 space-y-3 border-0 p-0">
                        <legend className="sr-only">Account credentials</legend>
                        <p className="text-sm font-bold text-slate-900">Account</p>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="cr-name">
                              Full name
                            </label>
                            <input
                              id="cr-name"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                              placeholder="Shown on their profile"
                              value={addName}
                              onChange={(e) => setAddName(e.target.value)}
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="cr-email">
                              Email (login)
                            </label>
                            <input
                              id="cr-email"
                              type="email"
                              autoComplete="email"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                              placeholder="name@school.edu"
                              value={addEmail}
                              onChange={(e) => setAddEmail(e.target.value)}
                              required
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="text-xs font-semibold text-slate-700" htmlFor="cr-password">
                              Initial password
                            </label>
                            <input
                              id="cr-password"
                              type="password"
                              autoComplete="new-password"
                              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                              placeholder="Temporary password"
                              value={addPassword}
                              onChange={(e) => setAddPassword(e.target.value)}
                              required
                            />
                            <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">{strongPasswordHint}</p>
                          </div>
                        </div>
                      </fieldset>

                      <fieldset className="min-w-0 space-y-3 border-0 p-0">
                        <legend className="sr-only">{addRole === "student" ? "Student class details" : "Teacher"}</legend>
                        <p className="text-sm font-bold text-slate-900">
                          {addRole === "student" ? "Study program & class" : "Basic details"}
                        </p>

                        {addRole === "student" ? (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                            <div className="space-y-3">
                              <div>
                                <label className="text-xs font-semibold text-slate-700" htmlFor="cr-course-add">
                                  Program
                                </label>
                                <select
                                  id="cr-course-add"
                                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                  value={rosterAddCourse}
                                  onChange={(e) => setRosterAddCourse(e.target.value)}
                                  required
                                >
                                  <option value="">Choose program…</option>
                                  {STUDENT_COHORT_PROGRAM_OPTIONS.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="grid gap-3 sm:grid-cols-3">
                                <div className="min-w-0 sm:col-span-1">
                                  <label className="text-xs font-semibold text-slate-700" htmlFor="cr-branch-add">
                                    Branch
                                  </label>
                                  <select
                                    id="cr-branch-add"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    value={rosterAddBranch}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setRosterAddBranch(v);
                                      if (v !== COHORT_OTHER) setRosterAddBranchCustom("");
                                    }}
                                    required
                                  >
                                    <option value="">Branch…</option>
                                    {STUDENT_COHORT_BRANCH_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                    <option value={COHORT_OTHER}>Other…</option>
                                  </select>
                                </div>
                                <div className="min-w-0">
                                  <label className="text-xs font-semibold text-slate-700" htmlFor="cr-year-add">
                                    Year
                                  </label>
                                  <select
                                    id="cr-year-add"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    value={rosterAddYear}
                                    onChange={(e) => setRosterAddYear(e.target.value)}
                                    required
                                  >
                                    <option value="">Year…</option>
                                    {STUDENT_COHORT_YEAR_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="min-w-0">
                                  <label className="text-xs font-semibold text-slate-700" htmlFor="cr-sem-add">
                                    Semester <span className="font-normal text-slate-500">(optional)</span>
                                  </label>
                                  <select
                                    id="cr-sem-add"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                                    value={rosterAddSemester}
                                    onChange={(e) => setRosterAddSemester(e.target.value)}
                                  >
                                    <option value="">—</option>
                                    {STUDENT_COHORT_SEMESTER_OPTIONS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              {rosterAddBranch === COHORT_OTHER ? (
                                <div>
                                  <label className="text-xs font-semibold text-slate-700" htmlFor="cr-branch-custom-add">
                                    Branch name
                                  </label>
                                  <input
                                    id="cr-branch-custom-add"
                                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                                    value={rosterAddBranchCustom}
                                    onChange={(e) => setRosterAddBranchCustom(e.target.value)}
                                    placeholder="Type branch name"
                                    autoComplete="off"
                                  />
                                </div>
                              ) : null}

                              <div>
                                <label className="text-xs font-semibold text-slate-700" htmlFor="cr-dept-add">
                                  Department <span className="font-normal text-slate-500">(optional)</span>
                                </label>
                                <input
                                  id="cr-dept-add"
                                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 placeholder:text-slate-500"
                                  value={rosterAddDepartment}
                                  onChange={(e) => setRosterAddDepartment(e.target.value)}
                                  placeholder="e.g. School of Engineering"
                                  autoComplete="off"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-6 text-center">
                            <p className="text-sm font-semibold text-slate-900">Adding a teacher</p>
                            <p className="mx-auto mt-2 max-w-sm text-xs font-medium leading-relaxed text-slate-600">
                              No subject or class fields needed. Enter their name, school email, and a strong initial
                              password.
                            </p>
                          </div>
                        )}
                      </fieldset>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                      <Button
                        type="submit"
                        disabled={addingUser}
                        className="rounded-xl bg-indigo-600 px-6 hover:bg-indigo-500"
                      >
                        {addingUser ? "Creating…" : "Create account"}
                      </Button>
                      <span className="text-xs font-medium text-slate-500">They can reset the password anytime from login.</span>
                    </div>
                  </form>
                </CardContent>
              </Card>
              </div>
            </div>
            ) : null}

            <div
              id="college-dash-roster"
              tabIndex={-1}
              className={cn(
                "scroll-mt-28 rounded-xl border border-slate-200 bg-white p-5 shadow-none outline-none sm:p-6",
                campusDirectoryPage ? "mt-0 scroll-mt-28" : "mt-5 scroll-mt-28",
                campusDirectoryPage && rosterRemovalPickIds.length > 0 && "pb-28 sm:pb-32"
              )}
            >
              <div className="flex flex-col gap-3 border-b border-slate-100/90 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1.5">
                    <h3 className="text-lg font-semibold tracking-tight text-[var(--text)] sm:text-xl">
                      Students and teachers you added
                    </h3>
                    {!campusDirectoryPage ? (
                      <span className="inline-flex items-center rounded-full border border-sky-200/90 bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-950">
                        Quick look
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-emerald-200/90 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-950">
                        Full list
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-[var(--text-muted)]">
                    <span className="font-semibold tabular-nums text-[var(--text)]">{roster.length}</span>{" "}
                    total
                    {!campusDirectoryPage && roster.length > CAMPUS_ROSTER_PREVIEW_MAX
                      ? ` · Table shows first ${Math.min(CAMPUS_ROSTER_PREVIEW_MAX, rosterPreviewRows.length)} alphabetically`
                      : null}
                    {campusDirectoryPage &&
                    (filteredCampusPeople.length !== roster.length ||
                      campusPeopleKindFilter !== "all" ||
                      campusPeopleSearchQuery.trim())
                      ? ` · ${filteredCampusPeople.length} shown (filtered)`
                      : null}
                  </p>
                  {!campusDirectoryPage && roster.length > 0 ? (
                    <p className="max-w-lg text-xs leading-relaxed text-[var(--text-muted)]">
                      Use{" "}
                      <span className="font-semibold text-[var(--text)]">View more</span> (top right here or below the
                      table) to open the{" "}
                      <Link
                        to="/dashboard/college/roster"
                        onMouseEnter={prefetchCollegePeopleFullListChunk}
                        onFocus={prefetchCollegePeopleFullListChunk}
                        className="font-semibold text-[var(--primary)] underline decoration-slate-300 underline-offset-2 hover:opacity-90"
                      >
                        full roster page
                      </Link>{" "}
                      when you need search, browse by program, row checkboxes, or bulk delete.
                    </p>
                  ) : null}
                </div>
                {!campusDirectoryPage && roster.length > 0 ? (
                  <div className="flex shrink-0 flex-col items-stretch gap-1 sm:items-end sm:pt-0.5">
                    <Button
                      asChild
                      type="button"
                      variant="outline"
                      className="h-10 w-full gap-2 rounded-xl border-slate-200 bg-white px-4 text-sm font-semibold shadow-sm hover:bg-slate-50 sm:w-auto"
                    >
                      <Link
                        to="/dashboard/college/roster"
                        onMouseEnter={prefetchCollegePeopleFullListChunk}
                        onFocus={prefetchCollegePeopleFullListChunk}
                      >
                        View more
                        <ArrowRight className="size-4 shrink-0 opacity-90" aria-hidden />
                      </Link>
                    </Button>
                    {roster.length > CAMPUS_ROSTER_PREVIEW_MAX ? (
                      <span className="text-center text-[11px] font-medium tabular-nums text-slate-500 sm:text-right">
                        {roster.length - CAMPUS_ROSTER_PREVIEW_MAX} not shown here
                      </span>
                    ) : (
                      <span className="text-center text-[11px] font-medium text-slate-500 sm:text-right">
                        Full search &amp; bulk tools
                      </span>
                    )}
                  </div>
                ) : null}
              </div>

              {campusDirectoryPage ? (
                <>
                  <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-4">
                    <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                      Find &amp; bulk actions
                    </p>
                    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
                      <div className="relative min-w-0 flex-1 lg:max-w-md">
                        <Search
                          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                          aria-hidden
                        />
                        <input
                          type="search"
                          placeholder="Search name, email, program, branch, year…"
                          autoComplete="off"
                          id="college-campus-people-search"
                          className="w-full rounded-xl border border-slate-200/90 bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-slate-400 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15"
                          value={campusPeopleSearchQuery}
                          onChange={(e) => setCampusPeopleSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="w-full shrink-0 lg:w-auto">
                        <label htmlFor="college-campus-people-kind" className="sr-only">
                          Show
                        </label>
                        <select
                          id="college-campus-people-kind"
                          className="h-[42px] w-full rounded-xl border border-slate-200/90 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition-[border-color,box-shadow] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 lg:min-w-[11rem]"
                          value={campusPeopleKindFilter}
                          onChange={(e) => setCampusPeopleKindFilter(e.target.value)}
                        >
                          <option value="all">Everyone</option>
                          <option value="student">Students only</option>
                          <option value="faculty">Faculty only</option>
                        </select>
                      </div>
                      <div className="flex w-full flex-wrap gap-2 lg:ml-auto lg:w-auto lg:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 gap-2 rounded-xl border-slate-200 bg-white px-4 text-xs font-semibold shadow-sm hover:border-slate-300 hover:bg-slate-100 hover:!text-[var(--primary)] sm:text-sm"
                          aria-expanded={campusGroupedPanelOpen}
                          onClick={() =>
                            setCampusGroupedPanelOpen((v) => {
                              const next = !v;
                              if (next)
                                window.requestAnimationFrame(() =>
                                  document.getElementById("college-grouped-roster")?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "nearest",
                                  })
                                );
                              return next;
                            })
                          }
                        >
                          <Layers className="size-4 shrink-0" aria-hidden />
                          {campusGroupedPanelOpen ? "Hide program browser" : "Browse by program & class"}
                        </Button>
                        <Button
                          type="button"
                          variant={rosterRemovalMode ? "default" : "outline"}
                          size="sm"
                          className={cn(
                            "h-10 inline-flex items-center gap-2 rounded-xl px-4 text-xs font-semibold sm:text-sm",
                            !rosterRemovalMode &&
                              "border border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-100 hover:!text-[var(--primary)]"
                          )}
                          disabled={rosterBulkDeleteBusy}
                          onClick={() => {
                            setRosterRemovalMode((prev) => {
                              const next = !prev;
                              if (!next) clearRemovalPickIds();
                              return next;
                            });
                          }}
                        >
                          {rosterRemovalMode ? "Done selecting" : "Select rows"}
                          {rosterRemovalMode && rosterRemovalPickIds.length > 0 ? (
                            <span className="ml-1 inline-flex min-h-[1.35rem] min-w-[1.35rem] items-center justify-center rounded-full bg-emerald-50 px-1.5 text-[10px] font-bold tabular-nums text-emerald-950 ring-1 ring-emerald-200/80">
                              {rosterRemovalPickIds.length}
                            </span>
                          ) : null}
                        </Button>
                      </div>
                    </div>
                  </div>
                  {rosterRemovalMode && rosterListNarrowedBySearchOrKind ? (
                    <p
                      role="note"
                      className="mt-3 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-[11px] font-medium leading-relaxed text-sky-950 sm:text-xs"
                    >
                      Search or the dropdown (Students only / Teachers only) only hides rows—they are still at your
                      school. &quot;Select all&quot; stays off so you don&apos;t mix up a short list with everyone in the
                      table.
                    </p>
                  ) : null}

                  <CollegeRosterGroupedPanel
                    expanded={campusGroupedPanelOpen}
                    onCollapse={() => setCampusGroupedPanelOpen(false)}
                    roster={sortedRoster}
                    selectedIds={rosterRemovalPickIds}
                    addSelectedIds={addRemovalPickIds}
                    clearSelectedIds={clearRemovalPickIds}
                    toggleSelectedId={toggleRemovalPickId}
                    deleteBusy={rosterBulkDeleteBusy}
                    onConfirmDeleteMany={(ids) => runCampusMemberDelete(ids, { collapseGroupedPanel: true })}
                  />

                  <div className="mt-4 max-h-[min(75vh,46rem)] overflow-auto rounded-xl border border-slate-200 bg-white scroll-smooth [scrollbar-color:rgb(148_163_184)_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/90">
                    <table className="w-full min-w-[820px] text-left text-sm text-[var(--text)]">
                      <thead>
                        <tr className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          <th
                            scope="col"
                            className="sticky top-0 z-10 w-[4.25rem] whitespace-nowrap border-b border-slate-200 bg-slate-100/95 px-3 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                            title="Numbered 1, 2, 3… in A–Z name order (students and teachers counted separately in this table). Stays in sequence when people are added."
                          >
                            S.no.
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Name
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Email
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Member
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Program
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Branch
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Year
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Details
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100/95 px-4 py-3 font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                          >
                            Approval
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-100/95 px-4 py-3 text-right align-middle font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm sm:min-w-[12.25rem]"
                          >
                            Actions
                          </th>
                          {rosterRemovalMode ? (
                            <th
                              scope="col"
                              className="sticky top-0 z-20 border-b border-slate-200 bg-slate-100/95 px-3 py-3 text-center font-medium shadow-[0_1px_0_rgb(226_232_240)] backdrop-blur-sm"
                            >
                              <span className="sr-only">Select row</span>
                              <input
                                ref={rosterHeaderCheckboxRef}
                                type="checkbox"
                                checked={rosterListNarrowedBySearchOrKind ? false : allFilteredMarked}
                                onChange={toggleSelectAllFiltered}
                                disabled={rosterHeaderSelectAllDisabled}
                                aria-label={
                                  rosterListNarrowedBySearchOrKind
                                    ? "Select-all is off while search or People only / Teachers only is on — clear that to select everyone you see."
                                    : "Select all rows currently shown in the table"
                                }
                                title={
                                  rosterListNarrowedBySearchOrKind
                                    ? "Clear search and choose Everyone above to turn on select-all for the visible rows."
                                    : undefined
                                }
                                className="size-4 rounded border-slate-400 accent-[var(--primary)]"
                              />
                            </th>
                          ) : null}
                        </tr>
                      </thead>
                      <tbody>
                        {roster.length === 0 ? (
                          <tr>
                            <td colSpan={rosterTableColSpanExpanded} className="px-4 py-8 text-center text-slate-500">
                              {campusDirectoryPage ? (
                                <>
                                  No students or teachers here yet. Add people from the college overview (Manage people
                                  section) or import from a spreadsheet there.
                                </>
                              ) : (
                                <>
                                  No students or teachers here yet. Add someone with the form above or upload a
                                  spreadsheet below.
                                </>
                              )}
                            </td>
                          </tr>
                        ) : filteredCampusPeople.length === 0 ? (
                          <tr>
                            <td colSpan={rosterTableColSpanExpanded} className="px-4 py-8 text-center text-slate-500">
                              No rows match your search or filter. Clear the search box or choose Everyone above.
                            </td>
                          </tr>
                        ) : (
                          filteredCampusRowsOrdinal.map(({ user: u, studentOrdinal, facultyOrdinal }) => {
                            const cls = u.studentClass;
                            const isStudent = u.role === "student";
                            const rid = rosterRowId(u);
                            if (!rid) return null;
                            return (
                              <tr
                                key={rid}
                                className="border-b border-slate-100 align-middle transition-colors last:border-0 hover:bg-slate-50/90"
                              >
                                <td className="max-w-[6rem] truncate px-3 py-3 text-center tabular-nums font-medium text-slate-700">
                                  {isStudent
                                    ? campusRosterStudentSerial(cls, studentOrdinal)
                                    : String(facultyOrdinal)}
                                </td>
                                <td className="px-4 py-3 font-medium text-[var(--text)]">{u.name}</td>
                                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-700">{u.email}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                                      isStudent
                                        ? "border-sky-200/90 bg-sky-50 text-sky-950"
                                        : "border-violet-200/90 bg-violet-50 text-violet-950"
                                    )}
                                  >
                                    {isStudent ? "Student" : "Faculty"}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-700">
                                  {isStudent ? cls?.course || "—" : "—"}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-700">
                                  {isStudent ? cls?.branch || "—" : "—"}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-700">
                                  {isStudent ? cls?.year || "—" : "—"}
                                </td>
                                <td className="max-w-[12rem] px-4 py-3 text-xs font-medium leading-snug text-slate-700 sm:text-sm">
                                  {isStudent
                                    ? [cls?.semester, cls?.department].filter(Boolean).join(" · ") || "—"
                                    : u.facultyDesignation?.trim() || "—"}
                                </td>
                                <td className="px-4 py-3 capitalize font-medium text-slate-700">
                                  {u.role === "faculty" ? u.facultyApprovalStatus || "approved" : "—"}
                                </td>
                                <td className="whitespace-nowrap px-4 py-3 text-right align-middle">
                                  <div className="inline-flex flex-nowrap items-center justify-end gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-9 w-[8.125rem] shrink-0 justify-center rounded-lg px-2 text-xs shadow-sm hover:bg-white"
                                      onClick={() => navigate(`/dashboard/learners/${u._id}`)}
                                    >
                                      View profile
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      disabled={rosterBulkDeleteBusy}
                                      className="h-9 w-9 shrink-0 rounded-lg border-rose-200 bg-white p-0 text-rose-700 shadow-sm hover:bg-rose-50"
                                      title="Remove from campus"
                                      aria-label={`Delete ${u.name || u.email}`}
                                      onClick={() => runCampusMemberDelete([rid], { collapseGroupedPanel: false })}
                                    >
                                      <Trash2 className="mx-auto size-4 shrink-0" aria-hidden />
                                    </Button>
                                  </div>
                                </td>
                                {rosterRemovalMode ? (
                                  <td className="px-3 py-3 text-center align-middle">
                                    <input
                                      type="checkbox"
                                      checked={rosterRemovalPickIds.includes(rid)}
                                      onChange={() => toggleRemovalPickId(rid)}
                                      aria-label={`Select ${u.name || u.email}`}
                                      disabled={rosterBulkDeleteBusy || !rid}
                                      className="size-4 rounded border-slate-300 accent-[var(--primary)]"
                                    />
                                  </td>
                                ) : null}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                    <table className="w-full min-w-[360px] text-left text-sm text-[var(--text)]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/90 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                          <th scope="col" className="px-3 py-3 font-medium whitespace-nowrap">
                            S.no.
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Name
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Email
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Member
                          </th>
                          <th scope="col" className="px-4 py-3 font-medium">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {roster.length === 0 ? (
                          <tr>
                            <td colSpan={rosterPreviewColSpan} className="px-4 py-8 text-center text-slate-500">
                              No students or teachers here yet. Add someone with the form above or upload a spreadsheet
                              below.
                            </td>
                          </tr>
                        ) : (
                          rosterPreviewRows.map((u, idx) => {
                            const isStudent = u.role === "student";
                            const { studentOrdinal: sOrd, facultyOrdinal: fOrd } = rosterPreviewRowsSerialMeta[idx];
                            return (
                              <tr
                                key={u._id}
                                className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/90"
                              >
                                <td className="max-w-[6rem] truncate px-3 py-3 text-center tabular-nums font-medium text-slate-700">
                                  {isStudent ? campusRosterStudentSerial(u.studentClass, sOrd) : String(fOrd)}
                                </td>
                                <td className="px-4 py-3 font-medium text-[var(--text)]">{u.name}</td>
                                <td className="max-w-[12rem] truncate px-4 py-3 font-medium text-slate-700">{u.email}</td>
                                <td className="px-4 py-3">
                                  <span
                                    className={cn(
                                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                                      isStudent
                                        ? "border-sky-200/90 bg-sky-50 text-sky-950"
                                        : "border-violet-200/90 bg-violet-50 text-violet-950"
                                    )}
                                  >
                                    {isStudent ? "Student" : "Faculty"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 min-w-[6.75rem] justify-center rounded-lg text-xs shadow-sm hover:bg-white"
                                    onClick={() => navigate(`/dashboard/learners/${u._id}`)}
                                  >
                                    View profile
                                  </Button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {roster.length > 0 ? (
                    <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <p className="text-xs font-medium leading-relaxed text-slate-600 sm:max-w-[min(100%,28rem)]">
                        {roster.length > CAMPUS_ROSTER_PREVIEW_MAX ? (
                          <>
                            Showing the first{" "}
                            <strong className="text-slate-900">{CAMPUS_ROSTER_PREVIEW_MAX}</strong> people alphabetically
                            ({roster.length - CAMPUS_ROSTER_PREVIEW_MAX} more on the full roster page — use View more).
                          </>
                        ) : (
                          <>
                            Showing everyone here would crowd the dashboard — tap View more for the complete table with
                            search and bulk actions.
                          </>
                        )}
                      </p>
                      <Button
                        asChild
                        type="button"
                        className="h-10 w-full gap-2 rounded-xl px-5 text-sm font-semibold shadow-sm sm:w-auto"
                      >
                        <Link
                          to="/dashboard/college/roster"
                          onMouseEnter={prefetchCollegePeopleFullListChunk}
                          onFocus={prefetchCollegePeopleFullListChunk}
                        >
                          View more
                          <ArrowRight className="size-4 shrink-0 opacity-90" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  ) : null}
                </>
              )}

            </div>
          </div>

          {!campusDirectoryPage ? (
          <>
          <div className="mt-5 space-y-6">
            <Card
              ref={bulkSpreadsheetSectionRef}
              id="college-dash-bulk-spreadsheet"
              className="border border-slate-200 bg-white shadow-none"
            >
              <CardContent className="p-6">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                      Upload from a spreadsheet
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
                      Excel (.xlsx, .xls) or CSV. Works best when student and faculty lists are uploaded separately.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white px-4 py-4 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                        <label
                          className="shrink-0 text-sm font-semibold leading-none text-[var(--text)]"
                          htmlFor="college-bulk-upload-type"
                        >
                          Sheet contains
                        </label>
                        <select
                          id="college-bulk-upload-type"
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition-[box-shadow,border-color] hover:border-slate-300 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 sm:h-11 sm:w-auto sm:min-w-[min(100%,220px)]"
                          value={bulkSpreadsheetUploadType}
                          disabled={bulkBusy}
                          onChange={(e) => {
                            setBulkSpreadsheetUploadType(e.target.value);
                            setStudentBulkBanner(null);
                            setFacultyBulkBanner(null);
                          }}
                        >
                          <option value="student">Students — new Student accounts</option>
                          <option value="faculty">Faculty — new Faculty accounts</option>
                        </select>
                      </div>
                      {bulkSpreadsheetUploadType === "student" ? (
                        <StudentRosterSheetFormatHelp className="w-full shrink-0 border border-slate-300/70 bg-white !text-slate-900 shadow-sm hover:!bg-slate-50 hover:!text-slate-900 sm:w-auto" />
                      ) : null}
                    </div>
                    <p className="mt-3 border-t border-slate-200/80 pt-3 text-[11px] leading-relaxed text-[var(--text-muted)]">
                      Choose correctly before attaching a file—the rest of this card changes based on Students vs Faculty.
                    </p>
                  </div>
                </div>

                {bulkSpreadsheetUploadType === "student" ? (
                  <>
                <div
                  role="alert"
                  className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 shadow-sm"
                >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
                    <div>
                      <p className="font-semibold text-amber-950">Before you upload</p>
                      <p className="mt-1.5">
                        New accounts use this default password:{" "}
                        <code className="rounded-md bg-white px-1.5 py-0.5 font-mono text-sm font-semibold text-[var(--primary-dark)] ring-1 ring-amber-200/80">
                          {STUDENT_ROSTER_DEFAULT_PASSWORD}
                        </code>
                        . If the same email appears more than once in the sheet, later rows are skipped (the first wins).
                      </p>
                    </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)]" htmlFor="college-import-course">
                      Program label in file (must match)
                    </label>
                    <select
                      id="college-import-course"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      value={importCourse}
                      onChange={(e) => {
                        setImportCourse(e.target.value);
                        setStudentBulkBanner(null);
                      }}
                    >
                      <option value="">Select course</option>
                      {STUDENT_COHORT_PROGRAM_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)]" htmlFor="college-import-program">
                      Branch in file (must match)
                    </label>
                    <select
                      id="college-import-program"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      value={importProgram}
                      onChange={(e) => {
                        setImportProgram(e.target.value);
                        setStudentBulkBanner(null);
                      }}
                    >
                      <option value="">Select program</option>
                      {STUDENT_COHORT_BRANCH_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)]" htmlFor="college-import-year">
                      Year
                    </label>
                    <select
                      id="college-import-year"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      value={importYear}
                      onChange={(e) => {
                        setImportYear(e.target.value);
                        setStudentBulkBanner(null);
                      }}
                    >
                      <option value="">Select year</option>
                      {STUDENT_COHORT_YEAR_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[var(--text)]" htmlFor="college-import-semester">
                      Semester (optional)
                    </label>
                    <select
                      id="college-import-semester"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                      value={importSemester}
                      onChange={(e) => {
                        setImportSemester(e.target.value);
                        setStudentBulkBanner(null);
                      }}
                    >
                      <option value="">—</option>
                      {STUDENT_COHORT_SEMESTER_OPTIONS.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <VisibleFileInput
                  className="mt-4"
                  id="college-bulk-students"
                  label="Spreadsheet file"
                  accept={BULK_SPREADSHEET_ACCEPT}
                  onChange={(e) => {
                    setStudentSheetFile(e.target.files?.[0] || null);
                    setStudentBulkBanner(null);
                  }}
                  disabled={bulkBusy}
                />
                {bulkBusyKind === "students" ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
                    <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
                    Importing students… this can take a moment for large files.
                  </div>
                ) : null}
                {studentBulkBanner?.variant === "success" || studentBulkBanner?.variant === "partial" ? (
                  <div
                    role="status"
                    className={cn(
                      "mt-4 rounded-xl border px-4 py-3 text-sm font-medium",
                      studentBulkBanner.variant === "partial"
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-emerald-200 bg-emerald-50 text-emerald-950"
                    )}
                  >
                    {studentBulkBanner.text}
                  </div>
                ) : null}
                {studentBulkBanner?.variant === "error" ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950"
                  >
                    {studentBulkBanner.text}
                  </div>
                ) : null}
                <Button
                  className="mt-4 w-full sm:w-auto"
                  disabled={
                    !studentSheetFile ||
                    !importCourse.trim() ||
                    !importProgram.trim() ||
                    !importYear.trim() ||
                    bulkBusy
                  }
                  onClick={handleCollegeStudentImport}
                >
                  {bulkBusyKind === "students" ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Importing…
                    </>
                  ) : (
                    "Import students"
                  )}
                </Button>
                  </>
                ) : (
                  <>
                <div className="mt-5 space-y-3">
                  <div
                    role="note"
                    className="flex gap-3 rounded-xl border border-sky-200 bg-sky-50/90 px-4 py-3 text-sm leading-relaxed text-slate-800 shadow-sm"
                  >
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden />
                    <div>
                      <p className="font-semibold text-sky-950">Spreadsheet layout</p>
                      <p className="mt-1.5 text-[var(--text-muted)]">
                        <span className="text-[var(--text)]">Use row 1 for headers.</span> Required columns:{" "}
                        <strong className="font-semibold text-[var(--text)]">Name</strong>,{" "}
                        <strong className="font-semibold text-[var(--text)]">Email</strong>, and{" "}
                        <strong className="font-semibold text-[var(--text)]">Designation</strong> (you may label that
                        column Title, Position, or Job title). Optional: Password — if blank, new accounts use{" "}
                        <code className="rounded bg-white px-1 py-0.5 font-mono text-xs text-[var(--primary-dark)] ring-1 ring-sky-200">
                          {STUDENT_ROSTER_DEFAULT_PASSWORD}
                        </code>{" "}
                        (must meet the usual password rules).
                      </p>
                    </div>
                  </div>
                  <div
                    role="alert"
                    className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950 shadow-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
                    <div>
                      <p className="font-semibold text-amber-950">Before you upload</p>
                      <p className="mt-1.5">
                        Teachers are created as <strong className="font-semibold">approved</strong> campus accounts.
                        Duplicate emails in the same file are skipped (first row wins). Existing platform emails are
                        skipped with an error in the import summary.
                      </p>
                    </div>
                  </div>
                </div>
                <VisibleFileInput
                  className="mt-4"
                  id="college-bulk-faculty"
                  label="Spreadsheet file"
                  accept={BULK_SPREADSHEET_ACCEPT}
                  onChange={(e) => {
                    setFacultySheetFile(e.target.files?.[0] || null);
                    setFacultyBulkBanner(null);
                  }}
                  disabled={bulkBusy}
                />
                {bulkBusyKind === "faculty" ? (
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
                    <LoaderCircle className="h-5 w-5 shrink-0 animate-spin text-[var(--primary)]" aria-hidden />
                    Importing teachers…
                  </div>
                ) : null}
                {facultyBulkBanner?.variant === "success" || facultyBulkBanner?.variant === "partial" ? (
                  <div
                    role="status"
                    className={cn(
                      "mt-4 rounded-xl border px-4 py-3 text-sm font-medium",
                      facultyBulkBanner.variant === "partial"
                        ? "border-amber-200 bg-amber-50 text-amber-950"
                        : "border-emerald-200 bg-emerald-50 text-emerald-950"
                    )}
                  >
                    {facultyBulkBanner.text}
                  </div>
                ) : null}
                {facultyBulkBanner?.variant === "error" ? (
                  <div
                    role="alert"
                    className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-950"
                  >
                    {facultyBulkBanner.text}
                  </div>
                ) : null}
                <Button
                  className="mt-4 w-full sm:w-auto"
                  disabled={!facultySheetFile || bulkBusy}
                  onClick={handleCollegeFacultyImport}
                >
                  {bulkBusyKind === "faculty" ? (
                    <>
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Importing…
                    </>
                  ) : (
                    "Import teachers"
                  )}
                </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text)]">Bulk materials (Excel or CSV)</h3>
                <p className="mt-1 text-sm font-medium text-[var(--text-muted)]">
                  Columns: title, summary, content, categorySlug/categoryId.
                </p>
                <VisibleFileInput
                  className="mt-4"
                  id="college-bulk-materials"
                  label="Materials spreadsheet"
                  accept={BULK_SPREADSHEET_ACCEPT}
                  onChange={(e) => setMaterialSheetFile(e.target.files?.[0] || null)}
                  disabled={bulkBusy}
                />
                <Button className="mt-4 w-full" disabled={!materialSheetFile || bulkBusy} onClick={handleMaterialSheetImport}>
                  Import materials
                </Button>
              </CardContent>
            </Card>
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-[var(--text)]">Create material from image</h3>
                <input
                  placeholder="Material title"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                />
                <input
                  placeholder="Category ID"
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none placeholder:text-slate-500 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
                  value={materialCategoryId}
                  onChange={(e) => setMaterialCategoryId(e.target.value)}
                />
                <VisibleFileInput
                  className="mt-3"
                  id="college-material-image"
                  label="Image file"
                  accept="image/*"
                  onChange={(e) => setMaterialImageFile(e.target.files?.[0] || null)}
                  disabled={bulkBusy}
                />
                <Button
                  className="mt-4 w-full"
                  disabled={!materialImageFile || !materialCategoryId.trim() || !materialTitle.trim() || bulkBusy}
                  onClick={handleMaterialImageCreate}
                >
                  Create from image
                </Button>
              </CardContent>
            </Card>
            </div>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardMetricCard
              title="Published Assessments"
              value={publishedAssessments.length}
              subtitle="Current assessments available to learners"
              icon={BookOpenCheck}
              to="/assessments"
            />
            <DashboardMetricCard
              title="Open Jobs"
              value={openJobs.length}
              subtitle="Company opportunities visible right now"
              icon={BriefcaseBusiness}
              scrollTargetId="college-dash-open-jobs"
            />
            <DashboardMetricCard
              title="Institution Role"
              value="Active"
              subtitle="College access is enabled"
              icon={Building2}
            />
            <DashboardMetricCard
              title="Campus Readiness"
              value={publishedAssessments.length || openJobs.length ? "Live" : "Setup"}
              subtitle="Platform opportunities are being tracked"
              icon={GraduationCap}
              scrollTargetId="college-dash-overview"
            />
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <Card
              id="college-dash-overview"
              tabIndex={-1}
              className="scroll-mt-28 border border-slate-200 bg-white shadow-none outline-none focus:outline-none"
            >
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[var(--text)]">College Overview</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  A dedicated college dashboard is now active for this role.
                </p>
                <Button asChild className="mt-4" variant="default">
                  <Link to="/assessments/create">Create assessment (MCQ or question paper)</Link>
                </Button>

                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">College Name</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text)]">{me.name}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Email</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text)]">{me.email}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-[var(--text-muted)]">Role</p>
                    <p className="mt-2 text-lg font-semibold capitalize text-[var(--text)]">{me.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-[var(--primary)]">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-6 text-2xl font-bold text-[var(--text)]">Top Assessment Skills</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Skills that appear most often in the currently published assessments.
                </p>

                <div className="mt-6 space-y-3">
                  {topAssessmentSkills.length ? (
                    topAssessmentSkills.map(([skill, count]) => (
                      <div
                        key={skill}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-[var(--primary)]" />
                          <span className="text-sm font-semibold text-[var(--text)]">{skill}</span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-[var(--text-muted)]">{count}</span>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                      No published assessment skill data available yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-5 grid gap-6 xl:grid-cols-2">
            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[var(--text)]">Recent Published Assessments</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Latest assessments that learners can attempt across the platform.
                </p>

                <div className="mt-6 space-y-4">
                  {publishedAssessments.slice(0, 5).length ? (
                    publishedAssessments.slice(0, 5).map((assessment) => (
                      <div
                        key={assessment._id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <h3 className="font-semibold text-[var(--text)]">{assessment.title}</h3>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {assessment.skill || "General"} · {assessment.questions?.length || 0} questions
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                      No published assessments available right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 bg-white shadow-none">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold text-[var(--text)]">Recent Open Jobs</h2>
                <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">
                  The same open postings every partner college sees—use them for placement planning and
                  student outreach.
                </p>

                <div className="mt-6 space-y-4">
                  {openJobs.slice(0, 5).length ? (
                    openJobs.slice(0, 5).map((job) => (
                      <div
                        key={job._id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <h3 className="font-semibold text-[var(--text)]">{job.title}</h3>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {job.createdBy?.name || "Company"} · {job.location || "Remote"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-[var(--text-muted)]">
                      No open jobs available right now.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          </>
          ) : null}

          </div>
        </div>
      </div>
    </div>
      {campusDirectoryPage && rosterRemovalPickIds.length > 0 && typeof document !== "undefined"
        ? createPortal(
            <aside
              role="toolbar"
              aria-label="Remove several selected people at once"
              className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
            >
              <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-3 rounded-2xl border border-rose-200/90 bg-rose-50/95 px-4 py-4 shadow-[0_-16px_48px_-20px_rgba(244,63,94,0.45)] backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3 text-sm text-rose-950">
                  <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 ring-1 ring-rose-200/60">
                    <AlertTriangle className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug tracking-tight">
                      <span className="tabular-nums">{rosterRemovalPickIds.length}</span>{" "}
                      {rosterRemovalPickIds.length === 1 ? "person" : "people"} selected
                    </p>
                    <p className="mt-1 text-xs font-medium leading-relaxed text-rose-900/80">
                      Delete is pinned here so you don&apos;t scroll back up. This permanently removes them from your
                      campus and clears related learner data.
                    </p>
                  </div>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 w-full rounded-xl border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50 sm:w-auto"
                    disabled={rosterBulkDeleteBusy}
                    onClick={() => clearRemovalPickIds()}
                  >
                    Clear selection
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={rosterBulkDeleteBusy}
                    className="h-10 w-full min-w-[8.5rem] rounded-xl font-semibold shadow-md sm:w-auto"
                    onClick={() => runCampusMemberDelete(rosterRemovalPickIds, { collapseGroupedPanel: false })}
                  >
                    <Trash2 className="mr-2 size-4" aria-hidden />
                    {rosterBulkDeleteBusy ? "Removing…" : `Delete (${rosterRemovalPickIds.length})`}
                  </Button>
                </div>
              </div>
            </aside>,
            document.body
          )
        : null}
    </>
  );
}

export default CollegeDashboard;


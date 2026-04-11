/** Shared cohort picklists for faculty publishing and student profiles (API normalizes case for matching). */

export const COHORT_OTHER = "__other__";

/** Broad program tracks; each has specific degrees stored in the profile `course` field. */
export const COHORT_PROGRAM_GROUPS = [
  {
    id: "engineering",
    label: "Engineering",
    degrees: ["B.Tech", "Diploma"],
  },
  {
    id: "management",
    label: "Management",
    degrees: ["BCA", "MCA", "BBA", "MBA"],
  },
  {
    id: "nursing",
    label: "Nursing",
    degrees: ["B.Sc"],
  },
  {
    id: "pharmacy",
    label: "Pharmacy",
    degrees: ["B.Pharma", "D.Pharma"],
  },
];

/** Specialization (CSE, EE, …) — only used with Engineering degrees; stored in `branch`. */
export const COHORT_BRANCH_PRESETS = ["CSE", "ME", "EE", "ECE", "Civil", "IT", "AIML"];

export const COHORT_YEAR_PRESETS = ["1", "2", "3", "4"];

export const COHORT_SEMESTER_PRESETS = ["1", "2", "3", "4", "5", "6", "7", "8"];

/** Every preset degree label across all programs (for canonicalization). */
export const ALL_COHORT_DEGREE_PRESETS = COHORT_PROGRAM_GROUPS.flatMap((g) => g.degrees);

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

/** Map stored value to the canonical preset label when it matches case-insensitively. */
export function canonicalizeCohortPreset(presets, value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  const hit = presets.find((p) => p.toLowerCase() === lower);
  return hit ?? v;
}

export function degreesForProgram(programId) {
  const g = COHORT_PROGRAM_GROUPS.find((p) => p.id === programId);
  return g ? g.degrees : [];
}

/** Program id from a known preset degree, or "". */
export function programIdForDegree(degreeValue) {
  const d = norm(degreeValue);
  if (!d) return "";
  for (const g of COHORT_PROGRAM_GROUPS) {
    if (g.degrees.some((x) => norm(x) === d)) return g.id;
  }
  return "";
}

/** B.Tech / Diploma require a branch (CSE, ME, …). Must match backend `cohortRequiresBranch`. */
export function cohortDegreeRequiresBranch(degreeValue) {
  const d = norm(degreeValue);
  return d === "b.tech" || d === "diploma";
}

/**
 * Resolve program for UI when loading legacy profiles (unknown degree but engineering branch, etc.).
 */
export function inferCohortProgramId(course, branch) {
  const c = canonicalizeCohortPreset(ALL_COHORT_DEGREE_PRESETS, course);
  const fromDeg = programIdForDegree(c);
  if (fromDeg) return fromDeg;
  const b = String(branch ?? "").trim();
  if (
    b &&
    COHORT_BRANCH_PRESETS.some((x) => norm(x) === norm(b))
  ) {
    return "engineering";
  }
  return "";
}

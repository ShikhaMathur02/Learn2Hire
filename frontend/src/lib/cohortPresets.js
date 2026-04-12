/** Cohort picklists aligned with signup (`studentCohortFieldOptions.js`). */

import {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "./studentCohortFieldOptions";

export {
  STUDENT_COHORT_BRANCH_OPTIONS,
  STUDENT_COHORT_PROGRAM_OPTIONS,
  STUDENT_COHORT_SEMESTER_OPTIONS,
  STUDENT_COHORT_YEAR_OPTIONS,
} from "./studentCohortFieldOptions";

export const COHORT_OTHER = "__other__";

export const COHORT_BRANCH_PRESETS = [...STUDENT_COHORT_BRANCH_OPTIONS];
export const COHORT_YEAR_PRESETS = [...STUDENT_COHORT_YEAR_OPTIONS];
export const COHORT_SEMESTER_PRESETS = [...STUDENT_COHORT_SEMESTER_OPTIONS];

/** Program / degree labels (same as signup “Program”). */
export const ALL_COHORT_DEGREE_PRESETS = [...STUDENT_COHORT_PROGRAM_OPTIONS];

const LEGACY_YEAR_NUM = {
  "1": "1st year",
  "2": "2nd year",
  "3": "3rd year",
  "4": "4th year",
  "5": "5th year",
};

const LEGACY_SEMESTER_NUM = {
  "1": "Semester 1",
  "2": "Semester 2",
  "3": "Semester 3",
  "4": "Semester 4",
  "5": "Semester 5",
  "6": "Semester 6",
  "7": "Semester 7",
  "8": "Semester 8",
  "9": "Semester 9",
  "10": "Semester 10",
};

function norm(v) {
  return String(v ?? "").trim().toLowerCase();
}

/** Map legacy stored year (e.g. "1") to signup labels ("1st year"). */
export function alignCohortYearToSignupOptions(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (LEGACY_YEAR_NUM[v]) return LEGACY_YEAR_NUM[v];
  const lc = v.toLowerCase();
  const hit = Object.entries(LEGACY_YEAR_NUM).find(([k]) => k === lc);
  if (hit) return hit[1];
  return v;
}

/** Map legacy stored semester (e.g. "1") to signup labels ("Semester 1"). */
export function alignCohortSemesterToSignupOptions(value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (LEGACY_SEMESTER_NUM[v]) return LEGACY_SEMESTER_NUM[v];
  const lc = v.toLowerCase();
  const hit = Object.entries(LEGACY_SEMESTER_NUM).find(([k]) => k === lc);
  if (hit) return hit[1];
  return v;
}

/** Map stored value to the canonical preset label when it matches case-insensitively. */
export function canonicalizeCohortPreset(presets, value) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  const lower = v.toLowerCase();
  const hit = presets.find((p) => p.toLowerCase() === lower);
  return hit ?? v;
}

/** @deprecated No program groups; use STUDENT_COHORT_PROGRAM_OPTIONS. */
export const COHORT_PROGRAM_GROUPS = [];

/** @deprecated Use a single program dropdown. */
export function degreesForProgram() {
  return ALL_COHORT_DEGREE_PRESETS;
}

/** @deprecated */
export function programIdForDegree() {
  return "";
}

/**
 * Must match backend `cohortRequiresBranch` in learningController.js — engineering-style
 * degrees need a branch for cohort targeting.
 */
export function cohortDegreeRequiresBranch(degreeValue) {
  const d = norm(degreeValue);
  return d === "b.tech" || d === "diploma";
}

/** @deprecated */
export function inferCohortProgramId() {
  return "";
}

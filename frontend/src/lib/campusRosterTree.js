export const CAMPUS_ROSTER_UNSET_LABEL = "\u2014 Not set \u2014";

/** Stable roster row id for API calls (aggregation / lean docs may serialize _id differently). */
export function rosterRowId(user) {
  const raw = user?._id;
  if (raw == null || raw === "") return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw !== null && typeof raw.$oid === "string") {
    return raw.$oid;
  }
  try {
    if (typeof raw.toHexString === "function") return raw.toHexString();
  } catch {
    /* noop */
  }
  if (typeof raw.toString === "function") {
    const s = raw.toString();
    if (s && s !== "[object Object]") return s;
  }
  return "";
}

export function buildCampusStudentTree(students) {
  const tree = {};
  for (const u of students) {
    const cls = u.studentClass;
    const c = String(cls?.course || "").trim() || CAMPUS_ROSTER_UNSET_LABEL;
    const b = String(cls?.branch || "").trim() || CAMPUS_ROSTER_UNSET_LABEL;
    const y = String(cls?.year || "").trim() || CAMPUS_ROSTER_UNSET_LABEL;
    if (!tree[c]) tree[c] = {};
    if (!tree[c][b]) tree[c][b] = {};
    if (!tree[c][b][y]) tree[c][b][y] = [];
    tree[c][b][y].push(u);
  }
  return tree;
}

export function rosterStudents(roster) {
  return roster.filter((u) => u.role === "student");
}

export function rosterFaculty(roster) {
  return roster.filter((u) => u.role === "faculty");
}

export function studentProgramBranchKeys(u) {
  const cls = u.studentClass;
  return {
    program: String(cls?.course || "").trim() || CAMPUS_ROSTER_UNSET_LABEL,
    branch: String(cls?.branch || "").trim() || CAMPUS_ROSTER_UNSET_LABEL,
  };
}

/** Same ordering everywhere roster people are listed (additions keep A–Z with stable email tie-break). */
export function compareRosterPersonByName(a, b) {
  const an = String(a?.name ?? "").trim().toLocaleLowerCase();
  const bn = String(b?.name ?? "").trim().toLocaleLowerCase();
  const c = an.localeCompare(bn, undefined, { sensitivity: "base" });
  if (c !== 0) return c;
  return String(a?.email ?? "")
    .toLowerCase()
    .localeCompare(String(b?.email ?? "").toLowerCase(), undefined, { sensitivity: "base" });
}

/**
 * Roster tables pass `ordinal` (1-based index in the current A–Z list) so S.no. stays in sequence when
 * people are added. Without `ordinal`, falls back to stored import / profile serial (e.g. learner summary).
 */
export function campusRosterStudentSerial(cls, ordinal) {
  if (ordinal != null) return String(ordinal);
  const s = String(cls?.serialNumber ?? "").trim();
  if (s) return s;
  return "—";
}

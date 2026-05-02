/** Recommended header row for campus student roster imports (Excel / CSV). */
export const STUDENT_ROSTER_IMPORT_HEADERS = [
  "S.No.",
  "Name",
  "Department",
  "Branch",
  "Course",
  "Semester",
  "Year",
  "Contact number",
  "Email id",
];

/** Row layout + column naming (shared copy). */
export const STUDENT_ROSTER_IMPORT_SUMMARY =
  "Put column headers in row 1. Spreadsheet format suggests an order; flexible headers are allowed. If both “Program” (degree, e.g. B.Tech) and “Branch” (specialization, e.g. CSE) appear, Course is taken from Degree/Course/Program and Branch from Branch/Specialization.";

/** Cohort + semester + email uniqueness (append after summary where needed). */
export const STUDENT_ROSTER_IMPORT_MATCH_RULES =
  "Each row’s course (degree), branch, and year must align with what you choose below—spacing and dots like B.Tech vs BTech are ignored; spreadsheet years such as 1, 4, IV, or 4th usually match 1st year / 4th year selectors. Semester can be only in the file, only in this form, or both. Every email in the spreadsheet must be unique.";

/** Shown beside imports / in help modal as monospace example. */
export const STUDENT_ROSTER_DEFAULT_PASSWORD = "Firstname@123";

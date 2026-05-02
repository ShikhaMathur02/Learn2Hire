const path = require('path');
const XLSX = require('xlsx');

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

const asString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number' && Number.isFinite(value))
    return value % 1 === 0 ? String(Math.trunc(value)) : String(value);
  return String(value).trim();
};

const parseWorkbookRows = (buffer) => {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((row) => {
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = value;
    });
    return normalized;
  });
};

/**
 * Parse first sheet of an Excel workbook or a CSV upload (same column rules).
 * @param {Buffer} buffer
 * @param {string} [originalname] — used only to detect .csv
 */
const parseTabularFileRows = (buffer, originalname = '') => {
  const ext = path.extname(originalname || '').toLowerCase();
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: ext === '.csv',
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((row) => {
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[normalizeHeader(key)] = value;
    });
    return normalized;
  });
};

const pickFirst = (row, keys) => {
  for (const k of keys) {
    const v = asString(row[k]);
    if (v) return v;
  }
  return '';
};

/**
 * Many spreadsheets use separate columns Course/Degree vs Program vs Branch inconsistently:
 * — "Program" is often **B.Tech** (degree) while Branch is **CSE**; we normalized both to keys
 *   `course`/`program`/… so consume `program` for **course** when Course is empty,
 *   and for **branch** only when Branch is empty and Course is already filled.
 */
const extractStudentBulkRow = (row) => {
  const r = row || {};

  let course = pickFirst(r, ['course', 'degree', 'programme']);
  let branch = pickFirst(r, ['branch', 'specialization', 'stream']);

  const programColumn = pickFirst(r, ['program']);
  if (!course && programColumn) {
    course = programColumn;
  } else if (course && !branch && programColumn) {
    branch = programColumn;
  } else if (!course && !branch && programColumn) {
    branch = programColumn;
  }

  const yearRaw = pickFirst(r, ['year', 'academicyear', 'yr', 'class', 'stuclass']);

  return {
    sno: pickFirst(r, [
      'sno',
      'slno',
      'serialno',
      'serialnumber',
      's.no',
      's.no.',
      'rollno',
      'rollnumber',
      'roll',
      'regno',
      'registrationno',
      '#',
      'no',
    ]),
    name: pickFirst(r, ['name', 'studentname', 'fullname', 'firstname']),
    department: pickFirst(r, ['department', 'dept', 'discipline', 'school']),
    branch,
    program: branch,
    course,
    semester: pickFirst(r, ['semester', 'sem']),
    year: yearRaw,
    contact: pickFirst(r, [
      'contactnumber',
      'contact',
      'phonenumber',
      'phone',
      'mobile',
      'mobilenumber',
      'contactno',
    ]),
    email: pickFirst(r, ['email', 'emailid', 'e-mail', 'mail']),
  };
};

/** Collapse casing, dots, whitespace for forgiving course/branch compares (B.Tech ≈ BTech). */
const cohortTokenNorm = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[.\s_-]+/g, '');

const normKey = (s) =>
  String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/** Map common spreadsheet year variants to picker values ("1", "year 4", IV → same as selectors). */
const canonicalYearKey = (raw) => {
  const t = cohortTokenNorm(String(raw || '').replace(/°/g, ''));
  if (!t) return '';
  const onlyDigits = t.replace(/\D/g, '');
  if (
    onlyDigits === '1' ||
    t.includes('year1') ||
    t.endsWith('1styear') ||
    t === '1styear' ||
    t === 'firstyear' ||
    t === 'fy' ||
    t === 'i'
  ) {
    return cohortTokenNorm('1st year');
  }
  if (
    onlyDigits === '2' ||
    t.includes('year2') ||
    t.endsWith('2ndyear') ||
    t === '2ndyear' ||
    t === 'secondyear' ||
    t === 'ii'
  ) {
    return cohortTokenNorm('2nd year');
  }
  if (
    onlyDigits === '3' ||
    t.includes('year3') ||
    t.endsWith('3rdyear') ||
    t === '3rdyear' ||
    t === 'thirdyear' ||
    t === 'iii'
  ) {
    return cohortTokenNorm('3rd year');
  }
  if (
    onlyDigits === '4' ||
    t.includes('year4') ||
    t.endsWith('4thyear') ||
    t === '4thyear' ||
    t === 'fourthyear' ||
    t === 'finalyear' ||
    t === 'iv'
  ) {
    return cohortTokenNorm('4th year');
  }

  let u = normKey(raw).replace(/\s+/g, '');
  u = u.replace(/(\d)(st|nd|rd|th)/gi, '$1');
  if (u.includes('year')) {
    const m = u.match(/(\d+)/);
    if (m && m[1]) return canonicalYearKey(m[1]);
  }

  return normKey(raw).replace(/\s+/g, '');
};

/** Compare course+program when degree and branch are split across columns vs merged (e.g. "B.Tech" + "AI & ML" vs Course column "B.Tech AI & ML"). */
const cohortCombinedNorm = (course, programOrBranch) =>
  cohortTokenNorm(`${asString(course)} ${asString(programOrBranch)}`.trim());

const cohortRowMatchesTarget = (row, target) => {
  const rowBranch = row.branch || row.program;
  const yRow = canonicalYearKey(row.year);
  const yTarget = canonicalYearKey(target.year);
  const yearOk =
    yRow && yTarget ? yRow === yTarget : normKey(row.year) === normKey(target.year);

  const splitOk =
    cohortTokenNorm(row.course) === cohortTokenNorm(target.course) &&
    cohortTokenNorm(rowBranch) === cohortTokenNorm(target.program);

  const mergedOk =
    cohortCombinedNorm(row.course, rowBranch) ===
    cohortCombinedNorm(target.course, target.program);

  return (splitOk || mergedOk) && yearOk;
};

/**
 * Faculty roster columns: Name, Email, Designation (or Title), optional Password.
 * Default password matches student roster: Firstname@123
 */
const extractFacultyBulkRow = (row) => {
  const r = row || {};
  return {
    name: pickFirst(r, ['name', 'facultyname', 'fullname', 'teachername']),
    email: pickFirst(r, ['email', 'emailid', 'e-mail', 'mail']),
    designation: pickFirst(r, [
      'designation',
      'title',
      'position',
      'jobtitle',
      'rank',
      'facultyrole',
    ]),
    password: pickFirst(r, ['password', 'passwd', 'pwd', 'initialpassword']),
  };
};

const FACULTY_ROSTER_SHEET_FORMAT_HINT =
  'Use a header row with: Name, Email, Designation (you may use Title or Position instead), and optional Password. If Password is blank, new accounts use Firstname@123. Duplicate emails in one file are skipped (first row wins).';

/** Single-line description for API responses and UI. */
const STUDENT_ROSTER_SHEET_FORMAT_HINT =
  'Use a header row with: S.No., Name, Department, Branch, Course, Semester, Year, Contact number, Email id. If you use a “Program” column for the degree (B.Tech, MCA, …) and “Branch” for specialization (CSE, IT, …), both are supported. Course, Branch, and Year in each row must match the class you select; Semester in the sheet overrides the optional form value when present. Default password: Firstname@123.';

const displayNameFromEmail = (email) => {
  const local = String(email || '').split('@')[0] || 'student';
  const parts = local.split(/[._\-+]+/).filter(Boolean);
  const cap = (w) =>
    w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : '';
  const joined = parts.map(cap).filter(Boolean).join(' ');
  return joined || 'Student';
};

/** Default roster password: Firstname@123 (first name from name column or email local part). */
const defaultStudentPasswordFromRow = (row) => {
  const email = asString(row.email).toLowerCase();
  const name = asString(row.name);
  let first = '';
  if (name) {
    first = name.split(/\s+/)[0] || '';
  } else if (email) {
    first = (email.split('@')[0] || 'student').split(/[._\-]/)[0] || 'student';
  } else {
    first = 'Student';
  }
  const firstName =
    first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return `${firstName}@123`;
};

module.exports = {
  asString,
  parseWorkbookRows,
  parseTabularFileRows,
  extractStudentBulkRow,
  extractFacultyBulkRow,
  cohortRowMatchesTarget,
  displayNameFromEmail,
  defaultStudentPasswordFromRow,
  STUDENT_ROSTER_SHEET_FORMAT_HINT,
  FACULTY_ROSTER_SHEET_FORMAT_HINT,
};

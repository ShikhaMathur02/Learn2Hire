const path = require('path');
const XLSX = require('xlsx');

const normalizeHeader = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

const asString = (value) => String(value || '').trim();

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
 * Standard bulk student row: S.No, Course, Program, Year, Contact number, Email id.
 * Optional: Name (recommended — used for display name and default password first name).
 */
const extractStudentBulkRow = (row) => {
  const r = row || {};
  return {
    sno: pickFirst(r, ['sno', 'slno', 'serialno', 'serialnumber', 's.no', '#', 'no']),
    course: pickFirst(r, ['course']),
    program: pickFirst(r, ['program', 'branch']),
    year: pickFirst(r, ['year']),
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
    name: pickFirst(r, ['name', 'studentname', 'fullname', 'firstname']),
  };
};

const normKey = (s) => String(s || '').trim().toLowerCase();

const cohortRowMatchesTarget = (row, target) => {
  return (
    normKey(row.course) === normKey(target.course) &&
    normKey(row.program) === normKey(target.program) &&
    normKey(row.year) === normKey(target.year)
  );
};

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
  cohortRowMatchesTarget,
  displayNameFromEmail,
  defaultStudentPasswordFromRow,
};

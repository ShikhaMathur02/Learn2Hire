const CONTACT_PROFILE_KEYS = [
  'studentPhone',
  'fatherPhone',
  'motherPhone',
  'pincode',
  'dateOfBirth',
  'fatherName',
  'motherName',
];

const PHONE_MIN = 10;
const PHONE_MAX = 15;
const NAME_MAX = 100;

/** Letters / marks, spaces, period, apostrophe, hyphen — no digits. */
const PERSON_NAME_RE =
  /^[\p{L}\p{M}]+(?:[\p{L}\p{M}\s'.-]*[\p{L}\p{M}])?$/u;

function digitsOnly(raw) {
  return String(raw ?? '').replace(/\D/g, '');
}

function validateOptionalPhone(fieldLabel, raw) {
  const d = digitsOnly(raw);
  if (!d) return { ok: true, value: '' };
  if (d.length < PHONE_MIN || d.length > PHONE_MAX) {
    return {
      ok: false,
      error: `${fieldLabel} must be ${PHONE_MIN}–${PHONE_MAX} digits (numbers only).`,
    };
  }
  return { ok: true, value: d };
}

function validateOptionalPincode(raw) {
  const d = digitsOnly(raw);
  if (!d) return { ok: true, value: '' };
  if (d.length !== 6) {
    return { ok: false, error: 'PIN code must be exactly 6 digits.' };
  }
  return { ok: true, value: d };
}

function validateOptionalDob(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: '' };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { ok: false, error: 'Date of birth must be YYYY-MM-DD.' };
  }
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { ok: false, error: 'Date of birth is not a valid calendar date.' };
  }
  const today = new Date();
  const birth = new Date(y, m - 1, d);
  let age = today.getFullYear() - birth.getFullYear();
  const md = today.getMonth() - birth.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  if (age < 5 || age > 100) {
    return {
      ok: false,
      error: 'Date of birth must represent an age between 5 and 100 years.',
    };
  }
  return { ok: true, value: s };
}

function validateOptionalPersonName(fieldLabel, raw) {
  const s = String(raw ?? '').trim();
  if (!s) return { ok: true, value: '' };
  if (s.length > NAME_MAX) {
    return { ok: false, error: `${fieldLabel} must be at most ${NAME_MAX} characters.` };
  }
  if (!PERSON_NAME_RE.test(s)) {
    return {
      ok: false,
      error: `${fieldLabel} may only contain letters, spaces, period, hyphen, and apostrophe.`,
    };
  }
  return { ok: true, value: s };
}

/**
 * Validates optional student profile contact / identity fields.
 * Returns normalized strings for storage (phones as digits-only, etc.).
 * @param {Record<string, unknown>} fields — subset of StudentProfile string fields
 * @returns {{ ok: true, normalized: Record<string, string> } | { ok: false, errors: string[] }}
 */
/**
 * @param {Record<string, unknown>} fields — keys to validate (only own keys are checked)
 */
function validateStudentProfileContactFields(fields) {
  const errors = [];
  const normalized = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(fields, k);

  const runPhone = (key, label) => {
    if (!has(key)) return;
    const r = validateOptionalPhone(label, fields[key]);
    if (!r.ok) errors.push(r.error);
    else normalized[key] = r.value;
  };

  const runName = (key, label) => {
    if (!has(key)) return;
    const r = validateOptionalPersonName(label, fields[key]);
    if (!r.ok) errors.push(r.error);
    else normalized[key] = r.value;
  };

  runPhone('studentPhone', 'Your mobile');
  runPhone('fatherPhone', "Father's phone");
  runPhone('motherPhone', "Mother's phone");

  if (has('pincode')) {
    const r = validateOptionalPincode(fields.pincode);
    if (!r.ok) errors.push(r.error);
    else normalized.pincode = r.value;
  }
  if (has('dateOfBirth')) {
    const r = validateOptionalDob(fields.dateOfBirth);
    if (!r.ok) errors.push(r.error);
    else normalized.dateOfBirth = r.value;
  }

  runName('fatherName', "Father's name");
  runName('motherName', "Mother's name");

  if (errors.length) return { ok: false, errors };
  return { ok: true, normalized };
}

module.exports = {
  CONTACT_PROFILE_KEYS,
  validateStudentProfileContactFields,
  validateOptionalPhone,
  validateOptionalPincode,
  validateOptionalDob,
  validateOptionalPersonName,
  digitsOnly,
};

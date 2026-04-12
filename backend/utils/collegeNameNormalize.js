/**
 * Normalize institution names for duplicate checks (trim, collapse spaces, case-insensitive).
 */
function normalizeCollegeName(name) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * @param {import('mongoose').Model} User
 * @param {string} name
 * @returns {Promise<boolean>}
 */
async function isCollegeNameTaken(User, name) {
  const target = normalizeCollegeName(name);
  if (!target) return false;
  const docs = await User.find({ role: 'college' }).select('name').lean();
  return docs.some((d) => normalizeCollegeName(d.name) === target);
}

module.exports = { normalizeCollegeName, isCollegeNameTaken };

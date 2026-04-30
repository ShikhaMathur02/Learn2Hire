const fs = require('fs');
const path = require('path');

const RESUME_DIR = path.join(__dirname, '..', 'private', 'resumes');
const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function extFromMime(mimetype, originalName = '') {
  const lower = String(originalName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return '.pdf';
  if (lower.endsWith('.docx')) return '.docx';
  if (lower.endsWith('.doc')) return '.doc';
  if (mimetype === 'application/pdf') return '.pdf';
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return '.docx';
  }
  if (mimetype === 'application/msword') return '.doc';
  return '.pdf';
}

function isAllowedPrivateResumeRel(rel) {
  return typeof rel === 'string' && rel.startsWith('private/resumes/') && !rel.includes('..');
}

function removeResumeFile(relPath) {
  if (!isAllowedPrivateResumeRel(relPath)) return;
  const abs = path.join(__dirname, '..', relPath);
  try {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (_) {
    /* ignore */
  }
}

/**
 * Write an uploaded résumé (multer memory file) under private/resumes/.
 * @returns {{ resumeRelativePath: string, resumeOriginalName: string }}
 */
function persistResumeBufferForUser(userId, file) {
  if (!file?.buffer) {
    throw new Error('Missing résumé file.');
  }
  if (!ALLOWED_MIMES.has(file.mimetype)) {
    throw new Error('Only PDF (.pdf) or Word (.doc, .docx) files are allowed.');
  }
  fs.mkdirSync(RESUME_DIR, { recursive: true });
  const ext = extFromMime(file.mimetype, file.originalname);
  const filename = `${String(userId)}-${Date.now()}${ext}`;
  const resumeRelativePath = `private/resumes/${filename}`;
  const abs = path.join(__dirname, '..', resumeRelativePath);
  fs.writeFileSync(abs, file.buffer);
  const resumeOriginalName =
    String(file.originalname || `resume${ext}`).replace(/[/\\]/g, '').slice(0, 200) ||
    `resume${ext}`;
  return { resumeRelativePath, resumeOriginalName };
}

module.exports = {
  removeResumeFile,
  isAllowedPrivateResumeRel,
  MAX_BYTES,
  ALLOWED_MIMES,
  persistResumeBufferForUser,
};

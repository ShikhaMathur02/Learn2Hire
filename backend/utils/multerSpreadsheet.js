const path = require('path');
const multer = require('multer');

const SPREADSHEET_EXT = new Set(['.xlsx', '.xls', '.csv']);

function spreadsheetFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (SPREADSHEET_EXT.has(ext)) {
    cb(null, true);
    return;
  }
  cb(new Error('Only Excel (.xlsx, .xls) or CSV (.csv) files are allowed.'));
}

function spreadsheetMulterInstance() {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: spreadsheetFileFilter,
  });
}

/**
 * Multer single-file middleware for roster / materials spreadsheets.
 * Turns multer errors into 400 JSON so clients see a clear message.
 */
function singleSpreadsheet(fieldName) {
  const upload = spreadsheetMulterInstance();
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'Invalid file. Use Excel (.xlsx, .xls) or CSV.',
        });
      }
      next();
    });
  };
}

module.exports = {
  SPREADSHEET_EXT,
  spreadsheetFileFilter,
  singleSpreadsheet,
};

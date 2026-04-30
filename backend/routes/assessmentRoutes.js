const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  getAllAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');

const assessmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.mimetype);
    if (ok) return cb(null, true);
    cb(new Error('Only PDF or Word (.doc, .docx) files are allowed for question papers.'));
  },
});

router.use(protect);

router.get('/', getAllAssessments);
router.get('/:id', getAssessment);
router.post('/', (req, res, next) => {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('multipart/form-data')) {
    return assessmentUpload.single('questionPaper')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  }
  return next();
}, createAssessment);
router.put('/:id', (req, res, next) => {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('multipart/form-data')) {
    return assessmentUpload.single('questionPaper')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  }
  return next();
}, updateAssessment);
router.delete('/:id', deleteAssessment);

module.exports = router;

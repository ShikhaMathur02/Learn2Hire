const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const {
  applyToJob,
  createJob,
  deleteJob,
  downloadJobApplicantResume,
  downloadJobJD,
  expressCompanyInterest,
  expressStudentJobInterest,
  getApplicationsForJob,
  getCompanyDashboard,
  getCompanyStudentDetail,
  getInterestsForJob,
  getJobById,
  getJobs,
  getMyApplications,
  getSavedJobs,
  getSuggestedJobs,
  saveJob,
  searchCompanyTalent,
  unsaveJob,
  updateApplicationStatus,
  updateJob,
  uploadJobJD,
} = require('../controllers/jobController');
const { MAX_BYTES: APPLY_RESUME_MAX_BYTES } = require('../controllers/studentResumeController');
const { protect } = require('../middleware/authMiddleware');

const jdStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '..', 'uploads', 'jobs');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.pdf' ? ext : '.pdf';
    cb(null, `${req.params.id}-${Date.now()}${safeExt}`);
  },
});

const jdUpload = multer({
  storage: jdStorage,
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for job descriptions.'));
    }
  },
});

const applyResumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: APPLY_RESUME_MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const ok = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only PDF or Word documents are allowed for résumés.'));
  },
});

const router = express.Router();

router.use(protect);

router.get('/company/dashboard', getCompanyDashboard);
router.get('/company/talent', searchCompanyTalent);
router.get('/company/students/:userId', getCompanyStudentDetail);
router.post('/company/express-interest', expressCompanyInterest);

router.get('/applications/me', getMyApplications);
router.get('/saved/me', getSavedJobs);
router.get('/suggestions/me', getSuggestedJobs);
router.post('/student/express-interest', expressStudentJobInterest);
router.patch('/applications/:applicationId/status', updateApplicationStatus);
router.get('/:id/interests', getInterestsForJob);
router.get('/:id/applications', getApplicationsForJob);
router.get('/:id/students/:studentId/resume', downloadJobApplicantResume);
router.post('/:id/apply', (req, res, next) => {
  applyResumeUpload.single('resume')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'Résumé must be 5 MB or smaller.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid résumé upload.',
      });
    }
    next();
  });
}, applyToJob);
router.post('/:id/save', saveJob);
router.delete('/:id/save', unsaveJob);

router.post('/:id/jd', jdUpload.single('jd'), uploadJobJD);
router.get('/:id/jd', downloadJobJD);

router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

module.exports = router;

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const {
  applyToJob,
  createJob,
  deleteJob,
  downloadJobJD,
  expressCompanyInterest,
  expressStudentJobInterest,
  getApplicationsForJob,
  getCompanyDashboard,
  getCompanyStudentDetail,
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
router.get('/:id/applications', getApplicationsForJob);
router.post('/:id/apply', applyToJob);
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

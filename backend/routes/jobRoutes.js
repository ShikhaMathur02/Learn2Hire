const express = require('express');

const {
  applyToJob,
  createJob,
  deleteJob,
  getApplicationsForJob,
  getCompanyDashboard,
  getJobById,
  getJobs,
  getMyApplications,
  getSavedJobs,
  saveJob,
  unsaveJob,
  updateApplicationStatus,
  updateJob,
} = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/company/dashboard', getCompanyDashboard);
router.get('/applications/me', getMyApplications);
router.get('/saved/me', getSavedJobs);
router.patch('/applications/:applicationId/status', updateApplicationStatus);
router.get('/:id/applications', getApplicationsForJob);
router.post('/:id/apply', applyToJob);
router.post('/:id/save', saveJob);
router.delete('/:id/save', unsaveJob);
router.get('/', getJobs);
router.get('/:id', getJobById);
router.post('/', createJob);
router.put('/:id', updateJob);
router.delete('/:id', deleteJob);

module.exports = router;

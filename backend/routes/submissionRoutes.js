const express = require('express');
const router = express.Router();
const {
  submitAssessment,
  getMySubmissions,
  getSubmissionById,
  getSubmissionsByAssessment,
} = require('../controllers/submissionController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMySubmissions);
router.get('/assessment/:assessmentId', getSubmissionsByAssessment);
router.get('/:id', getSubmissionById);
router.post('/', submitAssessment);

module.exports = router;

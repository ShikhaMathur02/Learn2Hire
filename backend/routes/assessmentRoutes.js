const express = require('express');
const router = express.Router();
const {
  getAllAssessments,
  getAssessment,
  createAssessment,
  updateAssessment,
  deleteAssessment,
} = require('../controllers/assessmentController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getAllAssessments);
router.get('/:id', getAssessment);
router.post('/', createAssessment);
router.put('/:id', updateAssessment);
router.delete('/:id', deleteAssessment);

module.exports = router;

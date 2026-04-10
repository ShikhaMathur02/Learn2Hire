const express = require('express');
const multer = require('multer');
const {
  createRosterUser,
  getCollegeInsights,
  getPendingFaculty,
  getRoster,
  importStudentsFromSheet,
  setFacultyApproval,
} = require('../controllers/collegeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/insights', getCollegeInsights);
router.get('/roster', getRoster);
router.post('/roster', createRosterUser);
router.post('/roster/import/students', upload.single('file'), importStudentsFromSheet);
router.get('/faculty/pending', getPendingFaculty);
router.patch('/faculty/:id/approval', setFacultyApproval);

module.exports = router;

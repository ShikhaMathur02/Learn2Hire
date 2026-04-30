const express = require('express');
const {
  createRosterUser,
  getCollegeInsights,
  getPendingFaculty,
  getPendingStudents,
  getRoster,
  importStudentsFromSheet,
  setFacultyApproval,
  setStudentCampusApproval,
  setCompanyPartnerApproval,
} = require('../controllers/collegeController');
const { protect } = require('../middleware/authMiddleware');
const { singleSpreadsheet } = require('../utils/multerSpreadsheet');

const router = express.Router();

router.use(protect);

router.get('/insights', getCollegeInsights);
router.get('/roster', getRoster);
router.post('/roster', createRosterUser);
router.post('/roster/import/students', singleSpreadsheet('file'), importStudentsFromSheet);
router.get('/faculty/pending', getPendingFaculty);
router.patch('/faculty/:id/approval', setFacultyApproval);
router.get('/students/pending', getPendingStudents);
router.patch('/students/:id/campus-approval', setStudentCampusApproval);
router.patch('/companies/:id/partner-approval', setCompanyPartnerApproval);

module.exports = router;

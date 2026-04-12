const express = require('express');
const multer = require('multer');

const {
  getAnalytics,
  importStudentsFromSheet,
  getPlatformInsights,
  getUsers,
  getAdminUserDetail,
  patchFacultyProfile,
  updateUserRole,
  patchStudentCohort,
  deleteUser,
  createCollegeAccount,
  setCollegeApproval,
  getCollegeDetail,
  deleteCollege,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect);

router.get('/analytics', getAnalytics);
router.get('/insights', getPlatformInsights);
router.post('/students/import', upload.single('file'), importStudentsFromSheet);
router.get('/users', getUsers);
router.get('/users/:id', getAdminUserDetail);
router.patch('/users/:id/faculty-profile', patchFacultyProfile);
router.post('/colleges', createCollegeAccount);
router.patch('/colleges/:id/approval', setCollegeApproval);
router.get('/colleges/:id', getCollegeDetail);
router.delete('/colleges/:id', deleteCollege);
router.patch('/users/:id/student-profile', patchStudentCohort);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);

module.exports = router;

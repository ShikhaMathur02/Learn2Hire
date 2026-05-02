const express = require('express');

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
  setPlatformUserApproval,
  getCollegeDetail,
  deleteCollege,
} = require('../controllers/adminController');
const {
  listAdminTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} = require('../controllers/landingTestimonialController');
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/requireAdmin');
const { singleSpreadsheet } = require('../utils/multerSpreadsheet');

const router = express.Router();

router.use(protect);
router.use(requireAdmin);

router.get('/analytics', getAnalytics);
router.get('/insights', getPlatformInsights);
router.post('/students/import', singleSpreadsheet('file'), importStudentsFromSheet);
router.get('/users', getUsers);
router.get('/users/:id', getAdminUserDetail);
router.patch('/users/:id/faculty-profile', patchFacultyProfile);
router.post('/colleges', createCollegeAccount);
router.patch('/colleges/:id/approval', setCollegeApproval);
router.patch('/users/:id/platform-approval', setPlatformUserApproval);
router.get('/colleges/:id', getCollegeDetail);
router.delete('/colleges/:id', deleteCollege);
router.patch('/users/:id/student-profile', patchStudentCohort);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/role', updateUserRole);

router.get('/testimonials', listAdminTestimonials);
router.post('/testimonials', createTestimonial);
router.patch('/testimonials/:id', updateTestimonial);
router.delete('/testimonials/:id', deleteTestimonial);

module.exports = router;

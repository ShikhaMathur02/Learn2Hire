const express = require('express');
const multer = require('multer');

const {
  createCategory,
  createMaterialFromImageUpload,
  createMaterial,
  deleteCategory,
  deleteMaterial,
  getMaterialProgressBySlug,
  getManageCategories,
  getManageMaterials,
  getMyLearningProgress,
  getPublicCategories,
  getPublicMaterialBySlug,
  getPublicMaterials,
  getPublicSubjects,
  getRecommendedMaterials,
  importMaterialsFromSheet,
  saveMaterialProgressBySlug,
  updateMaterial,
} = require('../controllers/learningController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

const { singleSpreadsheet } = require('../utils/multerSpreadsheet');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/categories', getPublicCategories);
router.get('/subjects', optionalProtect, getPublicSubjects);
router.get('/materials/recommended/me', protect, getRecommendedMaterials);
router.get('/materials', optionalProtect, getPublicMaterials);
router.get('/materials/:slug', optionalProtect, getPublicMaterialBySlug);
router.get('/progress/me', protect, getMyLearningProgress);
router.get('/progress/material/:slug', protect, getMaterialProgressBySlug);
router.put('/progress/material/:slug', protect, saveMaterialProgressBySlug);

router.use('/manage', protect);

router.get('/manage/categories', getManageCategories);
router.post('/manage/categories', createCategory);
router.delete('/manage/categories/:id', deleteCategory);
router.get('/manage/materials', getManageMaterials);
router.post('/manage/materials', createMaterial);
router.post('/manage/materials/from-image', upload.single('image'), createMaterialFromImageUpload);
router.post('/manage/materials/import', singleSpreadsheet('file'), importMaterialsFromSheet);
router.put('/manage/materials/:id', updateMaterial);
router.delete('/manage/materials/:id', deleteMaterial);

module.exports = router;

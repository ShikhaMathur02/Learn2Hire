const express = require('express');

const {
  createCategory,
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
  saveMaterialProgressBySlug,
  updateMaterial,
} = require('../controllers/learningController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/categories', getPublicCategories);
router.get('/subjects', getPublicSubjects);
router.get('/materials', getPublicMaterials);
router.get('/materials/recommended/me', protect, getRecommendedMaterials);
router.get('/materials/:slug', getPublicMaterialBySlug);
router.get('/progress/me', protect, getMyLearningProgress);
router.get('/progress/material/:slug', protect, getMaterialProgressBySlug);
router.put('/progress/material/:slug', protect, saveMaterialProgressBySlug);

router.use('/manage', protect);

router.get('/manage/categories', getManageCategories);
router.post('/manage/categories', createCategory);
router.delete('/manage/categories/:id', deleteCategory);
router.get('/manage/materials', getManageMaterials);
router.post('/manage/materials', createMaterial);
router.put('/manage/materials/:id', updateMaterial);
router.delete('/manage/materials/:id', deleteMaterial);

module.exports = router;

const mongoose = require('mongoose');

const LearningCategory = require('../models/LearningCategory');
const LearningProgress = require('../models/LearningProgress');
const StudentProfile = require('../models/StudentProfile');
const StudyMaterial = require('../models/StudyMaterial');
const { getLearnerInsights } = require('../utils/learnerInsights');

const editorRoles = ['faculty', 'admin', 'college'];
const learnerRoles = ['student'];

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];

  return tags
    .map((tag) => String(tag || '').trim().toLowerCase())
    .filter(Boolean);
};

const ensureEditor = (req, res) => {
  if (!editorRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: 'Only faculty, college, or admin users can manage learning materials.',
    });
    return false;
  }

  return true;
};

const ensureLearner = (req, res) => {
  if (!learnerRoles.includes(req.user.role)) {
    res.status(403).json({
      success: false,
      message: 'Only student users can save learning progress.',
    });
    return false;
  }

  return true;
};

const normalizeForMatch = (value) => String(value || '').trim().toLowerCase();

const getSkillLevelFromProgress = (progress) => {
  if (progress >= 85) return 'expert';
  if (progress >= 65) return 'advanced';
  if (progress >= 40) return 'intermediate';
  return 'beginner';
};

const computeOverallScore = (skills) => {
  if (!Array.isArray(skills) || skills.length === 0) return null;

  const total = skills.reduce((sum, skill) => sum + Number(skill.progress || 0), 0);
  return Math.round((total / skills.length) * 100) / 100;
};

const syncStudentProfileFromLearning = async (userId, category) => {
  if (!category?._id || !category?.name) return;

  const categoryMaterials = await StudyMaterial.find({ category: category._id })
    .select('_id')
    .lean();
  const categoryMaterialIds = categoryMaterials.map((item) => item._id);

  const [categoryProgress, allLearningProgress, existingProfile] = await Promise.all([
    categoryMaterialIds.length
      ? LearningProgress.find({
          user: userId,
          material: { $in: categoryMaterialIds },
        })
          .select('progressPercent')
          .lean()
      : [],
    LearningProgress.find({ user: userId }).select('completed').lean(),
    StudentProfile.findOne({ user: userId }),
  ]);

  const categoryAverageProgress = categoryProgress.length
    ? Math.round(
        categoryProgress.reduce((sum, item) => sum + Number(item.progressPercent || 0), 0) /
          categoryProgress.length
      )
    : 0;

  const updatedSkill = {
    name: category.name,
    level: getSkillLevelFromProgress(categoryAverageProgress),
    progress: categoryAverageProgress,
  };

  let profile = existingProfile;

  if (!profile) {
    profile = new StudentProfile({
      user: userId,
      bio: '',
      skills: [updatedSkill],
      stats: {
        coursesEnrolled: allLearningProgress.length,
        coursesCompleted: allLearningProgress.filter((item) => item.completed).length,
        assessmentsTaken: 0,
      },
    });
  } else {
    const skillIndex = profile.skills.findIndex(
      (skill) => normalizeForMatch(skill.name) === normalizeForMatch(category.name)
    );

    if (skillIndex >= 0) {
      profile.skills[skillIndex] = updatedSkill;
    } else {
      profile.skills.push(updatedSkill);
    }

    profile.stats = {
      ...(profile.stats || {}),
      coursesEnrolled: allLearningProgress.length,
      coursesCompleted: allLearningProgress.filter((item) => item.completed).length,
      assessmentsTaken: profile.stats?.assessmentsTaken || 0,
    };
  }

  const nextOverallScore = computeOverallScore(profile.skills);
  if (nextOverallScore !== null) {
    if (profile.overallScore !== nextOverallScore) {
      profile.scoreHistory.push({
        score: nextOverallScore,
        date: new Date(),
      });
    }
    profile.overallScore = nextOverallScore;
  }

  await profile.save();
};

// @desc    Get public learning categories
// @route   GET /api/learning/categories
// @access  Public
exports.getPublicCategories = async (req, res) => {
  try {
    const categories = await LearningCategory.find({ isPublished: true }).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get public learning subjects with counts
// @route   GET /api/learning/subjects
// @access  Public
exports.getPublicSubjects = async (req, res) => {
  try {
    const categories = await LearningCategory.find({ isPublished: true })
      .sort({ name: 1 })
      .lean();

    const categoryIds = categories.map((category) => category._id);
    const counts = await StudyMaterial.aggregate([
      {
        $match: {
          isPublished: true,
          category: { $in: categoryIds },
        },
      },
      {
        $group: {
          _id: '$category',
          materialCount: { $sum: 1 },
        },
      },
    ]);

    const countMap = Object.fromEntries(
      counts.map((item) => [item._id.toString(), item.materialCount])
    );

    const subjects = categories.map((category) => ({
      ...category,
      materialCount: countMap[category._id.toString()] || 0,
    }));

    res.status(200).json({
      success: true,
      count: subjects.length,
      data: { subjects },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get all categories for management
// @route   GET /api/learning/manage/categories
// @access  Private
exports.getManageCategories = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const categories = await LearningCategory.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: categories.length,
      data: { categories },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Create category
// @route   POST /api/learning/manage/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const { name, description, icon, isPublished } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a category name',
      });
    }

    const slug = slugify(name);

    const category = await LearningCategory.create({
      name,
      slug,
      description: description || '',
      icon: icon || '',
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    });

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists.',
      });
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({
        success: false,
        message: messages.join(' '),
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/learning/manage/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      });
    }

    const materialCount = await StudyMaterial.countDocuments({ category: id });
    if (materialCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Delete materials in this category first.',
      });
    }

    const deleted = await LearningCategory.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get public study materials
// @route   GET /api/learning/materials
// @access  Public
exports.getPublicMaterials = async (req, res) => {
  try {
    const { search, category, materialType, level, tag } = req.query;

    let categoryIds = null;
    if (category) {
      const matchingCategories = await LearningCategory.find({
        slug: category,
        isPublished: true,
      }).select('_id');
      categoryIds = matchingCategories.map((item) => item._id);
    } else {
      const publishedCategories = await LearningCategory.find({ isPublished: true }).select('_id');
      categoryIds = publishedCategories.map((item) => item._id);
    }

    const query = { isPublished: true };

    if (categoryIds) {
      query.category = { $in: categoryIds };
    }

    if (materialType) {
      query.materialType = materialType;
    }

    if (level) {
      query.level = level;
    }

    if (tag) {
      query.tags = { $in: [String(tag).trim().toLowerCase()] };
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const materials = await StudyMaterial.find(query)
      .populate('category', 'name slug')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: { materials },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get public material by slug
// @route   GET /api/learning/materials/:slug
// @access  Public
exports.getPublicMaterialBySlug = async (req, res) => {
  try {
    const material = await StudyMaterial.findOne({
      slug: req.params.slug,
      isPublished: true,
    })
      .populate('category', 'name slug description')
      .populate('createdBy', 'name role');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { material },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get recommended study materials
// @route   GET /api/learning/materials/recommended/me
// @access  Private
exports.getRecommendedMaterials = async (req, res) => {
  try {
    if (!ensureLearner(req, res)) return;

    const [profile, progressList, materials] = await Promise.all([
      StudentProfile.findOne({ user: req.user._id }).select('skills').lean(),
      LearningProgress.find({ user: req.user._id }).select('material progressPercent completed').lean(),
      StudyMaterial.find({ isPublished: true })
        .populate('category', 'name slug')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 }),
    ]);

    const insights = profile ? null : await getLearnerInsights(req.user._id);

    const learnerSkills = ((profile?.skills || insights?.skills || []))
      .map((skill) => normalizeForMatch(skill.name))
      .filter(Boolean);

    const progressMap = new Map(
      progressList.map((item) => [item.material?.toString(), item])
    );

    const recommended = materials
      .map((material) => {
        const materialText = [
          material.title,
          material.summary,
          material.category?.name,
          ...(material.tags || []),
        ]
          .join(' ')
          .toLowerCase();

        const matchedSkills = learnerSkills.filter((skill) => materialText.includes(skill));
        const progress = progressMap.get(material._id.toString()) || null;
        const score =
          matchedSkills.length * 10 +
          (progress ? (progress.completed ? 1 : 6) : 2) +
          (material.level === 'beginner' ? 1 : 0);

        return {
          ...material.toObject(),
          matchedSkills,
          progress,
          recommendationScore: score,
          recommendationReason: matchedSkills.length
            ? `Recommended because it matches your skills: ${matchedSkills.join(', ')}`
            : progress && !progress.completed
              ? 'Continue where you left off.'
              : 'Fresh study material from the latest published content.',
        };
      })
      .sort((a, b) => {
        const aIncomplete = a.progress?.completed ? 1 : 0;
        const bIncomplete = b.progress?.completed ? 1 : 0;

        return (
          aIncomplete - bIncomplete ||
          b.recommendationScore - a.recommendationScore ||
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      })
      .slice(0, 8);

    res.status(200).json({
      success: true,
      count: recommended.length,
      data: {
        materials: recommended,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get learner progress summary
// @route   GET /api/learning/progress/me
// @access  Private
exports.getMyLearningProgress = async (req, res) => {
  try {
    if (!ensureLearner(req, res)) return;

    const progress = await LearningProgress.find({ user: req.user._id })
      .populate({
        path: 'material',
        populate: {
          path: 'category',
          select: 'name slug',
        },
      })
      .sort({ lastViewedAt: -1 });

    const validProgress = progress.filter((item) => item.material);
    const totalStarted = validProgress.length;
    const totalCompleted = validProgress.filter((item) => item.completed).length;
    const inProgressCount = validProgress.filter(
      (item) => !item.completed && item.progressPercent > 0
    ).length;
    const totalTimeSpentMinutes = validProgress.reduce(
      (sum, item) => sum + (item.timeSpentMinutes || 0),
      0
    );
    const averageProgress = totalStarted
      ? Math.round(
          validProgress.reduce((sum, item) => sum + (item.progressPercent || 0), 0) / totalStarted
        )
      : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalStarted,
          totalCompleted,
          inProgressCount,
          totalTimeSpentMinutes,
          averageProgress,
        },
        progress: validProgress,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get learner progress for one material
// @route   GET /api/learning/progress/material/:slug
// @access  Private
exports.getMaterialProgressBySlug = async (req, res) => {
  try {
    if (!ensureLearner(req, res)) return;

    const material = await StudyMaterial.findOne({
      slug: req.params.slug,
      isPublished: true,
    }).select('_id');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    const progress = await LearningProgress.findOne({
      user: req.user._id,
      material: material._id,
    });

    res.status(200).json({
      success: true,
      data: {
        progress,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Save learner progress for one material
// @route   PUT /api/learning/progress/material/:slug
// @access  Private
exports.saveMaterialProgressBySlug = async (req, res) => {
  try {
    if (!ensureLearner(req, res)) return;

    const material = await StudyMaterial.findOne({
      slug: req.params.slug,
      isPublished: true,
    })
      .select('_id estimatedReadMinutes category')
      .populate('category', 'name');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    const inputProgress = Number(req.body.progressPercent);
    const normalizedProgress = Number.isNaN(inputProgress)
      ? 0
      : Math.max(0, Math.min(100, Math.round(inputProgress)));

    const inputTime = Number(req.body.timeSpentMinutes);
    const normalizedTime = Number.isNaN(inputTime) ? 0 : Math.max(0, Math.round(inputTime));

    const completed = Boolean(req.body.completed || normalizedProgress >= 100);

    let progress = await LearningProgress.findOne({
      user: req.user._id,
      material: material._id,
    });

    if (!progress) {
      progress = await LearningProgress.create({
        user: req.user._id,
        material: material._id,
        progressPercent: normalizedProgress,
        completed,
        timeSpentMinutes: normalizedTime,
        startedAt: new Date(),
        lastViewedAt: new Date(),
        completedAt: completed ? new Date() : null,
      });
    } else {
      progress.progressPercent = Math.max(progress.progressPercent || 0, normalizedProgress);
      progress.timeSpentMinutes = Math.max(progress.timeSpentMinutes || 0, normalizedTime);
      progress.completed = completed || progress.completed;
      progress.lastViewedAt = new Date();

      if (progress.completed && !progress.completedAt) {
        progress.completedAt = new Date();
      }

      await progress.save();
    }

    const populatedProgress = await LearningProgress.findById(progress._id).populate({
      path: 'material',
      populate: {
        path: 'category',
        select: 'name slug',
      },
    });

    await syncStudentProfileFromLearning(req.user._id, material.category);

    res.status(200).json({
      success: true,
      message: 'Learning progress saved successfully',
      data: { progress: populatedProgress },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Get all materials for management
// @route   GET /api/learning/manage/materials
// @access  Private
exports.getManageMaterials = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const materials = await StudyMaterial.find()
      .populate('category', 'name slug')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: materials.length,
      data: { materials },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Create study material
// @route   POST /api/learning/manage/materials
// @access  Private
exports.createMaterial = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const {
      title,
      summary,
      content,
      materialType,
      resourceUrl,
      level,
      tags,
      estimatedReadMinutes,
      categoryId,
      isPublished,
    } = req.body;

    if (!title || !categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and category',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID',
      });
    }

    const category = await LearningCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }

    const material = await StudyMaterial.create({
      title,
      slug: slugify(title),
      summary: summary || '',
      content: content || '',
      materialType: materialType || 'article',
      resourceUrl: resourceUrl || '',
      level: level || 'beginner',
      tags: normalizeTags(tags),
      estimatedReadMinutes: estimatedReadMinutes || 5,
      category: categoryId,
      createdBy: req.user._id,
      isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    });

    const populated = await StudyMaterial.findById(material._id)
      .populate('category', 'name slug')
      .populate('createdBy', 'name role');

    res.status(201).json({
      success: true,
      message: 'Study material created successfully',
      data: { material: populated },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A study material with this title already exists.',
      });
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({
        success: false,
        message: messages.join(' '),
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update study material
// @route   PUT /api/learning/manage/materials/:id
// @access  Private
exports.updateMaterial = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid material ID',
      });
    }

    const material = await StudyMaterial.findById(id);
    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    const {
      title,
      summary,
      content,
      materialType,
      resourceUrl,
      level,
      tags,
      estimatedReadMinutes,
      categoryId,
      isPublished,
    } = req.body;

    if (title !== undefined) {
      material.title = title;
      material.slug = slugify(title);
    }
    if (summary !== undefined) material.summary = summary;
    if (content !== undefined) material.content = content;
    if (materialType !== undefined) material.materialType = materialType;
    if (resourceUrl !== undefined) material.resourceUrl = resourceUrl;
    if (level !== undefined) material.level = level;
    if (tags !== undefined) material.tags = normalizeTags(tags);
    if (estimatedReadMinutes !== undefined) {
      material.estimatedReadMinutes = estimatedReadMinutes;
    }
    if (isPublished !== undefined) material.isPublished = Boolean(isPublished);
    if (categoryId !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category ID',
        });
      }

      const category = await LearningCategory.findById(categoryId);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: 'Category not found',
        });
      }

      material.category = categoryId;
    }

    await material.save();

    const populated = await StudyMaterial.findById(material._id)
      .populate('category', 'name slug')
      .populate('createdBy', 'name role');

    res.status(200).json({
      success: true,
      message: 'Study material updated successfully',
      data: { material: populated },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A study material with this title already exists.',
      });
    }

    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((error) => error.message);
      return res.status(400).json({
        success: false,
        message: messages.join(' '),
      });
    }

    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Delete study material
// @route   DELETE /api/learning/manage/materials/:id
// @access  Private
exports.deleteMaterial = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid material ID',
      });
    }

    const deleted = await StudyMaterial.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    await LearningProgress.deleteMany({ material: id });

    res.status(200).json({
      success: true,
      message: 'Study material deleted successfully',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

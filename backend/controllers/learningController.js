const mongoose = require('mongoose');

const User = require('../models/User');
const LearningCategory = require('../models/LearningCategory');
const LearningProgress = require('../models/LearningProgress');
const StudentProfile = require('../models/StudentProfile');
const StudyMaterial = require('../models/StudyMaterial');
const { getLearnerInsights } = require('../utils/learnerInsights');
const { asString, parseTabularFileRows } = require('../utils/uploadParsers');
const { createBulkNotifications, notifyPlatformAdmins } = require('../utils/notificationService');
const { getStudentRecipientIdsForEditor } = require('../utils/campusNotificationRecipients');

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

function editorLabel(u) {
  if (!u) return 'Someone';
  const role = u.role ? ` (${u.role})` : '';
  return `${u.name || 'User'}${role}`;
}

async function notifyAdminsLearningChange({ title, message, type, metadata }) {
  try {
    await notifyPlatformAdmins({
      title,
      message,
      category: 'learning',
      type,
      actionUrl: '/dashboard',
      metadata: metadata || {},
    });
  } catch (e) {
    console.error('[Learn2Hire] admin learning notify:', e.message || e);
  }
}

const ensureEditor = (req, res) => {
  const role = String(req.user?.role || '')
    .trim()
    .toLowerCase();
  if (!editorRoles.includes(role)) {
    res.status(403).json({
      success: false,
      message: 'Only faculty, college, or admin users can manage learning materials.',
    });
    return false;
  }

  return true;
};

const ensureLearner = (req, res) => {
  const role = String(req.user?.role || '')
    .trim()
    .toLowerCase();
  if (!learnerRoles.includes(role)) {
    res.status(403).json({
      success: false,
      message: 'Only student users can save learning progress.',
    });
    return false;
  }

  return true;
};

const normalizeForMatch = (value) => String(value || '').trim().toLowerCase();

const normalizeCohortValue = (value) => String(value || '').trim().toLowerCase();

/** Must match frontend `cohortDegreeRequiresBranch` — engineering-style degrees need a branch. */
const cohortRequiresBranch = (courseNorm) =>
  courseNorm === 'b.tech' || courseNorm === 'diploma';

const resolveAudienceContext = async (req) => {
  if (!req.user) {
    return { kind: 'guest', cohort: null };
  }
  const userRole = String(req.user.role || '')
    .trim()
    .toLowerCase();
  if (editorRoles.includes(userRole)) {
    return { kind: 'editor', cohort: null };
  }
  if (userRole === 'student') {
    const profile = await StudentProfile.findOne({ user: req.user._id })
      .select('course branch year semester')
      .lean();
    const course = normalizeCohortValue(profile?.course);
    const branch = normalizeCohortValue(profile?.branch);
    const year = normalizeCohortValue(profile?.year);
    const semester = normalizeCohortValue(profile?.semester);
    const cohort = course && year ? { course, branch, year, semester } : null;
    return { kind: 'student', cohort };
  }
  return { kind: 'guest', cohort: null };
};

const materialVisibleToContext = (material, ctx) => {
  const audience = material.audience || 'global';
  if (audience !== 'cohort') {
    return true;
  }
  if (ctx.kind === 'editor') {
    return true;
  }
  if (!ctx.cohort) {
    return false;
  }
  if (
    normalizeCohortValue(material.targetCourse) !== ctx.cohort.course ||
    normalizeCohortValue(material.targetYear) !== ctx.cohort.year
  ) {
    return false;
  }
  const matBr = normalizeCohortValue(material.targetBranch);
  if (matBr && matBr !== normalizeCohortValue(ctx.cohort.branch)) {
    return false;
  }
  const targetSem = normalizeCohortValue(material.targetSemester);
  if (!targetSem) {
    return true;
  }
  return normalizeCohortValue(ctx.cohort.semester) === targetSem;
};

async function notifyStudentsLearningMaterialPublished(editorUser, materialDoc) {
  if (!materialDoc?.isPublished) return;
  const recipientIds = await getStudentRecipientIdsForEditor(editorUser);
  if (!recipientIds.length) return;
  const slug = materialDoc.slug || '';
  await createBulkNotifications({
    recipientIds,
    title: 'New study material',
    message: `${materialDoc.title} is available in the learning hub.`,
    category: 'learning',
    type: 'material_published',
    actionUrl: slug ? `/learning/topic/${slug}` : '/dashboard/learning',
    metadata: { materialId: materialDoc._id },
  });
}

const ensureUniqueMaterialSlug = async (baseSlug, excludeId = null) => {
  let slug = baseSlug;
  let n = 0;
  const existsOther = async (s) => {
    const q = { slug: s };
    if (excludeId) {
      q._id = { $ne: excludeId };
    }
    return StudyMaterial.exists(q);
  };
  while (await existsOther(slug)) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }
  return slug;
};

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
    const categoryIdsWithPublishedMaterials = await StudyMaterial.distinct('category', {
      isPublished: true,
    });

    const categories = await LearningCategory.find({
      $or: [
        { isPublished: true },
        { _id: { $in: categoryIdsWithPublishedMaterials } },
      ],
    })
      .sort({ name: 1 })
      .lean();

    const categoryIds = categories.map((category) => category._id);
    const ctx = await resolveAudienceContext(req);

    const materials = await StudyMaterial.find({
      isPublished: true,
      category: { $in: categoryIds },
    })
      .select('category audience targetCourse targetBranch targetYear targetSemester')
      .lean();

    const visible = materials.filter((m) => materialVisibleToContext(m, ctx));
    const countMap = {};
    for (const m of visible) {
      const key = m.category?.toString();
      if (!key) continue;
      countMap[key] = (countMap[key] || 0) + 1;
    }

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

    if (category.isPublished) {
      const recipientIds = await getStudentRecipientIdsForEditor(req.user);
      if (recipientIds.length) {
        await createBulkNotifications({
          recipientIds,
          title: 'New learning subject',
          message: `A new subject was added: ${category.name}. Explore it in the learning hub.`,
          category: 'learning',
          type: 'subject_added',
          actionUrl: '/dashboard/learning#learning-explore-catalog',
          metadata: { categoryId: category._id },
        });
      }
    }

    await notifyAdminsLearningChange({
      title: 'Learning subject created',
      message: `${editorLabel(req.user)} created subject “${category.name}”.`,
      type: 'learning_category_created',
      metadata: { categoryId: category._id },
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

    await notifyAdminsLearningChange({
      title: 'Learning subject deleted',
      message: `${editorLabel(req.user)} deleted subject “${deleted.name}”.`,
      type: 'learning_category_deleted',
      metadata: { categoryId: id },
    });

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
      }).select('_id');
      categoryIds = matchingCategories.map((item) => item._id);
      if (!categoryIds.length) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: { materials: [] },
        });
      }
    } else {
      const categoryIdsWithPublishedMaterials = await StudyMaterial.distinct('category', {
        isPublished: true,
      });
      const listedCategories = await LearningCategory.find({
        $or: [
          { isPublished: true },
          { _id: { $in: categoryIdsWithPublishedMaterials } },
        ],
      }).select('_id');
      categoryIds = listedCategories.map((item) => item._id);
    }

    const query = { isPublished: true };

    if (categoryIds && categoryIds.length) {
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

    const rawMaterials = await StudyMaterial.find(query)
      .populate('category', 'name slug description icon')
      .populate('createdBy', 'name role')
      .sort({ createdAt: -1 });

    const ctx = await resolveAudienceContext(req);
    const materials = rawMaterials.filter((m) => materialVisibleToContext(m, ctx));

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

    const ctx = await resolveAudienceContext(req);
    if (!materialVisibleToContext(material, ctx)) {
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

    const [profile, progressList, rawMaterials] = await Promise.all([
      StudentProfile.findOne({ user: req.user._id }).select('skills').lean(),
      LearningProgress.find({ user: req.user._id }).select('material progressPercent completed').lean(),
      StudyMaterial.find({ isPublished: true })
        .populate('category', 'name slug')
        .populate('createdBy', 'name role')
        .sort({ createdAt: -1 }),
    ]);

    const audienceCtx = await resolveAudienceContext(req);
    const materials = rawMaterials.filter((m) => materialVisibleToContext(m, audienceCtx));

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

    const audienceCtx = await resolveAudienceContext(req);

    const progress = await LearningProgress.find({ user: req.user._id })
      .populate({
        path: 'material',
        populate: {
          path: 'category',
          select: 'name slug',
        },
      })
      .sort({ lastViewedAt: -1 });

    const validProgress = progress.filter(
      (item) => item.material && materialVisibleToContext(item.material, audienceCtx)
    );
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
    }).select('_id audience targetCourse targetBranch targetYear targetSemester');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    const audienceCtx = await resolveAudienceContext(req);
    if (!materialVisibleToContext(material, audienceCtx)) {
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
      .select('_id estimatedReadMinutes category audience targetCourse targetBranch targetYear targetSemester')
      .populate('category', 'name');

    if (!material) {
      return res.status(404).json({
        success: false,
        message: 'Study material not found',
      });
    }

    const audienceCtx = await resolveAudienceContext(req);
    if (!materialVisibleToContext(material, audienceCtx)) {
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
      audience,
      targetCourse,
      targetBranch,
      targetYear,
      targetSemester,
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

    const audienceMode = audience === 'cohort' ? 'cohort' : 'global';
    let tc = '';
    let tb = '';
    let ty = '';
    let ts = '';
    if (audienceMode === 'cohort') {
      tc = normalizeCohortValue(targetCourse);
      tb = normalizeCohortValue(targetBranch);
      ty = normalizeCohortValue(targetYear);
      ts = normalizeCohortValue(targetSemester);
      if (!tc || !ty) {
        return res.status(400).json({
          success: false,
          message: 'Course-targeted materials require course and year.',
        });
      }
      if (cohortRequiresBranch(tc) && !tb) {
        return res.status(400).json({
          success: false,
          message: 'Engineering courses (B.Tech / Diploma) require a branch such as CSE or EE.',
        });
      }
    }

    const slugBase =
      audienceMode === 'cohort'
        ? slugify(`${title}-${tc}${tb ? `-${tb}` : ''}-${ty}${ts ? `-${ts}` : ''}`)
        : slugify(title);
    const slug = await ensureUniqueMaterialSlug(slugBase);

    const material = await StudyMaterial.create({
      title,
      slug,
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
      audience: audienceMode,
      targetCourse: audienceMode === 'cohort' ? tc : '',
      targetBranch: audienceMode === 'cohort' ? tb : '',
      targetYear: audienceMode === 'cohort' ? ty : '',
      targetSemester: audienceMode === 'cohort' ? ts : '',
    });

    const populated = await StudyMaterial.findById(material._id)
      .populate('category', 'name slug')
      .populate('createdBy', 'name role');

    await notifyStudentsLearningMaterialPublished(req.user, material);

    await notifyAdminsLearningChange({
      title: 'Learning material created',
      message: `${editorLabel(req.user)} created “${material.title}” in ${category.name}.`,
      type: 'learning_material_created',
      metadata: { materialId: material._id, categoryId: categoryId },
    });

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

    const wasPublished = material.isPublished;

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
      audience,
      targetCourse,
      targetBranch,
      targetYear,
      targetSemester,
    } = req.body;

    if (audience !== undefined) {
      material.audience = audience === 'cohort' ? 'cohort' : 'global';
    }
    if (targetCourse !== undefined) {
      material.targetCourse = normalizeCohortValue(targetCourse);
    }
    if (targetBranch !== undefined) {
      material.targetBranch = normalizeCohortValue(targetBranch);
    }
    if (targetYear !== undefined) {
      material.targetYear = normalizeCohortValue(targetYear);
    }
    if (targetSemester !== undefined) {
      material.targetSemester = normalizeCohortValue(targetSemester);
    }

    if (material.audience === 'cohort') {
      const tc = normalizeCohortValue(material.targetCourse);
      const tb = normalizeCohortValue(material.targetBranch);
      const ty = normalizeCohortValue(material.targetYear);
      const ts = normalizeCohortValue(material.targetSemester);
      if (!tc || !ty) {
        return res.status(400).json({
          success: false,
          message: 'Course-targeted materials require course and year.',
        });
      }
      if (cohortRequiresBranch(tc) && !tb) {
        return res.status(400).json({
          success: false,
          message: 'Engineering courses (B.Tech / Diploma) require a branch such as CSE or EE.',
        });
      }
      material.targetCourse = tc;
      material.targetBranch = tb;
      material.targetYear = ty;
      material.targetSemester = ts;
    } else {
      material.targetCourse = '';
      material.targetBranch = '';
      material.targetYear = '';
      material.targetSemester = '';
    }

    if (title !== undefined) {
      material.title = title;
    }

    const slugShouldRefresh =
      title !== undefined ||
      audience !== undefined ||
      targetCourse !== undefined ||
      targetBranch !== undefined ||
      targetYear !== undefined ||
      targetSemester !== undefined;

    if (slugShouldRefresh) {
      const slugBase =
        material.audience === 'cohort'
          ? slugify(
              `${material.title}-${material.targetCourse}${
                material.targetBranch ? `-${material.targetBranch}` : ''
              }-${material.targetYear}${
                material.targetSemester ? `-${material.targetSemester}` : ''
              }`
            )
          : slugify(material.title);
      material.slug = await ensureUniqueMaterialSlug(slugBase, material._id);
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

    if (!wasPublished && material.isPublished) {
      await notifyStudentsLearningMaterialPublished(req.user, material);
    }

    await notifyAdminsLearningChange({
      title: 'Learning material updated',
      message: `${editorLabel(req.user)} updated “${material.title}”.`,
      type: 'learning_material_updated',
      metadata: { materialId: material._id },
    });

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

    await notifyAdminsLearningChange({
      title: 'Learning material deleted',
      message: `${editorLabel(req.user)} deleted “${deleted.title}”.`,
      type: 'learning_material_deleted',
      metadata: { materialId: id },
    });

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

// @desc    Create study material from image upload
// @route   POST /api/learning/manage/materials/from-image
// @access  Private
exports.createMaterialFromImageUpload = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file.',
      });
    }

    const title = asString(req.body.title);
    const categoryId = asString(req.body.categoryId);
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

    const mime = req.file.mimetype || 'image/png';
    const dataUrl = `data:${mime};base64,${req.file.buffer.toString('base64')}`;
    const slug = await ensureUniqueMaterialSlug(slugify(title));

    const material = await StudyMaterial.create({
      title,
      slug,
      summary: asString(req.body.summary),
      content: asString(req.body.content) || asString(req.body.summary),
      materialType: asString(req.body.materialType) || 'slides',
      resourceUrl: dataUrl,
      level: asString(req.body.level) || 'beginner',
      tags: ['image-upload'],
      estimatedReadMinutes: Number(req.body.estimatedReadMinutes) || 5,
      category: categoryId,
      createdBy: req.user._id,
      isPublished:
        req.body.isPublished === undefined ? true : Boolean(req.body.isPublished),
    });

    const populated = await StudyMaterial.findById(material._id)
      .populate('category', 'name slug')
      .populate('createdBy', 'name role');

    await notifyStudentsLearningMaterialPublished(req.user, material);

    await notifyAdminsLearningChange({
      title: 'Learning material created (upload)',
      message: `${editorLabel(req.user)} created “${material.title}” from an image upload.`,
      type: 'learning_material_image_created',
      metadata: { materialId: material._id },
    });

    res.status(201).json({
      success: true,
      message: 'Study material created from image',
      data: { material: populated },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Bulk import study materials from Excel sheet
// @route   POST /api/learning/manage/materials/import
// @access  Private
exports.importMaterialsFromSheet = async (req, res) => {
  try {
    if (!ensureEditor(req, res)) return;
    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an Excel (.xlsx, .xls) or CSV file.',
      });
    }

    const rows = parseTabularFileRows(req.file.buffer, req.file.originalname || '');
    if (!rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Sheet is empty.',
      });
    }

    const categoryCache = new Map();
    const results = [];
    let publishedImported = 0;

    for (const row of rows) {
      const title = asString(row.title);
      const summary = asString(row.summary);
      const content = asString(row.content);
      const categorySlug = asString(row.categoryslug);
      const categoryIdRaw = asString(row.categoryid);

      if (!title || (!categorySlug && !categoryIdRaw)) {
        results.push({ title, ok: false, message: 'Missing title/category' });
        continue;
      }

      let categoryId = '';
      if (categoryIdRaw && mongoose.Types.ObjectId.isValid(categoryIdRaw)) {
        categoryId = categoryIdRaw;
      } else if (categorySlug) {
        if (categoryCache.has(categorySlug)) {
          categoryId = categoryCache.get(categorySlug);
        } else {
          const found = await LearningCategory.findOne({ slug: categorySlug })
            .select('_id')
            .lean();
          if (found?._id) {
            categoryId = String(found._id);
            categoryCache.set(categorySlug, categoryId);
          }
        }
      }

      if (!categoryId) {
        results.push({ title, ok: false, message: 'Category not found' });
        continue;
      }

      const slug = await ensureUniqueMaterialSlug(slugify(title));
      const rowPublished = row.ispublished === '' ? true : Boolean(row.ispublished);
      await StudyMaterial.create({
        title,
        slug,
        summary,
        content: content || summary,
        materialType: asString(row.materialtype) || 'article',
        resourceUrl: asString(row.resourceurl),
        level: asString(row.level) || 'beginner',
        tags: normalizeTags(asString(row.tags).split(',')),
        estimatedReadMinutes: Number(row.estimatedreadminutes) || 5,
        category: categoryId,
        createdBy: req.user._id,
        isPublished: rowPublished,
      });
      if (rowPublished) publishedImported += 1;

      results.push({ title, ok: true, message: 'Created' });
    }

    if (publishedImported > 0) {
      const recipientIds = await getStudentRecipientIdsForEditor(req.user);
      if (recipientIds.length) {
        await createBulkNotifications({
          recipientIds,
          title: 'New study materials',
          message:
            publishedImported === 1
              ? 'A new study resource was added to the learning hub.'
              : `${publishedImported} new study resources were added to the learning hub.`,
          category: 'learning',
          type: 'material_imported',
          actionUrl: '/dashboard/learning',
          metadata: { importedCount: publishedImported },
        });
      }
    }

    const created = results.filter((r) => r.ok).length;
    if (created > 0) {
      await notifyAdminsLearningChange({
        title: 'Learning materials imported',
        message: `${editorLabel(req.user)} imported ${created} study material row(s) via spreadsheet.`,
        type: 'learning_material_import',
        metadata: { created },
      });
    }

    const failed = results.length - created;

    res.status(200).json({
      success: true,
      message: `Material import complete. Created: ${created}, Failed: ${failed}`,
      data: { created, failed, results },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

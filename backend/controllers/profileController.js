const StudentProfile = require('../models/StudentProfile');

// @desc    Get current user's student profile
// @route   GET /api/profile
// @access  Private
exports.getMyProfile = async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ user: req.user._id }).populate(
      'user',
      'name email role'
    );

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: { profile: null },
        message: 'No profile yet. Use POST /api/profile to create one.',
      });
    }

    res.status(200).json({
      success: true,
      data: { profile },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// Valid skill levels (must match StudentProfile schema)
const SKILL_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

// Validate and normalize a single skill object
const normalizeSkill = (s) => {
  if (!s || typeof s.name !== 'string' || !s.name.trim()) {
    return null;
  }
  const level = SKILL_LEVELS.includes(s.level) ? s.level : 'beginner';
  let progress = Number(s.progress);
  if (Number.isNaN(progress) || progress < 0) progress = 0;
  if (progress > 100) progress = 100;
  return { name: s.name.trim(), level, progress };
};

// Calculate overallScore as average of skill.progress values
const computeOverallScore = (skills) => {
  if (!Array.isArray(skills) || skills.length === 0) return null;
  const sum = skills.reduce((acc, s) => acc + (s.progress ?? 0), 0);
  return Math.round((sum / skills.length) * 100) / 100;
};

// @desc    Create student profile
// @route   POST /api/profile
// @access  Private (students only)
exports.createProfile = async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can create a student profile.',
      });
    }

    const existing = await StudentProfile.findOne({ user: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists. Use PUT to update.',
      });
    }

    const { bio, skills } = req.body;

    const normalizedSkills = [];
    if (Array.isArray(skills)) {
      for (const s of skills) {
        const skill = normalizeSkill(s);
        if (skill) normalizedSkills.push(skill);
      }
    }

    const profile = await StudentProfile.create({
      user: req.user._id,
      bio: typeof bio === 'string' ? bio.trim() : '',
      skills: normalizedSkills,
    });

    const populated = await StudentProfile.findById(profile._id).populate(
      'user',
      'name email role'
    );

    res.status(201).json({
      success: true,
      message: 'Profile created',
      data: { profile: populated },
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
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

// @desc    Update student profile (bio, skills, stats)
// @route   PUT /api/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { bio, skills, stats } = req.body;
    const updateFields = {};
    let normalizedSkills = null;

    if (bio !== undefined) updateFields.bio = bio;
    if (skills !== undefined) {
      normalizedSkills = [];
      if (Array.isArray(skills)) {
        for (const s of skills) {
          const skill = normalizeSkill(s);
          if (skill) normalizedSkills.push(skill);
        }
      }
      updateFields.skills = normalizedSkills;
    }
    if (stats !== undefined) updateFields.stats = stats;

    if (normalizedSkills !== null) {
      const overallScore = computeOverallScore(normalizedSkills);
      updateFields.overallScore = overallScore;
      if (overallScore !== null) {
        updateFields.$push = {
          scoreHistory: { score: overallScore, date: new Date() },
        };
      }
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    ).populate('user', 'name email role');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Create a profile first.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated',
      data: { profile },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

// @desc    Update only skills
// @route   PATCH /api/profile/skills
// @access  Private
exports.updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;

    if (!Array.isArray(skills)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide skills as an array.',
      });
    }

    const normalizedSkills = [];
    for (const s of skills) {
      const skill = normalizeSkill(s);
      if (skill) normalizedSkills.push(skill);
    }

    const overallScore = computeOverallScore(normalizedSkills);
    const updateFields = {
      skills: normalizedSkills,
      overallScore,
    };
    if (overallScore !== null) {
      updateFields.$push = {
        scoreHistory: { score: overallScore, date: new Date() },
      };
    }

    const profile = await StudentProfile.findOneAndUpdate(
      { user: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    ).populate('user', 'name email role');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Create a profile first.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Skills updated',
      data: { profile },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

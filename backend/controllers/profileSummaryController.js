const mongoose = require('mongoose');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { getLearnerInsights } = require('../utils/learnerInsights');

function collegeRefId(ref) {
  if (!ref) return null;
  return String(ref._id || ref);
}

/**
 * @param {import('mongoose').Document | object} viewer
 * @param {object} target — lean user with optional populated affiliatedCollege / managedByCollege
 */
async function canViewProfileSummary(viewer, target) {
  const role = viewer.role;
  if (role === 'admin') return true;

  if (role === 'company') {
    if (target.role !== 'student') return false;
    const sp = await StudentProfile.findOne({ user: target._id }).select('visibleToCompanies').lean();
    if (sp && sp.visibleToCompanies === false) return false;
    return true;
  }

  if (role === 'college') {
    const cid = String(viewer._id);
    const aff = collegeRefId(target.affiliatedCollege);
    const mgr = collegeRefId(target.managedByCollege);
    return aff === cid || mgr === cid;
  }

  if (role === 'faculty') {
    const vCampus = collegeRefId(viewer.affiliatedCollege);
    if (!vCampus) return false;
    const aff = collegeRefId(target.affiliatedCollege);
    const mgr = collegeRefId(target.managedByCollege);
    if (target.role === 'student' || target.role === 'faculty') {
      return aff === vCampus || mgr === vCampus;
    }
    return false;
  }

  return false;
}

function collegeDisplayName(target) {
  const a = target.affiliatedCollege;
  const m = target.managedByCollege;
  if (a && typeof a === 'object' && a.name) return a.name;
  if (m && typeof m === 'object' && m.name) return m.name;
  return '';
}

// @desc    Short learner profile for admin, college, faculty, company (no full PII)
// @route   GET /api/profile/summary/:userId
// @access  Private
exports.getProfileSummaryForViewer = async (req, res) => {
  try {
    const viewer = req.user;
    if (!['admin', 'college', 'faculty', 'company'].includes(viewer.role)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot view this profile summary.',
      });
    }

    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const target = await User.findById(userId)
      .select(
        'name email role profilePhoto affiliatedCollege managedByCollege facultyQualification facultySubjects'
      )
      .populate('affiliatedCollege', 'name')
      .populate('managedByCollege', 'name')
      .lean();

    if (!target) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!(await canViewProfileSummary(viewer, target))) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this profile.',
      });
    }

    const collegeName = collegeDisplayName(target) || '—';

    if (target.role !== 'student') {
      return res.status(200).json({
        success: true,
        data: {
          summary: {
            userId: target._id,
            name: target.name,
            email: target.email,
            role: target.role,
            profilePhoto: target.profilePhoto || '',
            collegeName,
            course: '',
            branch: '',
            year: '',
            semester: '',
            bio: '',
            skills: [],
            toolsAndTechnologies: [],
            overallScore: null,
            stats: {},
            facultyQualification: target.facultyQualification || '',
            facultySubjects: target.facultySubjects || '',
          },
        },
      });
    }

    const profile = await StudentProfile.findOne({ user: userId }).lean();
    const insights = await getLearnerInsights(userId);

    const skillsSource = (profile && profile.skills && profile.skills.length
      ? profile.skills
      : insights.skills) || [];
    const skills = skillsSource.slice(0, 12).map((s) => ({
      name: s.name,
      level: s.level || 'beginner',
      progress: typeof s.progress === 'number' ? s.progress : 0,
    }));

    const tools = Array.isArray(profile?.toolsAndTechnologies)
      ? profile.toolsAndTechnologies.slice(0, 20)
      : [];

    const overallScore =
      typeof profile?.overallScore === 'number'
        ? profile.overallScore
        : typeof insights.overallScore === 'number'
          ? insights.overallScore
          : null;

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          userId: target._id,
          name: target.name,
          email: target.email,
          role: target.role,
          profilePhoto: target.profilePhoto || '',
          collegeName,
          course: profile?.course || '',
          branch: profile?.branch || '',
          year: profile?.year || '',
          semester: profile?.semester || '',
          bio: profile?.bio || '',
          skills,
          toolsAndTechnologies: tools,
          overallScore,
          stats: profile?.stats || insights.stats || {},
        },
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message || 'Server error',
    });
  }
};

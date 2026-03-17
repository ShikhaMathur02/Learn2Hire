const AssessmentSubmission = require('../models/AssessmentSubmission');
const LearningProgress = require('../models/LearningProgress');

const getLevelFromProgress = (progress) => {
  if (progress >= 85) return 'expert';
  if (progress >= 65) return 'advanced';
  if (progress >= 40) return 'intermediate';
  return 'beginner';
};

const roundScore = (value) => Math.round(Number(value || 0) * 100) / 100;

const buildDerivedSkills = (submissions) => {
  const grouped = {};

  submissions.forEach((submission) => {
    const skillName = String(submission.assessment?.skill || 'General').trim();
    if (!skillName || !submission.maxScore) return;

    const scorePercent = Math.max(
      0,
      Math.min(100, roundScore((submission.score / submission.maxScore) * 100))
    );

    if (!grouped[skillName]) {
      grouped[skillName] = {
        total: 0,
        count: 0,
      };
    }

    grouped[skillName].total += scorePercent;
    grouped[skillName].count += 1;
  });

  return Object.entries(grouped).map(([name, details]) => {
    const progress = roundScore(details.total / details.count);

    return {
      name,
      level: getLevelFromProgress(progress),
      progress,
    };
  });
};

const getLearnerInsights = async (userId) => {
  const [submissions, learningProgress] = await Promise.all([
    AssessmentSubmission.find({ user: userId })
      .populate('assessment', 'skill maxScore')
      .sort({ submittedAt: -1 }),
    LearningProgress.find({ user: userId }).sort({ lastViewedAt: -1 }).lean(),
  ]);

  const skills = buildDerivedSkills(submissions);
  const completedLearning = learningProgress.filter((item) => item.completed).length;
  const overallScore = skills.length
    ? roundScore(skills.reduce((sum, skill) => sum + skill.progress, 0) / skills.length)
    : null;

  return {
    skills,
    stats: {
      coursesEnrolled: learningProgress.length,
      coursesCompleted: completedLearning,
      assessmentsTaken: submissions.length,
    },
    overallScore,
    scoreHistory: overallScore !== null ? [{ score: overallScore, date: new Date() }] : [],
    learningSummary: {
      totalStarted: learningProgress.length,
      totalCompleted: completedLearning,
      inProgressCount: learningProgress.filter((item) => !item.completed && item.progressPercent > 0)
        .length,
    },
  };
};

module.exports = {
  getLearnerInsights,
};

/**
 * Verifies that every published learning subject (LearningCategory) has at least
 * one published StudyMaterial. Run after seed:subjects and seed:materials.
 *
 * Usage (from backend/): node scripts/verifyLearningContent.js
 * Exit code 0 = OK, 1 = missing data or DB error
 */

require('dotenv').config();

const connectDB = require('../config/db');
const LearningCategory = require('../models/LearningCategory');
const StudyMaterial = require('../models/StudyMaterial');

const run = async () => {
  try {
    await connectDB();

    const categories = await LearningCategory.find({ isPublished: true }).sort({ slug: 1 }).lean();
    if (categories.length === 0) {
      console.error('FAIL: No published learning categories. Run: npm run seed:subjects');
      process.exit(1);
    }

    let failed = false;
    for (const cat of categories) {
      const n = await StudyMaterial.countDocuments({
        category: cat._id,
        isPublished: true,
      });
      if (n === 0) {
        console.error(`FAIL: Subject "${cat.name}" (slug: ${cat.slug}) has 0 published materials.`);
        failed = true;
      } else {
        console.log(`OK  ${cat.slug.padEnd(18)} ${n} material(s)`);
      }
    }

    const totalMaterials = await StudyMaterial.countDocuments({ isPublished: true });
    console.log(`\nTotal published materials: ${totalMaterials}`);
    console.log(`Total published subjects:  ${categories.length}`);

    process.exit(failed ? 1 : 0);
  } catch (err) {
    console.error('verifyLearningContent failed:', err.message);
    process.exit(1);
  }
};

run();

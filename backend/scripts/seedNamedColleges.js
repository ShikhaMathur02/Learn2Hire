require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

/**
 * Pre-approved college accounts for the signup college dropdown.
 * Run: npm run seed:colleges
 * Optional: SEED_COLLEGE_PASSWORD (must be 8+ chars with upper, lower, number, special).
 */
const NAMED_COLLEGES = [
  { name: 'RBMI', email: 'rbmi.seed@learn2hire.local' },
  { name: 'Group of Institution', email: 'group-of-institution.seed@learn2hire.local' },
  { name: 'Future University', email: 'future-university.seed@learn2hire.local' },
  { name: 'Invertis University', email: 'invertis-university.seed@learn2hire.local' },
  { name: 'SRMS Group of Institution', email: 'srms-group.seed@learn2hire.local' },
];

function isStrongPassword(value) {
  const v = String(value || '');
  return (
    v.length >= 8 &&
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /\d/.test(v) &&
    /[^A-Za-z0-9]/.test(v)
  );
}

async function run() {
  const rawPassword = process.env.SEED_COLLEGE_PASSWORD || 'SeedCol@ge1!';
  if (!isStrongPassword(rawPassword)) {
    console.error(
      'SEED_COLLEGE_PASSWORD must be at least 8 characters and include uppercase, lowercase, number, and special character.'
    );
    process.exit(1);
  }

  try {
    await connectDB();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    for (const { name, email } of NAMED_COLLEGES) {
      const norm = email.trim().toLowerCase();
      const existing = await User.findOne({ email: norm }).select('+password');

      if (existing) {
        if (existing.role !== 'college') {
          console.warn(`Skip ${norm}: already registered as ${existing.role}.`);
          continue;
        }
        existing.name = name;
        existing.collegeApprovalStatus = 'approved';
        if (!existing.password) {
          existing.password = hashedPassword;
        }
        await existing.save();
        console.log(`Updated college: ${name} (${norm})`);
        continue;
      }

      await User.create({
        name,
        email: norm,
        password: hashedPassword,
        role: 'college',
        collegeApprovalStatus: 'approved',
      });
      console.log(`Created college: ${name} (${norm})`);
    }

    console.log('Named colleges seed finished.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Named colleges seed failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

run();

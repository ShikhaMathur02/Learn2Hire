/**
 * Creates deterministic demo accounts for documentation screenshots.
 * Run with MongoDB available and backend/.env configured (same as server).
 *
 *   cd backend && node scripts/seedScreenshotDemoUsers.js
 *
 * Writes docs/screenshot-ids.json (repo root) with MongoDB ids for Playwright.
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');
const Job = require('../models/Job');
const Assessment = require('../models/Assessment');

const DEMO_PASSWORD = 'DocDemo@12345';

const EMAILS = {
  college: 'doc.college@learn2hire.local',
  student: 'doc.student@learn2hire.local',
  faculty: 'doc.faculty@learn2hire.local',
  company: 'doc.company@learn2hire.local',
};

function strong(pw) {
  const v = String(pw || '');
  return (
    v.length >= 8 &&
    /[A-Z]/.test(v) &&
    /[a-z]/.test(v) &&
    /\d/.test(v) &&
    /[^A-Za-z0-9]/.test(v)
  );
}

async function upsertUser(filter, doc) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, salt);
  const row = await User.findOneAndUpdate(
    filter,
    { ...doc, password: hashedPassword },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return row;
}

async function run() {
  if (!strong(DEMO_PASSWORD)) {
    console.error('DEMO_PASSWORD in script must meet strength rules.');
    process.exit(1);
  }

  const repoRoot = path.resolve(__dirname, '../..');
  const idsPath = path.join(repoRoot, 'docs', 'screenshot-ids.json');

  try {
    await connectDB();

    const college = await upsertUser(
      { email: EMAILS.college },
      {
        name: 'Doc Demo College',
        email: EMAILS.college,
        role: 'college',
        collegeApprovalStatus: 'approved',
      }
    );

    const student = await upsertUser(
      { email: EMAILS.student },
      {
        name: 'Doc Demo Student',
        email: EMAILS.student,
        role: 'student',
        affiliatedCollege: college._id,
        facultyApprovalStatus: undefined,
        collegeApprovalStatus: undefined,
      }
    );

    const faculty = await upsertUser(
      { email: EMAILS.faculty },
      {
        name: 'Doc Demo Faculty',
        email: EMAILS.faculty,
        role: 'faculty',
        affiliatedCollege: college._id,
        facultyApprovalStatus: 'approved',
      }
    );

    const company = await upsertUser(
      { email: EMAILS.company },
      {
        name: 'Doc Demo Company',
        email: EMAILS.company,
        role: 'company',
        platformApprovalStatus: 'approved',
      }
    );

    const job = await Job.findOneAndUpdate(
      { title: 'Doc Demo — Software Engineer (screenshots)', createdBy: company._id },
      {
        title: 'Doc Demo — Software Engineer (screenshots)',
        description:
          'Seeded job for documentation screenshots. Safe to delete after capturing docs.',
        location: 'Remote',
        employmentType: 'full-time',
        skillsRequired: ['JavaScript', 'React'],
        status: 'open',
        createdBy: company._id,
      },
      { upsert: true, new: true }
    );

    const assessment = await Assessment.findOneAndUpdate(
      { title: 'Doc Demo Assessment (screenshots)', createdBy: faculty._id },
      {
        title: 'Doc Demo Assessment (screenshots)',
        description: 'Seeded assessment for documentation screenshots.',
        createdBy: faculty._id,
        skill: 'General',
        status: 'published',
        questions: [
          {
            question: 'What is 2 + 2?',
            options: ['3', '4', '5', '22'],
            correctAnswer: '4',
            marks: 1,
          },
        ],
        maxScore: 1,
      },
      { upsert: true, new: true }
    );

    const payload = {
      emails: EMAILS,
      studentUserId: student._id.toString(),
      collegeUserId: college._id.toString(),
      facultyUserId: faculty._id.toString(),
      companyUserId: company._id.toString(),
      jobId: job._id.toString(),
      assessmentId: assessment._id.toString(),
    };

    fs.mkdirSync(path.dirname(idsPath), { recursive: true });
    fs.writeFileSync(idsPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

    console.log('Screenshot demo users and content ready.');
    console.log(`Wrote ${idsPath}`);
    console.log('Login password for all doc.* accounts:', DEMO_PASSWORD);
    console.log('Builtin admin (dashboards): admin1@gmail.com / Admin@12345');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

run();

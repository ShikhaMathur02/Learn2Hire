require('dotenv').config();

const connectDB = require('../config/db');
const LearningCategory = require('../models/LearningCategory');

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const subjects = [
  {
    name: 'DBMS',
    description: 'Database management system concepts, SQL basics, normalization, and transactions.',
    icon: 'database',
  },
  {
    name: 'OS',
    description: 'Operating system fundamentals like processes, threads, scheduling, memory, and files.',
    icon: 'cpu',
  },
  {
    name: 'CN',
    description: 'Computer networks topics including protocols, OSI model, routing, and communication.',
    icon: 'network',
  },
  {
    name: 'DSA',
    description: 'Data structures and algorithms for coding interviews and problem solving.',
    icon: 'binary-tree',
  },
  {
    name: 'OOP',
    description: 'Object-oriented programming concepts such as classes, inheritance, abstraction, and polymorphism.',
    icon: 'boxes',
  },
  {
    name: 'Web Dev',
    description: 'Frontend and backend web development topics using HTML, CSS, JavaScript, React, Node.js, and APIs.',
    icon: 'globe',
  },
  {
    name: 'AI/ML',
    description: 'Artificial intelligence and machine learning basics, models, workflows, and practical use cases.',
    icon: 'brain',
  },
  {
    name: 'Aptitude',
    description: 'Quantitative aptitude, reasoning, and problem-solving practice for placements.',
    icon: 'calculator',
  },
  {
    name: 'Interview Prep',
    description: 'HR, technical interview, resume, communication, and placement preparation guidance.',
    icon: 'messages-square',
  },
];

const run = async () => {
  try {
    await connectDB();

    for (const subject of subjects) {
      await LearningCategory.findOneAndUpdate(
        { slug: slugify(subject.name) },
        {
          name: subject.name,
          slug: slugify(subject.name),
          description: subject.description,
          icon: subject.icon,
          isPublished: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`Seeded ${subjects.length} learning subjects successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed learning subjects:', error.message);
    process.exit(1);
  }
};

run();

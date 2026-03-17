require('dotenv').config();

const bcrypt = require('bcryptjs');

const connectDB = require('../config/db');
const LearningCategory = require('../models/LearningCategory');
const StudyMaterial = require('../models/StudyMaterial');
const User = require('../models/User');

const slugify = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const materials = [
  {
    category: 'dbms',
    title: 'DBMS Basics for Beginners',
    summary: 'Understand databases, tables, keys, normalization, and transactions in simple words.',
    content:
      'This material introduces DBMS basics for placement and interview preparation. Start by understanding what a database is, why DBMS is used, and how tables, rows, and columns work. Then move to primary keys, foreign keys, normalization, ACID properties, and transactions. End with basic SQL operations like SELECT, INSERT, UPDATE, and DELETE.',
    level: 'beginner',
    materialType: 'article',
    tags: ['dbms', 'sql', 'normalization', 'acid'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'os',
    title: 'Operating System Core Concepts',
    summary: 'A quick guide to processes, threads, CPU scheduling, deadlocks, and memory management.',
    content:
      'Operating systems manage hardware and software resources. Learn the difference between process and thread, common CPU scheduling methods, context switching, deadlocks, paging, segmentation, and memory allocation. These are common placement topics and help in technical interviews.',
    level: 'beginner',
    materialType: 'article',
    tags: ['os', 'process', 'thread', 'memory'],
    estimatedReadMinutes: 11,
  },
  {
    category: 'cn',
    title: 'Computer Networks Crash Course',
    summary: 'Cover OSI model, TCP/IP, IP addressing, routing, and important networking protocols.',
    content:
      'Computer Networks helps systems communicate. This lesson covers the OSI model, TCP/IP model, IP addresses, subnet basics, switching, routing, and protocols such as HTTP, HTTPS, FTP, DNS, TCP, and UDP. It is useful for interview revision and system understanding.',
    level: 'beginner',
    materialType: 'article',
    tags: ['cn', 'networking', 'osi', 'tcp-ip'],
    estimatedReadMinutes: 10,
  },
  {
    category: 'dsa',
    title: 'DSA Interview Preparation Roadmap',
    summary: 'Start with arrays and strings, then move to linked lists, trees, graphs, recursion, and DP.',
    content:
      'Data Structures and Algorithms is the most important placement subject for coding rounds. This roadmap starts with arrays, strings, searching, and sorting. Then it moves into linked lists, stacks, queues, trees, graphs, recursion, backtracking, greedy methods, and dynamic programming. Practice patterns matter more than memorizing solutions.',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'algorithms', 'coding', 'interviews'],
    estimatedReadMinutes: 14,
  },
  {
    category: 'oop',
    title: 'OOP Concepts Explained Simply',
    summary: 'Learn classes, objects, abstraction, encapsulation, inheritance, and polymorphism.',
    content:
      'Object-oriented programming helps organize code into reusable structures. Learn what classes and objects are, then understand the four main OOP pillars: abstraction, encapsulation, inheritance, and polymorphism. Use real-world examples to explain why OOP is useful in Java, C++, and similar languages.',
    level: 'beginner',
    materialType: 'article',
    tags: ['oop', 'classes', 'inheritance', 'polymorphism'],
    estimatedReadMinutes: 9,
  },
  {
    category: 'web-dev',
    title: 'Web Development Full Stack Starter Guide',
    summary: 'An overview of HTML, CSS, JavaScript, React, Node.js, APIs, and databases.',
    content:
      'This guide introduces full stack web development. Start with HTML for structure, CSS for styling, and JavaScript for interactivity. Move to React for frontend applications, Node.js and Express for backend APIs, and MongoDB for storing data. Learn how frontend and backend connect through REST APIs.',
    level: 'beginner',
    materialType: 'article',
    tags: ['web dev', 'react', 'node', 'mongodb'],
    estimatedReadMinutes: 13,
  },
  {
    category: 'ai-ml',
    title: 'AI and ML Introduction',
    summary: 'A simple starting point for machine learning concepts, data, models, and real use cases.',
    content:
      'Artificial intelligence and machine learning are about making systems learn patterns from data. This material covers supervised learning, unsupervised learning, datasets, training, testing, overfitting, and real-world applications like recommendations and predictions. It gives a beginner-friendly foundation before going deeper.',
    level: 'beginner',
    materialType: 'article',
    tags: ['ai', 'ml', 'machine learning', 'data'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'aptitude',
    title: 'Placement Aptitude Preparation Basics',
    summary: 'Covers percentages, ratios, time-speed-distance, probability, and logical reasoning.',
    content:
      'Aptitude rounds are common in campus placements. This material covers the core topics students should practice regularly: percentages, profit and loss, ratios, averages, time and work, time-speed-distance, probability, and logical reasoning. Focus on concept clarity and timed practice.',
    level: 'beginner',
    materialType: 'article',
    tags: ['aptitude', 'reasoning', 'placement'],
    estimatedReadMinutes: 10,
  },
  {
    category: 'interview-prep',
    title: 'Interview Preparation Guide',
    summary: 'Prepare for technical interviews, HR questions, resume discussions, and communication rounds.',
    content:
      'Interview preparation includes technical depth and clear communication. This guide covers resume walkthroughs, project explanation, common HR questions, strengths and weaknesses, behavioral answers using examples, and how to explain technical concepts simply. It also covers mock interview practice and confidence building.',
    level: 'beginner',
    materialType: 'article',
    tags: ['interview', 'resume', 'hr', 'communication'],
    estimatedReadMinutes: 11,
  },
];

const ensureContentAdmin = async () => {
  let user = await User.findOne({ role: { $in: ['admin', 'faculty', 'college'] } });

  if (user) {
    return user;
  }

  const email = 'content.admin@learn2hire.com';
  user = await User.findOne({ email });

  if (user) {
    return user;
  }

  const hashedPassword = await bcrypt.hash('Learn2Hire@123', 10);

  return User.create({
    name: 'Learn2Hire Content Admin',
    email,
    password: hashedPassword,
    role: 'admin',
  });
};

const run = async () => {
  try {
    await connectDB();

    const contentAdmin = await ensureContentAdmin();

    for (const item of materials) {
      const category = await LearningCategory.findOne({ slug: item.category });
      if (!category) {
        continue;
      }

      await StudyMaterial.findOneAndUpdate(
        { slug: slugify(item.title) },
        {
          title: item.title,
          slug: slugify(item.title),
          summary: item.summary,
          content: item.content,
          materialType: item.materialType,
          resourceUrl: '',
          level: item.level,
          tags: item.tags,
          estimatedReadMinutes: item.estimatedReadMinutes,
          category: category._id,
          createdBy: contentAdmin._id,
          isPublished: true,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`Seeded ${materials.length} study materials successfully.`);
    console.log(`Content owner: ${contentAdmin.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to seed study materials:', error.message);
    process.exit(1);
  }
};

run();

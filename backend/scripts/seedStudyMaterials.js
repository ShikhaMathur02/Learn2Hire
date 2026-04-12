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
  // DBMS – detailed topics
  {
    category: 'dbms',
    title: 'What is DBMS? (Definition, Advantages & Components)',
    summary:
      'Understand what a DBMS is, why it is used instead of file systems, and the high‑level architecture asked in interviews.',
    content:
      '### What is DBMS?\n' +
      'A **Database Management System (DBMS)** is software that helps you create, store, update and retrieve data from databases in an efficient and secure way. Instead of reading raw files manually, applications talk to the DBMS using a query language (mostly SQL).\n\n' +
      '### Why not simple files?\n' +
      '- No standard query language\n' +
      '- Difficult to maintain relationships between data\n' +
      '- Hard to ensure security and concurrent access\n' +
      '- No guarantee for data consistency on failures\n\n' +
      '### DBMS vs Database\n' +
      '- **Database** = organized collection of data\n' +
      '- **DBMS** = software layer that manages the database\n\n' +
      '### DBMS Components (often drawn in interviews)\n' +
      '- Query Processor\n' +
      '- Storage Manager\n' +
      '- Transaction Manager\n' +
      '- Buffer Manager / Cache\n' +
      '- Authorization & Integrity Manager\n\n' +
      '### ACID Properties (high level)\n' +
      '- **Atomicity** – all or nothing\n' +
      '- **Consistency** – data moves from one valid state to another\n' +
      '- **Isolation** – concurrent transactions do not interfere logically\n' +
      '- **Durability** – once committed, data survives failures\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dbms', 'basics', 'acid', 'architecture'],
    estimatedReadMinutes: 10,
  },
  {
    category: 'dbms',
    title: 'DBMS Normalization (1NF, 2NF, 3NF) with Examples',
    summary:
      'Learn how to remove redundancy and anomalies from relational tables using 1NF, 2NF and 3NF.',
    content:
      '### Why Normalization?\n' +
      'Normalization is a process of redesigning tables to **remove redundancy** and avoid **update, insert and delete anomalies**.\n\n' +
      '### 1NF – First Normal Form\n' +
      '- No repeating groups\n' +
      '- Every cell holds a single value\n' +
      '- Each record is unique\n\n' +
      'Example (NOT 1NF):\n' +
      'Student(id, name, phone1, phone2)\n\n' +
      'Better design:\n' +
      'Student(id, name)\n' +
      'StudentPhone(studentId, phone)\n\n' +
      '### 2NF – Second Normal Form\n' +
      '- Table is already in 1NF\n' +
      '- No **partial dependency** on a composite key\n\n' +
      'If key = (studentId, subjectId) but non‑key column depends only on studentId, split that out.\n\n' +
      '### 3NF – Third Normal Form\n' +
      '- Table is in 2NF\n' +
      '- No **transitive dependency** (non‑key → non‑key)\n\n' +
      'Rule of thumb: every non‑key attribute should depend **only on the key, the whole key, and nothing but the key**.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dbms', 'normalization', '1nf', '2nf', '3nf'],
    estimatedReadMinutes: 9,
  },
  {
    category: 'dbms',
    title: 'SQL Basics – SELECT and JOIN Explained with Code',
    summary:
      'Practice‑oriented introduction to SELECT queries and different types of JOINs, with examples.',
    content:
      '### Sample Tables\n' +
      'We will use two tables:\n\n' +
      '```sql\n' +
      'CREATE TABLE Students (\n' +
      '  id INT PRIMARY KEY,\n' +
      '  name VARCHAR(50),\n' +
      '  department VARCHAR(20)\n' +
      ');\n\n' +
      'CREATE TABLE Marks (\n' +
      '  id INT PRIMARY KEY,\n' +
      '  student_id INT,\n' +
      '  subject VARCHAR(20),\n' +
      '  score INT,\n' +
      '  FOREIGN KEY (student_id) REFERENCES Students(id)\n' +
      ');\n' +
      '```\n\n' +
      '### Basic SELECT\n' +
      '```sql\n' +
      '-- all columns\n' +
      'SELECT * FROM Students;\n\n' +
      '-- specific columns with filter\n' +
      'SELECT name, department\n' +
      'FROM Students\n' +
      'WHERE department = \'CSE\';\n' +
      '```\n\n' +
      '### INNER JOIN\n' +
      'Get all students with their marks:\n' +
      '```sql\n' +
      'SELECT s.name, m.subject, m.score\n' +
      'FROM Students s\n' +
      'JOIN Marks m ON s.id = m.student_id;\n' +
      '```\n\n' +
      '### LEFT JOIN\n' +
      'All students, even if they do not have marks yet:\n' +
      '```sql\n' +
      'SELECT s.name, m.subject, m.score\n' +
      'FROM Students s\n' +
      'LEFT JOIN Marks m ON s.id = m.student_id;\n' +
      '```\n\n' +
      'Remember for interviews: explain JOINs using **Venn‑diagram style** and simple examples like Students / Marks.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dbms', 'sql', 'select', 'join'],
    estimatedReadMinutes: 12,
  },
  // OS
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
    category: 'os',
    title: 'Process vs Thread — When Interviewers Ask',
    summary:
      'Clear definitions, shared vs private resources, and why threads are lighter — with interview-style answers.',
    content:
      '### Process\n' +
      'A **process** is an instance of a running program. It has its own address space, file descriptors, and OS resources.\n\n' +
      '### Thread\n' +
      'A **thread** is the smallest unit of CPU execution **inside** a process. Multiple threads share the same address space (heap, code) but have **private stacks** and registers.\n\n' +
      '### Comparison\n' +
      '- **Creation & context switch**: threads are cheaper.\n' +
      '- **Communication**: threads share memory easily; processes need IPC (pipes, sockets, shared memory).\n' +
      '- **Crash isolation**: one bad thread can corrupt the whole process; processes are more isolated.\n\n' +
      '### One-liner for interviews\n' +
      '“A process owns resources; threads share the process’s memory but run concurrent flows of execution.”\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['os', 'process', 'thread', 'ipc'],
    estimatedReadMinutes: 8,
  },
  {
    category: 'os',
    title: 'Deadlocks — Four Conditions & Mitigation',
    summary: 'Coffman conditions, resource allocation graphs, and prevention vs avoidance vs detection.',
    content:
      '### What is a deadlock?\n' +
      'A set of processes are **blocked forever** waiting on each other’s resources.\n\n' +
      '### Four necessary conditions (Coffman)\n' +
      '1. **Mutual exclusion** – resource non-sharable\n' +
      '2. **Hold and wait** – hold one resource while waiting for another\n' +
      '3. **No preemption** – resources released only voluntarily\n' +
      '4. **Circular wait** – cycle in the wait-for graph\n\n' +
      '### Strategies\n' +
      '- **Prevention**: break one condition (e.g. lock ordering)\n' +
      '- **Avoidance**: Banker’s algorithm when max needs are known\n' +
      '- **Detection & recovery**: detect cycle, kill or rollback\n\n' +
      'Interview tip: draw a **small example** with two processes and two locks.\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['os', 'deadlock', 'banker', 'scheduling'],
    estimatedReadMinutes: 10,
  },
  // CN
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
    category: 'cn',
    title: 'TCP vs UDP — Ports, Reliability, and Use Cases',
    summary: 'Header ideas, connection-oriented vs connectionless, and where each protocol fits.',
    content:
      '### TCP (Transmission Control Protocol)\n' +
      '- **Connection-oriented** (handshake)\n' +
      '- **Reliable**: acknowledgements, retransmission, ordering\n' +
      '- **Heavier** than UDP\n' +
      '- Examples: HTTP/HTTPS, SMTP, FTP control\n\n' +
      '### UDP (User Datagram Protocol)\n' +
      '- **Connectionless** — send and forget\n' +
      '- **Best-effort** delivery, no ordering guarantee\n' +
      '- **Lower latency**, good for real-time\n' +
      '- Examples: DNS (often), VoIP, online games, live streaming\n\n' +
      '### Interview angle\n' +
      '“Choose TCP when correctness matters; UDP when speed and tolerance for loss matter.”\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['cn', 'tcp', 'udp', 'protocols'],
    estimatedReadMinutes: 9,
  },
  {
    category: 'cn',
    title: 'HTTP, HTTPS, and REST in One Page',
    summary: 'Methods, status codes, TLS role, and how REST maps to HTTP for APIs.',
    content:
      '### HTTP\n' +
      'Application-layer protocol for web communication. Common **methods**: GET, POST, PUT, PATCH, DELETE.\n\n' +
      '### Status codes (remember a few)\n' +
      '- **2xx** success (200 OK, 201 Created)\n' +
      '- **4xx** client error (404 Not Found, 401 Unauthorized)\n' +
      '- **5xx** server error\n\n' +
      '### HTTPS\n' +
      'HTTP over **TLS**: encryption, integrity, server authentication (certificates).\n\n' +
      '### REST (style)\n' +
      'Resources identified by URLs; stateless requests; use nouns in paths (`/users/:id`). Not a strict protocol — a **design pattern** on top of HTTP.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['cn', 'http', 'https', 'rest', 'api'],
    estimatedReadMinutes: 10,
  },
  // DSA – detailed topics
  {
    category: 'dsa',
    title: 'Arrays in DSA – Basics and Interview Patterns',
    summary:
      'Learn array representation, common operations, time‑complexity and must‑solve interview patterns.',
    content:
      '### What is an Array?\n' +
      'An **array** is a collection of elements stored in **contiguous memory locations** and accessed using an index.\n\n' +
      '### Common Operations & Complexity\n' +
      '- Access by index: O(1)\n' +
      '- Update: O(1)\n' +
      '- Insert at end (amortized): O(1)\n' +
      '- Insert/delete in middle: O(n) due to shifting\n\n' +
      '### Example – Reverse an Array (C++)\n' +
      '```cpp\n' +
      'void reverse(vector<int>& a) {\n' +
      '  int i = 0, j = a.size() - 1;\n' +
      '  while (i < j) {\n' +
      '    swap(a[i], a[j]);\n' +
      '    i++; j--;\n' +
      '  }\n' +
      '}\n' +
      '```\n\n' +
      '### Typical Interview Problems\n' +
      '- Maximum subarray sum (Kadane)\n' +
      '- Move zeros to end\n' +
      '- Two‑sum, three‑sum\n' +
      '- Rotate array by k steps\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'arrays', 'patterns'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'dsa',
    title: 'Linked List in DSA – Implementation and Use Cases',
    summary:
      'Understand singly linked list structure, insertion, deletion and why we use lists over arrays.',
    content:
      '### Singly Linked List Node (C++)\n' +
      '```cpp\n' +
      'struct Node {\n' +
      '  int data;\n' +
      '  Node* next;\n' +
      '  Node(int x) : data(x), next(nullptr) {}\n' +
      '};\n' +
      '```\n\n' +
      '### Insert at Head\n' +
      '```cpp\n' +
      'void pushFront(Node*& head, int x) {\n' +
      '  Node* node = new Node(x);\n' +
      '  node->next = head;\n' +
      '  head = node;\n' +
      '}\n' +
      '```\n\n' +
      '### Why Linked List?\n' +
      '- Easy insertion/deletion in middle: O(1) with pointer\n' +
      '- No need for contiguous memory\n' +
      '- Good for implementing stacks, queues, adjacency lists\n\n' +
      '### Classic Problems\n' +
      '- Reverse a linked list (iterative & recursive)\n' +
      '- Detect cycle (Floyd’s algorithm)\n' +
      '- Find middle node\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'linked list', 'implementation'],
    estimatedReadMinutes: 11,
  },
  {
    category: 'dsa',
    title: 'Sorting Algorithms – Bubble, Selection and Merge Sort',
    summary:
      'Quick revision of O(n²) and O(n log n) sorting with code and when to use which algorithm.',
    content:
      '### Bubble Sort (C++)\n' +
      '```cpp\n' +
      'void bubbleSort(vector<int>& a) {\n' +
      '  int n = a.size();\n' +
      '  for (int i = 0; i < n - 1; i++) {\n' +
      '    bool swapped = false;\n' +
      '    for (int j = 0; j < n - i - 1; j++) {\n' +
      '      if (a[j] > a[j + 1]) {\n' +
      '        swap(a[j], a[j + 1]);\n' +
      '        swapped = true;\n' +
      '      }\n' +
      '    }\n' +
      '    if (!swapped) break;\n' +
      '  }\n' +
      '}\n' +
      '```\n\n' +
      '### Selection Sort (C++)\n' +
      '```cpp\n' +
      'void selectionSort(vector<int>& a) {\n' +
      '  int n = a.size();\n' +
      '  for (int i = 0; i < n - 1; i++) {\n' +
      '    int minIdx = i;\n' +
      '    for (int j = i + 1; j < n; j++)\n' +
      '      if (a[j] < a[minIdx]) minIdx = j;\n' +
      '    swap(a[i], a[minIdx]);\n' +
      '  }\n' +
      '}\n' +
      '```\n\n' +
      '### Merge Sort (C++) – idea\n' +
      '```cpp\n' +
      'void mergeSort(vector<int>& a, int l, int r) {\n' +
      '  if (l >= r) return;\n' +
      '  int m = (l + r) / 2;\n' +
      '  mergeSort(a, l, m);\n' +
      '  mergeSort(a, m + 1, r);\n' +
      '  // merge two sorted halves\n' +
      '}\n' +
      '```\n\n' +
      'Interview tip: mention **time complexity** (O(n²) vs O(n log n)) and **stability** when comparing algorithms.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'sorting', 'algorithms'],
    estimatedReadMinutes: 13,
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
    category: 'oop',
    title: 'SOLID Principles — Quick Interview Notes',
    summary: 'Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion.',
    content:
      '### S — Single Responsibility\n' +
      'A class should have **one reason to change**.\n\n' +
      '### O — Open/Closed\n' +
      'Open for **extension**, closed for **modification** (use interfaces/abstraction).\n\n' +
      '### L — Liskov Substitution\n' +
      'Subtypes must be substitutable for their base types **without breaking behavior**.\n\n' +
      '### I — Interface Segregation\n' +
      'Prefer **small, focused** interfaces over fat ones.\n\n' +
      '### D — Dependency Inversion\n' +
      'Depend on **abstractions**, not concrete classes.\n\n' +
      'Tip: give **one short example** per letter if asked “explain SOLID”.\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['oop', 'solid', 'design', 'interview'],
    estimatedReadMinutes: 10,
  },
  {
    category: 'oop',
    title: 'Inheritance vs Composition — What to Say in Interviews',
    summary: '“Is-a” vs “has-a”, tight coupling risks, and favoring composition for flexibility.',
    content:
      '### Inheritance\n' +
      'Models an **is-a** relationship. Subclass reuses and specializes parent behavior.\n' +
      '- Risk: **deep hierarchies**, fragile base classes, tight coupling.\n\n' +
      '### Composition\n' +
      'Build objects by **combining** smaller parts — **has-a** relationships.\n' +
      '- Often more flexible than inheritance for changing behavior at runtime.\n\n' +
      '### Classic interview line\n' +
      '“Prefer **composition over inheritance** when behavior varies; use inheritance when the taxonomy is stable and truly hierarchical.”\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['oop', 'inheritance', 'composition', 'design'],
    estimatedReadMinutes: 8,
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
    category: 'web-dev',
    title: 'REST APIs — Methods, Status Codes, and JSON',
    summary: 'How clients talk to servers: verbs, idempotency, and typical Express + JSON patterns.',
    content:
      '### REST-style APIs\n' +
      'Use **nouns** for resources: `/api/users`, `/api/jobs/:id`.\n\n' +
      '### HTTP methods\n' +
      '- **GET** – read (safe, idempotent)\n' +
      '- **POST** – create\n' +
      '- **PUT/PATCH** – update (PUT often full replace; PATCH partial)\n' +
      '- **DELETE** – remove\n\n' +
      '### JSON\n' +
      'Standard data format between React and Node: `res.json({ success: true, data })`.\n\n' +
      '### CORS\n' +
      'Browsers block cross-origin requests unless the server sends proper **CORS** headers — common when frontend and API run on different ports in dev.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['web dev', 'rest', 'api', 'json', 'express'],
    estimatedReadMinutes: 11,
  },
  {
    category: 'web-dev',
    title: 'React Components, Props, and State (Beginner)',
    summary: 'Functional components, passing data with props, and useState for local UI state.',
    content:
      '### Components\n' +
      'UI built from **reusable pieces**. In React, a component is a function returning JSX.\n\n' +
      '### Props\n' +
      '**Inputs** from parent to child — read-only in the child.\n\n' +
      '### State\n' +
      'Data that changes over time (`useState`). Updates trigger **re-renders**.\n\n' +
      '### Mental model\n' +
      '“Props flow down; events/callbacks flow up.” Practice a small counter and a parent passing a title prop.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['web dev', 'react', 'props', 'state', 'hooks'],
    estimatedReadMinutes: 10,
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
    category: 'ai-ml',
    title: 'Supervised vs Unsupervised Learning',
    summary: 'Labels, classification vs regression, clustering, and when each paradigm applies.',
    content:
      '### Supervised learning\n' +
      'Training data includes **inputs and labels** (correct answers).\n' +
      '- **Classification**: discrete labels (spam/not spam)\n' +
      '- **Regression**: continuous values (house price)\n\n' +
      '### Unsupervised learning\n' +
      'Only **inputs** — find structure (clusters, manifolds).\n' +
      '- Example: **K-means** clustering of customers.\n\n' +
      '### Quick exam tip\n' +
      'If the question mentions “labeled dataset”, think **supervised** first.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['ai', 'ml', 'supervised', 'unsupervised', 'clustering'],
    estimatedReadMinutes: 9,
  },
  {
    category: 'ai-ml',
    title: 'Neural Networks — Perceptron to Deep Learning (High Level)',
    summary: 'Layers, activations, loss, and backprop — without heavy math.',
    content:
      '### Building blocks\n' +
      '- **Neurons** apply weights, add bias, pass through **activation** (ReLU, sigmoid).\n' +
      '- **Layers** stack to form deep networks.\n\n' +
      '### Training\n' +
      '1. Forward pass → prediction\n' +
      '2. **Loss** measures error\n' +
      '3. **Backpropagation** adjusts weights (gradient descent)\n\n' +
      '### Interview one-liner\n' +
      '“A neural network learns by minimizing loss using gradients computed through the chain rule.”\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['ai', 'ml', 'neural networks', 'deep learning'],
    estimatedReadMinutes: 11,
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
    category: 'aptitude',
    title: 'Percentages — Base Shifting and Multipliers',
    summary: 'Fast techniques for % increase/decrease, successive change, and exam-style shortcuts.',
    content:
      '### Core idea\n' +
      'Percent means **per hundred**. Always identify **what is 100%** (the base).\n\n' +
      '### Increase / decrease\n' +
      '- Increase by 20%: multiply by **1.20**\n' +
      '- Decrease by 15%: multiply by **0.85**\n\n' +
      '### Successive changes\n' +
      'Multiply multipliers: +10% then −10% is **1.1 × 0.9 = 0.99** (net −1%).\n\n' +
      'Practice: convert “what percent of A is B?” to **B/A × 100**.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['aptitude', 'percentages', 'shortcuts'],
    estimatedReadMinutes: 8,
  },
  {
    category: 'aptitude',
    title: 'Time and Work — Efficiency and Combined Work',
    summary: 'Unit work method, LCM of days, and pipes & cisterns pattern.',
    content:
      '### Unit work\n' +
      'Assume total work = **1** or **LCM(time periods)** for easy fractions.\n\n' +
      '### Combined rate\n' +
      'If A finishes in 6 days and B in 12 days:\n' +
      '- Rates: 1/6 and 1/12 per day\n' +
      '- Together: 1/6 + 1/12 = 1/4 → **4 days** for full work\n\n' +
      '### Pipes\n' +
      'Same math: inlets add rate, outlets subtract.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['aptitude', 'time and work', 'lcm'],
    estimatedReadMinutes: 9,
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
  {
    category: 'interview-prep',
    title: 'STAR Method for Behavioral Questions',
    summary: 'Situation, Task, Action, Result — structure for “Tell me about a time…” answers.',
    content:
      '### S — Situation\n' +
      'Brief context (team, project, constraint).\n\n' +
      '### T — Task\n' +
      'What you were responsible for.\n\n' +
      '### A — Action\n' +
      'What **you** did (not “we” vaguely — own your contribution).\n\n' +
      '### R — Result\n' +
      'Outcome with **metrics** if possible (latency reduced, bugs cut, users helped).\n\n' +
      'Practice 5 stories: conflict, failure, leadership, tight deadline, learning something new.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['interview', 'star', 'behavioral', 'hr'],
    estimatedReadMinutes: 8,
  },
  {
    category: 'interview-prep',
    title: 'Technical Interview — How to Approach a New Problem',
    summary: 'Clarify, examples, brute force, optimize, code, test — a repeatable loop.',
    content:
      '### Step 1: Clarify\n' +
      'Ask about constraints, input size, edge cases (empty input, duplicates).\n\n' +
      '### Step 2: Work examples\n' +
      'Trace 1–2 small examples on the board.\n\n' +
      '### Step 3: Brute force first\n' +
      'State time/space complexity honestly.\n\n' +
      '### Step 4: Optimize\n' +
      'Use patterns: hashing, two pointers, binary search, DP — match to problem.\n\n' +
      '### Step 5: Code & test\n' +
      'Clean variable names, dry run with an example.\n\n' +
      'Communicate **while** thinking — interviewers evaluate process, not only the answer.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['interview', 'dsa', 'problem solving', 'communication'],
    estimatedReadMinutes: 10,
  },

  // --- Extra dummy articles per subject (unique titles for seed upsert by slug) ---
  {
    category: 'dbms',
    title: 'Indexes and Query Performance (Dummy Notes)',
    summary:
      'B-tree indexes, when they help, and simple interview points on slow queries.',
    content:
      '### Why indexes?\n' +
      'Indexes help the DBMS **find rows faster** without scanning every row.\n\n' +
      '### B-tree idea\n' +
      'Most relational DBs use **B-tree (or B+ tree)** indexes for equality and range queries on indexed columns.\n\n' +
      '### Trade-offs\n' +
      '- **Faster SELECT** on indexed predicates\n' +
      '- **Slower INSERT/UPDATE/DELETE** (index must be maintained)\n\n' +
      '### Dummy tip\n' +
      'Mention **EXPLAIN** / query plans when discussing optimization in interviews.\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['dbms', 'indexes', 'performance'],
    estimatedReadMinutes: 7,
  },
  {
    category: 'dbms',
    title: 'Transactions and Isolation Levels (Dummy Crash Course)',
    summary: 'ACID recap, read phenomena, and naming common isolation levels.',
    content:
      '### Transaction\n' +
      'A **unit of work** that should commit or roll back as a whole.\n\n' +
      '### Phenomena\n' +
      '- Dirty read, non-repeatable read, phantom read — know the names at high level.\n\n' +
      '### Isolation levels\n' +
      'From weaker to stronger: **Read Uncommitted → Read Committed → Repeatable Read → Serializable**.\n\n' +
      'This block is **sample content** for demos; extend with your class notes.\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['dbms', 'transactions', 'acid'],
    estimatedReadMinutes: 8,
  },

  {
    category: 'os',
    title: 'Memory Management — Paging vs Segmentation (Dummy)',
    summary: 'Virtual memory, pages, and why OS uses translation tables.',
    content:
      '### Virtual memory\n' +
      'Gives each process a **large address space** while physical RAM is limited.\n\n' +
      '### Paging\n' +
      'Fixed-size **pages** mapped via page tables; reduces external fragmentation.\n\n' +
      '### Segmentation\n' +
      'Variable-size **segments** (code, data, stack); can cause fragmentation.\n\n' +
      '### Interview line\n' +
      '“Paging is common in modern OS; segmentation appears in older or hybrid designs.”\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['os', 'memory', 'paging'],
    estimatedReadMinutes: 9,
  },
  {
    category: 'os',
    title: 'CPU Scheduling Algorithms — Dummy Revision Sheet',
    summary: 'FCFS, SJF, Round Robin, and what to say about starvation.',
    content:
      '- **FCFS**: simple, can convoy long jobs.\n' +
      '- **SJF**: optimal avg wait time in theory; needs burst estimates.\n' +
      '- **Round Robin**: time quantum; good for interactive systems.\n\n' +
      'Mention **starvation** and how **priority aging** can mitigate it.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['os', 'scheduling', 'cpu'],
    estimatedReadMinutes: 8,
  },

  {
    category: 'cn',
    title: 'DNS Resolution Steps — Dummy Walkthrough',
    summary: 'Recursive vs iterative queries and the role of resolver and TLD servers.',
    content:
      '### Goal\n' +
      'Turn a **hostname** (example.com) into an **IP address**.\n\n' +
      '### High-level steps\n' +
      '1. Stub resolver → recursive resolver\n' +
      '2. Root hints → **TLD** server → **authoritative** server\n\n' +
      '### Caching\n' +
      'TTL reduces repeated lookups — good for performance.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['cn', 'dns', 'networking'],
    estimatedReadMinutes: 7,
  },
  {
    category: 'cn',
    title: 'IP Addressing — IPv4 Subnets Dummy Examples',
    summary: 'CIDR notation and a tiny example of network vs broadcast address.',
    content:
      '### IPv4\n' +
      '32-bit addresses; often written in dotted decimal.\n\n' +
      '### CIDR\n' +
      '`/24` means 24 bits for network prefix — remaining for hosts.\n\n' +
      '### Example (conceptual)\n' +
      'Practice identifying **network address**, **broadcast**, and usable host range on paper.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['cn', 'ipv4', 'subnet'],
    estimatedReadMinutes: 8,
  },

  {
    category: 'dsa',
    title: 'Stacks and Queues — Dummy Interview Patterns',
    summary: 'LIFO vs FIFO, array vs linked implementation, and classic problems.',
    content:
      '### Stack\n' +
      '**LIFO** — push/pop at one end; used for DFS, parentheses matching, undo.\n\n' +
      '### Queue\n' +
      '**FIFO** — enqueue at rear, dequeue at front; used for BFS, scheduling.\n\n' +
      '### Problems\n' +
      '- Valid parentheses\n' +
      '- Next greater element (stack)\n' +
      '- Sliding window max (deque)\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'stack', 'queue'],
    estimatedReadMinutes: 10,
  },
  {
    category: 'dsa',
    title: 'Binary Trees and BST — Dummy Basics',
    summary: 'Traversals, height vs depth, and BST search order property.',
    content:
      '### Tree terms\n' +
      'Root, parent, child, leaf, height, depth.\n\n' +
      '### Traversals\n' +
      'Inorder, preorder, postorder — know **inorder on BST gives sorted order**.\n\n' +
      '### BST\n' +
      'Left subtree keys < node < right subtree keys (typical definition).\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'trees', 'bst'],
    estimatedReadMinutes: 11,
  },
  {
    category: 'dsa',
    title: 'Hash Tables — Dummy Complexity Cheatsheet',
    summary: 'Average O(1) map operations, collisions, and load factor.',
    content:
      '### Idea\n' +
      'Map **keys** to **buckets** via a **hash function**.\n\n' +
      '### Collisions\n' +
      'Chaining or open addressing — both are fair interview topics.\n\n' +
      '### Complexity\n' +
      'Average **O(1)** search/insert/delete; worst case can degrade if many collisions.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['dsa', 'hashing', 'complexity'],
    estimatedReadMinutes: 8,
  },

  {
    category: 'oop',
    title: 'Abstract Class vs Interface — Dummy Comparison',
    summary: 'When Java/C#-style interviews ask for differences and use cases.',
    content:
      '### Abstract class\n' +
      'Can have **state** (fields), constructors, mix abstract and concrete methods.\n\n' +
      '### Interface\n' +
      'Often models **capability**; in modern Java can have default methods.\n\n' +
      '### One line\n' +
      '“Use abstract class for **shared implementation**; interface for **contracts** across unrelated types.”\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['oop', 'abstract', 'interface'],
    estimatedReadMinutes: 7,
  },
  {
    category: 'oop',
    title: 'Singleton and Factory Patterns — Dummy Overview',
    summary: 'Two common patterns interviewers name-check; keep definitions short.',
    content:
      '### Singleton\n' +
      'Ensure **one instance** (e.g. config, logger). Watch global state and testing.\n\n' +
      '### Factory\n' +
      'Centralize **object creation** so callers depend on abstractions.\n\n' +
      'Expand with your language of choice (Java, C#, TypeScript).\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['oop', 'patterns', 'singleton'],
    estimatedReadMinutes: 8,
  },

  {
    category: 'web-dev',
    title: 'HTML Semantics and Accessibility — Dummy Checklist',
    summary: 'Headings, landmarks, and why buttons are not divs.',
    content:
      '### Semantic tags\n' +
      'Use `header`, `nav`, `main`, `article`, `footer` where appropriate.\n\n' +
      '### A11y\n' +
      'Keyboard focus, labels for inputs, sufficient contrast.\n\n' +
      '### Dummy rule\n' +
      'If it navigates like a button, use `<button>` — better than `<div onclick>`.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['web dev', 'html', 'a11y'],
    estimatedReadMinutes: 9,
  },
  {
    category: 'web-dev',
    title: 'CSS Flexbox — Dummy Layout Recipes',
    summary: 'flex-direction, justify-content, align-items in one page.',
    content:
      '### Container\n' +
      '`display: flex` on parent.\n\n' +
      '### Main vs cross axis\n' +
      'Control with **justify-content** (main) and **align-items** (cross).\n\n' +
      '### Grow/shrink\n' +
      '`flex: 1` is a common shortcut for flexible columns.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['web dev', 'css', 'flexbox'],
    estimatedReadMinutes: 8,
  },
  {
    category: 'web-dev',
    title: 'Express Middleware and Error Handling — Dummy Template',
    summary: 'next(), order of registration, and centralized error middleware.',
    content:
      '### Middleware\n' +
      'Functions with `(req, res, next)` — run in **registration order**.\n\n' +
      '### Errors\n' +
      'Pass errors with `next(err)` and handle in a **four-arg** error handler.\n\n' +
      '### CORS + JSON\n' +
      'Often applied early in the chain for APIs.\n',
    level: 'intermediate',
    materialType: 'article',
    tags: ['web dev', 'express', 'node'],
    estimatedReadMinutes: 9,
  },

  {
    category: 'ai-ml',
    title: 'Train Validation Test Split — Dummy Best Practices',
    summary: 'Why we hold out data and what leakage means.',
    content:
      '### Splits\n' +
      '**Train** to fit, **validation** to tune, **test** for final estimate.\n\n' +
      '### Leakage\n' +
      'Never let test statistics influence preprocessing choices inappropriately.\n\n' +
      '### Dummy ratio\n' +
      'Common starting point: 70/15/15 or 80/10/10 depending on dataset size.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['ai', 'ml', 'evaluation'],
    estimatedReadMinutes: 7,
  },
  {
    category: 'ai-ml',
    title: 'Precision Recall and F1 — Dummy Definitions',
    summary: 'Confusion matrix basics for classification interviews.',
    content:
      '### Precision\n' +
      'Of predicted positives, how many were **actually** positive?\n\n' +
      '### Recall\n' +
      'Of actual positives, how many did we **catch**?\n\n' +
      '### F1\n' +
      'Harmonic mean of precision and recall — balances both.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['ai', 'ml', 'metrics'],
    estimatedReadMinutes: 8,
  },

  {
    category: 'aptitude',
    title: 'Ratios and Proportions — Dummy Drill',
    summary: 'Combining ratios, duplicate ratios, and unit consistency.',
    content:
      '### Combine ratios\n' +
      'Align terms: if `a:b = 2:3` and `b:c = 4:5`, make **b** match.\n\n' +
      '### Duplicate ratio\n' +
      'If `a:b = 2:3`, then `2a:3b` is not automatically `2:3` — be careful.\n\n' +
      'Practice 10 mixed problems under a timer.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['aptitude', 'ratio', 'proportions'],
    estimatedReadMinutes: 8,
  },
  {
    category: 'aptitude',
    title: 'Probability Basics — Dummy Coin and Dice',
    summary: 'Independent events, AND vs OR, complementary probability.',
    content:
      '### Independent events\n' +
      '`P(A and B) = P(A)P(B)` when independent.\n\n' +
      '### Complement\n' +
      '`P(not A) = 1 - P(A)` — often simplifies “at least one” problems.\n\n' +
      '### Dice/coins\n' +
      'Enumerate or multiply probabilities for fair experiments.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['aptitude', 'probability'],
    estimatedReadMinutes: 9,
  },

  {
    category: 'interview-prep',
    title: 'Elevator Pitch for Campus Placements — Dummy Script',
    summary: 'A 30-second template: who you are, stack, and one project hook.',
    content:
      '### Structure\n' +
      '1. Name + degree + branch\n' +
      '2. **Tech stack** you are strong in\n' +
      '3. **One project** with outcome (metric if possible)\n\n' +
      '### Practice\n' +
      'Record yourself; aim for **clear and calm**, not rushed.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['interview', 'communication', 'pitch'],
    estimatedReadMinutes: 6,
  },
  {
    category: 'interview-prep',
    title: 'Resume Bullets — Action Verbs Dummy Examples',
    summary: 'STAR in one line per bullet; avoid vague “worked on”.',
    content:
      '### Strong verbs\n' +
      'Implemented, optimized, reduced, automated, led, collaborated.\n\n' +
      '### Quantify\n' +
      'Latency **↓30%**, tests **+50**, users **2k** — numbers stand out.\n\n' +
      'Replace “responsible for” with **what you did** and **what changed**.\n',
    level: 'beginner',
    materialType: 'article',
    tags: ['interview', 'resume', 'writing'],
    estimatedReadMinutes: 7,
  },

  // --- Mixed types (video / pdf / link) + advanced levels — for filters & “open resource” UI ---
  {
    category: 'dsa',
    title: 'Video — Binary Search Pattern (Curated tutorial)',
    summary: 'External video walkthrough for binary search on sorted arrays.',
    content:
      'Watch the linked video, then implement:\n\n' +
      '1. Classic binary search index\n' +
      '2. First/last position of a target\n\n' +
      'Mention time complexity **O(log n)** and that input must be **sorted**.',
    materialType: 'video',
    resourceUrl: 'https://www.youtube.com/watch?v=GU7DpgHINWQ',
    level: 'beginner',
    tags: ['dsa', 'video', 'binary search'],
    estimatedReadMinutes: 18,
  },
  {
    category: 'web-dev',
    title: 'Video — React Docs: Describing the UI',
    summary: 'Official React documentation overview (curated link for learning hub testing).',
    content:
      'Follow the official docs section on describing UI with components.\n\n' +
      'After watching, recreate a tiny component tree: `App` → `Header` → `Title`.\n',
    materialType: 'video',
    resourceUrl: 'https://www.youtube.com/watch?v=SqcY0GlETPk',
    level: 'beginner',
    tags: ['web dev', 'video', 'react'],
    estimatedReadMinutes: 20,
  },
  {
    category: 'ai-ml',
    title: 'Video — 3Blue1Brown Neural Networks Chapter 1',
    summary: 'Visual introduction to neural networks (external playlist).',
    content:
      'Use this as motivation before diving into loss functions and gradients in your coursework.\n',
    materialType: 'video',
    resourceUrl: 'https://www.youtube.com/watch?v=aircAruvnKk',
    level: 'beginner',
    tags: ['ai', 'ml', 'video', 'neural networks'],
    estimatedReadMinutes: 25,
  },
  {
    category: 'dbms',
    title: 'PDF — Sample SQL Reference Sheet',
    summary: 'Public sample PDF to exercise the PDF material type in the app.',
    content:
      'Download or open the PDF from the resource link.\n\n' +
      'In a real deployment you would upload your own files to cloud storage and paste that URL here.\n',
    materialType: 'pdf',
    resourceUrl:
      'https://www.w3.org/WAI/WCAG21/working-examples/pdf-note/note.pdf',
    level: 'beginner',
    tags: ['dbms', 'pdf', 'sql'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'oop',
    title: 'PDF — Sample Two-Page PDF (Demo Asset)',
    summary: 'Second sample PDF for testing downloads and previews.',
    content:
      'Open the resource URL in a new tab. Use this card to verify **PDF** appears in type filters.\n',
    materialType: 'pdf',
    resourceUrl: 'https://www.africau.edu/images/default/sample.pdf',
    level: 'intermediate',
    tags: ['oop', 'pdf', 'patterns'],
    estimatedReadMinutes: 10,
  },
  {
    category: 'cn',
    title: 'Link — MDN HTTP Overview',
    summary: 'Official MDN documentation for HTTP (link-type material).',
    content:
      'Read the overview of how HTTP requests and responses work.\n\n' +
      'Come back and summarize: **method**, **status code**, **headers**, **body** in your own words.\n',
    materialType: 'link',
    resourceUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview',
    level: 'beginner',
    tags: ['cn', 'link', 'http'],
    estimatedReadMinutes: 15,
  },
  {
    category: 'web-dev',
    title: 'Link — MDN JavaScript Guide',
    summary: 'Bookmark the JS language guide for deep reference.',
    content:
      'Use this link while building small frontend tasks. Pair with your React materials.\n',
    materialType: 'link',
    resourceUrl: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide',
    level: 'beginner',
    tags: ['web dev', 'link', 'javascript'],
    estimatedReadMinutes: 20,
  },
  {
    category: 'aptitude',
    title: 'Link — Puzzles and reasoning practice (sample)',
    summary:
      'In-app puzzle and reasoning patterns; GeeksforGeeks link for additional timed question banks.',
    content:
      '### Puzzle mindset\n' +
      '- Read twice; extract **givens** vs **unknowns** before algebra.\n' +
      '- Try **small cases** or work backward from answer choices when allowed.\n\n' +
      '### Common reasoning types\n' +
      '- **Arrangements** (linear/circular), **ranking**, **constraints** (if A left of B, …).\n' +
      '- **Number/symbol coding**, **analogies**, **odd one out**.\n\n' +
      '### Timed practice\n' +
      '- Cap each question (e.g. 90s) to build exam reflex; log errors by **topic**, not by question id.\n\n' +
      '### Further practice\n' +
      'Use the GeeksforGeeks aptitude Q&A collection for extra volume after this revision.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/aptitude-questions-and-answers/',
    level: 'intermediate',
    tags: ['aptitude', 'reasoning', 'geeksforgeeks', 'revision'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'interview-prep',
    title: 'PDF — Interview Checklist One-Pager (Demo)',
    summary: 'Printable-style checklist; uses public sample PDF.',
    content:
      'Use this to verify **PDF** filtering and open-in-new-tab from the material detail page.\n',
    materialType: 'pdf',
    resourceUrl: 'https://www.w3.org/WAI/WCAG21/working-examples/pdf-note/note.pdf',
    level: 'beginner',
    tags: ['interview', 'pdf', 'checklist'],
    estimatedReadMinutes: 8,
  },
  {
    category: 'dsa',
    title: 'Advanced — Graphs BFS DFS and Shortest Path',
    summary: 'Adjacency list representation, BFS/DFS, and Dijkstra at a high level.',
    content:
      '### Representations\n' +
      '- **Adjacency list** is standard for sparse graphs in interviews.\n\n' +
      '### Traversals\n' +
      '- **BFS** uses a queue; finds shortest path in **unweighted** graphs.\n' +
      '- **DFS** uses recursion/stack; good for connectivity and cycles.\n\n' +
      '### Weighted shortest path\n' +
      '**Dijkstra** (non-negative edges); mention **priority queue** implementation.\n\n' +
      '### Practice\n' +
      'Number of islands, rotten oranges, word ladder — classic graph BFS patterns.\n',
    level: 'advanced',
    materialType: 'article',
    tags: ['dsa', 'graphs', 'bfs', 'dfs', 'dijkstra'],
    estimatedReadMinutes: 22,
  },
  {
    category: 'os',
    title: 'Advanced — Virtual Memory and Page Replacement',
    summary: 'FIFO, LRU, OPT (theoretical), and thrashing concepts.',
    content:
      '### Virtual memory\n' +
      'Illusion of large address space; backing store on disk.\n\n' +
      '### Page faults\n' +
      'Major vs minor; impact on runtime.\n\n' +
      '### Replacement policies\n' +
      '- FIFO — simple, can suffer Belady’s anomaly\n' +
      '- LRU — good locality; implement with stack or timestamp\n\n' +
      '### Thrashing\n' +
      'Too little physical memory → constant paging; needs frame allocation tuning.\n',
    level: 'advanced',
    materialType: 'article',
    tags: ['os', 'virtual memory', 'paging'],
    estimatedReadMinutes: 18,
  },
  {
    category: 'dbms',
    title: 'Advanced — Query Optimization and Explain Plans',
    summary: 'Selectivity, indexes, and reading execution plans in interviews.',
    content:
      '### Selectivity\n' +
      'Highly selective predicates benefit most from indexes.\n\n' +
      '### Plans\n' +
      'Understand **sequential scan vs index scan** at a high level.\n\n' +
      '### Interview tip\n' +
      'Narrow rows early (filters), avoid `SELECT *` in huge tables when discussing design.\n',
    level: 'advanced',
    materialType: 'article',
    tags: ['dbms', 'optimization', 'indexes'],
    estimatedReadMinutes: 14,
  },

  // --- GeeksforGeeks-aligned topic hubs: full in-app notes + optional GFG “further reading” ---
  {
    category: 'dbms',
    title: 'GeeksforGeeks — DBMS tutorial and notes hub',
    summary:
      'In-app revision: relational model, SQL, keys, normalization, transactions, and indexes — plus optional GFG deep dives.',
    content:
      '### Relational model (quick)\n' +
      '- **Relation** = table; **tuple** = row; **attribute** = column.\n' +
      '- **Schema** describes structure; **instance** is data at a moment in time.\n\n' +
      '### Keys\n' +
      '- **Primary key** uniquely identifies a row.\n' +
      '- **Foreign key** references another table’s primary key and enforces **referential integrity**.\n' +
      '- **Candidate / superkey** concepts: minimal sets that uniquely identify rows.\n\n' +
      '### SQL you should be able to explain\n' +
      '- `SELECT`, `WHERE`, `JOIN` (inner vs left), `GROUP BY`, `HAVING`, `ORDER BY`.\n' +
      '- Aggregates: `COUNT`, `SUM`, `AVG` with grouping rules.\n\n' +
      '### Normalization (interview pitch)\n' +
      '- **1NF**: atomic columns, no repeating groups.\n' +
      '- **2NF**: no partial dependency on part of a composite key.\n' +
      '- **3NF**: no transitive dependency (non-key → non-key).\n\n' +
      '### Transactions and ACID\n' +
      '- **Atomicity**: all operations commit or none.\n' +
      '- **Consistency**: valid constraints before and after.\n' +
      '- **Isolation**: concurrent transactions don’t see inconsistent intermediate states (levels: read committed, repeatable read, serializable).\n' +
      '- **Durability**: committed data survives crashes.\n\n' +
      '### Indexing (high level)\n' +
      '- **B-tree/B+ tree** indexes speed lookups and range queries on indexed columns.\n' +
      '- Trade-off: faster reads, slower writes, storage overhead.\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks maintains topic-wise DBMS articles and quizzes — use the resource link when you want extra problems and diagrams.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/dbms/',
    level: 'beginner',
    tags: ['dbms', 'geeksforgeeks', 'reference', 'revision'],
    estimatedReadMinutes: 16,
  },
  {
    category: 'os',
    title: 'GeeksforGeeks — Operating systems hub',
    summary:
      'In-app OS revision: processes, threads, scheduling, deadlocks, memory — aligned with common GFG syllabi.',
    content:
      '### Process vs thread\n' +
      '- **Process**: program in execution; own address space and resources.\n' +
      '- **Thread**: unit of execution inside a process; shares code/heap, has own stack and registers.\n' +
      '- **Context switch** is heavier for processes than threads.\n\n' +
      '### CPU scheduling (names to know)\n' +
      '- **FCFS**, **SJF** (optimal avg wait but needs burst length), **Round Robin** (time quantum), **Priority** (starvation → aging).\n' +
      '- **Throughput** vs **response time**: interactive systems prefer low latency.\n\n' +
      '### Deadlock\n' +
      '- Four Coffman conditions: mutual exclusion, hold and wait, no preemption, circular wait.\n' +
      '- **Prevention**: break a condition (e.g. ordered locks).\n' +
      '- **Avoidance**: Banker’s algorithm when max needs known.\n' +
      '- **Detection**: resource allocation graph / wait-for graph.\n\n' +
      '### Memory\n' +
      '- **Paging**: fixed-size frames; **segmentation**: variable logical units.\n' +
      '- **Virtual memory**: logical address space larger than RAM; page faults load from disk.\n' +
      '- **TLB** caches page table entries for speed.\n\n' +
      '### Further reading\n' +
      'Use the GeeksforGeeks OS section for extra MCQs and diagrams after you finish this revision block.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/operating-systems/',
    level: 'beginner',
    tags: ['os', 'geeksforgeeks', 'reference', 'revision'],
    estimatedReadMinutes: 15,
  },
  {
    category: 'cn',
    title: 'GeeksforGeeks — Computer networks hub',
    summary:
      'In-app CN notes: OSI vs TCP/IP, addressing, TCP/UDP, HTTP — with GFG as optional extra practice.',
    content:
      '### Layered models\n' +
      '- **OSI** (7): Physical → Data Link → Network → Transport → Session → Presentation → Application.\n' +
      '- **TCP/IP** (4): Link, Internet, Transport, Application — what most courses emphasize.\n\n' +
      '### Addressing\n' +
      '- **MAC**: hop-by-hop on LAN.\n' +
      '- **IP**: host identity; **subnet mask** defines network vs host bits.\n' +
      '- **Port** identifies application endpoint on a host.\n\n' +
      '### TCP vs UDP\n' +
      '- **TCP**: connection-oriented, reliable, ordered, congestion control — web, email, file transfer.\n' +
      '- **UDP**: connectionless, low overhead, best-effort — DNS (often), VoIP, games.\n\n' +
      '### HTTP/HTTPS\n' +
      '- **HTTP**: stateless request/response; methods GET, POST, PUT, PATCH, DELETE; status codes 2xx/4xx/5xx.\n' +
      '- **HTTPS**: HTTP over **TLS** (encryption + integrity + server authentication).\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks CN tutorials are useful for protocol details and GATE-style questions.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/computer-network-tutorials/',
    level: 'beginner',
    tags: ['cn', 'geeksforgeeks', 'reference', 'revision'],
    estimatedReadMinutes: 14,
  },
  {
    category: 'dsa',
    title: 'GeeksforGeeks — Data structures hub',
    summary:
      'In-app data-structure map: arrays through graphs — typical GFG topic order for placement prep.',
    content:
      '### Linear structures\n' +
      '- **Array**: O(1) index access; insert/delete middle O(n).\n' +
      '- **Linked list**: O(1) insert at known node; no random access.\n' +
      '- **Stack** (LIFO): DFS, parentheses, monotonic stack patterns.\n' +
      '- **Queue** (FIFO): BFS, sliding window with deque.\n\n' +
      '### Trees\n' +
      '- **BST**: inorder gives sorted order; watch skew → O(n) height.\n' +
      '- **Heap** (min/max): arrays; `push/pop` in O(log n); heapsort, priority queues.\n\n' +
      '### Hashing\n' +
      '- Average O(1) lookup; handle collisions (chaining, open addressing).\n\n' +
      '### Graphs\n' +
      '- **Adjacency list** for sparse graphs (interviews).\n' +
      '- **BFS** shortest path in unweighted graphs; **DFS** for cycles, components, topo sort.\n\n' +
      '### Patterns (names recruiters use)\n' +
      'Two pointers, sliding window, prefix sums, bitmask DP (advanced), union-find.\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks lists problems by data structure — use the link for extra drills after our in-app tracks.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/data-structures/',
    level: 'beginner',
    tags: ['dsa', 'geeksforgeeks', 'reference', 'revision'],
    estimatedReadMinutes: 14,
  },
  {
    category: 'dsa',
    title: 'GeeksforGeeks — Algorithms practice hub',
    summary:
      'In-app algorithm revision: complexity, sorting, searching, greedy, DP, backtracking — GFG for more problems.',
    content:
      '### Complexity\n' +
      '- **Big-O**: worst-case growth; know **O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)**.\n' +
      '- Recurrence intuition: master theorem for divide-and-conquer.\n\n' +
      '### Sorting\n' +
      '- **Bubble/selection**: O(n²) — simple, rarely optimal.\n' +
      '- **Merge sort**: O(n log n) stable; **quick sort** average O(n log n), worst O(n²).\n' +
      '- **Counting/radix**: linear when constraints fit.\n\n' +
      '### Searching\n' +
      '- **Binary search** on sorted array O(log n); also on answer space (minimize/maximize).\n\n' +
      '### Paradigms\n' +
      '- **Greedy**: local optimal; prove exchange argument or stay careful of counterexamples.\n' +
      '- **DP**: optimal substructure + overlapping subproblems; top-down vs bottom-up.\n' +
      '- **Backtracking**: explore tree of choices; prune when constraints fail.\n\n' +
      '### Further reading\n' +
      'GFG’s algorithm fundamentals page indexes classic problems — pair 2–3 timed problems per topic after this read-through.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/fundamentals-of-algorithms/',
    level: 'intermediate',
    tags: ['dsa', 'algorithms', 'geeksforgeeks', 'revision'],
    estimatedReadMinutes: 15,
  },
  {
    category: 'oop',
    title: 'GeeksforGeeks — OOP concepts hub',
    summary:
      'In-app OOP pillars and design vocabulary — matches typical GeeksforGeeks Java/C++ explainers.',
    content:
      '### Four pillars\n' +
      '- **Encapsulation**: hide state behind methods; expose a clear interface.\n' +
      '- **Abstraction**: model essentials; hide implementation details.\n' +
      '- **Inheritance**: reuse and specialize behavior; avoid deep fragile hierarchies.\n' +
      '- **Polymorphism**: same interface, different implementations — compile-time (overloading) vs runtime (overriding).\n\n' +
      '### Class vs object\n' +
      '- **Class** is blueprint; **object** is instance with concrete state.\n\n' +
      '### Relationships\n' +
      '- **IS-A** → inheritance; **HAS-A** → composition (often preferred over inheritance for flexibility).\n\n' +
      '### SOLID (one-liners)\n' +
      '- **S**ingle responsibility — one reason to change.\n' +
      '- **O**pen/closed — extend without modifying core.\n' +
      '- **L**iskov substitution — subclasses honor contracts.\n' +
      '- **I**nterface segregation — small focused interfaces.\n' +
      '- **D**ependency inversion — depend on abstractions.\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks has language-specific OOP articles; use the link when you need syntax-level examples.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/object-oriented-programming-oops-concept-in-java/',
    level: 'beginner',
    tags: ['oop', 'geeksforgeeks', 'reference', 'revision'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'web-dev',
    title: 'GeeksforGeeks — Web technologies hub',
    summary:
      'In-app web stack primer: HTML semantics, CSS layout, JS runtime — complements GFG HTML/CSS/JS tracks.',
    content:
      '### HTML\n' +
      '- Use **semantic** tags: `header`, `nav`, `main`, `article`, `section`, `footer` for structure and accessibility.\n' +
      '- Forms: `input` types, validation attributes, `label` association.\n\n' +
      '### CSS\n' +
      '- **Box model**: content, padding, border, margin; `box-sizing: border-box` is common.\n' +
      '- **Flexbox** for one-dimensional layouts; **Grid** for two-dimensional layouts.\n' +
      '- **Media queries** for responsive breakpoints.\n\n' +
      '### JavaScript (browser)\n' +
      '- **DOM** manipulation and events (bubbling/capturing).\n' +
      '- **Async**: callbacks, Promises, `async/await`; single-threaded with event loop.\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks HTML/CSS/JS sections add more examples; use after this overview.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/html/',
    level: 'beginner',
    tags: ['web dev', 'geeksforgeeks', 'reference', 'revision'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'ai-ml',
    title: 'GeeksforGeeks — Machine learning hub',
    summary:
      'In-app ML vocabulary: learning types, features, metrics, overfitting — aligned with GFG ML intros.',
    content:
      '### Learning paradigms\n' +
      '- **Supervised**: labeled data — regression (continuous) vs classification (discrete).\n' +
      '- **Unsupervised**: clusters, structure (e.g. k-means, PCA at high level).\n' +
      '- **Reinforcement**: agent, actions, rewards (mention only if asked).\n\n' +
      '### Data split\n' +
      '- **Train / validation / test** — tune on val, report on held-out test.\n\n' +
      '### Common metrics\n' +
      '- Classification: **accuracy** (imbalanced caveat), **precision**, **recall**, **F1**, ROC-AUC intuition.\n' +
      '- Regression: **MAE**, **MSE**, **R²**.\n\n' +
      '### Overfitting vs underfitting\n' +
      '- **Underfit**: model too simple; high bias.\n' +
      '- **Overfit**: memorizes noise; high variance — regularization, more data, simpler model, dropout (NNs).\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks ML hub expands with algorithms; use the link when you need step-by-step math-heavy articles.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/machine-learning/',
    level: 'beginner',
    tags: ['ai', 'ml', 'geeksforgeeks', 'revision'],
    estimatedReadMinutes: 12,
  },
  {
    category: 'aptitude',
    title: 'GeeksforGeeks — Aptitude preparation hub',
    summary:
      'Quant and logical reasoning basics, data interpretation, and timed practice tips.',
    content:
      '### Quant building blocks\n' +
      '- **Percentages**, **ratios**, **proportions**, **profit/loss**, **SI/CI**, **time-speed-distance**, **time-work**, **permutations/combinations** basics.\n\n' +
      '### Logical reasoning\n' +
      '- **Coding–decoding**, **blood relations**, **direction sense**, **syllogisms**, **series**.\n\n' +
      '### Data interpretation\n' +
      '- Read charts/tables quickly; approximate when options are far apart.\n\n' +
      '### How to practice\n' +
      '- **Timed** sets daily; review mistakes in a short error log (concept + fix).\n' +
      '- Balance speed vs accuracy; avoid wild guessing if negative marking exists.\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks aptitude archives add large problem sets — use the link after you finish our core formula notes.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/aptitude-preparation-gq/',
    level: 'beginner',
    tags: ['aptitude', 'geeksforgeeks', 'revision'],
    estimatedReadMinutes: 11,
  },
  {
    category: 'interview-prep',
    title: 'GeeksforGeeks — Interview preparation hub',
    summary:
      'In-app placement roadmap: resume, DSA, CS fundamentals, HR — with GFG for company-wise articles.',
    content:
      '### Typical product-company flow\n' +
      '- **Online assessment** → **technical rounds** (DSA/system design for seniors) → **HR/behavioral**.\n\n' +
      '### What to front-load\n' +
      '- **DSA**: arrays, strings, trees, graphs, DP — consistent daily practice beats cramming.\n' +
      '- **CS fundamentals**: DBMS, OS, CN, OOP — short notes you can explain in 2 minutes each.\n\n' +
      '### Resume and stories\n' +
      '- **STAR** for projects and conflicts; metrics where possible.\n' +
      '- One **strong project** you can demo and debug live.\n\n' +
      '### Behavioral\n' +
      '- Why this company, teamwork, failure, leadership — honest, specific answers.\n\n' +
      '### Further reading\n' +
      'GeeksforGeeks publishes interview experiences and company guides — browse the link for patterns, not as a substitute for your own mock interviews.\n',
    materialType: 'article',
    resourceUrl: 'https://www.geeksforgeeks.org/interview-preparation-for-product-based-companies/',
    level: 'beginner',
    tags: ['interview', 'geeksforgeeks', 'revision'],
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
        console.warn(
          `Skipping material "${item.title}" — no LearningCategory with slug "${item.category}". Run: npm run seed:subjects`
        );
        continue;
      }

      await StudyMaterial.findOneAndUpdate(
        { slug: slugify(item.title) },
        {
          title: item.title,
          slug: slugify(item.title),
          summary: item.summary,
          content: item.content,
          materialType: item.materialType || 'article',
          resourceUrl: item.resourceUrl || '',
          level: item.level || 'beginner',
          tags: item.tags,
          estimatedReadMinutes: item.estimatedReadMinutes,
          category: category._id,
          createdBy: contentAdmin._id,
          isPublished: true,
          audience: 'global',
          targetCourse: '',
          targetBranch: '',
          targetYear: '',
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

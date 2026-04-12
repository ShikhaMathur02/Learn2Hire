require('dotenv').config();

const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const jobRoutes = require('./routes/jobRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const learningRoutes = require('./routes/learningRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const { ensureBuiltinAdmins } = require('./seed/ensureBuiltinAdmins');
const { isSmtpConfigured } = require('./utils/otpDelivery');

const app = express();
const PORT = process.env.PORT || 5000;

// JSON APIs should not use ETag/304 — browsers cache empty 304 bodies and fetch() treats 304 as !ok.
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

// Parse JSON body (required for signup/login, profile, assessment, submission APIs)
app.use(express.json());

app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    setHeaders(res, filePath) {
      if (String(filePath).toLowerCase().includes('avatars')) {
        res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      }
    },
  })
);

// Auth routes: signup & login
app.use('/api/auth', authRoutes);
// Student profile routes (protected)
app.use('/api/profile', profileRoutes);
// Assessment routes (protected)
app.use('/api/assessments', assessmentRoutes);
// Submission routes (protected)
app.use('/api/submissions', submissionRoutes);
// Job routes (protected)
app.use('/api/jobs', jobRoutes);
// Admin routes (protected)
app.use('/api/admin', adminRoutes);
// Notification routes (protected)
app.use('/api/notifications', notificationRoutes);
// Learning routes (public + protected manage routes)
app.use('/api/learning', learningRoutes);
// Subject master data routes (protected)
app.use('/api/subjects', subjectRoutes);
// College: roster, faculty approvals (protected)
app.use('/api/college', collegeRoutes);

// Simple route: when someone visits http://localhost:5000 they see this
app.get('/', (req, res) => {
  res.send('Hello from Learn2Hire!');
});

// API route: returns JSON (frontend or tools can call this later)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Learn2Hire API is running' });
});

// Start server only after MongoDB is connected
const start = async () => {
  await connectDB();
  await ensureBuiltinAdmins();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    if (isSmtpConfigured()) {
      const host = process.env.SMTP_HOST || process.env.SMTP_SERVICE || 'service';
      console.log(
        `[Learn2Hire] SMTP configured (${host}) — signup and password-reset OTP emails will be sent.`
      );
    } else {
      console.warn(
        '[Learn2Hire] SMTP not configured. Copy backend/.env.example → backend/.env, set SMTP_HOST (or SMTP_SERVICE), SMTP_USER, SMTP_PASS, restart this server. ' +
          'Without that, signup OTP returns HTTP 503 unless OTP_ECHO_TO_CLIENT=true (local dev only).'
      );
    }
    if (String(process.env.OTP_ECHO_TO_CLIENT || '').toLowerCase() === 'true') {
      console.log(
        '[Learn2Hire] OTP_ECHO_TO_CLIENT=true — OTP codes are included in API JSON (local dev; disable in production).'
      );
    }
  });
};

start();

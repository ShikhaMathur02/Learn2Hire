const path = require('path');
// Always load backend/.env (not cwd) so SMTP and Mongo work when the server is started from another folder.
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { getJwtSecret } = require('./config/secrets');
const { validateProductionEnv } = require('./config/validateProductionEnv');
const logger = require('./utils/logger');
try {
  getJwtSecret();
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
validateProductionEnv();

const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
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
const landingRoutes = require('./routes/landingRoutes');
const { ensureBuiltinAdmins } = require('./seed/ensureBuiltinAdmins');
const { isSmtpConfigured } = require('./utils/otpDelivery');
const { apiCsrfProtection } = require('./middleware/csrfMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

if (
  String(process.env.TRUST_PROXY || '').toLowerCase() === 'true' ||
  String(process.env.TRUST_PROXY || '') === '1'
) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean)
  : null;
app.use(
  cors({
    credentials: true,
    origin:
      corsOrigins && corsOrigins.length
        ? (origin, callback) => {
            if (!origin) {
              return callback(null, true);
            }
            if (corsOrigins.includes(origin)) {
              return callback(null, true);
            }
            return callback(null, false);
          }
        : true,
  })
);

// JSON APIs should not use ETag/304 — browsers cache empty 304 bodies and fetch() treats 304 as !ok.
app.set('etag', false);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_API_PER_MINUTE || 500),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again shortly.',
  },
});
app.use('/api', apiLimiter);

// Parse JSON body (required for signup/login, profile, assessment, submission APIs)
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use('/api', apiCsrfProtection);

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
app.use('/api/landing', landingRoutes);

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
    logger.info('Server listening', {
      port: PORT,
      env: process.env.NODE_ENV || 'development',
    });
    if (isSmtpConfigured()) {
      const host = process.env.SMTP_HOST || process.env.SMTP_SERVICE || 'service';
      logger.info('SMTP configured for OTP email', { host });
    } else {
      logger.warn(
        'SMTP not configured — signup OTP returns HTTP 503 unless OTP_ECHO_TO_CLIENT=true (dev only)'
      );
    }
    if (String(process.env.OTP_ECHO_TO_CLIENT || '').toLowerCase() === 'true') {
      logger.warn('OTP_ECHO_TO_CLIENT=true — OTP codes are included in API JSON (dev only)');
    }
  });
};

start();

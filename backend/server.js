require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const profileRoutes = require('./routes/profileRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Parse JSON body (required for signup/login and profile APIs)
app.use(express.json());

// Auth routes: signup & login
app.use('/api/auth', authRoutes);
// Student profile routes (protected)
app.use('/api/profile', profileRoutes);

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
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

start();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cronJobs = require('./services/cronJobs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Serve static files from public directory
app.use('/airline', express.static('public/airline'));
app.use('/hotel', express.static('public/hotel'));
app.use('/excursion', express.static('public/excursion'));
app.use('/transfer', express.static('public/transfer'));
app.use('/insurance', express.static('public/insurance'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start cron jobs after successful database connection
    cronJobs.start();
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

// Routes
app.use('/api', require('./routes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
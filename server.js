const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cronJobs = require('./services/cronJobs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// CORS configuration
const allowedOrigins = [
  'https://travel-frontend-app.netlify.app',
  'http://localhost:3000', // For local development
  'http://localhost:5173'  // For Vite dev server
];

// Add additional origins from environment variable if provided
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Serve static files from public directory
app.use('/airline', express.static('public/airline'));
app.use('/hotel', express.static('public/hotel'));
app.use('/excursion', express.static('public/excursion'));
app.use('/transfer', express.static('public/transfer'));
app.use('/insurance', express.static('public/insurance'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL)
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
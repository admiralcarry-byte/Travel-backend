const express = require('express');
const router = express.Router();
const { register, login, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, activityLoggers.userLogout, logout);

module.exports = router;
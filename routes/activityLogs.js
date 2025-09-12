const express = require('express');
const router = express.Router();
const {
  getActivityLogs,
  getRecentActivities,
  createActivityLog,
  getActivityStats,
  deleteActivityLog
} = require('../controllers/activityLogController');
const { authenticate } = require('../middlewares/authMiddleware');
const { requireAdmin, requireAdminOrSeller } = require('../middlewares/roleMiddleware');

// All routes require authentication
router.use(authenticate);

// GET /api/activity-logs - Get activity logs with pagination and filters
router.get('/', requireAdmin, getActivityLogs);

// GET /api/activity-logs/recent - Get recent activities for dashboard
router.get('/recent', requireAdminOrSeller, getRecentActivities);

// GET /api/activity-logs/stats - Get activity statistics
router.get('/stats', requireAdmin, getActivityStats);

// POST /api/activity-logs - Create a new activity log entry
router.post('/', requireAdminOrSeller, createActivityLog);

// DELETE /api/activity-logs/:id - Delete an activity log entry (admin only)
router.delete('/:id', requireAdmin, deleteActivityLog);

module.exports = router;
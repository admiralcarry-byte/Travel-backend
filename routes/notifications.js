const express = require('express');
const router = express.Router();
const {
  getNotificationHistory,
  getNotificationStatistics,
  updateClientNotificationPreferences,
  sendManualNotification,
  resendNotification,
  getCronStatus,
  triggerCronJob,
  testNotification
} = require('../controllers/notificationController');
const { authenticate, requireAdminOrSeller, requireAdmin } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All notification routes require authentication
router.use(authenticate);

// Notification history and statistics (admin and seller)
router.get('/history', requireAdminOrSeller, getNotificationHistory);
router.get('/statistics', requireAdminOrSeller, getNotificationStatistics);

// Client notification preferences (admin and seller)
router.put('/clients/:id/notifications', requireAdminOrSeller, activityLoggers.notificationCreate, updateClientNotificationPreferences);

// Manual notification sending (admin and seller)
router.post('/send', requireAdminOrSeller, activityLoggers.notificationSend, sendManualNotification);
router.post('/resend/:id', requireAdminOrSeller, activityLoggers.notificationSend, resendNotification);

// Test notification (admin and seller)
router.post('/test', requireAdminOrSeller, activityLoggers.notificationSend, testNotification);

// Cron job management (admin only)
router.get('/cron/status', requireAdmin, getCronStatus);
router.post('/cron/trigger', requireAdmin, triggerCronJob);

module.exports = router;
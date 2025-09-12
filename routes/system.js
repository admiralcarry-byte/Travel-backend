const express = require('express');
const router = express.Router();
const { 
  getSystemHealth, 
  backupDatabase, 
  resetDatabase, 
  clearCache, 
  listBackups 
} = require('../controllers/systemController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All system routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// System management routes
router.get('/health', activityLoggers.systemHealthCheck, getSystemHealth);
router.post('/backup', activityLoggers.systemBackup, backupDatabase);
router.post('/reset', activityLoggers.systemReset, resetDatabase);
router.post('/clear-cache', activityLoggers.systemCacheClear, clearCache);
router.get('/backups', listBackups);

module.exports = router;
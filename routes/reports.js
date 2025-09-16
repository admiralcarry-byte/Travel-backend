const express = require('express');
const router = express.Router();
const {
  getBankTransferPaymentsReport,
  getSellerPaymentSummary,
  getReconciliationReport
} = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All report routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

// Payment reports routes
router.get('/payments/bank-transfers', activityLoggers.reportView, getBankTransferPaymentsReport);
router.get('/payments/seller-summary', activityLoggers.reportView, getSellerPaymentSummary);
router.get('/payments/reconciliation', activityLoggers.reportView, getReconciliationReport);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  getBankTransferPaymentsReport,
  getSellerPaymentSummary,
  getReconciliationReport,
  getKPIs,
  getSalesData,
  getProfitData,
  getBalancesData,
  getClientBalanceData,
  getProviderBalanceData,
  getTopServicesData
} = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All report routes require authentication and admin access
router.use(authenticate);
router.use(requireAdmin);

// Dashboard KPI routes
router.get('/kpis', activityLoggers.reportView, getKPIs);
router.get('/sales', activityLoggers.reportView, getSalesData);
router.get('/profit', activityLoggers.reportView, getProfitData);
router.get('/balances', activityLoggers.reportView, getBalancesData);
router.get('/client-balance', activityLoggers.reportView, getClientBalanceData);
router.get('/provider-balance', activityLoggers.reportView, getProviderBalanceData);
router.get('/top-services', activityLoggers.reportView, getTopServicesData);

// Payment reports routes
router.get('/payments/bank-transfers', activityLoggers.reportView, getBankTransferPaymentsReport);
router.get('/payments/seller-summary', activityLoggers.reportView, getSellerPaymentSummary);
router.get('/payments/reconciliation', activityLoggers.reportView, getReconciliationReport);

module.exports = router;
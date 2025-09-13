const express = require('express');
const router = express.Router();
const {
  getSalesReport,
  getProfitReport,
  getBalancesReport,
  getTopServicesReport,
  getKPIs,
  getClientBalance,
  getProviderBalance,
  clearCache
} = require('../controllers/reportController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');

// All reporting routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Reporting endpoints
router.get('/sales', getSalesReport);
router.get('/profit', getProfitReport);
router.get('/balances', getBalancesReport);
router.get('/top-services', getTopServicesReport);
router.get('/kpis', getKPIs);
router.get('/client-balance', getClientBalance);
router.get('/provider-balance', getProviderBalance);
router.get('/clear-cache', clearCache);

module.exports = router;
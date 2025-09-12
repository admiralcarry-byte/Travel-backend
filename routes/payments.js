const express = require('express');
const router = express.Router();
const {
  recordClientPayment,
  recordProviderPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
  getExchangeRate,
  getSupportedCurrencies
} = require('../controllers/paymentController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');
const { uploadReceipt, handleUploadError } = require('../middlewares/paymentUploadMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All payment routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Payment CRUD routes
router.post('/client', uploadReceipt, handleUploadError, activityLoggers.paymentCreate, recordClientPayment);
router.post('/provider', uploadReceipt, handleUploadError, activityLoggers.paymentCreate, recordProviderPayment);
router.get('/', getPayments);
router.get('/currencies', getSupportedCurrencies);

// Currency conversion routes (must come before /:id route)
router.get('/exchange-rate', getExchangeRate);

// ID-based routes (must come after specific routes)
router.get('/:id', getPayment);
router.put('/:id', activityLoggers.paymentUpdate, updatePayment);
router.delete('/:id', activityLoggers.paymentDelete, deletePayment);

module.exports = router;
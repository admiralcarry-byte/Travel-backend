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

// All payment routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Payment CRUD routes
router.post('/client', uploadReceipt, handleUploadError, recordClientPayment);
router.post('/provider', uploadReceipt, handleUploadError, recordProviderPayment);
router.get('/', getPayments);
router.get('/currencies', getSupportedCurrencies);
router.get('/:id', getPayment);
router.put('/:id', updatePayment);
router.delete('/:id', deletePayment);

// Currency conversion routes
router.get('/exchange-rate', getExchangeRate);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  createSale,
  getSale,
  getAllSales,
  updateSale,
  deleteSale,
  uploadDocuments,
  getSaleDocuments,
  getSalesStats
} = require('../controllers/saleController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');
const { uploadMultiple, handleUploadError } = require('../middlewares/saleUploadMiddleware');

// All sale routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Sale CRUD routes
router.post('/', createSale);
router.get('/', getAllSales);
router.get('/stats', getSalesStats);
router.get('/:id', getSale);
router.put('/:id', updateSale);
router.delete('/:id', deleteSale);

// Document upload routes
router.post('/:id/upload', uploadMultiple, handleUploadError, uploadDocuments);
router.get('/:id/documents', getSaleDocuments);

module.exports = router;
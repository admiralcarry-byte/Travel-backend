const express = require('express');
const router = express.Router();
const {
  createService,
  getAllServices,
  getService,
  updateService,
  deleteService,
  getServicesByProvider,
  getServiceTypes
} = require('../controllers/serviceController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');

// All service routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Service CRUD routes
router.post('/', createService);
router.get('/', getAllServices);
router.get('/types', getServiceTypes);
router.get('/provider/:providerId', getServicesByProvider);
router.get('/:id', getService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

module.exports = router;
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
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All service routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Service CRUD routes
router.post('/', activityLoggers.serviceCreate, createService);
router.get('/', getAllServices);
router.get('/types', getServiceTypes);
router.get('/provider/:providerId', getServicesByProvider);
router.get('/:id', getService);
router.put('/:id', activityLoggers.serviceUpdate, updateService);
router.delete('/:id', activityLoggers.serviceDelete, deleteService);

module.exports = router;
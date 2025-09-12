const express = require('express');
const router = express.Router();
const {
  createProvider,
  getAllProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  getProviderTypes
} = require('../controllers/providerController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All provider routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Provider CRUD routes
router.post('/', activityLoggers.providerCreate, createProvider);
router.get('/', getAllProviders);
router.get('/types', getProviderTypes);
router.get('/:id', getProvider);
router.put('/:id', activityLoggers.providerUpdate, updateProvider);
router.delete('/:id', activityLoggers.providerDelete, deleteProvider);

module.exports = router;
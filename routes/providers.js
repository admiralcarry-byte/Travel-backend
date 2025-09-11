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

// All provider routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Provider CRUD routes
router.post('/', createProvider);
router.get('/', getAllProviders);
router.get('/types', getProviderTypes);
router.get('/:id', getProvider);
router.put('/:id', updateProvider);
router.delete('/:id', deleteProvider);

module.exports = router;
const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser, getSellers } = require('../controllers/userController');
const { authenticate, requireAdmin, requireAdminOrSeller } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All user routes require authentication
router.use(authenticate);

// Get sellers endpoint - accessible by both admin and seller
router.get('/sellers', requireAdminOrSeller, getSellers);

// All other user management routes require admin role
router.use(requireAdmin);

// User management routes
router.get('/', getAllUsers);
router.post('/', activityLoggers.userRegistration, createUser);
router.get('/:id', getUserById);
router.put('/:id', activityLoggers.userUpdate, updateUser);
router.delete('/:id', activityLoggers.userDelete, deleteUser);

module.exports = router;
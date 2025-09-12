const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All user routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// User management routes
router.get('/', getAllUsers);
router.post('/', activityLoggers.userRegistration, createUser);
router.get('/:id', getUserById);
router.put('/:id', activityLoggers.userUpdate, updateUser);
router.delete('/:id', activityLoggers.userDelete, deleteUser);

module.exports = router;
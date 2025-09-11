const express = require('express');
const router = express.Router();
const { getAllUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middlewares/authMiddleware');

// All user routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// User management routes
router.get('/', getAllUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
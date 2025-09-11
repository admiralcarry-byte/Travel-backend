const express = require('express');
const router = express.Router();
const {
  createCupo,
  getAllCupos,
  getCupo,
  updateCupo,
  deleteCupo,
  reserveSeats,
  getAvailableCupos,
  getCuposCalendar
} = require('../controllers/cupoController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');

// All cupo routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Cupo CRUD routes
router.post('/', createCupo);
router.get('/', getAllCupos);
router.get('/available', getAvailableCupos);
router.get('/calendar', getCuposCalendar);
router.get('/:id', getCupo);
router.put('/:id', updateCupo);
router.delete('/:id', deleteCupo);

// Reservation route
router.put('/:id/reserve', reserveSeats);

module.exports = router;
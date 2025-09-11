const express = require('express');
const router = express.Router();
const {
  getPassenger,
  updatePassenger,
  deletePassenger,
  extractPassengerPassportData,
  getPassengerPassportImage
} = require('../controllers/passengerController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');
const { uploadPassportImage, handleUploadError } = require('../middlewares/uploadMiddleware');
const path = require('path');

// All passenger routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Passenger CRUD routes
router.get('/:passengerId', getPassenger);
router.put('/:passengerId', updatePassenger);
router.delete('/:passengerId', deletePassenger);

// OCR route for passenger passport data extraction
router.post('/ocr', uploadPassportImage, handleUploadError, extractPassengerPassportData);

// Passenger passport image route
router.get('/:passengerId/passport-image', getPassengerPassportImage);

module.exports = router;
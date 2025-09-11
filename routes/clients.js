const express = require('express');
const router = express.Router();
const {
  createClient,
  getClient,
  getAllClients,
  updateClient,
  deleteClient,
  extractPassportData,
  getPassportImage
} = require('../controllers/clientController');
const {
  addPassenger,
  getClientPassengers
} = require('../controllers/passengerController');
const { authenticate, requireAdminOrSeller } = require('../middlewares/authMiddleware');
const { uploadPassportImage, handleUploadError } = require('../middlewares/uploadMiddleware');

// All client routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Client CRUD routes
router.post('/', createClient);
router.get('/', getAllClients);
router.get('/:clientId', getClient);
router.put('/:clientId', updateClient);
router.delete('/:clientId', deleteClient);

// OCR route for passport data extraction
router.post('/ocr', uploadPassportImage, handleUploadError, extractPassportData);

// Passport image route
router.get('/:clientId/passport-image', getPassportImage);

// Passenger routes for specific client
router.post('/:clientId/passengers', addPassenger);
router.get('/:clientId/passengers', getClientPassengers);

module.exports = router;
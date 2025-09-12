const express = require('express');
const router = express.Router();
const {
  createClient,
  getClient,
  getAllClients,
  getAllClientsWithSales,
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
const { activityLoggers } = require('../middlewares/activityLogMiddleware');

// All client routes require authentication
router.use(authenticate);
router.use(requireAdminOrSeller);

// Client CRUD routes
router.post('/', activityLoggers.clientCreate, createClient);
router.get('/', getAllClients);
router.get('/with-sales', getAllClientsWithSales);
router.get('/:clientId', getClient);
router.put('/:clientId', activityLoggers.clientUpdate, updateClient);
router.delete('/:clientId', activityLoggers.clientDelete, deleteClient);

// OCR route for passport data extraction
router.post('/ocr', uploadPassportImage, handleUploadError, activityLoggers.passportOcr, extractPassportData);

// Passport image route
router.get('/:clientId/passport-image', getPassportImage);

// Passenger routes for specific client
router.post('/:clientId/passengers', activityLoggers.passengerCreate, addPassenger);
router.get('/:clientId/passengers', getClientPassengers);

module.exports = router;
const Passenger = require('../models/Passenger');
const Client = require('../models/Client');
const ocrService = require('../services/ocrService');

// POST /api/clients/:clientId/passengers - Add passenger to client
const addPassenger = async (req, res) => {
  try {
    const { clientId } = req.params;
    const passengerData = req.body;

    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Validate required fields
    const requiredFields = ['name', 'surname', 'dob', 'passportNumber', 'nationality', 'expirationDate'];
    const missingFields = requiredFields.filter(field => !passengerData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if passenger with same passport number already exists for this client
    const existingPassenger = await Passenger.findOne({
      clientId,
      passportNumber: passengerData.passportNumber
    });

    if (existingPassenger) {
      return res.status(409).json({
        success: false,
        message: 'Passenger with this passport number already exists for this client'
      });
    }

    // Add clientId to passenger data
    passengerData.clientId = clientId;

    const passenger = new Passenger(passengerData);
    await passenger.save();

    res.status(201).json({
      success: true,
      message: 'Passenger added successfully',
      data: { passenger }
    });

  } catch (error) {
    console.error('Add passenger error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while adding passenger'
    });
  }
};

// GET /api/passengers/:passengerId - Get passenger by ID
const getPassenger = async (req, res) => {
  try {
    const { passengerId } = req.params;
    
    const passenger = await Passenger.findById(passengerId).populate('clientId', 'name surname email');
    
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      data: { passenger }
    });

  } catch (error) {
    console.error('Get passenger error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching passenger'
    });
  }
};

// PUT /api/passengers/:passengerId - Update passenger
const updatePassenger = async (req, res) => {
  try {
    const { passengerId } = req.params;
    const updateData = req.body;

    const passenger = await Passenger.findByIdAndUpdate(
      passengerId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Passenger updated successfully',
      data: { passenger }
    });

  } catch (error) {
    console.error('Update passenger error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating passenger'
    });
  }
};

// DELETE /api/passengers/:passengerId - Delete passenger
const deletePassenger = async (req, res) => {
  try {
    const { passengerId } = req.params;

    const passenger = await Passenger.findByIdAndDelete(passengerId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    res.json({
      success: true,
      message: 'Passenger deleted successfully'
    });

  } catch (error) {
    console.error('Delete passenger error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting passenger'
    });
  }
};

// GET /api/clients/:clientId/passengers - Get all passengers for a client
const getClientPassengers = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Check if client exists
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const passengers = await Passenger.find({ clientId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        client: {
          id: client._id,
          name: client.name,
          surname: client.surname,
          email: client.email
        },
        passengers
      }
    });

  } catch (error) {
    console.error('Get client passengers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching passengers'
    });
  }
};

// POST /api/passengers/ocr - Upload passenger passport image and extract data
const extractPassengerPassportData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No passport image uploaded'
      });
    }

    const imagePath = req.file.path;
    console.log('Processing passenger passport image:', imagePath);

    // Extract data using OCR
    const ocrResult = await ocrService.extractPassportData(imagePath);

    if (!ocrResult.success) {
      return res.status(500).json({
        success: false,
        message: 'OCR processing failed',
        error: ocrResult.error
      });
    }

    // Validate extracted data
    const validation = ocrService.validatePassportData(ocrResult.data);

    res.json({
      success: true,
      message: 'Passenger passport data extracted successfully',
      data: {
        extractedData: ocrResult.data,
        validation: validation,
        imagePath: req.file.filename
      }
    });

  } catch (error) {
    console.error('Passenger OCR extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during OCR processing'
    });
  }
};

// GET /api/passengers/:passengerId/passport-image - Get passenger passport image
const getPassengerPassportImage = async (req, res) => {
  try {
    const { passengerId } = req.params;
    
    const passenger = await Passenger.findById(passengerId);
    if (!passenger) {
      return res.status(404).json({
        success: false,
        message: 'Passenger not found'
      });
    }

    if (!passenger.passportImage) {
      return res.status(404).json({
        success: false,
        message: 'No passport image found for this passenger'
      });
    }

    const imagePath = path.join(__dirname, '../uploads/passports', passenger.passportImage);
    res.sendFile(imagePath);

  } catch (error) {
    console.error('Get passenger passport image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching passport image'
    });
  }
};

module.exports = {
  addPassenger,
  getPassenger,
  updatePassenger,
  deletePassenger,
  getClientPassengers,
  extractPassengerPassportData,
  getPassengerPassportImage
};
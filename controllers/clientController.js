const Client = require('../models/Client');
const Passenger = require('../models/Passenger');
const ocrService = require('../services/ocrService');
const path = require('path');

// POST /api/clients - Create a new client
const createClient = async (req, res) => {
  try {
    const clientData = req.body;
    
    // Add the user ID who created this client
    clientData.createdBy = req.user.id;
    
    // Validate required fields
    const requiredFields = ['name', 'surname', 'dob', 'email', 'phone', 'passportNumber', 'nationality', 'expirationDate'];
    const missingFields = requiredFields.filter(field => !clientData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if client with same email or passport number already exists
    const existingClient = await Client.findOne({
      $or: [
        { email: clientData.email },
        { passportNumber: clientData.passportNumber }
      ]
    });

    if (existingClient) {
      return res.status(409).json({
        success: false,
        message: 'Client with this email or passport number already exists'
      });
    }

    const client = new Client(clientData);
    await client.save();

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: { client }
    });

  } catch (error) {
    console.error('Create client error:', error);
    
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
      message: 'Internal server error while creating client'
    });
  }
};

// GET /api/clients/:clientId - Get client with passengers
const getClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get all passengers for this client
    const passengers = await Passenger.find({ clientId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        client,
        passengers
      }
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching client'
    });
  }
};

// GET /api/clients - Get all clients (for admin)
const getAllClients = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { surname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { passportNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const clients = await Client.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Client.countDocuments(query);

    res.json({
      success: true,
      data: {
        clients,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all clients error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching clients'
    });
  }
};

// PUT /api/clients/:clientId - Update client
const updateClient = async (req, res) => {
  try {
    const { clientId } = req.params;
    const updateData = req.body;

    const client = await Client.findByIdAndUpdate(
      clientId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: { client }
    });

  } catch (error) {
    console.error('Update client error:', error);
    
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
      message: 'Internal server error while updating client'
    });
  }
};

// DELETE /api/clients/:clientId - Delete client
const deleteClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Check if client has passengers
    const passengersCount = await Passenger.countDocuments({ clientId });
    if (passengersCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete client with existing passengers. Delete passengers first.'
      });
    }

    const client = await Client.findByIdAndDelete(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting client'
    });
  }
};

// POST /api/clients/ocr - Upload passport image and extract data using OCR
const extractPassportData = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No passport image uploaded'
      });
    }

    const imagePath = req.file.path;
    console.log('Processing passport image:', imagePath);

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
      message: 'Passport data extracted successfully',
      data: {
        extractedData: ocrResult.data,
        validation: validation,
        imagePath: req.file.filename // Return filename for reference
      }
    });

  } catch (error) {
    console.error('OCR extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during OCR processing'
    });
  }
};

// GET /api/clients/:clientId/passport-image - Get passport image
const getPassportImage = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.passportImage) {
      return res.status(404).json({
        success: false,
        message: 'No passport image found for this client'
      });
    }

    const imagePath = path.join(__dirname, '../uploads/passports', client.passportImage);
    res.sendFile(imagePath);

  } catch (error) {
    console.error('Get passport image error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching passport image'
    });
  }
};

module.exports = {
  createClient,
  getClient,
  getAllClients,
  updateClient,
  deleteClient,
  extractPassportData,
  getPassportImage
};
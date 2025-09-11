const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Client = require('../models/Client');
const Passenger = require('../models/Passenger');
const Service = require('../models/Service');
const Provider = require('../models/Provider');
const User = require('../models/User');

// POST /api/sales - Create a new sale
const createSale = async (req, res) => {
  try {
    const saleData = req.body;
    const userId = req.user.id; // From auth middleware
    
    // Validate required fields
    const requiredFields = ['clientId', 'passengers', 'services'];
    const missingFields = requiredFields.filter(field => !saleData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate that client exists
    const client = await Client.findById(saleData.clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Validate passengers
    for (const passengerSale of saleData.passengers) {
      const passenger = await Passenger.findById(passengerSale.passengerId);
      if (!passenger) {
        return res.status(404).json({
          success: false,
          message: `Passenger with ID ${passengerSale.passengerId} not found`
        });
      }
      
      // Ensure passenger belongs to the client
      if (passenger.clientId.toString() !== saleData.clientId) {
        return res.status(400).json({
          success: false,
          message: `Passenger ${passengerSale.passengerId} does not belong to client ${saleData.clientId}`
        });
      }
    }

    // Validate services
    for (const serviceSale of saleData.services) {
      const service = await Service.findById(serviceSale.serviceId);
      if (!service) {
        return res.status(404).json({
          success: false,
          message: `Service with ID ${serviceSale.serviceId} not found`
        });
      }
      
      // Ensure service provider matches
      if (service.providerId.toString() !== serviceSale.providerId) {
        return res.status(400).json({
          success: false,
          message: `Service ${serviceSale.serviceId} does not belong to provider ${serviceSale.providerId}`
        });
      }
    }

    // Create sale with calculated totals
    const sale = new Sale({
      ...saleData,
      createdBy: userId,
      status: saleData.status || 'open'
    });

    await sale.save();

    // Populate all references for response
    await sale.populate([
      { path: 'clientId', select: 'name surname email phone' },
      { path: 'passengers.passengerId', select: 'name surname dob passportNumber' },
      { path: 'services.serviceId', select: 'title description type' },
      { path: 'services.providerId', select: 'name type' },
      { path: 'createdBy', select: 'username email role' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      data: { sale }
    });

  } catch (error) {
    console.error('Create sale error:', error);
    
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
      message: 'Internal server error while creating sale'
    });
  }
};

// GET /api/sales/:id - Get sale by ID with full population
const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sale ID format'
      });
    }
    
    const sale = await Sale.findById(id)
      .populate([
        { path: 'clientId', select: 'name surname email phone passportNumber nationality' },
        { path: 'passengers.passengerId', select: 'name surname dob passportNumber nationality' },
        { path: 'services.serviceId', select: 'title description type cost currency' },
        { path: 'services.providerId', select: 'name type contactInfo' },
        { path: 'createdBy', select: 'username email role' },
        { path: 'paymentsClient.paymentId' },
        { path: 'paymentsProvider.paymentId' }
      ]);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: { sale }
    });

  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching sale'
    });
  }
};

// GET /api/sales - Get all sales with filtering and pagination
const getAllSales = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      clientId = '',
      createdBy = '',
      minProfit = '',
      maxProfit = '',
      startDate = '',
      endDate = ''
    } = req.query;
    
    const query = {};
    
    // Add status filter
    if (status) {
      query.status = status;
    }
    
    // Add client filter
    if (clientId) {
      query.clientId = clientId;
    }
    
    // Add created by filter
    if (createdBy) {
      query.createdBy = createdBy;
    }
    
    // Add profit range filter
    if (minProfit || maxProfit) {
      query.profit = {};
      if (minProfit) query.profit.$gte = parseFloat(minProfit);
      if (maxProfit) query.profit.$lte = parseFloat(maxProfit);
    }
    
    // Add date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(query)
      .populate([
        { path: 'clientId', select: 'name surname email' },
        { path: 'createdBy', select: 'username email' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Sale.countDocuments(query);

    res.json({
      success: true,
      data: {
        sales,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching sales'
    });
  }
};

// PUT /api/sales/:id - Update sale
const updateSale = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If updating passengers or services, validate them
    if (updateData.passengers) {
      for (const passengerSale of updateData.passengers) {
        const passenger = await Passenger.findById(passengerSale.passengerId);
        if (!passenger) {
          return res.status(404).json({
            success: false,
            message: `Passenger with ID ${passengerSale.passengerId} not found`
          });
        }
      }
    }

    if (updateData.services) {
      for (const serviceSale of updateData.services) {
        const service = await Service.findById(serviceSale.serviceId);
        if (!service) {
          return res.status(404).json({
            success: false,
            message: `Service with ID ${serviceSale.serviceId} not found`
          });
        }
      }
    }

    const sale = await Sale.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'clientId', select: 'name surname email phone' },
      { path: 'passengers.passengerId', select: 'name surname dob passportNumber' },
      { path: 'services.serviceId', select: 'title description type' },
      { path: 'services.providerId', select: 'name type' },
      { path: 'createdBy', select: 'username email role' }
    ]);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Sale updated successfully',
      data: { sale }
    });

  } catch (error) {
    console.error('Update sale error:', error);
    
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
      message: 'Internal server error while updating sale'
    });
  }
};

// DELETE /api/sales/:id - Delete sale
const deleteSale = async (req, res) => {
  try {
    const { id } = req.params;

    const sale = await Sale.findByIdAndDelete(id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      message: 'Sale deleted successfully'
    });

  } catch (error) {
    console.error('Delete sale error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting sale'
    });
  }
};

// POST /api/sales/:id/upload - Upload documents to sale
const uploadDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const sale = await Sale.findById(id);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Add uploaded files to sale documents
    const newDocuments = req.files.map(file => ({
      filename: file.filename,
      url: `/uploads/sales/${file.filename}`,
      type: type || 'other'
    }));

    sale.documents.push(...newDocuments);
    await sale.save();

    res.json({
      success: true,
      message: 'Documents uploaded successfully',
      data: { documents: newDocuments }
    });

  } catch (error) {
    console.error('Upload documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while uploading documents'
    });
  }
};

// GET /api/sales/:id/documents - Get sale documents
const getSaleDocuments = async (req, res) => {
  try {
    const { id } = req.params;
    
    const sale = await Sale.findById(id).select('documents');
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    res.json({
      success: true,
      data: { documents: sale.documents }
    });

  } catch (error) {
    console.error('Get sale documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching documents'
    });
  }
};

// GET /api/sales/stats - Get sales statistics
const getSalesStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchQuery = {};
    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) matchQuery.createdAt.$gte = new Date(startDate);
      if (endDate) matchQuery.createdAt.$lte = new Date(endDate);
    }

    const stats = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$totalSalePrice' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$profit' },
          avgProfitMargin: { $avg: { $divide: ['$profit', '$totalSalePrice'] } }
        }
      }
    ]);

    const statusStats = await Sale.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalSales: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          avgProfitMargin: 0
        },
        statusBreakdown: statusStats
      }
    });

  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching sales statistics'
    });
  }
};

module.exports = {
  createSale,
  getSale,
  getAllSales,
  updateSale,
  deleteSale,
  uploadDocuments,
  getSaleDocuments,
  getSalesStats
};
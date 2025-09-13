const mongoose = require('mongoose');
const Cupo = require('../models/Cupo');
const Service = require('../models/Service');
const Sale = require('../models/Sale');

// POST /api/cupos - Create a new cupo
const createCupo = async (req, res) => {
  try {
    const cupoData = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    const requiredFields = ['serviceId', 'totalSeats', 'metadata'];
    const missingFields = requiredFields.filter(field => !cupoData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate that service exists
    const service = await Service.findById(cupoData.serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    // Validate metadata
    if (!cupoData.metadata.date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required in metadata'
      });
    }

    // Create cupo
    const cupo = new Cupo({
      ...cupoData,
      createdBy: userId,
      availableSeats: cupoData.totalSeats // Will be calculated in pre-save middleware
    });

    await cupo.save();

    // Populate service information for response
    await cupo.populate([
      { path: 'serviceId', select: 'title description type providerId cost currency' },
      { path: 'serviceId.providerId', select: 'name type' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Cupo created successfully',
      data: { cupo }
    });

  } catch (error) {
    console.error('Create cupo error:', error);
    
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
      message: 'Internal server error while creating cupo'
    });
  }
};

// GET /api/cupos - Get all cupos with filtering
const getAllCupos = async (req, res) => {
  try {
    const { 
      serviceId, 
      date, 
      status, 
      minAvailableSeats,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query = {};
    
    if (serviceId) {
      // Validate that serviceId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(serviceId)) {
        query.serviceId = serviceId;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid serviceId format. Must be a valid ObjectId.'
        });
      }
    }
    
    if (date) {
      query['metadata.date'] = new Date(date);
    }
    
    if (status) {
      query.status = status;
    }
    
    if (minAvailableSeats) {
      query.availableSeats = { $gte: parseInt(minAvailableSeats) };
    }

    const cupos = await Cupo.find(query)
      .populate([
        { path: 'serviceId', select: 'title description type providerId cost currency' },
        { path: 'createdBy', select: 'username email' }
      ])
      .sort({ 'metadata.date': 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Manually populate provider data for all cupos
    const Provider = require('../models/Provider');
    for (let cupo of cupos) {
      if (cupo.serviceId && cupo.serviceId.providerId) {
        const provider = await Provider.findById(cupo.serviceId.providerId)
          .select('name type');
        
        if (provider) {
          cupo.serviceId.providerId = provider;
        }
      }
    }

    const total = await Cupo.countDocuments(query);

    res.json({
      success: true,
      data: {
        cupos,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all cupos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cupos'
    });
  }
};

// GET /api/cupos/:id - Get cupo by ID
const getCupo = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cupo = await Cupo.findById(id)
      .populate([
        { path: 'serviceId', select: 'title description type providerId cost currency' },
        { path: 'createdBy', select: 'username email' }
      ]);
    
    if (!cupo) {
      return res.status(404).json({
        success: false,
        message: 'Cupo not found'
      });
    }

    // Manually populate the provider data
    if (cupo.serviceId && cupo.serviceId.providerId) {
      const Provider = require('../models/Provider');
      const provider = await Provider.findById(cupo.serviceId.providerId)
        .select('name type contactInfo');
      
      if (provider) {
        cupo.serviceId.providerId = provider;
      }
    }

    res.json({
      success: true,
      data: { cupo }
    });

  } catch (error) {
    console.error('Get cupo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cupo'
    });
  }
};

// PUT /api/cupos/:id - Update cupo
const updateCupo = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const cupo = await Cupo.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'serviceId', select: 'title description type providerId cost currency' },
      { path: 'serviceId.providerId', select: 'name type' },
      { path: 'createdBy', select: 'username email' }
    ]);

    if (!cupo) {
      return res.status(404).json({
        success: false,
        message: 'Cupo not found'
      });
    }

    res.json({
      success: true,
      message: 'Cupo updated successfully',
      data: { cupo }
    });

  } catch (error) {
    console.error('Update cupo error:', error);
    
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
      message: 'Internal server error while updating cupo'
    });
  }
};

// DELETE /api/cupos/:id - Delete cupo
const deleteCupo = async (req, res) => {
  try {
    const { id } = req.params;

    const cupo = await Cupo.findByIdAndDelete(id);
    if (!cupo) {
      return res.status(404).json({
        success: false,
        message: 'Cupo not found'
      });
    }

    res.json({
      success: true,
      message: 'Cupo deleted successfully'
    });

  } catch (error) {
    console.error('Delete cupo error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting cupo'
    });
  }
};

// PUT /api/cupos/:id/reserve - Reserve seats atomically
const reserveSeats = async (req, res) => {
  try {
    const { id } = req.params;
    const { seatsToReserve, clientId, passengers } = req.body;
    const userId = req.user.id;

    if (!seatsToReserve || seatsToReserve <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid number of seats to reserve'
      });
    }

    // Get cupo details first
    const cupo = await Cupo.findById(id)
      .populate([
        { path: 'serviceId', select: 'title description type providerId cost currency' },
        { path: 'serviceId.providerId', select: 'name type' }
      ]);

    if (!cupo) {
      return res.status(404).json({
        success: false,
        message: 'Cupo not found'
      });
    }

    // Atomically reserve seats
    const updatedCupo = await Cupo.reserveSeats(id, seatsToReserve);

    // Create skeleton sale if clientId is provided
    let saleData = null;
    if (clientId) {
      try {
        // Calculate service pricing for the sale
        const serviceSaleData = {
          serviceId: cupo.serviceId._id.toString(),
          providerId: cupo.serviceId.providerId._id.toString(),
          priceClient: cupo.serviceId.cost,
          costProvider: cupo.serviceId.cost * 0.8, // 20% markup example
          currency: cupo.serviceId.currency || 'USD',
          quantity: seatsToReserve
        };

        saleData = {
          clientId: clientId,
          passengers: passengers || [],
          services: [serviceSaleData],
          notes: `Reservation from cupo: ${cupo.serviceId.title} - ${cupo.metadata.date.toLocaleDateString()}`,
          status: 'open'
        };

        // Create the sale
        const sale = new Sale({
          ...saleData,
          createdBy: userId
        });

        await sale.save();

        // Populate sale for response
        await sale.populate([
          { path: 'clientId', select: 'name surname email' },
          { path: 'services.serviceId', select: 'title description type' },
          { path: 'services.providerId', select: 'name type' },
          { path: 'createdBy', select: 'username email' }
        ]);

        saleData = sale;
      } catch (saleError) {
        console.error('Error creating sale:', saleError);
        // Don't fail the reservation if sale creation fails
      }
    }

    res.json({
      success: true,
      message: 'Seats reserved successfully',
      data: {
        cupo: updatedCupo,
        sale: saleData,
        reservationDetails: {
          seatsReserved: seatsToReserve,
          remainingSeats: updatedCupo.availableSeats,
          service: cupo.serviceId.title,
          date: cupo.metadata.date
        }
      }
    });

  } catch (error) {
    console.error('Reserve seats error:', error);
    
    if (error.message === 'Insufficient seats available or cupo not found') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while reserving seats'
    });
  }
};

// GET /api/cupos/available - Get available cupos for a service and date
const getAvailableCupos = async (req, res) => {
  try {
    const { serviceId, date, minSeats = 1 } = req.query;
    
    if (!serviceId || !date) {
      return res.status(400).json({
        success: false,
        message: 'Service ID and date are required'
      });
    }

    const cupos = await Cupo.findAvailable(serviceId, new Date(date), parseInt(minSeats))
      .populate([
        { path: 'serviceId', select: 'title description type providerId cost currency' },
        { path: 'serviceId.providerId', select: 'name type' }
      ]);

    res.json({
      success: true,
      data: { cupos }
    });

  } catch (error) {
    console.error('Get available cupos error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching available cupos'
    });
  }
};

// GET /api/cupos/calendar - Get cupos grouped by date for calendar view
const getCuposCalendar = async (req, res) => {
  try {
    const { startDate, endDate, serviceId } = req.query;
    
    const query = { status: 'active' };
    
    if (serviceId) {
      query.serviceId = serviceId;
    }
    
    if (startDate && endDate) {
      query['metadata.date'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const cupos = await Cupo.find(query)
      .populate([
        { path: 'serviceId', select: 'title description type providerId cost currency' },
        { path: 'serviceId.providerId', select: 'name type' }
      ])
      .sort({ 'metadata.date': 1 });

    // Group cupos by date
    const calendarData = cupos.reduce((acc, cupo) => {
      const dateKey = cupo.metadata.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(cupo);
      return acc;
    }, {});

    res.json({
      success: true,
      data: { calendarData }
    });

  } catch (error) {
    console.error('Get cupos calendar error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching calendar data'
    });
  }
};

module.exports = {
  createCupo,
  getAllCupos,
  getCupo,
  updateCupo,
  deleteCupo,
  reserveSeats,
  getAvailableCupos,
  getCuposCalendar
};
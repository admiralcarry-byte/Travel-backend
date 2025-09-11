const Service = require('../models/Service');
const Provider = require('../models/Provider');

// POST /api/services - Create a new service
const createService = async (req, res) => {
  try {
    const serviceData = req.body;
    
    // Validate required fields
    const requiredFields = ['title', 'type', 'description', 'providerId', 'cost', 'currency'];
    const missingFields = requiredFields.filter(field => !serviceData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Check if provider exists
    const provider = await Provider.findById(serviceData.providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    // Validate that service type matches provider type
    if (serviceData.type !== provider.type) {
      return res.status(400).json({
        success: false,
        message: 'Service type must match provider type'
      });
    }

    const service = new Service(serviceData);
    await service.save();

    // Populate provider information
    await service.populate('providerId', 'name type contactInfo');

    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Create service error:', error);
    
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
      message: 'Internal server error while creating service'
    });
  }
};

// GET /api/services - Get all services with filtering and pagination
const getAllServices = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      type = '', 
      providerId = '',
      minCost = '',
      maxCost = ''
    } = req.query;
    
    const query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add type filter
    if (type) {
      query.type = type;
    }
    
    // Add provider filter
    if (providerId) {
      query.providerId = providerId;
    }
    
    // Add cost range filter
    if (minCost || maxCost) {
      query.cost = {};
      if (minCost) query.cost.$gte = parseFloat(minCost);
      if (maxCost) query.cost.$lte = parseFloat(maxCost);
    }

    const services = await Service.find(query)
      .populate('providerId', 'name type contactInfo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments(query);

    res.json({
      success: true,
      data: {
        services,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching services'
    });
  }
};

// GET /api/services/:id - Get service by ID
const getService = async (req, res) => {
  try {
    const { id } = req.params;
    
    const service = await Service.findById(id).populate('providerId', 'name type contactInfo');
    
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: { service }
    });

  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching service'
    });
  }
};

// PUT /api/services/:id - Update service
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If providerId is being updated, validate the new provider
    if (updateData.providerId) {
      const provider = await Provider.findById(updateData.providerId);
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: 'Provider not found'
        });
      }
      
      // Validate that service type matches provider type
      if (updateData.type && updateData.type !== provider.type) {
        return res.status(400).json({
          success: false,
          message: 'Service type must match provider type'
        });
      }
    }

    const service = await Service.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('providerId', 'name type contactInfo');

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service updated successfully',
      data: { service }
    });

  } catch (error) {
    console.error('Update service error:', error);
    
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
      message: 'Internal server error while updating service'
    });
  }
};

// DELETE /api/services/:id - Delete service
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });

  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting service'
    });
  }
};

// GET /api/services/provider/:providerId - Get services by provider
const getServicesByProvider = async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Check if provider exists
    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    const services = await Service.find({ providerId })
      .populate('providerId', 'name type contactInfo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Service.countDocuments({ providerId });

    res.json({
      success: true,
      data: {
        provider,
        services,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get services by provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching services by provider'
    });
  }
};

// GET /api/services/types - Get available service types
const getServiceTypes = async (req, res) => {
  try {
    const types = ['hotel', 'airline', 'transfer', 'excursion', 'insurance'];
    
    res.json({
      success: true,
      data: { types }
    });

  } catch (error) {
    console.error('Get service types error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching service types'
    });
  }
};

module.exports = {
  createService,
  getAllServices,
  getService,
  updateService,
  deleteService,
  getServicesByProvider,
  getServiceTypes
};
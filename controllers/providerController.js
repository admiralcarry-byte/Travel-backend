const Provider = require('../models/Provider');

// POST /api/providers - Create a new provider
const createProvider = async (req, res) => {
  try {
    const providerData = req.body;
    
    // Validate required fields
    const requiredFields = ['name', 'type', 'contactInfo'];
    const missingFields = requiredFields.filter(field => !providerData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate contact info fields
    const contactInfoFields = ['phone', 'email'];
    const missingContactFields = contactInfoFields.filter(field => !providerData.contactInfo[field]);
    
    if (missingContactFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing contact info fields: ${missingContactFields.join(', ')}`
      });
    }

    // Validate address fields
    if (!providerData.contactInfo.address) {
      return res.status(400).json({
        success: false,
        message: 'Address information is required'
      });
    }

    const requiredAddressFields = ['street', 'city', 'country'];
    const missingAddressFields = requiredAddressFields.filter(field => !providerData.contactInfo.address[field]);
    
    if (missingAddressFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing address fields: ${missingAddressFields.join(', ')}`
      });
    }

    // Check if provider with same name and type already exists
    const existingProvider = await Provider.findOne({
      name: providerData.name,
      type: providerData.type
    });

    if (existingProvider) {
      return res.status(409).json({
        success: false,
        message: 'Provider with this name and type already exists'
      });
    }

    // Add the authenticated user's ID as the creator
    providerData.createdBy = req.user.id;

    const provider = new Provider(providerData);
    await provider.save();

    res.status(201).json({
      success: true,
      message: 'Provider created successfully',
      data: { provider }
    });

  } catch (error) {
    console.error('Create provider error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      
      // Create a more specific error message based on the first error
      let specificMessage = 'Validation error';
      if (errors.length > 0) {
        const firstError = errors[0];
        if (firstError.includes('email')) {
          specificMessage = 'Please enter a valid email address. Make sure to include the domain extension (e.g., .com, .org)';
        } else if (firstError.includes('phone')) {
          specificMessage = 'Please enter a valid phone number';
        } else if (firstError.includes('name')) {
          specificMessage = 'Please enter a valid provider name';
        } else if (firstError.includes('type')) {
          specificMessage = 'Please select a valid provider type';
        } else if (firstError.includes('required')) {
          specificMessage = 'Please fill in all required fields';
        } else {
          specificMessage = firstError;
        }
      }
      
      return res.status(400).json({
        success: false,
        message: specificMessage,
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating provider'
    });
  }
};

// GET /api/providers - Get all providers with filtering and pagination
const getAllProviders = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', type = '' } = req.query;
    
    const query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'contactInfo.email': { $regex: search, $options: 'i' } },
        { 'contactInfo.phone': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add type filter
    if (type) {
      query.type = type;
    }

    const providers = await Provider.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Provider.countDocuments(query);

    res.json({
      success: true,
      data: {
        providers,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get all providers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching providers'
    });
  }
};

// GET /api/providers/:id - Get provider by ID
const getProvider = async (req, res) => {
  try {
    const { id } = req.params;
    
    const provider = await Provider.findById(id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.json({
      success: true,
      data: { provider }
    });

  } catch (error) {
    console.error('Get provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching provider'
    });
  }
};

// PUT /api/providers/:id - Update provider
const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const provider = await Provider.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.json({
      success: true,
      message: 'Provider updated successfully',
      data: { provider }
    });

  } catch (error) {
    console.error('Update provider error:', error);
    
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
      message: 'Internal server error while updating provider'
    });
  }
};

// DELETE /api/providers/:id - Delete provider
const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if provider has services
    const Service = require('../models/Service');
    const servicesCount = await Service.countDocuments({ providerId: id });
    
    if (servicesCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete provider with existing services. Delete services first.'
      });
    }

    const provider = await Provider.findByIdAndDelete(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'Provider not found'
      });
    }

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });

  } catch (error) {
    console.error('Delete provider error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting provider'
    });
  }
};

// GET /api/providers/types - Get available provider types
const getProviderTypes = async (req, res) => {
  try {
    const types = ['hotel', 'airline', 'transfer', 'excursion', 'insurance'];
    
    res.json({
      success: true,
      data: { types }
    });

  } catch (error) {
    console.error('Get provider types error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching provider types'
    });
  }
};

module.exports = {
  createProvider,
  getAllProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  getProviderTypes
};
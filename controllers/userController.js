const User = require('../models/User');

// GET /api/users - Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { search, role, page = 1, limit = 10 } = req.query;
    
    // Build query object
    let query = {};
    
    // Add search filter
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Add role filter
    if (role) {
      query.role = role;
    }
    
    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    // Get total count for pagination
    const total = await User.countDocuments(query);
    
    // Get users with filters and pagination
    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching users'
    });
  }
};

// GET /api/users/:id - Get user by ID (Admin only)
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user'
    });
  }
};

// PUT /api/users/:id - Update user (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role } = req.body;

    // Validation
    if (role && !['admin', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either admin or seller'
      });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) updateData.role = role;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating user'
    });
  }
};

// DELETE /api/users/:id - Delete user (Admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (id === req.user.userId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting user'
    });
  }
};

// POST /api/users - Create new user (Admin only)
const createUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role, phone, timezone } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (role && !['admin', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either admin or seller'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'seller',
      phone: phone || '',
      timezone: timezone || 'UTC'
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.passwordHash;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'Email or username already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while creating user'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logActivityManually } = require('../middlewares/activityLogMiddleware');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, email, password, role = 'seller' } = req.body;
    
    // Debug logging
    console.log('Registration request body:', { username, email, password: password ? '***' : 'undefined', role });

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    if (role && !['admin', 'seller'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either admin or seller'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      role
    });
    
    // Set password using virtual field to trigger hashing
    user.password = password;

    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    // Manually log the registration activity since req.user is not set in middleware
    try {
      await logActivityManually(
        {
          id: user._id,
          username: user.username,
          email: user.email
        },
        'user_registration',
        'user',
        `New user registered: ${user.username}`,
        {
          ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          userAgent: req.get('User-Agent'),
          method: req.method,
          url: req.originalUrl,
          referer: req.get('Referer'),
          requestBody: req.body,
          queryParams: req.query,
          responseStatus: 201,
          sessionId: req.sessionID,
          contentType: req.get('Content-Type'),
          acceptLanguage: req.get('Accept-Language')
        }
      );
    } catch (logError) {
      console.error('Failed to log registration activity:', logError);
      // Don't fail the registration if logging fails
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
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
      message: 'Internal server error during registration'
    });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    // Manually log the login activity since req.user is not set in middleware
    try {
      await logActivityManually(
        {
          id: user._id,
          username: user.username,
          email: user.email
        },
        'user_login',
        'user',
        'User logged in',
        {
          ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
          userAgent: req.get('User-Agent'),
          method: req.method,
          url: req.originalUrl,
          referer: req.get('Referer'),
          requestBody: req.body,
          queryParams: req.query,
          responseStatus: 200,
          sessionId: req.sessionID,
          contentType: req.get('Content-Type'),
          acceptLanguage: req.get('Accept-Language')
        }
      );
    } catch (logError) {
      console.error('Failed to log login activity:', logError);
      // Don't fail the login if logging fails
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-passwordHash');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { username, email, firstName, lastName, phone, timezone } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!username || !email) {
      return res.status(400).json({
        success: false,
        message: 'Username and email are required'
      });
    }

    // Check if email is already taken by another user
    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email is already taken by another user'
      });
    }

    // Update user profile
    const user = await User.findByIdAndUpdate(
      userId,
      {
        username,
        email,
        firstName,
        lastName,
        phone,
        'preferences.timezone': timezone
      },
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
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          timezone: user.preferences?.timezone || 'UTC',
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
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
      message: 'Internal server error during profile update'
    });
  }
};

// PUT /api/auth/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during password change'
    });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    // Log the logout activity
    await logActivityManually(
      {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email
      },
      'user_logout',
      'user',
      'User logged out',
      {
        ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        referer: req.get('Referer'),
        requestBody: req.body,
        queryParams: req.query,
        responseStatus: 200,
        responseTime: Date.now() - req.startTime,
        sessionId: req.sessionID,
        contentType: req.get('Content-Type'),
        acceptLanguage: req.get('Accept-Language'),
        timestamp: new Date().toISOString()
      }
    );

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  logout
};
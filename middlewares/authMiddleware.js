const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token and attach user info to request
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided or invalid format.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists.'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      username: user.username,
      email: user.email,
      role: decoded.role
    };

    next();

  } catch (error) {
    console.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin role required.'
    });
  }
  next();
};

// Middleware to check if user is admin or seller
const requireAdminOrSeller = (req, res, next) => {
  if (!['admin', 'seller'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or Seller role required.'
    });
  }
  next();
};

// Middleware to check if user is seller (or admin)
const requireSeller = (req, res, next) => {
  if (req.user.role !== 'seller' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Seller role required.'
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
  requireAdminOrSeller,
  requireSeller
};
const User = require('../models/User');

/**
 * Enhanced role-based access control middleware
 */

// Role hierarchy and permissions
const ROLE_PERMISSIONS = {
  admin: {
    level: 3,
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'clients:read', 'clients:write', 'clients:delete',
      'passengers:read', 'passengers:write', 'passengers:delete',
      'providers:read', 'providers:write', 'providers:delete',
      'services:read', 'services:write', 'services:delete',
      'sales:read', 'sales:write', 'sales:delete',
      'payments:read', 'payments:write', 'payments:delete',
      'cupos:read', 'cupos:write', 'cupos:delete',
      'reports:read', 'reports:write',
      'notifications:read', 'notifications:write', 'notifications:admin',
      'system:admin', 'system:config'
    ]
  },
  seller: {
    level: 2,
    permissions: [
      'clients:read', 'clients:write',
      'passengers:read', 'passengers:write',
      'providers:read', 'providers:write',
      'services:read', 'services:write',
      'sales:read', 'sales:write',
      'payments:read', 'payments:write',
      'cupos:read', 'cupos:write',
      'reports:read',
      'notifications:read', 'notifications:write'
    ]
  },
  viewer: {
    level: 1,
    permissions: [
      'clients:read',
      'passengers:read',
      'providers:read',
      'services:read',
      'sales:read',
      'reports:read'
    ]
  }
};

/**
 * Check if user has specific permission
 */
const hasPermission = (userRole, requiredPermission) => {
  const roleConfig = ROLE_PERMISSIONS[userRole];
  if (!roleConfig) return false;
  
  return roleConfig.permissions.includes(requiredPermission);
};

/**
 * Check if user role level is sufficient
 */
const hasRoleLevel = (userRole, requiredLevel) => {
  const roleConfig = ROLE_PERMISSIONS[userRole];
  if (!roleConfig) return false;
  
  return roleConfig.level >= requiredLevel;
};

/**
 * Get user permissions
 */
const getUserPermissions = (userRole) => {
  const roleConfig = ROLE_PERMISSIONS[userRole];
  return roleConfig ? roleConfig.permissions : [];
};

/**
 * Middleware to require specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permission,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to require minimum role level
 */
const requireRoleLevel = (minLevel) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!hasRoleLevel(req.user.role, minLevel)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient role level',
        code: 'INSUFFICIENT_ROLE_LEVEL',
        required: minLevel,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to require admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_REQUIRED',
      userRole: req.user.role
    });
  }

  next();
};

/**
 * Middleware to require admin or seller role
 */
const requireAdminOrSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  if (!['admin', 'seller'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'Admin or seller access required',
      code: 'ADMIN_OR_SELLER_REQUIRED',
      userRole: req.user.role
    });
  }

  next();
};

/**
 * Middleware to check resource ownership (for sellers)
 */
const requireOwnershipOrAdmin = (resourceUserIdField = 'createdBy') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins can access all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // For sellers, check if they own the resource
    const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
    
    if (resourceUserId && resourceUserId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You can only access your own resources',
        code: 'OWNERSHIP_REQUIRED',
        resourceOwner: resourceUserId,
        currentUser: req.user.id
      });
    }

    next();
  };
};

/**
 * Middleware to filter resources by ownership (for sellers)
 */
const filterByOwnership = (resourceUserIdField = 'createdBy') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins can see all resources
    if (req.user.role === 'admin') {
      return next();
    }

    // For sellers, add filter to only show their resources
    if (req.user.role === 'seller') {
      req.ownershipFilter = { [resourceUserIdField]: req.user.id };
    }

    next();
  };
};

/**
 * Middleware to validate user can access specific user data
 */
const canAccessUser = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }

  const targetUserId = req.params.id || req.params.userId;
  
  // Admins can access any user
  if (req.user.role === 'admin') {
    return next();
  }

  // Users can only access their own data
  if (targetUserId && targetUserId !== req.user.id) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only access your own data',
      code: 'OWN_DATA_ONLY',
      targetUser: targetUserId,
      currentUser: req.user.id
    });
  }

  next();
};

/**
 * Middleware to check if user can modify specific resource
 */
const canModifyResource = (resourceUserIdField = 'createdBy') => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Admins can modify any resource
    if (req.user.role === 'admin') {
      return next();
    }

    const resourceId = req.params.id;
    if (!resourceId) {
      return next(); // Let the route handle missing ID
    }

    try {
      // Get the resource to check ownership
      const resource = await req.model.findById(resourceId);
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
          code: 'RESOURCE_NOT_FOUND'
        });
      }

      // Check if user owns the resource
      if (resource[resourceUserIdField] && resource[resourceUserIdField].toString() !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You can only modify your own resources',
          code: 'MODIFICATION_DENIED',
          resourceOwner: resource[resourceUserIdField],
          currentUser: req.user.id
        });
      }

      // Store resource in request for use in route handler
      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Error checking resource ownership',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware to add user context to request
 */
const addUserContext = (req, res, next) => {
  if (req.user) {
    req.userContext = {
      id: req.user.id,
      role: req.user.role,
      permissions: getUserPermissions(req.user.role),
      canAccess: (permission) => hasPermission(req.user.role, permission),
      isAdmin: req.user.role === 'admin',
      isSeller: req.user.role === 'seller',
      isViewer: req.user.role === 'viewer'
    };
  }
  next();
};

/**
 * Utility function to check multiple permissions
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasAnyPermission = permissions.some(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Utility function to check all permissions
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const hasAllPermissions = permissions.every(permission => 
      hasPermission(req.user.role, permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        userRole: req.user.role
      });
    }

    next();
  };
};

module.exports = {
  // Permission checking utilities
  hasPermission,
  hasRoleLevel,
  getUserPermissions,
  
  // Basic role middleware
  requireAdmin,
  requireAdminOrSeller,
  requirePermission,
  requireRoleLevel,
  
  // Ownership middleware
  requireOwnershipOrAdmin,
  filterByOwnership,
  canAccessUser,
  canModifyResource,
  
  // Context middleware
  addUserContext,
  
  // Multiple permission middleware
  requireAnyPermission,
  requireAllPermissions,
  
  // Role permissions for reference
  ROLE_PERMISSIONS
};
const ActivityLog = require('../models/ActivityLog');

/**
 * Middleware to automatically log user activities
 * This should be used after authentication middleware
 */
const logActivity = (actionType, entity, descriptionGenerator) => {
  return async (req, res, next) => {
    try {
      // Record request start time for response time calculation
      req.startTime = Date.now();
      
      // Store the original res.json method
      const originalJson = res.json;
      
      // Override res.json to capture the response
      res.json = function(data) {
        // Only log if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Call the logging function asynchronously without waiting
          logActivityAsync(req, res, actionType, entity, descriptionGenerator, data);
        }
        
        // Call the original res.json
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Activity logging middleware error:', error);
      next(); // Continue even if logging fails
    }
  };
};

/**
 * Async function to log activity without blocking the response
 */
const logActivityAsync = async (req, res, actionType, entity, descriptionGenerator, responseData) => {
  try {
    // Skip logging for certain actions or if no user is authenticated
    if (!req.user || !req.user.id) {
      return;
    }

    // Generate description based on the response data or request
    let description;
    if (typeof descriptionGenerator === 'function') {
      description = descriptionGenerator(req, responseData);
    } else {
      description = descriptionGenerator || `${actionType.replace(/_/g, ' ')} ${entity}`;
    }

    // Determine entity ID based on response data or request params
    let entityId = null;
    
    // Check response data first (for create/update operations)
    if (responseData && responseData.data) {
      // Handle nested object responses like { data: { passenger: { _id: ... } } }
      if (responseData.data.passenger && responseData.data.passenger._id) {
        entityId = responseData.data.passenger._id;
      } else if (responseData.data.client && responseData.data.client._id) {
        entityId = responseData.data.client._id;
      } else if (responseData.data.provider && responseData.data.provider._id) {
        entityId = responseData.data.provider._id;
      } else if (responseData.data.service && responseData.data.service._id) {
        entityId = responseData.data.service._id;
      } else if (responseData.data.sale && responseData.data.sale._id) {
        entityId = responseData.data.sale._id;
      } else if (responseData.data.payment && responseData.data.payment._id) {
        entityId = responseData.data.payment._id;
      } else if (responseData.data.cupo && responseData.data.cupo._id) {
        entityId = responseData.data.cupo._id;
      } else if (responseData.data.notification && responseData.data.notification._id) {
        entityId = responseData.data.notification._id;
      } else if (responseData.data.user && responseData.data.user._id) {
        entityId = responseData.data.user._id;
      }
      // Handle direct object responses like { data: { _id: ... } }
      else if (responseData.data._id) {
        entityId = responseData.data._id;
      } else if (responseData.data.id) {
        entityId = responseData.data.id;
      }
    }
    
    // Fallback to request parameters
    if (!entityId) {
      if (req.params.id) {
        entityId = req.params.id;
      } else if (req.params.passengerId) {
        entityId = req.params.passengerId;
      } else if (req.params.clientId) {
        entityId = req.params.clientId;
      } else if (req.params.providerId) {
        entityId = req.params.providerId;
      } else if (req.params.serviceId) {
        entityId = req.params.serviceId;
      } else if (req.params.saleId) {
        entityId = req.params.saleId;
      } else if (req.params.paymentId) {
        entityId = req.params.paymentId;
      } else if (req.params.cupoId) {
        entityId = req.params.cupoId;
      } else if (req.params.notificationId) {
        entityId = req.params.notificationId;
      } else if (entity === 'user') {
        // For user actions, use the user's ID as entityId
        entityId = req.user?.id || req.user?.user?.id;
      }
    }

    // Create activity log entry
    const activityLogData = {
      user: {
        id: req.user?.id || req.user?.user?.id,
        username: req.user?.username || req.user?.user?.username,
        email: req.user?.email || req.user?.user?.email
      },
      action: {
        type: actionType,
        description: description,
        entity: entity
      },
      metadata: {
        ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        referer: req.get('Referer'),
        additionalData: {
          requestBody: req.method !== 'GET' ? req.body : undefined,
          queryParams: Object.keys(req.query).length > 0 ? req.query : undefined,
          responseStatus: res.statusCode,
          responseTime: Date.now() - req.startTime,
          sessionId: req.sessionID,
          contentType: req.get('Content-Type'),
          acceptLanguage: req.get('Accept-Language'),
          timestamp: new Date().toISOString()
        }
      }
    };

    // Only add entityId for non-system actions
    const systemActions = ['system_backup', 'system_reset', 'system_health_check', 'system_cache_clear'];
    if (!systemActions.includes(actionType)) {
      // Debug logging to understand why entityId is null
      if (!entityId) {
        console.log('Debug - entityId is null for action:', actionType, 'entity:', entity);
        console.log('Debug - req.params:', req.params);
        console.log('Debug - responseData:', responseData);
        // Skip logging this activity if we can't determine the entityId
        console.log('Skipping activity log due to missing entityId');
        return;
      }
      activityLogData.action.entityId = entityId;
    }

    const activityLog = new ActivityLog(activityLogData);
    await activityLog.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main request
  }
};

/**
 * Predefined activity logging functions for common actions
 */
const activityLoggers = {
  // User actions
  userLogin: logActivity('user_login', 'user', 'User logged in'),
  userLogout: logActivity('user_logout', 'user', 'User logged out'),
  userRegistration: logActivity('user_registration', 'user', (req, data) => 
    `New user registered: ${data?.data?.username || 'Unknown'}`),
  userUpdate: logActivity('user_update', 'user', (req, data) => 
    `User updated: ${req.user?.username || 'Unknown'}`),
  userDelete: logActivity('user_delete', 'user', (req, data) => 
    `User deleted: ${req.params.id}`),

  // Client actions
  clientCreate: logActivity('client_create', 'client', (req, data) => 
    `Created new client: ${data?.data?.name || 'Unknown'}`),
  clientUpdate: logActivity('client_update', 'client', (req, data) => 
    `Updated client information: ${data?.data?.name || req.params.id}`),
  clientDelete: logActivity('client_delete', 'client', (req, data) => 
    `Deleted client: ${req.params.id}`),

  // Passenger actions
  passengerCreate: logActivity('passenger_create', 'passenger', (req, data) => 
    `Created new passenger: ${data?.data?.firstName || 'Unknown'} ${data?.data?.lastName || ''}`),
  passengerUpdate: logActivity('passenger_update', 'passenger', (req, data) => 
    `Updated passenger information: ${data?.data?.firstName || req.params.id}`),
  passengerDelete: logActivity('passenger_delete', 'passenger', (req, data) => 
    `Deleted passenger: ${req.params.id}`),

  // Provider actions
  providerCreate: logActivity('provider_create', 'provider', (req, data) => 
    `Created new provider: ${data?.data?.name || 'Unknown'}`),
  providerUpdate: logActivity('provider_update', 'provider', (req, data) => 
    `Updated provider information: ${data?.data?.name || req.params.id}`),
  providerDelete: logActivity('provider_delete', 'provider', (req, data) => 
    `Deleted provider: ${req.params.id}`),

  // Service actions
  serviceCreate: logActivity('service_create', 'service', (req, data) => 
    `Created new service: ${data?.data?.title || 'Unknown'}`),
  serviceUpdate: logActivity('service_update', 'service', (req, data) => 
    `Updated service: ${data?.data?.title || req.params.id}`),
  serviceDelete: logActivity('service_delete', 'service', (req, data) => 
    `Deleted service: ${req.params.id}`),

  // Sale actions
  saleCreate: logActivity('sale_create', 'sale', (req, data) => 
    `Created new sale: ${data?.data?.saleNumber || 'Unknown'}`),
  saleUpdate: logActivity('sale_update', 'sale', (req, data) => 
    `Updated sale: ${data?.data?.saleNumber || req.params.id}`),
  saleDelete: logActivity('sale_delete', 'sale', (req, data) => 
    `Deleted sale: ${req.params.id}`),

  // Payment actions
  paymentCreate: logActivity('payment_create', 'payment', (req, data) => 
    `Created new payment: ${data?.data?.amount || 'Unknown amount'}`),
  paymentUpdate: logActivity('payment_update', 'payment', (req, data) => 
    `Updated payment: ${data?.data?.amount || req.params.id}`),
  paymentDelete: logActivity('payment_delete', 'payment', (req, data) => 
    `Deleted payment: ${req.params.id}`),

  // Cupo actions
  cupoCreate: logActivity('cupo_create', 'cupo', (req, data) => 
    `Created new cupo: ${data?.data?.serviceName || 'Unknown service'}`),
  cupoUpdate: logActivity('cupo_update', 'cupo', (req, data) => 
    `Updated cupo: ${data?.data?.serviceName || req.params.id}`),
  cupoDelete: logActivity('cupo_delete', 'cupo', (req, data) => 
    `Deleted cupo: ${req.params.id}`),

  // Notification actions
  notificationCreate: logActivity('notification_create', 'notification', (req, data) => 
    `Created new notification: ${data?.data?.type || 'Unknown type'}`),
  notificationSend: logActivity('notification_send', 'notification', (req, data) => 
    `Sent notification: ${data?.data?.type || 'Unknown type'}`),

  // System actions
  systemBackup: logActivity('system_backup', 'system', 'Database backup created'),
  systemReset: logActivity('system_reset', 'system', 'Database reset performed'),
  systemHealthCheck: logActivity('system_health_check', 'system', 'System health check performed'),
  systemCacheClear: logActivity('system_cache_clear', 'system', 'System cache cleared'),

  // Document upload actions
  documentUpload: logActivity('document_upload', 'document', (req, data) => 
    `Document uploaded: ${req.file?.originalname || 'Unknown file'}`),
  passportOcr: logActivity('passport_ocr', 'passport', (req, data) => 
    `Passport OCR processed: ${req.file?.originalname || 'Unknown file'}`)
};

/**
 * Manual activity logging function for cases where req.user is not available
 */
const logActivityManually = async (userInfo, actionType, entity, description, metadata = {}) => {
  try {
    const ActivityLog = require('../models/ActivityLog');
    
    const activityLog = new ActivityLog({
      user: {
        id: userInfo.id,
        username: userInfo.username,
        email: userInfo.email
      },
      action: {
        type: actionType,
        description: description,
        entity: entity,
        entityId: userInfo.id // For user actions, use user ID as entity ID
      },
      metadata: {
        ipAddress: metadata.ipAddress || null,
        userAgent: metadata.userAgent || null,
        method: metadata.method || 'POST',
        url: metadata.url || '/api/auth/login',
        referer: metadata.referer || null,
        additionalData: {
          requestBody: metadata.requestBody || undefined,
          queryParams: metadata.queryParams || undefined,
          responseStatus: metadata.responseStatus || 200,
          responseTime: metadata.responseTime || 0,
          sessionId: metadata.sessionId || null,
          contentType: metadata.contentType || 'application/json',
          acceptLanguage: metadata.acceptLanguage || null,
          timestamp: new Date().toISOString()
        }
      }
    });

    await activityLog.save();
  } catch (error) {
    console.error('Failed to log activity manually:', error);
    // Don't throw error to avoid breaking the main request
  }
};

module.exports = {
  logActivity,
  logActivityAsync,
  logActivityManually,
  activityLoggers
};
const winston = require('winston');

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'travel-ai-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, code = null, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

class ExternalServiceError extends AppError {
  constructor(service, message = 'External service error') {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

// Error codes mapping
const ERROR_CODES = {
  // Authentication & Authorization
  AUTH_REQUIRED: { statusCode: 401, message: 'Authentication required' },
  AUTH_INVALID_TOKEN: { statusCode: 401, message: 'Invalid or expired token' },
  AUTH_INVALID_CREDENTIALS: { statusCode: 401, message: 'Invalid credentials' },
  AUTH_TOKEN_EXPIRED: { statusCode: 401, message: 'Token has expired' },
  
  // Authorization
  INSUFFICIENT_PERMISSIONS: { statusCode: 403, message: 'Insufficient permissions' },
  ADMIN_REQUIRED: { statusCode: 403, message: 'Admin access required' },
  OWNERSHIP_REQUIRED: { statusCode: 403, message: 'Access denied: Resource ownership required' },
  
  // Validation
  VALIDATION_ERROR: { statusCode: 400, message: 'Validation failed' },
  INVALID_INPUT: { statusCode: 400, message: 'Invalid input data' },
  MISSING_REQUIRED_FIELD: { statusCode: 400, message: 'Required field is missing' },
  INVALID_FORMAT: { statusCode: 400, message: 'Invalid data format' },
  
  // Resources
  NOT_FOUND: { statusCode: 404, message: 'Resource not found' },
  RESOURCE_NOT_FOUND: { statusCode: 404, message: 'Requested resource not found' },
  USER_NOT_FOUND: { statusCode: 404, message: 'User not found' },
  CLIENT_NOT_FOUND: { statusCode: 404, message: 'Client not found' },
  SALE_NOT_FOUND: { statusCode: 404, message: 'Sale not found' },
  
  // Conflicts
  CONFLICT: { statusCode: 409, message: 'Resource conflict' },
  DUPLICATE_ENTRY: { statusCode: 409, message: 'Duplicate entry' },
  EMAIL_ALREADY_EXISTS: { statusCode: 409, message: 'Email already exists' },
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: { statusCode: 429, message: 'Too many requests' },
  
  // External Services
  EXTERNAL_SERVICE_ERROR: { statusCode: 502, message: 'External service error' },
  SENDGRID_ERROR: { statusCode: 502, message: 'Email service error' },
  TWILIO_ERROR: { statusCode: 502, message: 'SMS service error' },
  AWS_S3_ERROR: { statusCode: 502, message: 'File storage service error' },
  CLOUDINARY_ERROR: { statusCode: 502, message: 'Image service error' },
  
  // Database
  DATABASE_ERROR: { statusCode: 500, message: 'Database error' },
  CONNECTION_ERROR: { statusCode: 500, message: 'Database connection error' },
  
  // General
  INTERNAL_ERROR: { statusCode: 500, message: 'Internal server error' },
  UNKNOWN_ERROR: { statusCode: 500, message: 'An unknown error occurred' }
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    code: err.code,
    stack: err.stack,
    details: err.details || null
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      error: 'Something went wrong!',
      code: 'INTERNAL_ERROR'
    });
  }
};

/**
 * Handle Mongoose validation errors
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ValidationError(message, errors);
};

/**
 * Handle Mongoose duplicate key errors
 */
const handleDuplicateFieldsDB = (err) => {
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new ConflictError(message);
};

/**
 * Handle Mongoose cast errors
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ValidationError(message);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => new AuthenticationError('Invalid token. Please log in again!');

const handleJWTExpiredError = () => new AuthenticationError('Your token has expired! Please log in again.');

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error
  logger.error({
    message: err.message,
    code: err.code,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    timestamp: new Date().toISOString()
  });

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationError(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

/**
 * Handle unhandled routes
 */
const notFound = (req, res, next) => {
  const err = new NotFoundError(`Can't find ${req.originalUrl} on this server!`);
  next(err);
};

/**
 * Async error wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Create error from code
 */
const createError = (code, customMessage = null) => {
  const errorConfig = ERROR_CODES[code];
  if (!errorConfig) {
    return new AppError('Unknown error', 500, 'UNKNOWN_ERROR');
  }
  
  const message = customMessage || errorConfig.message;
  return new AppError(message, errorConfig.statusCode, code);
};

/**
 * Validation error handler
 */
const handleValidationErrors = (errors) => {
  if (Array.isArray(errors)) {
    return new ValidationError('Validation failed', errors);
  }
  
  if (errors.array) {
    // express-validator errors
    const errorMessages = errors.array().map(err => err.msg);
    return new ValidationError('Validation failed', errorMessages);
  }
  
  return new ValidationError('Validation failed');
};

/**
 * Rate limit error handler
 */
const handleRateLimit = (req, res, next) => {
  const err = new RateLimitError('Too many requests from this IP, please try again later.');
  next(err);
};

/**
 * Security error handler
 */
const handleSecurityError = (req, res, next) => {
  const err = new AuthorizationError('Security violation detected');
  next(err);
};

/**
 * Database connection error handler
 */
const handleDatabaseError = (err) => {
  logger.error('Database connection error:', err);
  return new AppError('Database connection failed', 500, 'DATABASE_ERROR');
};

/**
 * External service error handler
 */
const handleExternalServiceError = (service, error) => {
  logger.error(`${service} service error:`, error);
  return new ExternalServiceError(service, error.message);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  
  // Error codes
  ERROR_CODES,
  
  // Main middleware
  errorHandler,
  notFound,
  catchAsync,
  
  // Utility functions
  createError,
  handleValidationErrors,
  handleRateLimit,
  handleSecurityError,
  handleDatabaseError,
  handleExternalServiceError,
  
  // Logger
  logger
};
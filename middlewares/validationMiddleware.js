const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');

/**
 * Handle validation results
 */
const handleValidationResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    throw new ValidationError('Validation failed', errorMessages);
  }
  next();
};

/**
 * Common validation rules
 */
const commonValidations = {
  // ObjectId validation
  objectId: (field) => param(field).isMongoId().withMessage('Invalid ID format'),
  
  // Email validation
  email: (field = 'email') => body(field)
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  // Password validation
  password: (field = 'password') => body(field)
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  // Phone validation
  phone: (field = 'phone') => body(field)
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  
  // Date validation
  date: (field) => body(field)
    .isISO8601()
    .withMessage('Please provide a valid date in ISO format'),
  
  // Currency validation
  currency: (field) => body(field)
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'])
    .withMessage('Please provide a valid currency code'),
  
  // Positive number validation
  positiveNumber: (field) => body(field)
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  
  // Required string validation
  requiredString: (field, minLength = 1, maxLength = 255) => body(field)
    .trim()
    .isLength({ min: minLength, max: maxLength })
    .withMessage(`Field must be between ${minLength} and ${maxLength} characters`),
  
  // Optional string validation
  optionalString: (field, maxLength = 255) => body(field)
    .optional()
    .trim()
    .isLength({ max: maxLength })
    .withMessage(`Field must not exceed ${maxLength} characters`),
  
  // Role validation
  role: (field = 'role') => body(field)
    .isIn(['admin', 'seller', 'viewer'])
    .withMessage('Role must be admin, seller, or viewer'),
  
  // Status validation
  status: (field, allowedStatuses = ['active', 'inactive', 'pending']) => body(field)
    .optional()
    .isIn(allowedStatuses)
    .withMessage(`Status must be one of: ${allowedStatuses.join(', ')}`),
  
  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
  ]
};

/**
 * User validation rules
 */
const userValidations = {
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    commonValidations.email(),
    commonValidations.password(),
    commonValidations.role(),
    
    handleValidationResults
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    
    handleValidationResults
  ],
  
  updateProfile: [
    commonValidations.optionalString('username', 30),
    commonValidations.email('email').optional(),
    commonValidations.phone(),
    
    handleValidationResults
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    commonValidations.password('newPassword'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      }),
    
    handleValidationResults
  ]
};

/**
 * Client validation rules
 */
const clientValidations = {
  create: [
    commonValidations.requiredString('name', 1, 50),
    commonValidations.requiredString('surname', 1, 50),
    
    body('dob')
      .isISO8601()
      .withMessage('Please provide a valid date of birth')
      .custom((value) => {
        const dob = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 0 || age > 120) {
          throw new Error('Please provide a valid date of birth');
        }
        return true;
      }),
    
    commonValidations.email(),
    commonValidations.phone(),
    
    body('passportNumber')
      .trim()
      .isLength({ min: 5, max: 20 })
      .withMessage('Passport number must be between 5 and 20 characters'),
    
    body('nationality')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Nationality must be between 2 and 50 characters'),
    
    body('expirationDate')
      .isISO8601()
      .withMessage('Please provide a valid passport expiration date')
      .custom((value) => {
        const expDate = new Date(value);
        const today = new Date();
        if (expDate <= today) {
          throw new Error('Passport expiration date must be in the future');
        }
        return true;
      }),
    
    handleValidationResults
  ],
  
  update: [
    commonValidations.objectId('id'),
    commonValidations.optionalString('name', 1, 50),
    commonValidations.optionalString('surname', 1, 50),
    commonValidations.email('email').optional(),
    commonValidations.phone(),
    
    body('dob')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date of birth'),
    
    body('passportNumber')
      .optional()
      .trim()
      .isLength({ min: 5, max: 20 })
      .withMessage('Passport number must be between 5 and 20 characters'),
    
    body('nationality')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Nationality must be between 2 and 50 characters'),
    
    body('expirationDate')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid passport expiration date'),
    
    handleValidationResults
  ],
  
  getById: [
    commonValidations.objectId('id'),
    handleValidationResults
  ]
};

/**
 * Sale validation rules
 */
const saleValidations = {
  create: [
    body('clientId')
      .isMongoId()
      .withMessage('Please provide a valid client ID'),
    
    body('passengers')
      .isArray({ min: 1 })
      .withMessage('At least one passenger is required'),
    
    body('passengers.*.passengerId')
      .isMongoId()
      .withMessage('Please provide valid passenger IDs'),
    
    body('passengers.*.price')
      .isFloat({ min: 0 })
      .withMessage('Passenger price must be a positive number'),
    
    body('services')
      .isArray({ min: 1 })
      .withMessage('At least one service is required'),
    
    body('services.*.serviceId')
      .isMongoId()
      .withMessage('Please provide valid service IDs'),
    
    body('services.*.priceClient')
      .isFloat({ min: 0 })
      .withMessage('Client price must be a positive number'),
    
    body('services.*.costProvider')
      .isFloat({ min: 0 })
      .withMessage('Provider cost must be a positive number'),
    
    body('services.*.currency')
      .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'])
      .withMessage('Please provide a valid currency code'),
    
    body('status')
      .optional()
      .isIn(['open', 'confirmed', 'cancelled', 'completed'])
      .withMessage('Invalid status'),
    
    handleValidationResults
  ],
  
  update: [
    commonValidations.objectId('id'),
    
    body('clientId')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid client ID'),
    
    body('status')
      .optional()
      .isIn(['open', 'confirmed', 'cancelled', 'completed'])
      .withMessage('Invalid status'),
    
    handleValidationResults
  ],
  
  getById: [
    commonValidations.objectId('id'),
    handleValidationResults
  ]
};

/**
 * Payment validation rules
 */
const paymentValidations = {
  create: [
    body('saleId')
      .isMongoId()
      .withMessage('Please provide a valid sale ID'),
    
    body('type')
      .isIn(['client', 'provider'])
      .withMessage('Payment type must be client or provider'),
    
    body('method')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Payment method is required'),
    
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    
    body('currency')
      .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'CNY'])
      .withMessage('Please provide a valid currency code'),
    
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date'),
    
    handleValidationResults
  ],
  
  getBySale: [
    commonValidations.objectId('saleId'),
    handleValidationResults
  ]
};

/**
 * Provider validation rules
 */
const providerValidations = {
  create: [
    commonValidations.requiredString('name', 1, 100),
    
    body('type')
      .isIn(['hotel', 'airline', 'transfer', 'excursion', 'insurance'])
      .withMessage('Provider type must be hotel, airline, transfer, excursion, or insurance'),
    
    body('contactInfo.phone')
      .optional()
      .isMobilePhone()
      .withMessage('Please provide a valid phone number'),
    
    body('contactInfo.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
    
    body('contactInfo.address')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Address must not exceed 500 characters'),
    
    handleValidationResults
  ],
  
  update: [
    commonValidations.objectId('id'),
    commonValidations.optionalString('name', 1, 100),
    
    body('type')
      .optional()
      .isIn(['hotel', 'airline', 'transfer', 'excursion', 'insurance'])
      .withMessage('Invalid provider type'),
    
    handleValidationResults
  ]
};

/**
 * Service validation rules
 */
const serviceValidations = {
  create: [
    commonValidations.requiredString('title', 1, 100),
    
    body('type')
      .isIn(['accommodation', 'transportation', 'activity', 'insurance', 'other'])
      .withMessage('Invalid service type'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    
    body('providerId')
      .isMongoId()
      .withMessage('Please provide a valid provider ID'),
    
    body('cost')
      .isFloat({ min: 0 })
      .withMessage('Cost must be a positive number'),
    
    commonValidations.currency('currency'),
    
    handleValidationResults
  ],
  
  update: [
    commonValidations.objectId('id'),
    commonValidations.optionalString('title', 1, 100),
    
    body('type')
      .optional()
      .isIn(['accommodation', 'transportation', 'activity', 'insurance', 'other'])
      .withMessage('Invalid service type'),
    
    body('cost')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Cost must be a positive number'),
    
    handleValidationResults
  ]
};

/**
 * Cupo validation rules
 */
const cupoValidations = {
  create: [
    body('serviceId')
      .isMongoId()
      .withMessage('Please provide a valid service ID'),
    
    body('totalSeats')
      .isInt({ min: 1 })
      .withMessage('Total seats must be a positive integer'),
    
    body('metadata.date')
      .optional()
      .isISO8601()
      .withMessage('Please provide a valid date'),
    
    handleValidationResults
  ],
  
  reserve: [
    commonValidations.objectId('id'),
    
    body('seats')
      .isInt({ min: 1 })
      .withMessage('Number of seats must be a positive integer'),
    
    handleValidationResults
  ]
};

/**
 * Notification validation rules
 */
const notificationValidations = {
  send: [
    body('clientId')
      .isMongoId()
      .withMessage('Please provide a valid client ID'),
    
    body('type')
      .isIn(['trip_reminder', 'return_notification', 'passport_expiry', 'custom'])
      .withMessage('Invalid notification type'),
    
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Subject is required and must not exceed 200 characters'),
    
    body('emailContent')
      .optional()
      .trim()
      .isLength({ max: 10000 })
      .withMessage('Email content must not exceed 10000 characters'),
    
    body('whatsappContent')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('WhatsApp content must not exceed 1000 characters'),
    
    handleValidationResults
  ],
  
  updatePreferences: [
    commonValidations.objectId('id'),
    
    body('notificationPreferences.email')
      .optional()
      .isBoolean()
      .withMessage('Email preference must be a boolean'),
    
    body('notificationPreferences.whatsapp')
      .optional()
      .isBoolean()
      .withMessage('WhatsApp preference must be a boolean'),
    
    body('notificationPreferences.tripReminders')
      .optional()
      .isBoolean()
      .withMessage('Trip reminders preference must be a boolean'),
    
    body('notificationPreferences.returnNotifications')
      .optional()
      .isBoolean()
      .withMessage('Return notifications preference must be a boolean'),
    
    body('notificationPreferences.passportExpiry')
      .optional()
      .isBoolean()
      .withMessage('Passport expiry preference must be a boolean'),
    
    handleValidationResults
  ]
};

/**
 * Report validation rules
 */
const reportValidations = {
  sales: [
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .withMessage('Period must be daily, weekly, monthly, quarterly, or yearly'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be in ISO format'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be in ISO format'),
    
    handleValidationResults
  ],
  
  profit: [
    query('sellerId')
      .optional()
      .isMongoId()
      .withMessage('Please provide a valid seller ID'),
    
    query('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .withMessage('Invalid period'),
    
    handleValidationResults
  ]
};

/**
 * File upload validation
 */
const fileUploadValidations = {
  passport: [
    body('type')
      .isIn(['passport'])
      .withMessage('Invalid file type for passport upload'),
    
    handleValidationResults
  ],
  
  saleDocument: [
    body('type')
      .isIn(['ticket', 'invoice', 'receipt', 'contract', 'other'])
      .withMessage('Invalid document type'),
    
    handleValidationResults
  ],
  
  paymentReceipt: [
    body('type')
      .isIn(['receipt', 'invoice', 'proof'])
      .withMessage('Invalid receipt type'),
    
    handleValidationResults
  ]
};

module.exports = {
  // Common validations
  commonValidations,
  
  // Specific validation sets
  userValidations,
  clientValidations,
  saleValidations,
  paymentValidations,
  providerValidations,
  serviceValidations,
  cupoValidations,
  notificationValidations,
  reportValidations,
  fileUploadValidations,
  
  // Utility functions
  handleValidationResults
};
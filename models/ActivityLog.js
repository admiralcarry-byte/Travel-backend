const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required']
    },
    username: {
      type: String,
      required: [true, 'Username is required']
    },
    email: {
      type: String,
      required: [true, 'User email is required']
    }
  },
  action: {
    type: {
      type: String,
      required: [true, 'Action type is required'],
      enum: [
        'user_registration',
        'user_login',
        'user_logout',
        'user_update',
        'user_delete',
        'client_create',
        'client_update',
        'client_delete',
        'passenger_create',
        'passenger_update',
        'passenger_delete',
        'provider_create',
        'provider_update',
        'provider_delete',
        'service_create',
        'service_update',
        'service_delete',
        'sale_create',
        'sale_update',
        'sale_delete',
        'payment_create',
        'payment_update',
        'payment_delete',
        'cupo_create',
        'cupo_update',
        'cupo_delete',
        'notification_create',
        'notification_send',
        'document_upload',
        'passport_ocr',
        'system_backup',
        'system_reset',
        'system_health_check',
        'system_cache_clear'
      ]
    },
    description: {
      type: String,
      required: [true, 'Action description is required'],
      maxlength: [200, 'Description cannot exceed 200 characters']
    },
    entity: {
      type: String,
      enum: ['user', 'client', 'passenger', 'provider', 'service', 'sale', 'payment', 'cupo', 'notification', 'document', 'passport', 'system'],
      required: [true, 'Entity type is required']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function() {
        return !['system_backup', 'system_reset', 'system_health_check', 'system_cache_clear'].includes(this.action.type);
      }
    }
  },
  metadata: {
    ipAddress: {
      type: String,
      required: false
    },
    userAgent: {
      type: String,
      required: false
    },
    additionalData: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
activityLogSchema.index({ 'user.id': 1, timestamp: -1 });
activityLogSchema.index({ 'action.type': 1, timestamp: -1 });
activityLogSchema.index({ 'action.entity': 1, timestamp: -1 });
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ 'action.entityId': 1 });

// Virtual for formatted timestamp
activityLogSchema.virtual('formattedTimestamp').get(function() {
  return this.timestamp.toLocaleString();
});

// Method to get recent activities
activityLogSchema.statics.getRecentActivities = function(limit = 10, entityType = null) {
  const query = {};
  if (entityType) {
    query['action.entity'] = entityType;
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user.id', 'username email')
    .lean();
};

// Method to get activities by user
activityLogSchema.statics.getActivitiesByUser = function(userId, limit = 20) {
  return this.find({ 'user.id': userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user.id', 'username email')
    .lean();
};

// Method to get activities by entity
activityLogSchema.statics.getActivitiesByEntity = function(entityType, entityId, limit = 10) {
  return this.find({
    'action.entity': entityType,
    'action.entityId': entityId
  })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('user.id', 'username email')
    .lean();
};

// Pre-save middleware to ensure data consistency
activityLogSchema.pre('save', function(next) {
  // Ensure timestamp is set
  if (!this.timestamp) {
    this.timestamp = new Date();
  }
  
  // Ensure user data is populated if not already
  if (this.user.id && !this.user.username) {
    // This will be populated by the controller before saving
  }
  
  next();
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
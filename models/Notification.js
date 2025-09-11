const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: false // Optional for passport expiry notifications
  },
  type: {
    type: String,
    required: [true, 'Notification type is required'],
    enum: {
      values: ['trip_reminder', 'return_notification', 'passport_expiry', 'custom'],
      message: 'Notification type must be one of: trip_reminder, return_notification, passport_expiry, custom'
    }
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  emailSent: {
    sent: {
      type: Boolean,
      default: false
    },
    success: {
      type: Boolean,
      default: false
    },
    messageId: {
      type: String,
      trim: true
    },
    error: {
      type: String,
      trim: true
    },
    sentAt: {
      type: Date
    }
  },
  whatsappSent: {
    sent: {
      type: Boolean,
      default: false
    },
    success: {
      type: Boolean,
      default: false
    },
    messageId: {
      type: String,
      trim: true
    },
    error: {
      type: String,
      trim: true
    },
    sentAt: {
      type: Date
    }
  },
  content: {
    email: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    }
  },
  metadata: {
    tripDate: {
      type: Date
    },
    returnDate: {
      type: Date
    },
    passportExpiryDate: {
      type: Date
    },
    daysUntilExpiry: {
      type: Number
    },
    triggerReason: {
      type: String,
      trim: true
    }
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'sent', 'failed', 'partial'],
      message: 'Status must be one of: pending, sent, failed, partial'
    },
    default: 'pending'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional for automated notifications
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
notificationSchema.index({ clientId: 1 });
notificationSchema.index({ saleId: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'emailSent.sentAt': -1 });
notificationSchema.index({ 'whatsappSent.sentAt': -1 });

// Virtual for notification summary
notificationSchema.virtual('summary').get(function() {
  const emailStatus = this.emailSent.sent ? (this.emailSent.success ? 'success' : 'failed') : 'not_sent';
  const whatsappStatus = this.whatsappSent.sent ? (this.whatsappSent.success ? 'success' : 'failed') : 'not_sent';
  
  return {
    emailStatus,
    whatsappStatus,
    overallStatus: this.status
  };
});

// Virtual for formatted dates
notificationSchema.virtual('formattedCreatedAt').get(function() {
  return this.createdAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
});

// Pre-save middleware to update status and timestamp
notificationSchema.pre('save', function(next) {
  // Update status based on email and WhatsApp results
  if (this.emailSent.sent && this.whatsappSent.sent) {
    if (this.emailSent.success && this.whatsappSent.success) {
      this.status = 'sent';
    } else if (this.emailSent.success || this.whatsappSent.success) {
      this.status = 'partial';
    } else {
      this.status = 'failed';
    }
  } else if (this.emailSent.sent || this.whatsappSent.sent) {
    if ((this.emailSent.sent && this.emailSent.success) || 
        (this.whatsappSent.sent && this.whatsappSent.success)) {
      this.status = 'sent';
    } else {
      this.status = 'failed';
    }
  }

  this.updatedAt = new Date();
  next();
});

// Static method to find notifications by type and date range
notificationSchema.statics.findByTypeAndDateRange = function(type, startDate, endDate) {
  const query = { type };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .populate('clientId', 'name surname email phone')
    .populate('saleId', 'totalSalePrice status')
    .sort({ createdAt: -1 });
};

// Static method to get notification statistics
notificationSchema.statics.getStatistics = function(startDate, endDate) {
  const matchConditions = {};
  
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
    if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        sentNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        failedNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        partialNotifications: {
          $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
        },
        emailSent: {
          $sum: { $cond: ['$emailSent.sent', 1, 0] }
        },
        emailSuccess: {
          $sum: { $cond: ['$emailSent.success', 1, 0] }
        },
        whatsappSent: {
          $sum: { $cond: ['$whatsappSent.sent', 1, 0] }
        },
        whatsappSuccess: {
          $sum: { $cond: ['$whatsappSent.success', 1, 0] }
        }
      }
    }
  ]);
};

// Static method to get notification statistics by type
notificationSchema.statics.getStatisticsByType = function(startDate, endDate) {
  const matchConditions = {};
  
  if (startDate || endDate) {
    matchConditions.createdAt = {};
    if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
    if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        sent: { $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        partial: { $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to find pending notifications
notificationSchema.statics.findPending = function() {
  return this.find({ status: 'pending' })
    .populate('clientId', 'name surname email phone notificationPreferences')
    .populate('saleId', 'totalSalePrice status');
};

// Static method to find failed notifications
notificationSchema.statics.findFailed = function() {
  return this.find({ status: 'failed' })
    .populate('clientId', 'name surname email phone notificationPreferences')
    .populate('saleId', 'totalSalePrice status');
};

// Instance method to mark email as sent
notificationSchema.methods.markEmailSent = function(success, messageId, error) {
  this.emailSent = {
    sent: true,
    success,
    messageId: success ? messageId : null,
    error: success ? null : error,
    sentAt: new Date()
  };
  return this.save();
};

// Instance method to mark WhatsApp as sent
notificationSchema.methods.markWhatsAppSent = function(success, messageId, error) {
  this.whatsappSent = {
    sent: true,
    success,
    messageId: success ? messageId : null,
    error: success ? null : error,
    sentAt: new Date()
  };
  return this.save();
};

// Transform output
notificationSchema.methods.toJSON = function() {
  const notificationObject = this.toObject();
  notificationObject.summary = this.summary;
  notificationObject.formattedCreatedAt = this.formattedCreatedAt;
  return notificationObject;
};

module.exports = mongoose.model('Notification', notificationSchema);
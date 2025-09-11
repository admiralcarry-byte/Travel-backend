const mongoose = require('mongoose');

const contactInfoSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  website: {
    type: String,
    trim: true,
    maxlength: [200, 'Website URL cannot exceed 200 characters']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [100, 'Street address cannot exceed 100 characters']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    country: {
      type: String,
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [20, 'Zip code cannot exceed 20 characters']
    }
  }
});

const providerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Provider name is required'],
    trim: true,
    maxlength: [100, 'Provider name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Provider type is required'],
    enum: {
      values: ['hotel', 'airline', 'transfer', 'excursion', 'insurance', 'restaurant', 'tour_guide'],
      message: 'Provider type must be one of: hotel, airline, transfer, excursion, insurance, restaurant, tour_guide'
    }
  },
  contactInfo: {
    type: contactInfoSchema,
    required: [true, 'Contact information is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot exceed 5'],
    default: 0
  },
  totalBookings: {
    type: Number,
    default: 0,
    min: [0, 'Total bookings cannot be negative']
  },
  totalRevenue: {
    type: Number,
    default: 0,
    min: [0, 'Total revenue cannot be negative']
  },
  commissionRate: {
    type: Number,
    min: [0, 'Commission rate cannot be negative'],
    max: [100, 'Commission rate cannot exceed 100%'],
    default: 10
  },
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net_15', 'net_30', 'net_45', 'net_60'],
    default: 'net_30'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'terminated'],
    default: 'active'
  },
  contractStartDate: {
    type: Date,
    default: null
  },
  contractEndDate: {
    type: Date,
    default: null
  },
  specializations: [{
    type: String,
    trim: true,
    maxlength: [50, 'Specialization cannot exceed 50 characters']
  }],
  certifications: [{
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Certification name cannot exceed 100 characters']
    },
    issuer: {
      type: String,
      trim: true,
      maxlength: [100, 'Certification issuer cannot exceed 100 characters']
    },
    expiryDate: {
      type: Date,
      default: null
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
providerSchema.index({ name: 1 });
providerSchema.index({ type: 1 });
providerSchema.index({ 'contactInfo.email': 1 });
providerSchema.index({ status: 1 });
providerSchema.index({ createdBy: 1 });
providerSchema.index({ rating: -1 });
providerSchema.index({ totalBookings: -1 });
providerSchema.index({ totalRevenue: -1 });

// Virtual for provider display name
providerSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.type.charAt(0).toUpperCase() + this.type.slice(1)})`;
});

// Virtual for formatted address
providerSchema.virtual('formattedAddress').get(function() {
  if (!this.contactInfo.address) return null;
  
  const parts = [];
  if (this.contactInfo.address.street) parts.push(this.contactInfo.address.street);
  if (this.contactInfo.address.city) parts.push(this.contactInfo.address.city);
  if (this.contactInfo.address.state) parts.push(this.contactInfo.address.state);
  if (this.contactInfo.address.zipCode) parts.push(this.contactInfo.address.zipCode);
  if (this.contactInfo.address.country) parts.push(this.contactInfo.address.country);
  
  return parts.join(', ');
});

// Virtual for contract status
providerSchema.virtual('contractStatus').get(function() {
  if (!this.contractStartDate || !this.contractEndDate) return 'no_contract';
  
  const now = new Date();
  if (now < this.contractStartDate) return 'not_started';
  if (now > this.contractEndDate) return 'expired';
  return 'active';
});

// Virtual for average revenue per booking
providerSchema.virtual('averageRevenuePerBooking').get(function() {
  if (this.totalBookings === 0) return 0;
  return (this.totalRevenue / this.totalBookings).toFixed(2);
});

// Instance method to update booking statistics
providerSchema.methods.updateBookingStats = function(revenue) {
  this.totalBookings += 1;
  this.totalRevenue += revenue;
  return this.save();
};

// Instance method to check if contract is expiring
providerSchema.methods.isContractExpiring = function(daysThreshold = 30) {
  if (!this.contractEndDate) return false;
  
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return this.contractEndDate <= thresholdDate;
};

// Instance method to check if certifications are expiring
providerSchema.methods.getExpiringCertifications = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.certifications.filter(cert => 
    cert.expiryDate && cert.expiryDate <= thresholdDate
  );
};

// Static method to find providers by type
providerSchema.statics.findByType = function(type) {
  return this.find({ type, status: 'active' });
};

// Static method to find top-rated providers
providerSchema.statics.findTopRated = function(limit = 10) {
  return this.find({ status: 'active' })
    .sort({ rating: -1, totalBookings: -1 })
    .limit(limit);
};

// Static method to find providers with expiring contracts
providerSchema.statics.findExpiringContracts = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    contractEndDate: { $lte: thresholdDate },
    status: 'active'
  });
};

// Static method to get provider statistics
providerSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalProviders: { $sum: 1 },
        activeProviders: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        inactiveProviders: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        suspendedProviders: { $sum: { $cond: [{ $eq: ['$status', 'suspended'] }, 1, 0] } },
        totalBookings: { $sum: '$totalBookings' },
        totalRevenue: { $sum: '$totalRevenue' },
        averageRating: { $avg: '$rating' },
        averageCommissionRate: { $avg: '$commissionRate' }
      }
    }
  ]);
};

// Static method to get statistics by provider type
providerSchema.statics.getStatisticsByType = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        activeCount: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        totalBookings: { $sum: '$totalBookings' },
        totalRevenue: { $sum: '$totalRevenue' },
        averageRating: { $avg: '$rating' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Transform output
providerSchema.methods.toJSON = function() {
  const providerObject = this.toObject();
  providerObject.displayName = this.displayName;
  providerObject.formattedAddress = this.formattedAddress;
  providerObject.contractStatus = this.contractStatus;
  providerObject.averageRevenuePerBooking = this.averageRevenuePerBooking;
  return providerObject;
};

module.exports = mongoose.model('Provider', providerSchema);
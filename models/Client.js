const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  surname: {
    type: String,
    required: [true, 'Surname is required'],
    trim: true,
    maxlength: [50, 'Surname cannot exceed 50 characters']
  },
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters']
  },
  passportNumber: {
    type: String,
    required: [true, 'Passport number is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [20, 'Passport number cannot exceed 20 characters']
  },
  passportImage: {
    type: String,
    default: null // URL/path to uploaded image
  },
  nationality: {
    type: String,
    required: [true, 'Nationality is required'],
    trim: true,
    maxlength: [50, 'Nationality cannot exceed 50 characters']
  },
  expirationDate: {
    type: Date,
    required: [true, 'Passport expiration date is required']
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
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters']
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [20, 'Emergency contact phone cannot exceed 20 characters']
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters']
    }
  },
  preferences: {
    dietary: {
      type: String,
      trim: true,
      maxlength: [200, 'Dietary preferences cannot exceed 200 characters']
    },
    medical: {
      type: String,
      trim: true,
      maxlength: [200, 'Medical information cannot exceed 200 characters']
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: [500, 'Special requests cannot exceed 500 characters']
    }
  },
  notificationPreferences: {
    email: {
      type: Boolean,
      default: true
    },
    whatsapp: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    tripReminders: {
      type: Boolean,
      default: true
    },
    returnNotifications: {
      type: Boolean,
      default: true
    },
    passportExpiry: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: [0, 'Total spent cannot be negative']
  },
  lastTripDate: {
    type: Date,
    default: null
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  }
}, {
  timestamps: true
});

// Indexes for better query performance (email and passportNumber already indexed by unique: true)
clientSchema.index({ phone: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ createdBy: 1 });
clientSchema.index({ lastTripDate: -1 });
clientSchema.index({ totalSpent: -1 });

// Virtual for full name
clientSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`;
});

// Virtual for passport validity
clientSchema.virtual('isPassportValid').get(function() {
  return this.expirationDate > new Date();
});

// Virtual for passport expiry warning (30 days)
clientSchema.virtual('passportExpiryWarning').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expirationDate <= thirtyDaysFromNow;
});

// Virtual for age
clientSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for formatted address
clientSchema.virtual('formattedAddress').get(function() {
  if (!this.address) return null;
  
  const parts = [];
  if (this.address.street) parts.push(this.address.street);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.state) parts.push(this.address.state);
  if (this.address.zipCode) parts.push(this.address.zipCode);
  if (this.address.country) parts.push(this.address.country);
  
  return parts.join(', ');
});

// Instance method to update total spent
clientSchema.methods.updateTotalSpent = function(amount) {
  this.totalSpent += amount;
  this.lastTripDate = new Date();
  return this.save();
};

// Instance method to check if passport needs renewal
clientSchema.methods.needsPassportRenewal = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return this.expirationDate <= thresholdDate;
};

// Static method to find clients with expiring passports
clientSchema.statics.findExpiringPassports = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    expirationDate: { $lte: thresholdDate },
    status: 'active',
    'notificationPreferences.passportExpiry': true
  });
};

// Static method to find active clients
clientSchema.statics.findActive = function() {
  return this.find({ status: 'active' });
};

// Static method to get client statistics
clientSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalClients: { $sum: 1 },
        activeClients: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        inactiveClients: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        blockedClients: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
        totalRevenue: { $sum: '$totalSpent' },
        averageSpent: { $avg: '$totalSpent' }
      }
    }
  ]);
};

// Transform output
clientSchema.methods.toJSON = function() {
  const clientObject = this.toObject();
  clientObject.fullName = this.fullName;
  clientObject.isPassportValid = this.isPassportValid;
  clientObject.passportExpiryWarning = this.passportExpiryWarning;
  clientObject.age = this.age;
  clientObject.formattedAddress = this.formattedAddress;
  return clientObject;
};

module.exports = mongoose.model('Client', clientSchema);
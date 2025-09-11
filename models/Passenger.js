const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
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
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: [true, 'Gender is required']
  },
  seatPreference: {
    type: String,
    enum: ['window', 'aisle', 'middle', 'no_preference'],
    default: 'no_preference'
  },
  mealPreference: {
    type: String,
    enum: ['regular', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'no_preference'],
    default: 'no_preference'
  },
  specialRequests: {
    type: String,
    trim: true,
    maxlength: [500, 'Special requests cannot exceed 500 characters']
  },
  medicalInfo: {
    type: String,
    trim: true,
    maxlength: [200, 'Medical information cannot exceed 200 characters']
  },
  frequentFlyerNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Frequent flyer number cannot exceed 50 characters']
  },
  visaInfo: {
    required: {
      type: Boolean,
      default: false
    },
    status: {
      type: String,
      enum: ['not_required', 'required', 'applied', 'approved', 'rejected', 'expired'],
      default: 'not_required'
    },
    expiryDate: {
      type: Date,
      default: null
    },
    visaNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Visa number cannot exceed 50 characters']
    }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'deceased'],
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  }
}, {
  timestamps: true
});

// Indexes for better query performance
passengerSchema.index({ clientId: 1 });
passengerSchema.index({ passportNumber: 1 });
passengerSchema.index({ status: 1 });
passengerSchema.index({ createdBy: 1 });
passengerSchema.index({ nationality: 1 });
passengerSchema.index({ expirationDate: 1 });

// Virtual for full name
passengerSchema.virtual('fullName').get(function() {
  return `${this.name} ${this.surname}`;
});

// Virtual for passport validity
passengerSchema.virtual('isPassportValid').get(function() {
  return this.expirationDate > new Date();
});

// Virtual for passport expiry warning (30 days)
passengerSchema.virtual('passportExpiryWarning').get(function() {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  return this.expirationDate <= thirtyDaysFromNow;
});

// Virtual for age
passengerSchema.virtual('age').get(function() {
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for age category
passengerSchema.virtual('ageCategory').get(function() {
  const age = this.age;
  if (age < 2) return 'infant';
  if (age < 12) return 'child';
  if (age < 18) return 'teen';
  if (age < 65) return 'adult';
  return 'senior';
});

// Virtual for visa validity
passengerSchema.virtual('isVisaValid').get(function() {
  if (!this.visaInfo.required || this.visaInfo.status !== 'approved') {
    return true; // No visa required or not approved
  }
  return this.visaInfo.expiryDate && this.visaInfo.expiryDate > new Date();
});

// Instance method to check if passport needs renewal
passengerSchema.methods.needsPassportRenewal = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return this.expirationDate <= thresholdDate;
};

// Instance method to check if visa needs renewal
passengerSchema.methods.needsVisaRenewal = function(daysThreshold = 30) {
  if (!this.visaInfo.required || this.visaInfo.status !== 'approved') {
    return false;
  }
  
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  return this.visaInfo.expiryDate && this.visaInfo.expiryDate <= thresholdDate;
};

// Static method to find passengers with expiring passports
passengerSchema.statics.findExpiringPassports = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    expirationDate: { $lte: thresholdDate },
    status: 'active'
  }).populate('clientId', 'name surname email notificationPreferences');
};

// Static method to find passengers with expiring visas
passengerSchema.statics.findExpiringVisas = function(daysThreshold = 30) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);
  
  return this.find({
    'visaInfo.required': true,
    'visaInfo.status': 'approved',
    'visaInfo.expiryDate': { $lte: thresholdDate },
    status: 'active'
  }).populate('clientId', 'name surname email notificationPreferences');
};

// Static method to find passengers by age category
passengerSchema.statics.findByAgeCategory = function(ageCategory) {
  const today = new Date();
  let minAge, maxAge;
  
  switch (ageCategory) {
    case 'infant':
      minAge = 0;
      maxAge = 1;
      break;
    case 'child':
      minAge = 2;
      maxAge = 11;
      break;
    case 'teen':
      minAge = 12;
      maxAge = 17;
      break;
    case 'adult':
      minAge = 18;
      maxAge = 64;
      break;
    case 'senior':
      minAge = 65;
      maxAge = 120;
      break;
    default:
      return this.find();
  }
  
  const minDate = new Date(today.getFullYear() - maxAge - 1, today.getMonth(), today.getDate());
  const maxDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
  
  return this.find({
    dob: { $gte: minDate, $lte: maxDate },
    status: 'active'
  });
};

// Static method to get passenger statistics
passengerSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalPassengers: { $sum: 1 },
        activePassengers: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        inactivePassengers: { $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] } },
        passengersWithExpiringPassports: {
          $sum: {
            $cond: [
              { $lte: ['$expirationDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        },
        passengersWithVisas: {
          $sum: { $cond: ['$visaInfo.required', 1, 0] }
        }
      }
    }
  ]);
};

// Transform output
passengerSchema.methods.toJSON = function() {
  const passengerObject = this.toObject();
  passengerObject.fullName = this.fullName;
  passengerObject.isPassportValid = this.isPassportValid;
  passengerObject.passportExpiryWarning = this.passportExpiryWarning;
  passengerObject.age = this.age;
  passengerObject.ageCategory = this.ageCategory;
  passengerObject.isVisaValid = this.isVisaValid;
  return passengerObject;
};

module.exports = mongoose.model('Passenger', passengerSchema);
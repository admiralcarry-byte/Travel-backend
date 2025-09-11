const mongoose = require('mongoose');

const cupoSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  totalSeats: {
    type: Number,
    required: [true, 'Total seats is required'],
    min: [1, 'Total seats must be at least 1']
  },
  reservedSeats: {
    type: Number,
    default: 0,
    min: [0, 'Reserved seats cannot be negative']
  },
  availableSeats: {
    type: Number,
    required: [true, 'Available seats is required'],
    min: [0, 'Available seats cannot be negative']
  },
  metadata: {
    date: {
      type: Date,
      required: [true, 'Date is required']
    },
    roomType: {
      type: String,
      trim: true,
      maxlength: [50, 'Room type cannot exceed 50 characters']
    },
    flightClass: {
      type: String,
      enum: {
        values: ['economy', 'premium_economy', 'business', 'first'],
        message: 'Flight class must be one of: economy, premium_economy, business, first'
      }
    },
    providerRef: {
      type: String,
      trim: true,
      maxlength: [100, 'Provider reference cannot exceed 100 characters']
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'inactive', 'sold_out', 'cancelled'],
      message: 'Status must be one of: active, inactive, sold_out, cancelled'
    },
    default: 'active'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
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
cupoSchema.index({ serviceId: 1 });
cupoSchema.index({ 'metadata.date': 1 });
cupoSchema.index({ status: 1 });
cupoSchema.index({ availableSeats: 1 });
cupoSchema.index({ createdAt: -1 });

// Virtual for occupancy percentage
cupoSchema.virtual('occupancyPercentage').get(function() {
  if (this.totalSeats === 0) return 0;
  return ((this.reservedSeats / this.totalSeats) * 100).toFixed(1);
});

// Virtual for formatted date
cupoSchema.virtual('formattedDate').get(function() {
  return this.metadata.date.toLocaleDateString();
});

// Virtual for availability status
cupoSchema.virtual('availabilityStatus').get(function() {
  if (this.availableSeats === 0) return 'sold_out';
  if (this.availableSeats <= this.totalSeats * 0.1) return 'low_availability';
  if (this.availableSeats <= this.totalSeats * 0.3) return 'limited_availability';
  return 'available';
});

// Pre-save middleware to calculate available seats
cupoSchema.pre('save', function(next) {
  // Calculate available seats
  this.availableSeats = this.totalSeats - this.reservedSeats;
  
  // Update status based on availability
  if (this.availableSeats === 0) {
    this.status = 'sold_out';
  } else if (this.status === 'sold_out' && this.availableSeats > 0) {
    this.status = 'active';
  }
  
  this.updatedAt = new Date();
  next();
});

// Static method to find available cupos
cupoSchema.statics.findAvailable = function(serviceId, date, minSeats = 1) {
  return this.find({
    serviceId: serviceId,
    'metadata.date': date,
    status: 'active',
    availableSeats: { $gte: minSeats }
  });
};

// Static method to reserve seats atomically
cupoSchema.statics.reserveSeats = async function(cupoId, seatsToReserve) {
  const result = await this.findOneAndUpdate(
    {
      _id: cupoId,
      availableSeats: { $gte: seatsToReserve },
      status: 'active'
    },
    {
      $inc: {
        reservedSeats: seatsToReserve,
        availableSeats: -seatsToReserve
      },
      $set: {
        updatedAt: new Date()
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!result) {
    throw new Error('Insufficient seats available or cupo not found');
  }

  // Update status if sold out
  if (result.availableSeats === 0) {
    result.status = 'sold_out';
    await result.save();
  }

  return result;
};

// Static method to release seats
cupoSchema.statics.releaseSeats = async function(cupoId, seatsToRelease) {
  const result = await this.findOneAndUpdate(
    {
      _id: cupoId,
      reservedSeats: { $gte: seatsToRelease }
    },
    {
      $inc: {
        reservedSeats: -seatsToRelease,
        availableSeats: seatsToRelease
      },
      $set: {
        updatedAt: new Date(),
        status: 'active' // Reactivate if it was sold out
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!result) {
    throw new Error('Cannot release more seats than reserved');
  }

  return result;
};

// Static method to find cupos by service and date range
cupoSchema.statics.findByServiceAndDateRange = function(serviceId, startDate, endDate) {
  const query = { serviceId };
  
  if (startDate || endDate) {
    query['metadata.date'] = {};
    if (startDate) query['metadata.date'].$gte = new Date(startDate);
    if (endDate) query['metadata.date'].$lte = new Date(endDate);
  }
  
  return this.find(query).sort({ 'metadata.date': 1 });
};

// Static method to get cupo statistics
cupoSchema.statics.getStatistics = function(serviceId, startDate, endDate) {
  const matchConditions = {};
  
  if (serviceId) matchConditions.serviceId = serviceId;
  if (startDate || endDate) {
    matchConditions['metadata.date'] = {};
    if (startDate) matchConditions['metadata.date'].$gte = new Date(startDate);
    if (endDate) matchConditions['metadata.date'].$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalCupos: { $sum: 1 },
        activeCupos: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        soldOutCupos: { $sum: { $cond: [{ $eq: ['$status', 'sold_out'] }, 1, 0] } },
        totalSeats: { $sum: '$totalSeats' },
        totalReserved: { $sum: '$reservedSeats' },
        totalAvailable: { $sum: '$availableSeats' },
        averageOccupancy: { $avg: '$occupancyPercentage' }
      }
    }
  ]);
};

// Transform output
cupoSchema.methods.toJSON = function() {
  const cupoObject = this.toObject();
  cupoObject.occupancyPercentage = this.occupancyPercentage;
  cupoObject.formattedDate = this.formattedDate;
  cupoObject.availabilityStatus = this.availabilityStatus;
  return cupoObject;
};

module.exports = mongoose.model('Cupo', cupoSchema);
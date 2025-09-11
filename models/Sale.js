const mongoose = require('mongoose');

const passengerSaleSchema = new mongoose.Schema({
  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Passenger',
    required: [true, 'Passenger ID is required']
  },
  price: {
    type: Number,
    required: [true, 'Passenger price is required'],
    min: [0, 'Passenger price cannot be negative']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  }
});

const serviceSaleSchema = new mongoose.Schema({
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service ID is required']
  },
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: [true, 'Provider ID is required']
  },
  priceClient: {
    type: Number,
    required: [true, 'Client price is required'],
    min: [0, 'Client price cannot be negative']
  },
  costProvider: {
    type: Number,
    required: [true, 'Provider cost is required'],
    min: [0, 'Provider cost cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    trim: true,
    uppercase: true,
    maxlength: [3, 'Currency code cannot exceed 3 characters'],
    default: 'USD'
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [1, 'Quantity must be at least 1'],
    default: 1
  }
});

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: [true, 'Filename is required'],
    trim: true
  },
  url: {
    type: String,
    required: [true, 'Document URL is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Document type is required'],
    enum: {
      values: ['ticket', 'invoice', 'contract', 'receipt', 'other'],
      message: 'Document type must be one of: ticket, invoice, contract, receipt, other'
    }
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const saleSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Client ID is required']
  },
  passengers: [passengerSaleSchema],
  services: [serviceSaleSchema],
  totalSalePrice: {
    type: Number,
    required: [true, 'Total sale price is required'],
    min: [0, 'Total sale price cannot be negative']
  },
  totalCost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0, 'Total cost cannot be negative']
  },
  profit: {
    type: Number,
    required: [true, 'Profit is required']
  },
  paymentsClient: [{
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required']
    }
  }],
  paymentsProvider: [{
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: [true, 'Payment ID is required']
    }
  }],
  totalClientPayments: {
    type: Number,
    default: 0,
    min: [0, 'Total client payments cannot be negative']
  },
  totalProviderPayments: {
    type: Number,
    default: 0,
    min: [0, 'Total provider payments cannot be negative']
  },
  clientBalance: {
    type: Number,
    default: 0
  },
  providerBalance: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    required: [true, 'Sale status is required'],
    enum: {
      values: ['open', 'closed', 'cancelled'],
      message: 'Status must be one of: open, closed, cancelled'
    },
    default: 'open'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Created by user ID is required']
  },
  documents: [documentSchema],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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
saleSchema.index({ clientId: 1 });
saleSchema.index({ createdBy: 1 });
saleSchema.index({ status: 1 });
saleSchema.index({ createdAt: -1 });
saleSchema.index({ totalSalePrice: 1 });
saleSchema.index({ profit: 1 });

// Virtual for profit margin percentage
saleSchema.virtual('profitMargin').get(function() {
  if (this.totalSalePrice === 0) return 0;
  return ((this.profit / this.totalSalePrice) * 100).toFixed(2);
});

// Virtual for formatted totals
saleSchema.virtual('formattedTotalSalePrice').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.totalSalePrice.toLocaleString()}` : `USD ${this.totalSalePrice.toLocaleString()}`;
});

saleSchema.virtual('formattedTotalCost').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.totalCost.toLocaleString()}` : `USD ${this.totalCost.toLocaleString()}`;
});

saleSchema.virtual('formattedProfit').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.profit.toLocaleString()}` : `USD ${this.profit.toLocaleString()}`;
});

// Virtual for formatted balances
saleSchema.virtual('formattedClientBalance').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.clientBalance.toLocaleString()}` : `USD ${this.clientBalance.toLocaleString()}`;
});

saleSchema.virtual('formattedProviderBalance').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.providerBalance.toLocaleString()}` : `USD ${this.providerBalance.toLocaleString()}`;
});

saleSchema.virtual('formattedTotalClientPayments').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.totalClientPayments.toLocaleString()}` : `USD ${this.totalClientPayments.toLocaleString()}`;
});

saleSchema.virtual('formattedTotalProviderPayments').get(function() {
  return this.services.length > 0 ? `${this.services[0].currency} ${this.totalProviderPayments.toLocaleString()}` : `USD ${this.totalProviderPayments.toLocaleString()}`;
});

// Pre-save middleware to calculate totals and profit
saleSchema.pre('save', function(next) {
  // Calculate total sale price from passengers and services
  let totalSalePrice = 0;
  
  // Add passenger prices
  this.passengers.forEach(passenger => {
    totalSalePrice += passenger.price;
  });
  
  // Add service prices (client prices)
  this.services.forEach(service => {
    totalSalePrice += (service.priceClient * service.quantity);
  });
  
  // Calculate total cost from services
  let totalCost = 0;
  this.services.forEach(service => {
    totalCost += (service.costProvider * service.quantity);
  });
  
  // Calculate profit
  const profit = totalSalePrice - totalCost;
  
  // Calculate balances
  this.clientBalance = totalSalePrice - this.totalClientPayments;
  this.providerBalance = this.totalProviderPayments - totalCost;
  
  // Update totals
  this.totalSalePrice = totalSalePrice;
  this.totalCost = totalCost;
  this.profit = profit;
  this.updatedAt = new Date();
  
  next();
});

// Instance method to add a payment
saleSchema.methods.addPayment = function(paymentId, type) {
  if (type === 'client') {
    this.paymentsClient.push({ paymentId });
  } else if (type === 'provider') {
    this.paymentsProvider.push({ paymentId });
  }
  return this.save();
};

// Instance method to calculate totals
saleSchema.methods.calculateTotals = function() {
  let totalSalePrice = 0;
  let totalCost = 0;
  
  // Add passenger prices
  this.passengers.forEach(passenger => {
    totalSalePrice += passenger.price;
  });
  
  // Add service prices (client prices)
  this.services.forEach(service => {
    totalSalePrice += (service.priceClient * service.quantity);
    totalCost += (service.costProvider * service.quantity);
  });
  
  const profit = totalSalePrice - totalCost;
  const clientBalance = totalSalePrice - this.totalClientPayments;
  const providerBalance = this.totalProviderPayments - totalCost;
  
  return {
    totalSalePrice,
    totalCost,
    profit,
    clientBalance,
    providerBalance
  };
};

// Instance method to check if sale is fully paid
saleSchema.methods.isFullyPaid = function() {
  return this.clientBalance <= 0;
};

// Instance method to check if providers are fully paid
saleSchema.methods.areProvidersFullyPaid = function() {
  return this.providerBalance <= 0;
};

// Instance method to get payment summary
saleSchema.methods.getPaymentSummary = function() {
  return {
    totalSalePrice: this.totalSalePrice,
    totalClientPayments: this.totalClientPayments,
    clientBalance: this.clientBalance,
    totalProviderPayments: this.totalProviderPayments,
    providerBalance: this.providerBalance,
    isFullyPaid: this.isFullyPaid(),
    areProvidersFullyPaid: this.areProvidersFullyPaid()
  };
};

// Static method to find sales by status
saleSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('clientId', 'name surname email');
};

// Static method to find sales by date range
saleSchema.statics.findByDateRange = function(startDate, endDate) {
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  return this.find(query).populate('clientId', 'name surname email');
};

// Static method to find sales by user
saleSchema.statics.findByUser = function(userId) {
  return this.find({ createdBy: userId }).populate('clientId', 'name surname email');
};

// Static method to get sales statistics
saleSchema.statics.getStatistics = function(startDate, endDate) {
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
        totalSales: { $sum: 1 },
        openSales: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        closedSales: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        cancelledSales: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        totalRevenue: { $sum: '$totalSalePrice' },
        totalCost: { $sum: '$totalCost' },
        totalProfit: { $sum: '$profit' },
        averageSaleValue: { $avg: '$totalSalePrice' },
        averageProfit: { $avg: '$profit' }
      }
    }
  ]);
};

// Static method to get top clients by revenue
saleSchema.statics.getTopClients = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$clientId',
        totalSales: { $sum: 1 },
        totalRevenue: { $sum: '$totalSalePrice' },
        totalProfit: { $sum: '$profit' }
      }
    },
    { $sort: { totalRevenue: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'client'
      }
    },
    { $unwind: '$client' }
  ]);
};

// Transform output
saleSchema.methods.toJSON = function() {
  const saleObject = this.toObject();
  saleObject.profitMargin = this.profitMargin;
  saleObject.formattedTotalSalePrice = this.formattedTotalSalePrice;
  saleObject.formattedTotalCost = this.formattedTotalCost;
  saleObject.formattedProfit = this.formattedProfit;
  saleObject.formattedClientBalance = this.formattedClientBalance;
  saleObject.formattedProviderBalance = this.formattedProviderBalance;
  saleObject.formattedTotalClientPayments = this.formattedTotalClientPayments;
  saleObject.formattedTotalProviderPayments = this.formattedTotalProviderPayments;
  return saleObject;
};

module.exports = mongoose.model('Sale', saleSchema);
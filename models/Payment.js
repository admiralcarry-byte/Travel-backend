const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  saleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    required: [true, 'Sale ID is required']
  },
  type: {
    type: String,
    required: [true, 'Payment type is required'],
    enum: {
      values: ['client', 'provider'],
      message: 'Payment type must be either "client" or "provider"'
    }
  },
  method: {
    type: String,
    required: [true, 'Payment method is required'],
    enum: {
      values: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'check', 'wire_transfer', 'cryptocurrency'],
      message: 'Payment method must be one of: cash, credit_card, debit_card, bank_transfer, paypal, stripe, check, wire_transfer, cryptocurrency'
    }
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: [0, 'Payment amount cannot be negative']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    trim: true,
    uppercase: true,
    maxlength: [3, 'Currency code cannot exceed 3 characters'],
    default: 'USD'
  },
  date: {
    type: Date,
    required: [true, 'Payment date is required'],
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'completed'
  },
  transactionId: {
    type: String,
    trim: true,
    maxlength: [100, 'Transaction ID cannot exceed 100 characters']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  receiptImage: {
    type: String,
    trim: true
  },
  exchangeRate: {
    type: Number,
    min: [0, 'Exchange rate cannot be negative']
  },
  baseCurrency: {
    type: String,
    trim: true,
    uppercase: true,
    maxlength: [3, 'Base currency code cannot exceed 3 characters']
  },
  fees: {
    processing: {
      type: Number,
      min: [0, 'Processing fee cannot be negative'],
      default: 0
    },
    exchange: {
      type: Number,
      min: [0, 'Exchange fee cannot be negative'],
      default: 0
    },
    total: {
      type: Number,
      min: [0, 'Total fees cannot be negative'],
      default: 0
    }
  },
  metadata: {
    cardLast4: {
      type: String,
      trim: true,
      maxlength: [4, 'Card last 4 digits cannot exceed 4 characters']
    },
    cardBrand: {
      type: String,
      trim: true,
      maxlength: [20, 'Card brand cannot exceed 20 characters']
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: [50, 'Bank name cannot exceed 50 characters']
    },
    accountLast4: {
      type: String,
      trim: true,
      maxlength: [4, 'Account last 4 digits cannot exceed 4 characters']
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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
paymentSchema.index({ saleId: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ date: -1 });
paymentSchema.index({ createdBy: 1 });
paymentSchema.index({ currency: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ method: 1 });
paymentSchema.index({ transactionId: 1 });

// Pre-save middleware to calculate total fees
paymentSchema.pre('save', function(next) {
  if (this.isModified('fees.processing') || this.isModified('fees.exchange')) {
    this.fees.total = this.fees.processing + this.fees.exchange;
  }
  next();
});

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return `${this.currency} ${this.amount.toLocaleString()}`;
});

// Virtual for converted amount (if exchange rate exists)
paymentSchema.virtual('convertedAmount').get(function() {
  if (this.exchangeRate && this.baseCurrency) {
    const converted = this.amount * this.exchangeRate;
    return `${this.baseCurrency} ${converted.toLocaleString()}`;
  }
  return null;
});

// Virtual for formatted fees
paymentSchema.virtual('formattedFees').get(function() {
  return {
    processing: `${this.currency} ${this.fees.processing.toLocaleString()}`,
    exchange: `${this.currency} ${this.fees.exchange.toLocaleString()}`,
    total: `${this.currency} ${this.fees.total.toLocaleString()}`
  };
});

// Virtual for net amount (amount minus fees)
paymentSchema.virtual('netAmount').get(function() {
  return this.amount - this.fees.total;
});

// Virtual for formatted net amount
paymentSchema.virtual('formattedNetAmount').get(function() {
  return `${this.currency} ${this.netAmount.toLocaleString()}`;
});

// Instance method to mark as completed
paymentSchema.methods.markCompleted = function() {
  this.status = 'completed';
  return this.save();
};

// Instance method to mark as failed
paymentSchema.methods.markFailed = function() {
  this.status = 'failed';
  return this.save();
};

// Instance method to refund
paymentSchema.methods.refund = function(refundAmount, notes) {
  this.status = 'refunded';
  if (notes) this.notes = (this.notes ? this.notes + '\n' : '') + `Refund: ${notes}`;
  return this.save();
};

// Static method to find payments by status
paymentSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('saleId', 'clientId totalSalePrice');
};

// Static method to find payments by method
paymentSchema.statics.findByMethod = function(method) {
  return this.find({ method }).populate('saleId', 'clientId totalSalePrice');
};

// Static method to find payments by date range
paymentSchema.statics.findByDateRange = function(startDate, endDate) {
  const query = {};
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  
  return this.find(query).populate('saleId', 'clientId totalSalePrice');
};

// Static method to get payment statistics
paymentSchema.statics.getStatistics = function(startDate, endDate) {
  const matchConditions = {};
  
  if (startDate || endDate) {
    matchConditions.date = {};
    if (startDate) matchConditions.date.$gte = new Date(startDate);
    if (endDate) matchConditions.date.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        completedPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        refundedPayments: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees.total' },
        netAmount: { $sum: { $subtract: ['$amount', '$fees.total'] } },
        averageAmount: { $avg: '$amount' }
      }
    }
  ]);
};

// Static method to get payment statistics by method
paymentSchema.statics.getStatisticsByMethod = function(startDate, endDate) {
  const matchConditions = {};
  
  if (startDate || endDate) {
    matchConditions.date = {};
    if (startDate) matchConditions.date.$gte = new Date(startDate);
    if (endDate) matchConditions.date.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchConditions },
    {
      $group: {
        _id: '$method',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        totalFees: { $sum: '$fees.total' },
        averageAmount: { $avg: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

// Transform output
paymentSchema.methods.toJSON = function() {
  const paymentObject = this.toObject();
  paymentObject.formattedAmount = this.formattedAmount;
  paymentObject.convertedAmount = this.convertedAmount;
  paymentObject.formattedFees = this.formattedFees;
  paymentObject.netAmount = this.netAmount;
  paymentObject.formattedNetAmount = this.formattedNetAmount;
  return paymentObject;
};

module.exports = mongoose.model('Payment', paymentSchema);
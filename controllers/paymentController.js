const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const currencyService = require('../services/currencyService');

// POST /api/payments/client - Record client payment
const recordClientPayment = async (req, res) => {
  try {
    const paymentData = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    const requiredFields = ['saleId', 'method', 'amount', 'currency'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate sale exists
    const sale = await Sale.findById(paymentData.saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Get exchange rate if currency is different from sale currency
    let exchangeRate = null;
    let baseCurrency = null;
    
    if (paymentData.currency !== sale.services[0]?.currency) {
      try {
        const conversion = await currencyService.convertCurrency(
          1, 
          paymentData.currency, 
          sale.services[0]?.currency || 'USD'
        );
        exchangeRate = conversion.rate;
        baseCurrency = sale.services[0]?.currency || 'USD';
      } catch (error) {
        console.warn('Currency conversion failed:', error.message);
        // Continue without conversion - user can manually adjust
      }
    }

    // Create payment
    const payment = new Payment({
      ...paymentData,
      type: 'client',
      createdBy: userId,
      exchangeRate,
      baseCurrency,
      receiptImage: req.file ? `/uploads/payments/${req.file.filename}` : null
    });

    await payment.save();

    // Update sale with new payment
    sale.paymentsClient.push({ paymentId: payment.id });
    sale.totalClientPayments += paymentData.amount;
    
    // Recalculate balances
    sale.clientBalance = sale.totalSalePrice - sale.totalClientPayments;
    sale.providerBalance = sale.totalProviderPayments - sale.totalCost;
    
    await sale.save();

    // Populate payment for response
    await payment.populate([
      { path: 'saleId', select: 'id totalSalePrice totalCost' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Client payment recorded successfully',
      data: { payment }
    });

  } catch (error) {
    console.error('Record client payment error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while recording client payment'
    });
  }
};

// POST /api/payments/provider - Record provider payment
const recordProviderPayment = async (req, res) => {
  try {
    const paymentData = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    const requiredFields = ['saleId', 'method', 'amount', 'currency'];
    const missingFields = requiredFields.filter(field => !paymentData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate sale exists
    const sale = await Sale.findById(paymentData.saleId);
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Get exchange rate if currency is different from sale currency
    let exchangeRate = null;
    let baseCurrency = null;
    
    if (paymentData.currency !== sale.services[0]?.currency) {
      try {
        const conversion = await currencyService.convertCurrency(
          1, 
          paymentData.currency, 
          sale.services[0]?.currency || 'USD'
        );
        exchangeRate = conversion.rate;
        baseCurrency = sale.services[0]?.currency || 'USD';
      } catch (error) {
        console.warn('Currency conversion failed:', error.message);
        // Continue without conversion - user can manually adjust
      }
    }

    // Create payment
    const payment = new Payment({
      ...paymentData,
      type: 'provider',
      createdBy: userId,
      exchangeRate,
      baseCurrency,
      receiptImage: req.file ? `/uploads/payments/${req.file.filename}` : null
    });

    await payment.save();

    // Update sale with new payment
    sale.paymentsProvider.push({ paymentId: payment.id });
    sale.totalProviderPayments += paymentData.amount;
    
    // Recalculate balances
    sale.clientBalance = sale.totalSalePrice - sale.totalClientPayments;
    sale.providerBalance = sale.totalProviderPayments - sale.totalCost;
    
    await sale.save();

    // Populate payment for response
    await payment.populate([
      { path: 'saleId', select: 'id totalSalePrice totalCost' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Provider payment recorded successfully',
      data: { payment }
    });

  } catch (error) {
    console.error('Record provider payment error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while recording provider payment'
    });
  }
};

// GET /api/payments - Get payments with filtering
const getPayments = async (req, res) => {
  try {
    const { 
      saleId, 
      type, 
      page = 1, 
      limit = 10,
      startDate,
      endDate,
      currency
    } = req.query;
    
    const query = {};
    
    if (saleId) {
      query.saleId = saleId;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (currency) {
      query.currency = currency;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate([
        { path: 'saleId', select: 'id totalSalePrice totalCost' },
        { path: 'createdBy', select: 'username email' }
      ])
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      data: {
        payments,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching payments'
    });
  }
};

// GET /api/payments/:id - Get payment by ID
const getPayment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payment = await Payment.findById(id)
      .populate([
        { path: 'saleId', select: 'id totalSalePrice totalCost clientId' },
        { path: 'createdBy', select: 'username email' }
      ]);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: { payment }
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching payment'
    });
  }
};

// PUT /api/payments/:id - Update payment
const updatePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const payment = await Payment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'saleId', select: 'id totalSalePrice totalCost' },
      { path: 'createdBy', select: 'username email' }
    ]);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Recalculate sale balances if amount changed
    if (updateData.amount !== undefined) {
      const sale = await Sale.findById(payment.saleId);
      if (sale) {
        // Recalculate total payments for this type
        const payments = await Payment.find({ 
          saleId: sale.id, 
          type: payment.type 
        });
        
        const totalPayments = payments.reduce((sum, p) => sum + p.amount, 0);
        
        if (payment.type === 'client') {
          sale.totalClientPayments = totalPayments;
        } else {
          sale.totalProviderPayments = totalPayments;
        }
        
        // Recalculate balances
        sale.clientBalance = sale.totalSalePrice - sale.totalClientPayments;
        sale.providerBalance = sale.totalProviderPayments - sale.totalCost;
        
        await sale.save();
      }
    }

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    });

  } catch (error) {
    console.error('Update payment error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error while updating payment'
    });
  }
};

// DELETE /api/payments/:id - Delete payment
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update sale to remove payment reference and recalculate balances
    const sale = await Sale.findById(payment.saleId);
    if (sale) {
      if (payment.type === 'client') {
        sale.paymentsClient = sale.paymentsClient.filter(p => p.paymentId.toString() !== id);
        sale.totalClientPayments -= payment.amount;
      } else {
        sale.paymentsProvider = sale.paymentsProvider.filter(p => p.paymentId.toString() !== id);
        sale.totalProviderPayments -= payment.amount;
      }
      
      // Recalculate balances
      sale.clientBalance = sale.totalSalePrice - sale.totalClientPayments;
      sale.providerBalance = sale.totalProviderPayments - sale.totalCost;
      
      await sale.save();
    }

    await Payment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Payment deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting payment'
    });
  }
};

// GET /api/exchange-rate - Get exchange rate between currencies
const getExchangeRate = async (req, res) => {
  try {
    const { from, to } = req.query;
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        message: 'Both "from" and "to" currency parameters are required'
      });
    }

    if (!currencyService.isValidCurrency(from) || !currencyService.isValidCurrency(to)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid currency code'
      });
    }

    const rate = await currencyService.getExchangeRate(from.toUpperCase(), to.toUpperCase());

    res.json({
      success: true,
      data: {
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: rate,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while fetching exchange rate'
    });
  }
};

// GET /api/currencies - Get supported currencies
const getSupportedCurrencies = async (req, res) => {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    
    res.json({
      success: true,
      data: { currencies }
    });

  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching currencies'
    });
  }
};

module.exports = {
  recordClientPayment,
  recordProviderPayment,
  getPayments,
  getPayment,
  updatePayment,
  deletePayment,
  getExchangeRate,
  getSupportedCurrencies
};
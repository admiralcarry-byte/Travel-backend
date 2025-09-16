const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Sale = require('../models/Sale');
const User = require('../models/User');
const Client = require('../models/Client');

// GET /api/reports/payments/bank-transfers - Get bank transfer payments report
const getBankTransferPaymentsReport = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId, 
      status = 'completed',
      format = 'json',
      page = 1,
      limit = 1000
    } = req.query;

    // Build match conditions
    const matchConditions = {
      method: 'bank_transfer',
      type: 'client' // Only client payments for bank transfers
    };
    
    // Add date filter
    if (startDate || endDate) {
      matchConditions.date = {};
      if (startDate) matchConditions.date.$gte = new Date(startDate);
      if (endDate) matchConditions.date.$lte = new Date(endDate);
    }

    // Add status filter
    if (status) {
      matchConditions.status = status;
    }

    // Add seller filter
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    // Aggregation pipeline for comprehensive report
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'sales',
          localField: 'saleId',
          foreignField: '_id',
          as: 'sale'
        }
      },
      { $unwind: '$sale' },
      {
        $lookup: {
          from: 'clients',
          localField: 'sale.clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          _id: 1,
          paymentId: '$_id',
          saleId: '$sale._id',
          clientName: { $concat: ['$client.name', ' ', '$client.surname'] },
          clientEmail: '$client.email',
          clientPhone: '$client.phone',
          sellerName: { $concat: ['$seller.firstName', ' ', '$seller.lastName'] },
          sellerUsername: '$seller.username',
          sellerEmail: '$seller.email',
          amount: 1,
          currency: 1,
          date: 1,
          status: 1,
          transactionId: 1,
          reference: 1,
          bankName: '$metadata.bankName',
          accountLast4: '$metadata.accountLast4',
          notes: 1,
          totalSalePrice: '$sale.totalSalePrice',
          saleStatus: '$sale.status',
          saleCreatedAt: '$sale.createdAt',
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: { date: -1 } }
    ];

    // Add pagination for JSON format
    if (format === 'json') {
      pipeline.push(
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
      );
    }

    const payments = await Payment.aggregate(pipeline);

    // Get total count for pagination
    const totalCountPipeline = [
      { $match: matchConditions },
      { $count: 'total' }
    ];
    const totalResult = await Payment.aggregate(totalCountPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    // Calculate summary statistics
    const summaryPipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          averageAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' },
          currencies: { $addToSet: '$currency' }
        }
      }
    ];
    const summaryResult = await Payment.aggregate(summaryPipeline);
    const summary = summaryResult.length > 0 ? summaryResult[0] : {
      totalPayments: 0,
      totalAmount: 0,
      averageAmount: 0,
      minAmount: 0,
      maxAmount: 0,
      currencies: []
    };

    // Format response based on requested format
    if (format === 'csv') {
      // Generate CSV format
      const csvHeaders = [
        'Payment ID',
        'Sale ID', 
        'Client Name',
        'Client Email',
        'Client Phone',
        'Seller Name',
        'Seller Username',
        'Seller Email',
        'Amount',
        'Currency',
        'Payment Date',
        'Status',
        'Transaction ID',
        'Reference',
        'Bank Name',
        'Account Last 4',
        'Notes',
        'Total Sale Price',
        'Sale Status',
        'Sale Created Date'
      ].join(',');

      const csvRows = payments.map(payment => [
        payment.paymentId,
        payment.saleId,
        `"${payment.clientName || ''}"`,
        `"${payment.clientEmail || ''}"`,
        `"${payment.clientPhone || ''}"`,
        `"${payment.sellerName || ''}"`,
        `"${payment.sellerUsername || ''}"`,
        `"${payment.sellerEmail || ''}"`,
        payment.amount,
        payment.currency,
        new Date(payment.date).toISOString().split('T')[0],
        payment.status,
        `"${payment.transactionId || ''}"`,
        `"${payment.reference || ''}"`,
        `"${payment.bankName || ''}"`,
        `"${payment.accountLast4 || ''}"`,
        `"${payment.notes || ''}"`,
        payment.totalSalePrice,
        payment.saleStatus,
        new Date(payment.saleCreatedAt).toISOString().split('T')[0]
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="bank_transfer_payments_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    // JSON response
    res.json({
      success: true,
      data: {
        payments,
        summary,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          limit: parseInt(limit)
        },
        filters: {
          startDate,
          endDate,
          sellerId,
          status,
          format
        }
      }
    });

  } catch (error) {
    console.error('Get bank transfer payments report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating bank transfer payments report'
    });
  }
};

// GET /api/reports/payments/seller-summary - Get seller payment summary for reconciliation
const getSellerPaymentSummary = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId,
      format = 'json'
    } = req.query;

    // Build match conditions
    const matchConditions = {
      type: 'client',
      status: 'completed'
    };
    
    // Add date filter
    if (startDate || endDate) {
      matchConditions.date = {};
      if (startDate) matchConditions.date.$gte = new Date(startDate);
      if (endDate) matchConditions.date.$lte = new Date(endDate);
    }

    // Add seller filter
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    // Aggregation pipeline for seller summary
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $group: {
          _id: '$createdBy',
          sellerName: { $first: { $concat: ['$seller.firstName', ' ', '$seller.lastName'] } },
          sellerUsername: { $first: '$seller.username' },
          sellerEmail: { $first: '$seller.email' },
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          paymentMethods: {
            $push: {
              method: '$method',
              amount: '$amount',
              currency: '$currency',
              date: '$date',
              transactionId: '$transactionId'
            }
          },
          bankTransfers: {
            $sum: { $cond: [{ $eq: ['$method', 'bank_transfer'] }, 1, 0] }
          },
          bankTransferAmount: {
            $sum: { $cond: [{ $eq: ['$method', 'bank_transfer'] }, '$amount', 0] }
          },
          cashPayments: {
            $sum: { $cond: [{ $eq: ['$method', 'cash'] }, 1, 0] }
          },
          cashAmount: {
            $sum: { $cond: [{ $eq: ['$method', 'cash'] }, '$amount', 0] }
          },
          cardPayments: {
            $sum: { $cond: [{ $in: ['$method', ['credit_card', 'debit_card']] }, 1, 0] }
          },
          cardAmount: {
            $sum: { $cond: [{ $in: ['$method', ['credit_card', 'debit_card']] }, '$amount', 0] }
          }
        }
      },
      { $sort: { totalAmount: -1 } }
    ];

    const sellerSummaries = await Payment.aggregate(pipeline);

    // Format response based on requested format
    if (format === 'csv') {
      const csvHeaders = [
        'Seller Name',
        'Seller Username', 
        'Seller Email',
        'Total Payments',
        'Total Amount',
        'Bank Transfers Count',
        'Bank Transfer Amount',
        'Cash Payments Count',
        'Cash Amount',
        'Card Payments Count',
        'Card Amount'
      ].join(',');

      const csvRows = sellerSummaries.map(seller => [
        `"${seller.sellerName || ''}"`,
        `"${seller.sellerUsername || ''}"`,
        `"${seller.sellerEmail || ''}"`,
        seller.totalPayments,
        seller.totalAmount,
        seller.bankTransfers,
        seller.bankTransferAmount,
        seller.cashPayments,
        seller.cashAmount,
        seller.cardPayments,
        seller.cardAmount
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="seller_payment_summary_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    // JSON response
    res.json({
      success: true,
      data: {
        sellerSummaries,
        filters: {
          startDate,
          endDate,
          sellerId,
          format
        }
      }
    });

  } catch (error) {
    console.error('Get seller payment summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating seller payment summary'
    });
  }
};

// GET /api/reports/payments/reconciliation - Get detailed reconciliation report
const getReconciliationReport = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId,
      format = 'json'
    } = req.query;

    // Build match conditions
    const matchConditions = {
      type: 'client',
      status: 'completed'
    };
    
    // Add date filter
    if (startDate || endDate) {
      matchConditions.date = {};
      if (startDate) matchConditions.date.$gte = new Date(startDate);
      if (endDate) matchConditions.date.$lte = new Date(endDate);
    }

    // Add seller filter
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    // Aggregation pipeline for detailed reconciliation
    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'sales',
          localField: 'saleId',
          foreignField: '_id',
          as: 'sale'
        }
      },
      { $unwind: '$sale' },
      {
        $lookup: {
          from: 'clients',
          localField: 'sale.clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'seller'
        }
      },
      { $unwind: '$seller' },
      {
        $project: {
          _id: 1,
          paymentId: '$_id',
          saleId: '$sale._id',
          clientName: { $concat: ['$client.name', ' ', '$client.surname'] },
          clientEmail: '$client.email',
          sellerName: { $concat: ['$seller.firstName', ' ', '$seller.lastName'] },
          sellerUsername: '$seller.username',
          amount: 1,
          currency: 1,
          method: 1,
          date: 1,
          transactionId: 1,
          reference: 1,
          bankName: '$metadata.bankName',
          accountLast4: '$metadata.accountLast4',
          totalSalePrice: '$sale.totalSalePrice',
          saleStatus: '$sale.status',
          saleCreatedAt: '$sale.createdAt',
          createdAt: 1
        }
      },
      { $sort: { date: -1 } }
    ];

    const reconciliationData = await Payment.aggregate(pipeline);

    // Calculate summary by payment method
    const methodSummary = reconciliationData.reduce((acc, payment) => {
      const method = payment.method;
      if (!acc[method]) {
        acc[method] = {
          count: 0,
          totalAmount: 0,
          payments: []
        };
      }
      acc[method].count++;
      acc[method].totalAmount += payment.amount;
      acc[method].payments.push(payment);
      return acc;
    }, {});

    // Format response based on requested format
    if (format === 'csv') {
      const csvHeaders = [
        'Payment ID',
        'Sale ID',
        'Client Name',
        'Client Email',
        'Seller Name',
        'Seller Username',
        'Amount',
        'Currency',
        'Payment Method',
        'Payment Date',
        'Transaction ID',
        'Reference',
        'Bank Name',
        'Account Last 4',
        'Total Sale Price',
        'Sale Status',
        'Sale Created Date'
      ].join(',');

      const csvRows = reconciliationData.map(payment => [
        payment.paymentId,
        payment.saleId,
        `"${payment.clientName || ''}"`,
        `"${payment.clientEmail || ''}"`,
        `"${payment.sellerName || ''}"`,
        `"${payment.sellerUsername || ''}"`,
        payment.amount,
        payment.currency,
        payment.method,
        new Date(payment.date).toISOString().split('T')[0],
        `"${payment.transactionId || ''}"`,
        `"${payment.reference || ''}"`,
        `"${payment.bankName || ''}"`,
        `"${payment.accountLast4 || ''}"`,
        payment.totalSalePrice,
        payment.saleStatus,
        new Date(payment.saleCreatedAt).toISOString().split('T')[0]
      ].join(','));

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="payment_reconciliation_${new Date().toISOString().split('T')[0]}.csv"`);
      return res.send(csvContent);
    }

    // JSON response
    res.json({
      success: true,
      data: {
        reconciliationData,
        methodSummary,
        filters: {
          startDate,
          endDate,
          sellerId,
          format
        }
      }
    });

  } catch (error) {
    console.error('Get reconciliation report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating reconciliation report'
    });
  }
};

// GET /api/reports/kpis - Get KPI data for dashboard
const getKPIs = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId,
      period = 'monthly'
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    // Add date filter
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    // Add seller filter
    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    // Get sales statistics
    const salesStats = await Sale.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalSalePrice' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$profit' },
          saleCount: { $sum: 1 },
          totalClientPayments: { $sum: '$totalClientPayments' },
          totalProviderPayments: { $sum: '$totalProviderPayments' },
          totalClientBalance: { $sum: '$clientBalance' },
          totalProviderBalance: { $sum: '$providerBalance' }
        }
      }
    ]);

    const stats = salesStats.length > 0 ? salesStats[0] : {
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      saleCount: 0,
      totalClientPayments: 0,
      totalProviderPayments: 0,
      totalClientBalance: 0,
      totalProviderBalance: 0
    };

    // Calculate profit margin
    const profitMargin = stats.totalSales > 0 ? 
      ((stats.totalProfit / stats.totalSales) * 100).toFixed(2) : 0;

    const kpis = {
      totalSales: stats.totalSales,
      totalProfit: stats.totalProfit,
      saleCount: stats.saleCount,
      profitMargin: parseFloat(profitMargin),
      totalClientPayments: stats.totalClientPayments,
      totalProviderPayments: stats.totalProviderPayments,
      totalClientBalance: stats.totalClientBalance,
      totalProviderBalance: stats.totalProviderBalance
    };

    res.json({
      success: true,
      data: kpis
    });

  } catch (error) {
    console.error('Get KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating KPIs'
    });
  }
};

// GET /api/reports/sales - Get sales data for charts
const getSalesData = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId,
      period = 'monthly'
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    // Group by period
    let groupFormat;
    if (period === 'daily') {
      groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else if (period === 'weekly') {
      groupFormat = { $dateToString: { format: "%Y-W%U", date: "$createdAt" } };
    } else { // monthly
      groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    }

    const salesData = await Sale.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: '$totalSalePrice' },
          totalProfit: { $sum: '$profit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: salesData
    });

  } catch (error) {
    console.error('Get sales data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating sales data'
    });
  }
};

// GET /api/reports/profit - Get profit data for charts
const getProfitData = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId,
      period = 'monthly'
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    // Group by period
    let groupFormat;
    if (period === 'daily') {
      groupFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    } else if (period === 'weekly') {
      groupFormat = { $dateToString: { format: "%Y-W%U", date: "$createdAt" } };
    } else { // monthly
      groupFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    }

    const profitData = await Sale.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: groupFormat,
          totalProfit: { $sum: '$profit' },
          totalCost: { $sum: '$totalCost' },
          totalSales: { $sum: '$totalSalePrice' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: profitData
    });

  } catch (error) {
    console.error('Get profit data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating profit data'
    });
  }
};

// GET /api/reports/balances - Get balance data
const getBalancesData = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    const balancesData = await Sale.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalClientBalance: { $sum: '$clientBalance' },
          totalProviderBalance: { $sum: '$providerBalance' },
          totalClientPayments: { $sum: '$totalClientPayments' },
          totalProviderPayments: { $sum: '$totalProviderPayments' }
        }
      }
    ]);

    const data = balancesData.length > 0 ? balancesData[0] : {
      totalClientBalance: 0,
      totalProviderBalance: 0,
      totalClientPayments: 0,
      totalProviderPayments: 0
    };

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Get balances data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating balances data'
    });
  }
};

// GET /api/reports/client-balance - Get client balance data
const getClientBalanceData = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    const clientBalanceData = await Sale.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalClientBalance: { $sum: '$clientBalance' },
          totalClientPayments: { $sum: '$totalClientPayments' },
          totalSales: { $sum: '$totalSalePrice' }
        }
      }
    ]);

    const data = clientBalanceData.length > 0 ? clientBalanceData[0] : {
      totalClientBalance: 0,
      totalClientPayments: 0,
      totalSales: 0
    };

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Get client balance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating client balance data'
    });
  }
};

// GET /api/reports/provider-balance - Get provider balance data
const getProviderBalanceData = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    const providerBalanceData = await Sale.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalProviderBalance: { $sum: '$providerBalance' },
          totalProviderPayments: { $sum: '$totalProviderPayments' },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);

    const data = providerBalanceData.length > 0 ? providerBalanceData[0] : {
      totalProviderBalance: 0,
      totalProviderPayments: 0,
      totalCost: 0
    };

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Get provider balance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating provider balance data'
    });
  }
};

// GET /api/reports/top-services - Get top services data
const getTopServicesData = async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      sellerId,
      limit = 10
    } = req.query;

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) matchConditions.createdAt.$gte = new Date(startDate);
      if (endDate) matchConditions.createdAt.$lte = new Date(endDate);
    }

    if (sellerId && mongoose.Types.ObjectId.isValid(sellerId)) {
      matchConditions.createdBy = new mongoose.Types.ObjectId(sellerId);
    }

    const topServicesData = await Sale.aggregate([
      { $match: matchConditions },
      { $unwind: '$services' },
      {
        $lookup: {
          from: 'services',
          localField: 'services.serviceId',
          foreignField: '_id',
          as: 'service'
        }
      },
      { $unwind: '$service' },
      {
        $group: {
          _id: '$service._id',
          serviceName: { $first: '$service.title' },
          totalSales: { $sum: { $multiply: ['$services.priceClient', '$services.quantity'] } },
          totalCost: { $sum: { $multiply: ['$services.costProvider', '$services.quantity'] } },
          totalProfit: { $sum: { $multiply: [{ $subtract: ['$services.priceClient', '$services.costProvider'] }, '$services.quantity'] } },
          saleCount: { $sum: 1 }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: topServicesData
    });

  } catch (error) {
    console.error('Get top services data error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating top services data'
    });
  }
};

module.exports = {
  getBankTransferPaymentsReport,
  getSellerPaymentSummary,
  getReconciliationReport,
  getKPIs,
  getSalesData,
  getProfitData,
  getBalancesData,
  getClientBalanceData,
  getProviderBalanceData,
  getTopServicesData
};
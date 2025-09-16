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

module.exports = {
  getBankTransferPaymentsReport,
  getSellerPaymentSummary,
  getReconciliationReport
};
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Service = require('../models/Service');
const User = require('../models/User');

// Simple in-memory cache for heavy queries
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCacheKey = (endpoint, params) => {
  return `${endpoint}_${JSON.stringify(params)}`;
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// GET /api/reports/sales - Sales reporting with aggregation
const getSalesReport = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate, sellerId } = req.query;
    
    console.log('📈 [BACKEND] Sales Report API called with params:', { period, startDate, endDate, sellerId });
    
    const cacheKey = getCacheKey('sales', { period, startDate, endDate, sellerId });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('📈 [BACKEND] Returning cached sales data:', cachedData);
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        // Start from beginning of start date in local timezone
        const startDateObj = new Date(startDate + 'T00:00:00');
        matchConditions.createdAt.$gte = startDateObj;
      }
      if (endDate) {
        // End at end of end date in local timezone
        const endDateObj = new Date(endDate + 'T23:59:59.999');
        matchConditions.createdAt.$lte = endDateObj;
      }
    }
    
    if (sellerId) {
      matchConditions.createdBy = sellerId;
    }

    // Determine group format based on period
    let groupFormat;
    let sortFormat;
    
    switch (period) {
      case 'daily':
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        sortFormat = { year: 1, month: 1, day: 1 };
        break;
      case 'weekly':
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        sortFormat = { year: 1, week: 1 };
        break;
      case 'quarterly':
        groupFormat = {
          year: { $year: '$createdAt' },
          quarter: {
            $switch: {
              branches: [
                { case: { $lte: [{ $month: '$createdAt' }, 3] }, then: 1 },
                { case: { $lte: [{ $month: '$createdAt' }, 6] }, then: 2 },
                { case: { $lte: [{ $month: '$createdAt' }, 9] }, then: 3 },
                { case: { $lte: [{ $month: '$createdAt' }, 12] }, then: 4 }
              ]
            }
          }
        };
        sortFormat = { year: 1, quarter: 1 };
        break;
      case 'yearly':
        groupFormat = {
          year: { $year: '$createdAt' }
        };
        sortFormat = { year: 1 };
        break;
      default: // monthly
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        sortFormat = { year: 1, month: 1 };
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: groupFormat,
          totalSales: { $sum: '$totalSalePrice' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$profit' },
          saleCount: { $sum: 1 },
          avgSaleValue: { $avg: '$totalSalePrice' },
          avgProfit: { $avg: '$profit' }
        }
      },
      { $sort: sortFormat },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: '$_id.month' || '$_id.quarter' || '$_id.week' || '$_id.day' }
            ]
          },
          totalSales: 1,
          totalCost: 1,
          totalProfit: 1,
          saleCount: 1,
          avgSaleValue: { $round: ['$avgSaleValue', 2] },
          avgProfit: { $round: ['$avgProfit', 2] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$totalProfit', '$totalSales'] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ];

    const salesData = await Sale.aggregate(pipeline);

    // Format data for charts
    const chartData = {
      labels: salesData.map(item => item.period),
      values: salesData.map(item => item.totalSales),
      profitValues: salesData.map(item => item.totalProfit),
      saleCounts: salesData.map(item => item.saleCount)
    };

    // Calculate summary statistics
    const summary = {
      totalSales: salesData.reduce((sum, item) => sum + item.totalSales, 0),
      totalProfit: salesData.reduce((sum, item) => sum + item.totalProfit, 0),
      totalSalesCount: salesData.reduce((sum, item) => sum + item.saleCount, 0),
      avgSaleValue: salesData.length > 0 ? 
        salesData.reduce((sum, item) => sum + item.avgSaleValue, 0) / salesData.length : 0,
      avgProfit: salesData.length > 0 ? 
        salesData.reduce((sum, item) => sum + item.avgProfit, 0) / salesData.length : 0
    };

    const result = {
      period,
      summary,
      chartData,
      detailedData: salesData
    };

    console.log('📈 [BACKEND] Sales Report data being sent to frontend:');
    console.log('  📊 Summary:', result.summary);
    console.log('  📈 Chart Data:', result.chartData);
    console.log('  📋 Detailed Data Count:', result.detailedData.length);

    setCachedData(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating sales report'
    });
  }
};

// GET /api/reports/profit - Profit reporting by seller
const getProfitReport = async (req, res) => {
  try {
    const { sellerId, period = 'monthly', startDate, endDate } = req.query;
    
    console.log('💵 [BACKEND] Profit Report API called with params:', { sellerId, period, startDate, endDate });
    
    const cacheKey = getCacheKey('profit', { sellerId, period, startDate, endDate });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('💵 [BACKEND] Returning cached profit data:', cachedData);
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        // Start from beginning of start date in local timezone
        const startDateObj = new Date(startDate + 'T00:00:00');
        matchConditions.createdAt.$gte = startDateObj;
      }
      if (endDate) {
        // End at end of end date in local timezone
        const endDateObj = new Date(endDate + 'T23:59:59.999');
        matchConditions.createdAt.$lte = endDateObj;
      }
    }
    
    if (sellerId) {
      matchConditions.createdBy = sellerId;
    }

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
          sellerName: { $first: '$seller.username' },
          sellerEmail: { $first: '$seller.email' },
          totalSales: { $sum: '$totalSalePrice' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$profit' },
          saleCount: { $sum: 1 },
          avgSaleValue: { $avg: '$totalSalePrice' },
          avgProfit: { $avg: '$profit' }
        }
      },
      {
        $project: {
          _id: 0,
          sellerId: '$_id',
          sellerName: 1,
          sellerEmail: 1,
          totalSales: 1,
          totalCost: 1,
          totalProfit: 1,
          saleCount: 1,
          avgSaleValue: { $round: ['$avgSaleValue', 2] },
          avgProfit: { $round: ['$avgProfit', 2] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$totalProfit', '$totalSales'] },
                  100
                ]
              },
              2
            ]
          }
        }
      },
      { $sort: { totalProfit: -1 } }
    ];

    const profitData = await Sale.aggregate(pipeline);

    // Format data for charts
    const chartData = {
      labels: profitData.map(item => item.sellerName),
      values: profitData.map(item => item.totalProfit),
      saleValues: profitData.map(item => item.totalSales),
      saleCounts: profitData.map(item => item.saleCount)
    };

    // Calculate summary
    const summary = {
      totalProfit: profitData.reduce((sum, item) => sum + item.totalProfit, 0),
      totalSales: profitData.reduce((sum, item) => sum + item.totalSales, 0),
      totalSellers: profitData.length,
      avgProfitPerSeller: profitData.length > 0 ? 
        profitData.reduce((sum, item) => sum + item.totalProfit, 0) / profitData.length : 0
    };

    const result = {
      period,
      summary,
      chartData,
      detailedData: profitData
    };

    console.log('💵 [BACKEND] Profit Report data being sent to frontend:');
    console.log('  📊 Summary:', result.summary);
    console.log('  📈 Chart Data:', result.chartData);
    console.log('  📋 Detailed Data Count:', result.detailedData.length);

    setCachedData(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Profit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating profit report'
    });
  }
};

// GET /api/reports/balances - Outstanding balances report
const getBalancesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const cacheKey = getCacheKey('balances', { startDate, endDate });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        // Start from beginning of start date in local timezone
        const startDateObj = new Date(startDate + 'T00:00:00');
        matchConditions.createdAt.$gte = startDateObj;
      }
      if (endDate) {
        // End at end of end date in local timezone
        const endDateObj = new Date(endDate + 'T23:59:59.999');
        matchConditions.createdAt.$lte = endDateObj;
      }
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' },
      {
        $group: {
          _id: null,
          totalClientBalance: { $sum: '$clientBalance' },
          totalProviderBalance: { $sum: '$providerBalance' },
          totalClientPayments: { $sum: '$totalClientPayments' },
          totalProviderPayments: { $sum: '$totalProviderPayments' },
          salesWithClientBalance: {
            $sum: {
              $cond: [{ $gt: ['$clientBalance', 0] }, 1, 0]
            }
          },
          salesWithProviderBalance: {
            $sum: {
              $cond: [{ $lt: ['$providerBalance', 0] }, 1, 0]
            }
          },
          totalSales: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          totalClientBalance: 1,
          totalProviderBalance: 1,
          totalClientPayments: 1,
          totalProviderPayments: 1,
          salesWithClientBalance: 1,
          salesWithProviderBalance: 1,
          totalSales: 1,
          netBalance: { $subtract: ['$totalClientBalance', '$totalProviderBalance'] }
        }
      }
    ];

    const balanceData = await Sale.aggregate(pipeline);
    const balance = balanceData[0] || {
      totalClientBalance: 0,
      totalProviderBalance: 0,
      totalClientPayments: 0,
      totalProviderPayments: 0,
      salesWithClientBalance: 0,
      salesWithProviderBalance: 0,
      totalSales: 0,
      netBalance: 0
    };

    // Get detailed client balances
    const clientBalancesPipeline = [
      { $match: { ...matchConditions, clientBalance: { $gt: 0 } } },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' },
      {
        $group: {
          _id: '$clientId',
          clientName: { $first: { $concat: ['$client.name', ' ', '$client.surname'] } },
          clientEmail: { $first: '$client.email' },
          totalBalance: { $sum: '$clientBalance' },
          saleCount: { $sum: 1 }
        }
      },
      { $sort: { totalBalance: -1 } },
      { $limit: 10 }
    ];

    const topClientBalances = await Sale.aggregate(clientBalancesPipeline);

    // Get detailed provider balances
    const providerBalancesPipeline = [
      { $match: { ...matchConditions, providerBalance: { $lt: 0 } } },
      {
        $lookup: {
          from: 'services',
          localField: 'services.serviceId',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },
      {
        $lookup: {
          from: 'providers',
          localField: 'serviceDetails.providerId',
          foreignField: '_id',
          as: 'provider'
        }
      },
      { $unwind: '$provider' },
      {
        $group: {
          _id: '$provider._id',
          providerName: { $first: '$provider.name' },
          totalOwed: { $sum: { $abs: '$providerBalance' } },
          saleCount: { $sum: 1 }
        }
      },
      { $sort: { totalOwed: -1 } },
      { $limit: 10 }
    ];

    const topProviderBalances = await Sale.aggregate(providerBalancesPipeline);

    const result = {
      summary: balance,
      topClientBalances,
      topProviderBalances,
      chartData: {
        labels: ['Client Balances', 'Provider Balances'],
        values: [balance.totalClientBalance, Math.abs(balance.totalProviderBalance)]
      }
    };
    console.log('result : ', result);
    

    setCachedData(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Balances report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating balances report'
    });
  }
};

// GET /api/reports/top-services - Top selling services
const getTopServicesReport = async (req, res) => {
  try {
    const { limit = 10, startDate, endDate } = req.query;
    
    const cacheKey = getCacheKey('top-services', { limit, startDate, endDate });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        // Start from beginning of start date in local timezone
        const startDateObj = new Date(startDate + 'T00:00:00');
        matchConditions.createdAt.$gte = startDateObj;
      }
      if (endDate) {
        // End at end of end date in local timezone
        const endDateObj = new Date(endDate + 'T23:59:59.999');
        matchConditions.createdAt.$lte = endDateObj;
      }
    }

    const pipeline = [
      { $match: matchConditions },
      { $unwind: '$services' },
      {
        $lookup: {
          from: 'services',
          localField: 'services.serviceId',
          foreignField: '_id',
          as: 'serviceDetails'
        }
      },
      { $unwind: '$serviceDetails' },
      {
        $lookup: {
          from: 'providers',
          localField: 'serviceDetails.providerId',
          foreignField: '_id',
          as: 'provider'
        }
      },
      { $unwind: '$provider' },
      {
        $group: {
          _id: '$services.serviceId',
          serviceName: { $first: '$serviceDetails.title' },
          serviceType: { $first: '$serviceDetails.type' },
          providerName: { $first: '$provider.name' },
          totalQuantity: { $sum: '$services.quantity' },
          totalRevenue: { $sum: '$services.priceClient' },
          totalCost: { $sum: '$services.costProvider' },
          saleCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          serviceId: '$_id',
          serviceName: 1,
          serviceType: 1,
          providerName: 1,
          totalQuantity: 1,
          totalRevenue: 1,
          totalCost: 1,
          totalProfit: { $subtract: ['$totalRevenue', '$totalCost'] },
          saleCount: 1,
          avgRevenue: { $round: [{ $divide: ['$totalRevenue', '$saleCount'] }, 2] }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) }
    ];

    const topServices = await Sale.aggregate(pipeline);

    // Format data for charts
    const chartData = {
      labels: topServices.map(item => item.serviceName),
      values: topServices.map(item => item.totalRevenue),
      profitValues: topServices.map(item => item.totalProfit),
      quantityValues: topServices.map(item => item.totalQuantity)
    };

    const result = {
      topServices,
      chartData,
      summary: {
        totalServices: topServices.length,
        totalRevenue: topServices.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalProfit: topServices.reduce((sum, item) => sum + item.totalProfit, 0),
        totalQuantity: topServices.reduce((sum, item) => sum + item.totalQuantity, 0)
      }
    };

    setCachedData(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Top services report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating top services report'
    });
  }
};

// GET /api/reports/kpis - Key Performance Indicators
const getKPIs = async (req, res) => {
  try {
    const { period = 'monthly', startDate, endDate, sellerId } = req.query;
    
    console.log('📊 [BACKEND] KPIs API called with params:', { period, startDate, endDate, sellerId });
    
    const cacheKey = getCacheKey('kpis', { period, startDate, endDate, sellerId });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('📊 [BACKEND] Returning cached KPIs data:', cachedData);
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        // Start from beginning of start date - use UTC to avoid timezone issues
        const startDateObj = new Date(startDate + 'T00:00:00.000Z');
        matchConditions.createdAt.$gte = startDateObj;
        console.log('📊 [BACKEND] Start date filter:', startDateObj.toISOString());
      }
      if (endDate) {
        // End at end of end date - use UTC to avoid timezone issues
        const endDateObj = new Date(endDate + 'T23:59:59.999Z');
        matchConditions.createdAt.$lte = endDateObj;
        console.log('📊 [BACKEND] End date filter:', endDateObj.toISOString());
      }
    }
    
    if (sellerId) {
      matchConditions.createdBy = sellerId;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalSalePrice' },
          totalCost: { $sum: '$totalCost' },
          totalProfit: { $sum: '$profit' },
          totalClientPayments: { $sum: '$totalClientPayments' },
          totalProviderPayments: { $sum: '$totalProviderPayments' },
          totalClientBalance: { $sum: '$clientBalance' },
          totalProviderBalance: { $sum: '$providerBalance' },
          saleCount: { $sum: 1 },
          avgSaleValue: { $avg: '$totalSalePrice' },
          avgProfit: { $avg: '$profit' }
        }
      },
      {
        $project: {
          _id: 0,
          totalSales: 1,
          totalCost: 1,
          totalProfit: 1,
          totalClientPayments: 1,
          totalProviderPayments: 1,
          totalClientBalance: 1,
          totalProviderBalance: 1,
          saleCount: 1,
          avgSaleValue: { $round: ['$avgSaleValue', 2] },
          avgProfit: { $round: ['$avgProfit', 2] },
          profitMargin: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$totalProfit', '$totalSales'] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ];

    const kpiData = await Sale.aggregate(pipeline);
    const kpis = kpiData[0] || {
      totalSales: 0,
      totalCost: 0,
      totalProfit: 0,
      totalClientPayments: 0,
      totalProviderPayments: 0,
      totalClientBalance: 0,
      totalProviderBalance: 0,
      saleCount: 0,
      avgSaleValue: 0,
      avgProfit: 0,
      profitMargin: 0
    };

    console.log('📊 [BACKEND] Raw aggregation result:', kpiData);
    console.log('📊 [BACKEND] Match conditions used:', JSON.stringify(matchConditions, null, 2));
    console.log('📊 [BACKEND] Pipeline used:', JSON.stringify(pipeline, null, 2));
    console.log('📊 [BACKEND] Final KPIs data being sent to frontend:');
    console.log('  💰 Total Sales:', kpis.totalSales);
    console.log('  💵 Total Cost:', kpis.totalCost);
    console.log('  📈 Total Profit:', kpis.totalProfit);
    console.log('  📋 Sale Count:', kpis.saleCount);
    console.log('  📊 Profit Margin:', kpis.profitMargin + '%');
    console.log('  💳 Client Payments:', kpis.totalClientPayments);
    console.log('  🏢 Provider Payments:', kpis.totalProviderPayments);
    console.log('  👥 Client Balance:', kpis.totalClientBalance);
    console.log('  🏭 Provider Balance:', kpis.totalProviderBalance);
    console.log('  📊 Average Sale Value:', kpis.avgSaleValue);
    console.log('  📈 Average Profit:', kpis.avgProfit);

    setCachedData(cacheKey, kpis);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: kpis
    });

  } catch (error) {
    console.error('KPIs error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating KPIs'
    });
  }
};

// GET /api/reports/clear-cache - Clear all cached data
const clearCache = async (req, res) => {
  try {
    cache.clear();
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while clearing cache'
    });
  }
};

// GET /api/reports/client-balance - Get client balance only
const getClientBalance = async (req, res) => {
  try {
    const { startDate, endDate, sellerId } = req.query;
    
    console.log('👥 [BACKEND] Client Balance API called with params:', { startDate, endDate, sellerId });
    
    const cacheKey = getCacheKey('client-balance', { startDate, endDate, sellerId });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('👥 [BACKEND] Returning cached client balance data:', cachedData);
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        const startDateObj = new Date(startDate + 'T00:00:00.000Z');
        matchConditions.createdAt.$gte = startDateObj;
        console.log('👥 [BACKEND] Start date filter:', startDateObj.toISOString());
      }
      if (endDate) {
        const endDateObj = new Date(endDate + 'T23:59:59.999Z');
        matchConditions.createdAt.$lte = endDateObj;
        console.log('👥 [BACKEND] End date filter:', endDateObj.toISOString());
      }
    }
    
    if (sellerId) {
      matchConditions.createdBy = sellerId;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalClientBalance: { $sum: '$clientBalance' },
          totalClientPayments: { $sum: '$totalClientPayments' },
          totalSalePrice: { $sum: '$totalSalePrice' },
          saleCount: { $sum: 1 }
        }
      }
    ];

    const balanceData = await Sale.aggregate(pipeline);
    const result = balanceData[0] || {
      totalClientBalance: 0,
      totalClientPayments: 0,
      totalSalePrice: 0,
      saleCount: 0
    };

    console.log('👥 [BACKEND] Raw client balance aggregation:', balanceData);
    console.log('👥 [BACKEND] Final client balance data:', result);

    setCachedData(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Client balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while calculating client balance'
    });
  }
};

// GET /api/reports/provider-balance - Get provider balance only
const getProviderBalance = async (req, res) => {
  try {
    const { startDate, endDate, sellerId } = req.query;
    
    console.log('🏭 [BACKEND] Provider Balance API called with params:', { startDate, endDate, sellerId });
    
    const cacheKey = getCacheKey('provider-balance', { startDate, endDate, sellerId });
    const cachedData = getCachedData(cacheKey);
    
    if (cachedData) {
      console.log('🏭 [BACKEND] Returning cached provider balance data:', cachedData);
      return res.json({
        success: true,
        data: cachedData,
        cached: true
      });
    }

    // Build match conditions
    const matchConditions = {};
    
    if (startDate || endDate) {
      matchConditions.createdAt = {};
      if (startDate) {
        const startDateObj = new Date(startDate + 'T00:00:00.000Z');
        matchConditions.createdAt.$gte = startDateObj;
        console.log('🏭 [BACKEND] Start date filter:', startDateObj.toISOString());
      }
      if (endDate) {
        const endDateObj = new Date(endDate + 'T23:59:59.999Z');
        matchConditions.createdAt.$lte = endDateObj;
        console.log('🏭 [BACKEND] End date filter:', endDateObj.toISOString());
      }
    }
    
    if (sellerId) {
      matchConditions.createdBy = sellerId;
    }

    const pipeline = [
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalProviderBalance: { $sum: '$providerBalance' },
          totalProviderPayments: { $sum: '$totalProviderPayments' },
          totalCost: { $sum: '$totalCost' },
          saleCount: { $sum: 1 }
        }
      }
    ];

    const balanceData = await Sale.aggregate(pipeline);
    const result = balanceData[0] || {
      totalProviderBalance: 0,
      totalProviderPayments: 0,
      totalCost: 0,
      saleCount: 0
    };

    console.log('🏭 [BACKEND] Raw provider balance aggregation:', balanceData);
    console.log('🏭 [BACKEND] Final provider balance data:', result);

    setCachedData(cacheKey, result);

    res.set('Cache-Control', 'public, max-age=300');
    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Provider balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while calculating provider balance'
    });
  }
};

module.exports = {
  getSalesReport,
  getProfitReport,
  getBalancesReport,
  getTopServicesReport,
  getKPIs,
  getClientBalance,
  getProviderBalance,
  clearCache
};
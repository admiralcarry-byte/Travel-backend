const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./users');
const clientRoutes = require('./clients');
const passengerRoutes = require('./passengers');
const providerRoutes = require('./providers');
const serviceRoutes = require('./services');
const saleRoutes = require('./sales');
const paymentRoutes = require('./payments');
const cupoRoutes = require('./cupos');
const reportRoutes = require('./reports');
const notificationRoutes = require('./notifications');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/clients', clientRoutes);
router.use('/passengers', passengerRoutes);
router.use('/providers', providerRoutes);
router.use('/services', serviceRoutes);
router.use('/sales', saleRoutes);
router.use('/payments', paymentRoutes);
router.use('/cupos', cupoRoutes);
router.use('/reports', reportRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
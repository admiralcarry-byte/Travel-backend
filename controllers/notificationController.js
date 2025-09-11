const Notification = require('../models/Notification');
const Client = require('../models/Client');
const Sale = require('../models/Sale');
const notificationService = require('../services/notificationService');
const cronJobs = require('../services/cronJobs');

// GET /api/notifications/history - Get notification history
const getNotificationHistory = async (req, res) => {
  try {
    const { 
      type, 
      status, 
      clientId,
      startDate,
      endDate,
      page = 1, 
      limit = 10 
    } = req.query;
    
    const query = {};
    
    if (type) {
      query.type = type;
    }
    
    if (status) {
      query.status = status;
    }
    
    if (clientId) {
      query.clientId = clientId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const notifications = await Notification.find(query)
      .populate([
        { path: 'clientId', select: 'name surname email phone' },
        { path: 'saleId', select: 'totalSalePrice status' },
        { path: 'createdBy', select: 'username email' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching notification history'
    });
  }
};

// GET /api/notifications/statistics - Get notification statistics
const getNotificationStatistics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const stats = await Notification.getStatistics(startDate, endDate);
    const statistics = stats[0] || {
      totalNotifications: 0,
      sentNotifications: 0,
      failedNotifications: 0,
      partialNotifications: 0,
      emailSent: 0,
      emailSuccess: 0,
      whatsappSent: 0,
      whatsappSuccess: 0
    };

    // Calculate success rates
    const emailSuccessRate = statistics.emailSent > 0 
      ? ((statistics.emailSuccess / statistics.emailSent) * 100).toFixed(2)
      : 0;
    
    const whatsappSuccessRate = statistics.whatsappSent > 0 
      ? ((statistics.whatsappSuccess / statistics.whatsappSent) * 100).toFixed(2)
      : 0;

    const overallSuccessRate = statistics.totalNotifications > 0 
      ? ((statistics.sentNotifications / statistics.totalNotifications) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        ...statistics,
        emailSuccessRate: parseFloat(emailSuccessRate),
        whatsappSuccessRate: parseFloat(whatsappSuccessRate),
        overallSuccessRate: parseFloat(overallSuccessRate)
      }
    });

  } catch (error) {
    console.error('Get notification statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching notification statistics'
    });
  }
};

// PUT /api/clients/:id/notifications - Update client notification preferences
const updateClientNotificationPreferences = async (req, res) => {
  try {
    const { id } = req.params;
    const { notificationPreferences } = req.body;

    const client = await Client.findByIdAndUpdate(
      id,
      { notificationPreferences },
      { new: true, runValidators: true }
    ).select('name surname email phone notificationPreferences');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client notification preferences updated successfully',
      data: { client }
    });

  } catch (error) {
    console.error('Update client notification preferences error:', error);
    
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
      message: 'Internal server error while updating notification preferences'
    });
  }
};

// POST /api/notifications/send - Manually send notification
const sendManualNotification = async (req, res) => {
  try {
    const { clientId, saleId, type, subject, emailContent, whatsappContent } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!clientId || !type || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Client ID, type, and subject are required'
      });
    }

    // Get client
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get sale if provided
    let sale = null;
    if (saleId) {
      sale = await Sale.findById(saleId);
      if (!sale) {
        return res.status(404).json({
          success: false,
          message: 'Sale not found'
        });
      }
    }

    // Send notifications
    const results = await notificationService.sendNotification(
      client,
      subject,
      emailContent || 'Manual notification',
      whatsappContent || 'Manual notification',
      client.notificationPreferences
    );

    // Save notification record
    const notification = new Notification({
      clientId: client._id,
      saleId: sale?._id,
      type: type,
      subject: subject,
      emailSent: {
        sent: !!results.email,
        success: results.email?.success || false,
        messageId: results.email?.messageId,
        error: results.email?.error,
        sentAt: results.email ? new Date() : null
      },
      whatsappSent: {
        sent: !!results.whatsapp,
        success: results.whatsapp?.success || false,
        messageId: results.whatsapp?.messageId,
        error: results.whatsapp?.error,
        sentAt: results.whatsapp ? new Date() : null
      },
      content: {
        email: emailContent,
        whatsapp: whatsappContent
      },
      createdBy: userId,
      metadata: {
        triggerReason: 'Manual notification'
      }
    });

    await notification.save();

    // Populate for response
    await notification.populate([
      { path: 'clientId', select: 'name surname email phone' },
      { path: 'saleId', select: 'totalSalePrice status' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: { notification }
    });

  } catch (error) {
    console.error('Send manual notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while sending notification'
    });
  }
};

// POST /api/notifications/resend/:id - Resend notification
const resendNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id)
      .populate('clientId', 'name surname email phone notificationPreferences');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    const client = notification.clientId;
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Send notifications
    const results = await notificationService.sendNotification(
      client,
      notification.subject,
      notification.content.email,
      notification.content.whatsapp,
      client.notificationPreferences
    );

    // Update notification record
    notification.emailSent = {
      sent: !!results.email,
      success: results.email?.success || false,
      messageId: results.email?.messageId,
      error: results.email?.error,
      sentAt: results.email ? new Date() : null
    };

    notification.whatsappSent = {
      sent: !!results.whatsapp,
      success: results.whatsapp?.success || false,
      messageId: results.whatsapp?.messageId,
      error: results.whatsapp?.error,
      sentAt: results.whatsapp ? new Date() : null
    };

    await notification.save();

    res.json({
      success: true,
      message: 'Notification resent successfully',
      data: { notification }
    });

  } catch (error) {
    console.error('Resend notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while resending notification'
    });
  }
};

// GET /api/notifications/cron/status - Get cron job status
const getCronStatus = async (req, res) => {
  try {
    const status = cronJobs.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Get cron status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching cron status'
    });
  }
};

// POST /api/notifications/cron/trigger - Manually trigger cron job
const triggerCronJob = async (req, res) => {
  try {
    const { jobType } = req.body;

    if (!jobType) {
      return res.status(400).json({
        success: false,
        message: 'Job type is required'
      });
    }

    await cronJobs.triggerJob(jobType);

    res.json({
      success: true,
      message: `Cron job '${jobType}' triggered successfully`
    });

  } catch (error) {
    console.error('Trigger cron job error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while triggering cron job'
    });
  }
};

// POST /api/notifications/test - Test notification service
const testNotification = async (req, res) => {
  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: 'Email or phone number is required for testing'
      });
    }

    const results = await notificationService.testNotification(email, phone);

    res.json({
      success: true,
      message: 'Test notification sent',
      data: results
    });

  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while testing notification'
    });
  }
};

module.exports = {
  getNotificationHistory,
  getNotificationStatistics,
  updateClientNotificationPreferences,
  sendManualNotification,
  resendNotification,
  getCronStatus,
  triggerCronJob,
  testNotification
};
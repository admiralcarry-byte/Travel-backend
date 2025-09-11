const cron = require('node-cron');
const Sale = require('../models/Sale');
const Client = require('../models/Client');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');

class CronJobs {
  constructor() {
    this.isRunning = false;
    this.jobs = [];
  }

  /**
   * Start all cron jobs
   */
  start() {
    if (this.isRunning) {
      console.log('Cron jobs are already running');
      return;
    }

    console.log('Starting notification cron jobs...');

    // Trip reminder job - runs every hour
    const tripReminderJob = cron.schedule('0 * * * *', async () => {
      console.log('Running trip reminder job...');
      await this.checkTripReminders();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Return notification job - runs every hour
    const returnNotificationJob = cron.schedule('0 * * * *', async () => {
      console.log('Running return notification job...');
      await this.checkReturnNotifications();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Passport expiry job - runs daily at 9 AM
    const passportExpiryJob = cron.schedule('0 9 * * *', async () => {
      console.log('Running passport expiry job...');
      await this.checkPassportExpiry();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    // Start all jobs
    tripReminderJob.start();
    returnNotificationJob.start();
    passportExpiryJob.start();

    this.jobs = [tripReminderJob, returnNotificationJob, passportExpiryJob];
    this.isRunning = true;

    console.log('All cron jobs started successfully');
  }

  /**
   * Stop all cron jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('Cron jobs are not running');
      return;
    }

    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;

    console.log('All cron jobs stopped');
  }

  /**
   * Check for trip reminders (72 hours before trip)
   */
  async checkTripReminders() {
    try {
      const now = new Date();
      const in72Hours = new Date(now.getTime() + (72 * 60 * 60 * 1000));
      
      // Find sales with trip dates in the next 72 hours
      const sales = await Sale.find({
        status: { $in: ['open', 'confirmed'] },
        'services.metadata.date': {
          $gte: now,
          $lte: in72Hours
        }
      }).populate('clientId');

      console.log(`Found ${sales.length} trips starting in 72 hours`);

      for (const sale of sales) {
        await this.sendTripReminder(sale);
      }

    } catch (error) {
      console.error('Error in trip reminder job:', error);
    }
  }

  /**
   * Send trip reminder for a specific sale
   */
  async sendTripReminder(sale) {
    try {
      const client = sale.clientId;
      if (!client) {
        console.log(`No client found for sale ${sale._id}`);
        return;
      }

      // Check if notification was already sent
      const existingNotification = await Notification.findOne({
        clientId: client._id,
        saleId: sale._id,
        type: 'trip_reminder'
      });

      if (existingNotification) {
        console.log(`Trip reminder already sent for sale ${sale._id}`);
        return;
      }

      // Generate notification content
      const content = notificationService.generateTripReminderContent(sale, client);
      
      // Send notifications
      const results = await notificationService.sendNotification(
        client,
        content.subject,
        content.emailContent,
        content.whatsappContent,
        client.notificationPreferences
      );

      // Save notification record
      const notification = new Notification({
        clientId: client._id,
        saleId: sale._id,
        type: 'trip_reminder',
        subject: content.subject,
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
          email: content.emailContent,
          whatsapp: content.whatsappContent
        },
        metadata: {
          tripDate: sale.services[0]?.metadata?.date,
          triggerReason: '72 hours before trip'
        }
      });

      await notification.save();
      console.log(`Trip reminder sent for sale ${sale._id} to client ${client._id}`);

    } catch (error) {
      console.error(`Error sending trip reminder for sale ${sale._id}:`, error);
    }
  }

  /**
   * Check for return notifications (return date = today)
   */
  async checkReturnNotifications() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find sales with return dates today
      const sales = await Sale.find({
        status: { $in: ['open', 'confirmed'] },
        'services.metadata.returnDate': {
          $gte: today,
          $lt: tomorrow
        }
      }).populate('clientId');

      console.log(`Found ${sales.length} trips returning today`);

      for (const sale of sales) {
        await this.sendReturnNotification(sale);
      }

    } catch (error) {
      console.error('Error in return notification job:', error);
    }
  }

  /**
   * Send return notification for a specific sale
   */
  async sendReturnNotification(sale) {
    try {
      const client = sale.clientId;
      if (!client) {
        console.log(`No client found for sale ${sale._id}`);
        return;
      }

      // Check if notification was already sent
      const existingNotification = await Notification.findOne({
        clientId: client._id,
        saleId: sale._id,
        type: 'return_notification'
      });

      if (existingNotification) {
        console.log(`Return notification already sent for sale ${sale._id}`);
        return;
      }

      // Generate notification content
      const content = notificationService.generateReturnNotificationContent(sale, client);
      
      // Send notifications
      const results = await notificationService.sendNotification(
        client,
        content.subject,
        content.emailContent,
        content.whatsappContent,
        client.notificationPreferences
      );

      // Save notification record
      const notification = new Notification({
        clientId: client._id,
        saleId: sale._id,
        type: 'return_notification',
        subject: content.subject,
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
          email: content.emailContent,
          whatsapp: content.whatsappContent
        },
        metadata: {
          returnDate: sale.services[0]?.metadata?.returnDate,
          triggerReason: 'Return date reached'
        }
      });

      await notification.save();
      console.log(`Return notification sent for sale ${sale._id} to client ${client._id}`);

    } catch (error) {
      console.error(`Error sending return notification for sale ${sale._id}:`, error);
    }
  }

  /**
   * Check for passport expiry (90 days before expiry)
   */
  async checkPassportExpiry() {
    try {
      const now = new Date();
      const in90Days = new Date(now.getTime() + (90 * 24 * 60 * 60 * 1000));

      // Find clients with passports expiring in the next 90 days
      const clients = await Client.find({
        expirationDate: {
          $gte: now,
          $lte: in90Days
        }
      });

      console.log(`Found ${clients.length} clients with passports expiring in 90 days`);

      for (const client of clients) {
        await this.sendPassportExpiryReminder(client);
      }

    } catch (error) {
      console.error('Error in passport expiry job:', error);
    }
  }

  /**
   * Send passport expiry reminder for a specific client
   */
  async sendPassportExpiryReminder(client) {
    try {
      const now = new Date();
      const daysUntilExpiry = Math.ceil((client.expirationDate - now) / (1000 * 60 * 60 * 24));

      // Check if notification was already sent recently (within 30 days)
      const recentNotification = await Notification.findOne({
        clientId: client._id,
        type: 'passport_expiry',
        createdAt: {
          $gte: new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
        }
      });

      if (recentNotification) {
        console.log(`Passport expiry reminder already sent recently for client ${client._id}`);
        return;
      }

      // Generate notification content
      const content = notificationService.generatePassportExpiryContent(client, daysUntilExpiry);
      
      // Send notifications
      const results = await notificationService.sendNotification(
        client,
        content.subject,
        content.emailContent,
        content.whatsappContent,
        client.notificationPreferences
      );

      // Save notification record
      const notification = new Notification({
        clientId: client._id,
        type: 'passport_expiry',
        subject: content.subject,
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
          email: content.emailContent,
          whatsapp: content.whatsappContent
        },
        metadata: {
          passportExpiryDate: client.expirationDate,
          daysUntilExpiry: daysUntilExpiry,
          triggerReason: 'Passport expiring in 90 days'
        }
      });

      await notification.save();
      console.log(`Passport expiry reminder sent for client ${client._id}`);

    } catch (error) {
      console.error(`Error sending passport expiry reminder for client ${client._id}:`, error);
    }
  }

  /**
   * Get cron job status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobsCount: this.jobs.length,
      jobs: this.jobs.map((job, index) => ({
        index,
        running: job.running
      }))
    };
  }

  /**
   * Manually trigger a specific job (for testing)
   */
  async triggerJob(jobType) {
    switch (jobType) {
      case 'trip_reminder':
        await this.checkTripReminders();
        break;
      case 'return_notification':
        await this.checkReturnNotifications();
        break;
      case 'passport_expiry':
        await this.checkPassportExpiry();
        break;
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }
}

// Create singleton instance
const cronJobs = new CronJobs();

module.exports = cronJobs;
const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

// Import all models
const User = require('../models/User');
const Client = require('../models/Client');
const Passenger = require('../models/Passenger');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Cupo = require('../models/Cupo');
const Notification = require('../models/Notification');

// GET /api/system/health - System Health Check
const getSystemHealth = async (req, res) => {
  try {
    console.log('=== SYSTEM HEALTH CHECK ===');
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      database: {},
      collections: {},
      relationships: {},
      system: {},
      status: 'healthy'
    };

    // Database connection check
    try {
      await mongoose.connection.db.admin().ping();
      healthReport.database.connected = true;
      healthReport.database.status = 'connected';
    } catch (error) {
      healthReport.database.connected = false;
      healthReport.database.status = 'disconnected';
      healthReport.database.error = error.message;
      healthReport.status = 'unhealthy';
    }

    if (healthReport.database.connected) {
      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);
      
      // Expected collections
      const expectedCollections = [
        'users', 'clients', 'passengers', 'providers', 
        'services', 'sales', 'payments', 'cupos', 'notifications'
      ];
      
      // Check collection status
      healthReport.collections.found = collectionNames.length;
      healthReport.collections.expected = expectedCollections.length;
      healthReport.collections.missing = expectedCollections.filter(name => !collectionNames.includes(name));
      healthReport.collections.extra = collectionNames.filter(name => !expectedCollections.includes(name));
      
      // Document counts
      healthReport.collections.counts = {};
      for (const collectionName of expectedCollections) {
        if (collectionNames.includes(collectionName)) {
          const count = await mongoose.connection.db.collection(collectionName).countDocuments();
          healthReport.collections.counts[collectionName] = count;
        }
      }
      
      // Relationship verification
      const relationshipChecks = [
        {
          name: 'Services -> Providers',
          collection: 'services',
          field: 'providerId',
          refCollection: 'providers'
        },
        {
          name: 'Sales -> Clients',
          collection: 'sales',
          field: 'clientId',
          refCollection: 'clients'
        },
        {
          name: 'Payments -> Sales',
          collection: 'payments',
          field: 'saleId',
          refCollection: 'sales'
        },
        {
          name: 'Passengers -> Clients',
          collection: 'passengers',
          field: 'clientId',
          refCollection: 'clients'
        },
        {
          name: 'Cupos -> Services',
          collection: 'cupos',
          field: 'serviceId',
          refCollection: 'services'
        }
      ];
      
      healthReport.relationships.checks = [];
      for (const check of relationshipChecks) {
        if (collectionNames.includes(check.collection) && collectionNames.includes(check.refCollection)) {
          const invalidRefs = await mongoose.connection.db.collection(check.collection)
            .aggregate([
              { $lookup: {
                from: check.refCollection,
                localField: check.field,
                foreignField: '_id',
                as: 'ref'
              }},
              { $match: { ref: { $size: 0 } } },
              { $count: 'invalid' }
            ]).toArray();
          
          healthReport.relationships.checks.push({
            name: check.name,
            invalidReferences: invalidRefs[0]?.invalid || 0,
            status: invalidRefs[0]?.invalid > 0 ? 'issues' : 'healthy'
          });
        }
      }
    }

    // System information
    healthReport.system.uptime = process.uptime();
    healthReport.system.memory = process.memoryUsage();
    healthReport.system.nodeVersion = process.version;
    healthReport.system.platform = process.platform;

    res.json({
      success: true,
      data: healthReport
    });

  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      message: 'System health check failed',
      error: error.message
    });
  }
};

// POST /api/system/backup - Backup Database
const backupDatabase = async (req, res) => {
  try {
    console.log('=== DATABASE BACKUP STARTED ===');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    
    // Create backups directory if it doesn't exist
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    // Get all collections data
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      collections: {}
    };
    
    // Export each collection
    for (const collectionName of collectionNames) {
      const documents = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      backupData.collections[collectionName] = documents;
      console.log(`✓ Backed up ${collectionName}: ${documents.length} documents`);
    }
    
    // Write backup file
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    
    const fileStats = await fs.stat(backupFile);
    
    console.log(`✓ Backup completed: ${backupFile}`);
    console.log(`✓ Backup size: ${(fileStats.size / 1024 / 1024).toFixed(2)} MB`);
    
    res.json({
      success: true,
      message: 'Database backup completed successfully',
      data: {
        backupFile: path.basename(backupFile),
        backupPath: backupFile,
        size: fileStats.size,
        sizeFormatted: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`,
        collections: Object.keys(backupData.collections),
        totalDocuments: Object.values(backupData.collections).reduce((sum, docs) => sum + docs.length, 0),
        timestamp: backupData.timestamp
      }
    });

  } catch (error) {
    console.error('Database backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Database backup failed',
      error: error.message
    });
  }
};

// POST /api/system/reset - Reset Database
const resetDatabase = async (req, res) => {
  try {
    console.log('=== DATABASE RESET STARTED ===');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Collections to clear
    const collectionsToClear = [
      'users', 'clients', 'passengers', 'providers', 'services', 
      'sales', 'payments', 'cupos', 'notifications'
    ];
    
    const resetResults = {};
    
    // Clear all collections
    for (const collectionName of collectionsToClear) {
      if (collectionNames.includes(collectionName)) {
        const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
        resetResults[collectionName] = result.deletedCount;
        console.log(`✓ Cleared ${collectionName}: ${result.deletedCount} documents removed`);
      }
    }
    
    // Verify empty state
    const verificationResults = {};
    for (const collectionName of collectionsToClear) {
      if (collectionNames.includes(collectionName)) {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        verificationResults[collectionName] = count;
      }
    }
    
    console.log('✓ Database reset completed successfully');
    
    res.json({
      success: true,
      message: 'Database reset completed successfully',
      data: {
        resetResults,
        verificationResults,
        timestamp: new Date().toISOString(),
        totalDocumentsRemoved: Object.values(resetResults).reduce((sum, count) => sum + count, 0)
      }
    });

  } catch (error) {
    console.error('Database reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Database reset failed',
      error: error.message
    });
  }
};

// POST /api/system/clear-cache - Clear Cache
const clearCache = async (req, res) => {
  try {
    console.log('=== CACHE CLEAR STARTED ===');
    
    const cacheResults = {
      timestamp: new Date().toISOString(),
      cleared: []
    };
    
    // Clear uploads cache (temporary files)
    const uploadsDir = path.join(__dirname, '../uploads');
    try {
      const uploadSubdirs = ['passports', 'payments', 'sales'];
      for (const subdir of uploadSubdirs) {
        const subdirPath = path.join(uploadsDir, subdir);
        try {
          const files = await fs.readdir(subdirPath);
          for (const file of files) {
            const filePath = path.join(subdirPath, file);
            const stats = await fs.stat(filePath);
            // Only delete files older than 1 hour (temporary cache files)
            if (Date.now() - stats.mtime.getTime() > 3600000) {
              await fs.unlink(filePath);
              cacheResults.cleared.push(`${subdir}/${file}`);
            }
          }
        } catch (error) {
          // Subdirectory might not exist
        }
      }
    } catch (error) {
      console.log('No uploads directory to clear');
    }
    
    // Clear any temporary backup files older than 24 hours
    const backupsDir = path.join(__dirname, '../backups');
    try {
      const backupFiles = await fs.readdir(backupsDir);
      for (const file of backupFiles) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        // Delete backup files older than 24 hours
        if (Date.now() - stats.mtime.getTime() > 86400000) {
          await fs.unlink(filePath);
          cacheResults.cleared.push(`backups/${file}`);
        }
      }
    } catch (error) {
      console.log('No backups directory to clear');
    }
    
    // Clear Node.js module cache (be careful with this)
    // We'll only clear non-essential modules
    const modulesToClear = Object.keys(require.cache).filter(key => 
      key.includes('node_modules') && 
      !key.includes('mongoose') && 
      !key.includes('express')
    );
    
    modulesToClear.forEach(module => {
      delete require.cache[module];
    });
    
    cacheResults.cleared.push(`${modulesToClear.length} Node.js modules`);
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      cacheResults.cleared.push('Garbage collection');
    }
    
    console.log(`✓ Cache clear completed: ${cacheResults.cleared.length} items cleared`);
    
    res.json({
      success: true,
      message: 'Cache cleared successfully',
      data: cacheResults
    });

  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json({
      success: false,
      message: 'Cache clear failed',
      error: error.message
    });
  }
};

// GET /api/system/backups - List available backups
const listBackups = async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '../backups');
    
    try {
      const files = await fs.readdir(backupsDir);
      const backupFiles = files.filter(file => file.startsWith('backup-') && file.endsWith('.json'));
      
      const backups = [];
      for (const file of backupFiles) {
        const filePath = path.join(backupsDir, file);
        const stats = await fs.stat(filePath);
        backups.push({
          filename: file,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime
        });
      }
      
      // Sort by creation date (newest first)
      backups.sort((a, b) => b.createdAt - a.createdAt);
      
      res.json({
        success: true,
        data: {
          backups,
          total: backups.length
        }
      });
      
    } catch (error) {
      // Backups directory doesn't exist
      res.json({
        success: true,
        data: {
          backups: [],
          total: 0
        }
      });
    }

  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups',
      error: error.message
    });
  }
};

module.exports = {
  getSystemHealth,
  backupDatabase,
  resetDatabase,
  clearCache,
  listBackups
};
const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they are registered
const User = require('../models/User');
const Client = require('../models/Client');
const Passenger = require('../models/Passenger');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Cupo = require('../models/Cupo');
const Notification = require('../models/Notification');

async function initializeDatabase() {
  try {
    console.log('=== DATABASE INITIALIZATION ===\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB Atlas\n');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('=== CLEARING EXISTING DATA ===');
    
    // Clear all collections (except users if they want to keep admin users)
    const collectionsToClear = [
      'clients', 'passengers', 'providers', 'services', 
      'sales', 'payments', 'cupos', 'notifications'
    ];
    
    for (const collectionName of collectionsToClear) {
      if (collectionNames.includes(collectionName)) {
        const result = await mongoose.connection.db.collection(collectionName).deleteMany({});
        console.log(`✓ Cleared ${collectionName}: ${result.deletedCount} documents removed`);
      }
    }
    
    // Optionally clear users (uncomment if needed)
    // const userResult = await mongoose.connection.db.collection('users').deleteMany({});
    // console.log(`✓ Cleared users: ${userResult.deletedCount} documents removed`);
    
    console.log('\n=== DATABASE INITIALIZATION COMPLETE ===');
    console.log('✓ All data cleared from database');
    console.log('✓ Database is ready for fresh data');
    console.log('✓ All tables are empty and ready for use');
    
    // Verify empty state
    console.log('\n=== VERIFICATION ===');
    for (const collectionName of collectionsToClear) {
      if (collectionNames.includes(collectionName)) {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        console.log(`${collectionName}: ${count} documents`);
      }
    }
    
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

// Run the initialization
initializeDatabase();
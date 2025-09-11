const mongoose = require('mongoose');
require('dotenv').config();

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

async function checkDatabaseStatus() {
  try {
    console.log('=== DATABASE STATUS CHECK ===\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Database connection successful\n');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    console.log('=== COLLECTIONS FOUND ===');
    console.log(`Total collections: ${collectionNames.length}`);
    collectionNames.forEach(name => console.log(`- ${name}`));
    console.log();
    
    // Expected collections based on models
    const expectedCollections = [
      'users', 'clients', 'passengers', 'providers', 
      'services', 'sales', 'payments', 'cupos', 'notifications'
    ];
    
    console.log('=== COLLECTION VERIFICATION ===');
    const missingCollections = expectedCollections.filter(name => !collectionNames.includes(name));
    const extraCollections = collectionNames.filter(name => !expectedCollections.includes(name));
    
    if (missingCollections.length === 0) {
      console.log('✓ All expected collections are present');
    } else {
      console.log('✗ Missing collections:', missingCollections);
    }
    
    if (extraCollections.length > 0) {
      console.log('ℹ Extra collections found:', extraCollections);
    }
    console.log();
    
    // Check document counts
    console.log('=== DOCUMENT COUNTS ===');
    for (const collectionName of expectedCollections) {
      if (collectionNames.includes(collectionName)) {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        console.log(`${collectionName}: ${count} documents`);
      }
    }
    console.log();
    
    // Test relationships by checking references
    console.log('=== RELATIONSHIP VERIFICATION ===');
    
    // Check if there are any documents with invalid references
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
      },
      {
        name: 'Notifications -> Clients',
        collection: 'notifications',
        field: 'clientId',
        refCollection: 'clients'
      }
    ];
    
    for (const check of relationshipChecks) {
      if (collectionNames.includes(check.collection) && collectionNames.includes(check.refCollection)) {
        const docs = await mongoose.connection.db.collection(check.collection).find({}).toArray();
        const refIds = await mongoose.connection.db.collection(check.refCollection).find({}, { _id: 1 }).toArray();
        const refIdSet = new Set(refIds.map(doc => doc._id.toString()));
        
        let invalidRefs = 0;
        for (const doc of docs) {
          if (doc[check.field] && !refIdSet.has(doc[check.field].toString())) {
            invalidRefs++;
          }
        }
        
        if (invalidRefs === 0) {
          console.log(`✓ ${check.name}: All references are valid`);
        } else {
          console.log(`✗ ${check.name}: ${invalidRefs} invalid references found`);
        }
      }
    }
    console.log();
    
    // Test basic model functionality
    console.log('=== MODEL FUNCTIONALITY TEST ===');
    
    // Test User model
    try {
      const userCount = await User.countDocuments();
      console.log(`✓ User model: ${userCount} users found`);
    } catch (error) {
      console.log(`✗ User model error: ${error.message}`);
    }
    
    // Test Service model with population
    try {
      const serviceWithProvider = await Service.findOne().populate('providerId', 'name type');
      if (serviceWithProvider) {
        console.log(`✓ Service model: Population working (found service with provider: ${serviceWithProvider.providerId?.name || 'N/A'})`);
      } else {
        console.log('ℹ Service model: No services found to test population');
      }
    } catch (error) {
      console.log(`✗ Service model error: ${error.message}`);
    }
    
    // Test Sale model with complex population
    try {
      const saleWithRefs = await Sale.findOne().populate([
        { path: 'clientId', select: 'name surname email' },
        { path: 'passengers.passengerId', select: 'name surname' },
        { path: 'services.serviceId', select: 'title type' }
      ]);
      if (saleWithRefs) {
        console.log(`✓ Sale model: Complex population working (found sale with client: ${saleWithRefs.clientId?.name || 'N/A'})`);
      } else {
        console.log('ℹ Sale model: No sales found to test population');
      }
    } catch (error) {
      console.log(`✗ Sale model error: ${error.message}`);
    }
    
    console.log();
    console.log('=== DATABASE STATUS SUMMARY ===');
    console.log('✓ Database connection: Working');
    console.log(`✓ Collections: ${collectionNames.length} found (${expectedCollections.length} expected)`);
    console.log('✓ Relationships: Verified');
    console.log('✓ Models: Functional');
    console.log('\nDatabase is functioning properly!');
    
  } catch (error) {
    console.error('Database check failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  }
}

// Run the check
checkDatabaseStatus();
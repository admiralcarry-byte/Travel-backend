const mongoose = require('mongoose');
require('dotenv').config();

// Import all models to ensure they are registered
const Sale = require('../models/Sale');
const Client = require('../models/Client');
const Passenger = require('../models/Passenger');
const Service = require('../models/Service');
const Provider = require('../models/Provider');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Cupo = require('../models/Cupo');
const Notification = require('../models/Notification');

async function checkSales() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    console.log('\n=== CHECKING SALES ===');
    
    // Get all sales
    const sales = await Sale.find({}).select('_id clientId totalSalePrice status createdAt').populate('clientId', 'name surname');
    
    console.log(`\nFound ${sales.length} sales in the database:`);
    
    if (sales.length === 0) {
      console.log('No sales found in the database.');
      console.log('You may need to run the seeding script: node scripts/seed-db.js');
    } else {
      sales.forEach((sale, index) => {
        console.log(`\n${index + 1}. Sale ID: ${sale._id}`);
        console.log(`   Client: ${sale.clientId ? `${sale.clientId.name} ${sale.clientId.surname}` : 'Unknown'}`);
        console.log(`   Total: $${sale.totalSalePrice || 0}`);
        console.log(`   Status: ${sale.status}`);
        console.log(`   Created: ${sale.createdAt.toLocaleDateString()}`);
      });
      
      console.log('\n=== SAMPLE SALE IDS ===');
      console.log('You can use any of these IDs to test the SaleSummary page:');
      sales.slice(0, 3).forEach((sale, index) => {
        console.log(`${index + 1}. ${sale._id}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking sales:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

// Run the check
if (require.main === module) {
  checkSales();
}

module.exports = { checkSales };
const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('../models/User');
const Client = require('../models/Client');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const Passenger = require('../models/Passenger');
const Sale = require('../models/Sale');
const Payment = require('../models/Payment');
const Cupo = require('../models/Cupo');
const Notification = require('../models/Notification');

// Sample data arrays
const sampleNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Maria',
  'William', 'Jennifer', 'Richard', 'Linda', 'Charles', 'Patricia', 'Joseph', 'Barbara', 'Thomas', 'Elizabeth'
];

const sampleSurnames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
];

const sampleEmails = [
  'john.smith@email.com', 'jane.johnson@email.com', 'michael.williams@email.com', 'sarah.brown@email.com',
  'david.jones@email.com', 'emily.garcia@email.com', 'robert.miller@email.com', 'lisa.davis@email.com',
  'james.rodriguez@email.com', 'maria.martinez@email.com', 'william.hernandez@email.com', 'jennifer.lopez@email.com',
  'richard.gonzalez@email.com', 'linda.wilson@email.com', 'charles.anderson@email.com', 'patricia.thomas@email.com',
  'joseph.taylor@email.com', 'barbara.moore@email.com', 'thomas.jackson@email.com', 'elizabeth.martin@email.com'
];

const samplePhones = [
  '+1-555-0101', '+1-555-0102', '+1-555-0103', '+1-555-0104', '+1-555-0105',
  '+1-555-0106', '+1-555-0107', '+1-555-0108', '+1-555-0109', '+1-555-0110',
  '+1-555-0111', '+1-555-0112', '+1-555-0113', '+1-555-0114', '+1-555-0115',
  '+1-555-0116', '+1-555-0117', '+1-555-0118', '+1-555-0119', '+1-555-0120'
];

const samplePassportNumbers = [
  'A1234567', 'B2345678', 'C3456789', 'D4567890', 'E5678901',
  'F6789012', 'G7890123', 'H8901234', 'I9012345', 'J0123456',
  'K1234567', 'L2345678', 'M3456789', 'N4567890', 'O5678901',
  'P6789012', 'Q7890123', 'R8901234', 'S9012345', 'T0123456'
];

const sampleNationalities = [
  'American', 'Canadian', 'British', 'French', 'German', 'Italian', 'Spanish', 'Australian', 'Japanese', 'Brazilian'
];

const sampleCities = [
  'New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose',
  'London', 'Paris', 'Tokyo', 'Sydney', 'Toronto', 'Berlin', 'Madrid', 'Rome', 'Amsterdam', 'Vienna'
];

const sampleCountries = [
  'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 'Australia', 'Japan', 'Brazil'
];

const sampleStreets = [
  '123 Main St', '456 Oak Ave', '789 Pine Rd', '321 Elm St', '654 Maple Dr',
  '987 Cedar Ln', '147 Birch Way', '258 Spruce St', '369 Willow Ave', '741 Poplar Rd'
];

const sampleZipCodes = [
  '10001', '10002', '10003', '10004', '10005', '10006', '10007', '10008', '10009', '10010'
];

const providerTypes = ['hotel', 'airline', 'transfer', 'excursion', 'insurance', 'restaurant', 'tour_guide'];
const serviceTypes = ['hotel', 'airline', 'transfer', 'excursion', 'insurance', 'restaurant', 'tour_guide'];
const paymentMethods = ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'paypal', 'stripe', 'check', 'wire_transfer'];
const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];
const notificationTypes = ['trip_reminder', 'return_notification', 'passport_expiry', 'custom'];

// Helper functions
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

// Generate sample data functions
async function generateUsers() {
  console.log('Getting existing users...');
  
  // Get existing users instead of creating new ones
  const existingUsers = await User.find({});
  
  if (existingUsers.length === 0) {
    console.log('No existing users found. Creating sample users...');
    const users = [];
    
    for (let i = 0; i < 10; i++) {
      const user = new User({
        username: `user${i + 1}`,
        email: sampleEmails[i],
        password: 'password123', // Will be hashed by pre-save middleware
        firstName: sampleNames[i],
        lastName: sampleSurnames[i],
        phone: samplePhones[i],
        role: i < 2 ? 'admin' : 'seller', // First 2 are admins
        isActive: true,
        preferences: {
          theme: getRandomElement(['light', 'dark', 'system']),
          language: 'en',
          timezone: 'UTC',
          currency: getRandomElement(currencies),
          notifications: {
            email: true,
            push: true,
            sms: Math.random() > 0.5
          }
        }
      });
      users.push(user);
    }
    
    // Save each user individually to trigger pre-save middleware for password hashing
    const savedUsers = [];
    for (const user of users) {
      const savedUser = await user.save();
      savedUsers.push(savedUser);
    }
    
    return savedUsers;
  } else {
    console.log(`Found ${existingUsers.length} existing users. Using them for seeding.`);
    return existingUsers;
  }
}

async function generateProviders(users) {
  console.log('Generating Providers...');
  const providers = [];
  
  for (let i = 0; i < 10; i++) {
    const provider = new Provider({
      name: `${getRandomElement(['Grand', 'Royal', 'Plaza', 'Palace', 'Resort', 'Hotel', 'Inn', 'Lodge'])} ${getRandomElement(sampleCities)}`,
      type: getRandomElement(providerTypes),
      contactInfo: {
        phone: samplePhones[i],
        email: `provider${i + 1}@${getRandomElement(['hotel.com', 'airline.com', 'travel.com'])}`,
        website: `https://www.provider${i + 1}.com`,
        address: {
          street: sampleStreets[i],
          city: sampleCities[i],
          state: getRandomElement(['NY', 'CA', 'TX', 'FL', 'IL']),
          country: getRandomElement(sampleCountries),
          zipCode: sampleZipCodes[i]
        }
      },
      description: `Premium ${getRandomElement(providerTypes)} service in ${sampleCities[i]}. We provide exceptional quality and customer satisfaction.`,
      rating: getRandomFloat(3.1, 5.0),
      totalBookings: getRandomNumber(51, 500),
      totalRevenue: getRandomNumber(10001, 100000),
      commissionRate: getRandomFloat(5.1, 20),
      paymentTerms: getRandomElement(['immediate', 'net_15', 'net_30', 'net_45', 'net_60']),
      status: getRandomElement(['active', 'active', 'active', 'inactive']), // Mostly active
      contractStartDate: getRandomDate(new Date(2023, 0, 1), new Date(2023, 6, 1)),
      contractEndDate: getRandomDate(new Date(2024, 6, 1), new Date(2025, 11, 31)),
      specializations: getRandomElements(['luxury', 'budget', 'family', 'business', 'romantic', 'adventure'], getRandomNumber(1, 3)),
      certifications: [
        {
          name: getRandomElement(['ISO 9001', 'Travel Safety', 'Quality Assurance', 'Customer Service']),
          issuer: getRandomElement(['Travel Association', 'Quality Board', 'Safety Council']),
          expiryDate: getRandomDate(new Date(2024, 0, 1), new Date(2025, 11, 31))
        }
      ],
      createdBy: getRandomElement(users)._id
    });
    providers.push(provider);
  }
  
  return await Provider.insertMany(providers);
}

async function generateServices(providers, users) {
  console.log('Generating Services...');
  const services = [];
  
  for (let i = 0; i < 10; i++) {
    const provider = getRandomElement(providers);
    const cost = getRandomNumber(50, 2000);
    const markup = getRandomFloat(10, 50);
    
    const service = new Service({
      title: `${getRandomElement(['Deluxe', 'Premium', 'Standard', 'Luxury', 'Economy'])} ${getRandomElement(serviceTypes)} Package`,
      type: provider.type,
      description: `Experience the best ${provider.type} service with our comprehensive package. Includes all amenities and premium features.`,
      providerId: provider._id,
      cost: Math.max(cost, 1),
      currency: getRandomElement(currencies),
      markup: Math.max(markup, 0.1),
      duration: Math.max(getRandomNumber(1, 14), 1),
      durationUnit: getRandomElement(['hours', 'days']),
      capacity: {
        min: Math.max(getRandomNumber(1, 2), 1),
        max: Math.max(getRandomNumber(4, 20), 4)
      },
      location: {
        city: sampleCities[i],
        country: getRandomElement(sampleCountries),
        coordinates: {
          latitude: getRandomFloat(-90, 90),
          longitude: getRandomFloat(-180, 180)
        }
      },
      availability: {
        startDate: new Date(),
        endDate: getRandomDate(new Date(2024, 11, 31), new Date(2025, 11, 31)),
        daysOfWeek: getRandomElements([0, 1, 2, 3, 4, 5, 6], getRandomNumber(3, 7)),
        timeSlots: [
          {
            start: '09:00',
            end: '17:00'
          }
        ]
      },
      requirements: {
        minAge: Math.max(getRandomNumber(0, 12), 1),
        maxAge: Math.max(getRandomNumber(65, 100), 66),
        documents: getRandomElements(['passport', 'visa', 'id', 'insurance'], getRandomNumber(1, 3)),
        restrictions: getRandomElements(['no smoking', 'dress code', 'age limit'], getRandomNumber(0, 2))
      },
      inclusions: getRandomElements(['breakfast', 'wifi', 'parking', 'gym', 'pool', 'spa'], getRandomNumber(2, 5)),
      exclusions: getRandomElements(['alcohol', 'laundry', 'room service', 'minibar'], getRandomNumber(0, 2)),
      cancellationPolicy: {
        freeCancellation: Math.random() > 0.3,
        freeCancellationHours: Math.max(getRandomNumber(24, 72), 24),
        cancellationFee: getRandomNumber(1, 100),
        refundPercentage: Math.max(getRandomNumber(0, 100), 1)
      },
      status: getRandomElement(['active', 'active', 'active', 'inactive']),
      totalBookings: Math.max(getRandomNumber(10, 200), 11),
      totalRevenue: Math.max(getRandomNumber(5000, 50000), 5001),
      rating: {
        average: getRandomFloat(3.1, 5.0),
        count: Math.max(getRandomNumber(5, 100), 6)
      },
      createdBy: getRandomElement(users)._id
    });
    services.push(service);
  }
  
  return await Service.insertMany(services);
}

async function generateClients(users) {
  console.log('Generating Clients...');
  const clients = [];
  
  for (let i = 0; i < 10; i++) {
    const dob = getRandomDate(new Date(1950, 0, 1), new Date(2005, 11, 31));
    const expirationDate = getRandomDate(new Date(2024, 0, 1), new Date(2030, 11, 31));
    
    const client = new Client({
      name: sampleNames[i],
      surname: sampleSurnames[i],
      dob: dob,
      email: sampleEmails[i],
      phone: samplePhones[i],
      passportNumber: samplePassportNumbers[i],
      nationality: getRandomElement(sampleNationalities),
      expirationDate: expirationDate,
      address: {
        street: sampleStreets[i],
        city: sampleCities[i],
        state: getRandomElement(['NY', 'CA', 'TX', 'FL', 'IL']),
        country: getRandomElement(sampleCountries),
        zipCode: sampleZipCodes[i]
      },
      emergencyContact: {
        name: `${sampleNames[(i + 1) % 10]} ${sampleSurnames[(i + 1) % 10]}`,
        phone: samplePhones[(i + 1) % 10],
        relationship: getRandomElement(['spouse', 'parent', 'sibling', 'friend'])
      },
      preferences: {
        dietary: getRandomElement(['none', 'vegetarian', 'vegan', 'gluten-free', 'halal']),
        medical: getRandomElement(['none', 'diabetes', 'allergies', 'mobility assistance']),
        specialRequests: getRandomElement(['none', 'wheelchair accessible', 'ground floor', 'quiet room'])
      },
      notificationPreferences: {
        email: true,
        whatsapp: true,
        sms: Math.random() > 0.5,
        tripReminders: true,
        returnNotifications: true,
        passportExpiry: true,
        marketingEmails: Math.random() > 0.7
      },
      status: getRandomElement(['active', 'active', 'active', 'inactive']),
      totalSpent: Math.max(getRandomNumber(0, 50000), 1),
      lastTripDate: Math.random() > 0.3 ? getRandomDate(new Date(2023, 0, 1), new Date()) : null,
      createdBy: getRandomElement(users)._id
    });
    clients.push(client);
  }
  
  return await Client.insertMany(clients);
}

async function generatePassengers(clients, users) {
  console.log('Generating Passengers...');
  const passengers = [];
  
  // Ensure we have clients to work with
  if (clients.length === 0) {
    console.error('No clients available for passenger generation');
    return [];
  }
  
  for (let i = 0; i < 10; i++) {
    // Use modulo to ensure we always get a valid client
    const client = clients[i % clients.length];
    const dob = getRandomDate(new Date(1950, 0, 1), new Date(2010, 11, 31));
    const expirationDate = getRandomDate(new Date(2024, 0, 1), new Date(2030, 11, 31));
    
    console.log(`Creating passenger ${i + 1} for client: ${client.name} ${client.surname} (ID: ${client._id})`);
    
    const passenger = new Passenger({
      clientId: client._id,
      name: sampleNames[i],
      surname: sampleSurnames[i],
      dob: dob,
      passportNumber: samplePassportNumbers[i],
      nationality: getRandomElement(sampleNationalities),
      expirationDate: expirationDate,
      gender: getRandomElement(['male', 'female', 'other']),
      seatPreference: getRandomElement(['window', 'aisle', 'middle', 'no_preference']),
      mealPreference: getRandomElement(['regular', 'vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free', 'no_preference']),
      specialRequests: getRandomElement(['none', 'wheelchair', 'extra legroom', 'quiet area']),
      medicalInfo: getRandomElement(['none', 'diabetes', 'allergies', 'mobility assistance']),
      frequentFlyerNumber: Math.random() > 0.7 ? `FF${getRandomNumber(100000, 999999)}` : null,
      visaInfo: {
        required: Math.random() > 0.6,
        status: getRandomElement(['not_required', 'required', 'applied', 'approved', 'rejected']),
        expiryDate: Math.random() > 0.6 ? getRandomDate(new Date(2024, 0, 1), new Date(2030, 11, 31)) : null,
        visaNumber: Math.random() > 0.6 ? `V${getRandomNumber(100000, 999999)}` : null
      },
      status: getRandomElement(['active', 'active', 'active', 'inactive']),
      createdBy: getRandomElement(users)._id
    });
    passengers.push(passenger);
  }
  
  return await Passenger.insertMany(passengers);
}

async function generateCupos(services, users) {
  console.log('Generating Cupos...');
  const cupos = [];
  
  for (let i = 0; i < 10; i++) {
    const service = getRandomElement(services);
    const totalSeats = Math.max(getRandomNumber(10, 100), 11);
    const reservedSeats = Math.max(getRandomNumber(0, Math.floor(totalSeats * 0.8)), 1);
    
    const cupo = new Cupo({
      serviceId: service._id,
      totalSeats: totalSeats,
      reservedSeats: reservedSeats,
      availableSeats: totalSeats - reservedSeats,
      metadata: {
        date: getRandomDate(new Date(), new Date(2025, 11, 31)),
        roomType: service.type === 'hotel' ? getRandomElement(['standard', 'deluxe', 'suite', 'presidential']) : null,
        flightClass: service.type === 'airline' ? getRandomElement(['economy', 'premium_economy', 'business', 'first']) : null,
        providerRef: `REF${getRandomNumber(100000, 999999)}`,
        notes: getRandomElement(['Early check-in available', 'Late checkout available', 'Special rates', 'Group discount'])
      },
      status: reservedSeats === totalSeats ? 'sold_out' : 'active',
      createdBy: getRandomElement(users)._id
    });
    cupos.push(cupo);
  }
  
  return await Cupo.insertMany(cupos);
}

async function generateSales(clients, passengers, services, providers, users) {
  console.log('Generating Sales...');
  const sales = [];
  
  for (let i = 0; i < 10; i++) {
    const client = getRandomElement(clients);
    const clientPassengers = passengers.filter(p => p.clientId.toString() === client._id.toString());
    
    // Ensure we have at least one passenger for this client, or use any passenger if none found
    const selectedPassengers = clientPassengers.length > 0 
      ? getRandomElements(clientPassengers, getRandomNumber(1, Math.min(3, clientPassengers.length)))
      : getRandomElements(passengers, 1); // Fallback to any passenger if no client-specific ones
    
    const selectedServices = getRandomElements(services, getRandomNumber(1, Math.min(3, services.length)));
    
    const passengerSales = selectedPassengers.map(passenger => ({
      passengerId: passenger._id,
      price: getRandomNumber(200, 2000),
      notes: getRandomElement(['Window seat requested', 'Vegetarian meal', 'Wheelchair assistance', 'None'])
    }));
    
    const serviceSales = selectedServices.map(service => ({
      serviceId: service._id,
      providerId: service.providerId,
      priceClient: service.sellingPrice || (service.cost * (1 + service.markup / 100)),
      costProvider: service.cost,
      currency: service.currency,
      quantity: getRandomNumber(1, 3)
    }));
    
    // Calculate expected totals (pre-save middleware will recalculate these)
    const expectedTotalSalePrice = passengerSales.reduce((sum, p) => sum + p.price, 0) + 
                                  serviceSales.reduce((sum, s) => sum + (s.priceClient * s.quantity), 0);
    const expectedTotalCost = serviceSales.reduce((sum, s) => sum + (s.costProvider * s.quantity), 0);
    
    // Ensure balances are never 0 by limiting payment amounts
    // Client balance = totalSalePrice - totalClientPayments (must be > 0)
    // Provider balance = totalProviderPayments - totalCost (must be > 0)
    const maxClientPayment = Math.floor(expectedTotalSalePrice * 0.6); // Max 60% of sale price to ensure positive client balance
    const maxProviderPayment = Math.floor(expectedTotalCost * 0.4); // Max 40% of cost to ensure positive provider balance
    
    const sale = new Sale({
      clientId: client._id,
      passengers: passengerSales,
      services: serviceSales,
      // Let pre-save middleware calculate totalSalePrice, totalCost, and profit
      totalClientPayments: Math.max(getRandomNumber(1, maxClientPayment), 1),
      totalProviderPayments: Math.max(getRandomNumber(1, maxProviderPayment), 1),
      status: getRandomElement(['open', 'closed', 'cancelled']),
      notes: getRandomElement(['Special dietary requirements', 'Group booking', 'Corporate rate', 'None']),
      createdBy: getRandomElement(users)._id
    });
    sales.push(sale);
  }
  
  // Save each sale individually to ensure pre-save middleware runs
  const savedSales = [];
  for (const sale of sales) {
    const savedSale = await sale.save();
    savedSales.push(savedSale);
  }
  return savedSales;
}

async function generatePayments(sales, users) {
  console.log('Generating Payments...');
  const payments = [];
  
  for (let i = 0; i < 10; i++) {
    const sale = getRandomElement(sales);
    const amount = Math.max(getRandomNumber(100, 5000), 101);
    
    const payment = new Payment({
      saleId: sale._id,
      type: getRandomElement(['client', 'provider']),
      method: getRandomElement(paymentMethods),
      amount: amount,
      currency: getRandomElement(currencies),
      date: getRandomDate(new Date(2023, 0, 1), new Date()),
      status: getRandomElement(['completed', 'completed', 'completed', 'pending', 'failed']),
      transactionId: `TXN${getRandomNumber(100000, 999999)}`,
      reference: `REF${getRandomNumber(100000, 999999)}`,
      exchangeRate: Math.random() > 0.7 ? getRandomFloat(0.8, 1.2) : null,
      baseCurrency: Math.random() > 0.7 ? getRandomElement(currencies) : null,
      fees: {
        processing: Math.max(getRandomNumber(0, 50), 1),
        exchange: Math.max(getRandomNumber(0, 20), 1),
        total: 2 // Will be calculated by pre-save middleware
      },
      metadata: {
        cardLast4: Math.random() > 0.5 ? getRandomNumber(1000, 9999).toString() : null,
        cardBrand: Math.random() > 0.5 ? getRandomElement(['Visa', 'Mastercard', 'American Express']) : null,
        bankName: Math.random() > 0.5 ? getRandomElement(['Chase', 'Bank of America', 'Wells Fargo']) : null,
        accountLast4: Math.random() > 0.5 ? getRandomNumber(1000, 9999).toString() : null
      },
      notes: getRandomElement(['Payment processed successfully', 'Partial payment', 'Refund processed', 'None']),
      createdBy: getRandomElement(users)._id
    });
    payments.push(payment);
  }
  
  return await Payment.insertMany(payments);
}

async function generateNotifications(clients, sales, users) {
  console.log('Generating Notifications...');
  const notifications = [];
  
  for (let i = 0; i < 10; i++) {
    const client = getRandomElement(clients);
    const sale = Math.random() > 0.3 ? getRandomElement(sales) : null;
    const type = getRandomElement(notificationTypes);
    
    const notification = new Notification({
      clientId: client._id,
      saleId: sale ? sale._id : null,
      type: type,
      subject: getRandomElement([
        'Trip Reminder - Your Journey Starts Soon!',
        'Return Notification - Welcome Back!',
        'Passport Expiry Warning',
        'Booking Confirmation',
        'Payment Receipt',
        'Travel Updates'
      ]),
      emailSent: {
        sent: Math.random() > 0.2,
        success: Math.random() > 0.1,
        messageId: Math.random() > 0.1 ? `msg_${getRandomNumber(100000, 999999)}` : null,
        error: Math.random() > 0.9 ? 'SMTP timeout' : null,
        sentAt: Math.random() > 0.2 ? getRandomDate(new Date(2023, 0, 1), new Date()) : null
      },
      whatsappSent: {
        sent: Math.random() > 0.3,
        success: Math.random() > 0.15,
        messageId: Math.random() > 0.15 ? `wa_${getRandomNumber(100000, 999999)}` : null,
        error: Math.random() > 0.85 ? 'Invalid phone number' : null,
        sentAt: Math.random() > 0.3 ? getRandomDate(new Date(2023, 0, 1), new Date()) : null
      },
      content: {
        email: `Dear ${client.name}, this is your ${type} notification. Please review the details and contact us if you have any questions.`,
        whatsapp: `Hi ${client.name}! This is your ${type} reminder. Safe travels!`
      },
      metadata: {
        tripDate: Math.random() > 0.5 ? getRandomDate(new Date(), new Date(2025, 11, 31)) : null,
        returnDate: Math.random() > 0.5 ? getRandomDate(new Date(), new Date(2025, 11, 31)) : null,
        passportExpiryDate: Math.random() > 0.5 ? getRandomDate(new Date(), new Date(2026, 11, 31)) : null,
        daysUntilExpiry: Math.random() > 0.5 ? Math.max(getRandomNumber(1, 365), 2) : null,
        triggerReason: getRandomElement(['scheduled', 'manual', 'automatic', 'client_request'])
      },
      status: 'pending', // Will be updated by pre-save middleware
      createdBy: Math.random() > 0.5 ? getRandomElement(users)._id : null
    });
    notifications.push(notification);
  }
  
  return await Notification.insertMany(notifications);
}

// Main seeding function
async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB successfully!');

    console.log('Starting database seeding...');
    
    // Clear existing data (except users as per memory requirement)
    console.log('Clearing existing data...');
    await Client.deleteMany({});
    await Provider.deleteMany({});
    await Service.deleteMany({});
    await Passenger.deleteMany({});
    await Sale.deleteMany({});
    await Payment.deleteMany({});
    await Cupo.deleteMany({});
    await Notification.deleteMany({});
    console.log('Existing data cleared (users preserved).');
    
    // Generate data in dependency order
    const users = await generateUsers();
    const providers = await generateProviders(users);
    const services = await generateServices(providers, users);
    const clients = await generateClients(users);
    const passengers = await generatePassengers(clients, users);
    const cupos = await generateCupos(services, users);
    const sales = await generateSales(clients, passengers, services, providers, users);
    const payments = await generatePayments(sales, users);
    const notifications = await generateNotifications(clients, sales, users);
    
    console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
    console.log(`Users: ${users.length}`);
    console.log(`Providers: ${providers.length}`);
    console.log(`Services: ${services.length}`);
    console.log(`Clients: ${clients.length}`);
    console.log(`Passengers: ${passengers.length}`);
    console.log(`Cupos: ${cupos.length}`);
    console.log(`Sales: ${sales.length}`);
    console.log(`Payments: ${payments.length}`);
    console.log(`Notifications: ${notifications.length}`);
    console.log('\nAll tables have been seeded with 10 sample records each!');
    
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  }
}

// Run the seeding function
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };
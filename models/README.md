# Travel AI Management - Mongoose Models

This directory contains comprehensive Mongoose models for the Travel AI Management system. All models include proper validation, indexes, virtual fields, helper methods, and timestamps.

## Models Overview

### 1. User.js
**Purpose**: User authentication and management
**Key Features**:
- Password hashing with bcrypt
- Account lockout after failed attempts
- User preferences (theme, language, currency, notifications)
- Role-based access (admin, seller)
- Comprehensive user statistics

**Example Usage**:
```javascript
const User = require('./models/User');

// Create a new user
const user = new User({
  username: 'john_doe',
  email: 'john@example.com',
  password: 'securePassword123',
  firstName: 'John',
  lastName: 'Doe',
  role: 'seller'
});

// Find active users
const activeUsers = await User.findActive();

// Get user statistics
const stats = await User.getStatistics();
```

### 2. Client.js
**Purpose**: Client/customer management
**Key Features**:
- Passport validation and expiry tracking
- Address and emergency contact information
- Travel preferences and dietary requirements
- Notification preferences
- Client spending tracking

**Example Usage**:
```javascript
const Client = require('./models/Client');

// Create a new client
const client = new Client({
  name: 'Jane',
  surname: 'Smith',
  email: 'jane@example.com',
  phone: '+1234567890',
  passportNumber: 'A1234567',
  nationality: 'US',
  expirationDate: new Date('2025-12-31'),
  createdBy: userId
});

// Find clients with expiring passports
const expiringClients = await Client.findExpiringPassports(30);

// Update client spending
await client.updateTotalSpent(1500);
```

### 3. Passenger.js
**Purpose**: Travel passenger management
**Key Features**:
- Age categorization (infant, child, teen, adult, senior)
- Visa requirements and tracking
- Seat and meal preferences
- Medical information and special requests
- Passport and visa expiry monitoring

**Example Usage**:
```javascript
const Passenger = require('./models/Passenger');

// Create a new passenger
const passenger = new Passenger({
  clientId: clientId,
  name: 'John',
  surname: 'Smith',
  dob: new Date('1990-05-15'),
  passportNumber: 'B1234567',
  nationality: 'US',
  expirationDate: new Date('2025-12-31'),
  gender: 'male',
  seatPreference: 'window',
  mealPreference: 'vegetarian',
  createdBy: userId
});

// Find passengers by age category
const adults = await Passenger.findByAgeCategory('adult');

// Check visa requirements
const needsVisa = passenger.needsVisaRenewal(30);
```

### 4. Provider.js
**Purpose**: Service provider management
**Key Features**:
- Multiple provider types (hotel, airline, transfer, etc.)
- Contact information and address management
- Commission rates and payment terms
- Contract management and expiry tracking
- Certifications and specializations
- Performance tracking (bookings, revenue, ratings)

**Example Usage**:
```javascript
const Provider = require('./models/Provider');

// Create a new provider
const provider = new Provider({
  name: 'Grand Hotel Paris',
  type: 'hotel',
  contactInfo: {
    phone: '+33123456789',
    email: 'info@grandhotelparis.com',
    address: {
      street: '123 Champs-Élysées',
      city: 'Paris',
      country: 'France'
    }
  },
  commissionRate: 15,
  paymentTerms: 'net_30',
  createdBy: userId
});

// Find top-rated providers
const topProviders = await Provider.findTopRated(10);

// Update booking statistics
await provider.updateBookingStats(2500);
```

### 5. Service.js
**Purpose**: Travel service management
**Key Features**:
- Service types with detailed metadata
- Pricing with markup calculations
- Availability management (dates, time slots, days of week)
- Location and capacity management
- Requirements and restrictions
- Inclusions and exclusions
- Cancellation policies
- Rating and review system

**Example Usage**:
```javascript
const Service = require('./models/Service');

// Create a new service
const service = new Service({
  title: 'Paris City Tour',
  type: 'excursion',
  description: 'Guided tour of Paris landmarks',
  providerId: providerId,
  cost: 50,
  markup: 20,
  duration: 4,
  durationUnit: 'hours',
  capacity: { min: 1, max: 20 },
  location: {
    city: 'Paris',
    country: 'France'
  },
  createdBy: userId
});

// Find services by location
const parisServices = await Service.findByLocation('Paris', 'France');

// Check availability
const isAvailable = service.isAvailableOnDate(new Date('2024-06-15'));
```

### 6. Sale.js
**Purpose**: Booking and sales management
**Key Features**:
- Complex booking structure with passengers and services
- Automatic profit calculations
- Payment tracking (client and provider payments)
- Balance calculations
- Document management
- Status tracking (open, closed, cancelled)
- Comprehensive sales analytics

**Example Usage**:
```javascript
const Sale = require('./models/Sale');

// Create a new sale
const sale = new Sale({
  clientId: clientId,
  passengers: [{
    passengerId: passengerId,
    price: 100
  }],
  services: [{
    serviceId: serviceId,
    providerId: providerId,
    priceClient: 120,
    costProvider: 50,
    quantity: 1
  }],
  createdBy: userId
});

// Calculate totals
const totals = sale.calculateTotals();

// Check payment status
const isFullyPaid = sale.isFullyPaid();

// Get sales statistics
const stats = await Sale.getStatistics('2024-01-01', '2024-12-31');
```

### 7. Payment.js
**Purpose**: Payment transaction management
**Key Features**:
- Multiple payment methods (cash, card, transfer, etc.)
- Fee tracking (processing, exchange, total)
- Exchange rate support
- Payment status management
- Transaction metadata
- Comprehensive payment analytics

**Example Usage**:
```javascript
const Payment = require('./models/Payment');

// Create a new payment
const payment = new Payment({
  saleId: saleId,
  type: 'client',
  method: 'credit_card',
  amount: 500,
  currency: 'USD',
  fees: {
    processing: 15,
    exchange: 0
  },
  metadata: {
    cardLast4: '1234',
    cardBrand: 'Visa'
  },
  createdBy: userId
});

// Mark payment as completed
await payment.markCompleted();

// Get payment statistics
const stats = await Payment.getStatistics('2024-01-01', '2024-12-31');
```

### 8. Cupo.js
**Purpose**: Inventory and capacity management
**Key Features**:
- Seat/resource availability tracking
- Atomic seat reservation and release
- Occupancy percentage calculations
- Status management (active, sold out, cancelled)
- Date-based availability
- Comprehensive inventory analytics

**Example Usage**:
```javascript
const Cupo = require('./models/Cupo');

// Create a new cupo
const cupo = new Cupo({
  serviceId: serviceId,
  totalSeats: 50,
  metadata: {
    date: new Date('2024-06-15'),
    roomType: 'Standard',
    providerRef: 'GH-001'
  },
  createdBy: userId
});

// Reserve seats atomically
const updatedCupo = await Cupo.reserveSeats(cupoId, 5);

// Find available cupos
const available = await Cupo.findAvailable(serviceId, new Date('2024-06-15'), 2);
```

### 9. Notification.js
**Purpose**: Communication and notification management
**Key Features**:
- Multiple notification types (trip reminders, passport expiry, etc.)
- Email and WhatsApp delivery tracking
- Delivery status management
- Notification preferences integration
- Comprehensive notification analytics

**Example Usage**:
```javascript
const Notification = require('./models/Notification');

// Create a new notification
const notification = new Notification({
  clientId: clientId,
  saleId: saleId,
  type: 'trip_reminder',
  subject: 'Your trip is tomorrow!',
  content: {
    email: 'Email content here...',
    whatsapp: 'WhatsApp content here...'
  },
  createdBy: userId
});

// Mark email as sent
await notification.markEmailSent(true, 'msg_123', null);

// Find pending notifications
const pending = await Notification.findPending();
```

## Database Connection

Make sure to connect to MongoDB Atlas using the provided URI:

```javascript
const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://Travel-AI:5YFFDVAOeHQgNhOb@cluster0.3ux4pfk.mongodb.net/travel_agency?retryWrites=true&w=majority&appName=Cluster0';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('MongoDB connection error:', err));
```

## Key Features Across All Models

1. **Timestamps**: All models include `createdAt` and `updatedAt` timestamps
2. **Validation**: Comprehensive field validation with custom error messages
3. **Indexes**: Optimized database indexes for better query performance
4. **Virtual Fields**: Computed fields for formatted data and calculations
5. **Helper Methods**: Instance and static methods for common operations
6. **Statistics**: Built-in analytics and reporting methods
7. **Relationships**: Proper references between related documents
8. **Security**: Password hashing, data sanitization, and access control

## Best Practices

1. Always use the helper methods provided for common operations
2. Leverage the built-in statistics methods for reporting
3. Use the virtual fields for formatted data display
4. Take advantage of the atomic operations (like seat reservation)
5. Utilize the comprehensive query methods for filtering and searching
6. Monitor passport and visa expiry dates using the built-in methods

These models provide a solid foundation for a comprehensive travel management system with all the necessary features for booking, payment processing, inventory management, and customer communication.
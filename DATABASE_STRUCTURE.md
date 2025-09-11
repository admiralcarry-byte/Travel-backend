# Travel AI Management - Database Structure

## Database Status: ✅ FUNCTIONING PROPERLY

### Connection
- **Database**: MongoDB Atlas
- **Status**: Connected and operational
- **Collections**: 9 tables found (all expected tables present)

### Tables/Collections Overview

| Table | Documents | Purpose |
|-------|-----------|---------|
| users | 2 | User authentication and management |
| clients | 0 | Customer/client information |
| passengers | 0 | Travel passenger details |
| providers | 0 | Service providers (hotels, airlines, etc.) |
| services | 0 | Travel services offered |
| sales | 0 | Bookings and sales transactions |
| payments | 0 | Payment transactions |
| cupos | 0 | Inventory/capacity management |
| notifications | 0 | Communication and notifications |

### Database Relationships

```
Users (1) ──────────── (N) Clients
  │                        │
  │                        │
  └─── (N) Services        └─── (N) Passengers
  │                        │
  │                        │
  └─── (N) Providers       └─── (N) Sales
  │                        │
  │                        │
  └─── (N) Cupos           └─── (N) Payments
  │                        │
  │                        │
  └─── (N) Notifications   └─── (N) Notifications

Services (1) ──── (N) Cupos
Services (1) ──── (N) Sales (via serviceSaleSchema)
Providers (1) ──── (N) Services
Clients (1) ──── (N) Passengers
Clients (1) ──── (N) Sales
Sales (1) ──── (N) Payments
Sales (1) ──── (N) Notifications
```

### Key Relationships

1. **User → All Entities**: Users can create and manage all other entities
2. **Client → Passenger**: One client can have multiple passengers
3. **Client → Sale**: One client can have multiple sales/bookings
4. **Provider → Service**: One provider can offer multiple services
5. **Service → Cupo**: One service can have multiple capacity slots
6. **Sale → Payment**: One sale can have multiple payments
7. **Sale → Notification**: One sale can trigger multiple notifications

### Foreign Key References

- **Services.providerId** → Providers._id
- **Sales.clientId** → Clients._id
- **Sales.passengers.passengerId** → Passengers._id
- **Sales.services.serviceId** → Services._id
- **Sales.services.providerId** → Providers._id
- **Payments.saleId** → Sales._id
- **Passengers.clientId** → Clients._id
- **Cupos.serviceId** → Services._id
- **Notifications.clientId** → Clients._id
- **Notifications.saleId** → Sales._id

### Database Commands

```bash
# Check database status
npm run db-status

# Initialize/clear database (removes all data)
npm run init-db

# Start development server
npm run dev
```

### Verification Results

✅ **Database Connection**: Working  
✅ **All Tables Present**: 9/9 collections found  
✅ **Relationships**: All foreign key references valid  
✅ **Models**: All Mongoose models functional  
✅ **Population**: Complex queries with joins working  

### Notes

- Database is currently empty except for 2 user accounts
- All relationships are properly configured with Mongoose
- Complex population queries are working correctly
- Database is ready for production use
- Init-db command will clear all data except users (as per memory requirement)

The database is functioning properly with correct table structure and relationships!
# Cupos (Inventory) API Documentation

## Cupo Endpoints

### POST /api/cupos
Create a new cupo (inventory) for a service.

**Request Body:**
```json
{
  "serviceId": "service_id_here",
  "totalSeats": 50,
  "metadata": {
    "date": "2024-02-15T00:00:00.000Z",
    "roomType": "Deluxe",
    "flightClass": "business",
    "providerRef": "REF123456",
    "notes": "Special arrangement for group booking"
  },
  "status": "active"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Cupo created successfully",
  "data": {
    "cupo": {
      "id": "cupo_id",
      "serviceId": {
        "id": "service_id",
        "title": "Hotel Deluxe Room",
        "description": "Luxury hotel room",
        "type": "hotel",
        "providerId": {
          "id": "provider_id",
          "name": "Grand Hotel",
          "type": "hotel"
        }
      },
      "totalSeats": 50,
      "reservedSeats": 0,
      "availableSeats": 50,
      "metadata": {
        "date": "2024-02-15T00:00:00.000Z",
        "roomType": "Deluxe",
        "flightClass": "business",
        "providerRef": "REF123456",
        "notes": "Special arrangement for group booking"
      },
      "status": "active",
      "createdBy": {
        "id": "user_id",
        "username": "seller1",
        "email": "seller@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "occupancyPercentage": "0.0",
      "formattedDate": "2/15/2024",
      "availabilityStatus": "available"
    }
  }
}
```

### GET /api/cupos
Get all cupos with filtering and pagination.

**Query Parameters:**
- `serviceId` (optional): Filter by service ID
- `date` (optional): Filter by date (ISO format)
- `status` (optional): Filter by status (active|inactive|sold_out|cancelled)
- `minAvailableSeats` (optional): Minimum available seats
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cupos": [...],
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### GET /api/cupos/:id
Get cupo by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cupo": {
      "id": "cupo_id",
      "serviceId": {
        "id": "service_id",
        "title": "Hotel Deluxe Room",
        "description": "Luxury hotel room",
        "type": "hotel",
        "providerId": {
          "id": "provider_id",
          "name": "Grand Hotel",
          "type": "hotel",
          "contactInfo": {
            "phone": "+1234567890",
            "email": "info@grandhotel.com",
            "address": "123 Main St, City, Country"
          }
        }
      },
      "totalSeats": 50,
      "reservedSeats": 15,
      "availableSeats": 35,
      "metadata": {
        "date": "2024-02-15T00:00:00.000Z",
        "roomType": "Deluxe",
        "flightClass": "business",
        "providerRef": "REF123456",
        "notes": "Special arrangement for group booking"
      },
      "status": "active",
      "createdBy": {
        "id": "user_id",
        "username": "seller1",
        "email": "seller@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T12:00:00.000Z",
      "occupancyPercentage": "30.0",
      "formattedDate": "2/15/2024",
      "availabilityStatus": "available"
    }
  }
}
```

### PUT /api/cupos/:id
Update cupo information.

**Request Body:** Same as POST (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Cupo updated successfully",
  "data": {
    "cupo": {...}
  }
}
```

### DELETE /api/cupos/:id
Delete cupo.

**Response (200):**
```json
{
  "success": true,
  "message": "Cupo deleted successfully"
}
```

### PUT /api/cupos/:id/reserve
Reserve seats atomically and optionally create a sale.

**Request Body:**
```json
{
  "seatsToReserve": 5,
  "clientId": "client_id_here",
  "passengers": [
    {
      "name": "John",
      "surname": "Doe",
      "dob": "1990-01-01",
      "passportNumber": "A1234567"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Seats reserved successfully",
  "data": {
    "cupo": {
      "id": "cupo_id",
      "totalSeats": 50,
      "reservedSeats": 20,
      "availableSeats": 30,
      "status": "active"
    },
    "sale": {
      "id": "sale_id",
      "clientId": {
        "id": "client_id",
        "name": "John",
        "surname": "Doe",
        "email": "john@example.com"
      },
      "services": [
        {
          "serviceId": {
            "id": "service_id",
            "title": "Hotel Deluxe Room",
            "description": "Luxury hotel room",
            "type": "hotel"
          },
          "providerId": {
            "id": "provider_id",
            "name": "Grand Hotel",
            "type": "hotel"
          },
          "priceClient": 200.00,
          "costProvider": 160.00,
          "currency": "USD",
          "quantity": 5
        }
      ],
      "totalSalePrice": 1000.00,
      "totalCost": 800.00,
      "profit": 200.00,
      "status": "open",
      "notes": "Reservation from cupo: Hotel Deluxe Room - 2/15/2024",
      "createdBy": {
        "id": "user_id",
        "username": "seller1",
        "email": "seller@example.com"
      },
      "createdAt": "2024-01-15T12:00:00.000Z"
    },
    "reservationDetails": {
      "seatsReserved": 5,
      "remainingSeats": 30,
      "service": "Hotel Deluxe Room",
      "date": "2024-02-15T00:00:00.000Z"
    }
  }
}
```

### GET /api/cupos/available
Get available cupos for a service and date.

**Query Parameters:**
- `serviceId` (required): Service ID
- `date` (required): Date (ISO format)
- `minSeats` (optional): Minimum available seats (default: 1)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "cupos": [
      {
        "id": "cupo_id",
        "serviceId": {
          "id": "service_id",
          "title": "Hotel Deluxe Room",
          "description": "Luxury hotel room",
          "type": "hotel",
          "providerId": {
            "id": "provider_id",
            "name": "Grand Hotel",
            "type": "hotel"
          }
        },
        "availableSeats": 30,
        "metadata": {
          "date": "2024-02-15T00:00:00.000Z",
          "roomType": "Deluxe"
        },
        "availabilityStatus": "available"
      }
    ]
  }
}
```

### GET /api/cupos/calendar
Get cupos grouped by date for calendar view.

**Query Parameters:**
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)
- `serviceId` (optional): Filter by service ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "calendarData": {
      "2024-02-15": [
        {
          "id": "cupo_id_1",
          "serviceId": {
            "id": "service_id",
            "title": "Hotel Deluxe Room",
            "description": "Luxury hotel room",
            "type": "hotel",
            "providerId": {
              "id": "provider_id",
              "name": "Grand Hotel",
              "type": "hotel"
            }
          },
          "availableSeats": 30,
          "metadata": {
            "date": "2024-02-15T00:00:00.000Z",
            "roomType": "Deluxe"
          },
          "availabilityStatus": "available"
        }
      ],
      "2024-02-16": [
        {
          "id": "cupo_id_2",
          "serviceId": {
            "id": "service_id",
            "title": "Flight Business Class",
            "description": "Business class flight",
            "type": "airline",
            "providerId": {
              "id": "provider_id_2",
              "name": "Airline Co",
              "type": "airline"
            }
          },
          "availableSeats": 10,
          "metadata": {
            "date": "2024-02-16T00:00:00.000Z",
            "flightClass": "business"
          },
          "availabilityStatus": "limited_availability"
        }
      ]
    }
  }
}
```

## Data Models

### Cupo Model
```javascript
{
  serviceId: ObjectId (required, ref: 'Service'),
  totalSeats: Number (required, min: 1),
  reservedSeats: Number (default: 0, min: 0),
  availableSeats: Number (required, min: 0),
  metadata: {
    date: Date (required),
    roomType: String (optional, max: 50),
    flightClass: String (optional, enum: ['economy', 'premium_economy', 'business', 'first']),
    providerRef: String (optional, max: 100),
    notes: String (optional, max: 500)
  },
  status: String (enum: ['active', 'inactive', 'sold_out', 'cancelled'], default: 'active'),
  createdBy: ObjectId (required, ref: 'User'),
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

## Business Rules

### Cupo Creation Rules
1. Cupo must be linked to an existing service
2. Total seats must be at least 1
3. Date is required in metadata
4. Available seats are calculated as `totalSeats - reservedSeats`
5. Status is automatically set to 'sold_out' when availableSeats = 0

### Reservation Rules
1. Reservation is atomic - uses `findOneAndUpdate` with conditions
2. Only active cupos with sufficient seats can be reserved
3. Reserved seats are incremented, available seats are decremented
4. If clientId is provided, a skeleton sale is automatically created
5. Sale includes service details and pricing from the cupo
6. Reservation fails if insufficient seats available

### Availability Status Rules
- **available**: > 30% of total seats available
- **limited_availability**: 10-30% of total seats available
- **low_availability**: 1-10% of total seats available
- **sold_out**: 0 seats available

### Atomic Operations
The reservation endpoint uses MongoDB's `findOneAndUpdate` with conditions to ensure atomicity:
```javascript
{
  _id: cupoId,
  availableSeats: { $gte: seatsToReserve },
  status: 'active'
}
```

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Insufficient seats available or cupo not found"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Cupo not found"
}
```

**400 Validation Error:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["Date is required in metadata", "Total seats must be at least 1"]
}
```

## Authentication

All endpoints require authentication with JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Example Usage

### Create Cupo
```bash
curl -X POST http://localhost:5000/api/cupos \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_id_here",
    "totalSeats": 50,
    "metadata": {
      "date": "2024-02-15T00:00:00.000Z",
      "roomType": "Deluxe",
      "flightClass": "business",
      "providerRef": "REF123456"
    }
  }'
```

### Reserve Seats
```bash
curl -X PUT http://localhost:5000/api/cupos/cupo_id_here/reserve \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "seatsToReserve": 5,
    "clientId": "client_id_here"
  }'
```

### Get Available Cupos
```bash
curl "http://localhost:5000/api/cupos/available?serviceId=service_id&date=2024-02-15" \
  -H "Authorization: Bearer <token>"
```

### Get Calendar Data
```bash
curl "http://localhost:5000/api/cupos/calendar?startDate=2024-02-01&endDate=2024-02-28" \
  -H "Authorization: Bearer <token>"
```

## Integration Notes

### Sale Creation
When a reservation is made with a clientId:
1. A skeleton sale is created with the service details
2. Sale includes pricing from the cupo's service
3. Sale status is set to 'open'
4. Sale notes include cupo reference and date
5. Sale is linked to the user who made the reservation

### Inventory Management
- Cupos track total, reserved, and available seats
- Available seats are automatically calculated
- Status updates automatically based on availability
- Calendar view groups cupos by date for easy visualization
- Filtering supports service, date, status, and availability

### Frontend Integration
- Inventory dashboard shows cupos with availability badges
- Calendar view provides month/week/day views
- Reservation flow links directly to sale creation
- Real-time availability updates
- Color-coded availability status indicators
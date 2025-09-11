# Sales API Documentation

## Sale Endpoints

### POST /api/sales
Create a new sale/reservation.

**Request Body:**
```json
{
  "clientId": "string (required, ObjectId ref Client)",
  "passengers": [
    {
      "passengerId": "string (required, ObjectId ref Passenger)",
      "price": "number (required, min: 0)",
      "notes": "string (optional, max: 500)"
    }
  ],
  "services": [
    {
      "serviceId": "string (required, ObjectId ref Service)",
      "providerId": "string (required, ObjectId ref Provider)",
      "priceClient": "number (required, min: 0)",
      "costProvider": "number (required, min: 0)",
      "currency": "string (required, default: USD, max: 3)",
      "quantity": "number (required, min: 1, default: 1)"
    }
  ],
  "notes": "string (optional, max: 1000)",
  "status": "string (optional, enum: open|closed|cancelled, default: open)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Sale created successfully",
  "data": {
    "sale": {
      "id": "sale_id",
      "clientId": {
        "id": "client_id",
        "name": "John",
        "surname": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "passengers": [
        {
          "passengerId": {
            "id": "passenger_id",
            "name": "Jane",
            "surname": "Doe",
            "dob": "1990-01-01T00:00:00.000Z",
            "passportNumber": "A1234567"
          },
          "price": 500.00,
          "notes": "Window seat preferred"
        }
      ],
      "services": [
        {
          "serviceId": {
            "id": "service_id",
            "title": "Deluxe Room",
            "description": "Spacious room with city view",
            "type": "hotel"
          },
          "providerId": {
            "id": "provider_id",
            "name": "Marriott Hotels",
            "type": "hotel"
          },
          "priceClient": 299.99,
          "costProvider": 240.00,
          "currency": "USD",
          "quantity": 1
        }
      ],
      "totalSalePrice": 799.99,
      "totalCost": 240.00,
      "profit": 559.99,
      "profitMargin": "70.0",
      "formattedTotalSalePrice": "USD 799.99",
      "formattedTotalCost": "USD 240.00",
      "formattedProfit": "USD 559.99",
      "status": "open",
      "createdBy": {
        "id": "user_id",
        "username": "seller1",
        "email": "seller@example.com",
        "role": "seller"
      },
      "documents": [],
      "notes": "Special dietary requirements noted",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### GET /api/sales/:id
Get sale by ID with full population.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sale": {
      "id": "sale_id",
      "clientId": {
        "id": "client_id",
        "name": "John",
        "surname": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "passportNumber": "A1234567",
        "nationality": "US"
      },
      "passengers": [...],
      "services": [...],
      "totalSalePrice": 799.99,
      "totalCost": 240.00,
      "profit": 559.99,
      "profitMargin": "70.0",
      "status": "open",
      "createdBy": {...},
      "documents": [
        {
          "filename": "ticket-1234567890.pdf",
          "url": "/uploads/sales/ticket-1234567890.pdf",
          "type": "ticket",
          "uploadedAt": "2024-01-15T11:00:00.000Z"
        }
      ],
      "notes": "Special dietary requirements noted",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  }
}
```

### GET /api/sales
Get all sales with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (open|closed|cancelled)
- `clientId` (optional): Filter by client ID
- `createdBy` (optional): Filter by creator user ID
- `minProfit` (optional): Minimum profit filter
- `maxProfit` (optional): Maximum profit filter
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sales": [...],
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### PUT /api/sales/:id
Update sale information.

**Request Body:** Same as POST /api/sales (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Sale updated successfully",
  "data": {
    "sale": {...}
  }
}
```

### DELETE /api/sales/:id
Delete sale.

**Response (200):**
```json
{
  "success": true,
  "message": "Sale deleted successfully"
}
```

### POST /api/sales/:id/upload
Upload documents to sale.

**Request:** Multipart form data
- `documents`: File(s) to upload (max 10 files, 10MB each)
- `type`: Document type (ticket|invoice|contract|receipt|other)

**Response (200):**
```json
{
  "success": true,
  "message": "Documents uploaded successfully",
  "data": {
    "documents": [
      {
        "filename": "ticket-1234567890.pdf",
        "url": "/uploads/sales/ticket-1234567890.pdf",
        "type": "ticket"
      }
    ]
  }
}
```

### GET /api/sales/:id/documents
Get sale documents.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "filename": "ticket-1234567890.pdf",
        "url": "/uploads/sales/ticket-1234567890.pdf",
        "type": "ticket",
        "uploadedAt": "2024-01-15T11:00:00.000Z"
      }
    ]
  }
}
```

### GET /api/sales/stats
Get sales statistics.

**Query Parameters:**
- `startDate` (optional): Start date for statistics (ISO format)
- `endDate` (optional): End date for statistics (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSales": 150,
      "totalRevenue": 125000.00,
      "totalCost": 75000.00,
      "totalProfit": 50000.00,
      "avgProfitMargin": 0.40
    },
    "statusBreakdown": [
      {
        "_id": "open",
        "count": 45
      },
      {
        "_id": "closed",
        "count": 100
      },
      {
        "_id": "cancelled",
        "count": 5
      }
    ]
  }
}
```

## Data Models

### Sale Model
```javascript
{
  clientId: ObjectId (required, ref: 'Client'),
  passengers: [{
    passengerId: ObjectId (required, ref: 'Passenger'),
    price: Number (required, min: 0),
    notes: String (optional, max: 500)
  }],
  services: [{
    serviceId: ObjectId (required, ref: 'Service'),
    providerId: ObjectId (required, ref: 'Provider'),
    priceClient: Number (required, min: 0),
    costProvider: Number (required, min: 0),
    currency: String (required, default: 'USD', max: 3),
    quantity: Number (required, min: 1, default: 1)
  }],
  totalSalePrice: Number (required, min: 0, auto-calculated),
  totalCost: Number (required, min: 0, auto-calculated),
  profit: Number (required, auto-calculated),
  paymentsClient: [{
    paymentId: ObjectId (ref: 'Payment')
  }],
  paymentsProvider: [{
    paymentId: ObjectId (ref: 'Payment')
  }],
  status: String (required, enum: ['open', 'closed', 'cancelled'], default: 'open'),
  createdBy: ObjectId (required, ref: 'User'),
  documents: [{
    filename: String (required),
    url: String (required),
    type: String (required, enum: ['ticket', 'invoice', 'contract', 'receipt', 'other']),
    uploadedAt: Date (default: Date.now)
  }],
  notes: String (optional, max: 1000),
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

## Business Rules

### Sale Creation Rules
1. Client must exist and be valid
2. All passengers must exist and belong to the selected client
3. All services must exist and provider must match service provider
4. Passenger prices and service prices must be non-negative
5. Totals are automatically calculated: totalSalePrice = sum(passenger prices) + sum(service prices)
6. Profit is automatically calculated: profit = totalSalePrice - totalCost
7. Sale is created with 'open' status by default
8. Created by field is automatically set to the authenticated user

### Document Upload Rules
1. Maximum 10 files per upload
2. Maximum 10MB per file
3. Allowed file types: PDF, images (JPEG, PNG, GIF), Word, Excel, text files
4. Documents are stored in `/uploads/sales/` directory
5. Unique filenames generated with timestamp and random suffix

### Profit Calculation
- **Total Sale Price**: Sum of all passenger prices + sum of (service client prices × quantities)
- **Total Cost**: Sum of (service provider costs × quantities)
- **Profit**: Total Sale Price - Total Cost
- **Profit Margin**: (Profit / Total Sale Price) × 100

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: clientId, passengers, services"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Client not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "Passenger with ID passenger_id does not belong to client client_id"
}
```

## Authentication

All endpoints require authentication with JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Example Usage

### Create a Sale
```bash
curl -X POST http://localhost:5000/api/sales \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client_id_here",
    "passengers": [
      {
        "passengerId": "passenger_id_here",
        "price": 500.00,
        "notes": "Window seat preferred"
      }
    ],
    "services": [
      {
        "serviceId": "service_id_here",
        "providerId": "provider_id_here",
        "priceClient": 299.99,
        "costProvider": 240.00,
        "currency": "USD",
        "quantity": 1
      }
    ],
    "notes": "Special dietary requirements noted"
  }'
```

### Upload Documents
```bash
curl -X POST http://localhost:5000/api/sales/sale_id_here/upload \
  -H "Authorization: Bearer <token>" \
  -F "documents=@ticket.pdf" \
  -F "type=ticket"
```

### Get Sales with Filters
```bash
curl "http://localhost:5000/api/sales?status=open&minProfit=100&startDate=2024-01-01" \
  -H "Authorization: Bearer <token>"
```
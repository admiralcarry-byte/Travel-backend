# Provider and Service API Documentation

## Provider Endpoints

### POST /api/providers
Create a new provider.

**Request Body:**
```json
{
  "name": "string (required)",
  "type": "string (required, enum: hotel|airline|transfer|excursion|insurance)",
  "contactInfo": {
    "phone": "string (required)",
    "email": "string (required, valid email)",
    "address": "string (required)"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Provider created successfully",
  "data": {
    "provider": {
      "id": "provider_id",
      "name": "Marriott Hotels",
      "type": "hotel",
      "displayName": "Marriott Hotels (Hotel)",
      "contactInfo": {
        "phone": "+1-555-123-4567",
        "email": "contact@marriott.com",
        "address": "123 Hotel Street, New York, NY 10001"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### GET /api/providers
Get all providers with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for name, email, or phone
- `type` (optional): Filter by provider type

**Response (200):**
```json
{
  "success": true,
  "data": {
    "providers": [...],
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### GET /api/providers/:id
Get provider by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "provider": {...}
  }
}
```

### PUT /api/providers/:id
Update provider information.

**Request Body:** Same as POST /api/providers (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Provider updated successfully",
  "data": {
    "provider": {...}
  }
}
```

### DELETE /api/providers/:id
Delete provider (only if no services exist).

**Response (200):**
```json
{
  "success": true,
  "message": "Provider deleted successfully"
}
```

### GET /api/providers/types
Get available provider types.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "types": ["hotel", "airline", "transfer", "excursion", "insurance"]
  }
}
```

## Service Endpoints

### POST /api/services
Create a new service.

**Request Body:**
```json
{
  "title": "string (required)",
  "type": "string (required, enum: hotel|airline|transfer|excursion|insurance)",
  "description": "string (required)",
  "providerId": "string (required, ObjectId ref Provider)",
  "cost": "number (required, min: 0)",
  "currency": "string (required, default: USD)",
  "metadata": "object (optional)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Service created successfully",
  "data": {
    "service": {
      "id": "service_id",
      "title": "Deluxe Room",
      "type": "hotel",
      "description": "Spacious room with city view",
      "providerId": {
        "id": "provider_id",
        "name": "Marriott Hotels",
        "type": "hotel",
        "contactInfo": {...}
      },
      "cost": 299.99,
      "currency": "USD",
      "formattedCost": "USD 299.99",
      "metadata": {},
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### GET /api/services
Get all services with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for title or description
- `type` (optional): Filter by service type
- `providerId` (optional): Filter by provider ID
- `minCost` (optional): Minimum cost filter
- `maxCost` (optional): Maximum cost filter

**Response (200):**
```json
{
  "success": true,
  "data": {
    "services": [...],
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

### GET /api/services/:id
Get service by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "service": {
      "id": "service_id",
      "title": "Deluxe Room",
      "type": "hotel",
      "description": "Spacious room with city view",
      "providerId": {
        "id": "provider_id",
        "name": "Marriott Hotels",
        "type": "hotel",
        "contactInfo": {...}
      },
      "cost": 299.99,
      "currency": "USD",
      "formattedCost": "USD 299.99",
      "metadata": {},
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### PUT /api/services/:id
Update service information.

**Request Body:** Same as POST /api/services (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Service updated successfully",
  "data": {
    "service": {...}
  }
}
```

### DELETE /api/services/:id
Delete service.

**Response (200):**
```json
{
  "success": true,
  "message": "Service deleted successfully"
}
```

### GET /api/services/provider/:providerId
Get services by provider.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "provider": {...},
    "services": [...],
    "total": 10,
    "page": 1,
    "pages": 1
  }
}
```

### GET /api/services/types
Get available service types.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "types": ["hotel", "airline", "transfer", "excursion", "insurance"]
  }
}
```

## Data Models

### Provider Model
```javascript
{
  name: String (required, max: 100),
  type: String (required, enum: ['hotel', 'airline', 'transfer', 'excursion', 'insurance']),
  contactInfo: {
    phone: String (required, max: 20),
    email: String (required, valid email),
    address: String (required, max: 200)
  },
  createdAt: Date (default: Date.now)
}
```

### Service Model
```javascript
{
  title: String (required, max: 100),
  type: String (required, enum: ['hotel', 'airline', 'transfer', 'excursion', 'insurance']),
  description: String (required, max: 1000),
  providerId: ObjectId (required, ref: 'Provider'),
  cost: Number (required, min: 0),
  currency: String (required, default: 'USD', max: 3),
  metadata: Mixed (default: {}),
  createdAt: Date (default: Date.now)
}
```

## Business Rules

### Provider Rules
1. Provider name and type combination must be unique
2. Cannot delete provider if it has associated services
3. Contact information is required (phone, email, address)

### Service Rules
1. Service type must match provider type
2. Cost cannot be negative
3. Provider must exist before creating service
4. Currency is stored in uppercase (3 characters max)

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: name, type"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied. Admin or Seller role required."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Provider not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "Provider with this name and type already exists"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Authentication

All endpoints require authentication with JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Example Usage

### Create a Hotel Provider
```bash
curl -X POST http://localhost:5000/api/providers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marriott Hotels",
    "type": "hotel",
    "contactInfo": {
      "phone": "+1-555-123-4567",
      "email": "contact@marriott.com",
      "address": "123 Hotel Street, New York, NY 10001"
    }
  }'
```

### Create a Hotel Service
```bash
curl -X POST http://localhost:5000/api/services \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deluxe Room",
    "type": "hotel",
    "description": "Spacious room with city view and modern amenities",
    "providerId": "provider_id_here",
    "cost": 299.99,
    "currency": "USD"
  }'
```

### Search Services by Type
```bash
curl "http://localhost:5000/api/services?type=hotel&search=deluxe" \
  -H "Authorization: Bearer <token>"
```
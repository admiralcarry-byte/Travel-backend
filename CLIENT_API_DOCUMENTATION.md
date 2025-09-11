# Client and Passenger API Documentation

## Client Endpoints

### POST /api/clients
Create a new client.

**Request Body:**
```json
{
  "name": "string (required)",
  "surname": "string (required)",
  "dob": "string (required, YYYY-MM-DD format)",
  "email": "string (required, valid email)",
  "phone": "string (required)",
  "passportNumber": "string (required)",
  "nationality": "string (required)",
  "expirationDate": "string (required, YYYY-MM-DD format)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Client created successfully",
  "data": {
    "client": {
      "id": "client_id",
      "name": "John",
      "surname": "Doe",
      "fullName": "John Doe",
      "dob": "1990-01-15T00:00:00.000Z",
      "email": "john.doe@example.com",
      "phone": "+1234567890",
      "passportNumber": "A1234567",
      "nationality": "USA",
      "expirationDate": "2030-01-15T00:00:00.000Z",
      "isPassportValid": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### GET /api/clients
Get all clients with pagination and search.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search term for name, email, or passport number

**Response (200):**
```json
{
  "success": true,
  "data": {
    "clients": [...],
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### GET /api/clients/:clientId
Get client with all passengers.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client": {...},
    "passengers": [...]
  }
}
```

### PUT /api/clients/:clientId
Update client information.

**Request Body:** Same as POST /api/clients (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Client updated successfully",
  "data": {
    "client": {...}
  }
}
```

### DELETE /api/clients/:clientId
Delete client (only if no passengers exist).

**Response (200):**
```json
{
  "success": true,
  "message": "Client deleted successfully"
}
```

### POST /api/clients/ocr
Upload passport image and extract data using OCR.

**Request:** Multipart form data with `passportImage` file

**Response (200):**
```json
{
  "success": true,
  "message": "Passport data extracted successfully",
  "data": {
    "extractedData": {
      "name": "John",
      "surname": "Doe",
      "passportNumber": "A1234567",
      "nationality": "USA",
      "dob": "1990-01-15",
      "expirationDate": "2030-01-15"
    },
    "validation": {
      "isValid": true,
      "errors": [],
      "confidence": 85
    },
    "imagePath": "passport-1234567890-123456789.jpg"
  }
}
```

### GET /api/clients/:clientId/passport-image
Get client's passport image.

**Response:** Image file

## Passenger Endpoints

### POST /api/clients/:clientId/passengers
Add passenger to a client.

**Request Body:**
```json
{
  "name": "string (required)",
  "surname": "string (required)",
  "dob": "string (required, YYYY-MM-DD format)",
  "passportNumber": "string (required)",
  "nationality": "string (required)",
  "expirationDate": "string (required, YYYY-MM-DD format)"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Passenger added successfully",
  "data": {
    "passenger": {
      "id": "passenger_id",
      "clientId": "client_id",
      "name": "Jane",
      "surname": "Doe",
      "fullName": "Jane Doe",
      "dob": "1992-05-20T00:00:00.000Z",
      "passportNumber": "B7654321",
      "nationality": "USA",
      "expirationDate": "2032-05-20T00:00:00.000Z",
      "isPassportValid": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### GET /api/clients/:clientId/passengers
Get all passengers for a client.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "client": {
      "id": "client_id",
      "name": "John",
      "surname": "Doe",
      "email": "john.doe@example.com"
    },
    "passengers": [...]
  }
}
```

### GET /api/passengers/:passengerId
Get passenger by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "passenger": {
      "id": "passenger_id",
      "clientId": {
        "id": "client_id",
        "name": "John",
        "surname": "Doe",
        "email": "john.doe@example.com"
      },
      "name": "Jane",
      "surname": "Doe",
      "fullName": "Jane Doe",
      "dob": "1992-05-20T00:00:00.000Z",
      "passportNumber": "B7654321",
      "nationality": "USA",
      "expirationDate": "2032-05-20T00:00:00.000Z",
      "isPassportValid": true,
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### PUT /api/passengers/:passengerId
Update passenger information.

**Request Body:** Same as POST /api/clients/:clientId/passengers (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Passenger updated successfully",
  "data": {
    "passenger": {...}
  }
}
```

### DELETE /api/passengers/:passengerId
Delete passenger.

**Response (200):**
```json
{
  "success": true,
  "message": "Passenger deleted successfully"
}
```

### POST /api/passengers/ocr
Upload passenger passport image and extract data using OCR.

**Request:** Multipart form data with `passportImage` file

**Response:** Same as POST /api/clients/ocr

### GET /api/passengers/:passengerId/passport-image
Get passenger's passport image.

**Response:** Image file

## OCR Service

The OCR service uses Tesseract.js to extract text from passport images and parse it into structured data.

### Supported Image Formats
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- BMP (.bmp)
- TIFF (.tiff)

### File Size Limit
- Maximum file size: 5MB

### OCR Confidence
The service returns a confidence score (0-100%) indicating how well the data was extracted.

### Extracted Fields
- **Name**: First name from passport
- **Surname**: Last name from passport
- **Passport Number**: Passport number (alphanumeric)
- **Nationality**: Country of citizenship
- **Date of Birth**: Birth date in YYYY-MM-DD format
- **Expiration Date**: Passport expiration date in YYYY-MM-DD format

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: name, surname"
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
  "message": "Client not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "Client with this email or passport number already exists"
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

## File Upload

For OCR endpoints, use multipart/form-data with the file field named `passportImage`.

Example using curl:
```bash
curl -X POST \
  http://localhost:5000/api/clients/ocr \
  -H "Authorization: Bearer <token>" \
  -F "passportImage=@/path/to/passport.jpg"
```
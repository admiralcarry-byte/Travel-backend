# Payments API Documentation

## Payment Endpoints

### POST /api/payments/client
Record a client payment for a sale.

**Request:** Multipart form data
- `saleId`: Sale ID (required)
- `method`: Payment method (required)
- `amount`: Payment amount (required, number)
- `currency`: Currency code (required, 3 characters)
- `date`: Payment date (required, ISO date)
- `notes`: Payment notes (optional)
- `receipt`: Receipt file (optional, PDF/image, max 5MB)

**Response (201):**
```json
{
  "success": true,
  "message": "Client payment recorded successfully",
  "data": {
    "payment": {
      "id": "payment_id",
      "saleId": {
        "id": "sale_id",
        "totalSalePrice": 1000.00,
        "totalCost": 600.00
      },
      "type": "client",
      "method": "Credit Card",
      "amount": 500.00,
      "currency": "USD",
      "date": "2024-01-15T10:30:00.000Z",
      "receiptImage": "/uploads/payments/receipt-1234567890.pdf",
      "exchangeRate": null,
      "baseCurrency": null,
      "notes": "Payment received via Stripe",
      "createdBy": {
        "id": "user_id",
        "username": "seller1",
        "email": "seller@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "formattedAmount": "USD 500.00",
      "convertedAmount": null
    }
  }
}
```

### POST /api/payments/provider
Record a provider payment for a sale.

**Request:** Multipart form data (same as client payment)

**Response (201):**
```json
{
  "success": true,
  "message": "Provider payment recorded successfully",
  "data": {
    "payment": {
      "id": "payment_id",
      "type": "provider",
      "method": "Bank Transfer",
      "amount": 300.00,
      "currency": "EUR",
      "exchangeRate": 1.0850,
      "baseCurrency": "USD",
      "formattedAmount": "EUR 300.00",
      "convertedAmount": "USD 325.50"
    }
  }
}
```

### GET /api/payments
Get payments with filtering and pagination.

**Query Parameters:**
- `saleId` (optional): Filter by sale ID
- `type` (optional): Filter by payment type (client|provider)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)
- `currency` (optional): Filter by currency

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payments": [...],
    "total": 25,
    "page": 1,
    "pages": 3
  }
}
```

### GET /api/payments/:id
Get payment by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "payment": {
      "id": "payment_id",
      "saleId": {
        "id": "sale_id",
        "totalSalePrice": 1000.00,
        "totalCost": 600.00,
        "clientId": "client_id"
      },
      "type": "client",
      "method": "Credit Card",
      "amount": 500.00,
      "currency": "USD",
      "date": "2024-01-15T10:30:00.000Z",
      "receiptImage": "/uploads/payments/receipt-1234567890.pdf",
      "exchangeRate": null,
      "baseCurrency": null,
      "notes": "Payment received via Stripe",
      "createdBy": {
        "id": "user_id",
        "username": "seller1",
        "email": "seller@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "formattedAmount": "USD 500.00",
      "convertedAmount": null
    }
  }
}
```

### PUT /api/payments/:id
Update payment information.

**Request Body:** Same as POST (all fields optional)

**Response (200):**
```json
{
  "success": true,
  "message": "Payment updated successfully",
  "data": {
    "payment": {...}
  }
}
```

### DELETE /api/payments/:id
Delete payment and update sale balances.

**Response (200):**
```json
{
  "success": true,
  "message": "Payment deleted successfully"
}
```

### GET /api/payments/exchange-rate
Get exchange rate between currencies.

**Query Parameters:**
- `from`: Source currency code (required)
- `to`: Target currency code (required)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "from": "EUR",
    "to": "USD",
    "rate": 1.0850,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### GET /api/payments/currencies
Get supported currencies.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currencies": [
      {
        "code": "USD",
        "name": "US Dollar",
        "symbol": "$"
      },
      {
        "code": "EUR",
        "name": "Euro",
        "symbol": "€"
      }
    ]
  }
}
```

## Data Models

### Payment Model
```javascript
{
  saleId: ObjectId (required, ref: 'Sale'),
  type: String (required, enum: ['client', 'provider']),
  method: String (required, max: 50),
  amount: Number (required, min: 0),
  currency: String (required, max: 3, default: 'USD'),
  date: Date (required, default: Date.now),
  receiptImage: String (optional, file path),
  exchangeRate: Number (optional, min: 0),
  baseCurrency: String (optional, max: 3),
  notes: String (optional, max: 500),
  createdBy: ObjectId (required, ref: 'User'),
  createdAt: Date (default: Date.now)
}
```

### Updated Sale Model
```javascript
{
  // ... existing fields ...
  totalClientPayments: Number (default: 0, min: 0),
  totalProviderPayments: Number (default: 0, min: 0),
  clientBalance: Number (default: 0),
  providerBalance: Number (default: 0),
  // ... existing fields ...
}
```

## Business Rules

### Payment Recording Rules
1. Payment must be linked to an existing sale
2. Amount must be non-negative
3. Currency must be valid (3-character code)
4. Receipt file must be PDF or image (max 5MB)
5. Exchange rate is automatically fetched for different currencies
6. Sale balances are automatically updated when payment is recorded

### Balance Calculation Rules
1. **Client Balance**: `totalSalePrice - totalClientPayments`
   - Positive = client owes money
   - Zero or negative = client paid in full
2. **Provider Balance**: `totalProviderPayments - totalCost`
   - Positive = provider has been overpaid
   - Zero = provider paid exactly
   - Negative = provider is owed money

### Currency Conversion Rules
1. Exchange rates are fetched from third-party APIs
2. If conversion fails, payment is still recorded without conversion
3. Exchange rate and base currency are stored with payment
4. Supported providers: exchangerate-api.com, fixer.io

## File Upload Rules

### Receipt Upload
- **Allowed file types**: PDF, JPG, JPEG, PNG, GIF, WebP
- **Maximum file size**: 5MB
- **Storage location**: `/uploads/payments/`
- **Filename format**: `receipt-{timestamp}-{random}.{extension}`

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields: saleId, method, amount, currency"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Sale not found"
}
```

**413 Payload Too Large:**
```json
{
  "success": false,
  "message": "File too large. Maximum size is 5MB for receipts."
}
```

## Authentication

All endpoints require authentication with JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Example Usage

### Record Client Payment
```bash
curl -X POST http://localhost:5000/api/payments/client \
  -H "Authorization: Bearer <token>" \
  -F "saleId=sale_id_here" \
  -F "method=Credit Card" \
  -F "amount=500.00" \
  -F "currency=USD" \
  -F "date=2024-01-15" \
  -F "notes=Payment received via Stripe" \
  -F "receipt=@receipt.pdf"
```

### Record Provider Payment with Currency Conversion
```bash
curl -X POST http://localhost:5000/api/payments/provider \
  -H "Authorization: Bearer <token>" \
  -F "saleId=sale_id_here" \
  -F "method=Bank Transfer" \
  -F "amount=300.00" \
  -F "currency=EUR" \
  -F "date=2024-01-15"
```

### Get Exchange Rate
```bash
curl "http://localhost:5000/api/payments/exchange-rate?from=EUR&to=USD" \
  -H "Authorization: Bearer <token>"
```

### Get Payments for Sale
```bash
curl "http://localhost:5000/api/payments?saleId=sale_id_here" \
  -H "Authorization: Bearer <token>"
```

## Integration Notes

### Sale Balance Updates
When a payment is recorded:
1. Payment is created and linked to sale
2. Sale's total payments (client or provider) are updated
3. Sale's balances are recalculated
4. Sale's profit remains the same (based on costs vs revenue)
5. Sale document is updated with new payment reference

### Currency Conversion
- Automatic conversion when payment currency differs from sale currency
- Exchange rates are cached and stored with payment
- Fallback to manual conversion if API fails
- Support for 33+ major currencies

### File Management
- Receipts are stored in `/uploads/payments/` directory
- Files are served statically via Express
- Unique filenames prevent conflicts
- File type validation ensures security
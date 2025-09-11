# Reporting API Documentation

## Reporting Endpoints

### GET /api/reports/kpis
Get Key Performance Indicators for the dashboard.

**Query Parameters:**
- `period` (optional): Time period (daily|weekly|monthly|quarterly|yearly, default: monthly)
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)
- `sellerId` (optional): Filter by seller ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSales": 125000.00,
    "totalCost": 95000.00,
    "totalProfit": 30000.00,
    "totalClientPayments": 80000.00,
    "totalProviderPayments": 60000.00,
    "totalClientBalance": 45000.00,
    "totalProviderBalance": -35000.00,
    "saleCount": 45,
    "avgSaleValue": 2777.78,
    "avgProfit": 666.67,
    "profitMargin": 24.00
  }
}
```

### GET /api/reports/sales
Get sales report with aggregation by time period.

**Query Parameters:**
- `period` (optional): Time period (daily|weekly|monthly|quarterly|yearly, default: monthly)
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)
- `sellerId` (optional): Filter by seller ID

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "summary": {
      "totalSales": 125000.00,
      "totalProfit": 30000.00,
      "totalSalesCount": 45,
      "avgSaleValue": 2777.78,
      "avgProfit": 666.67
    },
    "chartData": {
      "labels": ["2024-01", "2024-02", "2024-03"],
      "values": [40000.00, 45000.00, 40000.00],
      "profitValues": [10000.00, 12000.00, 8000.00],
      "saleCounts": [15, 18, 12]
    },
    "detailedData": [
      {
        "period": "2024-01",
        "totalSales": 40000.00,
        "totalCost": 30000.00,
        "totalProfit": 10000.00,
        "saleCount": 15,
        "avgSaleValue": 2666.67,
        "avgProfit": 666.67,
        "profitMargin": 25.00
      }
    ]
  }
}
```

### GET /api/reports/profit
Get profit report by seller.

**Query Parameters:**
- `sellerId` (optional): Filter by seller ID
- `period` (optional): Time period (daily|weekly|monthly|quarterly|yearly, default: monthly)
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "summary": {
      "totalProfit": 30000.00,
      "totalSales": 125000.00,
      "totalSellers": 3,
      "avgProfitPerSeller": 10000.00
    },
    "chartData": {
      "labels": ["seller1", "seller2", "seller3"],
      "values": [15000.00, 10000.00, 5000.00],
      "saleValues": [60000.00, 40000.00, 25000.00],
      "saleCounts": [20, 15, 10]
    },
    "detailedData": [
      {
        "sellerId": "seller_id_1",
        "sellerName": "seller1",
        "sellerEmail": "seller1@example.com",
        "totalSales": 60000.00,
        "totalCost": 45000.00,
        "totalProfit": 15000.00,
        "saleCount": 20,
        "avgSaleValue": 3000.00,
        "avgProfit": 750.00,
        "profitMargin": 25.00
      }
    ]
  }
}
```

### GET /api/reports/balances
Get outstanding balances report.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalClientBalance": 45000.00,
      "totalProviderBalance": -35000.00,
      "totalClientPayments": 80000.00,
      "totalProviderPayments": 60000.00,
      "salesWithClientBalance": 25,
      "salesWithProviderBalance": 15,
      "totalSales": 45,
      "netBalance": 10000.00
    },
    "topClientBalances": [
      {
        "clientId": "client_id_1",
        "clientName": "John Doe",
        "clientEmail": "john@example.com",
        "totalBalance": 5000.00,
        "saleCount": 3
      }
    ],
    "topProviderBalances": [
      {
        "providerId": "provider_id_1",
        "providerName": "Grand Hotel",
        "totalOwed": 8000.00,
        "saleCount": 5
      }
    ],
    "chartData": {
      "labels": ["Client Balances", "Provider Balances"],
      "values": [45000.00, 35000.00]
    }
  }
}
```

### GET /api/reports/top-services
Get top selling services report.

**Query Parameters:**
- `limit` (optional): Number of services to return (default: 10)
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "topServices": [
      {
        "serviceId": "service_id_1",
        "serviceName": "Hotel Deluxe Room",
        "serviceType": "hotel",
        "providerName": "Grand Hotel",
        "totalQuantity": 50,
        "totalRevenue": 25000.00,
        "totalCost": 20000.00,
        "totalProfit": 5000.00,
        "saleCount": 25,
        "avgRevenue": 1000.00
      }
    ],
    "chartData": {
      "labels": ["Hotel Deluxe Room", "Flight Business Class"],
      "values": [25000.00, 20000.00],
      "profitValues": [5000.00, 4000.00],
      "quantityValues": [50, 30]
    },
    "summary": {
      "totalServices": 10,
      "totalRevenue": 125000.00,
      "totalProfit": 30000.00,
      "totalQuantity": 200
    }
  }
}
```

## Data Models

### KPI Response
```javascript
{
  totalSales: Number,
  totalCost: Number,
  totalProfit: Number,
  totalClientPayments: Number,
  totalProviderPayments: Number,
  totalClientBalance: Number,
  totalProviderBalance: Number,
  saleCount: Number,
  avgSaleValue: Number,
  avgProfit: Number,
  profitMargin: Number
}
```

### Sales Report Response
```javascript
{
  period: String,
  summary: {
    totalSales: Number,
    totalProfit: Number,
    totalSalesCount: Number,
    avgSaleValue: Number,
    avgProfit: Number
  },
  chartData: {
    labels: [String],
    values: [Number],
    profitValues: [Number],
    saleCounts: [Number]
  },
  detailedData: [{
    period: String,
    totalSales: Number,
    totalCost: Number,
    totalProfit: Number,
    saleCount: Number,
    avgSaleValue: Number,
    avgProfit: Number,
    profitMargin: Number
  }]
}
```

### Profit Report Response
```javascript
{
  period: String,
  summary: {
    totalProfit: Number,
    totalSales: Number,
    totalSellers: Number,
    avgProfitPerSeller: Number
  },
  chartData: {
    labels: [String],
    values: [Number],
    saleValues: [Number],
    saleCounts: [Number]
  },
  detailedData: [{
    sellerId: String,
    sellerName: String,
    sellerEmail: String,
    totalSales: Number,
    totalCost: Number,
    totalProfit: Number,
    saleCount: Number,
    avgSaleValue: Number,
    avgProfit: Number,
    profitMargin: Number
  }]
}
```

### Balances Report Response
```javascript
{
  summary: {
    totalClientBalance: Number,
    totalProviderBalance: Number,
    totalClientPayments: Number,
    totalProviderPayments: Number,
    salesWithClientBalance: Number,
    salesWithProviderBalance: Number,
    totalSales: Number,
    netBalance: Number
  },
  topClientBalances: [{
    clientId: String,
    clientName: String,
    clientEmail: String,
    totalBalance: Number,
    saleCount: Number
  }],
  topProviderBalances: [{
    providerId: String,
    providerName: String,
    totalOwed: Number,
    saleCount: Number
  }],
  chartData: {
    labels: [String],
    values: [Number]
  }
}
```

### Top Services Report Response
```javascript
{
  topServices: [{
    serviceId: String,
    serviceName: String,
    serviceType: String,
    providerName: String,
    totalQuantity: Number,
    totalRevenue: Number,
    totalCost: Number,
    totalProfit: Number,
    saleCount: Number,
    avgRevenue: Number
  }],
  chartData: {
    labels: [String],
    values: [Number],
    profitValues: [Number],
    quantityValues: [Number]
  },
  summary: {
    totalServices: Number,
    totalRevenue: Number,
    totalProfit: Number,
    totalQuantity: Number
  }
}
```

## Business Rules

### Aggregation Periods
- **Daily**: Groups by year, month, day
- **Weekly**: Groups by year, week number
- **Monthly**: Groups by year, month
- **Quarterly**: Groups by year, quarter (1-4)
- **Yearly**: Groups by year only

### Caching Strategy
- **In-memory cache**: 5-minute TTL for heavy aggregation queries
- **HTTP cache headers**: 5-minute browser cache
- **Cache keys**: Based on endpoint and query parameters
- **Cache invalidation**: Automatic expiration after TTL

### Performance Optimizations
- **MongoDB aggregation pipelines**: Efficient data processing
- **Indexed queries**: Optimized database performance
- **Parallel API calls**: Frontend fetches multiple reports simultaneously
- **Data formatting**: Backend pre-formats data for charts

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Invalid date format"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error while generating report"
}
```

## Authentication

All endpoints require authentication with JWT token:
```
Authorization: Bearer <your_jwt_token>
```

## Example Usage

### Get KPIs for Last 6 Months
```bash
curl "http://localhost:5000/api/reports/kpis?period=monthly&startDate=2024-01-01&endDate=2024-06-30" \
  -H "Authorization: Bearer <token>"
```

### Get Sales Report by Seller
```bash
curl "http://localhost:5000/api/reports/sales?sellerId=seller_id&period=monthly" \
  -H "Authorization: Bearer <token>"
```

### Get Profit Report for Q1 2024
```bash
curl "http://localhost:5000/api/reports/profit?period=quarterly&startDate=2024-01-01&endDate=2024-03-31" \
  -H "Authorization: Bearer <token>"
```

### Get Top 5 Services
```bash
curl "http://localhost:5000/api/reports/top-services?limit=5" \
  -H "Authorization: Bearer <token>"
```

### Get Balance Report
```bash
curl "http://localhost:5000/api/reports/balances" \
  -H "Authorization: Bearer <token>"
```

## Frontend Integration

### Chart Data Format
All chart endpoints return data in a consistent format:
```javascript
{
  labels: [String],    // X-axis labels
  values: [Number],    // Primary data values
  // Additional data arrays as needed
}
```

### KPI Cards
KPI data is formatted for display in dashboard cards with:
- Currency formatting (K/M suffixes for large numbers)
- Trend indicators (up/down arrows with percentages)
- Color coding for different metrics
- Subtitle information (counts, percentages)

### Filtering
All reports support consistent filtering:
- **Date range**: startDate and endDate parameters
- **Seller filtering**: sellerId parameter
- **Time period**: period parameter for aggregation
- **Limits**: limit parameter for top-N queries

### Real-time Updates
- **Caching**: 5-minute cache prevents excessive API calls
- **Parallel loading**: Multiple reports load simultaneously
- **Error handling**: Graceful fallbacks for failed requests
- **Loading states**: Visual feedback during data fetching

## Integration Notes

### Dashboard Components
- **KPICard**: Displays individual metrics with formatting
- **LineChart**: Shows trends over time (sales, profit)
- **BarChart**: Compares values across categories (sellers, services)
- **PieChart**: Shows distribution (balances, revenue)
- **TopServicesTable**: Detailed service performance data

### Data Flow
1. **Frontend**: User selects filters and triggers data fetch
2. **Backend**: Aggregation pipelines process data efficiently
3. **Caching**: Results cached for 5 minutes to improve performance
4. **Formatting**: Data formatted for chart libraries (Recharts)
5. **Display**: Components render charts and tables with real data

### Performance Considerations
- **Aggregation pipelines**: MongoDB handles complex calculations
- **Indexing**: Database indexes on date and seller fields
- **Caching**: Reduces database load for repeated queries
- **Pagination**: Large datasets handled efficiently
- **Parallel processing**: Multiple reports fetched simultaneously
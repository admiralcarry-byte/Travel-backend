# Notifications API Documentation

## Notification System Overview

The notification system provides automated and manual notification capabilities using SendGrid for email and Twilio for WhatsApp messaging. It includes scheduled cron jobs for trip reminders, return notifications, and passport expiry alerts.

## Environment Variables

```env
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@travelagency.com
SENDGRID_FROM_NAME=Travel Agency
TWILIO_SID=your_twilio_sid
TWILIO_TOKEN=your_twilio_token
TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

## Notification Endpoints

### GET /api/notifications/history
Get notification history with filtering and pagination.

**Query Parameters:**
- `type` (optional): Notification type (trip_reminder|return_notification|passport_expiry|custom)
- `status` (optional): Notification status (sent|failed|partial|pending)
- `clientId` (optional): Filter by client ID
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notification_id",
        "clientId": {
          "id": "client_id",
          "name": "John",
          "surname": "Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "saleId": {
          "id": "sale_id",
          "totalSalePrice": 1500.00,
          "status": "confirmed"
        },
        "type": "trip_reminder",
        "subject": "Trip Reminder - Your Travel is in 72 Hours!",
        "emailSent": {
          "sent": true,
          "success": true,
          "messageId": "msg_123",
          "error": null,
          "sentAt": "2024-01-15T10:30:00Z"
        },
        "whatsappSent": {
          "sent": true,
          "success": true,
          "messageId": "SM1234567890",
          "error": null,
          "sentAt": "2024-01-15T10:30:00Z"
        },
        "status": "sent",
        "createdAt": "2024-01-15T10:30:00Z",
        "summary": {
          "emailStatus": "success",
          "whatsappStatus": "success",
          "overallStatus": "sent"
        }
      }
    ],
    "total": 50,
    "page": 1,
    "pages": 5
  }
}
```

### GET /api/notifications/statistics
Get notification statistics and success rates.

**Query Parameters:**
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalNotifications": 150,
    "sentNotifications": 120,
    "failedNotifications": 15,
    "partialNotifications": 15,
    "emailSent": 140,
    "emailSuccess": 125,
    "whatsappSent": 130,
    "whatsappSuccess": 115,
    "emailSuccessRate": 89.29,
    "whatsappSuccessRate": 88.46,
    "overallSuccessRate": 80.00
  }
}
```

### PUT /api/notifications/clients/:id/notifications
Update client notification preferences.

**Request Body:**
```json
{
  "notificationPreferences": {
    "email": true,
    "whatsapp": true,
    "tripReminders": true,
    "returnNotifications": true,
    "passportExpiry": true
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Client notification preferences updated successfully",
  "data": {
    "client": {
      "id": "client_id",
      "name": "John",
      "surname": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "notificationPreferences": {
        "email": true,
        "whatsapp": true,
        "tripReminders": true,
        "returnNotifications": true,
        "passportExpiry": true
      }
    }
  }
}
```

### POST /api/notifications/send
Send manual notification to a client.

**Request Body:**
```json
{
  "clientId": "client_id",
  "saleId": "sale_id",
  "type": "custom",
  "subject": "Custom Notification",
  "emailContent": "<h1>Custom Email Content</h1>",
  "whatsappContent": "Custom WhatsApp message"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": {
    "notification": {
      "id": "notification_id",
      "clientId": "client_id",
      "saleId": "sale_id",
      "type": "custom",
      "subject": "Custom Notification",
      "status": "sent",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

### POST /api/notifications/resend/:id
Resend a failed or partial notification.

**Response (200):**
```json
{
  "success": true,
  "message": "Notification resent successfully",
  "data": {
    "notification": {
      "id": "notification_id",
      "status": "sent",
      "emailSent": {
        "sent": true,
        "success": true,
        "sentAt": "2024-01-15T10:30:00Z"
      },
      "whatsappSent": {
        "sent": true,
        "success": true,
        "sentAt": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

### GET /api/notifications/cron/status
Get cron job status (admin only).

**Response (200):**
```json
{
  "success": true,
  "data": {
    "isRunning": true,
    "jobsCount": 3,
    "jobs": [
      {
        "index": 0,
        "running": true
      },
      {
        "index": 1,
        "running": true
      },
      {
        "index": 2,
        "running": true
      }
    ]
  }
}
```

### POST /api/notifications/cron/trigger
Manually trigger a cron job (admin only).

**Request Body:**
```json
{
  "jobType": "trip_reminder"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Cron job 'trip_reminder' triggered successfully"
}
```

### POST /api/notifications/test
Test notification service with email and/or phone.

**Request Body:**
```json
{
  "email": "test@example.com",
  "phone": "+1234567890"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Test notification sent",
  "data": {
    "email": {
      "success": true,
      "messageId": "msg_123",
      "provider": "sendgrid"
    },
    "whatsapp": {
      "success": true,
      "messageId": "SM1234567890",
      "provider": "twilio"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Data Models

### Notification Model
```javascript
{
  clientId: ObjectId, // Reference to Client
  saleId: ObjectId,   // Reference to Sale (optional)
  type: String,       // trip_reminder|return_notification|passport_expiry|custom
  subject: String,    // Email subject line
  emailSent: {
    sent: Boolean,
    success: Boolean,
    messageId: String,
    error: String,
    sentAt: Date
  },
  whatsappSent: {
    sent: Boolean,
    success: Boolean,
    messageId: String,
    error: String,
    sentAt: Date
  },
  content: {
    email: String,    // HTML email content
    whatsapp: String  // WhatsApp message content
  },
  metadata: {
    tripDate: Date,
    returnDate: Date,
    passportExpiryDate: Date,
    daysUntilExpiry: Number,
    triggerReason: String
  },
  status: String,     // pending|sent|failed|partial
  createdBy: ObjectId, // Reference to User (optional)
  createdAt: Date,
  updatedAt: Date
}
```

### Client Notification Preferences
```javascript
{
  email: Boolean,           // Enable email notifications
  whatsapp: Boolean,        // Enable WhatsApp notifications
  tripReminders: Boolean,   // Enable trip reminder notifications
  returnNotifications: Boolean, // Enable return notifications
  passportExpiry: Boolean   // Enable passport expiry notifications
}
```

## Scheduled Jobs

### Trip Reminder Job
- **Schedule**: Every hour (`0 * * * *`)
- **Purpose**: Send reminders 72 hours before trip departure
- **Trigger**: Sale with trip date in next 72 hours
- **Content**: Trip details, departure time, preparation reminders

### Return Notification Job
- **Schedule**: Every hour (`0 * * * *`)
- **Purpose**: Send welcome back messages on return date
- **Trigger**: Sale with return date = today
- **Content**: Welcome back message, feedback request

### Passport Expiry Job
- **Schedule**: Daily at 9 AM (`0 9 * * *`)
- **Purpose**: Send passport expiry reminders
- **Trigger**: Client with passport expiring in 90 days
- **Content**: Expiry date, renewal recommendations

## Notification Types

### Trip Reminder
- **Trigger**: 72 hours before trip departure
- **Email**: HTML formatted with trip details and preparation tips
- **WhatsApp**: Concise message with key trip information
- **Frequency**: Once per trip

### Return Notification
- **Trigger**: On return date
- **Email**: Welcome back message with feedback request
- **WhatsApp**: Short welcome back message
- **Frequency**: Once per trip

### Passport Expiry
- **Trigger**: 90 days before passport expiry
- **Email**: Detailed expiry information and renewal guidance
- **WhatsApp**: Alert message with expiry date
- **Frequency**: Once every 30 days (to avoid spam)

### Custom Notifications
- **Trigger**: Manual sending via admin interface
- **Content**: User-defined email and WhatsApp content
- **Use Cases**: Special announcements, policy updates, etc.

## Business Rules

### Notification Preferences
- Clients can opt out of specific notification types
- Email and WhatsApp can be disabled independently
- Preferences are respected for all notification types
- Default preferences are all enabled

### Duplicate Prevention
- Trip reminders: Only sent once per sale
- Return notifications: Only sent once per sale
- Passport expiry: Only sent once every 30 days per client

### Error Handling
- Failed notifications are logged with error details
- Partial failures (email success, WhatsApp fail) are tracked
- Retry mechanism available via resend endpoint
- Graceful degradation if external services are unavailable

### Content Generation
- Email content is HTML formatted with styling
- WhatsApp content is plain text with emojis
- Dynamic content includes client name, trip details, dates
- Consistent branding across all notification types

## Integration Notes

### SendGrid Integration
- Uses SendGrid v3 API
- HTML email templates with inline CSS
- Automatic error handling and retry logic
- Message ID tracking for delivery confirmation

### Twilio Integration
- Uses Twilio WhatsApp Business API
- Phone number formatting and validation
- Message status tracking
- Error handling for invalid numbers

### Cron Job Management
- Jobs start automatically with server
- Manual triggering available for testing
- Status monitoring and health checks
- Graceful shutdown handling

### Frontend Integration
- Real-time notification history viewing
- Client preference management interface
- Admin controls for manual notifications
- Statistics and analytics dashboard

## Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Client ID, type, and subject are required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Client not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error while sending notification"
}
```

## Example Usage

### Send Trip Reminder
```bash
curl -X POST "http://localhost:5000/api/notifications/send" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client_id",
    "saleId": "sale_id",
    "type": "trip_reminder",
    "subject": "Trip Reminder - Your Travel is in 72 Hours!",
    "emailContent": "<h1>Trip Reminder</h1><p>Your trip is approaching!</p>",
    "whatsappContent": "Trip reminder: Your travel is in 72 hours!"
  }'
```

### Update Client Preferences
```bash
curl -X PUT "http://localhost:5000/api/notifications/clients/client_id/notifications" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notificationPreferences": {
      "email": true,
      "whatsapp": false,
      "tripReminders": true,
      "returnNotifications": true,
      "passportExpiry": false
    }
  }'
```

### Get Notification History
```bash
curl "http://localhost:5000/api/notifications/history?type=trip_reminder&status=sent&page=1&limit=10" \
  -H "Authorization: Bearer <token>"
```

### Test Notification Service
```bash
curl -X POST "http://localhost:5000/api/notifications/test" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+1234567890"
  }'
```

### Trigger Cron Job
```bash
curl -X POST "http://localhost:5000/api/notifications/cron/trigger" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jobType": "trip_reminder"
  }'
```

## Authentication

All endpoints require authentication with JWT token:
```
Authorization: Bearer <your_jwt_token>
```

Admin-only endpoints (cron management) require admin role.

## Performance Considerations

- **Cron Jobs**: Run efficiently with MongoDB queries
- **Caching**: Notification preferences cached per client
- **Rate Limiting**: Respects SendGrid and Twilio rate limits
- **Error Handling**: Graceful degradation for external service failures
- **Logging**: Comprehensive logging for debugging and monitoring
- **Scalability**: Designed to handle high notification volumes
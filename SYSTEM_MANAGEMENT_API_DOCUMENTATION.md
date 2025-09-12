# System Management API Documentation

## Overview
This document describes the system management API endpoints that provide database and system maintenance functionality for the Travel AI Management system.

## Authentication
All system management endpoints require:
- Valid JWT token in Authorization header
- Admin role permissions

## Endpoints

### 1. System Health Check
**GET** `/api/system/health`

Performs a comprehensive system health check including:
- Database connection status
- Collection verification
- Document counts
- Relationship integrity checks
- System information (uptime, memory, Node.js version)

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-11T10:46:00.000Z",
    "database": {
      "connected": true,
      "status": "connected"
    },
    "collections": {
      "found": 9,
      "expected": 9,
      "missing": [],
      "extra": [],
      "counts": {
        "users": 2,
        "clients": 0,
        "passengers": 0,
        "providers": 0,
        "services": 0,
        "sales": 0,
        "payments": 0,
        "cupos": 0,
        "notifications": 0
      }
    },
    "relationships": {
      "checks": [
        {
          "name": "Services -> Providers",
          "invalidReferences": 0,
          "status": "healthy"
        }
      ]
    },
    "system": {
      "uptime": 3600,
      "memory": {
        "used": 50000000,
        "total": 100000000
      },
      "nodeVersion": "v18.0.0",
      "platform": "win32"
    },
    "status": "healthy"
  }
}
```

### 2. Database Backup
**POST** `/api/system/backup`

Creates a complete backup of the database by exporting all collections to a JSON file.

**Response:**
```json
{
  "success": true,
  "message": "Database backup completed successfully",
  "data": {
    "backupFile": "backup-2025-01-11T10-46-00-000Z.json",
    "backupPath": "/path/to/backup/file.json",
    "size": 1024000,
    "sizeFormatted": "1.00 MB",
    "collections": ["users", "clients", "passengers", "providers", "services", "sales", "payments", "cupos", "notifications"],
    "totalDocuments": 2,
    "timestamp": "2025-01-11T10:46:00.000Z"
  }
}
```

### 3. Database Reset
**POST** `/api/system/reset`

⚠️ **DANGER**: This endpoint permanently deletes ALL data from the database.

Clears all collections including:
- users, clients, passengers, providers, services, sales, payments, cupos, notifications

**Response:**
```json
{
  "success": true,
  "message": "Database reset completed successfully",
  "data": {
    "resetResults": {
      "users": 2,
      "clients": 0,
      "passengers": 0,
      "providers": 0,
      "services": 0,
      "sales": 0,
      "payments": 0,
      "cupos": 0,
      "notifications": 0
    },
    "verificationResults": {
      "users": 0,
      "clients": 0,
      "passengers": 0,
      "providers": 0,
      "services": 0,
      "sales": 0,
      "payments": 0,
      "cupos": 0,
      "notifications": 0
    },
    "timestamp": "2025-01-11T10:46:00.000Z",
    "totalDocumentsRemoved": 2
  }
}
```

### 4. Clear Cache
**POST** `/api/system/clear-cache`

Clears temporary files and cache including:
- Upload cache files older than 1 hour
- Backup files older than 24 hours
- Node.js module cache (non-essential modules)
- Forces garbage collection if available

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully",
  "data": {
    "timestamp": "2025-01-11T10:46:00.000Z",
    "cleared": [
      "passports/temp-file.png",
      "backups/old-backup.json",
      "150 Node.js modules",
      "Garbage collection"
    ]
  }
}
```

### 5. List Backups
**GET** `/api/system/backups`

Lists all available backup files with metadata.

**Response:**
```json
{
  "success": true,
  "data": {
    "backups": [
      {
        "filename": "backup-2025-01-11T10-46-00-000Z.json",
        "size": 1024000,
        "sizeFormatted": "1.00 MB",
        "createdAt": "2025-01-11T10:46:00.000Z",
        "modifiedAt": "2025-01-11T10:46:00.000Z"
      }
    ],
    "total": 1
  }
}
```

## Frontend Integration

The AdminDashboard component includes:
- Interactive buttons for each system management function
- Loading states with spinners
- Success/error message display
- System health report visualization
- Confirmation dialogs for destructive operations

## Security Features

1. **Authentication Required**: All endpoints require valid JWT token
2. **Admin Role Required**: Only admin users can access these endpoints
3. **Confirmation Dialogs**: Frontend includes multiple confirmation steps for destructive operations
4. **Safe Cache Clearing**: Only removes temporary files, preserves essential data

## File Structure

```
backend/
├── controllers/
│   └── systemController.js    # System management logic
├── routes/
│   └── system.js             # System management routes
├── backups/                  # Backup files storage
└── uploads/                  # Temporary files (cache)
    ├── passports/
    ├── payments/
    └── sales/
```

## Usage Examples

### Frontend Usage
```javascript
// System Health Check
const response = await axios.get('/api/system/health', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Database Backup
const response = await axios.post('/api/system/backup', {}, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Database Reset (with confirmation)
if (confirm('This will delete ALL data. Continue?')) {
  const response = await axios.post('/api/system/reset', {}, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Error Handling

All endpoints return consistent error responses:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common HTTP status codes:
- `200`: Success
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `500`: Internal server error
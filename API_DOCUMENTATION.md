# Travel AI Management API Documentation

## Authentication Endpoints

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "username": "string (required, 3-30 chars)",
  "email": "string (required, valid email)",
  "password": "string (required, min 6 chars)",
  "role": "string (optional, 'admin' or 'seller', default: 'seller')"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "seller",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "seller",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### GET /api/auth/me
Get current user information (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "seller",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## User Management Endpoints (Admin Only)

### GET /api/users
Get all users (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "username": "john_doe",
        "email": "john@example.com",
        "role": "seller",
        "createdAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "total": 1
  }
}
```

### GET /api/users/:id
Get user by ID (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "seller",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### PUT /api/users/:id
Update user (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "role": "string (optional, 'admin' or 'seller')"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": "user_id",
      "username": "updated_username",
      "email": "updated@example.com",
      "role": "admin",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

### DELETE /api/users/:id
Delete user (requires admin role).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": ["Username is required", "Email must be valid"]
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
  "message": "Access denied. Admin role required."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "User not found"
}
```

**409 Conflict:**
```json
{
  "success": false,
  "message": "User with this email already exists"
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

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

Tokens expire after 7 days.

## Role-Based Access Control

- **Admin**: Can access all endpoints including user management
- **Seller**: Can access basic endpoints but not user management
- **Public**: Can only register and login
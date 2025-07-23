# API Documentation

## Base URL
```
Development: http://localhost:8080/api
Production: https://your-domain.com/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "jwt-token-here",
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "John Doe"
    }
  }
}
```

#### GET /auth/profile
Get current user profile (Protected).

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "John Doe",
    "preferences": {
      "timezone": "UTC",
      "workingHours": {
        "start": "09:00",
        "end": "17:00"
      }
    }
  }
}
```

### Tasks

#### GET /tasks
Get user's tasks with optional filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by status ('pending', 'in-progress', 'completed')
- `priority` (number): Filter by priority (1-10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task-id",
      "title": "Call the dentist",
      "description": "Schedule annual checkup",
      "priority": 8,
      "deadline": "2025-01-25T15:00:00Z",
      "status": "pending",
      "estimatedTime": 15,
      "createdAt": "2025-01-22T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

#### POST /tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Call the dentist",
  "description": "Schedule annual checkup",
  "priority": 8,
  "deadline": "2025-01-25T15:00:00Z",
  "estimatedTime": 15,
  "context": "urgent appointment needed"
}
```

#### PUT /tasks/:id
Update an existing task.

#### DELETE /tasks/:id
Delete a task.

### Chat

#### POST /chat/process
Process natural language input and extract tasks.

**Request Body:**
```json
{
  "message": "Remind me to call the dentist by Friday, it's urgent",
  "conversationId": "conversation-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "I've created a high-priority task to call the dentist by Friday.",
    "taskExtraction": {
      "intent": "CREATE_TASK",
      "entities": {
        "action": "call",
        "target": "dentist",
        "deadline": "2025-01-25",
        "priority": "high"
      },
      "confidence": 0.95
    },
    "createdTasks": ["task-id"]
  }
}
```

## Error Responses

All endpoints return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error 
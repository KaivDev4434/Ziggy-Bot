import { Router } from 'express';
import authRoutes from './authRoutes';
import taskRoutes from './taskRoutes';
import chatRoutes from './chatRoutes';

const router = Router();

// API Routes
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/chat', chatRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Ziggy Bot API Documentation',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register a new user',
        'POST /api/auth/login': 'Login user',
        'GET /api/auth/profile': 'Get user profile',
        'PUT /api/auth/profile': 'Update user profile',
        'POST /api/auth/change-password': 'Change password',
        'POST /api/auth/refresh': 'Refresh JWT token',
        'POST /api/auth/logout': 'Logout user',
        'DELETE /api/auth/account': 'Delete user account',
        'PUT /api/auth/priority-weights': 'Update priority calculation weights'
      },
      tasks: {
        'POST /api/tasks': 'Create a new task',
        'GET /api/tasks': 'Get all tasks with filtering and pagination',
        'GET /api/tasks/:id': 'Get a specific task',
        'PUT /api/tasks/:id': 'Update a task',
        'DELETE /api/tasks/:id': 'Delete a task',
        'PATCH /api/tasks/:id/start': 'Mark task as started',
        'PATCH /api/tasks/:id/complete': 'Mark task as completed',
        'POST /api/tasks/:id/calculate-priority': 'Calculate dynamic priority for a task',
        'GET /api/tasks/stats': 'Get task statistics',
        'PATCH /api/tasks/bulk': 'Bulk update multiple tasks',
        'POST /api/tasks/recalculate-priorities': 'Recalculate priorities for all tasks',
        'GET /api/tasks/scheduling-recommendations': 'Get scheduling recommendations',
        'GET /api/tasks/priority-analytics': 'Get priority analytics'
      },
      chat: {
        'POST /api/chat/message': 'Send a message',
        'GET /api/chat/history': 'Get conversation history',
        'GET /api/chat/active': 'Get active conversation',
        'GET /api/chat/context': 'Get conversation context',
        'GET /api/chat/search': 'Search messages',
        'POST /api/chat/conversations': 'Create new conversation',
        'GET /api/chat/conversations/:id': 'Get specific conversation',
        'PUT /api/chat/conversations/:id': 'Update conversation title',
        'DELETE /api/chat/conversations/:id': 'Delete conversation',
        'PATCH /api/chat/conversations/:id/activate': 'Activate conversation'
      }
    },
    features: [
      'JWT Authentication with secure session management',
      'Dynamic task priority calculation with multiple factors',
      'Intelligent scheduling recommendations',
      'Conversation context management for AI integration',
      'Comprehensive input validation and sanitization',
      'Rate limiting for security',
      'Structured logging and error handling',
      'Resource ownership verification',
      'Bulk operations for efficiency',
      'Real-time task analytics and insights'
    ]
  });
});

// Catch-all for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    availableEndpoints: '/api/docs'
  });
});

export default router; 
import { Router } from 'express';
import { TaskController } from '../controllers/taskController';
import { PriorityController } from '../controllers/priorityController';
import { AuthMiddleware } from '../middleware/auth';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Additional validation schemas specific to task routes
const bulkUpdateSchema = Joi.object({
  taskIds: Joi.array()
    .items(Joi.string().pattern(/^[0-9a-fA-F]{24}$/))
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one task ID is required',
      'array.max': 'Cannot update more than 50 tasks at once',
      'any.required': 'Task IDs array is required'
    }),
  updates: Joi.object({
    status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
    priority: Joi.number().min(1).max(10),
    tags: Joi.array().items(Joi.string().max(50)).max(10)
  })
    .min(1)
    .required()
    .messages({
      'object.min': 'At least one update field is required',
      'any.required': 'Updates object is required'
    })
});

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route GET /api/tasks/stats
 * @desc Get task statistics for the authenticated user
 * @access Private
 */
router.get('/stats',
  TaskController.getTaskStats
);

/**
 * @route POST /api/tasks/recalculate-priorities
 * @desc Recalculate priorities for all user tasks
 * @access Private
 */
router.post('/recalculate-priorities',
  PriorityController.recalculateAllPriorities
);

/**
 * @route GET /api/tasks/scheduling-recommendations
 * @desc Get scheduling recommendations based on priorities
 * @access Private
 */
router.get('/scheduling-recommendations',
  PriorityController.getSchedulingRecommendations
);

/**
 * @route GET /api/tasks/priority-analytics
 * @desc Get priority analytics and completion patterns
 * @access Private
 */
router.get('/priority-analytics',
  PriorityController.getPriorityAnalytics
);

/**
 * @route PATCH /api/tasks/bulk
 * @desc Bulk update multiple tasks
 * @access Private
 */
router.patch('/bulk',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(bulkUpdateSchema, 'body'),
  TaskController.bulkUpdateTasks
);

/**
 * @route POST /api/tasks
 * @desc Create a new task
 * @access Private
 */
router.post('/',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationSchemas.taskCreation, 'body'),
  TaskController.createTask
);

/**
 * @route GET /api/tasks
 * @desc Get all tasks for the authenticated user with filtering and pagination
 * @access Private
 */
router.get('/',
  ValidationMiddleware.validate(ValidationSchemas.taskQuery, 'query'),
  TaskController.getTasks
);

/**
 * @route GET /api/tasks/:id
 * @desc Get a specific task by ID
 * @access Private
 */
router.get('/:id',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('task'),
  TaskController.getTask
);

/**
 * @route PUT /api/tasks/:id
 * @desc Update a task
 * @access Private
 */
router.put('/:id',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('task'),
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationSchemas.taskUpdate, 'body'),
  TaskController.updateTask
);

/**
 * @route DELETE /api/tasks/:id
 * @desc Delete a task
 * @access Private
 * @query action - 'cascade' to delete subtasks, 'orphan' (default) to remove parent reference
 */
router.delete('/:id',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('task'),
  TaskController.deleteTask
);

/**
 * @route PATCH /api/tasks/:id/start
 * @desc Mark task as started
 * @access Private
 */
router.patch('/:id/start',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('task'),
  TaskController.startTask
);

/**
 * @route PATCH /api/tasks/:id/complete
 * @desc Mark task as completed
 * @access Private
 */
router.patch('/:id/complete',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('task'),
  TaskController.completeTask
);

/**
 * @route POST /api/tasks/:id/calculate-priority
 * @desc Calculate dynamic priority for a specific task
 * @access Private
 */
router.post('/:id/calculate-priority',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('task'),
  PriorityController.calculateTaskPriority
);

export default router; 
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

// Custom validation schemas
export const ValidationSchemas = {
  // User registration/login
  userRegistration: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    name: Joi.string().min(1).max(100).required().messages({
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),
    password: Joi.string().min(8).max(128).required().messages({
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password cannot exceed 128 characters',
      'any.required': 'Password is required'
    }),
    preferences: Joi.object({
      timezone: Joi.string().default('UTC'),
      workingHours: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('09:00'),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).default('17:00')
      }).default(),
      defaultTaskDuration: Joi.number().min(5).max(480).default(30),
      priorityWeights: Joi.object({
        deadline: Joi.number().min(0).max(1).default(0.4),
        context: Joi.number().min(0).max(1).default(0.3),
        dependencies: Joi.number().min(0).max(1).default(0.3)
      }).custom((value, helpers) => {
        const sum = value.deadline + value.context + value.dependencies;
        if (Math.abs(sum - 1.0) > 0.1) {
          return helpers.error('custom.sumNotOne');
        }
        return value;
      }).messages({
        'custom.sumNotOne': 'Priority weights must sum to approximately 1.0'
      }).default(),
      notifications: Joi.object({
        email: Joi.boolean().default(true),
        push: Joi.boolean().default(true),
        desktop: Joi.boolean().default(false),
        reminderMinutes: Joi.number().min(0).max(1440).default(15)
      }).default()
    }).default()
  }),

  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  userUpdate: Joi.object({
    name: Joi.string().min(1).max(100),
    preferences: Joi.object({
      timezone: Joi.string(),
      workingHours: Joi.object({
        start: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
        end: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
      }),
      defaultTaskDuration: Joi.number().min(5).max(480),
      priorityWeights: Joi.object({
        deadline: Joi.number().min(0).max(1),
        context: Joi.number().min(0).max(1),
        dependencies: Joi.number().min(0).max(1)
      }).custom((value, helpers) => {
        const sum = value.deadline + value.context + value.dependencies;
        if (Math.abs(sum - 1.0) > 0.1) {
          return helpers.error('custom.sumNotOne');
        }
        return value;
      }),
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        desktop: Joi.boolean(),
        reminderMinutes: Joi.number().min(0).max(1440)
      })
    })
  }),

  // Task management
  taskCreation: Joi.object({
    title: Joi.string().min(1).max(200).required().messages({
      'string.min': 'Task title must be at least 1 character',
      'string.max': 'Task title cannot exceed 200 characters',
      'any.required': 'Task title is required'
    }),
    description: Joi.string().max(1000).allow('').messages({
      'string.max': 'Task description cannot exceed 1000 characters'
    }),
    priority: Joi.number().min(1).max(10).messages({
      'number.min': 'Priority must be between 1 and 10',
      'number.max': 'Priority must be between 1 and 10'
    }),
    deadline: Joi.date().min('now').messages({
      'date.min': 'Deadline cannot be in the past'
    }),
    context: Joi.string().max(500).allow('').messages({
      'string.max': 'Context cannot exceed 500 characters'
    }),
    estimatedTime: Joi.number().min(0).max(1440).messages({
      'number.min': 'Estimated time cannot be negative',
      'number.max': 'Estimated time cannot exceed 24 hours'
    }),
    tags: Joi.array().items(
      Joi.string().max(50).messages({
        'string.max': 'Tag cannot exceed 50 characters'
      })
    ).max(10).messages({
      'array.max': 'Cannot have more than 10 tags'
    }),
    dependencies: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
        'string.pattern.base': 'Invalid task ID format'
      })
    ),
    parentTask: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).messages({
      'string.pattern.base': 'Invalid parent task ID format'
    })
  }),

  taskUpdate: Joi.object({
    title: Joi.string().min(1).max(200),
    description: Joi.string().max(1000).allow(''),
    priority: Joi.number().min(1).max(10),
    deadline: Joi.date().allow(null),
    context: Joi.string().max(500).allow(''),
    status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
    estimatedTime: Joi.number().min(0).max(1440),
    tags: Joi.array().items(Joi.string().max(50)).max(10),
    dependencies: Joi.array().items(
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
    )
  }),

  // Conversation management
  conversationMessage: Joi.object({
    content: Joi.string().min(1).max(10000).required().messages({
      'string.min': 'Message content cannot be empty',
      'string.max': 'Message content cannot exceed 10,000 characters',
      'any.required': 'Message content is required'
    }),
    role: Joi.string().valid('user', 'assistant', 'system').default('user'),
    metadata: Joi.object({
      taskIds: Joi.array().items(
        Joi.string().pattern(/^[0-9a-fA-F]{24}$/)
      ),
      extractedEntities: Joi.object({
        intent: Joi.string(),
        entities: Joi.object()
      })
    })
  }),

  // Query parameters
  taskQuery: Joi.object({
    status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
    priority: Joi.string().pattern(/^[1-9]|10$/).messages({
      'string.pattern.base': 'Priority must be between 1 and 10'
    }),
    tags: Joi.string(),
    search: Joi.string().max(100),
    sortBy: Joi.string().valid('priority', 'deadline', 'createdAt', 'updatedAt').default('priority'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    limit: Joi.number().min(1).max(100).default(20),
    page: Joi.number().min(1).default(1)
  }),

  conversationQuery: Joi.object({
    limit: Joi.number().min(1).max(50).default(10),
    page: Joi.number().min(1).default(1)
  }),

  // URL parameters
  mongoId: Joi.object({
    id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid ID format'
    })
  })
};

export class ValidationMiddleware {
  /**
   * Generic validation middleware
   */
  static validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false, // Return all errors
        allowUnknown: false, // Don't allow unexpected fields
        stripUnknown: true // Remove unknown fields
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation error:', {
          property,
          errors,
          originalData: req[property]
        });

        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors
        });
        return;
      }

      // Replace the original data with validated and sanitized data
      req[property] = value;
      next();
    };
  };

  /**
   * Sanitize string inputs to prevent XSS
   */
  static sanitize = (req: Request, res: Response, next: NextFunction): void => {
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        // Basic HTML/script tag removal
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<[^>]*>/g, '')
          .trim();
      } else if (Array.isArray(value)) {
        return value.map(sanitizeValue);
      } else if (value && typeof value === 'object') {
        const sanitized: any = {};
        for (const [key, val] of Object.entries(value)) {
          sanitized[key] = sanitizeValue(val);
        }
        return sanitized;
      }
      return value;
    };

    if (req.body) {
      req.body = sanitizeValue(req.body);
    }

    next();
  };

  /**
   * Middleware to check if user owns the resource
   */
  static checkOwnership = (resourceType: 'task' | 'conversation') => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.userId) {
          res.status(401).json({
            success: false,
            message: 'Authentication required'
          });
          return;
        }

        const resourceId = req.params.id;
        let resource: any = null;

        // Import models dynamically to avoid circular dependencies
        const { Task, Conversation } = await import('../models');

        switch (resourceType) {
          case 'task':
            resource = await Task.findById(resourceId);
            break;
          case 'conversation':
            resource = await Conversation.findById(resourceId);
            break;
        }

        if (!resource) {
          res.status(404).json({
            success: false,
            message: `${resourceType} not found`
          });
          return;
        }

        if (resource.userId.toString() !== req.userId) {
          res.status(403).json({
            success: false,
            message: 'Access denied: You can only access your own resources'
          });
          return;
        }

        // Attach resource to request for use in controller
        req.resource = resource;
        next();
      } catch (error) {
        logger.error('Ownership check error:', error);
        res.status(500).json({
          success: false,
          message: 'Error checking resource ownership'
        });
      }
    };
  };
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      resource?: any;
    }
  }
}

export default ValidationMiddleware; 
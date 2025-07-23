import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { PriorityController } from '../controllers/priorityController';
import { AuthMiddleware } from '../middleware/auth';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Password validation schema for change password and delete account
const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  newPassword: Joi.string().min(8).max(128).required().messages({
    'string.min': 'New password must be at least 8 characters',
    'string.max': 'New password cannot exceed 128 characters',
    'any.required': 'New password is required'
  })
});

const   deleteAccountSchema = Joi.object({
  password: Joi.string().required().messages({
    'any.required': 'Password is required for account deletion'
  })
});

const priorityWeightsSchema = Joi.object({
  deadline: Joi.number().min(0).max(1).required(),
  context: Joi.number().min(0).max(1).required(),
  dependencies: Joi.number().min(0).max(1).required()
}).custom((value, helpers) => {
  const sum = value.deadline + value.context + value.dependencies;
  if (Math.abs(sum - 1.0) > 0.1) {
    return helpers.error('custom.sumNotOne');
  }
  return value;
}).messages({
  'custom.sumNotOne': 'Priority weights must sum to approximately 1.0'
});

// Public routes (no authentication required)

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register',
  AuthMiddleware.authRateLimit(10, 15 * 60 * 1000), // 10 attempts per 15 minutes
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationSchemas.userRegistration, 'body'),
  AuthController.register
);

/**
 * @route POST /api/auth/login
 * @desc Login user
 * @access Public
 */
router.post('/login',
  AuthMiddleware.authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationSchemas.userLogin, 'body'),
  AuthController.login
);

// Protected routes (authentication required)

/**
 * @route GET /api/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile',
  AuthMiddleware.authenticate,
  AuthController.getProfile
);

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile
 * @access Private
 */
router.put('/profile',
  AuthMiddleware.authenticate,
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationSchemas.userUpdate, 'body'),
  AuthController.updateProfile
);

/**
 * @route POST /api/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password',
  AuthMiddleware.authenticate,
  AuthMiddleware.authRateLimit(3, 60 * 60 * 1000), // 3 attempts per hour
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(passwordChangeSchema, 'body'),
  AuthController.changePassword
);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh JWT token
 * @access Private
 */
router.post('/refresh',
  AuthMiddleware.authenticate,
  AuthController.refreshToken
);

/**
 * @route POST /api/auth/logout
 * @desc Logout user (client-side token invalidation)
 * @access Private
 */
router.post('/logout',
  AuthMiddleware.authenticate,
  AuthController.logout
);

/**
 * @route DELETE /api/auth/account
 * @desc Delete user account permanently
 * @access Private
 */
router.delete('/account',
  AuthMiddleware.authenticate,
  AuthMiddleware.authRateLimit(2, 60 * 60 * 1000), // 2 attempts per hour
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(deleteAccountSchema, 'body'),
  AuthController.deleteAccount
);

/**
 * @route PUT /api/auth/priority-weights
 * @desc Update user priority calculation weights
 * @access Private
 */
router.put('/priority-weights',
  AuthMiddleware.authenticate,
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(priorityWeightsSchema, 'body'),
  PriorityController.updatePriorityWeights
);

export default router; 
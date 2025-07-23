import { Router } from 'express';
import { ChatController } from '../controllers/chatController';
import { AuthMiddleware } from '../middleware/auth';
import { ValidationMiddleware, ValidationSchemas } from '../middleware/validation';
import Joi from 'joi';

const router = Router();

// Additional validation schemas specific to chat routes
const conversationUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Conversation title must be at least 1 character',
    'string.max': 'Conversation title cannot exceed 200 characters',
    'any.required': 'Conversation title is required'
  })
});

const conversationCreateSchema = Joi.object({
  title: Joi.string().min(1).max(200).messages({
    'string.min': 'Conversation title must be at least 1 character',
    'string.max': 'Conversation title cannot exceed 200 characters'
  })
});

const searchSchema = Joi.object({
  query: Joi.string().min(1).max(100).required().messages({
    'string.min': 'Search query must be at least 1 character',
    'string.max': 'Search query cannot exceed 100 characters',
    'any.required': 'Search query is required'
  }),
  limit: Joi.number().min(1).max(50).default(20),
  page: Joi.number().min(1).default(1)
});

// All routes require authentication
router.use(AuthMiddleware.authenticate);

/**
 * @route POST /api/chat/message
 * @desc Send a message in the active conversation
 * @access Private
 */
router.post('/message',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(ValidationSchemas.conversationMessage, 'body'),
  ChatController.sendMessage
);

/**
 * @route GET /api/chat/history
 * @desc Get conversation history for the authenticated user
 * @access Private
 */
router.get('/history',
  ValidationMiddleware.validate(ValidationSchemas.conversationQuery, 'query'),
  ChatController.getConversationHistory
);

/**
 * @route GET /api/chat/active
 * @desc Get the active conversation with recent messages
 * @access Private
 */
router.get('/active',
  ChatController.getActiveConversation
);

/**
 * @route GET /api/chat/context
 * @desc Get conversation context for AI processing
 * @access Private
 */
router.get('/context',
  ChatController.getConversationContext
);

/**
 * @route GET /api/chat/search
 * @desc Search messages across conversations
 * @access Private
 */
router.get('/search',
  ValidationMiddleware.validate(searchSchema, 'query'),
  ChatController.searchMessages
);

/**
 * @route POST /api/chat/conversations
 * @desc Create a new conversation
 * @access Private
 */
router.post('/conversations',
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(conversationCreateSchema, 'body'),
  ChatController.createConversation
);

/**
 * @route GET /api/chat/conversations/:id
 * @desc Get a specific conversation by ID
 * @access Private
 */
router.get('/conversations/:id',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('conversation'),
  ChatController.getConversation
);

/**
 * @route PUT /api/chat/conversations/:id
 * @desc Update conversation title
 * @access Private
 */
router.put('/conversations/:id',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('conversation'),
  ValidationMiddleware.sanitize,
  ValidationMiddleware.validate(conversationUpdateSchema, 'body'),
  ChatController.updateConversation
);

/**
 * @route DELETE /api/chat/conversations/:id
 * @desc Delete a conversation
 * @access Private
 */
router.delete('/conversations/:id',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('conversation'),
  ChatController.deleteConversation
);

/**
 * @route PATCH /api/chat/conversations/:id/activate
 * @desc Set a conversation as active
 * @access Private
 */
router.patch('/conversations/:id/activate',
  ValidationMiddleware.validate(ValidationSchemas.mongoId, 'params'),
  ValidationMiddleware.checkOwnership('conversation'),
  ChatController.activateConversation
);

export default router; 
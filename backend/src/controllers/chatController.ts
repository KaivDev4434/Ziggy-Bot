import { Request, Response } from 'express';
import { Conversation, IConversation, MessageRole, AIService } from '../models';
import { logger } from '../config/logger';

export interface ChatResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class ChatController {
  /**
   * Send a message in a conversation
   * POST /api/chat/message
   */
  static sendMessage = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { content, metadata } = req.body;

      // Find or create active conversation for the user
      let conversation = await (Conversation as any).findOrCreateActive(req.userId);

      // Add user message
      const userMessage = conversation.addMessage(
        MessageRole.USER,
        content,
        metadata
      );

      // Update conversation context with current tasks if not provided
      if (!conversation.context.currentTasks || conversation.context.currentTasks.length === 0) {
        const { Task } = await import('../models');
        const activeTasks = await Task.find({
          userId: req.userId,
          status: { $in: ['pending', 'in-progress'] }
        }).select('_id').limit(10);

        conversation.context.currentTasks = activeTasks.map(task => task._id);
      }

      // Save conversation with new message
      await conversation.save();

      // TODO: In Phase 2.3, we'll add AI processing here
      // For now, we'll add a simple acknowledgment message
      const assistantMessage = conversation.addMessage(
        MessageRole.ASSISTANT,
        "I've received your message. AI processing will be implemented in the next phase.",
        {
          aiService: AIService.RULE_BASED,
          processingTime: 0,
          confidence: 1.0
        }
      );

      await conversation.save();

      // Populate conversation for response
      await conversation.populate('context.currentTasks', 'title status priority');

      logger.info('Message sent successfully', {
        conversationId: conversation._id,
        userId: req.userId,
        messageCount: conversation.messageCount
      });

      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: {
          conversation: {
            id: conversation._id,
            title: conversation.title,
            messageCount: conversation.messageCount,
            lastMessageAt: conversation.lastMessageAt
          },
          userMessage,
          assistantMessage
        }
      } as ChatResponse);

    } catch (error) {
      logger.error('Send message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send message',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get conversation history
   * GET /api/chat/history
   */
  static getConversationHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { limit = 10, page = 1 } = req.query;

      // Calculate pagination
      const limitNum = Math.min(parseInt(limit as string), 50);
      const pageNum = Math.max(parseInt(page as string), 1);

      // Get conversation history using static method
      const conversations = await (Conversation as any).getHistory(
        req.userId,
        limitNum,
        (pageNum - 1) * limitNum
      );

      // Get total count
      const total = await Conversation.countDocuments({ userId: req.userId });
      const pages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        message: 'Conversation history retrieved successfully',
        data: { conversations },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        }
      } as ChatResponse);

    } catch (error) {
      logger.error('Get conversation history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation history',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get active conversation with recent messages
   * GET /api/chat/active
   */
  static getActiveConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { messageLimit = 20 } = req.query;

      // Find or create active conversation
      const conversation = await (Conversation as any).findOrCreateActive(req.userId);

      // Get recent messages
      const recentMessages = conversation.getRecentMessages(parseInt(messageLimit as string));

      // Populate context tasks
      await conversation.populate('context.currentTasks', 'title status priority deadline');

      res.status(200).json({
        success: true,
        message: 'Active conversation retrieved successfully',
        data: {
          conversation: {
            id: conversation._id,
            title: conversation.title,
            messageCount: conversation.messageCount,
            lastMessageAt: conversation.lastMessageAt,
            context: conversation.context
          },
          messages: recentMessages
        }
      } as ChatResponse);

    } catch (error) {
      logger.error('Get active conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active conversation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get a specific conversation by ID
   * GET /api/chat/conversations/:id
   */
  static getConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = req.resource; // Set by ownership middleware

      // Populate context tasks
      await conversation.populate('context.currentTasks', 'title status priority deadline');

      res.status(200).json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: { conversation }
      } as ChatResponse);

    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Update conversation title
   * PUT /api/chat/conversations/:id
   */
  static updateConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = req.resource; // Set by ownership middleware
      const { title } = req.body;

      if (title !== undefined) {
        conversation.title = title.trim();
        await conversation.save();
      }

      logger.info('Conversation updated successfully', {
        conversationId: conversation._id,
        userId: req.userId,
        newTitle: conversation.title
      });

      res.status(200).json({
        success: true,
        message: 'Conversation updated successfully',
        data: { conversation }
      } as ChatResponse);

    } catch (error) {
      logger.error('Update conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update conversation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Delete a conversation
   * DELETE /api/chat/conversations/:id
   */
  static deleteConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = req.resource; // Set by ownership middleware

      // If this was the active conversation, we need to handle that
      if (conversation.isActive) {
        // Find the most recent conversation and make it active
        const recentConversation = await Conversation.findOne({
          userId: req.userId,
          _id: { $ne: conversation._id }
        }).sort({ lastMessageAt: -1 });

        if (recentConversation) {
          recentConversation.isActive = true;
          await recentConversation.save();
        }
      }

      await Conversation.findByIdAndDelete(conversation._id);

      logger.info('Conversation deleted successfully', {
        conversationId: conversation._id,
        userId: req.userId,
        title: conversation.title
      });

      res.status(200).json({
        success: true,
        message: 'Conversation deleted successfully'
      } as ChatResponse);

    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete conversation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Create a new conversation
   * POST /api/chat/conversations
   */
  static createConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { title } = req.body;

      // Deactivate current active conversation
      await Conversation.updateMany(
        { userId: req.userId, isActive: true },
        { isActive: false }
      );

      // Create new conversation
      const conversation = new Conversation({
        userId: req.userId,
        title: title || `Conversation ${new Date().toLocaleDateString()}`,
        isActive: true
      });

      await conversation.save();

      logger.info('New conversation created', {
        conversationId: conversation._id,
        userId: req.userId,
        title: conversation.title
      });

      res.status(201).json({
        success: true,
        message: 'Conversation created successfully',
        data: { conversation }
      } as ChatResponse);

    } catch (error) {
      logger.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create conversation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Set a conversation as active
   * PATCH /api/chat/conversations/:id/activate
   */
  static activateConversation = async (req: Request, res: Response): Promise<void> => {
    try {
      const conversation = req.resource; // Set by ownership middleware

      // Deactivate all other conversations for this user
      await Conversation.updateMany(
        { userId: req.userId, isActive: true },
        { isActive: false }
      );

      // Activate this conversation
      conversation.isActive = true;
      await conversation.save();

      logger.info('Conversation activated', {
        conversationId: conversation._id,
        userId: req.userId
      });

      res.status(200).json({
        success: true,
        message: 'Conversation activated successfully',
        data: { conversation }
      } as ChatResponse);

    } catch (error) {
      logger.error('Activate conversation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to activate conversation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get conversation context for AI processing
   * GET /api/chat/context
   */
  static getConversationContext = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get active conversation
      const conversation = await (Conversation as any).findOrCreateActive(req.userId);

      // Generate context for AI
      const context = conversation.getContextForAI();

      // Get user preferences for context
      const { User } = await import('../models');
      const user = await User.findById(req.userId).select('preferences');

      res.status(200).json({
        success: true,
        message: 'Conversation context retrieved successfully',
        data: {
          context,
          userPreferences: user?.preferences,
          conversationSummary: conversation.summarizeConversation(),
          currentTasks: conversation.context.currentTasks
        }
      } as ChatResponse);

    } catch (error) {
      logger.error('Get conversation context error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversation context',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Search messages across conversations
   * GET /api/chat/search
   */
  static searchMessages = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { query, limit = 20, page = 1 } = req.query;

      if (!query || typeof query !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      const limitNum = Math.min(parseInt(limit as string), 50);
      const pageNum = Math.max(parseInt(page as string), 1);
      const skip = (pageNum - 1) * limitNum;

      // Search conversations using text index
      const conversations = await Conversation.find(
        {
          userId: req.userId,
          $text: { $search: query }
        },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limitNum)
        .skip(skip)
        .select('title lastMessageAt messageCount messages')
        .lean();

      // Filter messages that match the search query
      const results = conversations.map(conv => {
        const matchingMessages = conv.messages.filter((msg: any) =>
          msg.content.toLowerCase().includes(query.toLowerCase())
        );

        return {
          conversation: {
            id: conv._id,
            title: conv.title,
            lastMessageAt: conv.lastMessageAt,
            messageCount: conv.messageCount
          },
          matchingMessages: matchingMessages.slice(0, 5) // Limit to 5 messages per conversation
        };
      });

      res.status(200).json({
        success: true,
        message: 'Search completed successfully',
        data: { results, searchQuery: query },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: conversations.length,
          pages: Math.ceil(conversations.length / limitNum)
        }
      } as ChatResponse);

    } catch (error) {
      logger.error('Search messages error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search messages',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };
}

export default ChatController; 
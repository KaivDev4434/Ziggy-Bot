import { Request, Response } from 'express';
import { Conversation, IConversation, MessageRole, AIService, Task, User } from '../models';
import { logger } from '../config/logger';
import NLPService from '../services/nlpService';
import IntentService, { IntentContext } from '../services/intentService';
import TaskGenerationService from '../services/taskGenerationService';

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

      // ✅ Phase 2.3: Advanced NLP Processing
      const aiResponse = await processMessageWithNLP(content, req.userId!, conversation);
      
      const assistantMessage = conversation.addMessage(
        MessageRole.ASSISTANT,
        aiResponse.content,
        aiResponse.metadata
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

      // Extract messages from the conversation
      const messages = conversation.messages || [];

      res.status(200).json({
        success: true,
        message: 'Conversation retrieved successfully',
        data: { 
          conversation,
          messages 
        }
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

/**
 * Advanced NLP-powered message processing
 */
async function processMessageWithNLP(
  userMessage: string, 
  userId: string, 
  conversation: IConversation
): Promise<{ content: string; metadata: any }> {
  try {
    const startTime = Date.now();

    // Get user data for context
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Process message with NLP service
    const nlpResult = await NLPService.processMessage(userMessage, user);

    // Get recent conversation messages for context
    const recentMessages = conversation.getRecentMessages(10);

    // Get current user tasks for context
    const currentTasks = await Task.find({ 
      userId, 
      status: { $in: ['pending', 'in-progress'] } 
    }).limit(20);

    // Build intent context
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const intentContext: IntentContext = {
      currentTasks,
      recentMessages,
      userPreferences: user.preferences,
      timeOfDay: hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening',
      dayOfWeek: dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'weekday'
    };

    // Process intent and determine actions
    const intentActions = await IntentService.processIntent(nlpResult, user, intentContext);

    // Execute actions and collect results
    const actionResults = await executeIntentActions(intentActions, user, nlpResult);

    // Generate comprehensive response
    const responseContent = generateResponseFromActions(actionResults, nlpResult, user);

    const processingTime = Date.now() - startTime;

    return {
      content: responseContent.content,
      metadata: {
        aiService: AIService.RULE_BASED,
        processingTime,
        confidence: nlpResult.confidence,
        nlp: {
          intent: nlpResult.intent,
          entitiesFound: nlpResult.entities.length,
          actionsExecuted: actionResults.length
        },
        actions: actionResults
      }
    };

  } catch (error) {
    logger.error('NLP processing error:', error);
    
    // Fallback to simple response
    return generateFallbackResponse(userMessage, userId);
  }
}

/**
 * Execute intent actions and return results
 */
async function executeIntentActions(
  actions: any[],
  user: any,
  nlpResult: any
): Promise<any[]> {
  const results = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case 'create_task':
          const taskResult = await createTaskFromNLP(action.params, user, nlpResult);
          if (taskResult) {
            results.push({ type: 'task_created', data: taskResult });
          }
          break;

        case 'list_tasks':
          const tasks = await getFilteredTasks(action.params, user);
          results.push({ type: 'tasks_listed', data: tasks });
          break;

        case 'get_schedule':
          const schedule = await getScheduleInfo(action.params, user);
          results.push({ type: 'schedule_retrieved', data: schedule });
          break;

        case 'respond':
          results.push({ type: 'response', data: { message: action.response } });
          break;

        default:
          logger.warn('Unknown action type:', action.type);
      }
    } catch (error) {
      logger.error('Action execution error:', error);
      results.push({ type: 'error', data: { message: 'Failed to execute action' } });
    }
  }

  return results;
}

/**
 * Create task from NLP processing
 */
async function createTaskFromNLP(taskData: any, user: any, nlpResult: any): Promise<any> {
  try {
    // Generate enhanced task using task generation service
    const generationResult = await TaskGenerationService.generateTasks(nlpResult, user);
    
    if (generationResult.tasks.length > 0) {
      const taskToCreate = generationResult.tasks[0];
      
      const task = new Task({
        ...taskToCreate,
        userId: user._id
      });
      
      await task.save();
      
      logger.info('NLP task created', {
        taskId: task._id,
        userId: user._id,
        confidence: generationResult.confidence
      });
      
      return {
        task,
        suggestions: generationResult.suggestions,
        warnings: generationResult.warnings,
        confidence: generationResult.confidence
      };
    }
    
    return null;
  } catch (error) {
    logger.error('Task creation from NLP error:', error);
    throw error;
  }
}

/**
 * Get filtered tasks based on action parameters
 */
async function getFilteredTasks(params: any, user: any): Promise<any[]> {
  const query: any = { userId: user._id };
  
  // Apply filters from params
  if (params.dateRange) {
    const today = new Date();
    if (params.dateRange === 'today') {
      query.deadline = {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      };
    }
  }

  if (params.priority) {
    if (params.priority === 'high') {
      query.priority = { $gte: 7 };
    } else if (params.priority === 'low') {
      query.priority = { $lte: 4 };
    }
  }

  const tasks = await Task.find(query)
    .sort({ priority: -1, deadline: 1 })
    .limit(10);

  return tasks;
}

/**
 * Get schedule information
 */
async function getScheduleInfo(params: any, user: any): Promise<any> {
  const timeRange = params.timeRange || 'today';
  const today = new Date();
  
  let startDate = new Date(today);
  let endDate = new Date(today);
  
  if (timeRange === 'today') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (timeRange === 'tomorrow') {
    startDate.setDate(today.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(today.getDate() + 1);
    endDate.setHours(23, 59, 59, 999);
  }

  const tasks = await Task.find({
    userId: user._id,
    deadline: { $gte: startDate, $lte: endDate }
  }).sort({ deadline: 1 });

  return { tasks, timeRange };
}

/**
 * Generate response content from action results
 */
function generateResponseFromActions(
  actionResults: any[],
  nlpResult: any,
  user: any
): { content: string } {
  let responseContent = '';
  
  for (const result of actionResults) {
    switch (result.type) {
      case 'task_created':
        if (result.data && result.data.task) {
          const task = result.data.task;
          responseContent += `✅ I've created the task "${task.title}"`;
          
          if (task.deadline) {
            responseContent += ` with deadline ${task.deadline.toLocaleDateString()}`;
          }
          
          if (task.priority >= 8) {
            responseContent += ` (marked as high priority)`;
          }
          
          responseContent += '.\n\n';
          
          // Add suggestions if any
          if (result.data.suggestions && result.data.suggestions.length > 0) {
            responseContent += '💡 **Suggestions:**\n';
            result.data.suggestions.forEach((suggestion: string) => {
              responseContent += `• ${suggestion}\n`;
            });
            responseContent += '\n';
          }
          
          // Add warnings if any
          if (result.data.warnings && result.data.warnings.length > 0) {
            responseContent += '⚠️ **Please note:**\n';
            result.data.warnings.forEach((warning: string) => {
              responseContent += `• ${warning}\n`;
            });
            responseContent += '\n';
          }
        }
        break;

      case 'tasks_listed':
        if (result.data && result.data.length > 0) {
          responseContent += `📋 **Your Tasks:**\n\n`;
          result.data.forEach((task: any, index: number) => {
            const priority = task.priority >= 8 ? '🔴' : task.priority >= 6 ? '🟡' : '🟢';
            const deadline = task.deadline ? ` (due ${task.deadline.toLocaleDateString()})` : '';
            responseContent += `${index + 1}. ${priority} ${task.title}${deadline}\n`;
          });
          responseContent += '\n';
        } else {
          responseContent += "🎉 Great! You don't have any tasks matching those criteria.\n\n";
        }
        break;

      case 'schedule_retrieved':
        if (result.data && result.data.tasks) {
          const timeRange = result.data.timeRange || 'today';
          responseContent += `📅 **Your schedule for ${timeRange}:**\n\n`;
          
          if (result.data.tasks.length > 0) {
            result.data.tasks.forEach((task: any) => {
              const time = task.deadline ? task.deadline.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'No time set';
              responseContent += `• ${time} - ${task.title}\n`;
            });
          } else {
            responseContent += `You have no scheduled tasks for ${timeRange}.\n`;
          }
          responseContent += '\n';
        }
        break;

      case 'response':
        responseContent += result.data.message + '\n\n';
        break;

      case 'error':
        responseContent += `❌ ${result.data.message}\n\n`;
        break;
    }
  }

  if (!responseContent) {
    responseContent = NLPService.generateResponse(nlpResult, user);
  }

  return { content: responseContent.trim() };
}

/**
 * Fallback response when NLP processing fails
 */
async function generateFallbackResponse(userMessage: string, userId: string): Promise<{ content: string; metadata: any }> {
  const lowerMessage = userMessage.toLowerCase();

  // Get user for personalized fallback
  const user = await User.findById(userId);
  const userName = user?.name || 'there';

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return {
      content: `Hello ${userName}! I'm Ziggy, your personal task assistant. How can I help you manage your tasks today?`,
      metadata: { 
        aiService: AIService.RULE_BASED,
        processingTime: 5,
        confidence: 0.5,
        fallback: true 
      }
    };
  }

  if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    return {
      content: "I can help you manage your tasks! You can ask me to create new tasks, check your current tasks, or update existing ones. What would you like to do?",
      metadata: { 
        aiService: AIService.RULE_BASED,
        processingTime: 5,
        confidence: 0.5,
        fallback: true 
      }
    };
  }

  return {
    content: "I understand you're trying to communicate with me. Could you please tell me more about what you'd like to do? I'm here to help you manage your tasks and stay organized!",
    metadata: { 
      aiService: AIService.RULE_BASED,
      processingTime: 5,
      confidence: 0.3,
      fallback: true 
    }
  };
}

export default ChatController; 
import { IntentType, NLPResult } from './nlpService';
import { IUser, ITask } from '../models';
import { logger } from '../config/logger';

export interface IntentAction {
  type: 'create_task' | 'list_tasks' | 'get_schedule' | 'update_task' | 'delete_task' | 'respond';
  params?: any;
  response?: string;
}

export interface IntentContext {
  currentTasks: ITask[];
  recentMessages: any[];
  userPreferences: IUser['preferences'];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
}

export class IntentService {
  private static instance: IntentService;

  public static getInstance(): IntentService {
    if (!IntentService.instance) {
      IntentService.instance = new IntentService();
    }
    return IntentService.instance;
  }

  /**
   * Process intent and determine the appropriate action
   */
  public async processIntent(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    try {
      const actions: IntentAction[] = [];

      logger.info('Processing intent', {
        userId: user._id,
        intent: nlpResult.intent,
        confidence: nlpResult.confidence,
        entitiesCount: nlpResult.entities.length
      });

      switch (nlpResult.intent) {
        case IntentType.CREATE_TASK:
          actions.push(...await this.handleCreateTask(nlpResult, user, context));
          break;

        case IntentType.LIST_TASKS:
          actions.push(...await this.handleListTasks(nlpResult, user, context));
          break;

        case IntentType.GET_SCHEDULE:
          actions.push(...await this.handleGetSchedule(nlpResult, user, context));
          break;

        case IntentType.UPDATE_TASK:
          actions.push(...await this.handleUpdateTask(nlpResult, user, context));
          break;

        case IntentType.DELETE_TASK:
          actions.push(...await this.handleDeleteTask(nlpResult, user, context));
          break;

        case IntentType.ASK_STATUS:
          actions.push(...await this.handleAskStatus(nlpResult, user, context));
          break;

        case IntentType.GREETING:
          actions.push(...await this.handleGreeting(nlpResult, user, context));
          break;

        case IntentType.SET_REMINDER:
          actions.push(...await this.handleSetReminder(nlpResult, user, context));
          break;

        case IntentType.GENERAL_QUESTION:
          actions.push(...await this.handleGeneralQuestion(nlpResult, user, context));
          break;

        default:
          actions.push(this.handleUnknownIntent(nlpResult, user, context));
      }

      logger.info('Intent processing completed', {
        userId: user._id,
        actionsGenerated: actions.length,
        actionTypes: actions.map(a => a.type)
      });

      return actions;

    } catch (error) {
      logger.error('Intent processing error:', error);
      return [{
        type: 'respond',
        response: "I encountered an error processing your request. Could you please try again?"
      }];
    }
  }

  /**
   * Handle task creation intent
   */
  private async handleCreateTask(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const actions: IntentAction[] = [];

    if (nlpResult.extractedTasks.length > 0) {
      const taskData = nlpResult.extractedTasks[0];
      
      // Enhance task data with context
      const enhancedTaskData = this.enhanceTaskWithContext(taskData, user, context);

      actions.push({
        type: 'create_task',
        params: enhancedTaskData
      });

      // Generate confirmation response
      const confirmationResponse = this.generateTaskCreationResponse(enhancedTaskData, context);
      actions.push({
        type: 'respond',
        response: confirmationResponse
      });

    } else {
      // Ask for clarification
      actions.push({
        type: 'respond',
        response: this.generateTaskCreationPrompt(nlpResult, context)
      });
    }

    return actions;
  }

  /**
   * Handle list tasks intent
   */
  private async handleListTasks(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const actions: IntentAction[] = [];

    // Determine filter criteria from entities
    const filters = this.extractTaskFilters(nlpResult, context);

    actions.push({
      type: 'list_tasks',
      params: filters
    });

    // Generate appropriate response based on time and context
    const response = this.generateTaskListResponse(filters, context);
    actions.push({
      type: 'respond',
      response
    });

    return actions;
  }

  /**
   * Handle get schedule intent
   */
  private async handleGetSchedule(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const actions: IntentAction[] = [];

    // Determine time range from entities
    const timeRange = this.extractTimeRange(nlpResult, context);

    actions.push({
      type: 'get_schedule',
      params: { timeRange }
    });

    const response = this.generateScheduleResponse(timeRange, context);
    actions.push({
      type: 'respond',
      response
    });

    return actions;
  }

  /**
   * Handle task update intent
   */
  private async handleUpdateTask(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const actions: IntentAction[] = [];

    // Try to identify which task to update
    const taskIdentifier = this.identifyTaskFromContext(nlpResult, context);
    
    if (taskIdentifier) {
      const updateData = this.extractUpdateData(nlpResult);
      
      actions.push({
        type: 'update_task',
        params: { taskId: taskIdentifier, updates: updateData }
      });

      actions.push({
        type: 'respond',
        response: `I'll update that task for you.`
      });
    } else {
      actions.push({
        type: 'respond',
        response: "Which task would you like to update? Please be more specific."
      });
    }

    return actions;
  }

  /**
   * Handle task deletion intent
   */
  private async handleDeleteTask(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const actions: IntentAction[] = [];

    const taskIdentifier = this.identifyTaskFromContext(nlpResult, context);
    
    if (taskIdentifier) {
      actions.push({
        type: 'delete_task',
        params: { taskId: taskIdentifier }
      });

      actions.push({
        type: 'respond',
        response: "I'll remove that task from your list."
      });
    } else {
      actions.push({
        type: 'respond',
        response: "Which task would you like to remove? Please specify the task."
      });
    }

    return actions;
  }

  /**
   * Handle status inquiry intent
   */
  private async handleAskStatus(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const pendingTasks = context.currentTasks.filter(t => t.status === 'pending').length;
    const inProgressTasks = context.currentTasks.filter(t => t.status === 'in-progress').length;

    let response = `Here's your current status: `;
    
    if (pendingTasks > 0) {
      response += `${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''}`;
    }
    
    if (inProgressTasks > 0) {
      response += `${pendingTasks > 0 ? ', ' : ''}${inProgressTasks} in progress`;
    }

    if (pendingTasks === 0 && inProgressTasks === 0) {
      response += "All caught up! No pending tasks.";
    }

    return [{
      type: 'respond',
      response
    }];
  }

  /**
   * Handle greeting intent
   */
  private async handleGreeting(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    const timeBasedGreeting = this.getTimeBasedGreeting(context.timeOfDay);
    const taskSummary = this.getTaskSummary(context.currentTasks);

    let response = `${timeBasedGreeting} ${user.name}! `;
    
    if (taskSummary.total > 0) {
      response += taskSummary.message + " ";
    }
    
    response += "How can I help you manage your tasks today?";

    return [{
      type: 'respond',
      response
    }];
  }

  /**
   * Handle set reminder intent
   */
  private async handleSetReminder(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    // Treat reminders as tasks with specific priority and timing
    if (nlpResult.extractedTasks.length > 0) {
      const taskData = nlpResult.extractedTasks[0];
      
      // Enhance as reminder
      const reminderData = {
        ...taskData,
        tags: [...(taskData.tags || []), 'reminder'],
        priority: taskData.priority || 7, // Higher priority for reminders
        context: `Reminder: ${taskData.context || 'User requested reminder'}`
      };

      return [
        {
          type: 'create_task',
          params: reminderData
        },
        {
          type: 'respond',
          response: `I'll remind you about "${taskData.title}"${taskData.deadline ? ` on ${taskData.deadline.toLocaleDateString()}` : ''}.`
        }
      ];
    }

    return [{
      type: 'respond',
      response: "What would you like me to remind you about?"
    }];
  }

  /**
   * Handle general question intent
   */
  private async handleGeneralQuestion(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): Promise<IntentAction[]> {
    // Analyze the question for task-related keywords
    const questionAnalysis = this.analyzeQuestion(nlpResult.processedText, context);

    if (questionAnalysis.isTaskRelated) {
      return questionAnalysis.suggestedActions;
    }

    return [{
      type: 'respond',
      response: "I'm here to help you manage your tasks and schedule. You can ask me to create tasks, check your schedule, or update existing tasks. What would you like to do?"
    }];
  }

  /**
   * Handle unknown intent
   */
  private handleUnknownIntent(
    nlpResult: NLPResult,
    user: IUser,
    context: IntentContext
  ): IntentAction {
    const suggestions = this.generateSuggestions(context);
    
    return {
      type: 'respond',
      response: `I'm not sure what you'd like me to do. ${suggestions}`
    };
  }

  /**
   * Enhance task data with contextual information
   */
  private enhanceTaskWithContext(
    taskData: Partial<ITask>,
    user: IUser,
    context: IntentContext
  ): Partial<ITask> {
    const enhanced = { ...taskData };

    // Set default priority based on time of day and user preferences
    if (!enhanced.priority) {
      enhanced.priority = this.suggestPriority(taskData, context);
    }

    // Adjust estimated time based on user's patterns
    if (!enhanced.estimatedTime) {
      enhanced.estimatedTime = user.preferences?.defaultTaskDuration || 30;
    }

    // Add contextual tags
    const contextualTags = this.generateContextualTags(taskData, context);
    enhanced.tags = [...(enhanced.tags || []), ...contextualTags];

    return enhanced;
  }

  /**
   * Generate task creation response
   */
  private generateTaskCreationResponse(taskData: Partial<ITask>, context: IntentContext): string {
    let response = `I'll create the task "${taskData.title}"`;

    if (taskData.deadline) {
      response += ` with deadline ${taskData.deadline.toLocaleDateString()}`;
    }

    if (taskData.priority && taskData.priority >= 8) {
      response += ` (marked as high priority)`;
    }

    response += ".";

    return response;
  }

  /**
   * Generate task creation prompt when details are missing
   */
  private generateTaskCreationPrompt(nlpResult: NLPResult, context: IntentContext): string {
    const suggestions = [
      "What task would you like to create?",
      "Tell me more about what you need to do.",
      "What's the task you'd like me to add to your list?"
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  /**
   * Extract task filters from NLP result
   */
  private extractTaskFilters(nlpResult: NLPResult, context: IntentContext): any {
    const filters: any = {};

    // Check for date-related filters
    const dateEntities = nlpResult.entities.filter(e => e.type === 'date');
    if (dateEntities.length > 0) {
      filters.dateRange = this.parseDateFilter(dateEntities[0].value);
    }

    // Check for priority filters
    const priorityEntities = nlpResult.entities.filter(e => e.type === 'priority');
    if (priorityEntities.length > 0) {
      filters.priority = this.parsePriorityFilter(priorityEntities[0].value);
    }

    return filters;
  }

  /**
   * Generate appropriate response for task listing
   */
  private generateTaskListResponse(filters: any, context: IntentContext): string {
    if (filters.dateRange) {
      return `Here are your tasks for ${filters.dateRange}:`;
    }

    if (filters.priority) {
      return `Here are your ${filters.priority} priority tasks:`;
    }

    if (context.timeOfDay === 'morning') {
      return "Here's what you have planned for today:";
    }

    return "Here are your current tasks:";
  }

  /**
   * Extract time range from NLP result
   */
  private extractTimeRange(nlpResult: NLPResult, context: IntentContext): string {
    const dateEntities = nlpResult.entities.filter(e => e.type === 'date');
    
    if (dateEntities.length > 0) {
      return dateEntities[0].value.toLowerCase();
    }

    // Default to today based on context
    return context.timeOfDay === 'evening' ? 'tomorrow' : 'today';
  }

  /**
   * Generate schedule response
   */
  private generateScheduleResponse(timeRange: string, context: IntentContext): string {
    return `Here's your schedule for ${timeRange}:`;
  }

  /**
   * Try to identify a specific task from context
   */
  private identifyTaskFromContext(nlpResult: NLPResult, context: IntentContext): string | null {
    // Look for task titles in the recent messages or current tasks
    const recentTaskIds = context.recentMessages
      .filter(msg => msg.metadata?.taskIds?.length > 0)
      .flatMap(msg => msg.metadata.taskIds);

    if (recentTaskIds.length > 0) {
      return recentTaskIds[0]; // Return the most recent task mentioned
    }

    return null;
  }

  /**
   * Extract update data from NLP result
   */
  private extractUpdateData(nlpResult: NLPResult): any {
    const updates: any = {};

    // Extract new priority
    const priorityEntities = nlpResult.entities.filter(e => e.type === 'priority');
    if (priorityEntities.length > 0) {
      updates.priority = this.parsePriorityValue(priorityEntities[0].value);
    }

    // Extract new deadline
    const dateEntities = nlpResult.entities.filter(e => e.type === 'date');
    if (dateEntities.length > 0) {
      updates.deadline = this.parseDate(dateEntities[0].value);
    }

    return updates;
  }

  /**
   * Get time-based greeting
   */
  private getTimeBasedGreeting(timeOfDay: string): string {
    const greetings = {
      morning: 'Good morning',
      afternoon: 'Good afternoon',
      evening: 'Good evening',
      night: 'Good evening'
    };

    return greetings[timeOfDay as keyof typeof greetings] || 'Hello';
  }

  /**
   * Get task summary for greeting
   */
  private getTaskSummary(tasks: ITask[]): { total: number; message: string } {
    const pending = tasks.filter(t => t.status === 'pending').length;
    const inProgress = tasks.filter(t => t.status === 'in-progress').length;
    const total = pending + inProgress;

    if (total === 0) {
      return { total: 0, message: "You're all caught up!" };
    }

    if (total === 1) {
      return { total: 1, message: "You have 1 task to work on." };
    }

    return { total, message: `You have ${total} tasks to work on.` };
  }

  /**
   * Analyze question for task-related content
   */
  private analyzeQuestion(text: string, context: IntentContext): { isTaskRelated: boolean; suggestedActions: IntentAction[] } {
    const taskKeywords = ['task', 'todo', 'schedule', 'deadline', 'priority', 'work', 'meeting', 'appointment'];
    const isTaskRelated = taskKeywords.some(keyword => text.includes(keyword));

    if (isTaskRelated) {
      return {
        isTaskRelated: true,
        suggestedActions: [{
          type: 'respond',
          response: "It sounds like you're asking about tasks. Would you like me to show your current tasks or help you create a new one?"
        }]
      };
    }

    return { isTaskRelated: false, suggestedActions: [] };
  }

  /**
   * Generate helpful suggestions
   */
  private generateSuggestions(context: IntentContext): string {
    const suggestions = [
      "You can ask me to 'create a task', 'show my tasks', or 'what's my schedule'.",
      "Try saying something like 'I need to call John tomorrow' or 'show me today's tasks'.",
      "I can help you create tasks, check your schedule, or update existing tasks."
    ];

    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  /**
   * Suggest priority based on context
   */
  private suggestPriority(taskData: Partial<ITask>, context: IntentContext): number {
    let priority = 5; // Default

    // Increase priority for morning tasks
    if (context.timeOfDay === 'morning') {
      priority += 1;
    }

    // Increase priority for tasks with deadlines
    if (taskData.deadline) {
      const daysUntilDeadline = Math.ceil(
        (taskData.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 1) priority += 3;
      else if (daysUntilDeadline <= 3) priority += 2;
      else if (daysUntilDeadline <= 7) priority += 1;
    }

    return Math.min(priority, 10);
  }

  /**
   * Generate contextual tags
   */
  private generateContextualTags(taskData: Partial<ITask>, context: IntentContext): string[] {
    const tags: string[] = [];

    // Add time-based tags
    if (context.timeOfDay === 'morning') tags.push('morning');
    if (context.dayOfWeek === 'weekend') tags.push('weekend');

    // Add urgency tags based on deadline
    if (taskData.deadline) {
      const daysUntilDeadline = Math.ceil(
        (taskData.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 1) tags.push('urgent');
      else if (daysUntilDeadline <= 3) tags.push('soon');
    }

    return tags;
  }

  /**
   * Helper methods for parsing
   */
  private parseDateFilter(dateText: string): string {
    return dateText.toLowerCase();
  }

  private parsePriorityFilter(priorityText: string): string {
    if (priorityText.includes('high') || priorityText.includes('urgent')) return 'high';
    if (priorityText.includes('low')) return 'low';
    return 'medium';
  }

  private parsePriorityValue(priorityText: string): number {
    const priorityMap: { [key: string]: number } = {
      'critical': 10,
      'urgent': 9,
      'high': 8,
      'important': 7,
      'medium': 5,
      'low': 3
    };

    for (const [key, value] of Object.entries(priorityMap)) {
      if (priorityText.includes(key)) return value;
    }

    return 5;
  }

  private parseDate(dateText: string): Date {
    const now = new Date();
    
    if (dateText.includes('today')) return now;
    if (dateText.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    
    return new Date(dateText);
  }
}

export default IntentService.getInstance(); 
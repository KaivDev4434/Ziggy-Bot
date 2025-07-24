import { NLPResult, IntentType } from './nlpService';
import { IntentAction } from './intentService';
import { ITask, IUser, Task, TaskStatus } from '../models';
import { logger } from '../config/logger';
import EntityService from './entityService';

export interface TaskGenerationResult {
  tasks: Partial<ITask>[];
  confidence: number;
  suggestions: string[];
  warnings: string[];
  metadata: {
    sourceText: string;
    entitiesUsed: number;
    enhancementsApplied: string[];
    processingTime: number;
  };
}

export interface TaskEnhancement {
  type: 'priority' | 'deadline' | 'duration' | 'tags' | 'context' | 'dependencies';
  value: any;
  confidence: number;
  reason: string;
}

export class TaskGenerationService {
  private static instance: TaskGenerationService;

  public static getInstance(): TaskGenerationService {
    if (!TaskGenerationService.instance) {
      TaskGenerationService.instance = new TaskGenerationService();
    }
    return TaskGenerationService.instance;
  }

  /**
   * Generate structured tasks from NLP results
   */
  public async generateTasks(
    nlpResult: NLPResult,
    user: IUser,
    context?: any
  ): Promise<TaskGenerationResult> {
    const startTime = Date.now();
    const enhancementsApplied: string[] = [];

    try {
      logger.info('Starting task generation', {
        userId: user._id,
        intent: nlpResult.intent,
        entitiesCount: nlpResult.entities.length
      });

      // Extract base tasks from NLP result
      const baseTasks = nlpResult.extractedTasks.length > 0 
        ? nlpResult.extractedTasks 
        : await this.extractTasksFromText(nlpResult, user);

      if (baseTasks.length === 0) {
        return this.createEmptyResult(nlpResult, startTime);
      }

      // Enhance each task with intelligent processing
      const enhancedTasks: Partial<ITask>[] = [];
      const suggestions: string[] = [];
      const warnings: string[] = [];

      for (const baseTask of baseTasks) {
        const enhanced = await this.enhanceTask(
          baseTask,
          nlpResult,
          user,
          context,
          enhancementsApplied
        );
        
        enhancedTasks.push(enhanced.task);
        suggestions.push(...enhanced.suggestions);
        warnings.push(...enhanced.warnings);
      }

      // Apply cross-task intelligence
      const finalTasks = await this.applyCrossTaskIntelligence(enhancedTasks, user);

      // Calculate overall confidence
      const confidence = this.calculateGenerationConfidence(finalTasks, nlpResult);

      const result: TaskGenerationResult = {
        tasks: finalTasks,
        confidence,
        suggestions,
        warnings,
        metadata: {
          sourceText: nlpResult.metadata.originalText,
          entitiesUsed: nlpResult.entities.length,
          enhancementsApplied,
          processingTime: Date.now() - startTime
        }
      };

      logger.info('Task generation completed', {
        userId: user._id,
        tasksGenerated: finalTasks.length,
        confidence,
        enhancementsApplied: enhancementsApplied.length
      });

      return result;

    } catch (error) {
      logger.error('Task generation error:', error);
      return this.createErrorResult(nlpResult, startTime);
    }
  }

  /**
   * Extract tasks from text when not already extracted by NLP
   */
  private async extractTasksFromText(
    nlpResult: NLPResult,
    user: IUser
  ): Promise<Partial<ITask>[]> {
    // If intent suggests task creation but no tasks were extracted
    if (nlpResult.intent === IntentType.CREATE_TASK || 
        nlpResult.intent === IntentType.SET_REMINDER) {
      
      // Try to create a basic task from the processed text
      const title = this.extractTitleFromText(nlpResult.processedText);
      
      if (title && title.length >= 3) {
        return [{
          title,
          description: nlpResult.metadata.originalText,
          userId: user._id,
          priority: 5,
          estimatedTime: 30,
          status: 'pending' as TaskStatus
        }];
      }
    }

    return [];
  }

  /**
   * Extract a meaningful title from processed text
   */
  private extractTitleFromText(text: string): string {
    // Remove common prefixes and clean up
    let title = text
      .replace(/^(create|add|new|make|do|need to|have to|should|must)\s+/i, '')
      .replace(/^(a|an|the)\s+/i, '')
      .trim();

    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Limit length
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title;
  }

  /**
   * Enhance a single task with intelligent processing
   */
  private async enhanceTask(
    baseTask: Partial<ITask>,
    nlpResult: NLPResult,
    user: IUser,
    context: any,
    enhancementsApplied: string[]
  ): Promise<{
    task: Partial<ITask>;
    suggestions: string[];
    warnings: string[];
  }> {
    const enhanced = { ...baseTask };
    const suggestions: string[] = [];
    const warnings: string[] = [];

    // Enhance with entity data
    await this.enhanceWithEntities(enhanced, nlpResult.entities, enhancementsApplied);

    // Enhance with user patterns
    await this.enhanceWithUserPatterns(enhanced, user, enhancementsApplied);

    // Enhance with context awareness
    await this.enhanceWithContext(enhanced, context, enhancementsApplied);

    // Enhance with intelligent defaults
    await this.enhanceWithDefaults(enhanced, nlpResult, enhancementsApplied);

    // Generate suggestions and warnings
    this.generateTaskSuggestions(enhanced, suggestions, warnings);

    return { task: enhanced, suggestions, warnings };
  }

  /**
   * Enhance task with extracted entities
   */
  private async enhanceWithEntities(
    task: Partial<ITask>,
    entities: any[],
    enhancementsApplied: string[]
  ): Promise<void> {
         const entityService = EntityService;

    // Process date entities
    const dateEntities = entities.filter(e => e.type === 'date');
    const timeEntities = entities.filter(e => e.type === 'time');
    
    if (dateEntities.length > 0 && !task.deadline) {
      const dateEntity = dateEntities[0];
      const timeEntity = timeEntities.length > 0 ? timeEntities[0] : undefined;
      
      const deadline = entityService.parseDateTime(dateEntity, timeEntity);
      if (deadline) {
        task.deadline = deadline;
        enhancementsApplied.push('deadline_from_entities');
      }
    }

    // Process priority entities
    const priorityEntities = entities.filter(e => e.type === 'priority');
    if (priorityEntities.length > 0 && !task.priority) {
      task.priority = entityService.parsePriority(priorityEntities[0]);
      enhancementsApplied.push('priority_from_entities');
    }

    // Process duration entities
    const durationEntities = entities.filter(e => e.type === 'duration');
    if (durationEntities.length > 0 && !task.estimatedTime) {
      task.estimatedTime = entityService.parseDuration(durationEntities[0]);
      enhancementsApplied.push('duration_from_entities');
    }

    // Process context entities
    const contextEntities = entities.filter(e => e.type === 'context');
    if (contextEntities.length > 0) {
      const contextInfo = contextEntities.map(e => e.value).join(' | ');
      task.context = task.context ? `${task.context} | ${contextInfo}` : contextInfo;
      enhancementsApplied.push('context_from_entities');
    }

    // Process person entities
    const personEntities = entities.filter(e => e.type === 'person');
    if (personEntities.length > 0) {
      const people = personEntities.map(e => e.value);
      task.tags = [...(task.tags || []), ...people.map(p => `person:${p}`)];
      enhancementsApplied.push('people_from_entities');
    }
  }

  /**
   * Enhance task with user behavior patterns
   */
  private async enhanceWithUserPatterns(
    task: Partial<ITask>,
    user: IUser,
    enhancementsApplied: string[]
  ): Promise<void> {
    // Apply user's default settings
    if (!task.estimatedTime && user.preferences?.defaultTaskDuration) {
      task.estimatedTime = user.preferences.defaultTaskDuration;
      enhancementsApplied.push('duration_from_user_preferences');
    }

    // Apply intelligent priority based on user's typical patterns
    if (!task.priority) {
      task.priority = this.suggestPriorityFromUserPatterns(task, user);
      enhancementsApplied.push('priority_from_user_patterns');
    }

    // Add user's common tags based on task content
    const suggestedTags = this.suggestTagsFromUserPatterns(task, user);
    if (suggestedTags.length > 0) {
      task.tags = [...(task.tags || []), ...suggestedTags];
      enhancementsApplied.push('tags_from_user_patterns');
    }
  }

  /**
   * Enhance task with contextual awareness
   */
  private async enhanceWithContext(
    task: Partial<ITask>,
    context: any,
    enhancementsApplied: string[]
  ): Promise<void> {
    if (!context) return;

    // Time-based enhancements
    const now = new Date();
    const hour = now.getHours();
    
    // Adjust priority based on time of day
    if (!task.priority) {
      if (hour >= 9 && hour <= 17) { // Business hours
        task.priority = (task.priority || 5) + 1;
        enhancementsApplied.push('priority_business_hours');
      }
    }

    // Add time-based tags
    const timeTags = this.generateTimeBasedTags(now);
    task.tags = [...(task.tags || []), ...timeTags];
    enhancementsApplied.push('time_based_tags');

    // Deadline intelligence
    if (!task.deadline) {
      const suggestedDeadline = this.suggestDeadlineFromContext(task, context);
      if (suggestedDeadline) {
        task.deadline = suggestedDeadline;
        enhancementsApplied.push('deadline_from_context');
      }
    }
  }

  /**
   * Enhance task with intelligent defaults
   */
  private async enhanceWithDefaults(
    task: Partial<ITask>,
    nlpResult: NLPResult,
    enhancementsApplied: string[]
  ): Promise<void> {
    // Ensure required fields have values
    if (!task.priority) {
      task.priority = 5;
      enhancementsApplied.push('default_priority');
    } else {
      // Ensure priority is within valid range
      task.priority = Math.min(10, Math.max(1, task.priority));
    }

    if (!task.estimatedTime) {
      task.estimatedTime = this.estimateTimeFromTitle(task.title || '');
      enhancementsApplied.push('estimated_time_from_title');
    }

    if (!task.status) {
      task.status = 'pending' as TaskStatus;
      enhancementsApplied.push('default_status');
    }

    if (!task.context) {
      task.context = `Generated from: "${nlpResult.metadata.originalText}"`;
      enhancementsApplied.push('default_context');
    }

    // Ensure tags array exists
    if (!task.tags) {
      task.tags = [];
      enhancementsApplied.push('default_tags_array');
    }

    // Add generation metadata tag
    task.tags.push('nlp-generated');

    // Ensure deadline is in the future if set
    if (task.deadline && task.deadline <= new Date()) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(17, 0, 0, 0);
      task.deadline = tomorrow;
      enhancementsApplied.push('deadline_adjusted_to_future');
    }
  }

  /**
   * Apply intelligence across multiple tasks
   */
  private async applyCrossTaskIntelligence(
    tasks: Partial<ITask>[],
    user: IUser
  ): Promise<Partial<ITask>[]> {
    if (tasks.length <= 1) return tasks;

    // Detect and handle task sequences
    this.detectTaskSequences(tasks);

    // Balance priorities across tasks
    this.balanceTaskPriorities(tasks);

    // Optimize deadlines to prevent conflicts
    this.optimizeDeadlines(tasks);

    return tasks;
  }

  /**
   * Detect if tasks form a sequence or project
   */
  private detectTaskSequences(tasks: Partial<ITask>[]): void {
    // Look for sequential keywords in titles
    const sequenceKeywords = ['first', 'then', 'next', 'finally', 'after', 'before'];
    
    tasks.forEach((task, index) => {
      const title = task.title?.toLowerCase() || '';
      
      if (sequenceKeywords.some(keyword => title.includes(keyword))) {
        // Add sequence metadata
        task.tags = [...(task.tags || []), `sequence:${index + 1}`];
        
        // Adjust priorities to reflect sequence
        task.priority = Math.max((task.priority || 5) + (tasks.length - index), 1);
      }
    });
  }

  /**
   * Balance priorities to prevent all tasks having the same priority
   */
  private balanceTaskPriorities(tasks: Partial<ITask>[]): void {
    const priorities = tasks.map(t => t.priority || 5);
    const avgPriority = priorities.reduce((sum, p) => sum + p, 0) / priorities.length;

    // If all priorities are too similar, create some variation
    if (Math.max(...priorities) - Math.min(...priorities) <= 1) {
      tasks.forEach((task, index) => {
        if (index === 0) {
          task.priority = Math.min((task.priority || 5) + 1, 10);
        } else if (index === tasks.length - 1) {
          task.priority = Math.max((task.priority || 5) - 1, 1);
        }
      });
    }
  }

  /**
   * Optimize deadlines to prevent unrealistic clustering
   */
  private optimizeDeadlines(tasks: Partial<ITask>[]): void {
    const tasksWithDeadlines = tasks.filter(t => t.deadline);
    
    if (tasksWithDeadlines.length > 1) {
      // Sort by deadline
      tasksWithDeadlines.sort((a, b) => 
        (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0)
      );

      // Ensure minimum spacing between deadlines
      for (let i = 1; i < tasksWithDeadlines.length; i++) {
        const prevDeadline = tasksWithDeadlines[i - 1].deadline!;
        const currentDeadline = tasksWithDeadlines[i].deadline!;
        
        const timeDiff = currentDeadline.getTime() - prevDeadline.getTime();
        const minSpacing = 2 * 60 * 60 * 1000; // 2 hours minimum
        
        if (timeDiff < minSpacing) {
          currentDeadline.setTime(prevDeadline.getTime() + minSpacing);
        }
      }
    }
  }

  /**
   * Generate task-specific suggestions and warnings
   */
  private generateTaskSuggestions(
    task: Partial<ITask>,
    suggestions: string[],
    warnings: string[]
  ): void {
    // Check for potential issues
    if (task.deadline && task.deadline < new Date()) {
      warnings.push(`The deadline for "${task.title}" is in the past.`);
    }

    if ((task.priority || 0) >= 9 && !task.deadline) {
      suggestions.push(`Consider setting a deadline for the high-priority task "${task.title}".`);
    }

    if ((task.estimatedTime || 0) > 480) { // More than 8 hours
      suggestions.push(`The task "${task.title}" seems very long. Consider breaking it into smaller tasks.`);
    }

    // Suggest related actions
    const title = task.title?.toLowerCase() || '';
    if (title.includes('call') || title.includes('phone')) {
      suggestions.push('Consider adding contact information or phone number to the task description.');
    }

    if (title.includes('meeting') || title.includes('meet')) {
      suggestions.push('Remember to send calendar invites and prepare an agenda.');
    }
  }

  /**
   * Helper methods for intelligent enhancement
   */
  private suggestPriorityFromUserPatterns(task: Partial<ITask>, user: IUser): number {
    // Default logic - can be enhanced with actual user pattern analysis
    const title = task.title?.toLowerCase() || '';
    
    if (title.includes('urgent') || title.includes('asap')) return 9;
    if (title.includes('important') || title.includes('critical')) return 8;
    if (title.includes('quick') || title.includes('simple')) return 4;
    
    return 5; // Default medium priority
  }

  private suggestTagsFromUserPatterns(task: Partial<ITask>, user: IUser): string[] {
    const tags: string[] = [];
    const title = task.title?.toLowerCase() || '';
    
    // Add common tags based on content
    if (title.includes('work') || title.includes('office')) tags.push('work');
    if (title.includes('personal') || title.includes('home')) tags.push('personal');
    if (title.includes('call') || title.includes('phone')) tags.push('communication');
    if (title.includes('buy') || title.includes('purchase')) tags.push('shopping');
    if (title.includes('read') || title.includes('study')) tags.push('learning');
    
    return tags;
  }

  private generateTimeBasedTags(date: Date): string[] {
    const tags: string[] = [];
    const hour = date.getHours();
    const day = date.getDay();
    
    if (hour >= 6 && hour < 12) tags.push('morning');
    else if (hour >= 12 && hour < 17) tags.push('afternoon');
    else if (hour >= 17 && hour < 22) tags.push('evening');
    
    if (day === 0 || day === 6) tags.push('weekend');
    else tags.push('weekday');
    
    return tags;
  }

  private suggestDeadlineFromContext(task: Partial<ITask>, context: any): Date | null {
    // If no explicit deadline mentioned, suggest based on priority
    const priority = task.priority || 5;
    const now = new Date();
    
    if (priority >= 8) {
      // High priority - suggest end of today
      const deadline = new Date(now);
      deadline.setHours(18, 0, 0, 0);
      return deadline;
    } else if (priority >= 6) {
      // Medium-high priority - suggest tomorrow
      const deadline = new Date(now);
      deadline.setDate(deadline.getDate() + 1);
      deadline.setHours(17, 0, 0, 0);
      return deadline;
    }
    
    return null;
  }

  private estimateTimeFromTitle(title: string): number {
    const lowerTitle = title.toLowerCase();
    
    // Quick tasks
    if (lowerTitle.includes('quick') || lowerTitle.includes('brief') || 
        lowerTitle.includes('call') || lowerTitle.includes('email')) {
      return 15;
    }
    
    // Long tasks
    if (lowerTitle.includes('write') || lowerTitle.includes('prepare') || 
        lowerTitle.includes('plan') || lowerTitle.includes('research')) {
      return 60;
    }
    
    // Very long tasks
    if (lowerTitle.includes('project') || lowerTitle.includes('develop') || 
        lowerTitle.includes('create')) {
      return 120;
    }
    
    return 30; // Default
  }

  /**
   * Calculate confidence score for task generation
   */
  private calculateGenerationConfidence(
    tasks: Partial<ITask>[],
    nlpResult: NLPResult
  ): number {
    if (tasks.length === 0) return 0;

    let totalConfidence = 0;
    let factorCount = 0;

    // Base confidence from NLP processing
    totalConfidence += nlpResult.confidence;
    factorCount++;

    // Confidence from task completeness
    tasks.forEach(task => {
      let taskCompleteness = 0;
      let taskFactors = 0;

      if (task.title && task.title.length > 3) { taskCompleteness++; taskFactors++; }
      if (task.priority) { taskCompleteness++; taskFactors++; }
      if (task.deadline) { taskCompleteness++; taskFactors++; }
      if (task.estimatedTime) { taskCompleteness++; taskFactors++; }
      if (task.context) { taskCompleteness++; taskFactors++; }

      if (taskFactors > 0) {
        totalConfidence += (taskCompleteness / taskFactors);
        factorCount++;
      }
    });

    return factorCount > 0 ? totalConfidence / factorCount : 0;
  }

  /**
   * Helper methods for error handling
   */
  private createEmptyResult(nlpResult: NLPResult, startTime: number): TaskGenerationResult {
    return {
      tasks: [],
      confidence: 0,
      suggestions: ['Could you provide more details about the task you\'d like to create?'],
      warnings: [],
      metadata: {
        sourceText: nlpResult.metadata.originalText,
        entitiesUsed: 0,
        enhancementsApplied: [],
        processingTime: Date.now() - startTime
      }
    };
  }

  private createErrorResult(nlpResult: NLPResult, startTime: number): TaskGenerationResult {
    return {
      tasks: [],
      confidence: 0,
      suggestions: [],
      warnings: ['An error occurred while processing your request.'],
      metadata: {
        sourceText: nlpResult.metadata.originalText,
        entitiesUsed: 0,
        enhancementsApplied: [],
        processingTime: Date.now() - startTime
      }
    };
  }
}

export default TaskGenerationService.getInstance(); 
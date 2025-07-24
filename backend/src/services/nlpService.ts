import { logger } from '../config/logger';
import { ITask, IUser } from '../models';

// Intent types the system can recognize
export enum IntentType {
  CREATE_TASK = 'create_task',
  UPDATE_TASK = 'update_task',
  DELETE_TASK = 'delete_task',
  LIST_TASKS = 'list_tasks',
  GET_SCHEDULE = 'get_schedule',
  SET_REMINDER = 'set_reminder',
  ASK_STATUS = 'ask_status',
  GENERAL_QUESTION = 'general_question',
  GREETING = 'greeting',
  UNKNOWN = 'unknown'
}

// Entity types that can be extracted
export interface ExtractedEntity {
  type: 'task_title' | 'date' | 'time' | 'priority' | 'duration' | 'tag' | 'context' | 'person';
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
}

// NLP Processing result
export interface NLPResult {
  intent: IntentType;
  confidence: number;
  entities: ExtractedEntity[];
  extractedTasks: Partial<ITask>[];
  processedText: string;
  metadata: {
    originalText: string;
    processingTime: number;
    model: string;
    language: string;
  };
}

// Task creation parameters extracted from NLP
export interface ExtractedTaskData {
  title: string;
  description?: string;
  priority?: number;
  deadline?: Date;
  estimatedTime?: number;
  tags?: string[];
  context?: string;
  confidence: number;
}

export class NLPService {
  private static instance: NLPService;

  // Intent recognition patterns
  private intentPatterns = {
    [IntentType.CREATE_TASK]: [
      /create.*task/i,
      /add.*task/i,
      /new.*task/i,
      /i need to/i,
      /i have to/i,
      /i should/i,
      /remind me to/i,
      /schedule/i,
      /plan to/i,
      /todo/i,
      /need to do/i
    ],
    [IntentType.UPDATE_TASK]: [
      /update.*task/i,
      /change.*task/i,
      /modify.*task/i,
      /edit.*task/i,
      /reschedule/i
    ],
    [IntentType.DELETE_TASK]: [
      /delete.*task/i,
      /remove.*task/i,
      /cancel.*task/i,
      /complete.*task/i,
      /done with/i,
      /finished/i
    ],
    [IntentType.LIST_TASKS]: [
      /what.*tasks/i,
      /show.*tasks/i,
      /list.*tasks/i,
      /my tasks/i,
      /what do i have/i,
      /what's on my/i,
      /schedule/i
    ],
    [IntentType.GET_SCHEDULE]: [
      /what.*schedule/i,
      /when.*free/i,
      /what.*today/i,
      /what.*tomorrow/i,
      /calendar/i,
      /agenda/i
    ],
    [IntentType.SET_REMINDER]: [
      /remind me/i,
      /reminder/i,
      /alert me/i,
      /notification/i
    ],
    [IntentType.ASK_STATUS]: [
      /status/i,
      /progress/i,
      /how.*going/i,
      /update on/i
    ],
    [IntentType.GREETING]: [
      /hello/i,
      /hi/i,
      /hey/i,
      /good morning/i,
      /good afternoon/i,
      /good evening/i,
      /thanks/i,
      /thank you/i
    ]
  };

  // Entity extraction patterns
  private entityPatterns = {
    date: [
      /today/i,
      /tomorrow/i,
      /next week/i,
      /next month/i,
      /monday|tuesday|wednesday|thursday|friday|saturday|sunday/i,
      /\d{1,2}\/\d{1,2}\/?\d{0,4}/,
      /\d{1,2}-\d{1,2}-?\d{0,4}/,
      /jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?/i
    ],
    time: [
      /\d{1,2}:\d{2}\s?(?:am|pm)?/i,
      /\d{1,2}\s?(?:am|pm)/i,
      /morning/i,
      /afternoon/i,
      /evening/i,
      /night/i
    ],
    priority: [
      /urgent/i,
      /important/i,
      /critical/i,
      /high priority/i,
      /low priority/i,
      /asap/i,
      /immediately/i
    ],
    duration: [
      /\d+\s?(?:hours?|hrs?|h)/i,
      /\d+\s?(?:minutes?|mins?|m)/i,
      /\d+\s?(?:days?|d)/i,
      /quick/i,
      /short/i,
      /long/i,
      /brief/i
    ]
  };

  // Priority mapping
  private priorityMapping = {
    'critical': 10,
    'urgent': 9,
    'high priority': 8,
    'important': 7,
    'asap': 9,
    'immediately': 10,
    'low priority': 3,
    'quick': 6,
    'short': 5,
    'brief': 4
  };

  public static getInstance(): NLPService {
    if (!NLPService.instance) {
      NLPService.instance = new NLPService();
    }
    return NLPService.instance;
  }

  /**
   * Main NLP processing function
   */
  public async processMessage(
    text: string, 
    user: IUser, 
    context?: any
  ): Promise<NLPResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Processing NLP message', { 
        userId: user._id, 
        textLength: text.length 
      });

      // Clean and preprocess text
      const processedText = this.preprocessText(text);

      // Recognize intent
      const intent = this.recognizeIntent(processedText);

      // Extract entities
      const entities = this.extractEntities(processedText);

      // Extract tasks if intent is task-related
      const extractedTasks = this.extractTasks(processedText, intent, entities, user);

      const processingTime = Date.now() - startTime;

      const result: NLPResult = {
        intent: intent.type,
        confidence: intent.confidence,
        entities,
        extractedTasks,
        processedText,
        metadata: {
          originalText: text,
          processingTime,
          model: 'rule-based-v1',
          language: 'en'
        }
      };

      logger.info('NLP processing completed', {
        userId: user._id,
        intent: intent.type,
        confidence: intent.confidence,
        entitiesFound: entities.length,
        tasksExtracted: extractedTasks.length,
        processingTime
      });

      return result;

    } catch (error) {
      logger.error('NLP processing error:', error);
      
      // Return fallback result
      return {
        intent: IntentType.UNKNOWN,
        confidence: 0,
        entities: [],
        extractedTasks: [],
        processedText: text,
        metadata: {
          originalText: text,
          processingTime: Date.now() - startTime,
          model: 'fallback',
          language: 'en'
        }
      };
    }
  }

  /**
   * Preprocess text for better analysis
   */
  private preprocessText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s\d:\/\-]/g, ' ') // Keep only words, spaces, numbers, and date/time chars
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  /**
   * Recognize user intent from text
   */
  private recognizeIntent(text: string): { type: IntentType; confidence: number } {
    let bestMatch = { type: IntentType.UNKNOWN, confidence: 0 };

    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          const confidence = this.calculatePatternConfidence(text, pattern);
          if (confidence > bestMatch.confidence) {
            bestMatch = { type: intent as IntentType, confidence };
          }
        }
      }
    }

    // If no pattern matches but text seems like a task, default to CREATE_TASK
    if (bestMatch.confidence === 0 && this.looksLikeTask(text)) {
      bestMatch = { type: IntentType.CREATE_TASK, confidence: 0.6 };
    }

    return bestMatch;
  }

  /**
   * Check if text looks like a task description
   */
  private looksLikeTask(text: string): boolean {
    const taskIndicators = [
      /\b(call|email|write|send|buy|get|pick up|drop off|finish|complete|review|check|update|create|make|do|go to|visit|meet)\b/i,
      /\b(project|meeting|appointment|deadline|report|document|file|presentation)\b/i,
      /\b(today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday)\b/i
    ];

    return taskIndicators.some(pattern => pattern.test(text)) && text.length > 10;
  }

  /**
   * Calculate confidence score for pattern match
   */
  private calculatePatternConfidence(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    if (!match) return 0;

    // Base confidence
    let confidence = 0.7;

    // Boost confidence if match is near the beginning
    if (match.index !== undefined && match.index < text.length * 0.3) {
      confidence += 0.2;
    }

    // Boost confidence for longer matches
    if (match[0].length > 5) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract different types of entities
    entities.push(...this.extractEntityType(text, 'date'));
    entities.push(...this.extractEntityType(text, 'time'));
    entities.push(...this.extractEntityType(text, 'priority'));
    entities.push(...this.extractEntityType(text, 'duration'));

    return entities.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Extract specific entity type
   */
  private extractEntityType(text: string, entityType: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const patterns = this.entityPatterns[entityType as keyof typeof this.entityPatterns] || [];

    for (const pattern of patterns) {
      const matches = [...text.matchAll(new RegExp(pattern, 'gi'))];
      
      for (const match of matches) {
        if (match.index !== undefined) {
          entities.push({
            type: entityType as any,
            value: match[0],
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      }
    }

    return entities;
  }

  /**
   * Extract tasks from text based on intent and entities
   */
  private extractTasks(
    text: string, 
    intent: { type: IntentType; confidence: number }, 
    entities: ExtractedEntity[],
    user: IUser
  ): Partial<ITask>[] {
    if (intent.type !== IntentType.CREATE_TASK && intent.type !== IntentType.SET_REMINDER) {
      return [];
    }

    const taskData = this.extractTaskData(text, entities, user);
    if (taskData) {
      return [taskData];
    }

    return [];
  }

  /**
   * Extract structured task data from text and entities
   */
  private extractTaskData(
    text: string, 
    entities: ExtractedEntity[],
    user: IUser
  ): Partial<ITask> | null {
    try {
      // Extract title (remove common prefixes and entity text)
      let title = this.extractTaskTitle(text, entities);
      if (!title || title.length < 3) {
        return null;
      }

      // Extract other task properties
      const deadline = this.extractDeadline(entities, text);
      const priority = this.extractPriority(entities, text);
      const estimatedTime = this.extractDuration(entities);
      const tags = this.extractTags(text);
      const context = this.extractContext(text, entities);

      const taskData: Partial<ITask> = {
        title: title.trim(),
        description: text.length > title.length + 10 ? text : undefined,
        priority: Math.min(10, Math.max(1, priority || 5)), // Ensure priority is between 1-10
        deadline,
        estimatedTime: estimatedTime || user.preferences?.defaultTaskDuration || 30,
        tags,
        context: context || 'Extracted from conversation',
        userId: user._id
      };

      logger.info('Extracted task data', {
        title: taskData.title,
        priority: taskData.priority,
        deadline: taskData.deadline,
        estimatedTime: taskData.estimatedTime
      });

      return taskData;

    } catch (error) {
      logger.error('Task extraction error:', error);
      return null;
    }
  }

  /**
   * Extract task title from text
   */
  private extractTaskTitle(text: string, entities: ExtractedEntity[]): string {
    let title = text;

    // Remove common prefixes
    const prefixes = [
      /^(i need to|i have to|i should|remind me to|create a task to|add a task to|schedule to|plan to|todo:?)\s+/i
    ];

    for (const prefix of prefixes) {
      title = title.replace(prefix, '');
    }

    // Remove entity text that's not part of the task title
    const nonTitleEntities = entities.filter(e => 
      e.type === 'date' || e.type === 'time' || e.type === 'priority'
    );

    for (const entity of nonTitleEntities) {
      title = title.replace(new RegExp(entity.value, 'gi'), '');
    }

    // Clean up the title
    title = title
      .replace(/\s+/g, ' ')
      .replace(/^(and|or|then|also|plus)\s+/i, '')
      .trim();

    return title;
  }

  /**
   * Extract deadline from entities and text
   */
  private extractDeadline(entities: ExtractedEntity[], text: string): Date | undefined {
    const dateEntities = entities.filter(e => e.type === 'date');
    const timeEntities = entities.filter(e => e.type === 'time');

    if (dateEntities.length === 0) return undefined;

    const dateText = dateEntities[0].value.toLowerCase();
    const timeText = timeEntities.length > 0 ? timeEntities[0].value : null;

    return this.parseDateTime(dateText, timeText);
  }

  /**
   * Parse date and time strings into Date object
   */
  private parseDateTime(dateText: string, timeText?: string | null): Date {
    const now = new Date();
    let targetDate = new Date();

    // Parse relative dates
    if (dateText.includes('today')) {
      targetDate = new Date(now);
    } else if (dateText.includes('tomorrow')) {
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (dateText.includes('next week')) {
      targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + 7);
    } else if (dateText.includes('next month')) {
      targetDate = new Date(now);
      targetDate.setMonth(targetDate.getMonth() + 1);
    } else if (dateText.includes('friday') || dateText.includes('by friday')) {
      // Handle "Friday" or "by Friday" - find next Friday
      targetDate = new Date(now);
      const daysUntilFriday = (5 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
    } else if (dateText.includes('monday')) {
      targetDate = new Date(now);
      const daysUntilMonday = (1 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
    } else if (dateText.includes('tuesday')) {
      targetDate = new Date(now);
      const daysUntilTuesday = (2 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilTuesday === 0 ? 7 : daysUntilTuesday));
    } else if (dateText.includes('wednesday')) {
      targetDate = new Date(now);
      const daysUntilWednesday = (3 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilWednesday === 0 ? 7 : daysUntilWednesday));
    } else if (dateText.includes('thursday')) {
      targetDate = new Date(now);
      const daysUntilThursday = (4 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
    } else if (dateText.includes('saturday')) {
      targetDate = new Date(now);
      const daysUntilSaturday = (6 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    } else if (dateText.includes('sunday')) {
      targetDate = new Date(now);
      const daysUntilSunday = (0 - targetDate.getDay() + 7) % 7;
      targetDate.setDate(targetDate.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    } else {
      // Try to parse absolute dates
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime()) && parsed > now) {
        targetDate = parsed;
      } else {
        // Default to tomorrow if parsing fails or date is in the past
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    // Set default time if no time specified (end of business day)
    if (!timeText) {
      targetDate.setHours(17, 0, 0, 0);
    } else {
      // Parse time if provided
      const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s?(am|pm)?/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hours !== 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;

        targetDate.setHours(hours, minutes, 0, 0);
      } else {
        // Default to 5 PM if time can't be parsed
        targetDate.setHours(17, 0, 0, 0);
      }
    }

    // Ensure the date is in the future
    if (targetDate <= now) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    return targetDate;
  }

  /**
   * Extract priority level from entities and text
   */
  private extractPriority(entities: ExtractedEntity[], text: string): number | undefined {
    const priorityEntities = entities.filter(e => e.type === 'priority');
    
    if (priorityEntities.length === 0) return undefined;

    const priorityText = priorityEntities[0].value.toLowerCase();
    return this.priorityMapping[priorityText as keyof typeof this.priorityMapping];
  }

  /**
   * Extract duration/estimated time from entities
   */
  private extractDuration(entities: ExtractedEntity[]): number | undefined {
    const durationEntities = entities.filter(e => e.type === 'duration');
    
    if (durationEntities.length === 0) return undefined;

    const durationText = durationEntities[0].value.toLowerCase();
    
    // Parse duration patterns
    const hourMatch = durationText.match(/(\d+)\s*(?:hours?|hrs?|h)/);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;

    const minuteMatch = durationText.match(/(\d+)\s*(?:minutes?|mins?|m)/);
    if (minuteMatch) return parseInt(minuteMatch[1]);

    // Default mappings for qualitative durations
    const durationMappings = {
      'quick': 15,
      'short': 30,
      'brief': 20,
      'long': 120
    };

    return durationMappings[durationText as keyof typeof durationMappings];
  }

  /**
   * Extract tags from text
   */
  private extractTags(text: string): string[] {
    const tags: string[] = [];

    // Common tag patterns
    const tagPatterns = [
      /\b(work|business|personal|home|urgent|important|meeting|project|call|email|shopping|health|exercise|learning|study)\b/gi
    ];

    for (const pattern of tagPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        tags.push(...matches.map(m => m.toLowerCase()));
      }
    }

    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Extract context information
   */
  private extractContext(text: string, entities: ExtractedEntity[]): string {
    // Create context from the original text, focusing on the important parts
    const contextParts: string[] = [];

    // Add entity information to context
    const dateEntities = entities.filter(e => e.type === 'date');
    const timeEntities = entities.filter(e => e.type === 'time');
    const priorityEntities = entities.filter(e => e.type === 'priority');

    if (dateEntities.length > 0) {
      contextParts.push(`Scheduled for ${dateEntities[0].value}`);
    }

    if (timeEntities.length > 0) {
      contextParts.push(`Time: ${timeEntities[0].value}`);
    }

    if (priorityEntities.length > 0) {
      contextParts.push(`Priority: ${priorityEntities[0].value}`);
    }

    // Add any location or person mentions
    const locationMatch = text.match(/\b(at|in|on|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    if (locationMatch) {
      contextParts.push(`Location: ${locationMatch[2]}`);
    }

    return contextParts.length > 0 ? contextParts.join(' | ') : 'General task';
  }

  /**
   * Generate a natural language response based on NLP results
   */
  public generateResponse(nlpResult: NLPResult, user: IUser): string {
    const { intent, extractedTasks, entities } = nlpResult;

    switch (intent) {
      case IntentType.CREATE_TASK:
        if (extractedTasks.length > 0) {
          const task = extractedTasks[0];
          return `I'll create a task "${task.title}" for you${task.deadline ? ` with deadline ${task.deadline.toLocaleDateString()}` : ''}.`;
        }
        return "I understand you want to create a task. Could you provide more details about what you'd like to do?";

      case IntentType.LIST_TASKS:
        return "Let me show you your current tasks.";

      case IntentType.GET_SCHEDULE:
        return "Here's your schedule and upcoming tasks.";

      case IntentType.GREETING:
        return `Hello ${user.name}! How can I help you manage your tasks today?`;

      case IntentType.GENERAL_QUESTION:
        return "I'm here to help you manage your tasks and schedule. What would you like to do?";

      default:
        return "I understand you're trying to communicate with me. Could you please rephrase your request?";
    }
  }
}

export default NLPService.getInstance();
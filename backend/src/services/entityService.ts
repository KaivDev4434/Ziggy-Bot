import { ExtractedEntity } from './nlpService';
import { logger } from '../config/logger';

export interface EntityExtractionResult {
  entities: ExtractedEntity[];
  normalizedText: string;
  confidence: number;
  metadata: {
    entitiesFound: number;
    processingTime: number;
    patterns: string[];
  };
}

export interface DateTimeEntity {
  type: 'absolute' | 'relative' | 'recurring';
  date?: Date;
  time?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  confidence: number;
  originalText: string;
}

export interface TaskEntity {
  action: string;
  object: string;
  modifiers: string[];
  confidence: number;
  originalText: string;
}

export interface LocationEntity {
  name: string;
  type: 'address' | 'building' | 'room' | 'city' | 'general';
  coordinates?: { lat: number; lng: number };
  confidence: number;
  originalText: string;
}

export interface PersonEntity {
  name: string;
  role?: string;
  contact?: string;
  confidence: number;
  originalText: string;
}

export class EntityService {
  private static instance: EntityService;

  // Advanced entity patterns
  private advancedPatterns = {
    // Date patterns with more sophistication
    absoluteDate: [
      /(?:on\s+)?(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:\d{4})?/gi,
      /\d{1,2}[\/\-]\d{1,2}[\/\-](?:\d{4}|\d{2})/g,
      /\d{1,2}(?:st|nd|rd|th)\s+of\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)/gi
    ],
    
    relativeDate: [
      /(?:this|next|last)\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)/gi,
      /(?:in\s+)?(?:\d+\s+)?(?:days?|weeks?|months?|years?)(?:\s+from\s+now)?/gi,
      /(?:today|tomorrow|yesterday|tonight)/gi,
      /(?:this|next|last)\s+(?:week|month|year|weekend)/gi,
      /(?:in\s+)?(?:a\s+)?(?:few\s+)?(?:couple\s+of\s+)?(?:days?|weeks?|months?)/gi
    ],

    // Time patterns
    absoluteTime: [
      /\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)/g,
      /\d{1,2}(?::\d{2})?\s*(?:o'?clock)/g,
      /(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)/g
    ],

    relativeTime: [
      /(?:in\s+)?(?:\d+\s+)?(?:minutes?|hours?|mins?|hrs?)/gi,
      /(?:early\s+)?(?:morning|afternoon|evening|night|dawn|dusk|noon|midnight)/gi,
      /(?:before|after)\s+(?:lunch|dinner|breakfast|work|meeting)/gi
    ],

    // Priority and urgency patterns
    priority: [
      /\b(?:critical|urgent|emergency|asap|immediately|right\s+now)\b/gi,
      /\b(?:high|top)\s+priority\b/gi,
      /\b(?:important|significant|crucial|vital)\b/gi,
      /\b(?:low|lower)\s+priority\b/gi,
      /\b(?:when\s+(?:you\s+)?(?:can|have\s+time))\b/gi,
      /\b(?:optional|nice\s+to\s+have|if\s+possible)\b/gi
    ],

    // Duration patterns
    duration: [
      /(?:takes?|will\s+take|requires?|needs?)\s+(?:about\s+|around\s+|approximately\s+)?\d+\s*(?:hours?|hrs?|h)/gi,
      /(?:takes?|will\s+take|requires?|needs?)\s+(?:about\s+|around\s+|approximately\s+)?\d+\s*(?:minutes?|mins?|m)/gi,
      /(?:quick|fast|brief|short)\s+(?:task|meeting|call)/gi,
      /(?:long|extended|lengthy)\s+(?:task|meeting|session)/gi,
      /(?:all\s+day|full\s+day|entire\s+day)/gi,
      /(?:half\s+(?:an\s+)?hour|30\s+(?:minutes?|mins?))/gi
    ],

    // Action patterns
    actions: [
      /\b(?:call|phone|ring|contact)\b/gi,
      /\b(?:email|send|message|write\s+to)\b/gi,
      /\b(?:meet|meeting|meetup|get\s+together)\b/gi,
      /\b(?:buy|purchase|order|get|pick\s+up)\b/gi,
      /\b(?:review|check|examine|look\s+at|go\s+through)\b/gi,
      /\b(?:finish|complete|wrap\s+up|finalize)\b/gi,
      /\b(?:prepare|get\s+ready|set\s+up|organize)\b/gi,
      /\b(?:research|investigate|look\s+into|find\s+out)\b/gi,
      /\b(?:schedule|plan|arrange|book)\b/gi,
      /\b(?:update|modify|change|edit|revise)\b/gi
    ],

    // Location patterns
    locations: [
      /\b(?:at|in|on|near|by)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+(?:office|building|store|center|mall|hospital|school|university|library|bank|restaurant|cafe|gym|park|home))\b/gi,
      /\b(?:room|office|floor)\s+\d+[A-Za-z]?\b/gi,
      /\b\d+\s+[A-Z][a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|blvd|boulevard)\b/gi,
      /\b(?:downtown|uptown|online|remote|virtual)\b/gi
    ],

    // Person patterns
    people: [
      /\b(?:with|from|to|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
      /\b(?:contact|call|email|meet|see)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g,
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:said|mentioned|asked|requested)\b/g,
      /\b(?:from\s+)?(?:dr|doctor|prof|professor|mr|mrs|ms)\s+([A-Z][a-z]+)\b/gi
    ],

    // Context patterns
    context: [
      /\b(?:for|about|regarding|concerning)\s+([a-zA-Z\s]+)(?:project|meeting|client|work|task)\b/gi,
      /\b(?:work|business|personal|family|health|education|financial)\b/gi,
      /\b(?:project|client|team|department|company)\s+([A-Z][a-zA-Z\s]+)\b/gi
    ],

    // Recurring patterns
    recurring: [
      /\b(?:every|each)\s+(?:day|morning|evening|week|month|year|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(?:daily|weekly|monthly|yearly|annually)\b/gi,
      /\b(?:recurring|repeating|ongoing|regular)\b/gi
    ]
  };

  // Priority level mappings
  private priorityLevels = {
    'critical': 10,
    'emergency': 10,
    'urgent': 9,
    'asap': 9,
    'immediately': 9,
    'right now': 9,
    'high priority': 8,
    'top priority': 8,
    'important': 7,
    'significant': 7,
    'crucial': 8,
    'vital': 8,
    'medium': 5,
    'normal': 5,
    'low priority': 3,
    'lower priority': 2,
    'when you can': 2,
    'optional': 1,
    'nice to have': 2,
    'if possible': 2
  };

  // Duration mappings
  private durationMappings = {
    'quick': 15,
    'fast': 15,
    'brief': 20,
    'short': 30,
    'long': 120,
    'extended': 180,
    'lengthy': 240,
    'all day': 480,
    'full day': 480,
    'entire day': 480,
    'half hour': 30,
    '30 minutes': 30
  };

  public static getInstance(): EntityService {
    if (!EntityService.instance) {
      EntityService.instance = new EntityService();
    }
    return EntityService.instance;
  }

  /**
   * Advanced entity extraction with sophisticated parsing
   */
  public async extractEntities(text: string): Promise<EntityExtractionResult> {
    const startTime = Date.now();
    const entities: ExtractedEntity[] = [];
    const patternsUsed: string[] = [];

    try {
      logger.info('Starting advanced entity extraction', { textLength: text.length });

      // Extract different types of entities
      entities.push(...this.extractDateTimeEntities(text));
      entities.push(...this.extractPriorityEntities(text));
      entities.push(...this.extractDurationEntities(text));
      entities.push(...this.extractActionEntities(text));
      entities.push(...this.extractLocationEntities(text));
      entities.push(...this.extractPersonEntities(text));
      entities.push(...this.extractContextEntities(text));
      entities.push(...this.extractRecurringEntities(text));

      // Sort entities by position in text
      entities.sort((a, b) => a.startIndex - b.startIndex);

      // Remove overlapping entities (keep highest confidence)
      const cleanedEntities = this.removeOverlappingEntities(entities);

      // Normalize text by removing extracted entity text for better processing
      const normalizedText = this.normalizeText(text, cleanedEntities);

      // Calculate overall confidence
      const confidence = this.calculateOverallConfidence(cleanedEntities);

      const processingTime = Date.now() - startTime;

      logger.info('Entity extraction completed', {
        entitiesFound: cleanedEntities.length,
        processingTime,
        confidence
      });

      return {
        entities: cleanedEntities,
        normalizedText,
        confidence,
        metadata: {
          entitiesFound: cleanedEntities.length,
          processingTime,
          patterns: patternsUsed
        }
      };

    } catch (error) {
      logger.error('Entity extraction error:', error);
      return {
        entities: [],
        normalizedText: text,
        confidence: 0,
        metadata: {
          entitiesFound: 0,
          processingTime: Date.now() - startTime,
          patterns: []
        }
      };
    }
  }

  /**
   * Extract date and time entities
   */
  private extractDateTimeEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Extract absolute dates
    this.advancedPatterns.absoluteDate.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'date',
            value: match[0].trim(),
            confidence: 0.9,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    // Extract relative dates
    this.advancedPatterns.relativeDate.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'date',
            value: match[0].trim(),
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    // Extract time entities
    this.advancedPatterns.absoluteTime.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'time',
            value: match[0].trim(),
            confidence: 0.9,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    this.advancedPatterns.relativeTime.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'time',
            value: match[0].trim(),
            confidence: 0.7,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract priority entities
   */
  private extractPriorityEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.priority.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          const confidence = this.calculatePriorityConfidence(match[0]);
          entities.push({
            type: 'priority',
            value: match[0].trim(),
            confidence,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract duration entities
   */
  private extractDurationEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.duration.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'duration',
            value: match[0].trim(),
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract action entities
   */
  private extractActionEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.actions.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'task_title',
            value: match[0].trim(),
            confidence: 0.7,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract location entities
   */
  private extractLocationEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.locations.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'context',
            value: match[0].trim(),
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract person entities
   */
  private extractPersonEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.people.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined && match[1]) {
          entities.push({
            type: 'person',
            value: match[1].trim(),
            confidence: 0.7,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract context entities
   */
  private extractContextEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.context.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'context',
            value: match[0].trim(),
            confidence: 0.6,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Extract recurring pattern entities
   */
  private extractRecurringEntities(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    this.advancedPatterns.recurring.forEach(pattern => {
      const matches = [...text.matchAll(pattern)];
      matches.forEach(match => {
        if (match.index !== undefined) {
          entities.push({
            type: 'context',
            value: match[0].trim(),
            confidence: 0.8,
            startIndex: match.index,
            endIndex: match.index + match[0].length
          });
        }
      });
    });

    return entities;
  }

  /**
   * Remove overlapping entities, keeping the highest confidence ones
   */
  private removeOverlappingEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const cleaned: ExtractedEntity[] = [];

    entities.forEach(entity => {
      const hasOverlap = cleaned.some(existing => 
        this.doEntitiesOverlap(entity, existing)
      );

      if (!hasOverlap) {
        cleaned.push(entity);
      } else {
        // If there's overlap, keep the one with higher confidence
        const overlappingIndex = cleaned.findIndex(existing => 
          this.doEntitiesOverlap(entity, existing)
        );
        
        if (overlappingIndex !== -1 && entity.confidence > cleaned[overlappingIndex].confidence) {
          cleaned[overlappingIndex] = entity;
        }
      }
    });

    return cleaned;
  }

  /**
   * Check if two entities overlap
   */
  private doEntitiesOverlap(entity1: ExtractedEntity, entity2: ExtractedEntity): boolean {
    return !(entity1.endIndex <= entity2.startIndex || entity2.endIndex <= entity1.startIndex);
  }

  /**
   * Normalize text by removing entity content
   */
  private normalizeText(text: string, entities: ExtractedEntity[]): string {
    let normalized = text;

    // Sort entities by start index (descending) to remove from end to beginning
    const sortedEntities = [...entities].sort((a, b) => b.startIndex - a.startIndex);

    sortedEntities.forEach(entity => {
      // Replace entity text with a placeholder or remove it
      const before = normalized.substring(0, entity.startIndex);
      const after = normalized.substring(entity.endIndex);
      normalized = before + after;
    });

    // Clean up extra spaces
    return normalized.replace(/\s+/g, ' ').trim();
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(entities: ExtractedEntity[]): number {
    if (entities.length === 0) return 0;

    const totalConfidence = entities.reduce((sum, entity) => sum + entity.confidence, 0);
    return totalConfidence / entities.length;
  }

  /**
   * Calculate priority confidence based on keyword strength
   */
  private calculatePriorityConfidence(priorityText: string): number {
    const text = priorityText.toLowerCase();
    
    if (text.includes('critical') || text.includes('emergency')) return 0.95;
    if (text.includes('urgent') || text.includes('asap')) return 0.9;
    if (text.includes('important') || text.includes('high')) return 0.8;
    if (text.includes('low') || text.includes('optional')) return 0.85;
    
    return 0.7;
  }

  /**
   * Parse extracted date entity into actual Date object
   */
  public parseDateTime(dateEntity: ExtractedEntity, timeEntity?: ExtractedEntity): Date | null {
    try {
      const dateText = dateEntity.value.toLowerCase();
      const timeText = timeEntity?.value.toLowerCase();

      const now = new Date();
      let targetDate = new Date();

      // Handle relative dates
      if (dateText.includes('today')) {
        targetDate = new Date(now);
      } else if (dateText.includes('tomorrow')) {
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
      } else if (dateText.includes('yesterday')) {
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() - 1);
      } else if (dateText.includes('next week')) {
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 7);
      } else if (dateText.includes('next month')) {
        targetDate = new Date(now);
        targetDate.setMonth(targetDate.getMonth() + 1);
      } else {
        // Try to parse absolute dates
        const parsed = new Date(dateText);
        if (!isNaN(parsed.getTime())) {
          targetDate = parsed;
        }
      }

      // Handle time if provided
      if (timeText) {
        const timeMatch = timeText.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
          const ampm = timeMatch[3]?.toLowerCase();

          if (ampm === 'pm' && hours !== 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          targetDate.setHours(hours, minutes, 0, 0);
        }
      }

      return targetDate;

    } catch (error) {
      logger.error('Date parsing error:', error);
      return null;
    }
  }

  /**
   * Convert priority entity to numeric value
   */
  public parsePriority(priorityEntity: ExtractedEntity): number {
    const text = priorityEntity.value.toLowerCase();
    
    for (const [keyword, value] of Object.entries(this.priorityLevels)) {
      if (text.includes(keyword)) {
        return value;
      }
    }

    return 5; // Default medium priority
  }

  /**
   * Convert duration entity to minutes
   */
  public parseDuration(durationEntity: ExtractedEntity): number {
    const text = durationEntity.value.toLowerCase();

    // Try exact matches first
    for (const [keyword, value] of Object.entries(this.durationMappings)) {
      if (text.includes(keyword)) {
        return value;
      }
    }

    // Parse numeric durations
    const hourMatch = text.match(/(\d+)\s*(?:hours?|hrs?|h)/);
    if (hourMatch) return parseInt(hourMatch[1]) * 60;

    const minuteMatch = text.match(/(\d+)\s*(?:minutes?|mins?|m)/);
    if (minuteMatch) return parseInt(minuteMatch[1]);

    return 30; // Default 30 minutes
  }
}

export default EntityService.getInstance(); 
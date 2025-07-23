import { TaskPriority, TaskStatus, Task, DEFAULT_VALUES, TIME_CONSTANTS } from './';

/**
 * Calculate task priority based on deadline, context, and dependencies
 */
export function calculateTaskPriority(
  deadline?: Date,
  context?: string,
  dependencies: string[] = [],
  userWeights = { deadline: 0.4, context: 0.3, dependencies: 0.3 }
): number {
  let priority = DEFAULT_VALUES.TASK_PRIORITY;

  // Deadline weight calculation
  if (deadline) {
    const now = new Date();
    const timeToDeadline = deadline.getTime() - now.getTime();
    
    if (timeToDeadline < TIME_CONSTANTS.DAY) {
      priority += 3 * userWeights.deadline * 10; // Urgent
    } else if (timeToDeadline < TIME_CONSTANTS.DAY * 3) {
      priority += 2 * userWeights.deadline * 10; // High
    } else if (timeToDeadline < TIME_CONSTANTS.WEEK) {
      priority += 1 * userWeights.deadline * 10; // Medium
    }
  }

  // Context weight calculation (urgency keywords)
  if (context) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const lowercaseContext = context.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowercaseContext.includes(keyword))) {
      priority += 2 * userWeights.context * 10;
    }
  }

  // Dependencies weight calculation
  if (dependencies.length > 0) {
    priority += Math.min(dependencies.length, 3) * userWeights.dependencies * 10;
  }

  return Math.min(Math.max(Math.round(priority), 1), 10);
}

/**
 * Extract time information from natural language
 */
export function extractTimeFromText(text: string): Date | null {
  const timePatterns = [
    { pattern: /tomorrow/i, offset: TIME_CONSTANTS.DAY },
    { pattern: /today/i, offset: 0 },
    { pattern: /next week/i, offset: TIME_CONSTANTS.WEEK },
    { pattern: /(\d+)\s*days?/i, multiplier: TIME_CONSTANTS.DAY },
    { pattern: /(\d+)\s*hours?/i, multiplier: TIME_CONSTANTS.HOUR },
    { pattern: /(\d+)\s*minutes?/i, multiplier: TIME_CONSTANTS.MINUTE }
  ];

  const now = new Date();

  for (const { pattern, offset, multiplier } of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      if (offset !== undefined) {
        return new Date(now.getTime() + offset);
      } else if (multiplier && match[1]) {
        const amount = parseInt(match[1], 10);
        return new Date(now.getTime() + amount * multiplier);
      }
    }
  }

  return null;
}

/**
 * Extract priority from natural language
 */
export function extractPriorityFromText(text: string): number {
  const lowercaseText = text.toLowerCase();
  
  if (lowercaseText.includes('urgent') || lowercaseText.includes('critical') || lowercaseText.includes('asap')) {
    return TaskPriority.URGENT;
  } else if (lowercaseText.includes('high') || lowercaseText.includes('important')) {
    return TaskPriority.HIGH;
  } else if (lowercaseText.includes('low')) {
    return TaskPriority.LOW;
  } else {
    return TaskPriority.MEDIUM;
  }
}

/**
 * Generate a human-readable task summary
 */
export function generateTaskSummary(tasks: Task[]): string {
  const statusCounts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<TaskStatus, number>);

  const pendingCount = statusCounts[TaskStatus.PENDING] || 0;
  const inProgressCount = statusCounts[TaskStatus.IN_PROGRESS] || 0;
  const completedCount = statusCounts[TaskStatus.COMPLETED] || 0;

  let summary = `You have ${pendingCount} pending task${pendingCount !== 1 ? 's' : ''}`;
  
  if (inProgressCount > 0) {
    summary += `, ${inProgressCount} in progress`;
  }
  
  if (completedCount > 0) {
    summary += `, and ${completedCount} completed today`;
  }

  return summary + '.';
}

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  let result = `${hours} hour${hours !== 1 ? 's' : ''}`;
  
  if (remainingMinutes > 0) {
    result += ` ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  return result;
}

/**
 * Validate and sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
} 
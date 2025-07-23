import { Task } from './';
/**
 * Calculate task priority based on deadline, context, and dependencies
 */
export declare function calculateTaskPriority(deadline?: Date, context?: string, dependencies?: string[], userWeights?: {
    deadline: number;
    context: number;
    dependencies: number;
}): number;
/**
 * Extract time information from natural language
 */
export declare function extractTimeFromText(text: string): Date | null;
/**
 * Extract priority from natural language
 */
export declare function extractPriorityFromText(text: string): number;
/**
 * Generate a human-readable task summary
 */
export declare function generateTaskSummary(tasks: Task[]): string;
/**
 * Format duration in minutes to human-readable string
 */
export declare function formatDuration(minutes: number): string;
/**
 * Validate and sanitize user input
 */
export declare function sanitizeInput(input: string): string;
/**
 * Generate unique ID
 */
export declare function generateId(): string;
//# sourceMappingURL=utils.d.ts.map
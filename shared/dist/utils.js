"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateTaskPriority = calculateTaskPriority;
exports.extractTimeFromText = extractTimeFromText;
exports.extractPriorityFromText = extractPriorityFromText;
exports.generateTaskSummary = generateTaskSummary;
exports.formatDuration = formatDuration;
exports.sanitizeInput = sanitizeInput;
exports.generateId = generateId;
const _1 = require("./");
/**
 * Calculate task priority based on deadline, context, and dependencies
 */
function calculateTaskPriority(deadline, context, dependencies = [], userWeights = { deadline: 0.4, context: 0.3, dependencies: 0.3 }) {
    let priority = _1.DEFAULT_VALUES.TASK_PRIORITY;
    // Deadline weight calculation
    if (deadline) {
        const now = new Date();
        const timeToDeadline = deadline.getTime() - now.getTime();
        if (timeToDeadline < _1.TIME_CONSTANTS.DAY) {
            priority += 3 * userWeights.deadline * 10; // Urgent
        }
        else if (timeToDeadline < _1.TIME_CONSTANTS.DAY * 3) {
            priority += 2 * userWeights.deadline * 10; // High
        }
        else if (timeToDeadline < _1.TIME_CONSTANTS.WEEK) {
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
function extractTimeFromText(text) {
    const timePatterns = [
        { pattern: /tomorrow/i, offset: _1.TIME_CONSTANTS.DAY },
        { pattern: /today/i, offset: 0 },
        { pattern: /next week/i, offset: _1.TIME_CONSTANTS.WEEK },
        { pattern: /(\d+)\s*days?/i, multiplier: _1.TIME_CONSTANTS.DAY },
        { pattern: /(\d+)\s*hours?/i, multiplier: _1.TIME_CONSTANTS.HOUR },
        { pattern: /(\d+)\s*minutes?/i, multiplier: _1.TIME_CONSTANTS.MINUTE }
    ];
    const now = new Date();
    for (const { pattern, offset, multiplier } of timePatterns) {
        const match = text.match(pattern);
        if (match) {
            if (offset !== undefined) {
                return new Date(now.getTime() + offset);
            }
            else if (multiplier && match[1]) {
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
function extractPriorityFromText(text) {
    const lowercaseText = text.toLowerCase();
    if (lowercaseText.includes('urgent') || lowercaseText.includes('critical') || lowercaseText.includes('asap')) {
        return _1.TaskPriority.URGENT;
    }
    else if (lowercaseText.includes('high') || lowercaseText.includes('important')) {
        return _1.TaskPriority.HIGH;
    }
    else if (lowercaseText.includes('low')) {
        return _1.TaskPriority.LOW;
    }
    else {
        return _1.TaskPriority.MEDIUM;
    }
}
/**
 * Generate a human-readable task summary
 */
function generateTaskSummary(tasks) {
    const statusCounts = tasks.reduce((acc, task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {});
    const pendingCount = statusCounts[_1.TaskStatus.PENDING] || 0;
    const inProgressCount = statusCounts[_1.TaskStatus.IN_PROGRESS] || 0;
    const completedCount = statusCounts[_1.TaskStatus.COMPLETED] || 0;
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
function formatDuration(minutes) {
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
function sanitizeInput(input) {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .slice(0, 1000); // Limit length
}
/**
 * Generate unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
//# sourceMappingURL=utils.js.map
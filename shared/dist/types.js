"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageSchema = exports.MessageRole = exports.UserSchema = exports.TaskSchema = exports.TaskPriority = exports.TaskStatus = void 0;
const zod_1 = require("zod");
// Task-related types
var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["IN_PROGRESS"] = "in-progress";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (exports.TaskStatus = TaskStatus = {}));
var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["LOW"] = 1] = "LOW";
    TaskPriority[TaskPriority["MEDIUM"] = 5] = "MEDIUM";
    TaskPriority[TaskPriority["HIGH"] = 8] = "HIGH";
    TaskPriority[TaskPriority["URGENT"] = 10] = "URGENT";
})(TaskPriority || (exports.TaskPriority = TaskPriority = {}));
exports.TaskSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    priority: zod_1.z.number().min(1).max(10),
    deadline: zod_1.z.date().optional(),
    status: zod_1.z.nativeEnum(TaskStatus),
    context: zod_1.z.string().optional(),
    dependencies: zod_1.z.array(zod_1.z.string()).default([]),
    estimatedTime: zod_1.z.number().min(0).optional(), // in minutes
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date(),
    userId: zod_1.z.string()
});
// User-related types
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string(),
    email: zod_1.z.string().email(),
    name: zod_1.z.string().min(1).max(100),
    preferences: zod_1.z.object({
        timezone: zod_1.z.string().default('UTC'),
        workingHours: zod_1.z.object({
            start: zod_1.z.string().default('09:00'),
            end: zod_1.z.string().default('17:00')
        }),
        defaultTaskDuration: zod_1.z.number().min(5).max(480).default(30), // in minutes
        priorityWeights: zod_1.z.object({
            deadline: zod_1.z.number().min(0).max(1).default(0.4),
            context: zod_1.z.number().min(0).max(1).default(0.3),
            dependencies: zod_1.z.number().min(0).max(1).default(0.3)
        })
    }).optional(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
// Chat/Message types
var MessageRole;
(function (MessageRole) {
    MessageRole["USER"] = "user";
    MessageRole["ASSISTANT"] = "assistant";
    MessageRole["SYSTEM"] = "system";
})(MessageRole || (exports.MessageRole = MessageRole = {}));
exports.MessageSchema = zod_1.z.object({
    id: zod_1.z.string(),
    role: zod_1.z.nativeEnum(MessageRole),
    content: zod_1.z.string(),
    timestamp: zod_1.z.date(),
    userId: zod_1.z.string(),
    conversationId: zod_1.z.string(),
    metadata: zod_1.z.object({
        taskIds: zod_1.z.array(zod_1.z.string()).optional(),
        aiService: zod_1.z.enum(['perplexity', 'local-llm']).optional(),
        processingTime: zod_1.z.number().optional()
    }).optional()
});
//# sourceMappingURL=types.js.map
import { z } from 'zod';
export declare enum TaskStatus {
    PENDING = "pending",
    IN_PROGRESS = "in-progress",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}
export declare enum TaskPriority {
    LOW = 1,
    MEDIUM = 5,
    HIGH = 8,
    URGENT = 10
}
export declare const TaskSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    priority: z.ZodNumber;
    deadline: z.ZodOptional<z.ZodDate>;
    status: z.ZodNativeEnum<typeof TaskStatus>;
    context: z.ZodOptional<z.ZodString>;
    dependencies: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    estimatedTime: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
    userId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    title: string;
    priority: number;
    status: TaskStatus;
    dependencies: string[];
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    description?: string | undefined;
    deadline?: Date | undefined;
    context?: string | undefined;
    estimatedTime?: number | undefined;
}, {
    id: string;
    title: string;
    priority: number;
    status: TaskStatus;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    description?: string | undefined;
    deadline?: Date | undefined;
    context?: string | undefined;
    dependencies?: string[] | undefined;
    estimatedTime?: number | undefined;
}>;
export type Task = z.infer<typeof TaskSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    preferences: z.ZodOptional<z.ZodObject<{
        timezone: z.ZodDefault<z.ZodString>;
        workingHours: z.ZodObject<{
            start: z.ZodDefault<z.ZodString>;
            end: z.ZodDefault<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            start: string;
            end: string;
        }, {
            start?: string | undefined;
            end?: string | undefined;
        }>;
        defaultTaskDuration: z.ZodDefault<z.ZodNumber>;
        priorityWeights: z.ZodObject<{
            deadline: z.ZodDefault<z.ZodNumber>;
            context: z.ZodDefault<z.ZodNumber>;
            dependencies: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            deadline: number;
            context: number;
            dependencies: number;
        }, {
            deadline?: number | undefined;
            context?: number | undefined;
            dependencies?: number | undefined;
        }>;
    }, "strip", z.ZodTypeAny, {
        timezone: string;
        workingHours: {
            start: string;
            end: string;
        };
        defaultTaskDuration: number;
        priorityWeights: {
            deadline: number;
            context: number;
            dependencies: number;
        };
    }, {
        workingHours: {
            start?: string | undefined;
            end?: string | undefined;
        };
        priorityWeights: {
            deadline?: number | undefined;
            context?: number | undefined;
            dependencies?: number | undefined;
        };
        timezone?: string | undefined;
        defaultTaskDuration?: number | undefined;
    }>>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    name: string;
    preferences?: {
        timezone: string;
        workingHours: {
            start: string;
            end: string;
        };
        defaultTaskDuration: number;
        priorityWeights: {
            deadline: number;
            context: number;
            dependencies: number;
        };
    } | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    email: string;
    name: string;
    preferences?: {
        workingHours: {
            start?: string | undefined;
            end?: string | undefined;
        };
        priorityWeights: {
            deadline?: number | undefined;
            context?: number | undefined;
            dependencies?: number | undefined;
        };
        timezone?: string | undefined;
        defaultTaskDuration?: number | undefined;
    } | undefined;
}>;
export type User = z.infer<typeof UserSchema>;
export declare enum MessageRole {
    USER = "user",
    ASSISTANT = "assistant",
    SYSTEM = "system"
}
export declare const MessageSchema: z.ZodObject<{
    id: z.ZodString;
    role: z.ZodNativeEnum<typeof MessageRole>;
    content: z.ZodString;
    timestamp: z.ZodDate;
    userId: z.ZodString;
    conversationId: z.ZodString;
    metadata: z.ZodOptional<z.ZodObject<{
        taskIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        aiService: z.ZodOptional<z.ZodEnum<["perplexity", "local-llm"]>>;
        processingTime: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        taskIds?: string[] | undefined;
        aiService?: "perplexity" | "local-llm" | undefined;
        processingTime?: number | undefined;
    }, {
        taskIds?: string[] | undefined;
        aiService?: "perplexity" | "local-llm" | undefined;
        processingTime?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    userId: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    conversationId: string;
    metadata?: {
        taskIds?: string[] | undefined;
        aiService?: "perplexity" | "local-llm" | undefined;
        processingTime?: number | undefined;
    } | undefined;
}, {
    id: string;
    userId: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    conversationId: string;
    metadata?: {
        taskIds?: string[] | undefined;
        aiService?: "perplexity" | "local-llm" | undefined;
        processingTime?: number | undefined;
    } | undefined;
}>;
export type Message = z.infer<typeof MessageSchema>;
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface TaskExtraction {
    intent: 'CREATE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK' | 'QUERY_TASK' | 'UNKNOWN';
    entities: {
        action?: string;
        target?: string;
        deadline?: string;
        priority?: 'low' | 'medium' | 'high' | 'urgent';
        estimatedTime?: number;
        context?: string;
    };
    confidence: number;
}
export interface AIServiceResponse {
    content: string;
    taskExtraction?: TaskExtraction;
    suggestions?: string[];
    confidence: number;
    service: 'perplexity' | 'local-llm';
}
//# sourceMappingURL=types.d.ts.map
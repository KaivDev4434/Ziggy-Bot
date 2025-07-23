// Export all models
export { User, IUser, UserPreferences } from './User';
export { Task, ITask, TaskStatus } from './Task';
export { Conversation, IConversation, IMessage, MessageRole, AIService } from './Conversation';

// Re-export commonly used types
export type { Document } from 'mongoose';

// Model validation schemas (for API validation)
export const ModelSchemas = {
  User: 'User',
  Task: 'Task', 
  Conversation: 'Conversation'
} as const; 
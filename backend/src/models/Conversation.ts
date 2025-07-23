import mongoose, { Document, Schema } from 'mongoose';

// Message role enum
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

// AI service enum
export enum AIService {
  PERPLEXITY = 'perplexity',
  LOCAL_LLM = 'local-llm',
  RULE_BASED = 'rule-based'
}

// Message metadata interface
export interface MessageMetadata {
  taskIds?: mongoose.Types.ObjectId[]; // Tasks created/modified by this message
  aiService?: AIService; // Which AI service processed this message
  processingTime?: number; // milliseconds
  confidence?: number; // 0.0 to 1.0
  extractedEntities?: {
    intent?: string;
    entities?: Record<string, any>;
  };
  errorDetails?: string; // If processing failed
}

// Individual message interface
export interface IMessage {
  _id: mongoose.Types.ObjectId;
  role: MessageRole;
  content: string;
  timestamp: Date;
  metadata?: MessageMetadata;
}

// Conversation document interface
export interface IConversation extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // Reference to User
  title: string; // Auto-generated or user-set conversation title
  messages: IMessage[];
  context: {
    currentTasks: mongoose.Types.ObjectId[]; // Active tasks at conversation time
    userPreferences: Record<string, any>; // Snapshot of relevant user preferences
    sessionData: Record<string, any>; // Temporary session information
  };
  isActive: boolean; // Whether this is the current active conversation
  lastMessageAt: Date;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  addMessage(role: MessageRole, content: string, metadata?: MessageMetadata): IMessage;
  getRecentMessages(limit?: number): IMessage[];
  getContextForAI(): string;
  summarizeConversation(): string;
}

// Message subdocument schema
const messageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: Object.values(MessageRole),
    required: [true, 'Message role is required']
  },
  
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [10000, 'Message content cannot exceed 10,000 characters']
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: 1
  },
  
  metadata: {
    taskIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Task'
    }],
    
    aiService: {
      type: String,
      enum: Object.values(AIService)
    },
    
    processingTime: {
      type: Number,
      min: [0, 'Processing time cannot be negative'],
      max: [60000, 'Processing time seems unreasonably high'] // 60 seconds max
    },
    
    confidence: {
      type: Number,
      min: [0, 'Confidence must be between 0 and 1'],
      max: [1, 'Confidence must be between 0 and 1']
    },
    
    extractedEntities: {
      intent: String,
      entities: Schema.Types.Mixed
    },
    
    errorDetails: {
      type: String,
      maxlength: [1000, 'Error details cannot exceed 1000 characters']
    }
  }
}, {
  timestamps: true
});

// Main conversation schema
const conversationSchema = new Schema<IConversation>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: 1
  },
  
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Conversation title cannot exceed 200 characters'],
    default: function() {
      return `Conversation ${new Date().toLocaleDateString()}`;
    }
  },
  
  messages: [messageSchema],
  
  context: {
    currentTasks: [{
      type: Schema.Types.ObjectId,
      ref: 'Task'
    }],
    
    userPreferences: {
      type: Schema.Types.Mixed,
      default: {}
    },
    
    sessionData: {
      type: Schema.Types.Mixed,
      default: {}
    }
  },
  
  isActive: {
    type: Boolean,
    default: true,
    index: 1
  },
  
  lastMessageAt: {
    type: Date,
    default: Date.now,
    index: -1 // Descending index for recent conversations
  },
  
  messageCount: {
    type: Number,
    default: 0,
    min: [0, 'Message count cannot be negative']
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance optimization (Task 2.1.4)
conversationSchema.index({ userId: 1, isActive: 1 });
conversationSchema.index({ userId: 1, lastMessageAt: -1 });
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ 'messages.timestamp': -1 });
conversationSchema.index({ 'messages.metadata.taskIds': 1 });

// Compound index for efficient querying
conversationSchema.index({ 
  userId: 1, 
  isActive: 1, 
  lastMessageAt: -1 
});

// Text index for searching conversation content
conversationSchema.index({
  title: 'text',
  'messages.content': 'text'
});

// Pre-save middleware to update message count and last message time
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.messageCount = this.messages.length;
    
    if (this.messages.length > 0) {
      const lastMessage = this.messages[this.messages.length - 1];
      this.lastMessageAt = lastMessage.timestamp;
    }
  }
  next();
});

// Pre-save middleware to ensure only one active conversation per user
conversationSchema.pre('save', async function(next) {
  if (this.isNew && this.isActive) {
    try {
      // Deactivate other active conversations for this user
      await (this.constructor as any).updateMany(
        { 
          userId: this.userId, 
          isActive: true,
          _id: { $ne: this._id }
        },
        { isActive: false }
      );
    } catch (error) {
      return next(error as Error);
    }
  }
  next();
});

// Instance method to add a message
conversationSchema.methods.addMessage = function(
  role: MessageRole, 
  content: string, 
  metadata?: MessageMetadata
): IMessage {
  const message: IMessage = {
    _id: new mongoose.Types.ObjectId(),
    role,
    content: content.trim(),
    timestamp: new Date(),
    metadata
  };
  
  this.messages.push(message);
  this.lastMessageAt = message.timestamp;
  this.messageCount = this.messages.length;
  
  return message;
};

// Instance method to get recent messages
conversationSchema.methods.getRecentMessages = function(limit: number = 10): IMessage[] {
  return this.messages
    .slice(-limit)
    .sort((a: IMessage, b: IMessage) => a.timestamp.getTime() - b.timestamp.getTime());
};

// Instance method to get context for AI processing
conversationSchema.methods.getContextForAI = function(): string {
  const recentMessages = this.getRecentMessages(5);
  const contextMessages = recentMessages
    .map((msg: IMessage) => `${msg.role}: ${msg.content}`)
    .join('\n');
  
  const taskContext = this.context.currentTasks.length > 0 
    ? `\nCurrent active tasks: ${this.context.currentTasks.length} tasks`
    : '\nNo active tasks';
  
  const userPrefs = this.context.userPreferences
    ? `\nUser preferences: ${JSON.stringify(this.context.userPreferences)}`
    : '';
  
  return `Conversation context:\n${contextMessages}${taskContext}${userPrefs}`;
};

// Instance method to summarize conversation
conversationSchema.methods.summarizeConversation = function(): string {
  if (this.messages.length === 0) {
    return 'Empty conversation';
  }
  
  const firstMessage = this.messages[0];
  const lastMessage = this.messages[this.messages.length - 1];
  const taskCount = this.context.currentTasks.length;
  
  let summary = `Conversation with ${this.messageCount} messages`;
  
  if (taskCount > 0) {
    summary += `, ${taskCount} tasks discussed`;
  }
  
  summary += `. Started: ${firstMessage.timestamp.toLocaleDateString()}`;
  summary += `, Last activity: ${lastMessage.timestamp.toLocaleDateString()}`;
  
  return summary;
};

// Static method to find or create active conversation for user
conversationSchema.statics.findOrCreateActive = async function(userId: mongoose.Types.ObjectId) {
  let conversation = await this.findOne({ 
    userId, 
    isActive: true 
  }).sort({ lastMessageAt: -1 });
  
  if (!conversation) {
    conversation = new this({
      userId,
      title: `Conversation ${new Date().toLocaleDateString()}`,
      isActive: true
    });
    await conversation.save();
  }
  
  return conversation;
};

// Static method to get conversation history for user
conversationSchema.statics.getHistory = async function(
  userId: mongoose.Types.ObjectId, 
  limit: number = 10,
  skip: number = 0
) {
  return this.find({ userId })
    .sort({ lastMessageAt: -1 })
    .limit(limit)
    .skip(skip)
    .select('title lastMessageAt messageCount isActive createdAt')
    .lean();
};

// Create and export the model
export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
export default Conversation; 
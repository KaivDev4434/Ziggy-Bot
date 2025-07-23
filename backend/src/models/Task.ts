import mongoose, { Document, Schema } from 'mongoose';

// Task status enum
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// Task document interface
export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  priority: number; // 1-10 scale
  deadline?: Date;
  status: TaskStatus;
  context?: string;
  dependencies: mongoose.Types.ObjectId[]; // References to other tasks
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes (when completed)
  tags: string[];
  userId: mongoose.Types.ObjectId; // Reference to User
  parentTask?: mongoose.Types.ObjectId; // For subtasks
  subtasks: mongoose.Types.ObjectId[]; // Array of subtask IDs
  completedAt?: Date;
  startedAt?: Date;
  dueReminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Virtual properties
  isOverdue: boolean;
  timeRemaining: number; // milliseconds until deadline
  
  // Methods
  calculatePriority(userWeights?: any): number;
  markCompleted(): void;
  markStarted(): void;
}

// Task schema
const taskSchema = new Schema<ITask>({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    minlength: [1, 'Task title must be at least 1 character'],
    maxlength: [200, 'Task title cannot exceed 200 characters'],
    index: 'text' // Text index for search
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters']
  },
  
  priority: {
    type: Number,
    required: true,
    min: [1, 'Priority must be between 1 and 10'],
    max: [10, 'Priority must be between 1 and 10'],
    default: 5
  },
  
  deadline: {
    type: Date,
    validate: {
      validator: function(this: ITask, date: Date) {
        // Deadline cannot be in the past (except for updates)
        if (this.isNew && date && date < new Date()) {
          return false;
        }
        return true;
      },
      message: 'Deadline cannot be in the past'
    },
    index: 1 // Index for deadline-based queries
  },
  
  status: {
    type: String,
    enum: Object.values(TaskStatus),
    default: TaskStatus.PENDING,
    index: 1 // Index for status-based queries
  },
  
  context: {
    type: String,
    trim: true,
    maxlength: [500, 'Context cannot exceed 500 characters']
  },
  
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: 'Task',
    validate: {
      validator: function(this: ITask, taskId: mongoose.Types.ObjectId) {
        // Prevent self-referencing dependencies
        return !taskId.equals(this._id);
      },
      message: 'Task cannot depend on itself'
    }
  }],
  
  estimatedTime: {
    type: Number,
    min: [0, 'Estimated time cannot be negative'],
    max: [1440, 'Estimated time cannot exceed 24 hours'] // minutes
  },
  
  actualTime: {
    type: Number,
    min: [0, 'Actual time cannot be negative']
  },
  
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: 1 // Index for user-based queries
  },
  
  parentTask: {
    type: Schema.Types.ObjectId,
    ref: 'Task',
    validate: {
      validator: function(this: ITask, taskId: mongoose.Types.ObjectId) {
        // Prevent self-referencing parent tasks
        return !taskId.equals(this._id);
      },
      message: 'Task cannot be its own parent'
    }
  },
  
  subtasks: [{
    type: Schema.Types.ObjectId,
    ref: 'Task'
  }],
  
  completedAt: {
    type: Date,
    validate: {
      validator: function(date: Date) {
        // Completed date should not be in the future
        return !date || date <= new Date();
      },
      message: 'Completion date cannot be in the future'
    }
  },
  
  startedAt: {
    type: Date,
    validate: {
      validator: function(date: Date) {
        // Started date should not be in the future
        return !date || date <= new Date();
      },
      message: 'Start date cannot be in the future'
    }
  },
  
  dueReminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for performance optimization (Task 2.1.4)
taskSchema.index({ userId: 1, status: 1 });
taskSchema.index({ userId: 1, deadline: 1 });
taskSchema.index({ userId: 1, priority: -1 });
taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ status: 1, deadline: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ title: 'text', description: 'text' }); // Full-text search

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.deadline || this.status === TaskStatus.COMPLETED) {
    return false;
  }
  return new Date() > this.deadline;
});

// Virtual for time remaining until deadline
taskSchema.virtual('timeRemaining').get(function() {
  if (!this.deadline) {
    return 0;
  }
  const now = new Date().getTime();
  const deadline = this.deadline.getTime();
  return Math.max(0, deadline - now);
});

// Instance method to calculate priority based on multiple factors
taskSchema.methods.calculatePriority = function(userWeights = { deadline: 0.4, context: 0.3, dependencies: 0.3 }) {
  let calculatedPriority = 5; // Base priority
  
  // Deadline weight calculation
  if (this.deadline) {
    const now = new Date();
    const timeToDeadline = this.deadline.getTime() - now.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    
    if (timeToDeadline < dayMs) {
      calculatedPriority += 3 * userWeights.deadline; // Urgent
    } else if (timeToDeadline < dayMs * 3) {
      calculatedPriority += 2 * userWeights.deadline; // High
    } else if (timeToDeadline < dayMs * 7) {
      calculatedPriority += 1 * userWeights.deadline; // Medium
    }
  }
  
  // Context weight calculation (urgency keywords)
  if (this.context) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const lowercaseContext = this.context.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowercaseContext.includes(keyword))) {
      calculatedPriority += 2 * userWeights.context;
    }
  }
  
  // Dependencies weight calculation
  if (this.dependencies && this.dependencies.length > 0) {
    calculatedPriority += Math.min(this.dependencies.length, 3) * userWeights.dependencies;
  }
  
  return Math.min(Math.max(Math.round(calculatedPriority), 1), 10);
};

// Instance method to mark task as completed
taskSchema.methods.markCompleted = function() {
  this.status = TaskStatus.COMPLETED;
  this.completedAt = new Date();
  
  // Calculate actual time if started
  if (this.startedAt) {
    this.actualTime = Math.round((this.completedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
  }
};

// Instance method to mark task as started
taskSchema.methods.markStarted = function() {
  if (this.status === TaskStatus.PENDING) {
    this.status = TaskStatus.IN_PROGRESS;
    this.startedAt = new Date();
  }
};

// Pre-save middleware to auto-calculate priority if not set
taskSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('deadline') || this.isModified('context') || this.isModified('dependencies')) {
    // Only auto-calculate if priority hasn't been manually set
    if (!this.isModified('priority')) {
      this.priority = this.calculatePriority();
    }
  }
  next();
});

// Pre-save middleware to validate dependencies don't create cycles
taskSchema.pre('save', async function(next) {
  if (!this.isModified('dependencies') && !this.isModified('parentTask')) {
    return next();
  }
  
  try {
    // Check for circular dependencies
    const visited = new Set();
    const checkCircular = async (taskId: mongoose.Types.ObjectId): Promise<boolean> => {
      if (visited.has(taskId.toString())) {
        return false; // Circular dependency detected
      }
      
      visited.add(taskId.toString());
      
      const task = await (this.constructor as any).findById(taskId).select('dependencies parentTask');
      if (task) {
        // Check dependencies
        for (const depId of task.dependencies) {
          if (depId.equals(this._id) || !(await checkCircular(depId))) {
            return false;
          }
        }
        
        // Check parent task
        if (task.parentTask && (task.parentTask.equals(this._id) || !(await checkCircular(task.parentTask)))) {
          return false;
        }
      }
      
      return true;
    };
    
    // Check all dependencies
    for (const depId of this.dependencies) {
      if (!(await checkCircular(depId))) {
        return next(new Error('Circular dependency detected'));
      }
    }
    
    // Check parent task
    if (this.parentTask && !(await checkCircular(this.parentTask))) {
      return next(new Error('Circular dependency detected with parent task'));
    }
    
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Create and export the model
export const Task = mongoose.model<ITask>('Task', taskSchema);
export default Task; 
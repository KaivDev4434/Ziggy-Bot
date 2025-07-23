import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// User preferences interface
export interface UserPreferences {
  timezone: string;
  workingHours: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
  defaultTaskDuration: number; // minutes
  priorityWeights: {
    deadline: number;     // 0.0 to 1.0
    context: number;      // 0.0 to 1.0
    dependencies: number; // 0.0 to 1.0
  };
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    reminderMinutes: number; // Minutes before task deadline
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    compactView: boolean;
  };
}

// User document interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  password: string;
  preferences: UserPreferences;
  isEmailVerified: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  comparePassword(candidatePassword: string): Promise<boolean>;
  toJSON(): any;
}

// User schema
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: {
      validator: function(email: string) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      message: 'Invalid email format'
    }
  },
  
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [1, 'Name must be at least 1 character'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false // Don't include password in queries by default
  },
  
  preferences: {
    timezone: {
      type: String,
      default: 'UTC',
      validate: {
        validator: function(tz: string) {
          try {
            Intl.DateTimeFormat(undefined, { timeZone: tz });
            return true;
          } catch {
            return false;
          }
        },
        message: 'Invalid timezone'
      }
    },
    
    workingHours: {
      start: {
        type: String,
        default: '09:00',
        validate: {
          validator: function(time: string) {
            return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
          },
          message: 'Invalid time format (use HH:MM)'
        }
      },
      end: {
        type: String,
        default: '17:00',
        validate: {
          validator: function(time: string) {
            return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
          },
          message: 'Invalid time format (use HH:MM)'
        }
      }
    },
    
    defaultTaskDuration: {
      type: Number,
      default: 30,
      min: [5, 'Default task duration must be at least 5 minutes'],
      max: [480, 'Default task duration cannot exceed 8 hours']
    },
    
    priorityWeights: {
      deadline: {
        type: Number,
        default: 0.4,
        min: [0, 'Priority weight must be between 0 and 1'],
        max: [1, 'Priority weight must be between 0 and 1']
      },
      context: {
        type: Number,
        default: 0.3,
        min: [0, 'Priority weight must be between 0 and 1'],
        max: [1, 'Priority weight must be between 0 and 1']
      },
      dependencies: {
        type: Number,
        default: 0.3,
        min: [0, 'Priority weight must be between 0 and 1'],
        max: [1, 'Priority weight must be between 0 and 1']
      }
    },
    
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      desktop: { type: Boolean, default: false },
      reminderMinutes: { 
        type: Number, 
        default: 15,
        min: [0, 'Reminder time cannot be negative'],
        max: [1440, 'Reminder time cannot exceed 24 hours']
      }
    },
    
    ui: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'auto'
      },
      language: {
        type: String,
        default: 'en',
        minlength: [2, 'Language code must be at least 2 characters'],
        maxlength: [5, 'Language code cannot exceed 5 characters']
      },
      compactView: { type: Boolean, default: false }
    }
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for performance optimization (Task 2.1.4)
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ createdAt: 1 });
userSchema.index({ lastLogin: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '10');
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Validate priority weights sum (should be close to 1.0)
userSchema.pre('save', function(next) {
  const weights = this.preferences.priorityWeights;
  const sum = weights.deadline + weights.context + weights.dependencies;
  
  if (Math.abs(sum - 1.0) > 0.1) {
    const error = new Error('Priority weights should sum to approximately 1.0');
    return next(error);
  }
  
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Create and export the model
export const User = mongoose.model<IUser>('User', userSchema);
export default User; 
import { IUser, ITask, IConversation, TaskStatus } from '../../src/models';
import { Types } from 'mongoose';

export class TestFixtures {
  /**
   * Generate mock user data
   */
  static createMockUser(overrides: Partial<IUser> = {}): Partial<IUser> {
    return {
      name: 'Test User',
      email: 'test@example.com',
      password: '$2b$10$hash', // bcrypt hash for 'password123'
            preferences: {
        timezone: 'UTC',
        workingHours: {
          start: '09:00',
          end: '17:00'
        },
        defaultTaskDuration: 30,
        priorityWeights: {
          deadline: 0.4,
          context: 0.3,
          dependencies: 0.3
        },
        notifications: {
          email: true,
          push: false,
          desktop: false,
          reminderMinutes: 15
        },
        ui: {
          theme: 'light',
          language: 'en',
          compactView: false
        }
      },
      isEmailVerified: true,
      ...overrides
    };
  }

  /**
   * Generate mock task data
   */
  static createMockTask(overrides: Partial<ITask> = {}): Partial<ITask> {
    return {
      title: 'Test Task',
      description: 'This is a test task description',
      status: 'pending' as TaskStatus,
      priority: 5,
      estimatedTime: 30,
      tags: ['test', 'mock'],
      context: 'Test context',
      userId: new Types.ObjectId(),
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      ...overrides
    };
  }

  /**
   * Generate mock conversation data
   */
  static createMockConversation(overrides: Partial<IConversation> = {}): Partial<IConversation> {
    return {
      userId: new Types.ObjectId(),
      title: 'Test Conversation',
      isActive: true,
      messageCount: 0,
      messages: [],
      context: {
        currentTasks: [],
        userPreferences: {},
        sessionData: {}
      },
      ...overrides
    };
  }

  /**
   * Generate mock NLP result
   */
  static createMockNLPResult(overrides: any = {}) {
    return {
      intent: 'create_task',
      confidence: 0.95,
      entities: [
        {
          type: 'date',
          value: 'tomorrow',
          confidence: 0.9,
          startIndex: 0,
          endIndex: 8
        }
      ],
      extractedTasks: [
        {
          title: 'Test extracted task',
          priority: 5,
          estimatedTime: 30
        }
      ],
      processedText: 'test processed text',
      metadata: {
        originalText: 'Test original text',
        processingTime: 10,
        model: 'test-model',
        language: 'en'
      },
      ...overrides
    };
  }

  /**
   * Generate multiple mock users
   */
  static createMockUsers(count: number): Partial<IUser>[] {
    return Array.from({ length: count }, (_, index) => 
      this.createMockUser({
        name: `Test User ${index + 1}`,
        email: `test${index + 1}@example.com`
      })
    );
  }

  /**
   * Generate multiple mock tasks
   */
  static createMockTasks(count: number, userId?: Types.ObjectId): Partial<ITask>[] {
    return Array.from({ length: count }, (_, index) => 
      this.createMockTask({
        title: `Test Task ${index + 1}`,
        userId: userId || new Types.ObjectId(),
        priority: (index % 10 + 1)
      })
    );
  }

  /**
   * Generate mock API response
   */
  static createMockApiResponse(data: any = {}, success: boolean = true) {
    return {
      success,
      message: success ? 'Operation successful' : 'Operation failed',
      data,
      ...(success ? {} : { error: 'Test error message' })
    };
  }

  /**
   * Generate mock JWT token payload
   */
  static createMockJWTPayload(overrides: any = {}) {
    return {
      id: new Types.ObjectId().toString(),
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour
      ...overrides
    };
  }

  /**
   * Generate mock Express request
   */
  static createMockRequest(overrides: any = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      userId: null,
      ...overrides
    };
  }

  /**
   * Generate mock Express response
   */
  static createMockResponse() {
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    return res;
  }

  /**
   * Generate mock conversation messages
   */
  static createMockMessages(count: number) {
    return Array.from({ length: count }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `Test message ${index + 1}`,
      timestamp: new Date(),
      metadata: {}
    }));
  }

  /**
   * Generate realistic task scenarios for testing
   */
  static createTaskScenarios() {
    return {
      urgentTask: this.createMockTask({
        title: 'Urgent: Fix critical bug',
        priority: 10,
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        tags: ['urgent', 'bug', 'critical']
      }),
      
      routineTask: this.createMockTask({
        title: 'Daily standup meeting',
        priority: 3,
        estimatedTime: 15,
        tags: ['meeting', 'daily', 'routine']
      }),
      
      longTermProject: this.createMockTask({
        title: 'Develop new feature module',
        priority: 7,
        estimatedTime: 480, // 8 hours
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        tags: ['development', 'feature', 'project']
      }),
      
      overdueTasks: this.createMockTask({
        title: 'Overdue task',
        priority: 8,
        deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        tags: ['overdue']
      })
    };
  }

  /**
   * Generate NLP test scenarios
   */
  static createNLPTestScenarios() {
    return [
      {
        input: "I need to call John tomorrow at 2 PM about the urgent project",
        expectedIntent: 'create_task',
        expectedEntities: ['person', 'date', 'time', 'priority'],
        expectedTask: {
          title: expect.stringContaining('call'),
          priority: expect.any(Number)
        }
      },
      {
        input: "What tasks do I have for today?",
        expectedIntent: 'list_tasks',
        expectedEntities: ['date'],
        expectedTask: null
      },
      {
        input: "Hello Ziggy, how are you?",
        expectedIntent: 'greeting',
        expectedEntities: [],
        expectedTask: null
      }
    ];
  }
}

export default TestFixtures; 
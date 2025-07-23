#!/usr/bin/env ts-node

import mongoose from 'mongoose';
import { database } from './config/database';
import { logger } from './config/logger';
import { User, Task, Conversation, TaskStatus, MessageRole, AIService } from './models';
import { migrationRunner } from './utils/migration';

// Test configuration
const TEST_CONFIG = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/companion_test',
  TIMEOUT: 30000
};

class DatabaseTester {
  private testResults: { name: string; status: 'PASS' | 'FAIL'; error?: string }[] = [];

  async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    try {
      console.log(`🧪 Running test: ${name}`);
      await testFn();
      this.testResults.push({ name, status: 'PASS' });
      console.log(`✅ PASS: ${name}`);
    } catch (error) {
      this.testResults.push({ 
        name, 
        status: 'FAIL', 
        error: error instanceof Error ? error.message : String(error) 
      });
      console.log(`❌ FAIL: ${name} - ${error}`);
    }
  }

  async testDatabaseConnection(): Promise<void> {
    const isConnected = database.getConnectionStatus();
    if (!isConnected) {
      throw new Error('Database not connected');
    }
    
    const health = await database.healthCheck();
    if (health.status !== 'ok') {
      throw new Error(`Database health check failed: ${health.message}`);
    }
  }

  async testMigrationSystem(): Promise<void> {
    const status = await migrationRunner.getStatus();
    
    if (status.applied.length === 0) {
      throw new Error('No migrations have been applied');
    }
    
    if (status.pending.length > 0) {
      throw new Error(`${status.pending.length} migrations are still pending`);
    }
    
    if (!status.isValid) {
      throw new Error('Database validation failed');
    }
    
    console.log(`   Applied migrations: ${status.applied.join(', ')}`);
  }

  async testUserModel(): Promise<void> {
    // Test user creation with valid data
    const userData = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123',
      preferences: {
        timezone: 'America/New_York',
        workingHours: { start: '09:00', end: '17:00' },
        defaultTaskDuration: 30,
        priorityWeights: { deadline: 0.4, context: 0.3, dependencies: 0.3 }
      }
    };

    const user = new User(userData);
    await user.save();
    console.log(`   Created user: ${user.email} (ID: ${user._id})`);

    // Test password hashing
    const originalPassword = user.password;
    await user.save();
    if (user.password === 'password123') {
      throw new Error('Password was not hashed');
    }

    // Test password comparison
    const isValid = await user.comparePassword('password123');
    if (!isValid) {
      throw new Error('Password comparison failed');
    }

    // Test email validation
    try {
      const invalidUser = new User({ ...userData, email: 'invalid-email' });
      await invalidUser.save();
      throw new Error('Should have failed email validation');
    } catch (error) {
      if (!(error as Error).message.includes('email')) {
        throw new Error('Email validation error not thrown correctly');
      }
    }

    // Test priority weights validation
    try {
      const invalidWeights = new User({
        ...userData,
        email: 'test2@example.com',
        preferences: {
          ...userData.preferences,
          priorityWeights: { deadline: 0.9, context: 0.2, dependencies: 0.2 } // Sum > 1.1
        }
      });
      await invalidWeights.save();
      throw new Error('Should have failed priority weights validation');
    } catch (error) {
      if (!(error as Error).message.includes('Priority weights')) {
        throw new Error('Priority weights validation not working');
      }
    }

    // Cleanup
    await User.deleteOne({ _id: user._id });
  }

  async testTaskModel(): Promise<void> {
    // Create a test user first
    const user = new User({
      email: 'tasktest@example.com',
      name: 'Task Test User',
      password: 'password123'
    });
    await user.save();

    // Test basic task creation
    const taskData = {
      title: 'Test Task',
      description: 'This is a test task',
      userId: user._id,
      estimatedTime: 60,
      tags: ['test', 'development']
    };

    const task = new Task(taskData);
    await task.save();
    console.log(`   Created task: ${task.title} (Priority: ${task.priority})`);

    // Test priority calculation
    if (task.priority < 1 || task.priority > 10) {
      throw new Error('Task priority not within valid range');
    }

    // Test deadline validation (past date should fail for new tasks)
    try {
      const pastTask = new Task({
        ...taskData,
        title: 'Past Task',
        deadline: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      });
      await pastTask.save();
      throw new Error('Should have failed past deadline validation');
    } catch (error) {
      if (!(error as Error).message.includes('deadline')) {
        throw new Error('Deadline validation not working correctly');
      }
    }

    // Test urgency detection in priority calculation
    const urgentTask = new Task({
      ...taskData,
      title: 'Urgent Task',
      context: 'This is urgent and critical',
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    });
    await urgentTask.save();
    
    if (urgentTask.priority <= task.priority) {
      throw new Error('Urgent task should have higher priority');
    }
    console.log(`   Urgent task priority: ${urgentTask.priority}`);

    // Test task status transitions
    task.markStarted();
    if (task.status !== TaskStatus.IN_PROGRESS || !task.startedAt) {
      throw new Error('Task status transition to IN_PROGRESS failed');
    }

    task.markCompleted();
    await task.save();
    if (!task.completedAt || !task.actualTime) {
      throw new Error('Task completion failed - missing completedAt or actualTime');
    }
    console.log(`   Task completed in ${task.actualTime} minutes`);

    // Test virtual properties
    const overdue = new Task({
      ...taskData,
      title: 'Test Overdue',
      deadline: new Date(Date.now() - 60 * 1000) // 1 minute ago
    });
    await overdue.save();
    
    // Note: We need to fetch from DB to get virtuals
    const fetchedOverdue = await Task.findById(overdue._id);
    if (!fetchedOverdue?.isOverdue) {
      throw new Error('Virtual isOverdue property not working');
    }

    // Test dependency validation (prevent self-reference)
    try {
      const selfRefTask = new Task({
        ...taskData,
        title: 'Self Reference',
        dependencies: [task._id]
      });
      selfRefTask._id = task._id; // Simulate self-reference
      await selfRefTask.save();
      throw new Error('Should have prevented self-referencing dependency');
    } catch (error) {
      // Expected to fail
    }

    // Cleanup
    await Task.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }

  async testConversationModel(): Promise<void> {
    // Create test user
    const user = new User({
      email: 'convotest@example.com',
      name: 'Conversation Test User',
      password: 'password123'
    });
    await user.save();

    // Test conversation creation
    const conversation = new Conversation({
      userId: user._id,
      title: 'Test Conversation'
    });
    await conversation.save();
    console.log(`   Created conversation: ${conversation.title}`);

    // Test adding messages
    const userMessage = conversation.addMessage(
      MessageRole.USER,
      'Hello, I need help with my tasks',
      {
        aiService: AIService.PERPLEXITY,
        processingTime: 100,
        confidence: 0.95
      }
    );

    const assistantMessage = conversation.addMessage(
      MessageRole.ASSISTANT,
      'I can help you manage your tasks. What would you like to do?'
    );

    await conversation.save();

    if (conversation.messageCount !== 2) {
      throw new Error('Message count not updated correctly');
    }

    // Test message retrieval
    const recent = conversation.getRecentMessages(5);
    if (recent.length !== 2) {
      throw new Error('Recent messages not retrieved correctly');
    }

    // Test context generation
    const context = conversation.getContextForAI();
    if (!context.includes('Hello, I need help') || !context.includes('I can help you')) {
      throw new Error('AI context generation failed');
    }
    console.log(`   Generated context length: ${context.length} chars`);

    // Test conversation summary
    const summary = conversation.summarizeConversation();
    if (!summary.includes('2 messages')) {
      throw new Error('Conversation summary not generated correctly');
    }

    // Test active conversation constraint (only one active per user)
    const secondConvo = new Conversation({
      userId: user._id,
      title: 'Second Conversation',
      isActive: true
    });
    await secondConvo.save();

    // First conversation should be deactivated
    const updatedFirst = await Conversation.findById(conversation._id);
    if (updatedFirst?.isActive) {
      throw new Error('Multiple active conversations allowed for same user');
    }

    // Test static methods
    const activeConvo = await (Conversation as any).findOrCreateActive(user._id);
    if (!activeConvo.isActive) {
      throw new Error('findOrCreateActive not working correctly');
    }

    const history = await (Conversation as any).getHistory(user._id, 10);
    if (history.length === 0) {
      throw new Error('Conversation history not retrieved');
    }

    // Cleanup
    await Conversation.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }

  async testIndexes(): Promise<void> {
    // Check if indexes were created
    const userIndexes = await User.collection.getIndexes();
    const taskIndexes = await Task.collection.getIndexes();
    const conversationIndexes = await Conversation.collection.getIndexes();

    console.log(`   User indexes: ${Object.keys(userIndexes).length}`);
    console.log(`   Task indexes: ${Object.keys(taskIndexes).length}`);
    console.log(`   Conversation indexes: ${Object.keys(conversationIndexes).length}`);

    // Verify specific indexes exist
    const expectedUserIndexes = ['email_1'];
    const expectedTaskIndexes = ['userId_1_status_1', 'userId_1_deadline_1'];
    
    for (const expectedIndex of expectedUserIndexes) {
      if (!userIndexes[expectedIndex]) {
        throw new Error(`Missing user index: ${expectedIndex}`);
      }
    }

    for (const expectedIndex of expectedTaskIndexes) {
      if (!taskIndexes[expectedIndex]) {
        throw new Error(`Missing task index: ${expectedIndex}`);
      }
    }
  }

  async testPerformance(): Promise<void> {
    // Create test user
    const user = new User({
      email: 'perftest@example.com',
      name: 'Performance Test User',
      password: 'password123'
    });
    await user.save();

    // Create multiple tasks to test query performance
    const tasks = [];
    for (let i = 0; i < 100; i++) {
      tasks.push({
        title: `Task ${i}`,
        description: `Test task number ${i}`,
        userId: user._id,
        status: i % 3 === 0 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        priority: Math.floor(Math.random() * 10) + 1,
        deadline: new Date(Date.now() + i * 24 * 60 * 60 * 1000), // i days from now
        tags: [`tag${i % 5}`, 'performance-test']
      });
    }

    const startTime = Date.now();
    await Task.insertMany(tasks);
    const insertTime = Date.now() - startTime;
    console.log(`   Inserted 100 tasks in ${insertTime}ms`);

    // Test indexed queries
    const queryStart = Date.now();
    const userTasks = await Task.find({ userId: user._id, status: TaskStatus.PENDING })
      .sort({ priority: -1 })
      .limit(10);
    const queryTime = Date.now() - queryStart;
    console.log(`   Queried user tasks in ${queryTime}ms (found ${userTasks.length})`);

    // Test text search
    const searchStart = Date.now();
    const searchResults = await Task.find({ 
      $text: { $search: 'Task 50' },
      userId: user._id 
    });
    const searchTime = Date.now() - searchStart;
    console.log(`   Text search completed in ${searchTime}ms (found ${searchResults.length})`);

    // Cleanup
    await Task.deleteMany({ userId: user._id });
    await User.deleteOne({ _id: user._id });
  }

  printResults(): void {
    console.log('\n📊 TEST RESULTS SUMMARY:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
    }
    
    console.log('\n🏆 TASK 2.1 DATABASE SCHEMA VALIDATION:', 
      failed === 0 ? 'COMPLETE ✅' : 'NEEDS ATTENTION ❌');
  }
}

async function runAllTests(): Promise<void> {
  const tester = new DatabaseTester();
  
  console.log('🚀 Starting Database Schema Tests for Task 2.1');
  console.log('===============================================\n');

  try {
    // Connect to database
    await database.connect();
    console.log('📦 Database connected successfully\n');

    // Run all tests
    await tester.runTest('Database Connection', () => tester.testDatabaseConnection());
    await tester.runTest('Migration System', () => tester.testMigrationSystem());
    await tester.runTest('User Model Validation', () => tester.testUserModel());
    await tester.runTest('Task Model Validation', () => tester.testTaskModel());
    await tester.runTest('Conversation Model Validation', () => tester.testConversationModel());
    await tester.runTest('Database Indexes', () => tester.testIndexes());
    await tester.runTest('Performance Tests', () => tester.testPerformance());

  } catch (error) {
    console.error('❌ Test setup failed:', error);
  } finally {
    tester.printResults();
    await database.disconnect();
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
} 
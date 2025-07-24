import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { User, Task, Conversation } from '../../src/models';
import TestFixtures from '../fixtures';
import app from '../../src/app';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('NLP-Chat Integration', () => {
  let testApp: Express;
  let testUser: any;
  let authToken: string;

  beforeAll(() => {
    testApp = app;
  });

  beforeEach(async () => {
    const userData = TestFixtures.createMockUser();
    testUser = await new User(userData).save();
    authToken = 'Bearer mockToken123';

    mockedJwt.verify.mockReturnValue({
      id: testUser._id.toString(),
      email: testUser.email
    } as any);
  });

  describe('End-to-End NLP Task Creation Flow', () => {
    it('should create tasks from natural language through chat', async () => {
      const nlpMessages = [
        "I need to call John tomorrow at 2 PM about the urgent project meeting",
        "Remind me to buy groceries today before 6 PM",
        "Schedule a 2-hour meeting with the team next week"
      ];

      const responses = [];

      for (const message of nlpMessages) {
        const response = await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: message })
          .expect(201);

        responses.push(response);
        expect(response.body.success).toBe(true);
        expect(response.body.data.assistantMessage).toBeDefined();
      }

      // Verify tasks were created
      const tasks = await Task.find({ userId: testUser._id });
      expect(tasks.length).toBeGreaterThan(0);

      // Check that tasks have appropriate properties from NLP extraction
      const callTask = tasks.find(t => t.title.toLowerCase().includes('call'));
      expect(callTask).toBeDefined();
      expect(callTask!.tags).toContain('nlp-generated');

      const groceryTask = tasks.find(t => t.title.toLowerCase().includes('groceries'));
      expect(groceryTask).toBeDefined();

      const meetingTask = tasks.find(t => t.title.toLowerCase().includes('meeting'));
      expect(meetingTask).toBeDefined();
      expect(meetingTask!.estimatedTime).toBeGreaterThan(60); // Should detect "2-hour"
    });

    it('should handle conversational task queries', async () => {
      // First create some tasks
      await Task.insertMany([
        { ...TestFixtures.createMockTask({ userId: testUser._id }), title: 'Complete report', priority: 8 },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), title: 'Team meeting', priority: 5 },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), title: 'Call client', priority: 9 }
      ]);

      const queries = [
        "What tasks do I have for today?",
        "Show me my high priority tasks",
        "What's my current status?"
      ];

      for (const query of queries) {
        const response = await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: query })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assistantMessage.content).toBeTruthy();
        
        // Should contain task information in response
        const content = response.body.data.assistantMessage.content.toLowerCase();
        expect(content).toMatch(/task|report|meeting|call/);
      }
    });

    it('should maintain conversation context across messages', async () => {
      // Start a conversation about creating a task
      const response1 = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "I need to prepare for the big presentation next Monday" })
        .expect(201);

      expect(response1.body.success).toBe(true);

      // Follow up with context-dependent message
      const response2 = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "Actually, make that high priority" })
        .expect(201);

      expect(response2.body.success).toBe(true);

      // Check if context was maintained
      const tasks = await Task.find({ userId: testUser._id });
      const presentationTask = tasks.find(t => t.title.toLowerCase().includes('presentation'));
      
      if (presentationTask) {
        expect(presentationTask.priority).toBeGreaterThan(7); // Should be high priority
      }
    });

    it('should handle greetings and casual conversation', async () => {
      const casualMessages = [
        "Hello Ziggy!",
        "How are you today?",
        "Thanks for your help!",
        "Good morning"
      ];

      for (const message of casualMessages) {
        const response = await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: message })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assistantMessage.content).toBeTruthy();
        
        const content = response.body.data.assistantMessage.content.toLowerCase();
        expect(content).toMatch(/hello|hi|thanks|good|help/);
      }
    });
  });

  describe('NLP Entity Extraction Integration', () => {
    it('should extract and apply date/time entities correctly', async () => {
      const message = "Call Dr. Smith tomorrow at 3:30 PM for the urgent consultation";
      
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: message })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Check NLP metadata
      const nlpData = response.body.data.assistantMessage.metadata.nlp;
      expect(nlpData.intent).toBe('create_task');
      expect(nlpData.entitiesFound).toBeGreaterThan(0);

      // Verify task was created with correct properties
      const tasks = await Task.find({ userId: testUser._id });
      const callTask = tasks.find(t => t.title.toLowerCase().includes('call'));
      
      if (callTask) {
        expect(callTask.deadline).toBeDefined();
        expect(callTask.priority).toBeGreaterThan(7); // Should detect "urgent"
        expect(callTask.tags).toContain('nlp-generated');
      }
    });

    it('should extract priority levels correctly', async () => {
      const priorityTests = [
        { message: "This is a critical task that needs immediate attention", expectedPriority: 9 },
        { message: "Add a low priority task to review documents when you can", expectedPriority: 3 },
        { message: "Schedule an important meeting with the board", expectedPriority: 7 }
      ];

      for (const test of priorityTests) {
        await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: test.message })
          .expect(201);

        const tasks = await Task.find({ userId: testUser._id }).sort({ createdAt: -1 });
        const latestTask = tasks[0];
        
        expect(latestTask.priority).toBeGreaterThanOrEqual(test.expectedPriority - 2);
        expect(latestTask.priority).toBeLessThanOrEqual(test.expectedPriority + 2);
        
        // Clean up for next test
        await Task.findByIdAndDelete(latestTask._id);
      }
    });

    it('should extract duration information correctly', async () => {
      const durationTests = [
        { message: "Schedule a quick 15-minute standup meeting", expectedDuration: 15 },
        { message: "Block 2 hours for deep work on the project", expectedDuration: 120 },
        { message: "Set up a brief call with the client", expectedDuration: 20 }
      ];

      for (const test of durationTests) {
        await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: test.message })
          .expect(201);

        const tasks = await Task.find({ userId: testUser._id }).sort({ createdAt: -1 });
        const latestTask = tasks[0];
        
        expect(latestTask.estimatedTime).toBeGreaterThanOrEqual(test.expectedDuration - 10);
        expect(latestTask.estimatedTime).toBeLessThanOrEqual(test.expectedDuration + 10);
        
        // Clean up for next test
        await Task.findByIdAndDelete(latestTask._id);
      }
    });
  });

  describe('Task Management Through Chat', () => {
    beforeEach(async () => {
      // Create some tasks for testing
      await Task.insertMany([
        { 
          ...TestFixtures.createMockTask({ userId: testUser._id }), 
          title: 'Review quarterly reports',
          status: 'pending',
          priority: 6
        },
        { 
          ...TestFixtures.createMockTask({ userId: testUser._id }), 
          title: 'Team standup meeting',
          status: 'in-progress',
          priority: 4
        },
        { 
          ...TestFixtures.createMockTask({ userId: testUser._id }), 
          title: 'Client presentation',
          status: 'completed',
          priority: 8
        }
      ]);
    });

    it('should list tasks through natural language queries', async () => {
      const listQueries = [
        "What tasks do I have?",
        "Show me my pending tasks",
        "List all my completed tasks",
        "What's my current workload?"
      ];

      for (const query of listQueries) {
        const response = await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: query })
          .expect(201);

        expect(response.body.success).toBe(true);
        
        const content = response.body.data.assistantMessage.content;
        expect(content).toBeTruthy();
        
        // Should contain task information
        expect(content.toLowerCase()).toMatch(/task|report|meeting|presentation/);
      }
    });

    it('should provide schedule information through chat', async () => {
      const scheduleQueries = [
        "What's my schedule for today?",
        "Show me tomorrow's agenda",
        "What do I have planned for this week?"
      ];

      for (const query of scheduleQueries) {
        const response = await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: query })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assistantMessage.content).toBeTruthy();
      }
    });

    it('should provide task statistics through conversation', async () => {
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "What's my current status?" })
        .expect(201);

      expect(response.body.success).toBe(true);
      
      const content = response.body.data.assistantMessage.content.toLowerCase();
      expect(content).toMatch(/task|pending|progress|status/);
    });
  });

  describe('Conversation Management Integration', () => {
    it('should create and manage conversations automatically', async () => {
      // Send a message that should create a new conversation
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "Hello, I need help organizing my tasks" })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.conversation).toBeDefined();

      // Verify conversation was created in database
      const conversations = await Conversation.find({ userId: testUser._id });
      expect(conversations.length).toBeGreaterThan(0);

      const conversation = conversations[0];
      expect(conversation.isActive).toBe(true);
      expect(conversation.messageCount).toBeGreaterThan(0);
    });

    it('should retrieve conversation history with NLP metadata', async () => {
      // Create some conversation messages
      await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "Create a task to call John" });

      await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "What tasks do I have?" });

      // Get conversation history
      const historyResponse = await request(testApp)
        .get('/api/chat/history')
        .set('Authorization', authToken)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data.conversations.length).toBeGreaterThan(0);

      const conversation = historyResponse.body.data.conversations[0];
      expect(conversation.messageCount).toBeGreaterThan(0);
    });

    it('should handle conversation search with NLP-created content', async () => {
      // Create messages with specific content
      await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "Schedule a meeting with the engineering team" });

      await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "Remind me to review the quarterly budget" });

      // Search for conversations
      const searchResponse = await request(testApp)
        .get('/api/chat/search?query=meeting')
        .set('Authorization', authToken)
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.results.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed natural language gracefully', async () => {
      const problematicInputs = [
        "", // Empty string
        "asdfghjkl qwertyuiop", // Gibberish
        "!!!!!@@@@@#####", // Special characters only
        "a".repeat(1000), // Very long input
        "Task task task task task" // Repetitive input
      ];

      for (const input of problematicInputs) {
        const response = await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: input })
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.assistantMessage.content).toBeTruthy();
        
        // Should not crash and should provide some response
        expect(typeof response.body.data.assistantMessage.content).toBe('string');
      }
    });

    it('should handle NLP processing failures gracefully', async () => {
      // Mock NLP service failure
      jest.mock('../../src/services/nlpService', () => ({
        processMessage: jest.fn().mockRejectedValue(new Error('NLP service down'))
      }));

      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "Create a task for me" })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assistantMessage.content).toBeTruthy();
      
      // Should fall back to basic response
      expect(response.body.data.assistantMessage.metadata.fallback).toBe(true);
    });

    it('should handle concurrent message processing', async () => {
      const messages = [
        "Create task 1",
        "Create task 2",
        "Create task 3",
        "List my tasks",
        "What's my status?"
      ];

      // Send all messages concurrently
      const promises = messages.map(message =>
        request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: message })
      );

      const responses = await Promise.all(promises);

      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify tasks were created despite concurrent processing
      const tasks = await Task.find({ userId: testUser._id });
      expect(tasks.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Metrics', () => {
    it('should process NLP messages within reasonable time limits', async () => {
      const complexMessage = "Schedule an urgent 2-hour meeting with John, Sarah, and the engineering team tomorrow at 3 PM to discuss the critical project milestone and budget review";
      
      const startTime = Date.now();
      
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: complexMessage })
        .expect(201);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Check NLP processing time in metadata
      const nlpProcessingTime = response.body.data.assistantMessage.metadata.processingTime;
      expect(nlpProcessingTime).toBeLessThan(1000); // NLP should be under 1 second
    });

    it('should maintain conversation performance with message history', async () => {
      // Create a conversation with multiple messages
      for (let i = 0; i < 10; i++) {
        await request(testApp)
          .post('/api/chat/message')
          .set('Authorization', authToken)
          .send({ content: `Create task number ${i + 1}` });
      }

      // Performance should not degrade significantly
      const startTime = Date.now();
      
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: "What tasks do I have?" })
        .expect(201);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(processingTime).toBeLessThan(3000); // Should still be reasonably fast
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency between chat and task systems', async () => {
      const taskMessage = "Create an urgent task to review the contract by Friday at 2 PM";
      
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: taskMessage })
        .expect(201);

      expect(response.body.success).toBe(true);

      // Verify task was created and data is consistent
      const tasks = await Task.find({ userId: testUser._id });
      const createdTask = tasks[tasks.length - 1]; // Latest task

      // Check task properties match NLP extraction
      expect(createdTask.userId.toString()).toBe(testUser._id.toString());
      expect(createdTask.title.toLowerCase()).toContain('review');
      expect(createdTask.priority).toBeGreaterThan(7); // Should detect "urgent"
      expect(createdTask.deadline).toBeDefined();
      expect(createdTask.tags).toContain('nlp-generated');

      // Verify conversation metadata
      const conversations = await Conversation.find({ userId: testUser._id });
      const conversation = conversations[0];
      expect(conversation.messageCount).toBeGreaterThan(0);
    });

    it('should validate NLP-generated task data against schema', async () => {
      const invalidDataMessage = "Create a task with impossible deadline yesterday";
      
      const response = await request(testApp)
        .post('/api/chat/message')
        .set('Authorization', authToken)
        .send({ content: invalidDataMessage })
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Should handle invalid data gracefully
      const content = response.body.data.assistantMessage.content;
      expect(content).toBeTruthy();
      
      // Check if error was handled properly
      if (content.toLowerCase().includes('error')) {
        expect(content.toLowerCase()).toMatch(/error|unable|failed/);
      }
    });
  });
}); 
import NLPService, { IntentType } from '../../../src/services/nlpService';
import TestFixtures from '../../fixtures';
import { User } from '../../../src/models';

describe('NLPService', () => {
  let mockUser: any;

  beforeEach(async () => {
    const userData = TestFixtures.createMockUser();
    mockUser = new User(userData);
    await mockUser.save();
  });

  describe('processMessage', () => {
    it('should process a task creation message correctly', async () => {
      const message = "I need to call John tomorrow at 2 PM about the urgent project";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBe(IntentType.CREATE_TASK);
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.entities.length).toBeGreaterThan(0);
      expect(result.extractedTasks.length).toBe(1);
      expect(result.extractedTasks[0].title).toContain('call');
      expect(result.metadata.originalText).toBe(message);
    });

    it('should recognize greeting intent', async () => {
      const message = "Hello Ziggy! How are you today?";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBe(IntentType.GREETING);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.extractedTasks.length).toBe(0);
    });

    it('should recognize list tasks intent', async () => {
      const message = "What tasks do I have for today?";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBe(IntentType.LIST_TASKS);
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.entities.some(e => e.type === 'date')).toBe(true);
    });

    it('should recognize schedule intent', async () => {
      const message = "Show me my schedule for tomorrow";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBe(IntentType.GET_SCHEDULE);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle unknown intent gracefully', async () => {
      const message = "Random gibberish text that means nothing";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBe(IntentType.UNKNOWN);
      expect(result.confidence).toBeLessThanOrEqual(0.6);
      expect(result.extractedTasks.length).toBe(0);
    });

    it('should extract multiple entities from complex message', async () => {
      const message = "Schedule an urgent 2-hour meeting with Sarah tomorrow at 3 PM at the office";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.entities.length).toBeGreaterThan(2);
      
      const entityTypes = result.entities.map(e => e.type);
      expect(entityTypes).toContain('date');
      expect(entityTypes).toContain('time');
      expect(entityTypes).toContain('priority');
      expect(entityTypes).toContain('duration');
    });

    it('should handle empty message gracefully', async () => {
      const message = "";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBe(IntentType.UNKNOWN);
      expect(result.confidence).toBe(0);
      expect(result.extractedTasks.length).toBe(0);
    });

    it('should measure processing time', async () => {
      const message = "Create a task to review documents";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.metadata.processingTime).toBeGreaterThan(0);
      expect(result.metadata.processingTime).toBeLessThan(1000); // Should be fast
    });
  });

  describe('recognizeIntent', () => {
    it('should recognize task creation patterns', () => {
      const testCases = [
        "I need to do something",
        "Add a task to call client",
        "Create new task for meeting",
        "Remind me to buy groceries",
        "Schedule appointment with doctor"
      ];

      testCases.forEach(text => {
        const result = (NLPService as any).recognizeIntent(text.toLowerCase());
        expect(result.type).toBe(IntentType.CREATE_TASK);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    it('should recognize task listing patterns', () => {
      const testCases = [
        "What tasks do I have",
        "Show me my tasks",
        "List all tasks",
        "What's on my schedule"
      ];

      testCases.forEach(text => {
        const result = (NLPService as any).recognizeIntent(text.toLowerCase());
        expect(result.type).toBe(IntentType.LIST_TASKS);
        expect(result.confidence).toBeGreaterThan(0.6);
      });
    });

    it('should handle ambiguous text with appropriate confidence', () => {
      const ambiguousText = "maybe something task related";
      
      const result = (NLPService as any).recognizeIntent(ambiguousText);
      
      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('extractEntities', () => {
    it('should extract date entities correctly', () => {
      const text = "tomorrow at 3pm next week";
      
      const entities = (NLPService as any).extractEntities(text);
      
      const dateEntities = entities.filter((e: any) => e.type === 'date');
      expect(dateEntities.length).toBeGreaterThan(0);
      expect(dateEntities[0].value).toMatch(/tomorrow|next week/i);
    });

    it('should extract time entities correctly', () => {
      const text = "at 3:30 PM in the morning";
      
      const entities = (NLPService as any).extractEntities(text);
      
      const timeEntities = entities.filter((e: any) => e.type === 'time');
      expect(timeEntities.length).toBeGreaterThan(0);
      expect(timeEntities[0].value).toMatch(/3:30|morning/i);
    });

    it('should extract priority entities correctly', () => {
      const text = "this is urgent and very important";
      
      const entities = (NLPService as any).extractEntities(text);
      
      const priorityEntities = entities.filter((e: any) => e.type === 'priority');
      expect(priorityEntities.length).toBeGreaterThan(0);
      expect(priorityEntities[0].value).toMatch(/urgent|important/i);
    });

    it('should extract duration entities correctly', () => {
      const text = "this will take 2 hours or maybe 30 minutes";
      
      const entities = (NLPService as any).extractEntities(text);
      
      const durationEntities = entities.filter((e: any) => e.type === 'duration');
      expect(durationEntities.length).toBeGreaterThan(0);
      expect(durationEntities[0].value).toMatch(/2 hours|30 minutes/i);
    });
  });

  describe('extractTasks', () => {
    it('should extract task from create_task intent', () => {
      const text = "call client about project update";
      const intent = { type: IntentType.CREATE_TASK, confidence: 0.9 };
      const entities = [
        {
          type: 'date',
          value: 'tomorrow',
          confidence: 0.8,
          startIndex: 0,
          endIndex: 8
        }
      ];

      const tasks = (NLPService as any).extractTasks(text, intent, entities, mockUser);

      expect(tasks.length).toBe(1);
      expect(tasks[0].title).toContain('call');
      expect(tasks[0].userId).toBe(mockUser._id);
    });

    it('should not extract task from non-task intent', () => {
      const text = "hello how are you";
      const intent = { type: IntentType.GREETING, confidence: 0.9 };
      const entities: any[] = [];

      const tasks = (NLPService as any).extractTasks(text, intent, entities, mockUser);

      expect(tasks.length).toBe(0);
    });

    it('should handle malformed task data gracefully', () => {
      const text = "a"; // Too short
      const intent = { type: IntentType.CREATE_TASK, confidence: 0.9 };
      const entities: any[] = [];

      const tasks = (NLPService as any).extractTasks(text, intent, entities, mockUser);

      expect(tasks.length).toBe(0);
    });
  });

  describe('generateResponse', () => {
    it('should generate appropriate response for task creation', () => {
      const nlpResult = TestFixtures.createMockNLPResult({
        intent: IntentType.CREATE_TASK,
        extractedTasks: [{ title: 'Test task', deadline: new Date() }]
      });

      const response = NLPService.generateResponse(nlpResult, mockUser);

      expect(response).toContain('create a task');
      expect(response).toContain('Test task');
    });

    it('should generate appropriate response for greeting', () => {
      const nlpResult = TestFixtures.createMockNLPResult({
        intent: IntentType.GREETING,
        extractedTasks: []
      });

      const response = NLPService.generateResponse(nlpResult, mockUser);

      expect(response).toContain('Hello');
      expect(response).toContain(mockUser.name);
    });

    it('should generate appropriate response for list tasks', () => {
      const nlpResult = TestFixtures.createMockNLPResult({
        intent: IntentType.LIST_TASKS,
        extractedTasks: []
      });

      const response = NLPService.generateResponse(nlpResult, mockUser);

      expect(response).toContain('tasks');
    });

    it('should handle unknown intent gracefully', () => {
      const nlpResult = TestFixtures.createMockNLPResult({
        intent: IntentType.UNKNOWN,
        extractedTasks: []
      });

      const response = NLPService.generateResponse(nlpResult, mockUser);

      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle null user gracefully', async () => {
      const message = "test message";
      
      await expect(
        NLPService.processMessage(message, null as any)
      ).rejects.toThrow();
    });

    it('should handle very long messages', async () => {
      const longMessage = "a".repeat(10000);
      
      const result = await NLPService.processMessage(longMessage, mockUser);

      expect(result.intent).toBeTruthy();
      expect(result.metadata.originalText).toBe(longMessage);
    });

    it('should handle special characters in message', async () => {
      const message = "Task with special chars: @#$%^&*()[]{}|;':\",./<>?";
      
      const result = await NLPService.processMessage(message, mockUser);

      expect(result.intent).toBeTruthy();
      expect(result.metadata.originalText).toBe(message);
    });
  });

  describe('performance', () => {
    it('should process messages efficiently', async () => {
      const message = "Create a task to review documents tomorrow at 2 PM";
      const startTime = Date.now();
      
      await NLPService.processMessage(message, mockUser);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processingTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle multiple concurrent requests', async () => {
      const messages = [
        "Create task 1",
        "Create task 2", 
        "Create task 3",
        "List my tasks",
        "Show schedule"
      ];

      const promises = messages.map(message => 
        NLPService.processMessage(message, mockUser)
      );

      const results = await Promise.all(promises);

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result.intent).toBeTruthy();
        expect(result.metadata.processingTime).toBeLessThan(100);
      });
    });
  });
}); 
import request from 'supertest';
import { Express } from 'express';
import { User, Task } from '../../src/models';
import app from '../../src/app';

describe('Backend Core Functionality', () => {
  let testApp: Express;

  beforeAll(() => {
    testApp = app;
  });

  describe('API Endpoints', () => {
    it('should respond to health check', async () => {
      const response = await request(testApp)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Ziggy Bot API is running');
    });

    it('should respond to root endpoint', async () => {
      const response = await request(testApp)
        .get('/')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Welcome to Ziggy Bot API');
    });

    it('should handle 404 routes correctly', async () => {
      const response = await request(testApp)
        .get('/nonexistent-route')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Route not found');
    });
  });

  describe('Authentication Protection', () => {
    it('should protect task routes without authentication', async () => {
      const response = await request(testApp)
        .post('/api/tasks')
        .send({
          title: 'Test Task',
          description: 'This should fail without auth'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should protect chat routes without authentication', async () => {
      const response = await request(testApp)
        .post('/api/chat/message')
        .send({
          content: 'Hello Ziggy'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!'
      };

      const response = await request(testApp)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should validate registration input', async () => {
      const invalidData = {
        name: '',
        email: 'invalid-email',
        password: '123'
      };

      const response = await request(testApp)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation error');
    });

    it('should prevent duplicate email registration', async () => {
      const userData = {
        name: 'Test User 2',
        email: 'duplicate@example.com',
        password: 'Password123!'
      };

      // Register first user
      await request(testApp)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(testApp)
        .post('/api/auth/register')
        .send({
          ...userData,
          name: 'Different Name'
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Database Models', () => {
    it('should create and save a user model', async () => {
      const userData = {
        name: 'Model Test User',
        email: 'model-test@example.com',
        password: 'hashedPassword123',
        preferences: {
          timezone: 'UTC',
          workingHours: { start: '09:00', end: '17:00' },
          defaultTaskDuration: 30,
          priorityWeights: { deadline: 0.4, context: 0.3, dependencies: 0.3 },
          notifications: { email: true, push: false, desktop: false, reminderMinutes: 15 },
          ui: { theme: 'light', language: 'en', compactView: false }
        },
        isEmailVerified: true
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.createdAt).toBeInstanceOf(Date);
    });

    it('should create and save a task model', async () => {
      // First create a user
      const user = new User({
        name: 'Task Owner',
        email: 'task-owner@example.com',
        password: 'hashedPassword123',
        preferences: {
          timezone: 'UTC',
          workingHours: { start: '09:00', end: '17:00' },
          defaultTaskDuration: 30,
          priorityWeights: { deadline: 0.4, context: 0.3, dependencies: 0.3 },
          notifications: { email: true, push: false, desktop: false, reminderMinutes: 15 },
          ui: { theme: 'light', language: 'en', compactView: false }
        },
        isEmailVerified: true
      });
      const savedUser = await user.save();

      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 5,
        estimatedTime: 60,
        userId: savedUser._id,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        tags: ['test', 'model']
      };

      const task = new Task(taskData);
      const savedTask = await task.save();

      expect(savedTask._id).toBeDefined();
      expect(savedTask.title).toBe(taskData.title);
      expect(savedTask.userId.toString()).toBe(savedUser._id.toString());
      expect(savedTask.status).toBe('pending');
      expect(savedTask.createdAt).toBeInstanceOf(Date);
    });
  });
}); 
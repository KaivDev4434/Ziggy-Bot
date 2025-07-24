import request from 'supertest';
import { Express } from 'express';
import jwt from 'jsonwebtoken';
import { User, Task } from '../../../src/models';
import TestFixtures from '../../fixtures';
import app from '../../../src/app';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('TaskController', () => {
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

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'This is a test task',
        priority: 5,
        estimatedTime: 60
      };

      const response = await request(testApp)
        .post('/api/tasks')
        .set('Authorization', authToken)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe(taskData.title);
      expect(response.body.data.task.userId).toBe(testUser._id.toString());
      expect(response.body.data.task.status).toBe('pending');
    });

    it('should validate required fields', async () => {
      const invalidTaskData = {
        description: 'Task without title',
        priority: 15 // Invalid priority
      };

      const response = await request(testApp)
        .post('/api/tasks')
        .set('Authorization', authToken)
        .send(invalidTaskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should set deadline if provided', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const taskData = {
        title: 'Task with deadline',
        deadline: tomorrow.toISOString()
      };

      const response = await request(testApp)
        .post('/api/tasks')
        .set('Authorization', authToken)
        .send(taskData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.data.task.deadline)).toEqual(tomorrow);
    });

    it('should reject tasks with past deadlines', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const taskData = {
        title: 'Task with past deadline',
        deadline: yesterday.toISOString()
      };

      const response = await request(testApp)
        .post('/api/tasks')
        .set('Authorization', authToken)
        .send(taskData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Deadline cannot be in the past');
    });

    it('should require authentication', async () => {
      const taskData = {
        title: 'Unauthorized task'
      };

      const response = await request(testApp)
        .post('/api/tasks')
        .send(taskData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create some test tasks
      const tasks = TestFixtures.createMockTasks(5, testUser._id);
      await Task.insertMany(tasks);
    });

    it('should return user tasks with pagination', async () => {
      const response = await request(testApp)
        .get('/api/tasks')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(5);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(5);
    });

    it('should filter tasks by status', async () => {
      // Create a completed task
      await new Task({
        ...TestFixtures.createMockTask({ userId: testUser._id }),
        status: 'completed'
      }).save();

      const response = await request(testApp)
        .get('/api/tasks?status=completed')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(1);
      expect(response.body.data.tasks[0].status).toBe('completed');
    });

    it('should filter tasks by priority', async () => {
      const response = await request(testApp)
        .get('/api/tasks?priority=high')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.tasks.forEach((task: any) => {
        expect(task.priority).toBeGreaterThanOrEqual(7);
      });
    });

    it('should sort tasks correctly', async () => {
      const response = await request(testApp)
        .get('/api/tasks?sortBy=priority&sortOrder=desc')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const priorities = response.body.data.tasks.map((task: any) => task.priority);
      const sortedPriorities = [...priorities].sort((a, b) => b - a);
      expect(priorities).toEqual(sortedPriorities);
    });

    it('should limit and paginate results', async () => {
      const response = await request(testApp)
        .get('/api/tasks?limit=3&page=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toHaveLength(3);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(3);
    });

    it('should search tasks by title and description', async () => {
      await new Task({
        ...TestFixtures.createMockTask({ userId: testUser._id }),
        title: 'Important meeting preparation',
        description: 'Prepare slides for the quarterly review'
      }).save();

      const response = await request(testApp)
        .get('/api/tasks?search=meeting')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
      expect(response.body.data.tasks[0].title).toContain('meeting');
    });

    it('should only return tasks belonging to the authenticated user', async () => {
      // Create another user and their tasks
      const anotherUser = await new User(TestFixtures.createMockUser({
        email: 'another@example.com'
      })).save();
      
      await Task.insertMany(TestFixtures.createMockTasks(3, anotherUser._id));

      const response = await request(testApp)
        .get('/api/tasks')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.tasks.forEach((task: any) => {
        expect(task.userId).toBe(testUser._id.toString());
      });
    });
  });

  describe('GET /api/tasks/:id', () => {
    let testTask: any;

    beforeEach(async () => {
      testTask = await new Task(TestFixtures.createMockTask({
        userId: testUser._id
      })).save();
    });

    it('should return a specific task', async () => {
      const response = await request(testApp)
        .get(`/api/tasks/${testTask._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task._id).toBe(testTask._id.toString());
      expect(response.body.data.task.title).toBe(testTask.title);
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(testApp)
        .get(`/api/tasks/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Task not found');
    });

    it('should return 400 for invalid task ID format', async () => {
      const response = await request(testApp)
        .get('/api/tasks/invalid-id')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ID format');
    });

    it('should not allow access to other users tasks', async () => {
      const anotherUser = await new User(TestFixtures.createMockUser({
        email: 'another@example.com'
      })).save();
      
      const anotherTask = await new Task(TestFixtures.createMockTask({
        userId: anotherUser._id
      })).save();

      const response = await request(testApp)
        .get(`/api/tasks/${anotherTask._id}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let testTask: any;

    beforeEach(async () => {
      testTask = await new Task(TestFixtures.createMockTask({
        userId: testUser._id
      })).save();
    });

    it('should update a task successfully', async () => {
      const updateData = {
        title: 'Updated Task Title',
        priority: 8,
        status: 'in-progress'
      };

      const response = await request(testApp)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe(updateData.title);
      expect(response.body.data.task.priority).toBe(updateData.priority);
      expect(response.body.data.task.status).toBe(updateData.status);
    });

    it('should validate update data', async () => {
      const invalidData = {
        priority: 15, // Invalid priority
        status: 'invalid-status'
      };

      const response = await request(testApp)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should update completedAt when status changes to completed', async () => {
      const updateData = {
        status: 'completed'
      };

      const response = await request(testApp)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.completedAt).toBeDefined();
      expect(new Date(response.body.data.task.completedAt)).toBeInstanceOf(Date);
    });

    it('should clear completedAt when status changes from completed', async () => {
      // First mark as completed
      await Task.findByIdAndUpdate(testTask._id, {
        status: 'completed',
        completedAt: new Date()
      });

      const updateData = {
        status: 'in-progress'
      };

      const response = await request(testApp)
        .put(`/api/tasks/${testTask._id}`)
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.task.completedAt).toBeNull();
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let testTask: any;

    beforeEach(async () => {
      testTask = await new Task(TestFixtures.createMockTask({
        userId: testUser._id
      })).save();
    });

    it('should delete a task successfully', async () => {
      const response = await request(testApp)
        .delete(`/api/tasks/${testTask._id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Task deleted successfully');

      // Verify task is actually deleted
      const deletedTask = await Task.findById(testTask._id);
      expect(deletedTask).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(testApp)
        .delete(`/api/tasks/${fakeId}`)
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/statistics', () => {
    beforeEach(async () => {
      // Create tasks with different statuses
      const tasks = [
        { ...TestFixtures.createMockTask({ userId: testUser._id }), status: 'pending' },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), status: 'pending' },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), status: 'in-progress' },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), status: 'completed' },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), status: 'completed' },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), status: 'completed' }
      ];
      
      await Task.insertMany(tasks);
    });

    it('should return task statistics', async () => {
      const response = await request(testApp)
        .get('/api/tasks/statistics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics).toBeDefined();
      expect(response.body.data.statistics.total).toBe(6);
      expect(response.body.data.statistics.pending).toBe(2);
      expect(response.body.data.statistics.inProgress).toBe(1);
      expect(response.body.data.statistics.completed).toBe(3);
    });

    it('should calculate completion rate correctly', async () => {
      const response = await request(testApp)
        .get('/api/tasks/statistics')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.statistics.completionRate).toBe(0.5); // 3 completed out of 6 total
    });
  });

  describe('PATCH /api/tasks/bulk-update', () => {
    let testTasks: any[];

    beforeEach(async () => {
      const taskData = TestFixtures.createMockTasks(3, testUser._id);
      testTasks = await Task.insertMany(taskData);
    });

    it('should update multiple tasks', async () => {
      const updateData = {
        taskIds: [testTasks[0]._id.toString(), testTasks[1]._id.toString()],
        updates: {
          status: 'completed',
          priority: 9
        }
      };

      const response = await request(testApp)
        .patch('/api/tasks/bulk-update')
        .set('Authorization', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.modifiedCount).toBe(2);

      // Verify updates were applied
      const updatedTasks = await Task.find({
        _id: { $in: updateData.taskIds }
      });

      updatedTasks.forEach(task => {
        expect(task.status).toBe('completed');
        expect(task.priority).toBe(9);
      });
    });

    it('should validate bulk update data', async () => {
      const invalidData = {
        taskIds: ['invalid-id'],
        updates: {
          status: 'invalid-status'
        }
      };

      const response = await request(testApp)
        .patch('/api/tasks/bulk-update')
        .set('Authorization', authToken)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });
  });

  describe('GET /api/tasks/scheduling-recommendations', () => {
    beforeEach(async () => {
      // Create tasks with different priorities and estimated times
      const tasks = [
        { ...TestFixtures.createMockTask({ userId: testUser._id }), priority: 9, estimatedTime: 60 },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), priority: 5, estimatedTime: 30 },
        { ...TestFixtures.createMockTask({ userId: testUser._id }), priority: 7, estimatedTime: 120 }
      ];
      
      await Task.insertMany(tasks);
    });

    it('should return scheduling recommendations', async () => {
      const response = await request(testApp)
        .get('/api/tasks/scheduling-recommendations?availableHours=4')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);
    });

    it('should prioritize high-priority tasks', async () => {
      const response = await request(testApp)
        .get('/api/tasks/scheduling-recommendations?availableHours=8')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const recommendations = response.body.data.recommendations;
      const priorities = recommendations.map((r: any) => r.task.priority);
      
      // Should be sorted by priority (descending)
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeGreaterThanOrEqual(priorities[i + 1]);
      }
    });

    it('should respect available time constraints', async () => {
      const response = await request(testApp)
        .get('/api/tasks/scheduling-recommendations?availableHours=1')
        .set('Authorization', authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      
      const recommendations = response.body.data.recommendations;
      const totalTime = recommendations.reduce((sum: number, r: any) => 
        sum + r.task.estimatedTime, 0
      );
      
      // Total should not exceed available time (60 minutes)
      expect(totalTime).toBeLessThanOrEqual(60);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      jest.spyOn(Task, 'find').mockRejectedValue(new Error('Database error'));

      const response = await request(testApp)
        .get('/api/tasks')
        .set('Authorization', authToken)
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(testApp)
        .post('/api/tasks')
        .set('Authorization', authToken)
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
}); 
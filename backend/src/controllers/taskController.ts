import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Task, ITask, TaskStatus } from '../models';
import { logger } from '../config/logger';

export interface TaskResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export class TaskController {
  /**
   * Create a new task
   * POST /api/tasks
   */
  static createTask = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const taskData = {
        ...req.body,
        userId: req.userId
      };

      // Handle dependencies - ensure they exist and belong to the user
      if (taskData.dependencies && taskData.dependencies.length > 0) {
        const dependencyTasks = await Task.find({
          _id: { $in: taskData.dependencies },
          userId: req.userId
        });

        if (dependencyTasks.length !== taskData.dependencies.length) {
          res.status(400).json({
            success: false,
            message: 'One or more dependency tasks not found or not accessible'
          });
          return;
        }
      }

      // Handle parent task - ensure it exists and belongs to the user
      if (taskData.parentTask) {
        const parentTask = await Task.findOne({
          _id: taskData.parentTask,
          userId: req.userId
        });

        if (!parentTask) {
          res.status(400).json({
            success: false,
            message: 'Parent task not found or not accessible'
          });
          return;
        }
      }

      const task = new Task(taskData);
      await task.save();

      // If this task has a parent, add it to parent's subtasks
      if (taskData.parentTask) {
        await Task.findByIdAndUpdate(
          taskData.parentTask,
          { $addToSet: { subtasks: task._id } }
        );
      }

      // Populate dependencies and parent task for response
      await task.populate([
        { path: 'dependencies', select: 'title status priority' },
        { path: 'parentTask', select: 'title status priority' },
        { path: 'subtasks', select: 'title status priority' }
      ]);

      logger.info('Task created successfully', {
        taskId: task._id,
        userId: req.userId,
        title: task.title
      });

      res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: { task }
      } as TaskResponse);

    } catch (error) {
      logger.error('Create task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create task',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get all tasks for the authenticated user
   * GET /api/tasks
   */
  static getTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const {
        status,
        priority,
        tags,
        search,
        sortBy = 'priority',
        sortOrder = 'desc',
        limit = 20,
        page = 1
      } = req.query;

      // Build query
      const query: any = { userId: req.userId };

      if (status) {
        query.status = status;
      }

      if (priority) {
        query.priority = parseInt(priority as string);
      }

      if (tags) {
        query.tags = { $in: (tags as string).split(',') };
      }

      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { context: { $regex: search, $options: 'i' } }
        ];
      }

      // Build sort object
      const sort: any = {};
      sort[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

      // Add secondary sort by createdAt for consistent ordering
      if (sortBy !== 'createdAt') {
        sort.createdAt = -1;
      }

      // Calculate pagination
      const limitNum = Math.min(parseInt(limit as string), 100);
      const pageNum = Math.max(parseInt(page as string), 1);
      const skip = (pageNum - 1) * limitNum;

      // Execute query with pagination
      const [tasks, total] = await Promise.all([
        Task.find(query)
          .sort(sort)
          .limit(limitNum)
          .skip(skip)
          .populate([
            { path: 'dependencies', select: 'title status priority' },
            { path: 'parentTask', select: 'title status priority' },
            { path: 'subtasks', select: 'title status priority' }
          ])
          .lean(),
        Task.countDocuments(query)
      ]);

      const pages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        message: 'Tasks retrieved successfully',
        data: { tasks },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages
        }
      } as TaskResponse);

    } catch (error) {
      logger.error('Get tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve tasks',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get a specific task by ID
   * GET /api/tasks/:id
   */
  static getTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = req.resource; // Set by ownership middleware

      await task.populate([
        { path: 'dependencies', select: 'title status priority deadline' },
        { path: 'parentTask', select: 'title status priority deadline' },
        { path: 'subtasks', select: 'title status priority deadline' }
      ]);

      res.status(200).json({
        success: true,
        message: 'Task retrieved successfully',
        data: { task }
      } as TaskResponse);

    } catch (error) {
      logger.error('Get task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve task',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Update a task
   * PUT /api/tasks/:id
   */
  static updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = req.resource; // Set by ownership middleware
      const updates = req.body;

      // Handle dependencies update
      if (updates.dependencies) {
        const dependencyTasks = await Task.find({
          _id: { $in: updates.dependencies },
          userId: req.userId
        });

        if (dependencyTasks.length !== updates.dependencies.length) {
          res.status(400).json({
            success: false,
            message: 'One or more dependency tasks not found or not accessible'
          });
          return;
        }
      }

      // Handle parent task update
      if (updates.parentTask && updates.parentTask !== task.parentTask?.toString()) {
        // Remove from old parent's subtasks
        if (task.parentTask) {
          await Task.findByIdAndUpdate(
            task.parentTask,
            { $pull: { subtasks: task._id } }
          );
        }

        // Add to new parent's subtasks
        if (updates.parentTask) {
          const parentTask = await Task.findOne({
            _id: updates.parentTask,
            userId: req.userId
          });

          if (!parentTask) {
            res.status(400).json({
              success: false,
              message: 'Parent task not found or not accessible'
            });
            return;
          }

          await Task.findByIdAndUpdate(
            updates.parentTask,
            { $addToSet: { subtasks: task._id } }
          );
        }
      }

      // Apply updates
      Object.assign(task, updates);
      await task.save();

      await task.populate([
        { path: 'dependencies', select: 'title status priority' },
        { path: 'parentTask', select: 'title status priority' },
        { path: 'subtasks', select: 'title status priority' }
      ]);

      logger.info('Task updated successfully', {
        taskId: task._id,
        userId: req.userId,
        updatedFields: Object.keys(updates)
      });

      res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: { task }
      } as TaskResponse);

    } catch (error) {
      logger.error('Update task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update task',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Delete a task
   * DELETE /api/tasks/:id
   */
  static deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = req.resource; // Set by ownership middleware

      // Handle subtasks - either delete them or remove parent reference
      if (task.subtasks && task.subtasks.length > 0) {
        const { action = 'orphan' } = req.query;

        if (action === 'cascade') {
          // Delete all subtasks
          await Task.deleteMany({ _id: { $in: task.subtasks } });
        } else {
          // Remove parent reference from subtasks (orphan them)
          await Task.updateMany(
            { _id: { $in: task.subtasks } },
            { $unset: { parentTask: 1 } }
          );
        }
      }

      // Remove this task from parent's subtasks
      if (task.parentTask) {
        await Task.findByIdAndUpdate(
          task.parentTask,
          { $pull: { subtasks: task._id } }
        );
      }

      // Remove this task from other tasks' dependencies
      await Task.updateMany(
        { dependencies: task._id },
        { $pull: { dependencies: task._id } }
      );

      // Delete the task
      await Task.findByIdAndDelete(task._id);

      logger.info('Task deleted successfully', {
        taskId: task._id,
        userId: req.userId,
        title: task.title
      });

      res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      } as TaskResponse);

    } catch (error) {
      logger.error('Delete task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete task',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Mark task as started
   * PATCH /api/tasks/:id/start
   */
  static startTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = req.resource; // Set by ownership middleware

      if (task.status !== TaskStatus.PENDING) {
        res.status(400).json({
          success: false,
          message: 'Task must be in pending status to start'
        });
        return;
      }

      task.markStarted();
      await task.save();

      logger.info('Task started', {
        taskId: task._id,
        userId: req.userId
      });

      res.status(200).json({
        success: true,
        message: 'Task started successfully',
        data: { task }
      } as TaskResponse);

    } catch (error) {
      logger.error('Start task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start task',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Mark task as completed
   * PATCH /api/tasks/:id/complete
   */
  static completeTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = req.resource; // Set by ownership middleware

      if (task.status === TaskStatus.COMPLETED) {
        res.status(400).json({
          success: false,
          message: 'Task is already completed'
        });
        return;
      }

      task.markCompleted();
      await task.save();

      logger.info('Task completed', {
        taskId: task._id,
        userId: req.userId,
        actualTime: task.actualTime
      });

      res.status(200).json({
        success: true,
        message: 'Task completed successfully',
        data: { task }
      } as TaskResponse);

    } catch (error) {
      logger.error('Complete task error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete task',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get task statistics
   * GET /api/tasks/stats
   */
  static getTaskStats = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const stats = await Task.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
            },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelled: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$deadline', null] },
                      { $lt: ['$deadline', new Date()] },
                      { $ne: ['$status', 'completed'] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            avgPriority: { $avg: '$priority' },
            totalEstimatedTime: { $sum: '$estimatedTime' },
            totalActualTime: { $sum: '$actualTime' }
          }
        }
      ]);

      const result = stats[0] || {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        overdue: 0,
        avgPriority: 0,
        totalEstimatedTime: 0,
        totalActualTime: 0
      };

      res.status(200).json({
        success: true,
        message: 'Task statistics retrieved successfully',
        data: { stats: result }
      } as TaskResponse);

    } catch (error) {
      logger.error('Get task stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve task statistics',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Bulk update tasks
   * PATCH /api/tasks/bulk
   */
  static bulkUpdateTasks = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { taskIds, updates } = req.body;

      if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Task IDs array is required'
        });
        return;
      }

      if (!updates || Object.keys(updates).length === 0) {
        res.status(400).json({
          success: false,
          message: 'Updates object is required'
        });
        return;
      }

      // Verify all tasks belong to the user
      const userTasks = await Task.find({
        _id: { $in: taskIds },
        userId: req.userId
      });

      if (userTasks.length !== taskIds.length) {
        res.status(403).json({
          success: false,
          message: 'Some tasks not found or not accessible'
        });
        return;
      }

      // Perform bulk update
      const result = await Task.updateMany(
        {
          _id: { $in: taskIds },
          userId: req.userId
        },
        { $set: updates }
      );

      logger.info('Bulk task update completed', {
        userId: req.userId,
        taskCount: taskIds.length,
        modifiedCount: result.modifiedCount,
        updates: Object.keys(updates)
      });

      res.status(200).json({
        success: true,
        message: 'Tasks updated successfully',
        data: {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount
        }
      } as TaskResponse);

    } catch (error) {
      logger.error('Bulk update tasks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update tasks',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };
}

export default TaskController; 
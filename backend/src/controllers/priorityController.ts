import { Request, Response } from 'express';
import { Task, User } from '../models';
import { PriorityService } from '../services/priorityService';
import { logger } from '../config/logger';

export interface PriorityResponse {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class PriorityController {
  /**
   * Calculate dynamic priority for a specific task
   * POST /api/tasks/:id/calculate-priority
   */
  static calculateTaskPriority = async (req: Request, res: Response): Promise<void> => {
    try {
      const task = req.resource; // Set by ownership middleware
      
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get related tasks for context
      const relatedTasks = await Task.find({
        userId: req.userId,
        $or: [
          { dependencies: task._id },
          { _id: { $in: task.dependencies || [] } },
          { parentTask: task._id },
          { _id: task.parentTask }
        ]
      });

      const result = PriorityService.calculateDynamicPriority(
        task,
        req.user,
        relatedTasks
      );

      res.status(200).json({
        success: true,
        message: 'Priority calculated successfully',
        data: {
          taskId: task._id,
          currentPriority: task.priority,
          calculatedPriority: result.finalPriority,
          factors: result.factors,
          urgencyLevel: result.urgencyLevel,
          recommendation: result.recommendation
        }
      } as PriorityResponse);

    } catch (error) {
      logger.error('Calculate task priority error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate task priority',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Recalculate priorities for all user tasks
   * POST /api/tasks/recalculate-priorities
   */
  static recalculateAllPriorities = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get all user tasks
      const tasks = await Task.find({
        userId: req.userId,
        status: { $ne: 'completed' } // Don't recalculate completed tasks
      });

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Batch calculate priorities
      const results = await PriorityService.batchRecalculatePriorities(tasks, user);

      // Update tasks with new priorities (optional - based on query parameter)
      const { updateTasks = false } = req.query;
      
      if (updateTasks === 'true') {
        const updatePromises = results.map(async ({ taskId, result }) => {
          return Task.findByIdAndUpdate(
            taskId,
            { 
              priority: result.finalPriority,
              $push: {
                priorityHistory: {
                  priority: result.finalPriority,
                  calculatedAt: new Date(),
                  factors: result.factors,
                  urgencyLevel: result.urgencyLevel
                }
              }
            },
            { new: true }
          );
        });

        await Promise.all(updatePromises);
      }

      logger.info('Priorities recalculated for all tasks', {
        userId: req.userId,
        taskCount: tasks.length,
        updated: updateTasks === 'true'
      });

      res.status(200).json({
        success: true,
        message: 'Priorities recalculated successfully',
        data: {
          taskCount: tasks.length,
          results,
          updated: updateTasks === 'true'
        }
      } as PriorityResponse);

    } catch (error) {
      logger.error('Recalculate all priorities error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to recalculate priorities',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get scheduling recommendations
   * GET /api/tasks/scheduling-recommendations
   */
  static getSchedulingRecommendations = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { 
        availableHours = 8,
        includeStatus = 'pending,in-progress',
        date
      } = req.query;

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Parse status filter
      const statusFilter = (includeStatus as string).split(',');

      // Get tasks for scheduling
      const query: any = {
        userId: req.userId,
        status: { $in: statusFilter }
      };

      // Add date filter if provided
      if (date) {
        const targetDate = new Date(date as string);
        const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));
        
        query.$or = [
          { deadline: { $gte: startOfDay, $lte: endOfDay } },
          { deadline: null }, // Include tasks without deadlines
          { deadline: { $gte: endOfDay } } // Include future tasks
        ];
      }

      const tasks = await Task.find(query).sort({ priority: -1 });

      const recommendations = PriorityService.generateSchedulingRecommendations(
        tasks,
        user,
        parseInt(availableHours as string)
      );

      res.status(200).json({
        success: true,
        message: 'Scheduling recommendations generated successfully',
        data: {
          date: date || new Date().toISOString().split('T')[0],
          availableHours: parseInt(availableHours as string),
          recommendations
        }
      } as PriorityResponse);

    } catch (error) {
      logger.error('Get scheduling recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate scheduling recommendations',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Update user priority weights
   * PUT /api/auth/priority-weights
   */
  static updatePriorityWeights = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { deadline, context, dependencies } = req.body;

      // Validate weights sum to approximately 1.0
      const sum = deadline + context + dependencies;
      if (Math.abs(sum - 1.0) > 0.1) {
        res.status(400).json({
          success: false,
          message: 'Priority weights must sum to approximately 1.0'
        });
        return;
      }

      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          $set: {
            'preferences.priorityWeights': {
              deadline,
              context,
              dependencies
            }
          }
        },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      logger.info('Priority weights updated', {
        userId: req.userId,
        newWeights: { deadline, context, dependencies }
      });

      res.status(200).json({
        success: true,
        message: 'Priority weights updated successfully',
        data: {
          priorityWeights: user.preferences?.priorityWeights
        }
      } as PriorityResponse);

    } catch (error) {
      logger.error('Update priority weights error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update priority weights',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get priority analytics
   * GET /api/tasks/priority-analytics
   */
  static getPriorityAnalytics = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { timeframe = '30' } = req.query;
      const days = parseInt(timeframe as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get task completion data
      const completedTasks = await Task.find({
        userId: req.userId,
        status: 'completed',
        completedAt: { $gte: startDate }
      }).select('priority originalPriority completedAt estimatedTime actualTime');

      // Calculate analytics
      const totalTasks = completedTasks.length;
      const avgPriority = totalTasks > 0 
        ? completedTasks.reduce((sum, task) => sum + (task.priority || 5), 0) / totalTasks
        : 0;

      const priorityDistribution = {
        low: completedTasks.filter(t => (t.priority || 5) <= 3).length,
        medium: completedTasks.filter(t => (t.priority || 5) >= 4 && (t.priority || 5) <= 6).length,
        high: completedTasks.filter(t => (t.priority || 5) >= 7 && (t.priority || 5) <= 8).length,
        critical: completedTasks.filter(t => (t.priority || 5) >= 9).length
      };

      // Time estimation accuracy
      const tasksWithBothTimes = completedTasks.filter(t => t.estimatedTime && t.actualTime);
      const estimationAccuracy = tasksWithBothTimes.length > 0
        ? tasksWithBothTimes.reduce((sum, task) => {
            const accuracy = Math.min(task.estimatedTime! / task.actualTime!, task.actualTime! / task.estimatedTime!);
            return sum + accuracy;
          }, 0) / tasksWithBothTimes.length
        : 0;

      res.status(200).json({
        success: true,
        message: 'Priority analytics retrieved successfully',
        data: {
          timeframe: `${days} days`,
          totalTasksCompleted: totalTasks,
          averagePriority: Math.round(avgPriority * 100) / 100,
          priorityDistribution,
          estimationAccuracy: Math.round(estimationAccuracy * 100) / 100,
          tasksWithTimeData: tasksWithBothTimes.length
        }
      } as PriorityResponse);

    } catch (error) {
      logger.error('Get priority analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve priority analytics',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };
}

export default PriorityController; 
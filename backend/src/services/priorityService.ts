import { ITask, IUser } from '../models';
import { logger } from '../config/logger';

export interface PriorityFactors {
  deadline: number;
  context: number;
  dependencies: number;
  userImportance: number;
  estimatedTime: number;
  taskAge: number;
}

export interface PriorityWeights {
  deadline: number;
  context: number;
  dependencies: number;
}

export interface PriorityCalculationResult {
  finalPriority: number;
  factors: PriorityFactors;
  recommendation: string;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class PriorityService {
  /**
   * Calculate dynamic priority for a task
   */
  static calculateDynamicPriority(
    task: ITask,
    user: IUser,
    relatedTasks: ITask[] = [],
    currentTime: Date = new Date()
  ): PriorityCalculationResult {
    try {
      const weights = user.preferences?.priorityWeights || {
        deadline: 0.4,
        context: 0.3,
        dependencies: 0.3
      };

      const factors = this.calculatePriorityFactors(task, relatedTasks, currentTime);
      const finalPriority = this.computeWeightedPriority(factors, weights);
      const urgencyLevel = this.determineUrgencyLevel(finalPriority, factors);
      const recommendation = this.generateRecommendation(task, factors, urgencyLevel);

      logger.info('Priority calculated', {
        taskId: task._id,
        finalPriority,
        urgencyLevel,
        factors
      });

      return {
        finalPriority,
        factors,
        recommendation,
        urgencyLevel
      };

    } catch (error) {
      logger.error('Priority calculation error:', error);
      
      // Fallback to user-defined priority
      return {
        finalPriority: task.priority || 5,
        factors: {
          deadline: 0,
          context: 0,
          dependencies: 0,
          userImportance: task.priority || 5,
          estimatedTime: 0,
          taskAge: 0
        },
        recommendation: 'Using default priority due to calculation error',
        urgencyLevel: 'medium'
      };
    }
  }

  /**
   * Calculate individual priority factors
   */
  private static calculatePriorityFactors(
    task: ITask,
    relatedTasks: ITask[],
    currentTime: Date
  ): PriorityFactors {
    const deadlineFactor = this.calculateDeadlineFactor(task, currentTime);
    const contextFactor = this.calculateContextFactor(task, currentTime);
    const dependenciesFactor = this.calculateDependenciesFactor(task, relatedTasks);
    const userImportance = (task.priority || 5) / 10; // Normalize to 0-1
    const estimatedTimeFactor = this.calculateEstimatedTimeFactor(task);
    const taskAgeFactor = this.calculateTaskAgeFactor(task, currentTime);

    return {
      deadline: deadlineFactor,
      context: contextFactor,
      dependencies: dependenciesFactor,
      userImportance,
      estimatedTime: estimatedTimeFactor,
      taskAge: taskAgeFactor
    };
  }

  /**
   * Calculate deadline urgency factor (0-1)
   */
  private static calculateDeadlineFactor(task: ITask, currentTime: Date): number {
    if (!task.deadline) {
      return 0.3; // Default for tasks without deadlines
    }

    const timeToDeadline = task.deadline.getTime() - currentTime.getTime();
    const daysToDeadline = timeToDeadline / (1000 * 60 * 60 * 24);

    if (daysToDeadline < 0) {
      return 1.0; // Overdue - maximum urgency
    } else if (daysToDeadline <= 1) {
      return 0.9; // Due today or tomorrow
    } else if (daysToDeadline <= 3) {
      return 0.7; // Due within 3 days
    } else if (daysToDeadline <= 7) {
      return 0.5; // Due within a week
    } else if (daysToDeadline <= 30) {
      return 0.3; // Due within a month
    } else {
      return 0.1; // Due later
    }
  }

  /**
   * Calculate context relevance factor (0-1)
   */
  private static calculateContextFactor(task: ITask, currentTime: Date): number {
    let contextScore = 0.5; // Base score

    // Time-based context
    const hour = currentTime.getHours();
    
    // Check if task has time-sensitive context
    if (task.context) {
      const context = task.context.toLowerCase();
      
      // Morning tasks (6-12)
      if (hour >= 6 && hour < 12 && 
          (context.includes('morning') || context.includes('early') || context.includes('start'))) {
        contextScore += 0.3;
      }
      
      // Afternoon tasks (12-18)
      if (hour >= 12 && hour < 18 && 
          (context.includes('afternoon') || context.includes('lunch') || context.includes('meeting'))) {
        contextScore += 0.3;
      }
      
      // Evening tasks (18-22)
      if (hour >= 18 && hour < 22 && 
          (context.includes('evening') || context.includes('end') || context.includes('wrap'))) {
        contextScore += 0.3;
      }

      // Work vs Personal context
      if (context.includes('work') || context.includes('business') || context.includes('office')) {
        // Higher priority during work hours (9-17)
        if (hour >= 9 && hour <= 17) {
          contextScore += 0.2;
        }
      }

      // Urgent keywords
      if (context.includes('urgent') || context.includes('asap') || context.includes('important')) {
        contextScore += 0.4;
      }
    }

    // Day of week context
    const dayOfWeek = currentTime.getDay();
    if (task.tags) {
      const tagString = task.tags.join(' ').toLowerCase();
      
      // Weekend tasks
      if ((dayOfWeek === 0 || dayOfWeek === 6) && 
          (tagString.includes('weekend') || tagString.includes('personal'))) {
        contextScore += 0.2;
      }
      
      // Weekday tasks
      if (dayOfWeek >= 1 && dayOfWeek <= 5 && 
          (tagString.includes('work') || tagString.includes('business'))) {
        contextScore += 0.2;
      }
    }

    return Math.min(contextScore, 1.0);
  }

  /**
   * Calculate dependencies factor (0-1)
   */
  private static calculateDependenciesFactor(task: ITask, relatedTasks: ITask[]): number {
    let dependencyScore = 0.5; // Base score

    // Tasks blocking this task
    const blockingTasks = relatedTasks.filter(t => 
      task.dependencies && task.dependencies.includes(t._id)
    );
    
    const incompleteDependencies = blockingTasks.filter(t => t.status !== 'completed');
    
    if (incompleteDependencies.length > 0) {
      // Reduce priority if dependencies are not complete
      dependencyScore -= (incompleteDependencies.length * 0.2);
    } else if (blockingTasks.length > 0) {
      // All dependencies complete - boost priority
      dependencyScore += 0.3;
    }

    // Tasks this task is blocking
    const dependentTasks = relatedTasks.filter(t => 
      t.dependencies && t.dependencies.includes(task._id)
    );
    
    if (dependentTasks.length > 0) {
      // Boost priority if other tasks depend on this one
      dependencyScore += (dependentTasks.length * 0.15);
    }

    // Parent-child relationships
    if (task.parentTask) {
      dependencyScore += 0.1; // Slight boost for subtasks
    }

    return Math.max(0, Math.min(dependencyScore, 1.0));
  }

  /**
   * Calculate estimated time factor (0-1)
   */
  private static calculateEstimatedTimeFactor(task: ITask): number {
    if (!task.estimatedTime) {
      return 0.5; // Default for tasks without time estimates
    }

    // Favor shorter tasks for quick wins
    if (task.estimatedTime <= 15) {
      return 0.8; // Quick tasks
    } else if (task.estimatedTime <= 60) {
      return 0.6; // Medium tasks
    } else if (task.estimatedTime <= 240) {
      return 0.4; // Long tasks
    } else {
      return 0.2; // Very long tasks
    }
  }

  /**
   * Calculate task age factor (0-1)
   */
  private static calculateTaskAgeFactor(task: ITask, currentTime: Date): number {
    const taskAge = currentTime.getTime() - task.createdAt.getTime();
    const daysOld = taskAge / (1000 * 60 * 60 * 24);

    if (daysOld < 1) {
      return 0.3; // New tasks
    } else if (daysOld < 7) {
      return 0.5; // Recent tasks
    } else if (daysOld < 30) {
      return 0.7; // Older tasks need attention
    } else {
      return 0.9; // Very old tasks - urgent attention needed
    }
  }

  /**
   * Compute weighted priority score
   */
  private static computeWeightedPriority(
    factors: PriorityFactors,
    weights: PriorityWeights
  ): number {
    const weightedScore = (
      factors.deadline * weights.deadline +
      factors.context * weights.context +
      factors.dependencies * weights.dependencies
    );

    // Incorporate other factors with fixed weights
    const finalScore = (
      weightedScore * 0.7 + // Main weighted factors (70%)
      factors.userImportance * 0.15 + // User priority (15%)
      factors.estimatedTime * 0.1 + // Time factor (10%)
      factors.taskAge * 0.05 // Age factor (5%)
    );

    // Convert to 1-10 scale
    return Math.round(Math.max(1, Math.min(10, finalScore * 10)));
  }

  /**
   * Determine urgency level based on priority score
   */
  private static determineUrgencyLevel(
    priority: number,
    factors: PriorityFactors
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Override for overdue tasks
    if (factors.deadline >= 1.0) {
      return 'critical';
    }

    if (priority >= 9) {
      return 'critical';
    } else if (priority >= 7) {
      return 'high';
    } else if (priority >= 4) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate priority recommendation
   */
  private static generateRecommendation(
    task: ITask,
    factors: PriorityFactors,
    urgencyLevel: string
  ): string {
    const recommendations: string[] = [];

    if (factors.deadline >= 0.9) {
      if (factors.deadline >= 1.0) {
        recommendations.push('⚠️ OVERDUE - Immediate action required');
      } else {
        recommendations.push('⏰ Due very soon - High priority');
      }
    }

    if (factors.dependencies >= 0.8) {
      recommendations.push('🔗 Unblocks other tasks - Consider prioritizing');
    }

    if (factors.dependencies <= 0.3) {
      recommendations.push('⛔ Blocked by dependencies - Complete prerequisites first');
    }

    if (factors.context >= 0.8) {
      recommendations.push('🎯 Optimal timing - Good context match');
    }

    if (factors.estimatedTime >= 0.7) {
      recommendations.push('⚡ Quick win - Can be completed fast');
    }

    if (factors.taskAge >= 0.8) {
      recommendations.push('📅 Old task - Needs attention');
    }

    if (recommendations.length === 0) {
      switch (urgencyLevel) {
        case 'critical':
          recommendations.push('🔴 Critical priority - Focus on this task');
          break;
        case 'high':
          recommendations.push('🟠 High priority - Schedule soon');
          break;
        case 'medium':
          recommendations.push('🟡 Medium priority - Plan accordingly');
          break;
        default:
          recommendations.push('🟢 Low priority - Can be deferred');
      }
    }

    return recommendations.join(' | ');
  }

  /**
   * Batch recalculate priorities for multiple tasks
   */
  static async batchRecalculatePriorities(
    tasks: ITask[],
    user: IUser,
    currentTime: Date = new Date()
  ): Promise<Array<{ taskId: string; result: PriorityCalculationResult }>> {
    try {
      const results = tasks.map(task => {
        const relatedTasks = tasks.filter(t => 
          t._id !== task._id && (
            (task.dependencies && task.dependencies.includes(t._id)) ||
            (t.dependencies && t.dependencies.includes(task._id)) ||
            task.parentTask?.toString() === t._id.toString() ||
            t.parentTask?.toString() === task._id.toString()
          )
        );

        const result = this.calculateDynamicPriority(task, user, relatedTasks, currentTime);
        
        return {
          taskId: task._id.toString(),
          result
        };
      });

      logger.info('Batch priority calculation completed', {
        taskCount: tasks.length,
        userId: user._id
      });

      return results;

    } catch (error) {
      logger.error('Batch priority calculation error:', error);
      throw new Error('Failed to calculate priorities for tasks');
    }
  }

  /**
   * Get priority recommendations for task scheduling
   */
  static generateSchedulingRecommendations(
    tasks: ITask[],
    user: IUser,
    availableHours: number = 8
  ): {
    prioritizedTasks: Array<{ task: ITask; recommendation: string; timeSlot: string }>;
    totalEstimatedTime: number;
    feasibilityScore: number;
  } {
    try {
      // Calculate priorities for all tasks
      const prioritizedTasks = tasks
        .map(task => ({
          task,
          priority: this.calculateDynamicPriority(task, user).finalPriority
        }))
        .sort((a, b) => b.priority - a.priority);

      let totalTime = 0;
      const scheduledTasks: Array<{ task: ITask; recommendation: string; timeSlot: string }> = [];

      for (const { task } of prioritizedTasks) {
        const estimatedTime = (task.estimatedTime || 60) / 60; // Convert to hours
        
        if (totalTime + estimatedTime <= availableHours) {
          const timeSlot = this.suggestTimeSlot(task, totalTime, availableHours);
          const recommendation = this.generateSchedulingRecommendation(task, estimatedTime);
          
          scheduledTasks.push({
            task,
            recommendation,
            timeSlot
          });
          
          totalTime += estimatedTime;
        }
      }

      const feasibilityScore = Math.min(1, totalTime / availableHours);

      return {
        prioritizedTasks: scheduledTasks,
        totalEstimatedTime: totalTime,
        feasibilityScore
      };

    } catch (error) {
      logger.error('Scheduling recommendation error:', error);
      throw new Error('Failed to generate scheduling recommendations');
    }
  }

  /**
   * Suggest optimal time slot for a task
   */
  private static suggestTimeSlot(task: ITask, currentOffset: number, totalHours: number): string {
    const startHour = 9 + currentOffset; // Assuming 9 AM start
    const endHour = startHour + ((task.estimatedTime || 60) / 60);

    if (endHour > 17) { // After 5 PM
      return `${startHour.toFixed(1)}:00 - Extends beyond work hours`;
    }

    return `${Math.floor(startHour)}:${((startHour % 1) * 60).toFixed(0).padStart(2, '0')} - ${Math.floor(endHour)}:${((endHour % 1) * 60).toFixed(0).padStart(2, '0')}`;
  }

  /**
   * Generate scheduling recommendation for a task
   */
  private static generateSchedulingRecommendation(task: ITask, estimatedHours: number): string {
    const recommendations: string[] = [];

    if (estimatedHours < 0.5) {
      recommendations.push('Quick task - Can fit in small time gaps');
    } else if (estimatedHours > 3) {
      recommendations.push('Long task - Consider breaking into smaller chunks');
    }

    if (task.deadline) {
      const daysUntilDeadline = (task.deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline <= 1) {
        recommendations.push('Due soon - Schedule immediately');
      } else if (daysUntilDeadline <= 3) {
        recommendations.push('Due within 3 days - Schedule early in day');
      }
    }

    if (task.context?.toLowerCase().includes('morning')) {
      recommendations.push('Best completed in morning');
    } else if (task.context?.toLowerCase().includes('afternoon')) {
      recommendations.push('Best completed in afternoon');
    }

    return recommendations.length > 0 ? recommendations.join(' | ') : 'Standard scheduling';
  }
}

export default PriorityService; 
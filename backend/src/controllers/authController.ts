import { Request, Response } from 'express';
import { User, IUser } from '../models';
import { AuthMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Partial<IUser>;
    token: string;
  };
  error?: string;
}

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, name, password, preferences } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      // Create new user
      const userData = {
        email: email.toLowerCase(),
        name: name.trim(),
        password,
        preferences: preferences || {}
      };

      const user = new User(userData);
      await user.save();

      // Generate JWT token
      const token = AuthMiddleware.generateToken(user);

      // Remove password from response
      const userResponse = user.toJSON();

      logger.info('User registered successfully', {
        userId: user._id,
        email: user.email
      });

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: userResponse,
          token
        }
      } as AuthResponse);

    } catch (error) {
      logger.error('Registration error:', error);
      
      if (error instanceof Error && error.message.includes('E11000')) {
        // Duplicate key error
        res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  static login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user and include password for verification
      const user = await User.findOne({ 
        email: email.toLowerCase() 
      }).select('+password');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
        return;
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate JWT token
      const token = AuthMiddleware.generateToken(user);

      // Remove password from response
      const userResponse = user.toJSON();

      logger.info('User logged in successfully', {
        userId: user._id,
        email: user.email
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: userResponse,
          token
        }
      } as AuthResponse);

    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  static getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userResponse = req.user.toJSON();

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  static updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { name, preferences } = req.body;
      const user = req.user;

      // Update fields if provided
      if (name !== undefined) {
        user.name = name.trim();
      }

      if (preferences !== undefined) {
        // Merge preferences with existing ones
        user.preferences = {
          ...user.preferences,
          ...preferences
        };
      }

      await user.save();

      const userResponse = user.toJSON();

      logger.info('User profile updated', {
        userId: user._id,
        updatedFields: Object.keys(req.body)
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: userResponse
        }
      });

    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Change password
   * POST /api/auth/change-password
   */
  static changePassword = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Current password is incorrect'
        });
        return;
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info('Password changed successfully', {
        userId: user._id
      });

      res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Refresh JWT token
   * POST /api/auth/refresh
   */
  static refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Generate new token
      const token = AuthMiddleware.generateToken(req.user);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token
        }
      });

    } catch (error) {
      logger.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh token',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Logout user (client-side token invalidation)
   * POST /api/auth/logout
   */
  static logout = async (req: Request, res: Response): Promise<void> => {
    try {
      // In a JWT system, logout is typically handled client-side by removing the token
      // We can log the logout event for analytics/security
      if (req.user) {
        logger.info('User logged out', {
          userId: req.user._id,
          email: req.user.email
        });
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };

  /**
   * Delete user account
   * DELETE /api/auth/account
   */
  static deleteAccount = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const { password } = req.body;

      // Get user with password for verification
      const user = await User.findById(req.user._id).select('+password');
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Verify password before deletion
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(400).json({
          success: false,
          message: 'Password is incorrect'
        });
        return;
      }

      const userId = user._id;
      const userEmail = user.email;

      // Delete related data (tasks, conversations)
      const { Task, Conversation } = await import('../models');
      await Task.deleteMany({ userId });
      await Conversation.deleteMany({ userId });

      // Delete user account
      await User.findByIdAndDelete(userId);

      logger.info('User account deleted', {
        userId,
        email: userEmail
      });

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });

    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  };
}

export default AuthController; 
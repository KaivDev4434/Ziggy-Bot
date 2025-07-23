import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models';
import { logger } from '../config/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      userId?: string;
    }
  }
}

export interface JWTPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export class AuthMiddleware {
  private static jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key';
  private static jwtExpiry = process.env.JWT_EXPIRES_IN || '24h';

  /**
   * Generate JWT token for user
   */
  static generateToken(user: IUser): string {
    const payload: JWTPayload = {
      userId: user._id.toString(),
      email: user.email
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiry
    } as jwt.SignOptions);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JWTPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      } else {
        throw new Error('Token verification failed');
      }
    }
  }

  /**
   * Middleware to authenticate requests
   */
  static authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Access token required'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token
      const decoded = AuthMiddleware.verifyToken(token);

      // Get user from database
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      // Update last login time
      user.lastLogin = new Date();
      await user.save();

      // Attach user to request
      req.user = user;
      req.userId = user._id.toString();

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      
      let message = 'Authentication failed';
      if (error instanceof Error) {
        if (error.message === 'Token expired') {
          message = 'Token expired';
        } else if (error.message === 'Invalid token') {
          message = 'Invalid token';
        }
      }

      res.status(401).json({
        success: false,
        message
      });
    }
  };

  /**
   * Optional middleware - authenticates if token is present, but doesn't require it
   */
  static optionalAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token provided, continue without authentication
        next();
        return;
      }

      const token = authHeader.substring(7);
      const decoded = AuthMiddleware.verifyToken(token);
      
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
        req.userId = user._id.toString();
      }
      
      next();
    } catch (error) {
      // If token is invalid, continue without authentication
      logger.warn('Optional auth failed:', error);
      next();
    }
  };

  /**
   * Middleware to require specific user roles (future extension)
   */
  static requireRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // For now, all users have basic access
      // In the future, we can add role-based permissions
      next();
    };
  };

  /**
   * Rate limiting for auth endpoints
   */
  static authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
    const attempts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction): void => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      // Clean up expired entries
      for (const [ip, data] of attempts.entries()) {
        if (now > data.resetTime) {
          attempts.delete(ip);
        }
      }

      const clientAttempts = attempts.get(clientIP);
      
      if (!clientAttempts) {
        attempts.set(clientIP, { count: 1, resetTime: now + windowMs });
        next();
        return;
      }

      if (clientAttempts.count >= maxAttempts) {
        const timeLeft = Math.ceil((clientAttempts.resetTime - now) / 1000 / 60);
        res.status(429).json({
          success: false,
          message: `Too many authentication attempts. Try again in ${timeLeft} minutes.`
        });
        return;
      }

      clientAttempts.count++;
      next();
    };
  };

  /**
   * Reset rate limit for successful authentication
   */
  static resetRateLimit = (req: Request): void => {
    // Implementation would depend on how rate limiting is stored
    // For now, this is a placeholder for future enhancement
  };
}

export default AuthMiddleware; 
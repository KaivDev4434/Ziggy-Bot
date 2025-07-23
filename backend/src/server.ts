import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Import configurations
import { logger } from './config/logger';
import { database } from './config/database';
import { migrationRunner } from './utils/migration';

// Load environment variables
dotenv.config();

class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8080');
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // General middleware
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Logging middleware
    this.app.use(morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        }
      }
    }));
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV,
        version: process.env.npm_package_version || '1.0.0'
      });
    });

    // Database health check
    this.app.get('/health/database', async (req, res) => {
      try {
        const dbHealth = await database.healthCheck();
        res.status(dbHealth.status === 'ok' ? 200 : 503).json(dbHealth);
      } catch (error) {
        res.status(503).json({
          status: 'error',
          message: 'Database health check failed'
        });
      }
    });

    // API routes placeholder
    this.app.use('/api', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'API endpoint not implemented yet',
        availableEndpoints: [
          'GET /health',
          'GET /health/database'
        ]
      });
    });

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Companion Chatbot API',
        version: '1.0.0',
        status: 'running',
        documentation: '/api/docs',
        health: '/health'
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
          'GET /',
          'GET /health',
          'GET /health/database',
          'POST /api/*'
        ]
      });
    });

    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);
      
      res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      logger.info('Connecting to database...');
      await database.connect();

      // Run migrations
      logger.info('Running database migrations...');
      await migrationRunner.runMigrations();

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`🚀 Server running on port ${this.port}`);
        logger.info(`🌐 Environment: ${process.env.NODE_ENV}`);
        logger.info(`📊 Health check: http://localhost:${this.port}/health`);
        logger.info(`🗄️  Database health: http://localhost:${this.port}/health/database`);
      });

      // Graceful shutdown handlers
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully`);
      
      try {
        await database.disconnect();
        logger.info('Database connection closed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start();
}

export default Server; 
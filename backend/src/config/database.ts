import mongoose from 'mongoose';
import { logger } from './logger';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const config: DatabaseConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/companion_dev',
  options: {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds
  }
};

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    try {
      await mongoose.connect(config.uri, config.options);
      this.isConnected = true;
      logger.info('Successfully connected to MongoDB');
      
      // Set up event listeners
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw new Error('Database connection failed');
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('Disconnected from MongoDB');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  public async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      if (!this.isConnected) {
        return { status: 'error', message: 'Database not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      return { status: 'ok', message: 'Database connection healthy' };
    } catch (error) {
      return { 
        status: 'error', 
        message: `Database health check failed: ${error}` 
      };
    }
  }
}

export const database = Database.getInstance();
export default database; 
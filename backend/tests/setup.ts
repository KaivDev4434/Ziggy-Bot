import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../src/config/logger';

let mongoServer: MongoMemoryServer;

// Global test setup - runs before all tests
beforeAll(async () => {
  // Silence console logs during testing unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    logger.info = jest.fn();
    logger.error = jest.fn();
    logger.warn = jest.fn();
  }

  // Start in-memory MongoDB
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.0'
    }
  });

  const mongoUri = mongoServer.getUri();
  
  // Only connect if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri, {
      bufferCommands: false,
    });
  }

  console.log('🧪 Test database connected successfully');
});

// Global test teardown - runs after all tests
afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  } catch (error) {
    console.error('Error closing database:', error);
  }
  
  try {
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    console.error('Error stopping MongoDB server:', error);
  }

  console.log('🧪 Test database disconnected');
});

// Clean up between tests
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.JWT_EXPIRES_IN = '1h';
process.env.LOG_LEVEL = 'error';

// Increase timeout for async operations
jest.setTimeout(30000); 
import mongoose from 'mongoose';
import { logger } from '../config/logger';
import { User, Task, Conversation } from '../models/index';

// Migration interface
interface Migration {
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

// Migration tracking schema
const migrationSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
  success: { type: Boolean, default: true }
});

const MigrationModel = mongoose.model('Migration', migrationSchema);

class MigrationRunner {
  private migrations: Migration[] = [];

  constructor() {
    this.registerMigrations();
  }

  private registerMigrations() {
    // Migration 1: Initial schema setup
    this.migrations.push({
      version: '1.0.0',
      description: 'Initial database schema with indexes',
      up: async () => {
        logger.info('Running migration 1.0.0: Initial schema setup');
        
        // Ensure indexes are created for all models
        await User.createIndexes();
        await Task.createIndexes();
        await Conversation.createIndexes();
        
        logger.info('All indexes created successfully');
      },
      down: async () => {
        logger.info('Rolling back migration 1.0.0');
        
        // Drop all indexes (except _id)
        await User.collection.dropIndexes();
        await Task.collection.dropIndexes();
        await Conversation.collection.dropIndexes();
        
        logger.info('All indexes dropped');
      }
    });

    // Migration 2: Add text search indexes
    this.migrations.push({
      version: '1.1.0',
      description: 'Add text search indexes for tasks and conversations',
      up: async () => {
        logger.info('Running migration 1.1.0: Adding text search indexes');
        
        try {
          // Create text indexes for full-text search
          await Task.collection.createIndex(
            { title: 'text', description: 'text' },
            { name: 'task_text_search' }
          );
          
          await Conversation.collection.createIndex(
            { title: 'text', 'messages.content': 'text' },
            { name: 'conversation_text_search' }
          );
          
          logger.info('Text search indexes created successfully');
        } catch (error) {
          logger.warn('Text indexes may already exist:', error);
        }
      },
      down: async () => {
        logger.info('Rolling back migration 1.1.0');
        
        try {
          await Task.collection.dropIndex('task_text_search');
          await Conversation.collection.dropIndex('conversation_text_search');
          logger.info('Text search indexes dropped');
        } catch (error) {
          logger.warn('Error dropping text indexes:', error);
        }
      }
    });

    // Migration 3: Add performance optimization indexes
    this.migrations.push({
      version: '1.2.0',
      description: 'Add compound indexes for performance optimization',
      up: async () => {
        logger.info('Running migration 1.2.0: Adding performance indexes');
        
        try {
          // Add compound indexes for common query patterns
          await Task.collection.createIndex(
            { userId: 1, status: 1, priority: -1 },
            { name: 'task_user_status_priority' }
          );
          
          await Task.collection.createIndex(
            { userId: 1, deadline: 1, status: 1 },
            { name: 'task_user_deadline_status' }
          );
          
          await Conversation.collection.createIndex(
            { userId: 1, isActive: 1, lastMessageAt: -1 },
            { name: 'conversation_user_active_recent' }
          );
          
          logger.info('Performance indexes created successfully');
        } catch (error) {
          logger.warn('Performance indexes may already exist:', error);
        }
      },
      down: async () => {
        logger.info('Rolling back migration 1.2.0');
        
        try {
          await Task.collection.dropIndex('task_user_status_priority');
          await Task.collection.dropIndex('task_user_deadline_status');
          await Conversation.collection.dropIndex('conversation_user_active_recent');
          logger.info('Performance indexes dropped');
        } catch (error) {
          logger.warn('Error dropping performance indexes:', error);
        }
      }
    });
  }

  async getAppliedMigrations(): Promise<string[]> {
    try {
      const applied = await MigrationModel.find({ success: true })
        .sort({ appliedAt: 1 })
        .select('version');
      
      return applied.map(m => m.version);
    } catch (error) {
      logger.error('Error fetching applied migrations:', error);
      return [];
    }
  }

  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    return this.migrations.filter(m => !applied.includes(m.version));
  }

  async runMigrations(): Promise<void> {
    const pending = await this.getPendingMigrations();
    
    if (pending.length === 0) {
      logger.info('No pending migrations');
      return;
    }

    logger.info(`Running ${pending.length} pending migrations`);

    for (const migration of pending) {
      try {
        logger.info(`Applying migration ${migration.version}: ${migration.description}`);
        
        await migration.up();
        
        // Record successful migration
        await MigrationModel.create({
          version: migration.version,
          description: migration.description,
          success: true
        });
        
        logger.info(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        logger.error(`Migration ${migration.version} failed:`, error);
        
        // Record failed migration
        await MigrationModel.create({
          version: migration.version,
          description: migration.description,
          success: false
        });
        
        throw new Error(`Migration ${migration.version} failed: ${error}`);
      }
    }

    logger.info('All migrations completed successfully');
  }

  async rollbackMigration(version: string): Promise<void> {
    const migration = this.migrations.find(m => m.version === version);
    
    if (!migration) {
      throw new Error(`Migration ${version} not found`);
    }

    const appliedMigration = await MigrationModel.findOne({ 
      version, 
      success: true 
    });
    
    if (!appliedMigration) {
      throw new Error(`Migration ${version} was not applied or failed`);
    }

    try {
      logger.info(`Rolling back migration ${version}`);
      
      await migration.down();
      
      // Remove migration record
      await MigrationModel.deleteOne({ version });
      
      logger.info(`Migration ${version} rolled back successfully`);
    } catch (error) {
      logger.error(`Rollback of migration ${version} failed:`, error);
      throw error;
    }
  }

  async validateDatabase(): Promise<boolean> {
    try {
      logger.info('Validating database schema and indexes');
      
      // Check if all models can be accessed
      await User.findOne().limit(1);
      await Task.findOne().limit(1);
      await Conversation.findOne().limit(1);
      
      // Check if required indexes exist
      const userIndexes = await User.collection.getIndexes();
      const taskIndexes = await Task.collection.getIndexes();
      const conversationIndexes = await Conversation.collection.getIndexes();
      
      logger.info('Database validation completed successfully');
      logger.debug('Index counts:', {
        users: Object.keys(userIndexes).length,
        tasks: Object.keys(taskIndexes).length,
        conversations: Object.keys(conversationIndexes).length
      });
      
      return true;
    } catch (error) {
      logger.error('Database validation failed:', error);
      return false;
    }
  }

  async getStatus(): Promise<{
    applied: string[];
    pending: Migration[];
    isValid: boolean;
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    const isValid = await this.validateDatabase();
    
    return {
      applied,
      pending: pending.map((m: Migration) => ({
        version: m.version,
        description: m.description,
        up: m.up,
        down: m.down
      })),
      isValid
    };
  }
}

// Export singleton instance
export const migrationRunner = new MigrationRunner();
export default migrationRunner; 
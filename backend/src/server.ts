import dotenv from 'dotenv';
import app from './app';
import { logger } from './config/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001; // Use 3001 to avoid macOS port 5000 conflict

// Start the server
app.listen(PORT, () => {
  logger.info(`🚀 Ziggy Bot API Server running on port ${PORT}`);
  logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📊 Health check: http://localhost:${PORT}/health`);
  logger.info(`📚 API docs: http://localhost:${PORT}/api/docs`);
  logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
}); 
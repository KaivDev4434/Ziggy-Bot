const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

async function debugTest() {
  console.log('🧪 Debug Test - Starting...');
  
  try {
    // Test 1: MongoDB Memory Server
    console.log('📝 Test 1: Starting MongoDB Memory Server...');
    const mongoServer = await MongoMemoryServer.create({
      binary: { version: '7.0.0' }
    });
    const mongoUri = mongoServer.getUri();
    console.log('✅ MongoDB Memory Server started:', mongoUri);

    // Test 2: Mongoose Connection
    console.log('📝 Test 2: Connecting to test database...');
    await mongoose.connect(mongoUri, { bufferCommands: false });
    console.log('✅ Mongoose connected successfully');

    // Test 3: Import Models
    console.log('📝 Test 3: Testing model imports...');
    const { User, Task } = require('./dist/models');
    console.log('✅ Models imported successfully');

    // Test 4: Create Test User
    console.log('📝 Test 4: Creating test user...');
    const userData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword',
      preferences: {
        timezone: 'UTC',
        workingHours: { start: '09:00', end: '17:00' },
        defaultTaskDuration: 30,
        priorityWeights: { deadline: 0.4, context: 0.3, dependencies: 0.3 },
        notifications: { email: true, push: false, desktop: false, reminderMinutes: 15 },
        ui: { theme: 'light', language: 'en', compactView: false }
      },
      isEmailVerified: true
    };
    
    const user = new User(userData);
    await user.save();
    console.log('✅ Test user created:', user._id);

    // Test 5: Import App
    console.log('📝 Test 5: Testing app import...');
    process.env.NODE_ENV = 'test';
    const app = require('./dist/app').default;
    console.log('✅ App imported successfully');

    // Test 6: Simple Request Test
    console.log('📝 Test 6: Testing simple request...');
    const request = require('supertest');
    const response = await request(app).get('/health');
    console.log('✅ Health check response:', response.status, response.body);

    // Cleanup
    console.log('📝 Cleanup: Closing connections...');
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('✅ All tests passed! 🎉');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

debugTest(); 
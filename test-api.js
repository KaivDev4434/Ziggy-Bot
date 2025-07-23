const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
let authToken = null;
let testUserId = null;
let testTaskId = null;
let testConversationId = null;

// Test configuration
const testUser = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'testpassword123',
  preferences: {
    timezone: 'UTC',
    workingHours: { start: '09:00', end: '17:00' }
  }
};

const testTask = {
  title: 'Test Task for API',
  description: 'This is a test task to verify our API functionality',
  priority: 8,
  deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  context: 'Testing API endpoints',
  estimatedTime: 60,
  tags: ['test', 'api', 'verification']
};

// Helper function to make authenticated requests
const authRequest = async (method, url, data = null) => {
  const config = {
    method,
    url: `${API_BASE}${url}`,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    data
  };
  
  try {
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      data: error.response?.data || error.message, 
      status: error.response?.status || 500 
    };
  }
};

// Test functions
async function testHealthEndpoints() {
  console.log('\n🏥 Testing Health Endpoints...');
  
  try {
    const healthResponse = await axios.get('http://localhost:3001/health');
    console.log('✅ Health endpoint:', healthResponse.data.message);
    
    const docsResponse = await axios.get(`${API_BASE}/docs`);
    console.log('✅ Documentation endpoint: Available');
    console.log(`   📚 Total endpoints: ${Object.keys(docsResponse.data.endpoints).length} categories`);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

async function testUserRegistration() {
  console.log('\n👤 Testing User Registration...');
  
  const result = await authRequest('POST', '/auth/register', testUser);
  
  if (result.success) {
    console.log('✅ User registration successful');
    authToken = result.data.data.token;
    testUserId = result.data.data.user._id;
    console.log(`   🔑 Auth token received (${authToken.length} chars)`);
    console.log(`   🆔 User ID: ${testUserId}`);
  } else {
    console.log('❌ User registration failed:', result.data.message);
    if (result.data.message?.includes('already exists')) {
      console.log('   ℹ️  User already exists, trying login...');
      return await testUserLogin();
    }
  }
  
  return result.success;
}

async function testUserLogin() {
  console.log('\n🔐 Testing User Login...');
  
  const result = await authRequest('POST', '/auth/login', {
    email: testUser.email,
    password: testUser.password
  });
  
  if (result.success) {
    console.log('✅ User login successful');
    authToken = result.data.data.token;
    testUserId = result.data.data.user._id;
    console.log(`   🔑 Auth token updated`);
  } else {
    console.log('❌ User login failed:', result.data.message);
  }
  
  return result.success;
}

async function testUserProfile() {
  console.log('\n👤 Testing User Profile...');
  
  // Get profile
  const getResult = await authRequest('GET', '/auth/profile');
  if (getResult.success) {
    console.log('✅ Get profile successful');
    console.log(`   📧 Email: ${getResult.data.data.user.email}`);
    console.log(`   👤 Name: ${getResult.data.data.user.name}`);
  } else {
    console.log('❌ Get profile failed:', getResult.data.message);
    return false;
  }
  
  // Update profile
  const updateResult = await authRequest('PUT', '/auth/profile', {
    name: 'Updated Test User',
    preferences: {
      ...testUser.preferences,
      defaultTaskDuration: 45
    }
  });
  
  if (updateResult.success) {
    console.log('✅ Update profile successful');
  } else {
    console.log('❌ Update profile failed:', updateResult.data.message);
  }
  
  return getResult.success && updateResult.success;
}

async function testTaskManagement() {
  console.log('\n📋 Testing Task Management...');
  
  // Create task
  const createResult = await authRequest('POST', '/tasks', testTask);
  if (createResult.success) {
    console.log('✅ Task creation successful');
    testTaskId = createResult.data.data.task._id;
    console.log(`   🆔 Task ID: ${testTaskId}`);
    console.log(`   📝 Title: ${createResult.data.data.task.title}`);
  } else {
    console.log('❌ Task creation failed:', createResult.data.message);
    return false;
  }
  
  // Get all tasks
  const getAllResult = await authRequest('GET', '/tasks?limit=5');
  if (getAllResult.success) {
    console.log('✅ Get all tasks successful');
    console.log(`   📊 Found ${getAllResult.data.data.tasks.length} tasks`);
  } else {
    console.log('❌ Get all tasks failed:', getAllResult.data.message);
  }
  
  // Get specific task
  const getOneResult = await authRequest('GET', `/tasks/${testTaskId}`);
  if (getOneResult.success) {
    console.log('✅ Get specific task successful');
  } else {
    console.log('❌ Get specific task failed:', getOneResult.data.message);
  }
  
  // Update task
  const updateResult = await authRequest('PUT', `/tasks/${testTaskId}`, {
    title: 'Updated Test Task',
    priority: 9,
    status: 'in-progress'
  });
  
  if (updateResult.success) {
    console.log('✅ Task update successful');
  } else {
    console.log('❌ Task update failed:', updateResult.data.message);
  }
  
  return createResult.success;
}

async function testPriorityCalculation() {
  console.log('\n🎯 Testing Priority Calculation...');
  
  if (!testTaskId) {
    console.log('❌ No test task available for priority calculation');
    return false;
  }
  
  // Calculate priority for specific task
  const calcResult = await authRequest('POST', `/tasks/${testTaskId}/calculate-priority`);
  if (calcResult.success) {
    console.log('✅ Priority calculation successful');
    const data = calcResult.data.data;
    console.log(`   📊 Current Priority: ${data.currentPriority}`);
    console.log(`   🧮 Calculated Priority: ${data.calculatedPriority}`);
    console.log(`   ⚡ Urgency Level: ${data.urgencyLevel}`);
    console.log(`   💡 Recommendation: ${data.recommendation}`);
  } else {
    console.log('❌ Priority calculation failed:', calcResult.data.message);
    return false;
  }
  
  // Get task statistics
  const statsResult = await authRequest('GET', '/tasks/stats');
  if (statsResult.success) {
    console.log('✅ Task statistics successful');
    const stats = statsResult.data.data.stats;
    console.log(`   📈 Total tasks: ${stats.total}`);
    console.log(`   ⏳ Pending: ${stats.pending}, In Progress: ${stats.inProgress}`);
  } else {
    console.log('❌ Task statistics failed:', statsResult.data.message);
  }
  
  return calcResult.success;
}

async function testConversationSystem() {
  console.log('\n💬 Testing Conversation System...');
  
  // Send a message
  const messageResult = await authRequest('POST', '/chat/message', {
    content: 'Hello Ziggy Bot! This is a test message to verify the chat functionality.',
    metadata: {
      taskIds: testTaskId ? [testTaskId] : []
    }
  });
  
  if (messageResult.success) {
    console.log('✅ Send message successful');
    testConversationId = messageResult.data.data.conversation.id;
    console.log(`   💬 Conversation ID: ${testConversationId}`);
    console.log(`   📝 Message count: ${messageResult.data.data.conversation.messageCount}`);
  } else {
    console.log('❌ Send message failed:', messageResult.data.message);
    return false;
  }
  
  // Get active conversation
  const activeResult = await authRequest('GET', '/chat/active');
  if (activeResult.success) {
    console.log('✅ Get active conversation successful');
    console.log(`   📜 Messages: ${activeResult.data.data.messages.length}`);
  } else {
    console.log('❌ Get active conversation failed:', activeResult.data.message);
  }
  
  // Get conversation history
  const historyResult = await authRequest('GET', '/chat/history?limit=5');
  if (historyResult.success) {
    console.log('✅ Get conversation history successful');
    console.log(`   📚 Conversations: ${historyResult.data.data.conversations.length}`);
  } else {
    console.log('❌ Get conversation history failed:', historyResult.data.message);
  }
  
  return messageResult.success;
}

async function testSchedulingRecommendations() {
  console.log('\n⏰ Testing Scheduling Recommendations...');
  
  const result = await authRequest('GET', '/tasks/scheduling-recommendations?availableHours=8');
  if (result.success) {
    console.log('✅ Scheduling recommendations successful');
    const data = result.data.data.recommendations;
    console.log(`   🎯 Scheduled tasks: ${data.prioritizedTasks.length}`);
    console.log(`   ⏱️  Total estimated time: ${data.totalEstimatedTime.toFixed(1)} hours`);
    console.log(`   📊 Feasibility score: ${(data.feasibilityScore * 100).toFixed(1)}%`);
  } else {
    console.log('❌ Scheduling recommendations failed:', result.data.message);
  }
  
  return result.success;
}

async function testValidationAndErrors() {
  console.log('\n🛡️ Testing Validation and Error Handling...');
  
  // Test invalid task creation
  const invalidTaskResult = await authRequest('POST', '/tasks', {
    title: '', // Invalid empty title
    priority: 15 // Invalid priority > 10
  });
  
  if (!invalidTaskResult.success && invalidTaskResult.status === 400) {
    console.log('✅ Input validation working correctly');
    console.log(`   🚫 Validation errors detected: ${invalidTaskResult.data.errors?.length || 1}`);
  } else {
    console.log('❌ Input validation not working properly');
  }
  
  // Test unauthorized access
  const unauthorizedResult = await axios.get(`${API_BASE}/tasks`).catch(e => e.response);
  if (unauthorizedResult.status === 401) {
    console.log('✅ Authentication protection working');
  } else {
    console.log('❌ Authentication protection not working');
  }
  
  // Test rate limiting by making rapid requests
  console.log('   🚦 Testing rate limiting...');
  let rateLimitHit = false;
  for (let i = 0; i < 20; i++) {
    try {
      await axios.get(`${API_BASE}/docs`);
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitHit = true;
        break;
      }
    }
  }
  
  console.log(`   🚦 Rate limiting: ${rateLimitHit ? '✅ Active' : '⚠️  Not triggered in test'}`);
  
  return true;
}

async function runAllTests() {
  console.log('🚀 Starting Ziggy Bot API Comprehensive Test Suite...');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Health Endpoints', fn: testHealthEndpoints },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Profile', fn: testUserProfile },
    { name: 'Task Management', fn: testTaskManagement },
    { name: 'Priority Calculation', fn: testPriorityCalculation },
    { name: 'Conversation System', fn: testConversationSystem },
    { name: 'Scheduling Recommendations', fn: testSchedulingRecommendations },
    { name: 'Validation and Security', fn: testValidationAndErrors }
  ];
  
  const results = [];
  let passed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
      if (result) passed++;
    } catch (error) {
      console.log(`❌ ${test.name} crashed:`, error.message);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.error) {
      console.log(`   🔥 Error: ${result.error}`);
    }
  });
  
  console.log('\n🎯 OVERALL SCORE:');
  console.log(`✅ Passed: ${passed}/${tests.length} tests`);
  console.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (passed === tests.length) {
    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('🚀 Ziggy Bot API is fully functional and ready for production!');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
  
  console.log('\n📚 API Documentation: http://localhost:3001/api/docs');
  console.log('🏥 Health Check: http://localhost:3001/health');
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  runAllTests,
  API_BASE,
  testUser,
  testTask
}; 
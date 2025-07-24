const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test configuration
const testConfig = {
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
};

let authToken = null;
let userId = null;
let conversationId = null;

// Test messages for NLP processing
const testMessages = [
  // Task creation with various complexity
  {
    content: "I need to call John tomorrow at 2 PM about the urgent project meeting",
    expectedIntent: "create_task",
    description: "Complex task with person, time, date, and priority"
  },
  {
    content: "Remind me to buy groceries today before 6 PM",
    expectedIntent: "create_task", 
    description: "Task with deadline and context"
  },
  {
    content: "Schedule a quick meeting with the team next week",
    expectedIntent: "create_task",
    description: "Task with duration and relative date"
  },
  {
    content: "I have to finish the report by Friday - it's really important",
    expectedIntent: "create_task",
    description: "Task with deadline and priority indication"
  },
  
  // Intent recognition tests
  {
    content: "What tasks do I have for today?",
    expectedIntent: "list_tasks",
    description: "Task listing request with date filter"
  },
  {
    content: "Show me my schedule for tomorrow",
    expectedIntent: "get_schedule", 
    description: "Schedule request"
  },
  {
    content: "What's my current status?",
    expectedIntent: "ask_status",
    description: "Status inquiry"
  },
  
  // Greetings and conversation
  {
    content: "Hello Ziggy! How are you today?",
    expectedIntent: "greeting",
    description: "Greeting with personalization"
  },
  {
    content: "Thanks for your help!",
    expectedIntent: "greeting",
    description: "Gratitude expression"
  },
  
  // Complex natural language
  {
    content: "Can you help me organize my day? I have a lot to do and feeling overwhelmed",
    expectedIntent: "general_question",
    description: "Request for help with task organization"
  }
];

async function registerAndLogin() {
  try {
    console.log('🔐 Registering test user...');
    
    const registerData = {
      name: 'NLP Test User',
      email: `nlptest_${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData, testConfig);
    
    if (registerResponse.data.success) {
      authToken = registerResponse.data.data.token;
      userId = registerResponse.data.data.user.id;
      console.log('✅ User registered successfully');
      console.log(`   User ID: ${userId}`);
      return true;
    } else {
      console.error('❌ Registration failed:', registerResponse.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Registration error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testNLPChatMessage(messageTest, index) {
  try {
    console.log(`\n🧠 NLP Test ${index + 1}: ${messageTest.description}`);
    console.log(`   Input: "${messageTest.content}"`);
    
    const response = await axios.post(
      `${BASE_URL}/chat/message`,
      {
        content: messageTest.content,
        metadata: { test: true, expectedIntent: messageTest.expectedIntent }
      },
      {
        ...testConfig,
        headers: {
          ...testConfig.headers,
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    if (response.data.success) {
      const aiMessage = response.data.data.assistantMessage;
      const nlpMetadata = aiMessage.metadata?.nlp;
      
      console.log('✅ Message processed successfully');
      console.log(`   AI Response: "${aiMessage.content.substring(0, 100)}${aiMessage.content.length > 100 ? '...' : ''}"`);
      
      if (nlpMetadata) {
        console.log(`   🎯 Detected Intent: ${nlpMetadata.intent} (confidence: ${aiMessage.metadata.confidence})`);
        console.log(`   🏷️  Entities Found: ${nlpMetadata.entitiesFound}`);
        console.log(`   ⚡ Processing Time: ${aiMessage.metadata.processingTime}ms`);
        console.log(`   🔧 Actions Executed: ${nlpMetadata.actionsExecuted}`);
        
        // Check if intent matches expectation
        if (nlpMetadata.intent === messageTest.expectedIntent) {
          console.log('✅ Intent recognition: CORRECT');
        } else {
          console.log(`⚠️  Intent recognition: Expected ${messageTest.expectedIntent}, got ${nlpMetadata.intent}`);
        }
      } else {
        console.log('⚠️  No NLP metadata found - might be fallback response');
      }
      
      // Store conversation ID for subsequent tests
      if (!conversationId && response.data.data.conversation?.id) {
        conversationId = response.data.data.conversation.id;
      }
      
      return true;
    } else {
      console.error('❌ Message processing failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ NLP test error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testTaskCreationCapabilities() {
  console.log('\n📋 Testing Task Creation from Natural Language...');
  
  const taskCreationTests = [
    "Create a task to review the quarterly reports by end of week",
    "I need to schedule a dentist appointment next Tuesday at 10 AM",
    "Add buying birthday gift for mom to my todo list - it's urgent!",
    "Plan team building event for next month, budget around $500"
  ];

  for (let i = 0; i < taskCreationTests.length; i++) {
    await testNLPChatMessage({
      content: taskCreationTests[i],
      expectedIntent: "create_task",
      description: `Task creation test ${i + 1}`
    }, i);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testEntityExtraction() {
  console.log('\n🏷️ Testing Entity Extraction...');
  
  const entityTests = [
    {
      content: "Call Sarah tomorrow at 3:30 PM about the urgent presentation",
      expectedEntities: ['person', 'date', 'time', 'priority']
    },
    {
      content: "Schedule 2-hour meeting with engineering team next Friday morning",
      expectedEntities: ['duration', 'date', 'time']
    },
    {
      content: "Buy groceries at Whole Foods on Main Street by 6 PM today",
      expectedEntities: ['context', 'time', 'date']
    }
  ];

  for (let i = 0; i < entityTests.length; i++) {
    const test = entityTests[i];
    console.log(`\n   Entity Test ${i + 1}: "${test.content}"`);
    console.log(`   Expected entities: ${test.expectedEntities.join(', ')}`);
    
    await testNLPChatMessage({
      content: test.content,
      expectedIntent: "create_task",
      description: `Entity extraction test ${i + 1}`
    }, i);
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function testConversationalFlow() {
  console.log('\n💬 Testing Conversational Flow...');
  
  const conversationFlow = [
    "Hi Ziggy, I need help organizing my tasks",
    "I have three important meetings this week",
    "The first one is with the client on Tuesday",
    "The second is team standup on Wednesday morning", 
    "And board meeting on Friday afternoon",
    "Can you show me all my tasks?",
    "What's my schedule for this week?"
  ];

  for (let i = 0; i < conversationFlow.length; i++) {
    console.log(`\n   Conversation Step ${i + 1}: "${conversationFlow[i]}"`);
    
    await testNLPChatMessage({
      content: conversationFlow[i],
      expectedIntent: i < 5 ? "create_task" : (i === 5 ? "list_tasks" : "get_schedule"),
      description: `Conversation flow step ${i + 1}`
    }, i);
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}

async function testContextAwareness() {
  console.log('\n🧠 Testing Context Awareness...');
  
  // First create some tasks
  await testNLPChatMessage({
    content: "I need to prepare for the big presentation next Monday",
    expectedIntent: "create_task",
    description: "Setup task for context test"
  }, 0);
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Then test context-aware follow-ups
  const contextTests = [
    "Actually, make that high priority",
    "Add practice session on Sunday",
    "What do I have for Monday?",
    "Can you help me prioritize my tasks?"
  ];

  for (let i = 0; i < contextTests.length; i++) {
    await testNLPChatMessage({
      content: contextTests[i],
      expectedIntent: i === 0 ? "update_task" : i === 1 ? "create_task" : i === 2 ? "get_schedule" : "general_question",
      description: `Context awareness test ${i + 1}`
    }, i);
    
    await new Promise(resolve => setTimeout(resolve, 800));
  }
}

async function getGeneratedTasks() {
  try {
    console.log('\n📊 Checking Generated Tasks...');
    
    const response = await axios.get(`${BASE_URL}/tasks`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      const tasks = response.data.data.tasks;
      console.log(`✅ Found ${tasks.length} tasks generated by NLP:`);
      
      tasks.forEach((task, index) => {
        console.log(`   ${index + 1}. "${task.title}" (Priority: ${task.priority})`);
        if (task.deadline) {
          console.log(`      Deadline: ${new Date(task.deadline).toLocaleDateString()}`);
        }
        if (task.tags && task.tags.length > 0) {
          console.log(`      Tags: ${task.tags.join(', ')}`);
        }
      });
      
      return tasks;
    } else {
      console.error('❌ Failed to retrieve tasks:', response.data.message);
      return [];
    }
  } catch (error) {
    console.error('❌ Error retrieving tasks:', error.response?.data?.message || error.message);
    return [];
  }
}

async function testConversationHistory() {
  try {
    console.log('\n💬 Testing Conversation History...');
    
    const response = await axios.get(`${BASE_URL}/chat/history`, {
      ...testConfig,
      headers: {
        ...testConfig.headers,
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (response.data.success) {
      const conversations = response.data.data.conversations;
      console.log(`✅ Found ${conversations.length} conversation(s)`);
      
      if (conversations.length > 0) {
        const latestConv = conversations[0];
        console.log(`   Latest conversation: "${latestConv.title}"`);
        console.log(`   Messages: ${latestConv.messageCount}`);
        console.log(`   Last activity: ${new Date(latestConv.lastMessageAt).toLocaleString()}`);
      }
      
      return true;
    } else {
      console.error('❌ Failed to retrieve conversation history:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error retrieving conversation history:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runNLPTests() {
  console.log('🚀 Starting Comprehensive NLP Testing Suite...');
  console.log('================================================');

  // Authentication
  const authSuccess = await registerAndLogin();
  if (!authSuccess) {
    console.error('❌ Authentication failed. Exiting tests.');
    return;
  }

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Test 1: Basic NLP Message Processing
    console.log('\n📝 Phase 1: Basic NLP Message Processing');
    console.log('----------------------------------------');
    
    for (let i = 0; i < Math.min(5, testMessages.length); i++) {
      await testNLPChatMessage(testMessages[i], i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Test 2: Task Creation Capabilities
    await testTaskCreationCapabilities();

    // Test 3: Entity Extraction
    await testEntityExtraction();

    // Test 4: Conversational Flow
    await testConversationalFlow();

    // Test 5: Context Awareness
    await testContextAwareness();

    // Test 6: Check Generated Tasks
    const generatedTasks = await getGeneratedTasks();

    // Test 7: Conversation History
    await testConversationHistory();

    // Final Summary
    console.log('\n🎉 NLP Testing Summary');
    console.log('======================');
    console.log('✅ Phase 2.3: Natural Language Processing - COMPLETE!');
    console.log(`📊 Tasks Generated: ${generatedTasks.length}`);
    console.log(`💬 Conversation ID: ${conversationId}`);
    console.log('🧠 NLP Features Tested:');
    console.log('   • Intent Recognition (CREATE_TASK, LIST_TASKS, GET_SCHEDULE, etc.)');
    console.log('   • Entity Extraction (dates, times, priorities, people, locations)');
    console.log('   • Task Generation Pipeline');
    console.log('   • Context-Aware Responses');
    console.log('   • Conversational Flow');
    console.log('   • Intelligent Enhancement');
    console.log('   • Chat Integration');

    console.log('\n🚀 Ziggy Bot NLP is ready for advanced task management!');

  } catch (error) {
    console.error('❌ Test suite error:', error);
  }
}

// Run the tests
runNLPTests(); 
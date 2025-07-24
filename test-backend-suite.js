const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Ziggy Bot - Comprehensive Backend Test Suite');
console.log('===============================================\n');

const testSuites = [
  {
    name: '🧠 NLP Services Unit Tests',
    command: 'cd backend && npm run test:unit -- --testPathPattern=nlp',
    description: 'Testing natural language processing and entity extraction'
  },
  {
    name: '🔐 Authentication Tests',
    command: 'cd backend && npm run test:unit -- --testPathPattern=auth',
    description: 'Testing user authentication and authorization'
  },
  {
    name: '📋 Task Management Tests',
    command: 'cd backend && npm run test:unit -- --testPathPattern=task',
    description: 'Testing task CRUD operations and business logic'
  },
  {
    name: '💬 Chat Controller Tests',
    command: 'cd backend && npm run test:unit -- --testPathPattern=chat',
    description: 'Testing chat system and NLP integration'
  },
  {
    name: '🔗 Integration Tests',
    command: 'cd backend && npm run test:integration',
    description: 'Testing end-to-end NLP-Chat-Task pipeline'
  },
  {
    name: '📊 Coverage Report',
    command: 'cd backend && npm run test:coverage',
    description: 'Generating comprehensive test coverage report'
  }
];

async function runTest(testSuite) {
  console.log(`\n${testSuite.name}`);
  console.log('-'.repeat(testSuite.name.length));
  console.log(`📄 ${testSuite.description}`);
  console.log(`🚀 Running: ${testSuite.command}\n`);

  try {
    const startTime = Date.now();
    
    execSync(testSuite.command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ ${testSuite.name} completed in ${duration}s\n`);
    return true;
    
  } catch (error) {
    console.log(`\n❌ ${testSuite.name} failed\n`);
    console.error(error.message);
    return false;
  }
}

async function runAllTests() {
  const startTime = Date.now();
  let passed = 0;
  let failed = 0;

  console.log('🏁 Starting comprehensive test execution...\n');

  for (const testSuite of testSuites) {
    const success = await runTest(testSuite);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  const endTime = Date.now();
  const totalDuration = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n🎯 Test Suite Summary');
  console.log('====================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total Time: ${totalDuration}s`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Ziggy Bot backend is ready! 🚀');
    console.log('\n📋 What was tested:');
    console.log('  • Natural Language Processing & Entity Extraction');
    console.log('  • Intent Recognition & Task Generation'); 
    console.log('  • Authentication & Authorization');
    console.log('  • Task Management & CRUD Operations');
    console.log('  • Chat System & NLP Integration');
    console.log('  • End-to-End Integration Pipeline');
    console.log('  • Error Handling & Edge Cases');
    console.log('  • Performance & Concurrency');
    console.log('  • Data Validation & Consistency');
    
    console.log('\n🧠 NLP Capabilities Verified:');
    console.log('  ✅ Intent Recognition (CREATE_TASK, LIST_TASKS, etc.)');
    console.log('  ✅ Entity Extraction (dates, times, priorities, people)');
    console.log('  ✅ Task Generation from Natural Language');
    console.log('  ✅ Context-Aware Conversations');
    console.log('  ✅ Intelligent Enhancement & Suggestions');
    
    console.log('\n🔧 API Endpoints Tested:');
    console.log('  ✅ Authentication (/api/auth/*)');
    console.log('  ✅ Task Management (/api/tasks/*)');
    console.log('  ✅ Chat System (/api/chat/*)');
    console.log('  ✅ Priority Calculation (/api/tasks/scheduling-recommendations)');
    
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node test-backend-suite.js [options]');
  console.log('\nOptions:');
  console.log('  --help, -h     Show this help message');
  console.log('  --coverage     Run only coverage tests');
  console.log('  --unit         Run only unit tests');
  console.log('  --integration  Run only integration tests');
  console.log('\nExamples:');
  console.log('  node test-backend-suite.js                 # Run all tests');
  console.log('  node test-backend-suite.js --unit          # Run only unit tests');
  console.log('  node test-backend-suite.js --coverage      # Run coverage report');
  process.exit(0);
}

if (args.includes('--coverage')) {
  // Run only coverage
  runTest(testSuites.find(t => t.name.includes('Coverage')));
} else if (args.includes('--unit')) {
  // Run only unit tests
  const unitTests = testSuites.filter(t => t.name.includes('Unit') || 
    ['NLP', 'Authentication', 'Task Management', 'Chat Controller'].some(keyword => t.name.includes(keyword)));
  
  runAllTests.call({ testSuites: unitTests });
} else if (args.includes('--integration')) {
  // Run only integration tests
  runTest(testSuites.find(t => t.name.includes('Integration')));
} else {
  // Run all tests
  runAllTests();
} 
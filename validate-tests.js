const { execSync } = require('child_process');

console.log('🧪 Ziggy Bot - Quick Test Validation');
console.log('====================================\n');

// Test our core components
const tests = [
  {
    name: '🔧 TypeScript Compilation',
    command: 'cd backend && npx tsc --noEmit',
    timeout: 10000
  },
  {
    name: '🧠 NLP Service Import Test',
    command: 'cd backend && node -e "const { default: NLP } = require(\'./dist/services/nlpService.js\'); console.log(\'✅ NLP Service loaded\');"',
    timeout: 5000
  },
  {
    name: '🗃️ Models Import Test', 
    command: 'cd backend && node -e "const { User, Task, Conversation } = require(\'./dist/models/index.js\'); console.log(\'✅ Models loaded\');"',
    timeout: 5000
  }
];

async function runValidation() {
  console.log('🏁 Starting validation...\n');
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`🔍 ${test.name}`);
      const result = execSync(test.command, { 
        stdio: 'pipe', 
        timeout: test.timeout,
        encoding: 'utf8'
      });
      
      if (result.trim()) {
        console.log(`   ${result.trim()}`);
      }
      console.log(`   ✅ PASSED\n`);
      passed++;
      
    } catch (error) {
      console.log(`   ❌ FAILED`);
      console.log(`   Error: ${error.message.split('\n')[0]}\n`);
      failed++;
    }
  }

  console.log('📊 Validation Summary');
  console.log('====================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All core validations passed!');
    console.log('📋 Ready for comprehensive testing:');
    console.log('   • npm test              # Run all tests');
    console.log('   • npm run test:unit     # Run unit tests only');
    console.log('   • npm run test:coverage # Generate coverage report');
    
    return true;
  } else {
    console.log('⚠️  Some validations failed. Check the errors above.');
    return false;
  }
}

runValidation().then(success => {
  process.exit(success ? 0 : 1);
}); 
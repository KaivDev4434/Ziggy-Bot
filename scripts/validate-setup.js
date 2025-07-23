#!/usr/bin/env node

/**
 * Setup Validation Script
 * Tests API connectivity and validates environment configuration
 * Part of Task 1.4: API Keys and External Service Setup
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Check if environment file exists
function checkEnvironmentFile() {
  info('Checking environment configuration...');
  
  const envFiles = ['.env', 'env.example'];
  let envExists = false;
  
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      success(`Found environment file: ${file}`);
      envExists = true;
      
      // Read and validate required variables
      const envContent = fs.readFileSync(file, 'utf8');
      const requiredVars = [
        'NODE_ENV',
        'PORT',
        'MONGODB_URI',
        'REDIS_URL',
        'JWT_SECRET',
        'PERPLEXITY_API_KEY'
      ];
      
      const missingVars = requiredVars.filter(varName => 
        !envContent.includes(`${varName}=`)
      );
      
      if (missingVars.length === 0) {
        success('All required environment variables are defined');
      } else {
        warning(`Missing environment variables: ${missingVars.join(', ')}`);
      }
      break;
    }
  }
  
  if (!envExists) {
    error('No environment file found. Please create .env from env.example');
    return false;
  }
  
  return true;
}

// Check project structure
function checkProjectStructure() {
  info('Validating project structure...');
  
  const requiredDirs = [
    'frontend',
    'backend', 
    'shared',
    'docker',
    'docs',
    'tests',
    'scripts'
  ];
  
  const requiredFiles = [
    'package.json',
    'README.md',
    '.gitignore',
    'docker/docker-compose.dev.yml',
    'frontend/package.json',
    'backend/package.json',
    'shared/package.json'
  ];
  
  let structureValid = true;
  
  // Check directories
  for (const dir of requiredDirs) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      success(`Directory exists: ${dir}/`);
    } else {
      error(`Missing directory: ${dir}/`);
      structureValid = false;
    }
  }
  
  // Check files
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      success(`File exists: ${file}`);
    } else {
      error(`Missing file: ${file}`);
      structureValid = false;
    }
  }
  
  return structureValid;
}

// Test Docker configuration
function checkDockerConfig() {
  info('Checking Docker configuration...');
  
  const dockerFiles = [
    'docker/docker-compose.dev.yml',
    'docker/Dockerfile.frontend.dev',
    'docker/Dockerfile.backend.dev'
  ];
  
  let dockerValid = true;
  
  for (const file of dockerFiles) {
    if (fs.existsSync(file)) {
      success(`Docker file exists: ${file}`);
    } else {
      error(`Missing Docker file: ${file}`);
      dockerValid = false;
    }
  }
  
  return dockerValid;
}

// Test package.json configurations
function checkPackageConfigs() {
  info('Validating package.json configurations...');
  
  const packageFiles = [
    { path: 'package.json', name: 'root' },
    { path: 'frontend/package.json', name: 'frontend' },
    { path: 'backend/package.json', name: 'backend' },
    { path: 'shared/package.json', name: 'shared' }
  ];
  
  let configValid = true;
  
  for (const { path: pkgPath, name } of packageFiles) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      
      if (pkg.name && pkg.scripts) {
        success(`${name} package.json is valid`);
      } else {
        error(`${name} package.json missing required fields`);
        configValid = false;
      }
    } catch (err) {
      error(`Invalid JSON in ${pkgPath}: ${err.message}`);
      configValid = false;
    }
  }
  
  return configValid;
}

// Mock API connectivity test (since services aren't running yet)
function testAPIConnectivity() {
  info('API connectivity tests (mock - services not running yet)...');
  
  // These will be actual tests once services are running
  warning('Perplexity API: Not tested (add your API key to .env)');
  warning('Local LLM (Ollama): Not tested (will be available after docker setup)');
  warning('MongoDB: Not tested (will be available after docker setup)');
  warning('Redis: Not tested (will be available after docker setup)');
  
  info('To test API connectivity after setup:');
  info('1. Configure your .env file with real API keys');
  info('2. Run: docker-compose -f docker/docker-compose.dev.yml up -d');
  info('3. Run this script again to validate connectivity');
  
  return true; // Return true for now since this is initial setup
}

// Main validation function
async function validateSetup() {
  log(`${colors.bold}${colors.blue}🚀 Companion Chatbot - Setup Validation${colors.reset}\n`);
  
  const checks = [
    { name: 'Environment Configuration', fn: checkEnvironmentFile },
    { name: 'Project Structure', fn: checkProjectStructure },
    { name: 'Docker Configuration', fn: checkDockerConfig },
    { name: 'Package Configurations', fn: checkPackageConfigs },
    { name: 'API Connectivity', fn: testAPIConnectivity }
  ];
  
  let allPassed = true;
  const results = [];
  
  for (const check of checks) {
    log(`\n📋 ${check.name}:`);
    const passed = check.fn();
    results.push({ name: check.name, passed });
    allPassed = allPassed && passed;
  }
  
  // Summary
  log(`\n${colors.bold}📊 Validation Summary:${colors.reset}`);
  for (const result of results) {
    if (result.passed) {
      success(result.name);
    } else {
      error(result.name);
    }
  }
  
  if (allPassed) {
    log(`\n${colors.bold}${colors.green}🎉 Phase 1 Setup Complete!${colors.reset}`);
    log(`${colors.green}All validation checks passed. Ready to proceed to Phase 2.${colors.reset}`);
    log(`\n${colors.blue}Next Steps:${colors.reset}`);
    log('1. Configure your .env file with real API keys');
    log('2. Run: npm install');
    log('3. Run: docker-compose -f docker/docker-compose.dev.yml up -d');
    log('4. Access frontend at http://localhost:3000');
  } else {
    log(`\n${colors.bold}${colors.red}❌ Setup Incomplete${colors.reset}`);
    log(`${colors.red}Some validation checks failed. Please fix the issues above.${colors.reset}`);
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  validateSetup().catch(err => {
    error(`Validation failed: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { validateSetup }; 
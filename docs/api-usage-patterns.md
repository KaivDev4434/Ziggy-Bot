# API Usage Patterns and Limitations

## Perplexity Pro API Integration

### Overview
The Perplexity Pro API serves as the primary AI service for complex reasoning and natural language understanding in the Companion Chatbot system.

### API Configuration
```javascript
// Backend service configuration
const perplexityConfig = {
  baseURL: 'https://api.perplexity.ai',
  model: 'llama-3.1-sonar-large-128k-online',
  timeout: 10000, // 10 seconds
  retries: 3
};
```

### Usage Patterns

#### 1. Task Extraction from Natural Language
```javascript
// Example: Processing user input
const prompt = `
Analyze the following task request and extract relevant information:
Input: "I need to call the dentist by Friday, it's urgent"
Context: User's current tasks and preferences

Extract: task title, deadline, priority level, estimated time, dependencies
Consider: urgency keywords, time expressions, task complexity
`;

// Expected response format
{
  "intent": "CREATE_TASK",
  "entities": {
    "action": "call",
    "target": "dentist", 
    "deadline": "2025-01-25",
    "priority": "high",
    "estimatedTime": 15
  },
  "confidence": 0.95
}
```

#### 2. Intelligent Context-Aware Responses
```javascript
// Context building for better responses
const context = {
  userHistory: "Previous tasks completed on time",
  currentTasks: ["grocery shopping", "project deadline"],
  preferences: {
    workingHours: "9:00-17:00",
    timezone: "UTC-5"
  }
};

// Enhanced prompt with context
const contextualPrompt = `
User context: ${JSON.stringify(context)}
Current request: "${userInput}"
Generate a helpful response that considers the user's current workload and preferences.
`;
```

#### 3. Priority Calculation and Scheduling
```javascript
// Advanced scheduling prompt
const schedulingPrompt = `
Current tasks: ${JSON.stringify(currentTasks)}
New task: "${newTaskInput}"
Working hours: ${userPreferences.workingHours}

Suggest optimal scheduling considering:
- Existing deadlines and priorities
- Task dependencies
- Estimated completion times
- User's productivity patterns
`;
```

### Rate Limiting and Best Practices

#### Rate Limits
- **Requests per minute**: 60
- **Requests per hour**: 1,000
- **Requests per day**: 10,000
- **Tokens per request**: Up to 128k

#### Implementation Strategy
```javascript
class PerplexityRateLimiter {
  constructor() {
    this.requestCount = 0;
    this.resetTime = Date.now() + 60000; // 1 minute
    this.maxRequests = 60;
  }
  
  async checkRateLimit() {
    if (Date.now() > this.resetTime) {
      this.requestCount = 0;
      this.resetTime = Date.now() + 60000;
    }
    
    if (this.requestCount >= this.maxRequests) {
      throw new Error('Rate limit exceeded');
    }
    
    this.requestCount++;
  }
}
```

#### Caching Strategy
```javascript
// Cache frequently used responses
const cache = new Map();

async function getCachedResponse(prompt) {
  const promptHash = generateHash(prompt);
  
  if (cache.has(promptHash)) {
    return cache.get(promptHash);
  }
  
  const response = await perplexityAPI.call(prompt);
  cache.set(promptHash, response);
  
  return response;
}
```

### Error Handling and Fallbacks

#### Error Types and Responses
```javascript
const errorHandling = {
  'RATE_LIMIT_EXCEEDED': () => {
    // Fall back to local LLM
    return localLLM.process(input);
  },
  
  'API_TIMEOUT': () => {
    // Retry with shorter prompt
    return perplexityAPI.call(shortenPrompt(input));
  },
  
  'INVALID_RESPONSE': () => {
    // Use rule-based parsing
    return ruleBasedParser.parse(input);
  },
  
  'NETWORK_ERROR': () => {
    // Queue for later processing
    return queueManager.add(input);
  }
};
```

#### Graceful Degradation
```javascript
async function processWithFallback(input) {
  try {
    // Try Perplexity first
    return await perplexityService.process(input);
  } catch (error) {
    console.warn('Perplexity API failed, falling back to local LLM');
    
    try {
      // Fall back to local LLM
      return await localLLM.process(input);
    } catch (localError) {
      console.warn('Local LLM failed, using rule-based parsing');
      
      // Final fallback to rule-based parsing
      return ruleBasedParser.parse(input);
    }
  }
}
```

## Local LLM Integration (Ollama)

### Setup and Configuration
```yaml
# Docker configuration for Ollama
local-llm:
  image: ollama/ollama:latest
  ports:
    - "11434:11434"
  volumes:
    - ollama_models:/root/.ollama
  environment:
    - OLLAMA_HOST=0.0.0.0:11434
    - OLLAMA_MODELS=llama2:7b-chat,codellama:7b
```

### Model Selection Criteria
```javascript
const modelSelection = {
  'general_chat': 'llama2:7b-chat',      // General conversation
  'task_parsing': 'llama2:7b-chat',      // Task extraction
  'code_help': 'codellama:7b',           // Code-related queries
  'privacy_mode': 'llama2:7b-chat'       // Sensitive data processing
};
```

### Performance Optimization
```javascript
// Optimize for home server deployment
const ollamaConfig = {
  maxTokens: 2048,           // Reasonable limit for responses
  temperature: 0.7,          // Balanced creativity/consistency
  concurrentRequests: 2,     // Limit based on hardware
  keepAlive: '5m',          // Keep model loaded for 5 minutes
  numCtx: 4096              // Context window size
};
```

### Privacy-First Processing
```javascript
// Route sensitive data to local LLM
function routeBasedOnPrivacy(input) {
  const sensitivePatterns = [
    /personal.*information/i,
    /password/i,
    /email.*address/i,
    /phone.*number/i,
    /address/i
  ];
  
  const containsSensitiveData = sensitivePatterns.some(pattern => 
    pattern.test(input)
  );
  
  if (containsSensitiveData) {
    return 'local-llm';
  }
  
  return 'perplexity';
}
```

## Hybrid AI Processing Strategy

### Service Selection Logic
```javascript
class AIOrchestrator {
  async processInput(input, context = {}) {
    const strategy = this.determineStrategy(input, context);
    
    switch (strategy) {
      case 'perplexity':
        return this.processWithPerplexity(input, context);
      
      case 'local':
        return this.processWithLocal(input, context);
      
      case 'hybrid':
        return this.processHybrid(input, context);
      
      default:
        return this.processWithFallback(input, context);
    }
  }
  
  determineStrategy(input, context) {
    // Complex queries -> Perplexity
    if (this.isComplexQuery(input)) {
      return 'perplexity';
    }
    
    // Sensitive data -> Local
    if (this.containsSensitiveData(input)) {
      return 'local';
    }
    
    // Balanced approach for most queries
    return 'hybrid';
  }
}
```

### Performance Monitoring
```javascript
// Track AI service performance
const performanceMetrics = {
  perplexity: {
    avgResponseTime: 0,
    successRate: 0,
    errorCount: 0
  },
  localLLM: {
    avgResponseTime: 0,
    successRate: 0,
    errorCount: 0
  }
};

function updateMetrics(service, responseTime, success) {
  const metric = performanceMetrics[service];
  
  // Update average response time
  metric.avgResponseTime = (metric.avgResponseTime + responseTime) / 2;
  
  // Update success rate
  if (success) {
    metric.successRate = Math.min(metric.successRate + 0.01, 1.0);
  } else {
    metric.successRate = Math.max(metric.successRate - 0.05, 0.0);
    metric.errorCount++;
  }
}
```

## Cost Optimization Strategies

### Token Usage Optimization
```javascript
// Minimize token usage while maintaining quality
function optimizePrompt(input, context) {
  // Remove unnecessary whitespace
  const cleaned = input.trim().replace(/\s+/g, ' ');
  
  // Summarize large context
  const summarizedContext = context.length > 1000 
    ? summarizeContext(context)
    : context;
  
  // Use efficient prompt templates
  return buildEfficientPrompt(cleaned, summarizedContext);
}
```

### Smart Caching
```javascript
// Cache common queries and responses
const responseCache = new LRUCache({
  max: 1000,
  ttl: 1000 * 60 * 30 // 30 minutes
});

async function getCachedOrFetch(prompt) {
  const cacheKey = hashPrompt(prompt);
  
  if (responseCache.has(cacheKey)) {
    return responseCache.get(cacheKey);
  }
  
  const response = await aiService.process(prompt);
  responseCache.set(cacheKey, response);
  
  return response;
}
```

## Security and Privacy Considerations

### Data Sanitization
```javascript
// Remove sensitive information before external API calls
function sanitizeForExternal(data) {
  const sanitized = { ...data };
  
  // Remove PII patterns
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/g,      // SSN
    /\b\d{16}\b/g,                  // Credit card
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g // Email
  ];
  
  piiPatterns.forEach(pattern => {
    sanitized.content = sanitized.content.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}
```

### Audit Logging
```javascript
// Log all AI interactions for debugging and compliance
function logAIInteraction(input, output, service, metadata) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    service,
    inputHash: hashString(input),  // Don't log actual input
    outputHash: hashString(output),
    processingTime: metadata.processingTime,
    success: metadata.success,
    userId: metadata.userId
  };
  
  auditLogger.info(logEntry);
}
```

This documentation provides comprehensive guidance for implementing and optimizing the AI integration components of the Companion Chatbot system while maintaining performance, privacy, and cost-effectiveness. 
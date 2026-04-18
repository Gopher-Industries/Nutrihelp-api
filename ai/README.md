# AI Module Architecture & Standardization Guide

## Overview

This document defines the standard structure and integration patterns for AI-related modules in the Nutrihelp API. The goal is to provide a stable, extensible architecture that supports current operations while preparing for future AI system upgrades (Groq LLM + Chroma RAG pipeline).

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Core Concepts](#core-concepts)
3. [Module Responsibilities](#module-responsibilities)
4. [Integration Guide](#integration-guide)
5. [Configuration](#configuration)
6. [Development & Testing](#development--testing)
7. [Migration Path for Sprint 2](#migration-path-for-sprint-2)

---

## Directory Structure

```
ai/
├── clients/                    # AI service implementations
│   ├── ExternalAIServerClient.js      # External AI server wrappers
│   ├── PythonScriptClient.js          # Python model execution
│   ├── GroqClient.js                  # Groq LLM (future)
│   ├── ChromaClient.js                # Chroma RAG (future)
│   └── index.js                       # Client exports
│
├── interfaces/                 # Service contract definitions
│   ├── AIClientInterface.js           # Base interface
│   ├── ChatbotAIClientInterface.js    # Chatbot service contract
│   ├── MedicalPredictionAIClientInterface.js
│   ├── ImageClassificationAIClientInterface.js
│   ├── RecommendationAIClientInterface.js
│   └── index.js                       # Interface exports
│
├── adapters/                   # Unified access layer for backend
│   ├── AIAdapter.js                   # Main adapter (frontend uses this)
│   ├── ExampleUsage.js                # Usage examples
│   └── index.js                       # Adapter exports
│
├── mocks/                      # Development & testing clients
│   ├── MockChatbotClient.js           # Mock chatbot responses
│   ├── MockMedicalPredictionClient.js # Mock medical predictions
│   ├── MockImageClassificationClient.js
│   └── index.js                       # Mock exports
│
└── README.md                   # This file
```

### Existing Directories (Not Refactored)

Currently Left Untouched:
- `prediction_models/` - Local ML models
- `scripts/` - Utility scripts
- `services/aiExecutionService.js` - Python script executor

**Why?** These are actively used by the AI team. Once their work stabilizes, we'll migrate them into the new structure.

---

## Core Concepts

### 1. **AIClientInterface** - Service Contract

Every AI service implements a specific interface that defines available methods and their contracts:

```javascript
// Example: ChatbotAIClientInterface
class ChatbotAIClientInterface {
  async generateResponse(request, options) { ... }
  async getConversationHistory(userId, options) { ... }
  async clearConversationHistory(userId) { ... }
  async isHealthy() { ... }
  async getStatus() { ... }
}
```

**Benefits:**
- Guarantees all implementations have consistent methods
- Enables easy swapping between real and mock implementations
- Clear contract for what operations are supported

### 2. **AI Response Format** - Standardized Responses

All AI operations return a consistent response structure:

```javascript
{
  success: boolean,           // Operation succeeded
  data: any,                  // Main response data
  error: string|null,         // Error message if failed
  metadata: {                 // Execution details
    source: string,           // Service source (e.g., 'external_ai_server', 'mock')
    timestamp: string,        // ISO timestamp
    requestId?: string        // Tracking ID
  },
  warnings: string[],         // Non-critical issues
  latencyMs: number          // Execution time
}
```

### 3. **AIAdapter** - Unified Access Point

Controllers never call AI services directly. Instead, they use `AIAdapter`:

```javascript
//   OLD (Direct calls)
const response = await fetch('http://localhost:8000/ai-model/chatbot/chat', {...});

//   NEW (Through AIAdapter)
const aiAdapter = getAIAdapter();
const response = await aiAdapter.generateChatResponse({ query });
```

**Benefits:**
- Single point of configuration
- Easy to switch between mock/real implementations
- Centralized error handling and logging
- Service health monitoring
- Future migration path for external services

### 4. **Client Types**

#### **ExternalAIServerClient** (Current)
- Calls localhost:8000 for chatbot and medical predictions
- Direct HTTP wrapper for existing AI infrastructure

#### **PythonScriptClient** (Current)
- Executes local Python scripts for image classification
- Uses existing `aiExecutionService`

#### **GroqClient** (Future - Sprint 2)
- LLM-based chat using Groq API
- Will replace ExternalChatbotClient when API is stabilized

#### **ChromaClient** (Future - Sprint 2)
- Vector-based recommendations using Chroma
- Enables RAG pipeline when ready

#### **MockClients** (Always Available)
- Consistent responses for testing
- No external dependencies required

---

## Module Responsibilities

### AIClientInterface
**Responsibility:** Define service contracts
-   Define method signatures for each AI service type
-   Standardize request/response formats
-   Provide base error handling methods
-   NOT responsible for: Implementation details, external calls

### Clients (ExternalAIServerClient, PythonScriptClient, etc.)
**Responsibility:** Implement service contracts
-   Connect to actual AI services (external servers, Python scripts, APIs)
-   Handle service-specific authentication and error handling
-   Transform responses to standard format
-   NOT responsible for: Choosing which implementation to use, controlling backend logic

### AIAdapter
**Responsibility:** Provide unified access and configuration
-   Manage client instances (real or mock)
-   Route requests to appropriate clients
-   Handle configuration and switching
-   Monitor service health
-   Provide logging and request tracking
-   NOT responsible for: Business logic, controller-level operations

### Mock Clients
**Responsibility:** Provide predictable responses for testing
-   Return realistic but deterministic responses
-   Simulate processing delays
-   Maintain conversation state (for chatbot)
-   NOT responsible for: Actual ML inference, integrating with real databases

---

## Integration Guide

### Step 1: Import AIAdapter in Your Controller

```javascript
// In your controller file
const { getAIAdapter } = require('../../ai/adapters');
```

### Step 2: Get Adapter Instance

```javascript
const aiAdapter = getAIAdapter();
```

### Step 3: Call AI Operations

```javascript
// Generate chatbot response
const response = await aiAdapter.generateChatResponse(
  { query: userInput, userId: userId },
  { requestId: 'unique_request_id' }
);

// Check response
if (!response.success) {
  return res.json({ error: response.error });
}

// Use response data
res.json({ message: response.data.message });
```

### Complete Example: Update chatbotController.js

**Before:**
```javascript
const getChatResponse = async (req, res) => {
  const { user_id, user_input } = req.body;
  const ai_response = await fetch("http://localhost:8000/ai-model/chatbot/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "query": user_input })
  });
  const result = await ai_response.json();
  res.json(result);
};
```

**After:**
```javascript
const { getAIAdapter } = require('../../ai/adapters');

const getChatResponse = async (req, res) => {
  const { user_id, user_input } = req.body;
  
  try {
    const aiAdapter = getAIAdapter();
    const response = await aiAdapter.generateChatResponse(
      { query: user_input, userId: user_id },
      { requestId: `chat_${user_id}_${Date.now()}` }
    );

    if (!response.success) {
      return res.status(500).json({ error: response.error });
    }

    res.json({
      success: true,
      msg: response.data.message,
      latency: response.latencyMs
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

## Configuration

### Environment Variables

```bash
# AI Service Configuration
AI_USE_MOCK=false                              # Use mock clients (true for testing)
AI_SERVER_BASE_URL=http://localhost:8000      # External AI server URL
PYTHON_BIN=python3                            # Python executable
AI_TIMEOUT_MS=30000                           # Default timeout

# Future integrations
GROQ_API_KEY=xxx                              # Groq API key (when ready)
GROQ_MODEL=mixtral-8x7b-32768                # Groq model selection
CHROMA_URL=http://localhost:8000              # Chroma vector DB URL
```

### Programmatic Configuration

```javascript
const { AIAdapter } = require('../../ai/adapters');

const aiAdapter = new AIAdapter({
  useMock: false,
  aiServerUrl: 'http://localhost:8000',
  timeout: 30000,
  enableLogging: true,
  enableFallback: true
});
```

### Switch Between Mock and Production

```javascript
// Development/Testing: Use mocks
const aiAdapter = new AIAdapter({ useMock: true });

// Production: Use real services
const aiAdapter = new AIAdapter({ useMock: false });
```

---

## Development & Testing

### Running with Mock Clients

```bash
# Set environment variable
export AI_USE_MOCK=true

# Or set in .env
AI_USE_MOCK=true

# Start your server
npm start
```

**Benefits of Mocks:**
- No external dependencies
- Consistent, predictable responses
- Fast execution (simulated delays)
- Perfect for unit tests
- Works offline

### Testing Example

```javascript
const { AIAdapter } = require('../../ai/adapters');

describe('Chatbot Integration', () => {
  let aiAdapter;

  beforeEach(() => {
    // Use mocks for tests
    aiAdapter = new AIAdapter({ useMock: true });
  });

  it('should generate a chat response', async () => {
    const response = await aiAdapter.generateChatResponse({
      query: 'What is nutrition?',
      userId: 'test_user'
    });

    expect(response.success).toBe(true);
    expect(response.data.message).toBeDefined();
    expect(response.latencyMs).toBeGreaterThan(0);
  });

  it('should handle errors gracefully', async () => {
    const response = await aiAdapter.generateChatResponse({
      query: '', // Empty query
      userId: 'test_user'
    });

    expect(response.success).toBe(false);
    expect(response.error).toBeDefined();
  });
});
```

### Health Check

Monitor all AI services:

```javascript
const aiAdapter = getAIAdapter();
const health = await aiAdapter.checkSystemHealth();

console.log(health);
// {
//   timestamp: '2026-03-31T...',
//   overallHealthy: true,
//   services: {
//     chatbot: { healthy: true, ... },
//     medicalPrediction: { healthy: true, ... },
//     imageClassification: { healthy: true, ... }
//   }
// }
```

---

## Migration Path for Sprint 2

### Current State (Sprint 1)
  **Interfaces Defined**
- All service contracts are documented
- Backend can use abstraction layer immediately

  **Current Implementations Working**
- External AI Server calls working through wrapper
- Python scripts working through wrapper
- Mock clients available for testing

  **No Breaking Changes**
- AI team can continue current work uninterrupted
- New structure is additive, not disruptive

### Sprint 2 Transition

#### Phase 1: Groq LLM Integration (Week 1-2)
1. Implement `GroqChatbotClient` fully
2. Test with Groq API keys
3. Update `AIAdapter` configuration to support Groq selection
4. Controllers automatically use Groq (no changes needed)

```javascript
// AIAdapter will handle this automatically
// Controllers just keep calling: aiAdapter.generateChatResponse()
```

#### Phase 2: Chroma RAG Pipeline (Week 3-4)
1. Implement `ChromaRecommendationClient` 
2. Set up Chroma vector database
3. Migrate recipe embeddings
4. Update recommendation logic in `AIAdapter`

#### Phase 3: Legacy Service Migration (Week 5-6)
1. Migrate `prediction_models/` → `ai/models/`
2. Migrate utility scripts → `ai/scripts/`
3. Consolidate `aiExecutionService` into clients
4. Clean up redundant implementations

### Migration Steps

**For each AI service becoming stable:**

1. **Create new client implementation**
   ```javascript
   // ai/clients/GroqClient.js
   class GroqChatbotClient extends ChatbotAIClientInterface { ... }
   ```

2. **Update AIAdapter to use new client**
   ```javascript
   // In AIAdapter.initializeClients()
   if (config.useGroq) {
     this.clients.chatbot = new GroqChatbotClient();
   }
   ```

3. **Controllers require NO changes**
   - They already use `aiAdapter.generateChatResponse()`
   - Implementation switching happens transparently

4. **Deprecate old implementation**
   - Keep external server running for rollback
   - Gradually migrate traffic to new implementation
   - Eventually retire old service

---

## Current APIs

### Chatbot Operations

```javascript
// Generate response
await aiAdapter.generateChatResponse(
  { query: string, userId?: string },
  { requestId?: string }
)

// Get history
await aiAdapter.getChatHistory(userId)

// Clear history
await aiAdapter.clearChatHistory(userId)
```

### Medical Prediction Operations

```javascript
// Predict risks
await aiAdapter.predictMedicalRisk(
  { healthData: object }
)

// Specific predictions
await aiAdapter.predictObesity(request)
await aiAdapter.predictDiabetes(request)

// Reports
await aiAdapter.retrieveMedicalReport({ userId })
await aiAdapter.generateMedicalReport({ ... })
```

### Image Classification Operations

```javascript
// Classify food
await aiAdapter.classifyFoodImage({ imageData })

// Classify recipe
await aiAdapter.classifyRecipeImage({ imageData })

// Scan barcode
await aiAdapter.scanBarcode({ barcodeData })

// Extract nutrition
await aiAdapter.extractNutritionLabel({ imageData })
```

### System Operations

```javascript
// Check health
await aiAdapter.checkSystemHealth()

// Get config
aiAdapter.getConfig()
```

---

## Decision Log

### Why Separate Interfaces from Implementations?

**Decision:** Keep interface definitions separate from client code

**Rationale:**
- Controllers import adapters, not interfaces
- Interfaces are for AI team (defines contracts)
- Implementations can be updated without affecting controllers
- Enables mock implementations without duplicating interface code

### Why Mock Clients Always Available?

**Decision:** Mock clients in every environment (dev, test, prod)

**Rationale:**
- Graceful degradation if external services fail
- Testing and local development work offline
- Production can use mocks for failed services
- Zero external dependencies for unit tests

### Why Not Migration Everything Immediately?

**Decision:** Only wrap access points, don't refactor existing AI code

**Rationale:**
- AI system is actively under development
- Refactoring while unstable wastes effort
- Wrappers don't interfere with AI team's work
- Once stable, migration is straightforward

---

## Next Steps

1. **Update Controllers** (Optional, happens gradually)
   - Start with new features
   - Migrate existing ones as you touch them
   - No rush - old and new patterns work concurrently

2. **Monitor Integration**
   - Use health checks regularly
   - Track latency metrics
   - Log request IDs for debugging

3. **Prepare for Sprint 2**
   - AI team focuses on Groq + Chroma
   - Backend team waits for stable APIs
   - Integration happens seamlessly through AIAdapter

4. **Test Coverage**
   - Unit tests: Use MockClients
   - Integration tests: Use AIAdapter with real services
   - End-to-end: Test across all services

---

## Support & Questions

For integration help, see [ExampleUsage.js](./adapters/ExampleUsage.js)

For API contracts, see [interfaces/](./interfaces/)

For testing patterns, see mocks/ directory

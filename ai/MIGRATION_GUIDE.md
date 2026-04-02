# AI Integration Migration Guide

## Overview

This guide provides step-by-step instructions for updating backend controllers to use the new AI module structure. All changes are **non-breaking** and **gradual** - you can migrate controllers one at a time.

## Quick Reference: What to Change

### Pattern 1: Direct HTTP Calls to External AI Server

**Before:**
```javascript
const result = await fetch('http://localhost:8000/ai-model/chatbot/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: userInput })
});
const data = await result.json();
```

**After:**
```javascript
const { getAIAdapter } = require('./ai/adapters');
const aiAdapter = getAIAdapter();
const response = await aiAdapter.generateChatResponse({ query: userInput });
```

---

### Pattern 2: Python Script Execution

**Before:**
```javascript
const { executePythonScript } = require('./services/aiExecutionService');
const result = await executePythonScript({
  scriptPath: './model/imageClassification.py',
  stdin: imageData
});
```

**After:**
```javascript
const { getAIAdapter } = require('./ai/adapters');
const aiAdapter = getAIAdapter();
const response = await aiAdapter.classifyFoodImage({ imageData });
```

---

## Detailed Migration Examples

### Example 1: chatbotController.js

**Current Location:** `controller/chatbotController.js`

**Original Code:**
```javascript
const { addHistory, getHistory, deleteHistory } = require('../model/chatbotHistory');
const fetch = (...args) =>
  import('node-fetch').then(({default: fetch}) => fetch(...args));

const getChatResponse = async (req, res) => {
  const { user_id, user_input } = req.body;

  try {
    if (!user_id || !user_input) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    let responseText = `I understand you're asking about "${user_input}". How can I help?`;
    
    try {
      //   DIRECT EXTERNAL CALL
      const ai_response = await fetch("http://localhost:8000/ai-model/chatbot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "query": user_input })
      });
      
      const result = await ai_response.json();
      if (result && result.msg) {
        responseText = result.msg;
      }
    } catch (aiError) {
      console.error("Error connecting to AI server:", aiError);
    }

    res.json({ success: true, msg: responseText });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getChatResponse };
```

**Migrated Code:**
```javascript
const { addHistory, getHistory, deleteHistory } = require('../model/chatbotHistory');
const { getAIAdapter } = require('../ai/adapters');  // ✅ NEW IMPORT

const getChatResponse = async (req, res) => {
  const { user_id, user_input } = req.body;

  try {
    // Validate input
    if (!user_id || !user_input) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ✅ USE AI ADAPTER INSTEAD OF DIRECT CALL
    const aiAdapter = getAIAdapter();
    const response = await aiAdapter.generateChatResponse(
      { 
        query: user_input,
        userId: user_id
      },
      { 
        requestId: `chat_${user_id}_${Date.now()}` 
      }
    );

    // Check response
    if (!response.success) {
      console.error("AI service error:", response.error);
      // Fallback response
      return res.json({
        success: true,
        msg: `I understand you're asking about "${user_input}". How can I help?`
      });
    }

    // Return AI response
    res.json({
      success: true,
      msg: response.data.message,
      latency: response.latencyMs
    });
  } catch (error) {
    console.error('Error in getChatResponse:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getChatResponse };
```

**Benefits of Migration:**
- ✅ No more manual fetch calls
- ✅ Consistent error handling
- ✅ Automatic fallback to mock if external service fails
- ✅ Request tracking via requestId
- ✅ Easy to switch to Groq in Sprint 2

---

### Example 2: imageClassificationController.js

**Current Location:** `controller/imageClassificationController.js`

**Original Code:**
```javascript
const fs = require('fs');
const path = require('path');
const { executePythonScript } = require('../services/aiExecutionService');

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) console.error('Error deleting file:', err);
  });
};

const predictImage = async (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({
      success: false,
      error: 'No image uploaded.'
    });
  }

  const imagePath = req.file.path;

  try {
    const imageData = await fs.promises.readFile(imagePath);
    //   DIRECT PYTHON SCRIPT EXECUTION
    const result = await executePythonScript({
      scriptPath: path.join(__dirname, '..', 'model', 'imageClassification.py'),
      stdin: imageData
    });

    if (!result.success) {
      const statusCode = result.timedOut ? 504 : 500;
      return res.status(statusCode).json({
        success: false,
        error: result.error || 'Model execution failed.'
      });
    }

    res.json({
      success: true,
      prediction: result.prediction,
      confidence: result.confidence
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    deleteFile(imagePath);
  }
};

module.exports = { predictImage };
```

**Migrated Code:**
```javascript
const fs = require('fs');
const { getAIAdapter } = require('../ai/adapters');  // ✅ NEW IMPORT

const deleteFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) console.error('Error deleting file:', err);
  });
};

const predictImage = async (req, res) => {
  if (!req.file || !req.file.path) {
    return res.status(400).json({
      success: false,
      error: 'No image uploaded.'
    });
  }

  const imagePath = req.file.path;

  try {
    // Read image data
    const imageData = await fs.promises.readFile(imagePath);
    
    // ✅ USE AI ADAPTER
    const aiAdapter = getAIAdapter();
    const response = await aiAdapter.classifyFoodImage(
      { imageData },
      { timeout: 60000 }
    );

    // Check response
    if (!response.success) {
      const statusCode = response.latencyMs > 60000 ? 504 : 500;
      return res.status(statusCode).json({
        success: false,
        error: response.error
      });
    }

    // Return classification
    res.json({
      success: true,
      prediction: response.data.prediction,
      confidence: response.data.confidence,
      nutritionInfo: response.data.nutritionInfo
    });
  } catch (error) {
    console.error('Error in predictImage:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  } finally {
    deleteFile(imagePath);
  }
};

module.exports = { predictImage };
```

**Benefits:**
- ✅ Abstracted away from specific Python implementation
- ✅ Can switch to Groq vision model in future
- ✅ Better error handling and timeouts
- ✅ Consistent with other AI operations

---

### Example 3: medicalPredictionController.js

**Current Location:** `controller/medicalPredictionController.js`

**Original Code:**
```javascript
const AI_RETRIEVE_URL =
  process.env.AI_RETRIEVE_URL ||
  "http://localhost:8000/ai-model/medical-report/retrieve";

const getPrediction = async (req, res) => {
  const { userId } = req.body;

  try {
    //   DIRECT EXTERNAL API CALL
    const result = await fetch(AI_RETRIEVE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });

    const data = await result.json();

    if (!data.success) {
      return res.status(500).json({ error: 'Prediction failed' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getPrediction };
```

**Migrated Code:**
```javascript
const { getAIAdapter } = require('../ai/adapters');  // ✅ NEW IMPORT

const getPrediction = async (req, res) => {
  const { userId } = req.body;

  try {
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // ✅ USE AI ADAPTER
    const aiAdapter = getAIAdapter();
    const response = await aiAdapter.retrieveMedicalReport(
      { userId },
      { timeout: 45000 }  // Longer timeout for complex reports
    );

    if (!response.success) {
      return res.status(500).json({
        error: response.error,
        success: false
      });
    }

    res.json({
      success: true,
      data: response.data,
      msg: response.data.msg || 'Report retrieved successfully'
    });
  } catch (error) {
    console.error('Error in getPrediction:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

module.exports = { getPrediction };
```

**Benefits:**
- ✅ No hardcoded URLs
- ✅ Configuration-driven
- ✅ Easy to test with mocks
- ✅ Future-proof for Groq integration

---

## Migration Checklist

### Controllers to Update (Priority Order)

#### High Priority (Core AI Features)
- [ ] `controller/chatbotController.js` - Chatbot responses
- [ ] `controller/medicalPredictionController.js` - Health predictions
- [ ] `controller/imageClassificationController.js` - Food image classification
- [ ] `controller/barcodeScanningController.js` - Barcode scanning
- [ ] `controller/recipeImageClassificationController.js` - Recipe images

#### Medium Priority (Related Features)
- [ ] `controller/healthToolsController.js` - If it uses AI
- [ ] `controller/recommendationController.js` - Recommendations
- [ ] `controller/mealplanController.js` - Meal planning
- [ ] `controller/recipeNutritionController.js` - Nutrition analysis

#### Low Priority (Can Wait)
- [ ] Any other controllers that touch AI services

---

## Testing Your Migration

### Unit Test Example

```javascript
const { AIAdapter } = require('../../ai/adapters');

describe('Chatbot Controller Migration', () => {
  let mockRes, mockReq;

  beforeEach(() => {
    // Use mocks for testing
    process.env.AI_USE_MOCK = 'true';
    
    mockReq = {
      body: { user_id: 'test_user', user_input: 'test query' }
    };

    mockRes = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  it('should use AIAdapter for chat responses', async () => {
    const { getChatResponse } = require('../../controller/chatbotController');
    
    await getChatResponse(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        msg: expect.any(String)
      })
    );
  });
});
```

### Integration Test Example

```javascript
describe('AI Adapter Integration', () => {
  it('should handle external AI server errors gracefully', async () => {
    const { getAIAdapter, resetAIAdapter } = require('../../ai/adapters');

    // Use real client but server is down
    resetAIAdapter();
    const aiAdapter = new AIAdapter({ useMock: false });

    const response = await aiAdapter.generateChatResponse({
      query: 'test'
    });

    // Should still return valid response structure
    expect(response).toHaveProperty('success');
    expect(response).toHaveProperty('error');
    expect(response).toHaveProperty('latencyMs');
  });
});
```

---

## Rollback Plan

If migration causes issues:

1. **Keep using old pattern temporarily**
   - Controllers can use both old and new patterns simultaneously
   - No all-or-nothing commitment required

2. **Add feature flag**
   ```javascript
   const useNewAI = process.env.USE_NEW_AI_ADAPTER === 'true';

   if (useNewAI) {
     // Use AIAdapter
     const aiAdapter = getAIAdapter();
     // ...
   } else {
     // Use old pattern
     const response = await fetch(oldUrl, {...});
     // ...
   }
   ```

3. **Immediate rollback**
   ```bash
   export USE_NEW_AI_ADAPTER=false
   # Restart server
   ```

---

## Common Integration Issues

### Issue 1: Import Path Not Found

**Error:** `Cannot find module '../ai/adapters'`

**Solution:** Check your file location relative to `ai/adapters/index.js`
```javascript
// If in controller/
const { getAIAdapter } = require('../ai/adapters');

// If in services/
const { getAIAdapter } = require('../ai/adapters');

// If in routes/
const { getAIAdapter } = require('../ai/adapters');
```

### Issue 2: Response Structure Mismatch

**Error:** `Cannot read property 'message' of undefined`

**Solution:** Check response structure
```javascript
const response = await aiAdapter.generateChatResponse({...});

// Correct:
if (response.success) {
  console.log(response.data.message);  // ✅
}

// Incorrect:
console.log(response.message);  //  
```

### Issue 3: Mock vs. Real Service Behavior Differs

**Problem:** Works with mocks but fails with real service

**Solution:** 
1. Check error logs: `response.error`
2. Verify input format matches service expectations
3. Test with both mocks and real service locally

---

## Support

- See `ai/adapters/ExampleUsage.js` for more examples
- See `ai/README.md` for architecture overview
- Check mock implementations in `ai/mocks/` for expected response structures

/**
 * ai/adapters/ExampleUsage.js
 * 
 * Example showing how controllers should use the AI adapter
 * 
 * BEFORE (Old Pattern - Direct calls to external services):
 * ```
 * const fetch = require('node-fetch');
 * const response = await fetch('http://localhost:8000/ai-model/chatbot/chat', {
 *   method: 'POST',
 *   body: JSON.stringify({ query })
 * });
 * ```
 * 
 * AFTER (New Pattern - Through AIAdapter):
 * ```
 * const { getAIAdapter } = require('../../ai/adapters');
 * const aiAdapter = getAIAdapter();
 * const response = await aiAdapter.generateChatResponse({ query });
 * ```
 */

// ============================================================================
// CHATBOT EXAMPLES
// ============================================================================

/**
 * Example: Update chatbotController.js to use AIAdapter
 * 
 * OLD CODE:
 * ```javascript
 * const getChatResponse = async (req, res) => {
 *   const { user_id, user_input } = req.body;
 *   const ai_response = await fetch("http://localhost:8000/ai-model/chatbot/chat", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ "query": user_input })
 *   });
 *   const result = await ai_response.json();
 *   res.json(result);
 * };
 * ```
 * 
 * NEW CODE:
 */
async function getChatResponse_NEW(req, res) {
  const { user_id, user_input } = req.body;
  const { getAIAdapter } = require('../../ai/adapters');

  try {
    const aiAdapter = getAIAdapter();
    
    const response = await aiAdapter.generateChatResponse(
      { 
        query: user_input,
        userId: user_id 
      },
      { 
        requestId: `chat_${Date.now()}_${user_id}` 
      }
    );

    if (!response.success) {
      return res.status(500).json({
        error: response.error,
        msg: 'Failed to generate response'
      });
    }

    res.json({
      msg: response.data.message,
      success: true,
      latency: response.latencyMs
    });
  } catch (error) {
    console.error('Error in getChatResponse:', error);
    res.status(500).json({
      error: error.message,
      msg: 'Internal server error'
    });
  }
}

// ============================================================================
// MEDICAL PREDICTION EXAMPLES
// ============================================================================

/**
 * Example: Update medicalPredictionController.js
 * 
 * OLD CODE:
 * ```javascript
 * const result = await fetch("http://localhost:8000/ai-model/medical-report/retrieve", {
 *   method: "POST",
 *   body: JSON.stringify({ userId, reportId })
 * });
 * ```
 * 
 * NEW CODE:
 */
async function retrieveMedicalReport_NEW(req, res) {
  const { user_id, report_id } = req.body;
  const { getAIAdapter } = require('../../ai/adapters');

  try {
    const aiAdapter = getAIAdapter();
    
    const response = await aiAdapter.retrieveMedicalReport(
      { 
        userId: user_id,
        reportId: report_id 
      },
      { 
        timeout: 45000 // Longer timeout for complex reports
      }
    );

    if (!response.success) {
      return res.status(500).json({
        error: response.error,
        msg: 'Failed to retrieve report'
      });
    }

    res.json({
      msg: response.data.msg || 'Report retrieved successfully',
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Error retrieving medical report:', error);
    res.status(500).json({ error: error.message });
  }
}

// ============================================================================
// IMAGE CLASSIFICATION EXAMPLES
// ============================================================================

/**
 * Example: Update imageClassificationController.js
 * 
 * OLD CODE:
 * ```javascript
 * const result = await executePythonScript({
 *   scriptPath: path.join(__dirname, '..', 'model', 'imageClassification.py'),
 *   stdin: imageData
 * });
 * ```
 * 
 * NEW CODE:
 */
async function classifyFoodImage_NEW(req, res) {
  const fs = require('fs');
  const { getAIAdapter } = require('../../ai/adapters');

  if (!req.file || !req.file.path) {
    return res.status(400).json({
      success: false,
      error: 'No image uploaded.'
    });
  }

  try {
    const imageData = await fs.promises.readFile(req.file.path);
    const aiAdapter = getAIAdapter();
    
    const response = await aiAdapter.classifyFoodImage(
      { imageData },
      { timeout: 60000 }
    );

    // Clean up uploaded file
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting file:', err);
    });

    if (!response.success) {
      return res.status(500).json({
        success: false,
        error: response.error
      });
    }

    res.json({
      success: true,
      prediction: response.data.prediction,
      confidence: response.data.confidence,
      nutritionInfo: response.data.nutritionInfo
    });
  } catch (error) {
    console.error('Error classifying food image:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ============================================================================
// HEALTH CHECK EXAMPLE
// ============================================================================

/**
 * Example: New endpoint to check AI system health
 */
async function checkAIHealth(req, res) {
  const { getAIAdapter } = require('../../ai/adapters');

  try {
    const aiAdapter = getAIAdapter();
    const health = await aiAdapter.checkSystemHealth();
    
    res.json({
      status: health.overallHealthy ? 'healthy' : 'degraded',
      timestamp: health.timestamp,
      services: health.services
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
}

module.exports = {
  getChatResponse_NEW,
  retrieveMedicalReport_NEW,
  classifyFoodImage_NEW,
  checkAIHealth
};

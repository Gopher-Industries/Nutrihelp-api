/**
 * AIAdapter.js
 * 
 * Main adapter layer that provides a unified interface to all AI services.
 * This is what backend controllers should consume instead of calling AI services directly.
 * 
 * The adapter handles:
 * - Service selection (mock, external, local, or future Groq/Chroma)
 * - Configuration management
 * - Error handling and fallbacks
 * - Request logging and monitoring
 * - Graceful degradation
 */

const {
  ExternalChatbotClient,
  ExternalMedicalPredictionClient,
  PythonImageClassificationClient
} = require('../clients');

const {
  MockChatbotClient,
  MockMedicalPredictionClient,
  MockImageClassificationClient
} = require('../mocks');

class AIAdapter {
  constructor(config = {}) {
    this.config = {
      useMock: config.useMock || process.env.AI_USE_MOCK === 'true',
      aiServerUrl: config.aiServerUrl || process.env.AI_SERVER_BASE_URL || 'http://localhost:8000',
      timeout: config.timeout || 30000,
      pythonBin: config.pythonBin || process.env.PYTHON_BIN || 'python3',
      enableLogging: config.enableLogging !== false,
      enableFallback: config.enableFallback !== false,
      ...config
    };

    this.logger = config.logger || console;
    this.clients = {};
    this.initializeClients();
  }

  /**
   * Initialize all AI client instances
   * @private
   */
  initializeClients() {
    if (this.config.useMock) {
      this.log('info', 'Initializing AI adapter in MOCK mode');
      this.clients.chatbot = new MockChatbotClient();
      this.clients.medicalPrediction = new MockMedicalPredictionClient();
      this.clients.imageClassification = new MockImageClassificationClient();
    } else {
      this.log('info', 'Initializing AI adapter with production clients');
      this.clients.chatbot = new ExternalChatbotClient(null, this.config);
      this.clients.medicalPrediction = new ExternalMedicalPredictionClient(null, this.config);
      this.clients.imageClassification = new PythonImageClassificationClient({
        pythonCommand: this.config.pythonBin,
        timeout: this.config.timeout
      });
    }
  }

  /**
   * Log message
   * @private
   */
  log(level, message, data = {}) {
    if (this.config.enableLogging && this.logger) {
      this.logger[level]?.(`[AIAdapter] ${message}`, data);
    }
  }

  /**
   * === CHATBOT SERVICES ===
   */

  /**
   * Generate a chatbot response
   * @param {Object} request - { query, userId?, conversationHistory? }
   * @param {Object} options - { timeout?, requestId?, useMock? }
   * @returns {Promise<AIResponse>}
   */
  async generateChatResponse(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.chatbot.generateResponse(request, options),
      'generateChatResponse',
      options.requestId
    );
  }

  /**
   * Get conversation history for a user
   * @param {string} userId - User ID
   * @returns {Promise<AIResponse>}
   */
  async getChatHistory(userId) {
    return this.executeWithErrorHandling(
      () => this.clients.chatbot.getConversationHistory(userId),
      'getChatHistory'
    );
  }

  /**
   * Clear conversation history
   * @param {string} userId - User ID
   * @returns {Promise<AIResponse>}
   */
  async clearChatHistory(userId) {
    return this.executeWithErrorHandling(
      () => this.clients.chatbot.clearConversationHistory(userId),
      'clearChatHistory'
    );
  }

  /**
   * === MEDICAL PREDICTION SERVICES ===
   */

  /**
   * Predict medical risks
   * @param {Object} request - { healthData, userId? }
   * @param {Object} options - Additional options
   * @returns {Promise<AIResponse>}
   */
  async predictMedicalRisk(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.medicalPrediction.predictRisk(request, options),
      'predictMedicalRisk',
      options.requestId
    );
  }

  /**
   * Predict obesity level
   * @param {Object} request - Health metrics
   * @returns {Promise<AIResponse>}
   */
  async predictObesity(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.medicalPrediction.predictObesity(request, options),
      'predictObesity',
      options.requestId
    );
  }

  /**
   * Predict diabetes risk
   * @param {Object} request - Health metrics
   * @returns {Promise<AIResponse>}
   */
  async predictDiabetes(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.medicalPrediction.predictDiabetes(request, options),
      'predictDiabetes',
      options.requestId
    );
  }

  /**
   * Retrieve medical report
   * @param {Object} request - { userId, reportId? }
   * @returns {Promise<AIResponse>}
   */
  async retrieveMedicalReport(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.medicalPrediction.retrieveReport(request, options),
      'retrieveMedicalReport',
      options.requestId
    );
  }

  /**
   * Generate medical report
   * @param {Object} request - Report generation parameters
   * @returns {Promise<AIResponse>}
   */
  async generateMedicalReport(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.medicalPrediction.generateReport(request, options),
      'generateMedicalReport',
      options.requestId
    );
  }

  /**
   * === IMAGE CLASSIFICATION SERVICES ===
   */

  /**
   * Classify food image
   * @param {Object} request - { imageData, userId? }
   * @returns {Promise<AIResponse>}
   */
  async classifyFoodImage(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.imageClassification.classifyFoodImage(request, options),
      'classifyFoodImage',
      options.requestId
    );
  }

  /**
   * Classify recipe image
   * @param {Object} request - { imageData, userId? }
   * @returns {Promise<AIResponse>}
   */
  async classifyRecipeImage(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.imageClassification.classifyRecipeImage(request, options),
      'classifyRecipeImage',
      options.requestId
    );
  }

  /**
   * Scan barcode
   * @param {Object} request - { barcodeData }
   * @returns {Promise<AIResponse>}
   */
  async scanBarcode(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.imageClassification.scanBarcode(request, options),
      'scanBarcode',
      options.requestId
    );
  }

  /**
   * Extract nutrition label information from image
   * @param {Object} request - { imageData }
   * @returns {Promise<AIResponse>}
   */
  async extractNutritionLabel(request, options = {}) {
    return this.executeWithErrorHandling(
      () => this.clients.imageClassification.extractNutritionLabel(request, options),
      'extractNutritionLabel',
      options.requestId
    );
  }

  /**
   * === SYSTEM OPERATIONS ===
   */

  /**
   * Check health of all AI services
   * @returns {Promise<Object>} Health status for all services
   */
  async checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      services: {}
    };

    for (const [name, client] of Object.entries(this.clients)) {
      try {
        health.services[name] = {
          healthy: await client.isHealthy(),
          status: await client.getStatus()
        };
      } catch (error) {
        health.services[name] = {
          healthy: false,
          error: error.message
        };
      }
    }

    health.overallHealthy = Object.values(health.services).every(s => s.healthy);
    return health;
  }

  /**
   * Get configuration status
   * @returns {Object} Current adapter configuration
   */
  getConfig() {
    return {
      useMock: this.config.useMock,
      aiServerUrl: this.config.aiServerUrl,
      timeout: this.config.timeout,
      enableLogging: this.config.enableLogging,
      enableFallback: this.config.enableFallback
    };
  }

  /**
   * Error handling wrapper
   * @private
   */
  async executeWithErrorHandling(fn, operation, requestId = null) {
    try {
      this.log('debug', `Executing operation: ${operation}`, { requestId });
      const result = await fn();
      
      if (result.success) {
        this.log('debug', `Operation succeeded: ${operation}`, {
          requestId,
          latencyMs: result.latencyMs
        });
      } else {
        this.log('warn', `Operation failed: ${operation}`, {
          requestId,
          error: result.error
        });
      }
      
      return result;
    } catch (error) {
      this.log('error', `Unexpected error in operation: ${operation}`, {
        requestId,
        error: error.message
      });
      
      return {
        success: false,
        data: null,
        error: error.message || 'Unexpected error',
        metadata: {
          operation,
          requestId,
          timestamp: new Date().toISOString()
        },
        warnings: [],
        latencyMs: 0
      };
    }
  }
}

// Singleton instance
let adapterInstance = null;

/**
 * Get or create the AI adapter singleton
 */
function getAIAdapter(config = {}) {
  if (!adapterInstance) {
    adapterInstance = new AIAdapter(config);
  }
  return adapterInstance;
}

/**
 * Reset adapter (useful for testing)
 */
function resetAIAdapter() {
  adapterInstance = null;
}

module.exports = {
  AIAdapter,
  getAIAdapter,
  resetAIAdapter
};

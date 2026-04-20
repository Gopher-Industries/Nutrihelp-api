/**
 * ExternalAIServerClient.js
 * 
 * Wrapper for external AI server at localhost:8000
 * Currently handles chatbot and medical prediction services.
 * This is a bridge to existing AI infrastructure during transition period.
 */

const ChatbotAIClientInterface = require('../interfaces/ChatbotAIClientInterface');
const MedicalPredictionAIClientInterface = require('../interfaces/MedicalPredictionAIClientInterface');

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_BASE_URL = process.env.AI_SERVER_BASE_URL || 'http://localhost:8000';

/**
 * Generic HTTP client for AI server
 */
class ExternalAIServerClient {
  constructor(baseUrl = DEFAULT_BASE_URL, timeout = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = timeout;
    this.isHealthy = true;
    this.lastHealthCheck = null;
  }

  /**
   * Make a request to the AI server
   * @private
   */
  async makeRequest(endpoint, method = 'POST', body = null, options = {}) {
    const startTime = Date.now();
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const fetchOptions = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        timeout: options.timeout || this.timeout
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);
      const data = await response.json();

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(
          `AI Server error: ${response.status} - ${data.error || response.statusText}`
        );
      }

      return {
        success: true,
        data,
        latencyMs,
        requestId: options.requestId
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      throw {
        success: false,
        error: error.message,
        latencyMs,
        requestId: options.requestId
      };
    }
  }

  /**
   * Check if AI server is healthy
   */
  async checkHealth() {
    try {
      const response = await this.makeRequest('/health', 'GET');
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      this.isHealthy = false;
      console.error('AI Server health check failed:', error.error);
      return false;
    }
  }
}

/**
 * Chatbot AI Client - uses external AI server
 */
class ExternalChatbotClient extends ChatbotAIClientInterface {
  constructor(serverClient = null, config = {}) {
    super(config);
    this.serverClient = serverClient || new ExternalAIServerClient();
  }

  async generateResponse(request, options = {}) {
    const validation = this.validateRequest(request, ['query']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.serverClient.makeRequest(
        '/ai-model/chatbot/chat',
        'POST',
        { query: request.query },
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'generateResponse');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'external_ai_server',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return this.errorResponse(error, 'generateResponse');
    }
  }

  async getConversationHistory(userId, options = {}) {
    if (!userId) {
      return this.errorResponse(new Error('userId is required'));
    }

    try {
      const result = await this.serverClient.makeRequest(
        `/ai-model/chatbot/history/${userId}`,
        'GET',
        null,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'getConversationHistory');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'external_ai_server'
        }
      });
    } catch (error) {
      return this.errorResponse(error, 'getConversationHistory');
    }
  }

  async clearConversationHistory(userId) {
    if (!userId) {
      return this.errorResponse(new Error('userId is required'));
    }

    try {
      const result = await this.serverClient.makeRequest(
        `/ai-model/chatbot/history/${userId}`,
        'DELETE',
        null
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'clearConversationHistory');
      }

      return this.successResponse({ cleared: true }, {
        latencyMs: result.latencyMs
      });
    } catch (error) {
      return this.errorResponse(error, 'clearConversationHistory');
    }
  }

  async isHealthy() {
    return this.serverClient.checkHealth();
  }

  async getStatus() {
    return {
      serviceName: this.serviceName,
      healthy: this.serverClient.isHealthy,
      lastHealthCheck: this.serverClient.lastHealthCheck,
      baseUrl: this.serverClient.baseUrl
    };
  }
}

/**
 * Medical Prediction AI Client - uses external AI server
 */
class ExternalMedicalPredictionClient extends MedicalPredictionAIClientInterface {
  constructor(serverClient = null, config = {}) {
    super(config);
    this.serverClient = serverClient || new ExternalAIServerClient();
  }

  async predictRisk(request, options = {}) {
    const validation = this.validateRequest(request, ['healthData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.serverClient.makeRequest(
        '/ai-model/medical-prediction/risk',
        'POST',
        request.healthData,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'predictRisk');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'external_ai_server',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      return this.errorResponse(error, 'predictRisk');
    }
  }

  async predictObesity(request, options = {}) {
    try {
      const result = await this.serverClient.makeRequest(
        '/ai-model/medical-prediction/obesity',
        'POST',
        request,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'predictObesity');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs
      });
    } catch (error) {
      return this.errorResponse(error, 'predictObesity');
    }
  }

  async predictDiabetes(request, options = {}) {
    try {
      const result = await this.serverClient.makeRequest(
        '/ai-model/medical-prediction/diabetes',
        'POST',
        request,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'predictDiabetes');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs
      });
    } catch (error) {
      return this.errorResponse(error, 'predictDiabetes');
    }
  }

  async retrieveReport(request, options = {}) {
    const validation = this.validateRequest(request, ['userId']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.serverClient.makeRequest(
        '/ai-model/medical-report/retrieve',
        'POST',
        request,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'retrieveReport');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs
      });
    } catch (error) {
      return this.errorResponse(error, 'retrieveReport');
    }
  }

  async generateReport(request, options = {}) {
    try {
      const result = await this.serverClient.makeRequest(
        '/ai-model/medical-prediction/report',
        'POST',
        request,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'generateReport');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs
      });
    } catch (error) {
      return this.errorResponse(error, 'generateReport');
    }
  }

  async isHealthy() {
    return this.serverClient.checkHealth();
  }

  async getStatus() {
    return {
      serviceName: this.serviceName,
      healthy: this.serverClient.isHealthy,
      lastHealthCheck: this.serverClient.lastHealthCheck,
      baseUrl: this.serverClient.baseUrl
    };
  }
}

module.exports = {
  ExternalAIServerClient,
  ExternalChatbotClient,
  ExternalMedicalPredictionClient
};

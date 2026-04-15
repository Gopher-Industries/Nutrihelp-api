/**
 * AIClientInterface.js
 * 
 * Base interface for all AI client implementations.
 * All AI service wrappers should implement this interface or a specialized version of it.
 * 
 * This ensures consistent behavior, error handling, and logging across all AI services.
 */

/**
 * @typedef {Object} AIResponse
 * @property {boolean} success - Whether the AI operation succeeded
 * @property {*} data - The main response data (structure varies by service)
 * @property {string|null} error - Error message if operation failed
 * @property {Object} metadata - Additional metadata (latency, model version, etc.)
 * @property {Array<string>} warnings - Non-critical warnings
 * @property {number} latencyMs - Time taken to complete the request
 */

/**
 * @typedef {Object} AIRequestOptions
 * @property {number} [timeout=30000] - Request timeout in milliseconds
 * @property {boolean} [useMock=false] - Use mock response for testing
 * @property {boolean} [logRequest=true] - Whether to log the request
 * @property {string} [requestId] - Unique request identifier for tracking
 */

class AIClientInterface {
  /**
   * Base constructor - should be called by subclasses
   * @param {string} serviceName - Name of the AI service (e.g., 'chatbot', 'medicalPrediction')
   * @param {Object} config - Service configuration
   */
  constructor(serviceName, config = {}) {
    this.serviceName = serviceName;
    this.config = config;
    this.isHealthy = true;
    this.lastHealthCheck = null;
  }

  /**
   * Check if the AI service is available/healthy
   * @returns {Promise<boolean>}
   */
  async isHealthy() {
    throw new Error('isHealthy() must be implemented by subclass');
  }

  /**
   * Get service status and version information
   * @returns {Promise<Object>} Status object with service info
   */
  async getStatus() {
    throw new Error('getStatus() must be implemented by subclass');
  }

  /**
   * Standard error handling for all AI clients
   * @param {Error} error - The error that occurred
   * @param {string} [context] - Additional context about where error occurred
   * @returns {AIResponse} Standardized error response
   */
  errorResponse(error, context = '') {
    return {
      success: false,
      data: null,
      error: error.message || String(error),
      metadata: {
        context,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      },
      warnings: [],
      latencyMs: 0
    };
  }

  /**
   * Standard success response
   * @param {*} data - Response data
   * @param {Object} [options={}] - Additional options
   * @returns {AIResponse}
   */
  successResponse(data, options = {}) {
    return {
      success: true,
      data,
      error: null,
      metadata: {
        timestamp: new Date().toISOString(),
        ...options.metadata
      },
      warnings: options.warnings || [],
      latencyMs: options.latencyMs || 0
    };
  }

  /**
   * Validate request before processing
   * @param {Object} request - Request object to validate
   * @param {Array<string>} requiredFields - List of required field names
   * @returns {Object} Validation result: { valid: boolean, error?: string }
   */
  validateRequest(request, requiredFields = []) {
    if (!request || typeof request !== 'object') {
      return { valid: false, error: 'Request must be a valid object' };
    }

    for (const field of requiredFields) {
      if (request[field] === undefined || request[field] === null) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }

    return { valid: true };
  }
}

module.exports = AIClientInterface;

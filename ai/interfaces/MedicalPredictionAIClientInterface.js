/**
 * MedicalPredictionAIClientInterface.js
 * 
 * Interface for medical prediction AI services.
 * Handles health risk assessments and medical predictions.
 */

const AIClientInterface = require('./AIClientInterface');

class MedicalPredictionAIClientInterface extends AIClientInterface {
  constructor(config = {}) {
    super('medicalPrediction', config);
  }

  /**
   * Predict medical risk based on health data
   * @param {Object} request - Health data for prediction
   * @param {Object} request.healthData - User health metrics
   * @param {string} [request.userId] - User ID
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>} Response containing prediction and risk assessment
   */
  async predictRisk(request, options = {}) {
    throw new Error('predictRisk() must be implemented by subclass');
  }

  /**
   * Predict obesity level
   * @param {Object} request - Request with health metrics
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async predictObesity(request, options = {}) {
    throw new Error('predictObesity() must be implemented by subclass');
  }

  /**
   * Predict diabetes risk
   * @param {Object} request - Request with health metrics
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async predictDiabetes(request, options = {}) {
    throw new Error('predictDiabetes() must be implemented by subclass');
  }

  /**
   * Generate medical report
   * @param {Object} request - Request data for report generation
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async generateReport(request, options = {}) {
    throw new Error('generateReport() must be implemented by subclass');
  }

  /**
   * Retrieve previous medical report
   * @param {Object} request - Request parameters
   * @param {string} request.userId - User ID
   * @param {string} [request.reportId] - Specific report ID to retrieve
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async retrieveReport(request, options = {}) {
    throw new Error('retrieveReport() must be implemented by subclass');
  }
}

module.exports = MedicalPredictionAIClientInterface;

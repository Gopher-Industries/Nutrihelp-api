/**
 * ImageClassificationAIClientInterface.js
 * 
 * Interface for image classification AI services.
 * Handles food image recognition, barcode processing, and recipe image analysis.
 */

const AIClientInterface = require('./AIClientInterface');

class ImageClassificationAIClientInterface extends AIClientInterface {
  constructor(config = {}) {
    super('imageClassification', config);
  }

  /**
   * Classify a food image
   * @param {Object} request - Request object
   * @param {Buffer|string} request.imageData - Image binary data or path
   * @param {string} [request.userId] - User ID for tracking
   * @param {Object} [request.options] - Classification options
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>} Response with prediction, confidence, and food details
   */
  async classifyFoodImage(request, options = {}) {
    throw new Error('classifyFoodImage() must be implemented by subclass');
  }

  /**
   * Classify a recipe image
   * @param {Object} request - Request object
   * @param {Buffer|string} request.imageData - Image binary data or path
   * @param {string} [request.userId] - User ID for tracking
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async classifyRecipeImage(request, options = {}) {
    throw new Error('classifyRecipeImage() must be implemented by subclass');
  }

  /**
   * Scan and recognize barcode
   * @param {Object} request - Request object
   * @param {Buffer|string} request.barcodeData - Barcode image data or path
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>} Response with barcode value, product info
   */
  async scanBarcode(request, options = {}) {
    throw new Error('scanBarcode() must be implemented by subclass');
  }

  /**
   * Extract nutrition information from image
   * @param {Object} request - Request object
   * @param {Buffer|string} request.imageData - Image of nutrition label
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async extractNutritionLabel(request, options = {}) {
    throw new Error('extractNutritionLabel() must be implemented by subclass');
  }
}

module.exports = ImageClassificationAIClientInterface;

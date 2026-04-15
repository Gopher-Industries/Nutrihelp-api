/**
 * PythonScriptClient.js
 * 
 * Wrapper for Python-based image classification and prediction models.
 * Executes Python scripts locally and handles input/output serialization.
 */

const path = require('path');
const { executePythonScript } = require('../../services/aiExecutionService');
const ImageClassificationAIClientInterface = require('../interfaces/ImageClassificationAIClientInterface');

/**
 * Python Script Client for image classification
 */
class PythonImageClassificationClient extends ImageClassificationAIClientInterface {
  constructor(config = {}) {
    super(config);
    this.pythonCommand = config.pythonCommand || process.env.PYTHON_BIN || 'python3';
    this.modelDirectory = config.modelDirectory || path.join(__dirname, '../../model');
    this.timeout = config.timeout || 30000;
  }

  /**
   * Execute a Python script for classification
   * @private
   */
  async executePythonModel(scriptName, inputData, options = {}) {
    const startTime = Date.now();

    try {
      const scriptPath = path.join(this.modelDirectory, scriptName);
      
      const result = await executePythonScript({
        scriptPath,
        stdin: inputData,
        timeout: options.timeout || this.timeout,
        ...options
      });

      const latencyMs = Date.now() - startTime;

      if (!result.success) {
        throw new Error(result.error || 'Python model execution failed');
      }

      return {
        success: true,
        data: result.data,
        latencyMs,
        warnings: result.warnings || []
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      throw {
        success: false,
        error: error.message || String(error),
        latencyMs
      };
    }
  }

  async classifyFoodImage(request, options = {}) {
    const validation = this.validateRequest(request, ['imageData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.executePythonModel(
        'imageClassification.py',
        request.imageData,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'classifyFoodImage');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'python_local',
          model: 'food_classification',
          timestamp: new Date().toISOString()
        },
        warnings: result.warnings
      });
    } catch (error) {
      return this.errorResponse(error, 'classifyFoodImage');
    }
  }

  async classifyRecipeImage(request, options = {}) {
    const validation = this.validateRequest(request, ['imageData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.executePythonModel(
        'recipeImageClassification.py',
        request.imageData,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'classifyRecipeImage');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'python_local',
          model: 'recipe_classification'
        },
        warnings: result.warnings
      });
    } catch (error) {
      return this.errorResponse(error, 'classifyRecipeImage');
    }
  }

  async scanBarcode(request, options = {}) {
    const validation = this.validateRequest(request, ['barcodeData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.executePythonModel(
        'barcodeScanning.py',
        request.barcodeData,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'scanBarcode');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'python_local',
          model: 'barcode_scanner'
        }
      });
    } catch (error) {
      return this.errorResponse(error, 'scanBarcode');
    }
  }

  async extractNutritionLabel(request, options = {}) {
    const validation = this.validateRequest(request, ['imageData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    try {
      const result = await this.executePythonModel(
        'nutritionLabelExtraction.py',
        request.imageData,
        options
      );

      if (!result.success) {
        return this.errorResponse(new Error(result.error), 'extractNutritionLabel');
      }

      return this.successResponse(result.data, {
        latencyMs: result.latencyMs,
        metadata: {
          source: 'python_local',
          model: 'nutrition_extraction'
        }
      });
    } catch (error) {
      return this.errorResponse(error, 'extractNutritionLabel');
    }
  }

  async isHealthy() {
    // Check if Python is available and model files exist
    try {
      // This would require additional implementation to check Python availability
      // and model file paths
      return true;
    } catch {
      return false;
    }
  }

  async getStatus() {
    return {
      serviceName: this.serviceName,
      type: 'python_local',
      pythonCommand: this.pythonCommand,
      modelDirectory: this.modelDirectory,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  PythonImageClassificationClient
};

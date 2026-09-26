/**
 * RecommendationAIClientInterface.js
 * 
 * Interface for recommendation AI services.
 * Handles recipe recommendations and personalized suggestions.
 */

const AIClientInterface = require('./AIClientInterface');

class RecommendationAIClientInterface extends AIClientInterface {
  constructor(config = {}) {
    super('recommendation', config);
  }

  /**
   * Generate recipe recommendations
   * @param {Object} request - Request object
   * @param {string} request.userId - User ID
   * @param {Object} [request.preferences] - User preferences and constraints
   * @param {Object} [request.healthIndicators] - Health and medical indicators
   * @param {number} [request.limit=5] - Number of recommendations to return
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>} Response with recommended recipes
   */
  async recommendRecipes(request, options = {}) {
    throw new Error('recommendRecipes() must be implemented by subclass');
  }

  /**
   * Generate personalized health recommendations
   * @param {Object} request - Request object
   * @param {string} request.userId - User ID
   * @param {Object} request.userProfile - User profile and health data
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async generateHealthRecommendations(request, options = {}) {
    throw new Error('generateHealthRecommendations() must be implemented by subclass');
  }

  /**
   * Get personalized meal plan recommendations
   * @param {Object} request - Request object
   * @param {string} request.userId - User ID
   * @param {Object} request.requirements - Meal plan requirements (duration, preferences, etc.)
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async generateMealPlan(request, options = {}) {
    throw new Error('generateMealPlan() must be implemented by subclass');
  }

  /**
   * Get food suggestions based on available ingredients
   * @param {Object} request - Request object
   * @param {Array<string>} request.ingredients - Available ingredients
   * @param {Object} [request.constraints] - Dietary constraints
   * @param {AIRequestOptions} [options] - Additional request options
   * @returns {Promise<AIResponse>}
   */
  async suggestRecipesByIngredients(request, options = {}) {
    throw new Error('suggestRecipesByIngredients() must be implemented by subclass');
  }
}

module.exports = RecommendationAIClientInterface;

/**
 * MockImageClassificationClient.js
 * 
 * Mock image classification client for development and testing.
 */

const ImageClassificationAIClientInterface = require('../interfaces/ImageClassificationAIClientInterface');

class MockImageClassificationClient extends ImageClassificationAIClientInterface {
  constructor(config = {}) {
    super(config);
    this.mockFoods = [
      { name: 'apple', confidence: 0.95, calories: 95 },
      { name: 'banana', confidence: 0.92, calories: 105 },
      { name: 'salad', confidence: 0.88, calories: 150 },
      { name: 'sandwich', confidence: 0.91, calories: 350 }
    ];
  }

  async classifyFoodImage(request, options = {}) {
    const validation = this.validateRequest(request, ['imageData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    // Return random mock food
    const mockFood = this.mockFoods[Math.floor(Math.random() * this.mockFoods.length)];

    const mockPrediction = {
      prediction: mockFood.name,
      confidence: mockFood.confidence,
      alternatives: [
        { name: `${mockFood.name}_variant`, confidence: 0.8 }
      ],
      nutritionInfo: {
        calories: mockFood.calories,
        protein: Math.random() * 20,
        carbs: Math.random() * 50,
        fat: Math.random() * 20
      }
    };

    return this.successResponse(mockPrediction, {
      latencyMs: 200,
      metadata: {
        source: 'mock_image_classification',
        model: 'food_classifier',
        mockData: true
      }
    });
  }

  async classifyRecipeImage(request, options = {}) {
    const validation = this.validateRequest(request, ['imageData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    await new Promise(resolve => setTimeout(resolve, 200));

    const mockPrediction = {
      prediction: 'pasta_carbonara',
      confidence: 0.89,
      ingredients: ['pasta', 'eggs', 'bacon', 'cheese'],
      servings: 4,
      prepTime: '20 minutes',
      cookTime: '15 minutes'
    };

    return this.successResponse(mockPrediction, {
      latencyMs: 200,
      metadata: {
        source: 'mock_image_classification',
        model: 'recipe_classifier'
      }
    });
  }

  async scanBarcode(request, options = {}) {
    const validation = this.validateRequest(request, ['barcodeData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const mockBarcode = {
      barcodeValue: '5901234123457',
      productName: 'Whole Grain Bread',
      brand: 'Nature Fresh',
      nutritionFacts: {
        servingSize: '1 slice (35g)',
        calories: 80,
        protein: 4,
        carbs: 14,
        fat: 1,
        fiber: 2
      }
    };

    return this.successResponse(mockBarcode, {
      latencyMs: 100,
      metadata: {
        source: 'mock_image_classification',
        model: 'barcode_scanner'
      }
    });
  }

  async extractNutritionLabel(request, options = {}) {
    const validation = this.validateRequest(request, ['imageData']);
    if (!validation.valid) {
      return this.errorResponse(new Error(validation.error));
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    const mockNutrition = {
      extractedData: {
        servingSize: '1 cup (240ml)',
        servingsPerContainer: 2,
        calories: 150,
        fatTotal: 2,
        fatSaturated: 0.5,
        cholesterol: 0,
        sodium: 300,
        carbs: 30,
        fiber: 1,
        sugar: 5,
        protein: 8,
        vitaminA: 4,
        vitaminC: 2,
        calcium: 30,
        iron: 8
      },
      confidence: 0.87
    };

    return this.successResponse(mockNutrition, {
      latencyMs: 300,
      metadata: {
        source: 'mock_image_classification',
        model: 'nutrition_extractor'
      }
    });
  }

  async isHealthy() {
    return true;
  }

  async getStatus() {
    return {
      serviceName: this.serviceName,
      type: 'mock',
      healthy: true,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  MockImageClassificationClient
};

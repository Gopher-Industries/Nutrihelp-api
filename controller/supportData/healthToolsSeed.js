/**
 * data/healthToolsSeed.js
 *
 * Catalogue of health tools the frontend renders on /health-tools.
 * Static so that the page is always populated; individual tools can still
 * have their own dynamic endpoints (e.g. /api/health-tools/bmi).
 */

module.exports = [
  {
    id: 'bmi',
    name: 'BMI Calculator',
    description:
      'Estimate your Body Mass Index from height and weight, plus a recommended daily water intake.',
    endpoint: '/api/health-tools/bmi',
    method: 'GET',
    inputs: [
      { name: 'height', type: 'number', unit: 'm', required: true },
      { name: 'weight', type: 'number', unit: 'kg', required: true },
    ],
    category: 'Body Composition',
  },
  {
    id: 'water-intake',
    name: 'Water Intake Estimator',
    description:
      'Recommended daily water intake based on body weight (35 ml per kg).',
    endpoint: '/api/water-intake',
    method: 'GET',
    inputs: [{ name: 'weight', type: 'number', unit: 'kg', required: true }],
    category: 'Hydration',
  },
  {
    id: 'meal-plan',
    name: 'AI Meal Planner',
    description:
      'Generate a personalised meal plan based on your dietary preferences and goals.',
    endpoint: '/api/meal-plan',
    method: 'POST',
    inputs: [{ name: 'preferences', type: 'object', required: false }],
    category: 'Planning',
  },
  {
    id: 'shopping-list',
    name: 'Shopping List Builder',
    description:
      'Build and manage a shopping list aggregated from your saved meal plans.',
    endpoint: '/api/shopping-list',
    method: 'GET',
    inputs: [],
    category: 'Planning',
  },
  {
    id: 'barcode',
    name: 'Barcode Scanner',
    description:
      'Look up nutrition facts for packaged foods by scanning a product barcode.',
    endpoint: '/api/barcode',
    method: 'POST',
    inputs: [{ name: 'barcode', type: 'string', required: true }],
    category: 'Lookup',
  },
  {
    id: 'recipe-cost',
    name: 'Recipe Cost Estimator',
    description:
      'Estimate the cost of a recipe from its ingredients and current market prices.',
    endpoint: '/api/recipe/cost',
    method: 'POST',
    inputs: [{ name: 'recipeId', type: 'string', required: true }],
    category: 'Planning',
  },
];

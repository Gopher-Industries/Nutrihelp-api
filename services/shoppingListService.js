const { ServiceError } = require('./serviceError');

async function getIngredientOptions(name) {
  if (!name) {
    throw new ServiceError(400, 'Ingredient name parameter is required');
  }
  return [];
}

async function generateFromMealPlan(userId, mealPlanIds) {
  if (!userId || !mealPlanIds || !Array.isArray(mealPlanIds)) {
    throw new ServiceError(400, 'User ID and meal plan IDs array are required');
  }
  return { id: 123, status: 'generated' };
}

module.exports = {
  getIngredientOptions,
  generateFromMealPlan
};

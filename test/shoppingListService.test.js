const { expect } = require('chai');

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key';

const { ServiceError } = require('../services/serviceError');
const shoppingListService = require('../services/shoppingListService');

describe('Shopping list service', () => {
  it('rejects ingredient option lookups without a name', async () => {
    try {
      await shoppingListService.getIngredientOptions('');
      throw new Error('Expected getIngredientOptions to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.equal('Ingredient name parameter is required');
    }
  });

  it('rejects meal-plan generation without required identifiers', async () => {
    try {
      await shoppingListService.generateFromMealPlan({ userId: null, mealPlanIds: null });
      throw new Error('Expected generateFromMealPlan to throw');
    } catch (error) {
      expect(error).to.be.instanceOf(ServiceError);
      expect(error.statusCode).to.equal(400);
      expect(error.message).to.equal('User ID and meal plan IDs array are required');
    }
  });
});

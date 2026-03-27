const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function fetchIngredientSubstitutions(ingredientId, options = {}) {
  try {
    const { data: originalIngredient, error: originalError } = await supabase
      .from('ingredients')
      .select('id, name, category')
      .eq('id', ingredientId)
      .single();

    if (originalError) throw originalError;
    if (!originalIngredient) {
      throw new Error('Ingredient not found');
    }

    let query = supabase
      .from('ingredients')
      .select('id, name, category')
      .eq('category', originalIngredient.category)
      .neq('id', ingredientId);

    if (options.allergies && options.allergies.length > 0) {
      const { data: allergyIngredients, error } = await supabase
        .from('ingredient_allergies')
        .select('ingredient_id')
        .in('allergy_id', options.allergies);
      if (error) throw error;

      if (allergyIngredients?.length) {
        const allergyIngredientIds = allergyIngredients.map((item) => item.ingredient_id);
        query = query.not('id', 'in', allergyIngredientIds);
      }
    }

    if (options.dietaryRequirements && options.dietaryRequirements.length > 0) {
      const { data: dietaryIngredients, error } = await supabase
        .from('user_dietary_requirements')
        .select('ingredient_id')
        .in('dietary_requirement_id', options.dietaryRequirements);
      if (error) throw error;

      if (dietaryIngredients?.length) {
        query = query.in('id', dietaryIngredients.map((item) => item.ingredient_id));
      }
    }

    if (options.healthConditions && options.healthConditions.length > 0) {
      const { data: healthIngredients, error } = await supabase
        .from('user_health_conditions')
        .select('ingredient_id')
        .in('health_condition_id', options.healthConditions);
      if (error) throw error;

      if (healthIngredients?.length) {
        query = query.in('id', healthIngredients.map((item) => item.ingredient_id));
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      original: originalIngredient,
      substitutes: data || []
    };
  } catch (error) {
    throw wrapRepositoryError('Failed to fetch ingredient substitutions', error, { ingredientId });
  }
}

module.exports = {
  fetchIngredientSubstitutions
};

const supabase = require('../dbConnection');
const { wrapRepositoryError } = require('./repositoryError');

async function getRecentRecipeIds(userId, limit = 20) {
  try {
    const { data, error } = await supabase
      .from('recipe_meal')
      .select('recipe_id')
      .eq('user_id', userId)
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || []).map((row) => row.recipe_id).filter(Boolean);
  } catch (error) {
    throw wrapRepositoryError('Failed to load recent recipe ids', error, { userId, limit });
  }
}

async function getCandidateRecipes(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('id, recipe_name, cuisine_id, cooking_method_id, total_servings, preparation_time, calories, fat, carbohydrates, protein, fiber, sodium, sugar, allergy, dislike')
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    throw wrapRepositoryError('Failed to load candidate recipes', error, { limit });
  }
}

module.exports = {
  getCandidateRecipes,
  getRecentRecipeIds
};

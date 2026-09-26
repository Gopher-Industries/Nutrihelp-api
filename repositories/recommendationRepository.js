const supabase = require("../dbConnection");

async function getRecentRecipeIdsByUserId(userId, limit = 20) {
  const { data, error } = await supabase
    .from("recipe_meal")
    .select("recipe_id")
    .eq("user_id", userId)
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

async function getCandidateRecipes(limit = 50) {
  const { data, error } = await supabase
    .from("recipes")
    .select("id, recipe_name, cuisine_id, cooking_method_id, total_servings, preparation_time, calories, fat, carbohydrates, protein, fiber, sodium, sugar, allergy, dislike")
    .limit(limit);

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  getCandidateRecipes,
  getRecentRecipeIdsByUserId,
};

const supabase = require("../dbConnection.js");

async function getRecipeIngredients(recipe_id) {
  try {
		let { data, error } = await supabase
			.from("recipes")
			.select("ingredients")
      .eq("id", recipe_id);
		return data;
	} catch (error) {
		throw error;
	}
}

async function getIngredientsPrice(ingredient_id) {
  try {
    let { data, error } = await supabase
      .from("ingredient_price")
      .select("*")
      .in("ingredient_id", ingredient_id);
    return data;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  getRecipeIngredients,
  getIngredientsPrice,
}
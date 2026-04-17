const supabase = require("../dbConnection.js");

// Get data from Supabase: id only
async function getIngredients(recipe_id) {
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

// Get data from Supabase, id and total servings
async function getIngredientsWithTotalServing(recipe_id) {
	try {
		let { data, error } = await supabase
			.from("recipes")
			.select("total_servings, ingredients")
			.in("id", recipe_id);
		return data;
	} catch (error) {
		throw error;
	}
}

// Get and return result to user
async function getOriginalIngredients(recipe_id) {
  const result = {
    status: 404,
    error: "",
    ingredients: {}
  }

  const data = await getIngredients(recipe_id);
  if (data.length === 0) {
    result.error = "Invalid recipe id, ingredients not found";
    return result;
  };

  result.status = 200;
  result.ingredients = data[0].ingredients;

  return result;
}

// Get and return result to user
async function getScaledIngredientsByServing(recipe_id, desired_servings) {
  const result = {
    status: 404,
    error: "",
    ingredients: {},
    scaling_detail: {}
  }

  // Get recipe data
  const data = await getIngredientsWithTotalServing([recipe_id]);
  if (data.length === 0) {
    result.error = "Invalid recipe id, can not scale";
    return result;
  }

  // Get recipe's ingredients and serving
  const recipe_serving = data[0].total_servings;
  if (!recipe_serving || recipe_serving===0) {
    result.error = "Recipe contains invalid total serving, can not scale";
    return result;
  }
  
  const recipe_ingredients = data[0].ingredients;
  if (!recipe_ingredients || !recipe_ingredients.id || !recipe_ingredients.quantity) {
    result.error = "Recipe contains invalid ingredients data, can not scale";
    return result;
  }

  // Scale 
  const ratio = desired_servings / recipe_serving;

  result.status = 200
  result.ingredients = {
    id: recipe_ingredients.id,
    quantity: recipe_ingredients.quantity.map(qty => qty * ratio),
    measurement: recipe_ingredients.measurement
  };
  result.scaling_detail = {
    id: recipe_id,
    scale_ratio: ratio,
    desired_servings: desired_servings,
    original_serving: recipe_serving,
    original_ingredients: recipe_ingredients
  };
  return result;
}

module.exports = {
  getOriginalIngredients,
  getScaledIngredientsByServing
}
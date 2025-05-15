let { getUserRecipes } = require('../model/getUserRecipes');

const scaleRecipe = async (req, res) => {
  // const recipe_id = parseInt(req.query.recipe_id);
  const { recipe_id, desired_servings } = req.params;

  try {
    // Get recipe data
    const data = await getUserRecipes([recipe_id]);
    if (data.length === 0) {
      return res.status(404).json({
        error: "Invalid recipe id, can not scale"
      })
    };

    // Get recipe's ingredients and serving
    const recipe_serving = data[0].total_servings;
    if (!recipe_serving || recipe_serving===0) {
      return res.status(404).json({
        error: "Recipe contains invalid total serving, can not scale"
      })
    }
    const recipe_ingredients = data[0].ingredients;
    if (!recipe_ingredients || !recipe_ingredients.id || !recipe_ingredients.quantity || !recipe_ingredients.measurement) {
      return res.status(404).json({
        error: "Recipe contains invalid ingredients data, can not scale"
      })
    }

    // Scale 
    const ratio = desired_servings / recipe_serving;
    const scaledRecipe = {
      id: recipe_id,
      scale_ratio: ratio,
      desired_servings: desired_servings,
      scaled_ingredients: {
        id: recipe_ingredients.id,
        quantity: recipe_ingredients.quantity.map(qty => qty * ratio),
        measurement: recipe_ingredients.measurement
      },
      original_serving: recipe_serving,
      original_ingredients: recipe_ingredients
    };

    return res.status(200).json(scaledRecipe);
  } catch (error) {
    console.error("Error logging in: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

module.exports = {
  scaleRecipe
}
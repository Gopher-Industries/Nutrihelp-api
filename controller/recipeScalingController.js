let getScaledRecipe = require('../model/getRecipeIngredients');

const scaleRecipe = async (req, res) => {
  const { recipe_id, desired_servings } = req.params;

  try {
    const result = await getScaledRecipe.getScaledIngredientsByServing(recipe_id, desired_servings);
    
    if (result.status != 200) {
      return res.status(result.status).json({
        error: result.error
      });
    }

    return res.status(200).json({
      scaled_ingredients: result.ingredients,
      scaling_detail: result.scaling_detail
    });
  } catch (error) {
    console.error("Error when scaling recipe: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

module.exports = {
  scaleRecipe
}
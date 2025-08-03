let getScaledRecipe = require('../model/getRecipeIngredients');

const scaleRecipe = async (req, res) => {
  // const recipe_id = parseInt(req.query.recipe_id);
  const { recipe_id, desired_servings } = req.params;

  try {
    const result = await getScaledRecipe.getScaledIngredientsByServing(recipe_id, desired_servings);
    
    if (result.status != 200) {
      return res.status(result.status).json({
        error: result.error
      });
    }

    return res.status(200).json(result.scaled_recipe);
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
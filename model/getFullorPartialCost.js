let getEstimatedCost = require('../model/getEstimatedCost');

async function CostEstimation(recipe_id, exclude_ids, isFull){
    // Get recipe's ingredients
    const data = await getEstimatedCost.getRecipeIngredients(recipe_id);
    if (data.length === 0) {
      return res.status(404).json({
        error: "Invalid recipe id, ingredients not found"
      })
    };
    const ingredients = data[0].ingredients;

    // Validate recipe's ingredients data
    if (!ingredients || !ingredients.id || !ingredients.quantity || !ingredients.measurement) {
      return res.status(404).json({
        error: "Recipe contains invalid ingredients data, can not estimate cost"
      })
    }

    // Return error if the excluding ingredients not included in recipe
    if(!isFull){
      const exclude_ingre_ids = exclude_ids.split(",").map(id => parseInt(id));
      const invalid_exclude = exclude_ingre_ids.filter((id) => {
        if (!ingredients.id.includes(id)) {
          return true;
        }
      })
      if (invalid_exclude.length > 0) {
        return res.status(404).json({
          error: `Ingredient ${invalid_exclude.toString()} not found in recipe, can not exclude`
        })
      }
    
      // Filter out the unwanted ingredients
      const exclude_indices = ingredients.id
                                  .filter(id => exclude_ingre_ids.includes(id))
                                  .map(id => ingredients.id.indexOf(id));
      ingredients.id = ingredients.id.filter((id, i) => !exclude_indices.includes(i))
      ingredients.quantity = ingredients.quantity.filter((id, i) => !exclude_indices.includes(i))
      ingredients.measurement = ingredients.measurement.filter((id, i) => !exclude_indices.includes(i))
    }

    // Get ingredients price
    const ingredients_price = await getEstimatedCost.getIngredientsPrice(ingredients.id);
    
    // Calculate ingredients price
    const { lowPriceRequiredIngredients, highPriceRequiredIngredients } = getEstimatedCost.estimateIngredientsCost(ingredients, ingredients_price);

    if (lowPriceRequiredIngredients.length === 0 && highPriceRequiredIngredients.length === 0) {
      return res.status(404).json({
        error: "There was an error in estimation process"
      })
    };

    // Prepare response data
    const { estimatedCost, lowPriceID, highPriceID } = getEstimatedCost.prepareResponseData(lowPriceRequiredIngredients, highPriceRequiredIngredients);

    // Check if missing ingredient
    if(lowPriceID.length < ingredients.id.length || highPriceID.length < ingredients.id.length){
      estimatedCost.info.include_all_wanted_ingredients = false;
    } else {
      estimatedCost.info.include_all_wanted_ingredients = true;
    }

    // Add estimation info
    if(isFull){estimatedCost.info.estimation_type = "full";}
    else{estimatedCost.info.estimation_type = "partial";}
    return{estimatedCost};
}

module.exports ={
    CostEstimation,
}
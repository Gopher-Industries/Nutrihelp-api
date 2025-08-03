let getRecipeIngredients = require('../model/getRecipeIngredients')
let getEstimatedCost = require('../model/getEstimatedCost');

async function estimateCost(recipe_id, desired_servings, exclude_ids){
    const result = {
      status: 404,
      error: "",
      estimatedCost: {}
    }

    // Recipe Scaling Option: check if scaling requested
    // If yes (desired_servings > 0) -> proceed with scaled ingredients
    // otherwise, get original servings
    var ingredients_result;
    if (desired_servings > 0) {
      ingredients_result = await getRecipeIngredients.getScaledIngredientsByServing(recipe_id, desired_servings);
    } else {
      ingredients_result = await getRecipeIngredients.getOriginalIngredients(recipe_id);
    }

    if (ingredients_result.status != 200) {
      result.status = ingredients_result.status;
      result.error = ingredients_result.error;
      return result;
    }
    const ingredients = ingredients_result.ingredients;

    // Validate recipe's ingredients data
    if (!ingredients || !ingredients.id || !ingredients.quantity) {
      result.error = "Recipe contains invalid ingredients data, can not estimate cost";
      return result;
    }

    if (!ingredients.measurement) {
      ingredients.measurement = new Array(ingredients.quantity.length).fill("N/A");
    }

    // Return error if the excluding ingredients not included in recipe
    let isFull = exclude_ids === "";
    if(!isFull){
      const exclude_ingre_ids = exclude_ids.split(",").map(id => parseInt(id));
      const invalid_exclude = exclude_ingre_ids.filter((id) => {
        if (!ingredients.id.includes(id)) {
          return true;
        }
      })
      if (invalid_exclude.length > 0) {
        result.error = `Ingredient ${invalid_exclude.toString()} not found in recipe, can not exclude`
        return result;
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
      result.error = "There was an error in estimation process";
      return result;
    };

    // Prepare response data
    const { estimatedCost, lowPriceID, highPriceID } = getEstimatedCost.prepareResponseData(lowPriceRequiredIngredients, highPriceRequiredIngredients);

    // Check if missing ingredient
    if (lowPriceID.length < ingredients.id.length || highPriceID.length < ingredients.id.length) {
      estimatedCost.info.include_all_wanted_ingredients = false;
    } else {
      estimatedCost.info.include_all_wanted_ingredients = true;
    }

    // Add estimation info
    if (isFull) { estimatedCost.info.estimation_type = "full"; }
    else { estimatedCost.info.estimation_type = "partial"; }

    result.status = 200;
    result.estimatedCost = estimatedCost;
    return result;
}

module.exports ={
    estimateCost,
}
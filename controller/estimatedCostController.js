let getEstimatedCost = require('../model/getEstimatedCost');

const getFullCost = async (req, res) => {
  // const recipe_id = parseInt(req.query.recipe_id);
  const recipe_id = req.params.recipe_id;

  try {
    // Get recipe data
    const data = await getEstimatedCost.getRecipeIngredients(recipe_id);
    if (data.length === 0) {
      return res.status(404).json({
        error: "Invalid recipe id, ingredients not found"
      })
    };

    // Get recipe's ingredients
    const ingredients = data[0].ingredients;
    if (!ingredients || !ingredients.id || !ingredients.quantity || !ingredients.measurement) {
      return res.status(404).json({
        error: "Recipe contains invalid ingredients data, can not estimate cost"
      })
    }

    // Get ingredients price
    const ingredients_price = await getEstimatedCost.getIngredientsPrice(ingredients.id);
    
    // Calculate ingredients price
    const { lowPriceRequiredIngredients, highPriceRequiredIngredients } = estimateIngredientsCost(ingredients, ingredients_price);

    if (lowPriceRequiredIngredients.length === 0 && highPriceRequiredIngredients.length === 0) {
      return res.status(404).json({
        error: "There was an error in estimation process"
      })
    };

    // Prepare response data
    const { estimatedCost, lowPriceID, highPriceID } = prepareResponseData(lowPriceRequiredIngredients, highPriceRequiredIngredients);

    // Check if missing ingredient
    if(lowPriceID.length < ingredients.id.length || highPriceID.length < ingredients.id.length){
      estimatedCost.include_all_ingredients = false;
    } else {
      estimatedCost.include_all_ingredients = true;
    }

    return res.status(200).json(estimatedCost);
  } catch (error) {
    console.error("Error logging in: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

const getPartialCost = async (req, res) => {
  const { recipe_id, exclude_ids } = req.params;

  try {
    const exclude_ingre_ids = exclude_ids.split(",").map(id => parseInt(id));

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
    
    // Get ingredients price
    const ingredients_price = await getEstimatedCost.getIngredientsPrice(ingredients.id);
    
    // Calculate ingredients price
    const { lowPriceRequiredIngredients, highPriceRequiredIngredients } = estimateIngredientsCost(ingredients, ingredients_price);

    if (lowPriceRequiredIngredients.length === 0 && highPriceRequiredIngredients.length === 0) {
      return res.status(404).json({
        error: "There was an error in estimation process"
      })
    };

    // Prepare response data
    const { estimatedCost, lowPriceID, highPriceID } = prepareResponseData(lowPriceRequiredIngredients, highPriceRequiredIngredients);

    // Check if missing ingredient
    if(lowPriceID.length < ingredients.id.length || highPriceID.length < ingredients.id.length){
      estimatedCost.include_all_ingredients = false;
    } else {
      estimatedCost.include_all_ingredients = true;
    }

    return res.status(200).json(estimatedCost);
  } catch (error) {
    console.error("Error logging in: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

// Support function
function prepareResponseData(lowPriceRequiredIngredients, highPriceRequiredIngredients) {
  const estimatedCost = {
    minimum_cost: 0,
    maximum_cost: 0,
    low_cost_ingredients: [],
    high_cost_ingredients: []
  };
  
  let lowPriceID = [], highPriceID = [];
  lowPriceRequiredIngredients.forEach((ingre) => {
    estimatedCost.low_cost_ingredients.push({
      ingredient_id: ingre.ingredient_id,
      product_name: ingre.name,
      quantity: ingre.estimation.unit + ingre.estimation.measurement,
      purchase_quantity: ingre.estimation.purchase,
      total_cost: ingre.estimation.total_cost
    })
    estimatedCost.minimum_cost += ingre.estimation.total_cost;
    lowPriceID.push(ingre.ingredient_id);
  })
  highPriceRequiredIngredients.forEach((ingre) => {
    estimatedCost.high_cost_ingredients.push({
      ingredient_id: ingre.ingredient_id,
      product_name: ingre.name,
      quantity: ingre.estimation.unit + ingre.estimation.measurement,
      purchase_quantity: ingre.estimation.purchase,
      total_cost: ingre.estimation.total_cost
    })
    estimatedCost.maximum_cost += ingre.estimation.total_cost;
    highPriceID.push(ingre.ingredient_id);
  })
  estimatedCost.minimum_cost = Math.round(estimatedCost.minimum_cost);
  estimatedCost.maximum_cost = Math.round(estimatedCost.maximum_cost);

  return { estimatedCost, lowPriceID, highPriceID };
}

function estimateIngredientsCost(ingredients, ingredients_price) {
  // Group ingredients by their id
  var groupedIngredientsPrice = {};
  ingredients_price.forEach(( ingredient ) => {
    let id = ingredient.ingredient_id;
    if (groupedIngredientsPrice[id] == undefined) {
      groupedIngredientsPrice[id] = [];
    }
    groupedIngredientsPrice[id].push(ingredient);
  })

  // Find minimum purchase quantity for every ingredients
  // Each grocery store has different price -> low total price and high total price
  const lowPriceRequiredIngredients = [];
  const highPriceRequiredIngredients = [];
  if ((ingredients.id.length === ingredients.quantity.length) && (ingredients.id.length === ingredients.measurement.length)) {
    for (let i=0; i<ingredients.id.length; i++) {
      let target_id = ingredients.id[i];
      let target_qty = ingredients.quantity[i];
      let target_measurement = ingredients.measurement[i];

      let ingre = groupedIngredientsPrice[target_id];
      
      // If target ingredient not found in the price table -> skip this ingredient
      if (ingre) {
        ingre = ingre.filter((item) => {
          try {
            let convertedUnit = convertUnits(item.unit, item.measurement, target_measurement);
            let estimatedPurchase = 1;
            while (convertedUnit * estimatedPurchase < target_qty) {
              estimatedPurchase += 1;
            }
            item.estimation = {
              "unit": convertedUnit,
              "measurement": target_measurement,
              "purchase": estimatedPurchase,
              "total_cost": estimatedPurchase * item.price
            }
            return true;
          } catch (error) {
            return false;
          }
        }).map(function(item) { return item; });
      } else {
        ingre = [];
      }

      if (ingre.length > 0) {
        // Find min price
        var minIngre = ingre.reduce((prev, curr) => {
          return prev.estimation.total_cost < curr.estimation.total_cost ? prev : curr;
        });
        lowPriceRequiredIngredients.push(minIngre);

        // Find max price
        var maxIngre = ingre.reduce((prev, curr) => {
          return prev.estimation.total_cost > curr.estimation.total_cost ? prev : curr;
        });
        highPriceRequiredIngredients.push(maxIngre);
      }
    }
  }

  return {
    lowPriceRequiredIngredients,
    highPriceRequiredIngredients
  };
}

function convertUnits(value, fromUnit, toUnit) {
  const conversions = {
    weight: { g: 1, kg: 0.001 },
    liquid: { l: 1, ml: 1000 }
  };

  if (fromUnit === "ea" && toUnit === "ea") {
    return value;
  }

  if (conversions.weight[fromUnit] && conversions.weight[toUnit]) {
      return value * (conversions.weight[toUnit] / conversions.weight[fromUnit]);
  } else if (conversions.liquid[fromUnit] && conversions.liquid[toUnit]) {
      return value * (conversions.liquid[toUnit] / conversions.liquid[fromUnit]);
  } else {
      throw new Error("Invalid unit conversion");
  }
}

module.exports = {
  getFullCost,
  getPartialCost
}
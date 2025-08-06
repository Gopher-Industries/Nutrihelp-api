const supabase = require("../dbConnection.js");

//For getting the ingredients price from the DB
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

//To convert the units
function convertUnits(value, fromMeasurement, toMeasurement) {
  const result = {
    unit: 0,
    measurement: toMeasurement
  }

  const conversions = {
    weight: { g: 1, kg: 0.001 },
    liquid: { l: 1, ml: 1000 }
  };

  if (fromMeasurement === "ea") {
    if (toMeasurement === "ea") {
      result.unit = value;
      return result;
    } else {
      throw new Error("Invalid unit conversion");
    }
  }

  if (toMeasurement === "N/A") {
    // Use g/ml as default
    if (conversions.weight[fromMeasurement]) {
      result.unit = value * (conversions.weight["g"] / conversions.weight[fromMeasurement]);
      result.measurement = "g";
      return result;
    } else if (conversions.liquid[fromMeasurement]) {
      result.unit = value * (conversions.liquid["ml"] / conversions.liquid[fromMeasurement]);
      result.measurement = "ml";
      return result;
    } else {
      throw new Error("Invalid unit conversion");
    }
  } else {
    if (conversions.weight[fromMeasurement] && conversions.weight[toMeasurement]) {
      result.unit = value * (conversions.weight[toMeasurement] / conversions.weight[fromMeasurement]);
      return result;
    } else if (conversions.liquid[fromMeasurement] && conversions.liquid[toMeasurement]) {
      result.unit = value * (conversions.liquid[toMeasurement] / conversions.liquid[fromMeasurement]);
      return result;
    } else {
      throw new Error("Invalid unit conversion");
    }
  }
}



//To estimate the Ingredients Cost(lowest and highest)
function estimateIngredientsCost(ingredients, ingredients_price) { //return grouped data initially.
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
            let convertedResult = convertUnits(item.unit, item.measurement, target_measurement);
            let estimatedPurchase = 1;
            while (convertedResult.unit * estimatedPurchase < target_qty) {
              estimatedPurchase += 1;
            }
            item.estimation = {
              "unit": convertedResult.unit,
              "measurement": convertedResult.measurement,
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

function prepareResponseData(lowPriceRequiredIngredients, highPriceRequiredIngredients) {
  const estimatedCost = {
    info: {
      estimation_type: "",
      include_all_wanted_ingredients: true,
      minimum_cost: 0,
      maximum_cost: 0
    },
    low_cost: {
      price: 0,
      count: 0,
      ingredients: []
    },
    high_cost: {
      price: 0,
      count: 0,
      ingredients: []
    }
  };
  
  let lowPriceID = [], highPriceID = [];
  lowPriceRequiredIngredients.forEach((ingre) => {
    estimatedCost.low_cost.ingredients.push({
      ingredient_id: ingre.ingredient_id,
      product_name: ingre.name,
      quantity: ingre.estimation.unit + ingre.estimation.measurement,
      purchase_quantity: ingre.estimation.purchase,
      total_cost: ingre.estimation.total_cost
    })
    estimatedCost.info.minimum_cost += ingre.estimation.total_cost;
    lowPriceID.push(ingre.ingredient_id);
  })
  highPriceRequiredIngredients.forEach((ingre) => {
    estimatedCost.high_cost.ingredients.push({
      ingredient_id: ingre.ingredient_id,
      product_name: ingre.name,
      quantity: ingre.estimation.unit + ingre.estimation.measurement,
      purchase_quantity: ingre.estimation.purchase,
      total_cost: ingre.estimation.total_cost
    })
    estimatedCost.info.maximum_cost += ingre.estimation.total_cost;
    highPriceID.push(ingre.ingredient_id);
  })
  estimatedCost.info.minimum_cost = Math.round(estimatedCost.info.minimum_cost);
  estimatedCost.info.maximum_cost = Math.round(estimatedCost.info.maximum_cost);

  estimatedCost.low_cost.price =  estimatedCost.info.minimum_cost;
  estimatedCost.low_cost.count =  estimatedCost.low_cost.ingredients.length;
  estimatedCost.high_cost.price = estimatedCost.info.maximum_cost;
  estimatedCost.high_cost.count =  estimatedCost.high_cost.ingredients.length;
  return { estimatedCost, lowPriceID, highPriceID };
}

module.exports = {
  getIngredientsPrice,
  convertUnits,
  estimateIngredientsCost,
  prepareResponseData,
}
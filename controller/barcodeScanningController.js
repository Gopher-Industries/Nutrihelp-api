const getBarcodeAllergen = require('../model/getBarcodeAllergen');

const checkAllergen = async (req, res) => {
  // Testable barcodes
  // 3017624010701
  // 070842082205
  // 9343005000080
  // 0048151623426

  const { user_id } = req.body;
  const code = req.query.code;

  if (!user_id) {
    return res.status(404).json({
      error: `User ID is invalid`
    })
  }

  try {
    // Get ingredients from barcode
    const result = await getBarcodeAllergen.fetchBarcodeInformation(code);
    if (!result.success) {
      return res.status(404).json({
        error: `Barcode API error: ${result.error}`
      })
    }
    const barcode_info = result.data.product;
    let barcode_ingredients = [];
    if (barcode_info.allergens_from_ingredients.length > 0) {
      // barcode_ingredients = barcode_info.allergens_from_ingredients.split(",").map(item => item.trim().toLowerCase().replace("en:", ""));
      barcode_ingredients = barcode_info.ingredients_text_en.split(",").map((item) => {
        return item.trim().toLowerCase().replace(".", "");
      });
    } 

    // Get the name of user allergen ingredients
    const user_allergen_result = await getBarcodeAllergen.getUserAllergen(user_id);
    const user_allergen_ingredient_ids = [...new Set(user_allergen_result.map(item => item.ingredient_id))];
    const user_allergen_ingredients = await getBarcodeAllergen.getIngredients(user_allergen_ingredient_ids);
    const user_allergen_ingredient_names = user_allergen_ingredients.map(item => item.name.toLowerCase());

    // Compare the result
    barcode_ingredients_keys = barcode_ingredients.reduce((accumulatedIngredients, currentIngredient) => {
      return accumulatedIngredients.concat(currentIngredient.split(" "));
    }, []);
    const matchingAllergens = user_allergen_ingredient_names.filter((ingredient) => {
      return barcode_ingredients_keys.includes(ingredient);
    });
    const hasUserAllergen = matchingAllergens.length > 0;

    return res.status(200).json({
      product_name: barcode_info.product_name,
      detection_result: {
        hasUserAllergen,
        matchingAllergens
      },
      barcode_ingredients,
      user_allergen_ingredients: user_allergen_ingredient_names
    });
  } catch (error) {
    console.error("Error in getting barcode information: ", error);
    return res.status(500).json({
      error: "Internal server error"
    })
  }
}

module.exports = {
  checkAllergen
}
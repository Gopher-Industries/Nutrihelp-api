const getBarcodeAllergen = require('../model/getBarcodeAllergen');

const checkAllergen = async (req, res) => {
  // Testable barcodes
  // 3017624010701
  // 070842082205
  // 9343005000080
  // 0048151623426
  const user_id = 15;
  const code = req.query.code;

  try {
    // Get ingredients from barcode
    const result = await getBarcodeAllergen.fetchBarcodeInformation(code);
    if (!result.success) {
      return res.status(404).json({
        error: `Barcode API error: ${result.error}`
      })
    }
    const barcode_info = result.data.product;
    let barcode_allergen_ingredients = [];
    if (barcode_info.allergens_from_ingredients.length > 0) {
      barcode_allergen_ingredients = barcode_info.allergens_from_ingredients.split(",").map(item => item.trim().toLowerCase());
    } 

    // Get the name of user allergen ingredients
    const user_allergen_result = await getBarcodeAllergen.getUserAllergen(user_id);
    const user_allergen_ingredient_ids = [...new Set(user_allergen_result.map(item => item.ingredient_id))];
    const user_allergen_ingredients = await getBarcodeAllergen.getIngredients(user_allergen_ingredient_ids);
    const user_allergen_ingredient_names = user_allergen_ingredients.map(item => item.name.toLowerCase());

    // Compare the result
    const matchingAllergens = barcode_allergen_ingredients.filter(ingredient =>
      user_allergen_ingredient_names.includes(ingredient)
    );
    const hasUserAllergen = matchingAllergens.length > 0;

    return res.status(200).json({
      hasUserAllergen,
      matchingAllergens,
      barcode_allergen_ingredients,
      user_allergen_ingredients
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
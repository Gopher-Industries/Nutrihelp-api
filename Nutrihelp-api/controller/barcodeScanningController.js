const getBarcodeAllergen = require('../model/getBarcodeAllergen');

// Some example testable barcodes
// 3017624010701
// 0048151623426
const checkAllergen = async (req, res) => {
  const { user_id } = req.body;
  const code = req.query.code;

  try {
    // Get ingredients from barcode
    const result = await getBarcodeAllergen.fetchBarcodeInformation(code);
    if (!result.success) {
      return res.status(404).json({
        error: `Error when fetching barcode information: Invalid barcode`
      })
    }
    const barcode_info = result.data.product;
    if (!barcode_info) {
      return res.status(404).json({
        error: `Error when getting barcode information: Barcode information not found`
      })
    }
    let barcode_ingredients = [];
    if (barcode_info.allergens_from_ingredients.length > 0) {
      barcode_ingredients = barcode_info.ingredients_text_en.split(",").map((item) => {
        return item.trim().toLowerCase().replace(".", "");
      });
    } 

    // If user_id is not provided, return barcode information only
    if (!user_id) {
      return res.status(200).json({
        product_name: barcode_info.product_name,
        detection_result: {},
        barcode_ingredients,
        user_allergen_ingredients: []
      });
    }

    // Get the name of user allergen ingredients
    const user_allergen_ingredient_names = await getBarcodeAllergen.getUserAllergen(user_id);

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
      error: "Internal server error: " + error
    })
  }
}

module.exports = {
  checkAllergen
}
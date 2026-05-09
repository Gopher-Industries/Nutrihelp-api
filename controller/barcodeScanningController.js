const getBarcodeAllergen = require('../model/getBarcodeAllergen');
const { ok, fail } = require('../utils/apiResponse');
const {
  buildBarcodeScanPayload,
  SCAN_CONTRACT_VERSION,
} = require('../services/scanContractService');

// Some example testable barcodes
// 3017624010701
// 0048151623426
const checkAllergen = async (req, res) => {
  const { user_id } = req.body;
  const code = req.query.code;

  try {
    if (!code) {
      return fail(res, 'Barcode is required', 400, 'BARCODE_REQUIRED');
    }

    // Get ingredients from barcode
    const result = await getBarcodeAllergen.fetchBarcodeInformation(code);
    if (!result.success) {
      return fail(res, 'Barcode information not found', 404, 'SCAN_NOT_FOUND');
    }
    const barcode_info = result.data.product;
    if (!barcode_info) {
      return fail(res, 'Barcode information not found', 404, 'SCAN_NOT_FOUND');
    }
    let barcode_ingredients = [];
    const allergenIngredients = Array.isArray(barcode_info.allergens_from_ingredients)
      ? barcode_info.allergens_from_ingredients
      : [];
    const ingredientText = typeof barcode_info.ingredients_text_en === 'string'
      ? barcode_info.ingredients_text_en
      : '';

    if (allergenIngredients.length > 0 && ingredientText) {
      barcode_ingredients = ingredientText.split(",").map((item) => {
        return item.trim().toLowerCase().replace(".", "");
      });
    } 

    // If user_id is not provided, return barcode information only
    if (!user_id) {
      return ok(
        res,
        buildBarcodeScanPayload({
          barcode: code,
          productName: barcode_info.product_name,
          barcodeIngredients: barcode_ingredients,
          userAllergenIngredients: [],
          matchingAllergens: [],
        }),
        200,
        { contractVersion: SCAN_CONTRACT_VERSION }
      );
    }

    // Get the name of user allergen ingredients
    const user_allergen_ingredient_names = await getBarcodeAllergen.getUserAllergen(user_id);

    // Compare the result
    const barcode_ingredients_keys = barcode_ingredients.reduce((accumulatedIngredients, currentIngredient) => {
      return accumulatedIngredients.concat(currentIngredient.split(" "));
    }, []);
    const matchingAllergens = user_allergen_ingredient_names.filter((ingredient) => {
      return barcode_ingredients_keys.includes(ingredient);
    });

    return ok(
      res,
      buildBarcodeScanPayload({
        barcode: code,
        productName: barcode_info.product_name,
        barcodeIngredients: barcode_ingredients,
        userAllergenIngredients: user_allergen_ingredient_names,
        matchingAllergens,
      }),
      200,
      { contractVersion: SCAN_CONTRACT_VERSION }
    );
  } catch (error) {
    console.error("Error in getting barcode information: ", error);
    return fail(res, 'Internal server error during barcode scan', 500, 'SCAN_FAILED');
  }
}

module.exports = {
  checkAllergen
}

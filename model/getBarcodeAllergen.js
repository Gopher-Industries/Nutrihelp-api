const recipeRepository = require('../repositories/recipeRepository');
const preferenceRepository = require('../repositories/preferenceRepository');
const axios = require('axios');
const fields_openfoodfacts = [
  "product_name",
  "allergens_from_ingredients",
  "allergens_tags",
  "ingredients_text_en"
];

async function getUserAllergenFromRecipe(user_id) {
  try {
    const data = await recipeRepository.getUserRecipeRelations(user_id);
    return (data || []).filter((item) => item.allergy === true).map((item) => ({ ingredient_id: item.ingredient_id }));
  } catch (error) {
    throw error;
  }
}

async function getIngredients(ingredient_list) {
	try {
		return await recipeRepository.getIngredientsByIds(ingredient_list, "id, name, allergies_type");
	} catch (error) {
		throw error;
	}
}

async function getSavedUserAllergies(user_id) {
  try {
    return await preferenceRepository.getSavedUserAllergies(user_id);
  } catch (error) {
    throw error;
  }
}

const fetchBarcodeInformation = async (barcode) => {
  try {
    const url = `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=${fields_openfoodfacts.join(",")}`
    
    const response = await axios.get(url);

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      error: error
    };
  }
}

async function getUserAllergen(user_id, isFromRecipe=false) {
  if (isFromRecipe) {
    // Fetch data from recipe_ingredients table
    const user_allergen_result = await getUserAllergenFromRecipe(user_id);
    const user_allergen_ingredient_ids = [...new Set(user_allergen_result.map(item => item.ingredient_id))];
    const user_allergen_ingredients = await getIngredients(user_allergen_ingredient_ids);
    const user_allergen_ingredient_names = user_allergen_ingredients.map(item => item.name.toLowerCase());
    return user_allergen_ingredient_names;
  }
  // Fetch data from user_allergies table
  const user_allergen_result = await getSavedUserAllergies(user_id);
  const user_allergen_ingredient_names = user_allergen_result.map(item => item.ingredients.name.toLowerCase());
  return user_allergen_ingredient_names;
}

module.exports = {
  fetchBarcodeInformation,
  getUserAllergen,
  getIngredients
}

const supabase = require("../dbConnection.js");
const axios = require('axios');

async function getUserAllergen(user_id) {
  try {
    let { data, error } = await supabase
      .from("recipe_ingredient")
      .select("ingredient_id")
      .eq("user_id", user_id)
      .eq("allergy", true);
    return data ? data : error;
  } catch (error) {
    throw error;
  }
}

async function getIngredients(ingredient_list) {
	try {
		let { data, error } = await supabase
			.from("ingredients")
			.select("id, name, allergies_type")
			.in("id", ingredient_list);
		return data ? data : error;
	} catch (error) {
		throw error;
	}
}

async function getUserAllergen(user_id) {
  try {
    let { data, error } = await supabase
      .from("recipe_ingredient")
      .select("ingredient_id")
      .eq("user_id", user_id)
      .eq("allergy", true);
    return data ? data : error;
  } catch (error) {
    throw error;
  }
}

const fetchBarcodeInformation = async (barcode) => {
  try {
    const url = `https://world.openfoodfacts.net/api/v2/product/${barcode}?fields=product_name,allergens_from_ingredients,allergens_tags`
    
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

module.exports = {
  fetchBarcodeInformation,
  getUserAllergen,
  getIngredients
}
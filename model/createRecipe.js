const supabase = require("../dbConnection.js");
const { decode } = require("base64-arraybuffer");

async function createRecipe(
  user_id,
  ingredient_id,
  ingredient_quantity,
  recipe_name,
  cuisine_id,
  total_servings,
  preparation_time,
  instructions,
  cooking_method_id
) {
  let calories = 0;
  let fat = 0.0;
  let carbohydrates = 0.0;
  let protein = 0.0;
  let fiber = 0.0;
  let vitamin_a = 0.0;
  let vitamin_b = 0.0;
  let vitamin_c = 0.0;
  let vitamin_d = 0.0;
  let sodium = 0.0;
  let sugar = 0.0;

  try {
    const { data, error } = await supabase
      .from("ingredients")
      .select("*")
      .in("id", ingredient_id);

    if (error) throw error;

    const rows = data ?? [];
    if (rows.length === 0) {
      console.warn("No ingredients found for IDs:", ingredient_id);
    }

    for (let i = 0; i < ingredient_id.length; i++) {
      for (let j = 0; j < rows.length; j++) {
        if (rows[j].id === ingredient_id[i]) {
          const factor = ingredient_quantity[i] / 100;
          calories += rows[j].calories * factor;
          fat += rows[j].fat * factor;
          carbohydrates += rows[j].carbohydrates * factor;
          protein += rows[j].protein * factor;
          fiber += rows[j].fiber * factor;
          vitamin_a += rows[j].vitamin_a * factor;
          vitamin_b += rows[j].vitamin_b * factor;
          vitamin_c += rows[j].vitamin_c * factor;
          vitamin_d += rows[j].vitamin_d * factor;
          sodium += rows[j].sodium * factor;
          sugar += rows[j].sugar * factor;
        }
      }
    }

    return {
      user_id,
      recipe_name,
      cuisine_id,
      total_servings,
      preparation_time,
      instructions,
      cooking_method_id,
      calories: Math.round(calories * 100) / 100,
      fat: Math.round(fat * 100) / 100,
      carbohydrates: Math.round(carbohydrates * 100) / 100,
      protein: Math.round(protein * 100) / 100,
      fiber: Math.round(fiber * 100) / 100,
      vitamin_a: Math.round(vitamin_a * 100) / 100,
      vitamin_b: Math.round(vitamin_b * 100) / 100,
      vitamin_c: Math.round(vitamin_c * 100) / 100,
      vitamin_d: Math.round(vitamin_d * 100) / 100,
      sodium: Math.round(sodium * 100) / 100,
      sugar: Math.round(sugar * 100) / 100,
    };
  } catch (err) {
    console.error("❌ createRecipe error:", err.message);
    throw err;
  }
}

async function saveRecipe(recipe) {
  try {
    const { data, error } = await supabase
      .from("recipes")
      .insert(recipe)
      .select();

    if (error) {
      console.error("❌ saveRecipe error:", error.message);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("❌ saveRecipe outer error:", err.message);
    throw err;
  }
}

async function saveImage(image, recipe_id) {
  if (!image) return null;

  const file_name = `recipe/${recipe_id}.png`;

  try {
    await supabase.storage
      .from("images")
      .upload(file_name, decode(image), {
        cacheControl: "3600",
        upsert: false,
      });

    const test = {
      file_name,
      display_name: file_name,
      file_size: base64FileSize(image),
    };

    const { data: image_data, error: image_error } = await supabase
      .from("images")
      .insert(test)
      .select("*");

    if (image_error) throw image_error;

    await supabase
      .from("recipes")
      .update({ image_id: image_data[0].id })
      .eq("id", recipe_id);
  } catch (err) {
    console.error("❌ saveImage error:", err.message);
    throw err;
  }
}

function base64FileSize(base64String) {
  const base64Data = base64String.split(",")[1] || base64String;
  let sizeInBytes = (base64Data.length * 3) / 4;

  if (base64Data.endsWith("==")) {
    sizeInBytes -= 2;
  } else if (base64Data.endsWith("=")) {
    sizeInBytes -= 1;
  }

  return sizeInBytes;
}

async function saveRecipeRelation(recipe, savedDataId) {
  try {
    const uniqueIngredientIds = [...new Set(recipe.ingredients?.id || [])];

    if (uniqueIngredientIds.length === 0) {
      console.warn("⚠️ No ingredients to link to recipe");
      return [];
    }

    const insert_object = uniqueIngredientIds.map((ingredientId) => ({
      ingredient_id: ingredientId,
      recipe_id: savedDataId,
      user_id: recipe.user_id,
      cuisine_id: recipe.cuisine_id,
      cooking_method_id: recipe.cooking_method_id,
    }));

    const { data, error } = await supabase
      .from("recipe_ingredient")
      .insert(insert_object)
      .select();

    if (error) {
      console.error("❌ saveRecipeRelation insert error:", error.message);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("❌ saveRecipeRelation outer error:", err.message);
    throw err;
  }
}

async function updateRecipesFlag(ids, field, value = true) {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from("recipes")
      .update({ [field]: value })
      .in("id", ids);

    if (error) {
      console.error(`❌ updateRecipesFlag (${field}) error:`, error.message);
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`❌ updateRecipesFlag outer error:`, err.message);
    throw err;
  }
}

const updateRecipeAllergy = (ids) => updateRecipesFlag(ids, "allergy", true);
const updateRecipeDislike = (ids) => updateRecipesFlag(ids, "dislike", true);

module.exports = {
  createRecipe,
  saveRecipe,
  saveRecipeRelation,
  saveImage,
  updateRecipeAllergy,
  updateRecipeDislike,
};

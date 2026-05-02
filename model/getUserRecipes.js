const supabase = require("../dbConnection.js");

function isUuid(value) {
  if (!value) return false;
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(String(value));
}

async function getUserRecipesRelation(user_id) {
  try {
    if (!user_id) {
      throw new Error("Missing user_id");
    }

    // Accept UUIDs or numeric strings. Pass the raw value through.
    const { data, error } = await supabase
      .from("recipe_ingredient")
      .select("recipe_id, ingredient_id, cuisine_id, user_id")
      .eq("user_id", user_id);

    if (error) {
      console.error("❌ getUserRecipesRelation error:", error);
      throw error;
    }

    console.log("✅ recipe_ingredient rows:", data?.length || 0);
    return data ?? [];
  } catch (err) {
    console.error("❌ getUserRecipesRelation outer error:", err.message || err);
    throw err;
  }
}

async function getUserRecipes(recipe_ids) {
  try {
    const ids = Array.isArray(recipe_ids) ? recipe_ids : [];

    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("recipes")
      .select("*")
      .in("id", ids);

    if (error) {
      console.error("❌ getUserRecipes error:", error);
      throw error;
    }

    console.log("✅ recipes rows:", data?.length || 0);
    return data ?? [];
  } catch (err) {
    console.error("❌ getUserRecipes outer error:", err.message || err);
    throw err;
  }
}

async function getIngredients(ingredient_ids) {
  try {
    const ids = Array.isArray(ingredient_ids) ? ingredient_ids : [];

    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("ingredients")
      .select("id, name, category")
      .in("id", ids);

    if (error) {
      console.error("❌ getIngredients error:", error);
      throw error;
    }

    console.log("✅ ingredients rows:", data?.length || 0);
    return data ?? [];
  } catch (err) {
    console.error("❌ getIngredients outer error:", err.message || err);
    throw err;
  }
}

async function getCuisines(cuisine_ids) {
  try {
    const ids = Array.isArray(cuisine_ids) ? cuisine_ids : [];

    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("cuisines")
      .select("id, name")
      .in("id", ids);

    if (error) {
      console.error("❌ getCuisines error:", error);
      throw error;
    }

    console.log("✅ cuisines rows:", data?.length || 0);
    return data ?? [];
  } catch (err) {
    console.error("❌ getCuisines outer error:", err.message || err);
    throw err;
  }
}

async function getImageUrl(image_id) {
  if (!image_id) return null;

  try {
    const { data } = supabase.storage.from("images").getPublicUrl(`recipe/${image_id}.png`);
    return data?.publicUrl || null;
  } catch (err) {
    console.error("❌ getImageUrl error:", err.message || err);
    return null;
  }
}

module.exports = {
  getUserRecipesRelation,
  getUserRecipes,
  getIngredients,
  getCuisines,
  getImageUrl,
  // export helper in case controllers want to detect UUIDs
  isUuid,
};
/**
 * RESOLVER: Maps UUID string to numeric user ID.
 * Added for UUID support in recipes flow.
 */
const getUserIdByUuid = async (uuid) => {
  let supabaseClient;
  try {
    supabaseClient = require('../utils/supabase');
  } catch (e) {
    throw new Error('Supabase client utility (utils/supabase.js) is missing or not configured.');
  }

  if (!supabaseClient) {
    throw new Error('Supabase client is null. Check your SUPABASE_URL and SUPABASE_KEY env vars.');
  }

  const { data, error } = await supabaseClient
    .from('users') // change to your actual users table name if different
    .select('id')
    .eq('uuid', uuid) // change if your uuid column is named differently (e.g., 'external_id')
    .single();

  if (error) {
    console.error('getUserIdByUuid error:', error.message);
    throw new Error(`Database error resolving UUID: ${error.message}`);
  }

  if (!data || !data.id) {
    throw new Error(`No user found with UUID: ${uuid}`);
  }

  return data.id;
};

// Update exports to include the resolver
module.exports.getUserIdByUuid = getUserIdByUuid;

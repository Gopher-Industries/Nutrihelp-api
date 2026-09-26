/**
 * model/getUserRecipes_fixed.js
 *
 * Supabase-backed UUID -> numeric id resolver + recipe builder.
 *
 * Configuration:
 *  - Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_KEY) in env.
 *  - If your users table or uuid column differ, edit USERS_TABLE / UUID_COLUMN below.
 *
 * Exports:
 *  - module.exports = getUserRecipesByUuid
 *  - module.exports.getByUserUuid = getUserRecipesByUuid
 *  - module.exports.getUserRecipesByUuid = getUserRecipesByUuid
 *  - module.exports.default = getUserRecipesByUuid
 *
 * Note: this file expects model/getUserRecipes.js to export the helpers:
 *  - getUserRecipesRelation(userId)
 *  - getUserRecipes(recipeList)
 *  - getIngredients(ingredientList)
 *  - getCuisines(cuisineList)
 *  - getImageUrl(image_id)
 *
 * If your schema or helper names differ, adapt accordingly.
 */

const legacy = require('./getUserRecipes.js');

// Try to reuse an existing supabase client at utils/supabase.js if present
let supabase = null;
try {
  supabase = require('../utils/supabase');
} catch (e) {
  supabase = null;
}

// If no client found, create one using @supabase/supabase-js if env vars are present
if (!supabase) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY;
    if (url && key) supabase = createClient(url, key);
  } catch (e) {
    supabase = null;
  }
}

// Adjust these to your DB if different
const USERS_TABLE = 'users';
const UUID_COLUMN = 'uuid';

async function resolveNumericUserIdFromUuid(uuid) {
  if (!uuid) {
    const err = new Error('Missing uuid');
    err.code = 'MISSING_UUID';
    throw err;
  }
  if (!supabase) {
    const err = new Error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_KEY or provide utils/supabase.js.');
    err.code = 'NO_SUPABASE';
    throw err;
  }

  try {
    // Support supabase client returning { data, error } or the legacy style
    const resp = await supabase
      .from(USERS_TABLE)
      .select('id')
      .eq(UUID_COLUMN, uuid)
      .limit(1)
      .single();

    // Normalize response
    const data = resp.data !== undefined ? resp.data : resp;
    const error = resp.error !== undefined ? resp.error : null;

    if (error) {
      const e = new Error('Supabase query error: ' + (error.message || String(error)));
      e.details = error;
      throw e;
    }

    if (!data || !data.id) {
      const e = new Error('No user found for uuid: ' + uuid);
      e.code = 'NOT_FOUND';
      throw e;
    }

    return Number(data.id);
  } catch (err) {
    throw err;
  }
}

async function buildRecipesForUserId(userId) {
  if (!legacy || typeof legacy.getUserRecipesRelation !== 'function') {
    const err = new Error('Legacy getUserRecipes helpers not available (model/getUserRecipes.js)');
    err.code = 'LEGACY_MISSING';
    throw err;
  }

  const recipeRelation = await legacy.getUserRecipesRelation(userId);
  if (!recipeRelation || recipeRelation.length === 0) {
    return { recipes: [] };
  }

  const recipeList = [];
  const cuisineList = [];
  const ingredientList = [];

  for (const row of recipeRelation) {
    if (row.recipe_id != null && recipeList.indexOf(row.recipe_id) < 0) recipeList.push(row.recipe_id);
    if (row.cuisine_id != null && cuisineList.indexOf(row.cuisine_id) < 0) cuisineList.push(row.cuisine_id);
    if (row.ingredient_id != null && ingredientList.indexOf(row.ingredient_id) < 0) ingredientList.push(row.ingredient_id);
  }

  const recipes = (await legacy.getUserRecipes(recipeList)) || [];
  if (!Array.isArray(recipes) || recipes.length === 0) {
    return { recipes: [] };
  }

  const ingredients = (await legacy.getIngredients(ingredientList)) || [];
  const cuisines = (await legacy.getCuisines(cuisineList)) || [];

  await Promise.all(
    recipes.map(async (recipe) => {
      try {
        const cuisine = cuisines.find((c) => String(c.id) === String(recipe.cuisine_id));
        if (cuisine) recipe.cuisine_name = cuisine.name;
      } catch (e) {}

      if (!recipe.ingredients) recipe.ingredients = {};
      if (!Array.isArray(recipe.ingredients.id)) recipe.ingredients.id = [];

      recipe.ingredients.name = [];
      recipe.ingredients.category = [];

      for (const ingredientId of recipe.ingredients.id) {
        try {
          const found = ingredients.find((ing) => String(ing.id) === String(ingredientId));
          if (found) {
            recipe.ingredients.name.push(found.name);
            recipe.ingredients.category.push(found.category);
          }
        } catch (e) {}
      }

      try {
        recipe.image_url = await legacy.getImageUrl(recipe.image_id);
      } catch (imgErr) {
        recipe.image_url = null;
      }

      for (let key in recipe) {
        if (recipe[key] === null) delete recipe[key];
      }
    })
  );

  return { recipes };
}

/**
 * Main exported function:
 * - Supports express handler signature (req, res, next)
 * - Or can be called as getUserRecipesByUuid(uuid) => { recipes: [...] }
 */
async function getUserRecipesByUuid(arg) {
  if (arguments.length === 3) {
    const [req, res, next] = arguments;
    const rawUuid = req.query?.user_id || req.params?.user_id || req.body?.user_id || req.headers['x-user-id'];
    try {
      if (!rawUuid) return res.status(400).json({ success: false, error: 'UUID is required' });
      const userId = await resolveNumericUserIdFromUuid(rawUuid);
      const result = await buildRecipesForUserId(userId);
      return res.status(200).json(result);
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ success: false, error: 'User not found' });
      if (err.code === 'NO_SUPABASE') return res.status(500).json({ success: false, error: 'Supabase not configured', details: err.message });
      if (err.code === 'LEGACY_MISSING') return res.status(500).json({ success: false, error: 'Legacy model helpers missing', details: err.message });
      return res.status(500).json({ success: false, error: 'Failed to resolve UUID', details: err.message || String(err) });
    }
  }

  // Called as function(uuid)
  const uuid = arg;
  if (!uuid) throw new Error('UUID is required');
  const userId = await resolveNumericUserIdFromUuid(uuid);
  return await buildRecipesForUserId(userId);
}

// Exports for controller autodetection
module.exports = getUserRecipesByUuid;
module.exports.getByUserUuid = getUserRecipesByUuid;
module.exports.getUserRecipesByUuid = getUserRecipesByUuid;
module.exports.default = getUserRecipesByUuid;

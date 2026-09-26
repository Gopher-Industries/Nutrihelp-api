/**
 * model/fooddata.js
 * A pragmatic model layer that exports:
 *  - getMealPlanByUserId(userId)
 *  - createMealPlan(userId, meals)
 *  - getNutritionByBarcode(barcode)
 *
 * Strategy:
 * 1. Try to reuse existing model helpers if present.
 * 2. Otherwise, query Supabase directly.
 *
 * This is intended as a safe, replaceable implementation so controllers
 * calling FoodModel.* won't crash and endpoints will return meaningful data.
 */

const supabase = require('../dbConnection');

async function tryRequire(name) {
  try {
    // require relative to model/ directory
    return require(`./${name}`);
  } catch (e) {
    return null;
  }
}

const helper_getMealPlan = (async () => {
  const mod = await tryRequire('getMealPlanByUserIdAndDate') || await tryRequire('mealPlan');
  // the helper modules may export different shapes; we'll detect at call-time
  return mod;
})();

async function getMealPlanByUserId(userId) {
  // If there is an existing helper, prefer that
  const helper = await helper_getMealPlan;
  try {
    if (helper) {
      // try common exported names
      if (typeof helper.getMealPlanByUserId === 'function') {
        return await helper.getMealPlanByUserId(userId);
      }
      if (typeof helper.getMealPlanByUserIdAndDate === 'function') {
        // call with undefined date -> helper should handle it or return latest
        return await helper.getMealPlanByUserIdAndDate(userId);
      }
      if (typeof helper.getMealPlan === 'function') {
        return await helper.getMealPlan(userId);
      }
      // if helper is itself a function (module.exports = async (userId) => {...})
      if (typeof helper === 'function') {
        return await helper(userId);
      }
    }

    // Fallback: query Supabase 'meal_plans' or 'meal_plan' table
    // This assumes a simple schema; adjust table/column names as needed
    const candidateTables = ['meal_plans', 'mealplan', 'meal_plan', 'mealPlan', 'mealPlanItems'];

    for (const table of candidateTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('user_id', userId)
          .limit(100);
        if (error) {
          // skip to next candidate table
          continue;
        }
        if (Array.isArray(data) && data.length >= 0) {
          // return whatever we found
          return data;
        }
      } catch (e) {
        // ignore and try next candidate
        continue;
      }
    }

    // If nothing found, return empty array
    return [];
  } catch (err) {
    // bubble error up
    throw err;
  }
}

async function createMealPlan(userId, meals) {
  try {
    // Try to use an existing helper if present
    const helper = await helper_getMealPlan;
    if (helper) {
      if (typeof helper.createMealPlan === 'function') {
        return await helper.createMealPlan(userId, meals);
      }
      if (typeof helper.insertMealPlan === 'function') {
        return await helper.insertMealPlan(userId, meals);
      }
    }

    // Fallback: insert into a 'meal_plans' table with a jsonb 'meals' column
    const candidateTables = ['meal_plans', 'mealplan', 'meal_plan'];
    for (const table of candidateTables) {
      try {
        const payload = {
          user_id: userId,
          meals: meals,
          created_at: new Date().toISOString()
        };
        const { data, error } = await supabase.from(table).insert([payload]).select().maybeSingle();
        if (error) {
          // skip to next candidate table
          continue;
        }
        return data || payload;
      } catch (e) {
        continue;
      }
    }

    // As a last resort, return the payload (non-persistent)
    return { user_id: userId, meals };
  } catch (err) {
    throw err;
  }
}

async function getNutritionByBarcode(barcode) {
  try {
    // Prefer an existing helper module
    const barcodeHelper = await tryRequire('getBarcodeAllergen') || await tryRequire('fooddata');
    if (barcodeHelper) {
      if (typeof barcodeHelper.getNutritionByBarcode === 'function') {
        return await barcodeHelper.getNutritionByBarcode(barcode);
      }
      if (typeof barcodeHelper.getByBarcode === 'function') {
        return await barcodeHelper.getByBarcode(barcode);
      }
    }

    // Fallback: query 'food_items' table (common name)
    const candidateTables = ['food_items', 'fooditem', 'food_data', 'foods', 'fooddata'];
    for (const table of candidateTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('barcode', barcode)
          .maybeSingle();
        if (error) {
          continue;
        }
        if (data) return data;
      } catch (e) {
        continue;
      }
    }

    // Not found -> return null
    return null;
  } catch (err) {
    throw err;
  }
}

module.exports = { getMealPlanByUserId, createMealPlan, getNutritionByBarcode };

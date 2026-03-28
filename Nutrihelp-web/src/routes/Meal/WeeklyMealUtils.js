// src/routes/Meal/WeeklyMealUtils.js
import { supabase } from '../../supabaseClient';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const mealTypes = ['breakfast', 'lunch', 'dinner'];

/**
 * Weekly plan (generic)
 * - Uses ilike on meal_type (case-insensitive)
 * - Falls back to ignoring is_published if nothing is returned (helps during migration/RLS)
 * - Fetches ingredients in a single batch
 */
export async function fetchWeeklyMealPlan() {
  const plan = [];
  const recipeIdSet = new Set();

  for (const day of daysOfWeek) {
    const dayPlan = { day };

    for (const meal of mealTypes) {
      // Primary query: published + case-insensitive meal_type
      let { data, error } = await supabase
        .from('weeklyrecipes')
        .select('*')
        .ilike('meal_type', meal)
        .eq('is_published', true);

      // Fallback: try without is_published filter (for debugging / data cleanup phases)
      if ((!data || data.length === 0) && !error) {
        const fb = await supabase
          .from('weeklyrecipes')
          .select('*')
          .ilike('meal_type', meal);
        data = fb.data || [];
      }

      if (error || !data || data.length === 0) {
        console.warn(`No recipes found for meal='${meal}' on day='${day}'. Check meal_type casing, is_published and RLS.`);
        dayPlan[meal] = null;
        continue;
      }

      const randomRecipe = data[Math.floor(Math.random() * data.length)];
      dayPlan[meal] = randomRecipe;
      if (randomRecipe?.id) recipeIdSet.add(randomRecipe.id);
    }

    plan.push(dayPlan);
  }

  // Fetch all ingredients for chosen recipes at once
  const { data: ingredientsData, error: ingredientsError } = await supabase
    .from('weekly_recipe_ingredient')
    .select('*')
    .in('recipe_id', Array.from(recipeIdSet));

  if (ingredientsError) {
    console.error('Error fetching ingredients:', ingredientsError.message);
  }

  // Group ingredients by recipe_id
  const ingredientsByMeal = {};
  for (const item of ingredientsData || []) {
    if (!ingredientsByMeal[item.recipe_id]) ingredientsByMeal[item.recipe_id] = [];
    ingredientsByMeal[item.recipe_id].push(item);
  }

  return { plan, ingredients: ingredientsByMeal };
}

/**
 * Personalized plan
 * - Case-insensitive meal_type
 * - Diet tag filter via ilike on dietary_tags (when diet != Balanced)
 * - Allergy exclusions (by ingredient keywords)
 * - No duplicate recipes across the week
 */
export async function fetchPersonalizedMealPlan(filters) {
  const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const mealTypes = ['breakfast','lunch','dinner'];

  // Map goals to target calories and protein (approximate ranges)
  const GOAL_TARGETS = {
    'Maintenance': { cal: [1800, 2200], proteinMin: 60 },
    'Weight Loss': { cal: [1500, 1900], proteinMin: 65 },
    'Weight Gain': { cal: [2200, 2700], proteinMin: 80 },
    'Muscle Gain': { cal: [2200, 2600], proteinMin: 90 },
  };
  const target = GOAL_TARGETS[filters?.goal || 'Maintenance'];

  const macroScore = (r) => {
    const c = Number(r.calories) || 0;
    const p = Number(r.protein) || 0;
    let calScore = 0;
    if (c < target.cal[0]) calScore = target.cal[0] - c;
    else if (c > target.cal[1]) calScore = c - target.cal[1];
    const proteinScore = Math.max(0, (target.proteinMin - p));
    return calScore + Math.max(0, proteinScore / 2);
  };

  // Allergy keyword map (match against weekly_recipe_ingredient.ingredient_name)
  const ALLERGY_KEYWORDS = {
    Nuts: ['Almond','Walnut','Cashew','Peanut','Pistachio','Hazelnut','Pecan','Mixed Nuts'],
    Dairy: ['Milk','Cheese','Yogurt','Butter','Cream','Parmesan','Feta','Paneer','Ghee'],
    Soy: ['Soy','Tofu','Soy Sauce','Edamame','Tempeh','Miso'],
    Gluten: ['Wheat','Pasta','Bread','Tortilla','Flour','Barley','Rye','Crackers','Couscous']
  };

  // Query candidate recipes per meal (case-insensitive + fallback)
  async function fetchCandidates(meal) {
    const diet = filters?.dietType;

    let query = supabase
      .from('weeklyrecipes')
      .select('*')
      .ilike('meal_type', meal)
      .eq('is_published', true);

    if (diet && diet !== 'Balanced') {
      query = query.ilike('dietary_tags', `%${diet}%`);
    }

    let { data, error } = await query;

    // Fallback (ignore is_published) in case of legacy data or RLS surprises
    if ((!data || data.length === 0) && !error) {
      let fb = supabase.from('weeklyrecipes').select('*').ilike('meal_type', meal);
      if (diet && diet !== 'Balanced') fb = fb.ilike('dietary_tags', `%${diet}%`);
      const res = await fb;
      data = res.data || [];
    }

    if (error) {
      console.error('fetchCandidates error:', error.message);
      return [];
    }
    return data || [];
  }

  async function fetchIngredientsByIds(ids) {
    if (!ids.length) return {};
    const { data, error } = await supabase
      .from('weekly_recipe_ingredient')
      .select('*')
      .in('recipe_id', ids);
    if (error) {
      console.error('ingredients fetch error:', error.message);
      return {};
    }
    const byId = {};
    for (const row of data) {
      if (!byId[row.recipe_id]) byId[row.recipe_id] = [];
      byId[row.recipe_id].push(row);
    }
    return byId;
  }

  function excludeAllergens(cands, ingredientsMap) {
    const selectedAllergies = filters?.allergies || [];
    if (!selectedAllergies.length) return cands;

    const deny = new Set();
    for (const a of selectedAllergies) {
      const keywords = ALLERGY_KEYWORDS[a] || [];
      for (const r of cands) {
        const list = ingredientsMap[r.id] || [];
        const has = list.some((ing) =>
          keywords.some((kw) =>
            String(ing.ingredient_name || '').toLowerCase().includes(kw.toLowerCase())
          )
        );
        if (has) deny.add(r.id);
      }
    }
    return cands.filter((r) => !deny.has(r.id));
  }

  const plan = [];
  const usedIds = new Set();
  const allChosenIds = new Set();

  for (const day of daysOfWeek) {
    const dayPlan = { day };

    for (const meal of mealTypes) {
      const cands = await fetchCandidates(meal);
      const ingredientsMap = await fetchIngredientsByIds(cands.map((c) => c.id));

      let filtered = excludeAllergens(cands, ingredientsMap);
      filtered = filtered.sort((a, b) => macroScore(a) - macroScore(b));

      // Choose a candidate not used yet; fallback to a random of top 10
      let chosen = filtered.find((r) => !usedIds.has(r.id));
      if (!chosen) {
        const top = filtered.slice(0, 10);
        chosen = top[Math.floor(Math.random() * Math.max(top.length, 1))] || null;
      }

      dayPlan[meal] = chosen || null;
      if (chosen?.id) {
        usedIds.add(chosen.id);
        allChosenIds.add(chosen.id);
      }
    }

    plan.push(dayPlan);
  }

  // Gather only chosen recipes’ ingredients
  const { data: ingredientsData, error: ingredientsError } = await supabase
    .from('weekly_recipe_ingredient')
    .select('*')
    .in('recipe_id', Array.from(allChosenIds));

  if (ingredientsError) {
    console.error('final ingredients fetch error:', ingredientsError.message);
  }

  const ingredientsByMeal = {};
  for (const item of ingredientsData || []) {
    if (!ingredientsByMeal[item.recipe_id]) ingredientsByMeal[item.recipe_id] = [];
    ingredientsByMeal[item.recipe_id].push(item);
  }

  return { plan, ingredients: ingredientsByMeal };
}

const express = require('express');
const path = require('path');
const router = express.Router();

const MEAL_LIBRARY_PATH = path.join(__dirname, '..', '..', 'data', 'meal_library.json');
let MEALS = null;
function getMeals() {
  if (!MEALS) MEALS = require(MEAL_LIBRARY_PATH);
  return MEALS;
}

// ---- Allergy / Condition maps (ported from meal_generator.py) ----
const ALLERGY_MAP = {
  nuts: ['contains_nuts', 'contains_tree_nut', 'contains_peanut'],
  peanut: ['contains_peanut'],
  tree_nut: ['contains_tree_nut'],
  dairy: ['contains_dairy','contains_milk','contains_cheese','contains_yoghurt','contains_butter','contains_cream','contains_whey','contains_casein','contains_lactose'],
  milk: ['contains_milk','contains_dairy'],
  egg: ['contains_egg'],
  soy: ['contains_soy'],
  gluten: ['contains_gluten','contains_wheat','contains_barley','contains_rye'],
  wheat: ['contains_wheat','contains_gluten'],
  shellfish: ['contains_shellfish'],
  fish: ['contains_fish'],
  sesame: ['contains_sesame','contains_tahini'],
};

const CONDITION_MAP = {
  diabetes: ['high_sugar','high_gi','added_sugar','refined_carb','sugary_drink','dessert','fried','high_saturated_fat','processed_meat','high_salt'],
  cholesterol: ['high_fat','fried','high_saturated_fat'],
  high_cholesterol: ['high_fat','fried','high_saturated_fat'],
  hypertension: ['high_salt','very_high_salt','processed_meat','pickled','soy_sauce_heavy'],
  high_blood_pressure: ['high_salt','very_high_salt','processed_meat','pickled','soy_sauce_heavy'],
  kidney_disease: ['high_potassium','high_phosphorus','high_protein'],
  ckd: ['high_potassium','high_phosphorus','high_protein'],
  elderly: ['hard_food','crunchy','tough_meat','very_high_salt','fried','very_spicy'],
};

const CONDITION_PREFERENCE_MAP = {
  diabetes: ['low_sugar','low_gi','high_fibre','high_protein'],
  cholesterol: ['heart_healthy','low_fat','high_fibre','omega3_rich'],
  high_cholesterol: ['heart_healthy','low_fat','high_fibre','omega3_rich'],
  hypertension: ['low_salt','high_fibre','heart_healthy'],
  high_blood_pressure: ['low_salt','high_fibre','heart_healthy'],
  kidney_disease: ['low_salt','low_fat','soft_food'],
  ckd: ['low_salt','low_fat','soft_food'],
  elderly: ['soft_food','high_protein','high_fibre'],
};

const MEAL_TYPE_CALORIE_DISTRIBUTION = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };
const SORT_KEYS = new Set(['balanced','prep_time','cook_time','total_time','high_protein','high_fibre','low_calories']);
const SORT_ALIASES = { high_fiber: 'high_fibre', low_calorie: 'low_calories' };

// ---- Helpers ----
function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',').map((v) => v.trim()).filter(Boolean);
  return [];
}

function normalizeStringList(values) {
  return values.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
}

function mealTagsLower(meal) { return normalizeStringList(meal.tags || []); }
function mealAllergensLower(meal) { return normalizeStringList(meal.allergens || []); }
function mealCategoriesLower(meal) { return normalizeStringList(meal.food_categories || []); }
function mealCuisinesLower(meal) {
  const raw = [];
  if (meal.cuisine) raw.push(meal.cuisine);
  if (meal.region) raw.push(meal.region);
  raw.push(...(meal.tags || []), ...(meal.food_categories || []));
  return normalizeStringList(raw);
}
function mealSeasonsLower(meal) {
  let s = normalizeStringList(meal.seasonal_tags || []);
  if (!s.length) s = ['all-season'];
  if (s.includes('all_season') && !s.includes('all-season')) s.push('all-season');
  return s;
}

function mealContainsAllergen(meal, allergy) {
  const tags = new Set(mealTagsLower(meal));
  const allergens = new Set(mealAllergensLower(meal));
  const mapped = new Set(ALLERGY_MAP[allergy] || []);
  return allergens.has(allergy) || [...mapped].some((t) => tags.has(t) || allergens.has(t));
}

// ---- Filters ----
function filterAllergy(meals, allergies) {
  const al = normalizeStringList(allergies);
  if (!al.length) return meals;
  return meals.filter((m) => !al.some((a) => mealContainsAllergen(m, a)));
}

function filterCondition(meals, conditions) {
  const cl = normalizeStringList(conditions);
  if (!cl.length) return meals;
  return meals.filter((meal) => {
    const tags = new Set(mealTagsLower(meal));
    for (const condition of cl) {
      const bad = CONDITION_MAP[condition] || [];
      if (bad.some((t) => tags.has(t))) return false;
      const sodium = Number(meal.sodium_mg) || 0;
      if ((condition === 'hypertension' || condition === 'high_blood_pressure') && sodium > 800) return false;
    }
    return true;
  });
}

function filterTexture(meals, texture) {
  if ((texture || 'normal').toLowerCase() !== 'soft') return meals;
  return meals.filter((m) => mealTagsLower(m).includes('soft_food'));
}

function filterBudget(meals, budget) {
  const b = String(budget || 'medium').toLowerCase();
  if (b === 'low') {
    for (const allowed of [['cost_low'], ['cost_low','cost_medium'], ['cost_low','cost_medium','cost_high']]) {
      const f = meals.filter((m) => allowed.some((t) => mealTagsLower(m).includes(t)));
      if (f.length) return f;
    }
  } else if (b === 'medium') {
    for (const allowed of [['cost_medium'], ['cost_medium','cost_low'], ['cost_medium','cost_low','cost_high']]) {
      const f = meals.filter((m) => allowed.some((t) => mealTagsLower(m).includes(t)));
      if (f.length) return f;
    }
  }
  return meals;
}

function filterCuisine(meals, preferredCuisines) {
  const cl = normalizeStringList(preferredCuisines);
  if (!cl.length) return meals;
  const f = meals.filter((m) => cl.some((c) => mealCuisinesLower(m).includes(c)));
  return f.length ? f : meals;
}

function filterSeason(meals, preferredSeasons) {
  const sl = normalizeStringList(preferredSeasons);
  if (!sl.length) return meals;
  const f = meals.filter((m) => {
    const seasons = mealSeasonsLower(m);
    return seasons.includes('all-season') || seasons.includes('all_season') || sl.some((s) => seasons.includes(s));
  });
  return f.length ? f : meals;
}

function filterTime(meals, { maxPrepTime, maxTotalTime }) {
  if (maxPrepTime == null && maxTotalTime == null) return meals;
  const f = meals.filter((m) => {
    const prep = parseInt(m.prep_time_minutes) || 9999;
    const total = parseInt(m.total_time_minutes) || (prep + (parseInt(m.cook_time_minutes) || 0));
    if (maxPrepTime != null && prep > maxPrepTime) return false;
    if (maxTotalTime != null && total > maxTotalTime) return false;
    return true;
  });
  return f.length ? f : meals;
}

// ---- Scoring ----
function conditionBoostScore(meal, conditionsLower) {
  const tags = new Set(mealTagsLower(meal));
  let score = 0;
  for (const cond of conditionsLower) {
    const preferred = CONDITION_PREFERENCE_MAP[cond] || [];
    score += preferred.filter((t) => tags.has(t)).length * 8;
  }
  const sodium = Number(meal.sodium_mg) || 0;
  if (conditionsLower.some((c) => c === 'hypertension' || c === 'high_blood_pressure') && sodium > 500) {
    score -= Math.min(20, (sodium - 500) / 40);
  }
  return score;
}

function mealCalorieScore(meal, targetCalories) {
  const calories = Number(meal.calories) || 0;
  return Math.max(0, 50 - Math.abs(calories - targetCalories) * 0.25);
}

function varietyBonus(meal, usedCategories) {
  const cats = new Set(mealCategoriesLower(meal));
  if (!cats.size) return 0;
  if ([...cats].every((c) => !usedCategories.has(c))) return 8;
  const overlap = [...cats].filter((c) => usedCategories.has(c)).length;
  return Math.max(0, 5 - overlap * 2);
}

function cultureSeasonBonus(meal, preferredCuisines, preferredSeasons) {
  let score = 0;
  const cuisines = new Set(mealCuisinesLower(meal));
  const seasons = new Set(mealSeasonsLower(meal));
  for (const c of preferredCuisines) if (cuisines.has(c)) score += 4;
  for (const s of preferredSeasons) if (seasons.has(s) || seasons.has('all-season')) score += 2.5;
  return score;
}

function sortPreferenceBonus(meal, sortBy) {
  if (sortBy === 'prep_time') return Math.max(0, 12 - (parseInt(meal.prep_time_minutes) || 60) * 0.35);
  if (sortBy === 'cook_time') return Math.max(0, 10 - (parseInt(meal.cook_time_minutes) || 60) * 0.25);
  if (sortBy === 'total_time') return Math.max(0, 14 - (parseInt(meal.total_time_minutes) || 90) * 0.22);
  if (sortBy === 'high_protein') return (Number(meal.protein_g) || 0) * 0.35;
  if (sortBy === 'high_fibre') return (Number(meal.fibre_g) || 0) * 0.6;
  if (sortBy === 'low_calories') return Math.max(0, 20 - (Number(meal.calories) || 0) * 0.03);
  return 0;
}

function scoreMeal(meal, { targetCalories, remainingCalories, conditionsLower, usedCategories, preferredCuisines, preferredSeasons, sortBy }) {
  const calories = parseInt(meal.calories) || 0;
  if (calories > remainingCalories) return -1;
  let score = mealCalorieScore(meal, targetCalories);
  score += conditionBoostScore(meal, conditionsLower);
  score += varietyBonus(meal, usedCategories);
  score += cultureSeasonBonus(meal, preferredCuisines, preferredSeasons);
  score += sortPreferenceBonus(meal, sortBy);
  const tags = new Set(mealTagsLower(meal));
  if (tags.has('processed_food') || new Set(mealCategoriesLower(meal)).has('fast_food')) score -= 6;
  return score;
}

function pickBestMeal(meals, opts) {
  const candidates = meals.filter((m) => !opts.excludedIds.has(m.id));
  const scored = candidates
    .map((m) => [scoreMeal(m, opts), m])
    .filter(([s]) => s >= 0)
    .sort((a, b) => b[0] - a[0]);
  return scored.length ? scored[0][1] : null;
}

function buildNutritionSummary(planObj) {
  const allMeals = [planObj.breakfast, planObj.lunch, planObj.dinner, ...(planObj.snacks || [])].filter(Boolean);
  const summary = { protein_g: 0, carbs_g: 0, fat_g: 0, fibre_g: 0, sodium_mg: 0 };
  for (const m of allMeals) {
    for (const k of Object.keys(summary)) summary[k] += Number(m[k]) || 0;
  }
  return Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, Math.round(v * 10) / 10]));
}

function buildRationale(meal, conditionsLower) {
  if (!meal) return 'No meal matched the current constraints for this slot.';
  const tags = new Set(mealTagsLower(meal));
  const reasons = [];
  if (tags.has('high_protein')) reasons.push('supports protein needs');
  if (tags.has('high_fibre')) reasons.push('adds fibre for satiety');
  if (tags.has('low_salt')) reasons.push('keeps sodium controlled');
  if (tags.has('low_sugar') || tags.has('low_gi')) reasons.push('helps with glucose-friendly choices');
  if (tags.has('heart_healthy') || tags.has('omega3_rich')) reasons.push('supports heart health');
  for (const cond of conditionsLower) {
    if ((CONDITION_PREFERENCE_MAP[cond] || []).some((t) => tags.has(t))) {
      reasons.push(`aligned with ${cond.replace(/_/g, ' ')} preferences`);
      break;
    }
  }
  if (!reasons.length) reasons.push('fits current calorie and filtering constraints');
  return [...new Set(reasons)].join('; ') + '.';
}

// ---- Main plan function ----
function buildPlan(user) {
  if (!user) user = {};
  const allergies = normalizeStringList(normalizeList(user.allergies));
  const conditionsLower = normalizeStringList(normalizeList(user.conditions));
  const texture = user.texture || 'normal';
  const budget = user.budget || 'medium';
  const calories = parseInt(user.calories_target) || 2000;
  const preferredCuisines = normalizeStringList(normalizeList(user.preferred_cuisines || []));
  const preferredSeasons = normalizeStringList(normalizeList(user.preferred_seasons || []));
  const maxPrepTime = user.max_prep_time_minutes != null ? parseInt(user.max_prep_time_minutes) : null;
  const maxTotalTime = user.max_total_time_minutes != null ? parseInt(user.max_total_time_minutes) : null;
  let sortBy = String(user.sort_by || 'balanced').trim().toLowerCase();
  sortBy = SORT_ALIASES[sortBy] || sortBy;
  if (!SORT_KEYS.has(sortBy)) sortBy = 'balanced';

  let filtered = getMeals();
  filtered = filterAllergy(filtered, allergies);
  filtered = filterCondition(filtered, conditionsLower);
  filtered = filterTexture(filtered, texture);

  if (conditionsLower.includes('elderly')) {
    const soft = filtered.filter((m) => mealTagsLower(m).includes('soft_food'));
    if (soft.length) filtered = soft;
  }

  filtered = filterBudget(filtered, budget);
  filtered = filterCuisine(filtered, preferredCuisines);
  filtered = filterSeason(filtered, preferredSeasons);
  filtered = filterTime(filtered, { maxPrepTime, maxTotalTime });

  const breakfasts = filtered.filter((m) => m.meal_type === 'breakfast');
  const lunches   = filtered.filter((m) => m.meal_type === 'lunch');
  const dinners   = filtered.filter((m) => m.meal_type === 'dinner');
  const snacks    = filtered.filter((m) => m.meal_type === 'snack');

  let remainingCalories = calories;
  const usedIds = new Set();
  const usedCategories = new Set();
  const planObj = { breakfast: null, lunch: null, dinner: null, snacks: [] };

  const commonOpts = { conditionsLower, usedCategories, preferredCuisines, preferredSeasons, sortBy };

  function pick(pool, targetCalories) {
    return pickBestMeal(pool, { ...commonOpts, targetCalories, remainingCalories, excludedIds: usedIds });
  }

  function apply(slot, meal) {
    planObj[slot] = meal;
    if (meal) {
      remainingCalories -= parseInt(meal.calories) || 0;
      usedIds.add(meal.id);
      for (const c of mealCategoriesLower(meal)) usedCategories.add(c);
    }
  }

  apply('breakfast', pick(breakfasts, calories * MEAL_TYPE_CALORIE_DISTRIBUTION.breakfast));
  apply('lunch',     pick(lunches,    calories * MEAL_TYPE_CALORIE_DISTRIBUTION.lunch));

  let dinner = pick(dinners, calories * MEAL_TYPE_CALORIE_DISTRIBUTION.dinner);
  if (!dinner) {
    const soft = dinners.filter((m) => mealTagsLower(m).includes('soft_food'));
    dinner = pick(soft, calories * MEAL_TYPE_CALORIE_DISTRIBUTION.dinner);
  }
  apply('dinner', dinner);

  const snackTarget = calories * MEAL_TYPE_CALORIE_DISTRIBUTION.snack;
  const sortedSnacks = snacks
    .map((m) => [scoreMeal(m, { ...commonOpts, targetCalories: Math.max(snackTarget / 2, 80), remainingCalories, excludedIds: usedIds }), m])
    .filter(([s]) => s >= 0)
    .sort((a, b) => b[0] - a[0])
    .map(([, m]) => m);

  function addSnack(snack, requireNewCategory) {
    if (planObj.snacks.length >= 2 || usedIds.has(snack.id)) return false;
    if ((parseInt(snack.calories) || 0) > remainingCalories) return false;
    const snackCats = new Set(mealCategoriesLower(snack));
    if (requireNewCategory && snackCats.size && [...snackCats].some((c) => usedCategories.has(c))) return false;
    planObj.snacks.push(snack);
    remainingCalories -= parseInt(snack.calories) || 0;
    usedIds.add(snack.id);
    for (const c of snackCats) usedCategories.add(c);
    return true;
  }

  for (const s of sortedSnacks) { if (planObj.snacks.length >= 2) break; addSnack(s, true); }
  if (!planObj.snacks.length) for (const s of sortedSnacks) { if (planObj.snacks.length >= 2) break; addSnack(s, false); }

  const totalCalories = [planObj.breakfast, planObj.lunch, planObj.dinner, ...planObj.snacks]
    .filter(Boolean).reduce((sum, m) => sum + (parseInt(m.calories) || 0), 0);

  planObj.total_calories = totalCalories;
  planObj.target_calories = calories;
  planObj.allergies_used = allergies;
  planObj.budget_used = budget;
  planObj.conditions_used = conditionsLower;
  planObj.remaining_calories = remainingCalories;
  planObj.daily_nutrition_summary = buildNutritionSummary(planObj);
  planObj.variety_score = usedCategories.size;
  planObj.sorting_used = sortBy;
  planObj.cuisine_filter_used = preferredCuisines;
  planObj.season_filter_used = preferredSeasons;
  planObj.max_prep_time_minutes_used = maxPrepTime;
  planObj.max_total_time_minutes_used = maxTotalTime;
  planObj.meal_rationales = {
    breakfast: buildRationale(planObj.breakfast, conditionsLower),
    lunch: buildRationale(planObj.lunch, conditionsLower),
    dinner: buildRationale(planObj.dinner, conditionsLower),
    snacks: (planObj.snacks || []).map((s) => buildRationale(s, conditionsLower)),
  };

  return planObj;
}

// POST /ai-model/meal-plan/generate
router.post('/generate', (req, res) => {
  try {
    const result = buildPlan(req.body || {});
    if (!result.breakfast && !result.lunch && !result.dinner) {
      return res.status(400).json({ error: 'No meals available after filtering. Try relaxing allergies/conditions/texture/budget.' });
    }
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Meal plan generation failed due to server error.' });
  }
});

module.exports = router;

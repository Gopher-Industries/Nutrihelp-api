/**
 * preferenceMatcher.js
 *
 * Scores how well a recipe matches a user's stated preferences and the
 * AI adapter's hints. Hard dislikes translate into a soft down-weight
 * but never a hard block — the user may still want to see them if they
 * are otherwise relevant. Hard blocks remain the job of allergyFilter.
 */

const PREFERRED_CUISINE_WEIGHT = 18;
const PREFERRED_METHOD_WEIGHT = 10;
const PREFERRED_RECIPE_WEIGHT = 22;
const EXCLUDED_RECIPE_PENALTY = -40;
const DISLIKE_PENALTY = -18;
const RECENT_RECIPE_PENALTY = -12;
const GOAL_PROTEIN_WEIGHT = 8;
const GOAL_FIBER_WEIGHT = 8;
const GOAL_SUGAR_WEIGHT = 8;
const GOAL_SODIUM_WEIGHT = 8;
const TARGET_CALORIES_CLOSE = 8;
const TARGET_CALORIES_NEAR = 3;

function normalizeIdList(list) {
  return Array.isArray(list) ? list.filter((id) => id != null) : [];
}

function lower(value) {
  return String(value || '').toLowerCase();
}

function dislikeMatches(recipe, dislikes) {
  const text = lower(recipe.recipe_name);
  return dislikes.find((term) => term && text.includes(lower(term))) || null;
}

/**
 * @param {object} recipe
 * @param {object} context - {
 *   preferredCuisineIds, preferredCookingMethodIds, preferredRecipeIds,
 *   excludedRecipeIds, recentRecipeIds, dislikes (string[]),
 *   goalState: { prioritizeProtein, prioritizeFiber, limitSugar, limitSodium, targetCalories }
 * }
 */
function evaluate(recipe, context = {}) {
  const out = { score: 0, reasons: [], warnings: [], matchedSignals: [] };

  const preferredCuisines = normalizeIdList(context.preferredCuisineIds);
  const preferredMethods = normalizeIdList(context.preferredCookingMethodIds);
  const preferredRecipes = normalizeIdList(context.preferredRecipeIds);
  const excludedRecipes = normalizeIdList(context.excludedRecipeIds);
  const recentRecipes = normalizeIdList(context.recentRecipeIds);
  const dislikes = Array.isArray(context.dislikes) ? context.dislikes : [];
  const goals = context.goalState || {};

  if (excludedRecipes.includes(recipe.id)) {
    out.score += EXCLUDED_RECIPE_PENALTY;
    out.warnings.push({
      tag: 'excluded_by_ai',
      message: 'AI hints marked this recipe as excluded for the current session.',
      severity: 'info'
    });
  }

  if (preferredCuisines.includes(recipe.cuisine_id)) {
    out.score += PREFERRED_CUISINE_WEIGHT;
    out.matchedSignals.push('preferred_cuisine');
    out.reasons.push({ tag: 'preferred_cuisine', message: 'Matches a cuisine you prefer.', weight: PREFERRED_CUISINE_WEIGHT });
  }

  if (preferredMethods.includes(recipe.cooking_method_id)) {
    out.score += PREFERRED_METHOD_WEIGHT;
    out.matchedSignals.push('preferred_cooking_method');
    out.reasons.push({ tag: 'preferred_cooking_method', message: 'Uses a cooking method you prefer.', weight: PREFERRED_METHOD_WEIGHT });
  }

  if (preferredRecipes.includes(recipe.id)) {
    out.score += PREFERRED_RECIPE_WEIGHT;
    out.matchedSignals.push('ai_preferred_recipe');
    out.reasons.push({ tag: 'ai_preferred_recipe', message: 'AI signal recommends this dish for you.', weight: PREFERRED_RECIPE_WEIGHT });
  }

  if (recipe.dislike === true) {
    out.score += DISLIKE_PENALTY;
    out.warnings.push({ tag: 'user_disliked', message: 'You previously disliked this recipe.', severity: 'info' });
  } else {
    const dislikeHit = dislikeMatches(recipe, dislikes);
    if (dislikeHit) {
      out.score += DISLIKE_PENALTY / 2;
      out.warnings.push({
        tag: 'dislike_keyword',
        message: `Recipe name mentions "${dislikeHit}", which you listed as a dislike.`,
        severity: 'info'
      });
    }
  }

  if (recentRecipes.includes(recipe.id)) {
    out.score += RECENT_RECIPE_PENALTY;
    out.reasons.push({ tag: 'recent_meal_penalty', message: 'Recently served — deprioritised for variety.', weight: RECENT_RECIPE_PENALTY });
  }

  if (goals.prioritizeProtein && recipe.protein != null && recipe.protein >= 15) {
    out.score += GOAL_PROTEIN_WEIGHT;
    out.matchedSignals.push('goal_high_protein');
    out.reasons.push({ tag: 'goal_high_protein', message: 'Supports your higher-protein goal.', weight: GOAL_PROTEIN_WEIGHT });
  }

  if (goals.prioritizeFiber && recipe.fiber != null && recipe.fiber >= 5) {
    out.score += GOAL_FIBER_WEIGHT;
    out.matchedSignals.push('goal_high_fiber');
    out.reasons.push({ tag: 'goal_high_fiber', message: 'Supports your higher-fibre goal.', weight: GOAL_FIBER_WEIGHT });
  }

  if (goals.limitSugar && recipe.sugar != null) {
    if (recipe.sugar <= 10) {
      out.score += GOAL_SUGAR_WEIGHT;
      out.matchedSignals.push('goal_low_sugar');
      out.reasons.push({ tag: 'goal_low_sugar', message: 'Fits your low-sugar preference.', weight: GOAL_SUGAR_WEIGHT });
    } else {
      out.score -= GOAL_SUGAR_WEIGHT;
      out.warnings.push({ tag: 'goal_sugar_mismatch', message: `Sugar ${recipe.sugar}g is above your low-sugar target.`, severity: 'info' });
    }
  }

  if (goals.limitSodium && recipe.sodium != null) {
    if (recipe.sodium <= 400) {
      out.score += GOAL_SODIUM_WEIGHT;
      out.matchedSignals.push('goal_low_sodium');
      out.reasons.push({ tag: 'goal_low_sodium', message: 'Fits your low-sodium preference.', weight: GOAL_SODIUM_WEIGHT });
    } else {
      out.score -= GOAL_SODIUM_WEIGHT;
      out.warnings.push({ tag: 'goal_sodium_mismatch', message: `Sodium ${recipe.sodium}mg is above your low-sodium target.`, severity: 'info' });
    }
  }

  if (goals.targetCalories != null && recipe.calories != null) {
    const delta = Math.abs(recipe.calories - goals.targetCalories);
    if (delta <= 100) {
      out.score += TARGET_CALORIES_CLOSE;
      out.matchedSignals.push('target_calories_close');
      out.reasons.push({ tag: 'target_calories_close', message: `Close to your calorie target (Δ ${Math.round(delta)} kcal).`, weight: TARGET_CALORIES_CLOSE });
    } else if (delta <= 250) {
      out.score += TARGET_CALORIES_NEAR;
      out.matchedSignals.push('target_calories_near');
      out.reasons.push({ tag: 'target_calories_near', message: `Near your calorie target (Δ ${Math.round(delta)} kcal).`, weight: TARGET_CALORIES_NEAR });
    }
  }

  return out;
}

module.exports = {
  PREFERRED_CUISINE_WEIGHT,
  PREFERRED_METHOD_WEIGHT,
  PREFERRED_RECIPE_WEIGHT,
  EXCLUDED_RECIPE_PENALTY,
  DISLIKE_PENALTY,
  RECENT_RECIPE_PENALTY,
  evaluate
};

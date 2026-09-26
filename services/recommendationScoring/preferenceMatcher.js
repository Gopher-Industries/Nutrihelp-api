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

const DIETARY_RULES = [
  {
    id: 'vegetarian',
    match: (name) => name.includes('vegetarian'),
    fitMessage: 'Aligned with your vegetarian preference.',
    conflictMessage: 'Recipe appears to include meat, which conflicts with your vegetarian preference.',
    fitWeight: 8,
    conflictPenalty: -22,
    conflicts: ['chicken', 'beef', 'pork', 'bacon', 'ham', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn']
  },
  {
    id: 'vegan',
    match: (name) => name.includes('vegan'),
    fitMessage: 'Aligned with your vegan preference.',
    conflictMessage: 'Recipe appears to include animal products, which conflicts with your vegan preference.',
    fitWeight: 10,
    conflictPenalty: -26,
    conflicts: ['chicken', 'beef', 'pork', 'bacon', 'ham', 'lamb', 'turkey', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'milk', 'cheese', 'cream', 'butter', 'yogurt', 'yoghurt', 'egg', 'omelette', 'honey']
  },
  {
    id: 'gluten_free',
    match: (name) => name.includes('gluten free') || name.includes('gluten-free') || name.includes('coeliac') || name.includes('celiac'),
    fitMessage: 'Looks compatible with your gluten-free preference.',
    conflictMessage: 'Recipe name or ingredients suggest gluten-containing items.',
    fitWeight: 8,
    conflictPenalty: -20,
    conflicts: ['bread', 'pasta', 'noodle', 'wheat', 'barley', 'rye', 'couscous', 'bulgur', 'seitan']
  },
  {
    id: 'dairy_free',
    match: (name) => name.includes('dairy free') || name.includes('dairy-free') || name.includes('lactose free') || name.includes('lactose-free'),
    fitMessage: 'Looks compatible with your dairy-free preference.',
    conflictMessage: 'Recipe appears to include dairy ingredients.',
    fitWeight: 7,
    conflictPenalty: -18,
    conflicts: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'yoghurt', 'ghee', 'paneer']
  },
  {
    id: 'low_carb',
    match: (name) => name.includes('low carb') || name.includes('low-carb') || name.includes('keto'),
    fitWeight: 7,
    conflictPenalty: -12,
    evaluate(recipe, out) {
      if (recipe.carbohydrates != null && recipe.carbohydrates <= 25) {
        out.score += 7;
        out.matchedSignals.push('dietary_low_carb');
        out.reasons.push({ tag: 'dietary_low_carb', message: 'Supports your low-carb preference.', weight: 7 });
      } else if (recipe.carbohydrates != null && recipe.carbohydrates > 50) {
        out.score -= 12;
        out.warnings.push({ tag: 'dietary_low_carb_conflict', message: `Carbohydrates ${recipe.carbohydrates}g are above a typical low-carb target.`, severity: 'info' });
      }
    }
  },
  {
    id: 'high_protein',
    match: (name) => name.includes('high protein') || name.includes('high-protein'),
    fitWeight: 8,
    conflictPenalty: -8,
    evaluate(recipe, out) {
      if (recipe.protein != null && recipe.protein >= 20) {
        out.score += 8;
        out.matchedSignals.push('dietary_high_protein');
        out.reasons.push({ tag: 'dietary_high_protein', message: 'Supports your high-protein preference.', weight: 8 });
      } else if (recipe.protein != null && recipe.protein < 12) {
        out.score -= 8;
        out.warnings.push({ tag: 'dietary_high_protein_conflict', message: `Protein ${recipe.protein}g is lower than a typical high-protein meal target.`, severity: 'info' });
      }
    }
  }
];

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

function recipeText(recipe) {
  return [
    lower(recipe.recipe_name),
    lower(recipe.description),
    lower(Array.isArray(recipe.ingredients) ? recipe.ingredients.join(' ') : recipe.ingredients)
  ].join(' ');
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsPhrase(text, phrase) {
  if (!text || !phrase) return false;
  const pattern = new RegExp(`(^|[^a-z])${escapeRegex(phrase)}([^a-z]|$)`, 'i');
  return pattern.test(text);
}

function normalizeNameList(list) {
  return Array.isArray(list)
    ? [...new Set(list.map((item) => lower(item).trim()).filter(Boolean))]
    : [];
}

function applyDietaryRequirementSignals(recipe, dietaryRequirements, out) {
  const recipeTextValue = recipeText(recipe);

  for (const requirementName of normalizeNameList(dietaryRequirements)) {
    const rule = DIETARY_RULES.find((candidate) => candidate.match(requirementName));
    if (!rule) continue;

    if (typeof rule.evaluate === 'function') {
      rule.evaluate(recipe, out);
      continue;
    }

    const conflict = rule.conflicts.find((term) => containsPhrase(recipeTextValue, term));
    if (conflict) {
      out.score += rule.conflictPenalty;
      out.warnings.push({
        tag: `dietary_${rule.id}_conflict`,
        message: `${rule.conflictMessage} Matched "${conflict}".`,
        severity: 'info'
      });
      continue;
    }

    out.score += rule.fitWeight;
    out.matchedSignals.push(`dietary_${rule.id}`);
    out.reasons.push({
      tag: `dietary_${rule.id}`,
      message: rule.fitMessage,
      weight: rule.fitWeight
    });
  }
}

/**
 * @param {object} recipe
 * @param {object} context - {
 *   preferredCuisineIds, preferredCookingMethodIds, preferredRecipeIds,
 *   excludedRecipeIds, recentRecipeIds, dislikes (string[]),
 *   dietaryRequirements (string[]),
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
  const dietaryRequirements = Array.isArray(context.dietaryRequirements) ? context.dietaryRequirements : [];
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

  applyDietaryRequirementSignals(recipe, dietaryRequirements, out);

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

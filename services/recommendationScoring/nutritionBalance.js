/**
 * nutritionBalance.js
 *
 * Scores the nutritional balance of a recipe as a whole. Independent of
 * user conditions — this layer asks "is this a reasonably well-balanced
 * single meal?" Each signal produces a small positive or negative score
 * delta plus an explanation tag.
 */

const PROTEIN_GOOD_MIN = 15;  // grams
const FIBER_GOOD_MIN = 5;      // grams
const SODIUM_OK_MAX = 600;     // mg
const SODIUM_HIGH = 1200;      // mg
const SUGAR_OK_MAX = 15;       // g
const SUGAR_HIGH = 30;         // g
const CALORIE_IDEAL_MIN = 300; // kcal per meal
const CALORIE_IDEAL_MAX = 700; // kcal per meal

function numeric(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @returns {{ score, reasons, warnings, breakdown }}
 */
function evaluate(recipe) {
  const out = { score: 0, reasons: [], warnings: [], breakdown: {} };

  const protein = numeric(recipe.protein);
  const fiber = numeric(recipe.fiber);
  const sodium = numeric(recipe.sodium);
  const sugar = numeric(recipe.sugar);
  const calories = numeric(recipe.calories);
  const fat = numeric(recipe.fat);
  const carbs = numeric(recipe.carbohydrates);

  if (protein != null) {
    if (protein >= PROTEIN_GOOD_MIN) {
      out.score += 6;
      out.reasons.push({ tag: 'balanced_protein', message: `Delivers ${protein}g of protein — a strong hit toward a balanced meal.`, weight: 6 });
    }
    out.breakdown.protein = protein;
  }

  if (fiber != null) {
    if (fiber >= FIBER_GOOD_MIN) {
      out.score += 5;
      out.reasons.push({ tag: 'balanced_fiber', message: `Provides ${fiber}g fibre.`, weight: 5 });
    }
    out.breakdown.fiber = fiber;
  }

  if (sodium != null) {
    if (sodium <= SODIUM_OK_MAX) {
      out.score += 4;
      out.reasons.push({ tag: 'balanced_sodium', message: `Sodium is within a typical per-meal range (${sodium}mg).`, weight: 4 });
    } else if (sodium > SODIUM_HIGH) {
      out.score -= 6;
      out.warnings.push({ tag: 'sodium_high', message: `Sodium ${sodium}mg is higher than most meal targets.`, severity: 'info' });
    }
    out.breakdown.sodium = sodium;
  }

  if (sugar != null) {
    if (sugar <= SUGAR_OK_MAX) {
      out.score += 3;
      out.reasons.push({ tag: 'balanced_sugar', message: `Sugar is moderate (${sugar}g).`, weight: 3 });
    } else if (sugar > SUGAR_HIGH) {
      out.score -= 5;
      out.warnings.push({ tag: 'sugar_high', message: `Sugar ${sugar}g is on the high side.`, severity: 'info' });
    }
    out.breakdown.sugar = sugar;
  }

  if (calories != null) {
    if (calories >= CALORIE_IDEAL_MIN && calories <= CALORIE_IDEAL_MAX) {
      out.score += 4;
      out.reasons.push({ tag: 'balanced_calories', message: `Calorie count (${calories} kcal) fits a typical main-meal window.`, weight: 4 });
    }
    out.breakdown.calories = calories;
  }

  out.breakdown.fat = fat;
  out.breakdown.carbohydrates = carbs;

  return out;
}

module.exports = {
  PROTEIN_GOOD_MIN,
  FIBER_GOOD_MIN,
  SODIUM_OK_MAX,
  SODIUM_HIGH,
  SUGAR_OK_MAX,
  SUGAR_HIGH,
  CALORIE_IDEAL_MIN,
  CALORIE_IDEAL_MAX,
  evaluate
};

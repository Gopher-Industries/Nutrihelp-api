/**
 * conditionAdjuster.js
 *
 * Chronic-condition aware score adjustments. For each condition the user
 * has listed, the adjuster emits:
 *   - a list of nutrition targets the recipe should respect
 *   - score deltas (positive when recipe aligns, negative when it conflicts)
 *   - explanation tags describing *why* the adjustment was applied
 *
 * The adjuster never blocks — it only nudges scores and surfaces warnings.
 * Hard blocks are the job of allergyFilter. Medical nuance is the job of
 * medicationGuard. This module deliberately keeps the rules readable so
 * a reviewer (or a clinician) can audit them at a glance.
 */

const CONDITION_RULES = [
  {
    id: 'diabetes',
    match: (name) => name.includes('diabetes') || name.includes('prediabetes') || name.includes('insulin resistance'),
    apply: (recipe, out) => {
      // Limit sugar, prioritise fibre.
      if (recipe.sugar != null) {
        if (recipe.sugar <= 8) {
          out.score += 10;
          out.reasons.push({ tag: 'diabetes_low_sugar', message: 'Low added sugar supports blood-sugar management.', weight: 10 });
        } else if (recipe.sugar > 20) {
          out.score -= 14;
          out.warnings.push({ tag: 'diabetes_high_sugar', message: `High sugar content (${recipe.sugar}g) may impact blood-sugar control.`, severity: 'warn' });
        }
      }
      if (recipe.fiber != null && recipe.fiber >= 6) {
        out.score += 8;
        out.reasons.push({ tag: 'diabetes_high_fiber', message: 'Higher fibre helps slow glucose absorption.', weight: 8 });
      }
    }
  },
  {
    id: 'hypertension',
    match: (name) => name.includes('hypertension') || name.includes('blood pressure') || name.includes('high bp'),
    apply: (recipe, out) => {
      if (recipe.sodium != null) {
        if (recipe.sodium <= 400) {
          out.score += 10;
          out.reasons.push({ tag: 'hypertension_low_sodium', message: 'Low sodium is kinder to blood pressure.', weight: 10 });
        } else if (recipe.sodium > 900) {
          out.score -= 14;
          out.warnings.push({ tag: 'hypertension_high_sodium', message: `High sodium (${recipe.sodium}mg) can raise blood pressure.`, severity: 'warn' });
        }
      }
    }
  },
  {
    id: 'cholesterol',
    match: (name) => name.includes('cholesterol') || name.includes('cardio') || name.includes('heart'),
    apply: (recipe, out) => {
      if (recipe.fat != null) {
        if (recipe.fat <= 12) {
          out.score += 6;
          out.reasons.push({ tag: 'cholesterol_low_fat', message: 'Lower total fat is supportive for cardiovascular goals.', weight: 6 });
        } else if (recipe.fat > 25) {
          out.score -= 8;
          out.warnings.push({ tag: 'cholesterol_high_fat', message: `High fat content (${recipe.fat}g) — check portion size.`, severity: 'info' });
        }
      }
      if (recipe.fiber != null && recipe.fiber >= 6) {
        out.score += 4;
        out.reasons.push({ tag: 'cholesterol_high_fiber', message: 'Soluble fibre can help manage cholesterol.', weight: 4 });
      }
    }
  },
  {
    id: 'renal',
    match: (name) => name.includes('kidney') || name.includes('renal'),
    apply: (recipe, out) => {
      if (recipe.sodium != null && recipe.sodium > 600) {
        out.score -= 12;
        out.warnings.push({ tag: 'renal_high_sodium', message: `Sodium ${recipe.sodium}mg is above the level typically suggested for kidney care.`, severity: 'warn' });
      }
      if (recipe.protein != null && recipe.protein > 35) {
        out.score -= 8;
        out.warnings.push({ tag: 'renal_high_protein', message: `Very high protein (${recipe.protein}g) — portion adjustment may be appropriate for renal diets.`, severity: 'info' });
      }
    }
  },
  {
    id: 'obesity',
    match: (name) => name.includes('obesity') || name.includes('overweight') || name.includes('weight management'),
    apply: (recipe, out) => {
      if (recipe.calories != null) {
        if (recipe.calories <= 500) {
          out.score += 8;
          out.reasons.push({ tag: 'obesity_moderate_calories', message: 'Moderate calorie count aligns with weight-management goals.', weight: 8 });
        } else if (recipe.calories > 800) {
          out.score -= 10;
          out.warnings.push({ tag: 'obesity_high_calories', message: `High calorie meal (${recipe.calories} kcal) — consider smaller portions.`, severity: 'info' });
        }
      }
      if (recipe.fiber != null && recipe.fiber >= 5) {
        out.score += 4;
        out.reasons.push({ tag: 'obesity_satiety_fiber', message: 'Fibre helps with satiety.', weight: 4 });
      }
    }
  },
  {
    id: 'celiac',
    match: (name) => name.includes('celiac') || name.includes('coeliac') || name.includes('gluten'),
    apply: (recipe, out) => {
      const text = String(recipe.recipe_name || '').toLowerCase();
      if (/(wheat|bread|pasta|noodle|couscous|bulgur|seitan|barley|rye)/.test(text)) {
        out.score -= 20;
        out.warnings.push({ tag: 'celiac_gluten_risk', message: 'Dish name suggests gluten-containing ingredients — verify before eating.', severity: 'high' });
      }
    }
  }
];

function matchedRules(conditionNames) {
  const matched = [];
  const seen = new Set();
  for (const condition of conditionNames) {
    const lower = String(condition || '').toLowerCase();
    for (const rule of CONDITION_RULES) {
      if (seen.has(rule.id)) continue;
      if (rule.match(lower)) {
        matched.push(rule);
        seen.add(rule.id);
      }
    }
  }
  return matched;
}

/**
 * Apply condition-aware adjustments to a score accumulator.
 * @param {object} recipe - recipe row
 * @param {object} context - { conditionNames: string[] }
 * @returns {{ score: number, reasons: Array, warnings: Array, appliedConditions: string[] }}
 */
function evaluate(recipe, context = {}) {
  const out = { score: 0, reasons: [], warnings: [], appliedConditions: [] };
  const conditionNames = Array.isArray(context.conditionNames) ? context.conditionNames : [];
  const rules = matchedRules(conditionNames);

  for (const rule of rules) {
    rule.apply(recipe, out);
    out.appliedConditions.push(rule.id);
  }

  return out;
}

module.exports = {
  CONDITION_RULES,
  evaluate
};

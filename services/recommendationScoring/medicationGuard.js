/**
 * medicationGuard.js
 *
 * Medication-aware guard rails. The rules here are *cautionary*, never
 * diagnostic. Each rule produces a safetyNote (not a block) with a
 * conservative, well-known food-drug interaction message and always
 * carries a `disclaimer: true` marker so the frontend can render the
 * "this is not medical advice, check with your provider" framing.
 *
 * Rules included cover commonly-taught interactions only:
 *   - Warfarin (anticoagulant) + very high vitamin K foods
 *   - MAOIs + aged / fermented tyramine sources
 *   - Statins + grapefruit
 *   - Metformin / sulfonylureas + alcohol-heavy dishes
 *
 * Detection is name-based: we match the medication name the user has
 * listed against a short list of substrings, and we match the recipe
 * against name keywords. This is intentionally conservative — if the
 * rule can't be matched with high confidence, nothing is emitted.
 */

const MEDICATION_RULES = [
  {
    id: 'warfarin_vitamin_k',
    medicationMatch: ['warfarin', 'coumadin', 'jantoven'],
    foodMatch: ['kale', 'spinach', 'collard', 'swiss chard', 'mustard greens', 'turnip greens'],
    message: 'Foods very high in vitamin K can affect warfarin dosing — please discuss portion consistency with your clinician.',
    severity: 'warn'
  },
  {
    id: 'maoi_tyramine',
    medicationMatch: ['maoi', 'phenelzine', 'tranylcypromine', 'isocarboxazid', 'selegiline'],
    foodMatch: ['aged cheese', 'blue cheese', 'cheddar', 'parmesan', 'salami', 'pepperoni', 'cured', 'fermented soy', 'miso', 'tempeh', 'kimchi', 'sauerkraut'],
    message: 'This dish may contain tyramine-rich ingredients, which can interact with MAOI medications — please check with your prescriber.',
    severity: 'high'
  },
  {
    id: 'statin_grapefruit',
    medicationMatch: ['statin', 'atorvastatin', 'simvastatin', 'lovastatin'],
    foodMatch: ['grapefruit', 'pomelo'],
    message: 'Grapefruit can affect some statins. Consider an alternative citrus unless your clinician has cleared it.',
    severity: 'warn'
  },
  {
    id: 'diabetes_meds_alcohol',
    medicationMatch: ['metformin', 'glipizide', 'glyburide', 'glimepiride', 'insulin'],
    foodMatch: ['wine', 'beer', 'vodka', 'whiskey', 'rum', 'cocktail', 'liqueur'],
    message: 'Dishes with significant alcohol can affect blood-sugar medications. Check with your clinician before pairing.',
    severity: 'warn'
  }
];

function lower(value) {
  return String(value || '').toLowerCase();
}

function matchesAny(haystack, needles) {
  return needles.find((needle) => needle && haystack.includes(needle)) || null;
}

function recipeText(recipe) {
  return [
    lower(recipe.recipe_name),
    lower(recipe.description),
    lower(Array.isArray(recipe.ingredients) ? recipe.ingredients.join(' ') : recipe.ingredients)
  ].join(' ');
}

function activeMedicationNames(context) {
  const list = Array.isArray(context.medications) ? context.medications : [];
  return list
    .filter((med) => med && med.active !== false)
    .map((med) => lower(med.name))
    .filter(Boolean);
}

/**
 * Evaluate medication-aware caution rules for a recipe.
 * @param {object} recipe - recipe row
 * @param {object} context - { medications: [{ name, active }] }
 * @returns {{ safetyNotes: Array, triggeredRuleIds: string[] }}
 */
function evaluate(recipe, context = {}) {
  const text = recipeText(recipe);
  const activeMeds = activeMedicationNames(context);
  const triggered = [];
  const safetyNotes = [];

  for (const rule of MEDICATION_RULES) {
    const matchingMed = matchesAny(activeMeds.join(' '), rule.medicationMatch);
    if (!matchingMed) continue;

    const matchingFood = matchesAny(text, rule.foodMatch);
    if (!matchingFood) continue;

    triggered.push(rule.id);
    safetyNotes.push({
      tag: rule.id,
      message: rule.message,
      severity: rule.severity,
      disclaimer: true,
      triggeredBy: {
        medication: matchingMed,
        food: matchingFood
      }
    });
  }

  return {
    safetyNotes,
    triggeredRuleIds: triggered
  };
}

module.exports = {
  MEDICATION_RULES,
  evaluate
};

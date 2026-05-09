/**
 * allergyFilter.js
 *
 * Hard-filter layer that blocks recipes whenever an ingredient / name match
 * is detected against the user's allergy list, or when the recipe row is
 * flagged as an allergen in the database.
 *
 * Contract:
 *   evaluate(recipe, context) -> {
 *     blocked: boolean,
 *     blockers: string[],   // allergen names that triggered the block
 *     severity: 'mild' | 'moderate' | 'severe' | 'unknown' | null,
 *     notes: string[]       // human-readable reason strings
 *   }
 *
 * The filter is intentionally conservative. Any ambiguity is treated as
 * a block so that unsafe suggestions never reach the user. This module
 * is the single source of truth for allergy decisions so that the
 * reasoning is easy to inspect and extend in one place.
 */

const SEVERITY_ORDER = { mild: 1, moderate: 2, severe: 3, unknown: 0 };

// Common allergen name aliases. Keys are canonical allergen names (lowercased);
// values are substrings that indicate the allergen is present in a recipe name.
// Kept conservative — only well-known culinary aliases.
const ALLERGEN_ALIASES = {
  peanut: ['peanut', 'groundnut', 'satay'],
  'tree nut': ['almond', 'cashew', 'hazelnut', 'pecan', 'pistachio', 'walnut', 'macadamia'],
  milk: ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'yoghurt', 'ghee', 'paneer'],
  dairy: ['milk', 'butter', 'cheese', 'cream', 'yogurt', 'yoghurt', 'ghee', 'paneer', 'lactose'],
  egg: ['egg', 'omelet', 'omelette', 'frittata', 'quiche'],
  fish: ['fish', 'salmon', 'tuna', 'cod', 'haddock', 'anchovy', 'sardine', 'mackerel', 'trout'],
  shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'clam', 'mussel', 'scallop'],
  soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  wheat: ['wheat', 'bread', 'pasta', 'noodle', 'flour', 'couscous', 'bulgur', 'seitan'],
  gluten: ['wheat', 'barley', 'rye', 'bread', 'pasta', 'noodle', 'seitan'],
  sesame: ['sesame', 'tahini'],
  mustard: ['mustard'],
  celery: ['celery']
};

function safeLower(value) {
  if (value == null) return '';
  return String(value).toLowerCase();
}

function expandAllergenTerms(allergy) {
  const canonical = safeLower(allergy.name).trim();
  if (!canonical) return [];
  const aliases = ALLERGEN_ALIASES[canonical] || [];
  return [...new Set([canonical, ...aliases])];
}

function matchAllergenInText(terms, text) {
  return terms.find((term) => term && text.includes(term)) || null;
}

function severityRank(sev) {
  return SEVERITY_ORDER[sev] ?? 0;
}

/**
 * Decide whether a recipe should be hard-blocked on allergy grounds.
 * @param {object} recipe - recipe row from the DB
 * @param {object} context - { allergies: [{ name, severity, notes }] }
 */
function evaluate(recipe, context = {}) {
  const blockers = [];
  let worstSeverity = null;
  const notes = [];

  const recipeText = [
    safeLower(recipe.recipe_name),
    safeLower(recipe.description),
    safeLower(Array.isArray(recipe.ingredients) ? recipe.ingredients.join(' ') : recipe.ingredients)
  ].join(' ');

  // Legacy DB-level flag — some rows pre-mark unsafe items for this user.
  if (recipe.allergy === true) {
    blockers.push('database_allergy_flag');
    notes.push('Recipe is flagged as an allergen in the catalogue for this user.');
  }

  const allergies = Array.isArray(context.allergies) ? context.allergies : [];

  for (const allergy of allergies) {
    if (!allergy || !allergy.name) continue;
    const terms = expandAllergenTerms(allergy);
    if (!terms.length) continue;

    const match = matchAllergenInText(terms, recipeText);
    if (match) {
      blockers.push(allergy.name.toLowerCase());
      notes.push(`Contains or references "${match}" which matches the "${allergy.name}" allergy.`);

      if (severityRank(allergy.severity) >= severityRank(worstSeverity)) {
        worstSeverity = allergy.severity || worstSeverity || 'unknown';
      }
    }
  }

  return {
    blocked: blockers.length > 0,
    blockers: [...new Set(blockers)],
    severity: worstSeverity,
    notes
  };
}

module.exports = {
  ALLERGEN_ALIASES,
  evaluate
};

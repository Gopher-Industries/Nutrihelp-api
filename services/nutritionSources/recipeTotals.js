/**
 * Recipe nutrition totals with coverage.
 *
 * The previous rule blanked a whole total as soon as one ingredient was
 * unknown. That is safe but blunt: half a teaspoon of an unlisted herb erased a
 * recipe that was 99.9% accounted for. Totals now come in two layers.
 *
 *   totals    The strict figures that live in the recipes table and that other
 *             features (meal planning, daily plans) add up. A figure is only
 *             published when every ingredient has a weight, the ingredients
 *             with no data for that nutrient are a sliver of the recipe, and
 *             that nutrient's total does not rest mostly on estimated weights.
 *   coverage  What was counted and what was estimated, plus the partial sums,
 *             so the UI can still show a number with an honest label:
 *             "about 1,830 kcal, covers 7 of 8 ingredients".
 *
 * Pure: the caller supplies the ingredient rows. Values are per 100 g.
 */
const { NUTRIENT_COLUMNS } = require('./nutrientMapper');
const { MASS_IN_GRAMS, normalizeUnit } = require('./unitConversion');

// Ingredients with no figure for a nutrient may be at most this share of the
// recipe's weight before that nutrient's strict total is withheld.
const MAX_MISSING_WEIGHT_SHARE = 0.05;
// At most this share of a nutrient's total may come from ingredients whose
// weight was estimated. Measured per nutrient, not by weight: a live save had an
// estimated tin of tomatoes at 43% of the recipe's weight but 4% of its calories.
const MAX_ESTIMATED_SHARE = 0.25;

function round2(value) {
  return Math.round(value * 100) / 100;
}

function usableNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/**
 * Weight of ingredient i in grams, or null when it cannot be known.
 * Preference: a weight the caller supplied (nutritionSources converts cups,
 * cloves and tins), then a mass unit, then the legacy contract in which a bare
 * quantity with no unit metadata has always meant grams.
 */
function gramsOf(index, quantities, metadata) {
  const supplied = usableNumber(Array.isArray(metadata.grams) ? metadata.grams[index] : null);
  if (supplied !== null && supplied >= 0) return supplied;

  const quantity = usableNumber(quantities[index]);
  if (quantity === null) return null;

  if (!Array.isArray(metadata.unit)) return quantity;
  const factor = MASS_IN_GRAMS[normalizeUnit(metadata.unit[index])];
  return factor ? quantity * factor : null;
}

/**
 * @param {{rows: Array<object>, ingredientIds: Array, quantities: Array, metadata?: object}} input
 * @returns {{totals: Record<string, number|null>, coverage: object}}
 */
function computeRecipeTotals({ rows = [], ingredientIds = [], quantities = [], metadata = {} }) {
  const meta = metadata || {};
  const byId = new Map(rows.map((row) => [Number(row.id), row]));
  const count = ingredientIds.length;

  const weights = ingredientIds.map((_, index) => gramsOf(index, quantities, meta));
  const weighed = weights.filter((grams) => grams !== null).length;
  const totalWeight = weights.reduce((sum, grams) => sum + (grams || 0), 0);
  const isEstimate = (index) =>
    Array.isArray(meta.grams_source) && meta.grams_source[index] === 'llm_estimate';
  const share = (weight) => (totalWeight > 0 ? weight / totalWeight : 0);

  const totals = {};
  const counted = {};
  const partial = {};

  for (const nutrient of NUTRIENT_COLUMNS) {
    let sum = 0;
    let estimatedSum = 0;
    let countedHere = 0;
    let missingWeight = 0;

    weights.forEach((grams, index) => {
      if (grams === null) return;
      if (grams === 0) {
        countedHere += 1; // a pinch adds nothing, whatever it is
        return;
      }
      const value = usableNumber(byId.get(Number(ingredientIds[index]))?.[nutrient]);
      if (value === null) {
        missingWeight += grams;
        return;
      }
      const contribution = (value / 100) * grams;
      sum += contribution;
      if (isEstimate(index)) estimatedSum += contribution;
      countedHere += 1;
    });

    const publishable =
      count > 0 &&
      weighed === count &&
      share(missingWeight) <= MAX_MISSING_WEIGHT_SHARE &&
      (sum > 0 ? estimatedSum / sum : 0) <= MAX_ESTIMATED_SHARE;

    totals[nutrient] = publishable ? sum : null;
    counted[nutrient] = countedHere;
    partial[nutrient] = countedHere > 0 ? round2(sum) : null;
  }

  return {
    totals,
    coverage: {
      ingredients: count,
      weighed,
      estimated: weights.filter((grams, index) => grams !== null && isEstimate(index)).length,
      // The headline the UI shows is calories, so that decides the label.
      reliable: totals.calories !== null,
      counted,
      partial,
    },
  };
}

module.exports = { computeRecipeTotals, MAX_MISSING_WEIGHT_SHARE, MAX_ESTIMATED_SHARE };

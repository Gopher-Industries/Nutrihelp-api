/**
 * Unit tests for recipe nutrition totals with coverage.
 *
 * The old rule blanked a whole total as soon as one ingredient was unknown, so
 * half a teaspoon of an unlisted herb erased a recipe that was 99.9% known.
 * Totals now come in two layers:
 *
 *   totals    the strict figures other features (meal planning) rely on. Written
 *             only when nearly the whole recipe, by weight, is accounted for.
 *   coverage  what was counted, what was estimated, and the partial sums, so the
 *             UI can still show a figure with an honest label.
 *
 * Pure functions, no I/O.
 */
const assert = require('assert');
const { computeRecipeTotals } = require('../../services/nutritionSources/recipeTotals');

const PASTA = { id: 1, calories: 371, protein: 13, vitamin_d: 0 };
const OIL = { id: 2, calories: 884, protein: 0, vitamin_d: 0 };
const TOMATO = { id: 3, calories: 18, protein: 0.88, vitamin_d: null };
const SEASONING = { id: 4, calories: null, protein: null, vitamin_d: null }; // no USDA record

function totalsFor(rows, quantities, metadata) {
  return computeRecipeTotals({
    rows,
    ingredientIds: rows.map((row) => row.id),
    quantities,
    metadata,
  });
}

function near(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.01,
    `${message || ''} expected ${expected}, got ${actual}`
  );
}

describe('nutritionSources/recipeTotals', () => {
  it('totals a fully known recipe and reports full coverage', () => {
    const { totals, coverage } = totalsFor([PASTA, OIL], [450, 54], {
      unit: ['g', 'cup'],
      grams: [450, 54],
    });

    near(totals.calories, 371 * 4.5 + 884 * 0.54);
    near(totals.protein, 13 * 4.5);
    assert.strictEqual(coverage.ingredients, 2);
    assert.strictEqual(coverage.weighed, 2);
    assert.strictEqual(coverage.estimated, 0);
    assert.strictEqual(coverage.counted.calories, 2);
    assert.strictEqual(coverage.reliable, true);
  });

  it('does not let a trace ingredient with no data blank the total', () => {
    // 0.5 g of seasoning in a 450 g recipe: 0.1% of the weight.
    const { totals, coverage } = totalsFor([PASTA, SEASONING], [450, 0.5], {
      unit: ['g', 'g'],
      grams: [450, 0.5],
    });

    near(totals.calories, 371 * 4.5);
    assert.strictEqual(coverage.counted.calories, 1);
    assert.strictEqual(coverage.reliable, true);
  });

  it('keeps the strict total empty when a substantial ingredient has no data', () => {
    // 150 g of unknown in a 600 g recipe: a quarter of the weight.
    const { totals, coverage } = totalsFor([PASTA, SEASONING], [450, 150], {
      unit: ['g', 'g'],
      grams: [450, 150],
    });

    assert.strictEqual(totals.calories, null);
    near(coverage.partial.calories, 371 * 4.5, 'the partial sum is still reported');
    assert.strictEqual(coverage.counted.calories, 1);
    assert.strictEqual(coverage.reliable, false);
  });

  it('keeps every strict total empty when an ingredient could not be weighed', () => {
    const { totals, coverage } = totalsFor([PASTA, TOMATO], [450, 1], {
      unit: ['g', 'tin'],
      grams: [450, null],
    });

    assert.strictEqual(totals.calories, null);
    assert.strictEqual(totals.protein, null);
    assert.strictEqual(coverage.weighed, 1);
    near(coverage.partial.calories, 371 * 4.5);
    assert.strictEqual(coverage.counted.calories, 1);
    assert.strictEqual(coverage.reliable, false);
  });

  it('accepts a small estimated weight and records that it was estimated', () => {
    // A 400 g tin against 2 kg of pasta: 17% of the weight is an estimate.
    const { totals, coverage } = totalsFor([PASTA, TOMATO], [2000, 1], {
      unit: ['g', 'tin'],
      grams: [2000, 400],
      grams_source: ['mass', 'llm_estimate'],
    });

    near(totals.calories, 371 * 20 + 18 * 4);
    assert.strictEqual(coverage.estimated, 1);
    assert.strictEqual(coverage.reliable, true);
  });

  it('will not publish a strict total that rests mostly on an estimated weight', () => {
    // The estimate is 400 g of a 450 g recipe.
    const { totals, coverage } = totalsFor([PASTA, TOMATO], [50, 1], {
      unit: ['g', 'tin'],
      grams: [50, 400],
      grams_source: ['mass', 'llm_estimate'],
    });

    assert.strictEqual(totals.calories, null);
    near(coverage.partial.calories, 371 * 0.5 + 18 * 4);
    assert.strictEqual(coverage.counted.calories, 2, 'both were counted, the doubt is the weight');
    assert.strictEqual(coverage.reliable, false);
  });

  it('treats a negligible amount as counted, whatever the ingredient is', () => {
    const { totals, coverage } = totalsFor([PASTA, SEASONING], [450, null], {
      unit: ['g', ''],
      grams: [450, 0],
      grams_source: ['mass', 'negligible'],
    });

    near(totals.calories, 371 * 4.5);
    assert.strictEqual(coverage.counted.calories, 2);
    assert.strictEqual(coverage.weighed, 2);
  });

  it('judges each nutrient on its own data', () => {
    // Tomato has calories but no vitamin D figure, and it is most of the weight.
    const { totals, coverage } = totalsFor([PASTA, TOMATO], [100, 400], {
      unit: ['g', 'g'],
      grams: [100, 400],
    });

    near(totals.calories, 371 + 18 * 4);
    assert.strictEqual(totals.vitamin_d, null);
    assert.strictEqual(coverage.counted.vitamin_d, 1);
    assert.strictEqual(coverage.reliable, true, 'reliability is about the headline figures');
  });

  it('honours mass units and the legacy gram contract when no weights are supplied', () => {
    const withUnits = totalsFor([PASTA], [0.5], { unit: ['kg'] });
    const legacy = totalsFor([PASTA], [250], {});

    near(withUnits.totals.calories, 371 * 5);
    near(legacy.totals.calories, 371 * 2.5);
    assert.strictEqual(legacy.coverage.weighed, 1);
  });

  it('ignores a supplied weight that is negative or not a number', () => {
    const { totals, coverage } = totalsFor([PASTA], [1], { unit: ['cup'], grams: ['abc'] });

    assert.strictEqual(totals.calories, null);
    assert.strictEqual(coverage.weighed, 0);
  });

  it('reports every nutrient column and survives an empty recipe', () => {
    const { totals, coverage } = totalsFor([], [], {});

    assert.strictEqual(totals.calories, null);
    assert.strictEqual(Object.keys(totals).length, 11);
    assert.strictEqual(coverage.ingredients, 0);
    assert.strictEqual(coverage.reliable, false);
  });

  it('rounds the partial sums so the stored record stays small and readable', () => {
    const { coverage } = totalsFor([PASTA], [333.333], { unit: ['g'], grams: [333.333] });

    assert.strictEqual(coverage.partial.calories, 1236.67);
  });
});

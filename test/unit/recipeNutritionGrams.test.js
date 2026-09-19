/**
 * Unit tests for recipe nutrition totals when ingredients carry a gram weight.
 *
 * The save calculation multiplies per-100 g values by grams. Until now it could
 * only do that for mass units, so a recipe measured in cups or cloves saved
 * with empty nutrition. A caller may now pass `grams` per ingredient (worked
 * out by nutritionSources). The database module is proxyquired out: no I/O.
 */
const assert = require('node:assert/strict');
const proxyquire = require('proxyquire').noCallThru();

function model(rows) {
  return proxyquire('../../model/createRecipe', {
    '../dbConnection.js': {
      from: () => ({
        select() {
          return this;
        },
        in: async () => ({ data: rows, error: null }),
      }),
    },
  });
}

function create(rows, ids, quantities, metadata) {
  return model(rows).createRecipe(
    960,
    ids,
    quantities,
    'Arrabiata',
    1,
    2,
    20,
    'Cook',
    1,
    [],
    metadata
  );
}

const OLIVE_OIL = { id: 1, calories: 884, protein: 0 };
const GARLIC = { id: 2, calories: 149, protein: 6.36 };
const MYSTERY_SPICE = { id: 3, calories: null, protein: null };

describe('Recipe nutrition totals from gram weights', () => {
  it('totals an ingredient measured in cups once its gram weight is known', async () => {
    const recipe = await create([OLIVE_OIL], [1], [0.25], { unit: ['cup'], grams: [54.42] });

    assert.ok(Math.abs(recipe.calories - 481.07) < 0.01, `calories was ${recipe.calories}`);
  });

  it('adds gram-weighted and mass-unit ingredients in the same recipe', async () => {
    const recipe = await create([OLIVE_OIL, GARLIC], [1, 2], [0.25, 20], {
      unit: ['cup', 'g'],
      grams: [54.42, null],
    });

    // 884 * 0.5442 + 149 * 0.20
    assert.ok(Math.abs(recipe.calories - 510.87) < 0.01, `calories was ${recipe.calories}`);
  });

  it('does not let a negligible ingredient blank the total, even with unknown nutrients', async () => {
    const recipe = await create([GARLIC, MYSTERY_SPICE], [2, 3], [20, null], {
      unit: ['g', ''],
      grams: [20, 0],
    });

    assert.ok(Math.abs(recipe.calories - 29.8) < 0.01, `calories was ${recipe.calories}`);
    assert.ok(Math.abs(recipe.protein - 1.272) < 0.001, `protein was ${recipe.protein}`);
  });

  it('still leaves the total empty when an ingredient has neither grams nor a mass unit', async () => {
    const recipe = await create([OLIVE_OIL], [1], [0.25], { unit: ['cup'], grams: [null] });

    assert.equal(recipe.calories, null);
  });

  it('ignores a gram weight that is negative or not a number', async () => {
    for (const bad of [-5, 'abc', NaN]) {
      const recipe = await create([OLIVE_OIL], [1], [0.25], { unit: ['cup'], grams: [bad] });
      assert.equal(recipe.calories, null, String(bad));
    }
  });

  it('publishes the total when only a trace ingredient has no data', async () => {
    // Half a gram of an unlisted seasoning must not erase a 450 g recipe.
    const recipe = await create([GARLIC, MYSTERY_SPICE], [2, 3], [450, 0.5], {
      unit: ['g', 'g'],
      grams: [450, 0.5],
    });

    assert.ok(Math.abs(recipe.calories - 670.5) < 0.01, `calories was ${recipe.calories}`);
  });

  it('withholds the total but keeps a labelled partial sum when a big ingredient has no data', async () => {
    const recipe = await create([GARLIC, MYSTERY_SPICE], [2, 3], [450, 150], {
      unit: ['g', 'g'],
      grams: [450, 150],
    });

    assert.equal(recipe.calories, null);
    const coverage = recipe.ingredients.nutrition_coverage;
    assert.equal(coverage.reliable, false);
    assert.equal(coverage.ingredients, 2);
    assert.equal(coverage.counted.calories, 1);
    assert.equal(coverage.partial.calories, 670.5);
  });

  it('records estimated weights in the coverage', async () => {
    const recipe = await create([GARLIC, OLIVE_OIL], [2, 1], [2000, 1], {
      unit: ['g', 'tin'],
      grams: [2000, 400],
      grams_source: ['mass', 'llm_estimate'],
    });

    assert.equal(recipe.ingredients.nutrition_coverage.estimated, 1);
    assert.equal(recipe.ingredients.nutrition_coverage.reliable, true);
    assert.ok(recipe.calories > 0);
  });

  it('stores coverage for legacy clients too, without inventing unit metadata', async () => {
    const recipe = await model([GARLIC]).createRecipe(
      960,
      [2],
      [100],
      'Garlic',
      1,
      2,
      20,
      'Cook',
      1
    );

    assert.equal(recipe.calories, 149);
    assert.equal(recipe.ingredients.unit, undefined);
    assert.equal(recipe.ingredients.nutrition_coverage.weighed, 1);
  });

  it('stores the gram weights next to the units so the total can be explained later', async () => {
    const recipe = await create([OLIVE_OIL], [1], [0.25], {
      unit: ['cup'],
      source_measure: ['1/4 cup'],
      grams: [54.42],
      grams_source: ['usda_density'],
    });

    assert.deepEqual(recipe.ingredients.grams, [54.42]);
    assert.deepEqual(recipe.ingredients.grams_source, ['usda_density']);
    assert.deepEqual(recipe.ingredients.unit, ['cup']);
    assert.equal(recipe.ingredients.quantity[0], 0.25);
  });
});

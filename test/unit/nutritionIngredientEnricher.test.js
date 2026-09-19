/**
 * Unit tests for the save-time nutrition enrichment step.
 *
 * It runs after ingredientResolver: for every resolved ingredient it works out
 * a gram weight, and fills USDA nutrients into rows of the SHARED ingredients
 * table whose nutrition is completely empty. Supabase and the USDA lookup are
 * both replaced with fakes, so no test performs any I/O.
 */
const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const SILENT_LOGGER = { info() {}, warn() {}, error() {}, debug() {} };

const EMPTY = {
  calories: null,
  protein: null,
  fat: null,
  carbohydrates: null,
  fiber: null,
  sugar: null,
  sodium: null,
  vitamin_a: null,
  vitamin_b: null,
  vitamin_c: null,
  vitamin_d: null,
};
const GARLIC_NUTRIENTS = { ...EMPTY, calories: 149, protein: 6.36, fat: 0.5, carbohydrates: 33.06 };
const GARLIC_PORTIONS = [
  { amount: 1, modifier: 'clove', gramWeight: 3 },
  { amount: 1, modifier: 'tsp', gramWeight: 2.8 },
];

function found(overrides = {}) {
  return {
    status: 'found',
    confidence: 'high',
    fdcId: 169230,
    description: 'Garlic, raw',
    dataType: 'SR Legacy',
    nutrients: GARLIC_NUTRIENTS,
    foodPortions: GARLIC_PORTIONS,
    ...overrides,
  };
}

/**
 * Stand-in for the two supabase-js chains the enricher uses:
 *   from().select().in()                               -> current nutrient columns
 *   from().update(values).eq().is().select()           -> guarded fill
 */
function fakeSupabase({ rows = [], updateError = null } = {}) {
  const calls = { updates: [] };
  const supabaseService = {
    from() {
      const update = { values: null, filters: [] };
      const chain = {
        select() {
          if (!update.values) return chain;
          calls.updates.push(update);
          if (updateError) return Promise.resolve({ data: null, error: updateError });
          return Promise.resolve({ data: [{ id: update.filters[0]?.[2] }], error: null });
        },
        in() {
          return Promise.resolve({ data: rows, error: null });
        },
        update(values) {
          update.values = values;
          return chain;
        },
        eq(column, value) {
          update.filters.push(['eq', column, value]);
          return chain;
        },
        is(column, value) {
          update.filters.push(['is', column, value]);
          return chain;
        },
      };
      return chain;
    },
  };
  return { supabaseService, calls };
}

function load(fake, lookupIngredient) {
  return proxyquire('../../services/nutritionSources/ingredientEnricher', {
    '../supabaseClient': { supabaseService: fake.supabaseService, '@noCallThru': true },
    './index': { lookupIngredient, '@noCallThru': true },
    '../../utils/logger': { ...SILENT_LOGGER, '@noCallThru': true },
  });
}

const resolvedGarlic = {
  name: 'Garlic',
  id: 63,
  category: 'Fruit & Vegetables',
  status: 'matched',
  matchedName: 'Garlic',
};

describe('nutritionSources/ingredientEnricher', () => {
  it('weighs a mass quantity without asking USDA when the row already has nutrition', async () => {
    const fake = fakeSupabase({ rows: [{ id: 63, ...GARLIC_NUTRIENTS }] });
    const lookup = sinon.stub();

    const [item] = await load(fake, lookup).enrichIngredients(
      [resolvedGarlic],
      [{ name: 'Garlic', quantity: 20, unit: 'g' }]
    );

    assert.strictEqual(item.grams, 20);
    assert.strictEqual(item.grams_source, 'mass');
    assert.strictEqual(item.nutrition.status, 'existing');
    assert.strictEqual(lookup.callCount, 0);
    assert.strictEqual(fake.calls.updates.length, 0);
  });

  it('keeps every field the resolver returned', async () => {
    const fake = fakeSupabase({ rows: [{ id: 63, ...GARLIC_NUTRIENTS }] });

    const [item] = await load(fake, sinon.stub()).enrichIngredients(
      [resolvedGarlic],
      [{ name: 'Garlic', quantity: 20, unit: 'g' }]
    );

    for (const [key, value] of Object.entries(resolvedGarlic))
      assert.strictEqual(item[key], value, key);
  });

  it('uses the USDA portions of the food to weigh a counted or volume quantity', async () => {
    const fake = fakeSupabase({ rows: [{ id: 63, ...GARLIC_NUTRIENTS }] });
    const lookup = sinon.stub().resolves(found());

    const [item] = await load(fake, lookup).enrichIngredients(
      [resolvedGarlic],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }]
    );

    assert.strictEqual(item.grams, 6);
    assert.strictEqual(item.grams_source, 'usda_portion');
    assert.strictEqual(lookup.firstCall.args[0], 'Garlic');
  });

  it('fills USDA nutrients into a row whose nutrition is completely empty', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().resolves(found());
    const created = { name: 'Garlic', id: 301, category: 'Pantry', status: 'created' };

    const [item] = await load(fake, lookup).enrichIngredients(
      [created],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }],
      { fillMissing: true }
    );

    assert.strictEqual(fake.calls.updates.length, 1);
    const [update] = fake.calls.updates;
    // Only measured figures are written; columns USDA lacks stay untouched.
    assert.deepStrictEqual(update.values, {
      calories: 149,
      protein: 6.36,
      fat: 0.5,
      carbohydrates: 33.06,
    });
    assert.deepStrictEqual(update.filters, [
      ['eq', 'id', 301],
      ['is', 'calories', null],
    ]);
    assert.strictEqual(item.nutrition.status, 'filled');
    assert.deepStrictEqual(item.nutrition.source, {
      provider: 'usda',
      fdcId: 169230,
      description: 'Garlic, raw',
      confidence: 'high',
    });
  });

  it('never overwrites a row that already holds any nutrient value', async () => {
    const partlyFilled = { id: 63, ...EMPTY, protein: 6 };
    const fake = fakeSupabase({ rows: [partlyFilled] });
    const lookup = sinon.stub().resolves(found());

    const [item] = await load(fake, lookup).enrichIngredients(
      [resolvedGarlic],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }],
      { fillMissing: true }
    );

    assert.strictEqual(fake.calls.updates.length, 0);
    assert.strictEqual(item.nutrition.status, 'existing');
  });

  it('does not write anything unless fillMissing is set', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().resolves(found());

    const [item] = await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }]
    );

    assert.strictEqual(fake.calls.updates.length, 0);
    assert.strictEqual(item.nutrition.status, 'missing');
    assert.strictEqual(item.grams, 6, 'weighing is read-only and still happens');
  });

  it('does not write a low-confidence match to the shared table', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().resolves(found({ confidence: 'low' }));

    const [item] = await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }],
      { fillMissing: true }
    );

    assert.strictEqual(fake.calls.updates.length, 0);
    assert.strictEqual(item.nutrition.status, 'missing');
  });

  it('accepts a match the LLM confirmed', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().resolves(found({ confidence: 'llm' }));

    const [item] = await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 1, unit: 'tsp' }],
      { fillMissing: true }
    );

    assert.strictEqual(fake.calls.updates.length, 1);
    assert.strictEqual(item.nutrition.status, 'filled');
  });

  it('passes the LLM through to the lookup', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().resolves(found());
    const generate = async () => '{}';

    await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 1, unit: 'tsp' }],
      { generate }
    );

    assert.strictEqual(lookup.firstCall.args[1].generate, generate);
  });

  it('reports unavailable and leaves the weight empty when USDA cannot be reached', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().resolves({ status: 'unavailable', reason: 'rate_limited' });

    const [item] = await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }],
      { fillMissing: true }
    );

    assert.strictEqual(item.nutrition.status, 'unavailable');
    assert.strictEqual(item.grams, null);
    assert.strictEqual(item.grams_source, null);
  });

  it('survives a lookup that throws', async () => {
    const fake = fakeSupabase({ rows: [{ id: 301, ...EMPTY }] });
    const lookup = sinon.stub().rejects(new Error('boom'));

    const [item] = await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }],
      { fillMissing: true }
    );

    assert.strictEqual(item.nutrition.status, 'unavailable');
  });

  it('reports missing when the guarded fill fails', async () => {
    const fake = fakeSupabase({
      rows: [{ id: 301, ...EMPTY }],
      updateError: { message: 'permission denied' },
    });
    const lookup = sinon.stub().resolves(found());

    const [item] = await load(fake, lookup).enrichIngredients(
      [{ ...resolvedGarlic, id: 301 }],
      [{ name: 'Garlic', quantity: 2, unit: 'cloves' }],
      { fillMissing: true }
    );

    assert.strictEqual(item.nutrition.status, 'missing');
    assert.strictEqual(item.grams, 6);
  });

  it('passes through an ingredient the resolver could not place', async () => {
    const fake = fakeSupabase({ rows: [] });
    const lookup = sinon.stub();
    const unmatched = { name: 'penne rigate', id: null, category: null, status: 'unmatched' };

    const [item] = await load(fake, lookup).enrichIngredients(
      [unmatched],
      [{ name: 'penne rigate', quantity: 1, unit: 'pound' }]
    );

    assert.strictEqual(item.status, 'unmatched');
    assert.strictEqual(item.grams, 453.59);
    assert.strictEqual(item.nutrition.status, 'missing');
    assert.strictEqual(lookup.callCount, 0);
  });

  it('lines measures up with results the way the resolver does, skipping blank names', async () => {
    const fake = fakeSupabase({ rows: [{ id: 63, ...GARLIC_NUTRIENTS }] });

    const items = await load(fake, sinon.stub()).enrichIngredients(
      [resolvedGarlic],
      [
        { name: '  ', quantity: 999, unit: 'g' },
        { name: 'Garlic', quantity: 20, unit: 'g' },
      ]
    );

    assert.strictEqual(items.length, 1);
    assert.strictEqual(items[0].grams, 20);
  });

  it('looks each distinct name up once even when a recipe repeats it', async () => {
    const fake = fakeSupabase({ rows: [{ id: 63, ...GARLIC_NUTRIENTS }] });
    const lookup = sinon.stub().resolves(found());

    const items = await load(fake, lookup).enrichIngredients(
      [resolvedGarlic, resolvedGarlic],
      [
        { name: 'Garlic', quantity: 2, unit: 'cloves' },
        { name: 'Garlic', quantity: 1, unit: 'tsp' },
      ]
    );

    assert.deepStrictEqual(
      items.map((item) => item.grams),
      [6, 2.8]
    );
    assert.strictEqual(lookup.callCount, 1);
  });

  it('returns an empty list for no ingredients', async () => {
    const fake = fakeSupabase();

    assert.deepStrictEqual(await load(fake, sinon.stub()).enrichIngredients([], []), []);
  });
});

/**
 * Unit tests for the ingredient nutrition lookup (search, rank, optional LLM
 * choice, portions, cache). The USDA client is proxyquired out, so no test
 * performs any I/O. proxyquire loads a fresh module per test, so each test
 * starts with an empty cache.
 */
const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const SILENT_LOGGER = { info() {}, warn() {}, error() {}, debug() {} };

const CORE = [
  { nutrientId: 1008, value: 149, unitName: 'KCAL' },
  { nutrientId: 1003, value: 6.36, unitName: 'G' },
  { nutrientId: 1004, value: 0.5, unitName: 'G' },
  { nutrientId: 1005, value: 33.06, unitName: 'G' },
];
const GARLIC = {
  fdcId: 169230,
  description: 'Garlic, raw',
  dataType: 'SR Legacy',
  foodNutrients: CORE,
};
const GARLIC_POWDER = {
  fdcId: 171325,
  description: 'Spices, garlic powder',
  dataType: 'SR Legacy',
  foodNutrients: CORE,
};
const BRIE = {
  fdcId: 172177,
  description: 'Cheese, brie',
  dataType: 'SR Legacy',
  foodNutrients: CORE,
};
const BLUE = {
  fdcId: 172175,
  description: 'Cheese, blue',
  dataType: 'SR Legacy',
  foodNutrients: CORE,
};
const GARLIC_PORTIONS = [{ amount: 1, modifier: 'clove', gramWeight: 3 }];

function usdaError(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

function load({ searchFoods, getFood }) {
  return proxyquire('../../services/nutritionSources', {
    './usdaClient': { searchFoods, getFood },
    '../../utils/logger': SILENT_LOGGER,
  });
}

describe('nutritionSources lookup', () => {
  it('returns per-100 g nutrients and portions for a clear match', async () => {
    const searchFoods = sinon.stub().resolves([GARLIC_POWDER, GARLIC]);
    const getFood = sinon.stub().resolves({ ...GARLIC, foodPortions: GARLIC_PORTIONS });

    const result = await load({ searchFoods, getFood }).lookupIngredient('Garlic');

    assert.strictEqual(result.status, 'found');
    assert.strictEqual(result.confidence, 'high');
    assert.strictEqual(result.fdcId, 169230);
    assert.strictEqual(result.description, 'Garlic, raw');
    assert.strictEqual(result.nutrients.calories, 149);
    assert.strictEqual(result.nutrients.sodium, null);
    assert.deepStrictEqual(result.foodPortions, GARLIC_PORTIONS);
    assert.strictEqual(getFood.firstCall.args[0], 169230);
  });

  it('reports not_found when no USDA food contains every word', async () => {
    const searchFoods = sinon
      .stub()
      .resolves([{ ...GARLIC, description: 'Fruit cocktail, canned' }]);
    const getFood = sinon.stub();

    const result = await load({ searchFoods, getFood }).lookupIngredient('dragon fruit');

    assert.deepStrictEqual(result, { status: 'not_found' });
    assert.strictEqual(getFood.callCount, 0);
  });

  it('reports unavailable when USDA is rate limited, and does not cache that', async () => {
    const searchFoods = sinon.stub();
    searchFoods.onFirstCall().rejects(usdaError('rate_limited'));
    searchFoods.onSecondCall().resolves([GARLIC]);
    const getFood = sinon.stub().resolves({ ...GARLIC, foodPortions: [] });
    const lookup = load({ searchFoods, getFood });

    assert.deepStrictEqual(await lookup.lookupIngredient('garlic'), {
      status: 'unavailable',
      reason: 'rate_limited',
    });
    assert.strictEqual((await lookup.lookupIngredient('garlic')).status, 'found');
  });

  it('serves a repeated name from the cache, ignoring case and spacing', async () => {
    const searchFoods = sinon.stub().resolves([GARLIC]);
    const getFood = sinon.stub().resolves({ ...GARLIC, foodPortions: GARLIC_PORTIONS });
    const lookup = load({ searchFoods, getFood });

    const first = await lookup.lookupIngredient('Garlic');
    const second = await lookup.lookupIngredient('  garlic ');

    assert.deepStrictEqual(second, first);
    assert.strictEqual(searchFoods.callCount, 1);
    assert.strictEqual(getFood.callCount, 1);
  });

  it('keeps the match when only the portions request fails', async () => {
    const searchFoods = sinon.stub().resolves([GARLIC]);
    const getFood = sinon.stub().rejects(usdaError('unavailable'));

    const result = await load({ searchFoods, getFood }).lookupIngredient('garlic');

    assert.strictEqual(result.status, 'found');
    assert.deepStrictEqual(result.foodPortions, []);
  });

  it('does not call USDA for a blank name', async () => {
    const searchFoods = sinon.stub();

    const result = await load({ searchFoods, getFood: sinon.stub() }).lookupIngredient('  ');

    assert.deepStrictEqual(result, { status: 'not_found' });
    assert.strictEqual(searchFoods.callCount, 0);
  });

  describe('when several USDA foods fit equally well', () => {
    const closeCall = () => ({
      searchFoods: sinon.stub().resolves([BRIE, BLUE]),
      getFood: sinon.stub().callsFake(async (fdcId) => ({ fdcId, foodPortions: [] })),
    });

    it('keeps the best guess at low confidence when no LLM is available', async () => {
      const result = await load(closeCall()).lookupIngredient('cheese');

      assert.strictEqual(result.status, 'found');
      assert.strictEqual(result.confidence, 'low');
    });

    it('lets the LLM choose, but only from the listed USDA ids', async () => {
      const generate = sinon.stub().resolves('{"fdcId": 172175}');

      const result = await load(closeCall()).lookupIngredient('cheese', { generate });

      assert.strictEqual(result.fdcId, 172175);
      assert.strictEqual(result.confidence, 'llm');
      assert.ok(generate.firstCall.args[0].includes('172177'), 'the prompt lists the candidates');
      assert.ok(generate.firstCall.args[0].includes('Cheese, blue'));
    });

    it('ignores an LLM answer that is not one of the candidates', async () => {
      const generate = sinon.stub().resolves('{"fdcId": 999999}');

      const result = await load(closeCall()).lookupIngredient('cheese', { generate });

      assert.strictEqual(result.confidence, 'low');
      assert.ok([172177, 172175].includes(result.fdcId));
    });

    it('reports not_found when the LLM says none of them is the ingredient', async () => {
      const generate = sinon.stub().resolves('{"fdcId": null}');

      const result = await load(closeCall()).lookupIngredient('cheese', { generate });

      assert.deepStrictEqual(result, { status: 'not_found' });
    });

    it('falls back to the low-confidence guess when the LLM fails', async () => {
      const generate = sinon.stub().rejects(new Error('provider down'));

      const result = await load(closeCall()).lookupIngredient('cheese', { generate });

      assert.strictEqual(result.confidence, 'low');
    });
  });

  it('never consults the LLM for a clear match', async () => {
    const generate = sinon.stub();
    const searchFoods = sinon.stub().resolves([GARLIC, GARLIC_POWDER]);
    const getFood = sinon.stub().resolves({ ...GARLIC, foodPortions: [] });

    await load({ searchFoods, getFood }).lookupIngredient('garlic', { generate });

    assert.strictEqual(generate.callCount, 0);
  });
});

/**
 * Unit tests for the last-resort weight estimate.
 *
 * USDA portion data cannot weigh "1 tin" of tomatoes or "1 bunch" of parsley.
 * For those, an LLM is asked what ONE unit weighs. Unlike every other tier this
 * is an estimate, so it is bounded by plausibility ranges in code and labelled
 * `llm_estimate` wherever it travels. The LLM is a stub here: no I/O.
 */
const assert = require('assert');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

const SILENT_LOGGER = { info() {}, warn() {}, error() {}, debug() {} };
const UNKNOWN = { grams: null, source: null };

function load() {
  return proxyquire('../../services/nutritionSources/weightEstimator', {
    '../../utils/logger': SILENT_LOGGER,
  });
}

function answering(entries) {
  return sinon.stub().resolves(JSON.stringify(entries));
}

const TIN_OF_TOMATO = { name: 'Tomato', quantity: 1, unit: 'tin', notes: 'chopped' };

describe('nutritionSources/weightEstimator', () => {
  it('asks what one unit weighs and scales it by the quantity itself', async () => {
    const generate = answering([{ index: 0, grams_per_unit: 400 }]);

    const [one] = await load().estimateWeights([TIN_OF_TOMATO], generate);
    const [two] = await load().estimateWeights([{ ...TIN_OF_TOMATO, quantity: 2 }], generate);

    assert.deepStrictEqual(one, { grams: 400, source: 'llm_estimate' });
    assert.deepStrictEqual(two, { grams: 800, source: 'llm_estimate' });
  });

  it('describes the ingredient, unit and notes to the model', async () => {
    const generate = answering([{ index: 0, grams_per_unit: 400 }]);

    await load().estimateWeights([TIN_OF_TOMATO], generate);

    const prompt = generate.firstCall.args[0];
    assert.ok(prompt.includes('Tomato'));
    assert.ok(prompt.includes('tin'));
    assert.ok(prompt.includes('chopped'));
  });

  it('estimates every unknown ingredient in a single call', async () => {
    const generate = answering([
      { index: 0, grams_per_unit: 400 },
      { index: 1, grams_per_unit: 60 },
    ]);

    const results = await load().estimateWeights(
      [TIN_OF_TOMATO, { name: 'Parsley', quantity: 1, unit: 'bunch' }],
      generate
    );

    assert.strictEqual(generate.callCount, 1);
    assert.deepStrictEqual(
      results.map((result) => result.grams),
      [400, 60]
    );
  });

  it('counts an ingredient with no unit as whole items', async () => {
    const generate = answering([{ index: 0, grams_per_unit: 150 }]);

    const [result] = await load().estimateWeights(
      [{ name: 'Courgette', quantity: 2, unit: null }],
      generate
    );

    assert.deepStrictEqual(result, { grams: 300, source: 'llm_estimate' });
  });

  it('rejects a weight that is implausible for the unit', async () => {
    const cases = [
      { item: TIN_OF_TOMATO, answer: 5 }, // no tin of food weighs 5 g
      { item: TIN_OF_TOMATO, answer: 90000 },
      { item: { name: 'Basil', quantity: 6, unit: 'leaves' }, answer: 500 },
      { item: { name: 'Flour', quantity: 1, unit: 'cup' }, answer: 5000 }, // denser than lead shot
      { item: { name: 'Flour', quantity: 1, unit: 'cup' }, answer: 2 },
    ];

    for (const { item, answer } of cases) {
      const generate = answering([{ index: 0, grams_per_unit: answer }]);
      const [result] = await load().estimateWeights([item], generate);
      assert.deepStrictEqual(result, UNKNOWN, `${item.name} ${item.unit} = ${answer}`);
    }
  });

  it('accepts a plausible volume weight', async () => {
    const generate = answering([{ index: 0, grams_per_unit: 125 }]);

    const [result] = await load().estimateWeights(
      [{ name: 'Flour', quantity: 2, unit: 'cups' }],
      generate
    );

    assert.deepStrictEqual(result, { grams: 250, source: 'llm_estimate' });
  });

  it('ignores answers that are malformed, null or for an ingredient it never asked about', async () => {
    const generate = answering([
      { index: 7, grams_per_unit: 400 },
      { index: 0, grams_per_unit: 'heavy' },
      { index: 1, grams_per_unit: null },
      'nonsense',
    ]);

    const results = await load().estimateWeights(
      [TIN_OF_TOMATO, { name: 'Parsley', quantity: 1, unit: 'bunch' }],
      generate
    );

    assert.deepStrictEqual(results, [UNKNOWN, UNKNOWN]);
  });

  it('does not ask about an ingredient that has no quantity to scale', async () => {
    const generate = answering([]);

    const results = await load().estimateWeights(
      [{ name: 'Oil', quantity: null, unit: null, notes: 'for frying' }],
      generate
    );

    assert.deepStrictEqual(results, [UNKNOWN]);
    assert.strictEqual(generate.callCount, 0);
  });

  it('returns unknown weights when the model fails or is absent', async () => {
    const failing = sinon.stub().rejects(new Error('provider down'));

    assert.deepStrictEqual(await load().estimateWeights([TIN_OF_TOMATO], failing), [UNKNOWN]);
    assert.deepStrictEqual(await load().estimateWeights([TIN_OF_TOMATO], null), [UNKNOWN]);
    assert.deepStrictEqual(await load().estimateWeights([], failing), []);
  });

  it('rounds to two decimals', async () => {
    const generate = answering([{ index: 0, grams_per_unit: 0.3333 }]);

    const [result] = await load().estimateWeights(
      [{ name: 'Basil', quantity: 7, unit: 'leaves' }],
      generate
    );

    assert.strictEqual(result.grams, 2.33);
  });
});

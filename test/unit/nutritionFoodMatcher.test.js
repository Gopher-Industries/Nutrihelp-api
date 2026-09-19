/**
 * Unit tests for ranking USDA search candidates against an ingredient name.
 *
 * USDA's own relevance order is unreliable ("olive oil" returns a corn, peanut
 * and olive blend first), so the matcher re-ranks. Descriptions below are real
 * FoodData Central descriptions. Pure functions, no I/O.
 */
const assert = require('assert');
const { rankCandidates, pickCandidate } = require('../../services/nutritionSources/foodMatcher');

const CORE = [
  { nutrientId: 1008, value: 100 },
  { nutrientId: 1003, value: 1 },
  { nutrientId: 1004, value: 1 },
  { nutrientId: 1005, value: 1 },
];

let nextId = 1000;
function food(description, overrides = {}) {
  nextId += 1;
  return { fdcId: nextId, description, dataType: 'SR Legacy', foodNutrients: CORE, ...overrides };
}

describe('nutritionSources/foodMatcher', () => {
  describe('pickCandidate', () => {
    it('prefers the plain food over a blend that merely contains the words', () => {
      const blend = food('Oil, corn, peanut, and olive');
      const olive = food('Oil, olive, salad or cooking');

      const picked = pickCandidate('olive oil', [blend, olive]);

      assert.strictEqual(picked.food.fdcId, olive.fdcId);
      assert.strictEqual(picked.confidence, 'high');
    });

    it('matches across singular and plural forms', () => {
      const onions = food('Onions, raw');

      assert.strictEqual(pickCandidate('onion', [onions]).food.fdcId, onions.fdcId);
      assert.strictEqual(pickCandidate('Tomatoes', [food('Tomatoes, red, ripe, raw, year round average')]).confidence, 'high');
    });

    it('prefers the raw food when the name does not mention a processed form', () => {
      const paste = food('Tomato products, canned, paste, without salt added');
      const raw = food('Tomatoes, red, ripe, raw, year round average');

      assert.strictEqual(pickCandidate('tomato', [paste, raw]).food.fdcId, raw.fdcId);
    });

    it('respects a processed form when the name asks for it', () => {
      const paste = food('Tomato products, canned, paste, without salt added');
      const raw = food('Tomatoes, red, ripe, raw, year round average');

      assert.strictEqual(pickCandidate('tomato paste', [raw, paste]).food.fdcId, paste.fdcId);
    });

    it('prefers the whole food over a part of it', () => {
      const white = food('Egg, white, raw, fresh');
      const whole = food('Egg, whole, raw, fresh');

      const picked = pickCandidate('egg', [white, whole]);

      assert.strictEqual(picked.food.fdcId, whole.fdcId);
      assert.strictEqual(picked.confidence, 'high');
    });

    it('skips a candidate that has no energy or macros', () => {
      const hollow = food('Oil, olive, extra virgin', {
        dataType: 'Foundation',
        foodNutrients: [{ nutrientId: 1004, value: 100 }],
      });
      const usable = food('Oil, olive, salad or cooking');

      assert.strictEqual(pickCandidate('olive oil', [hollow, usable]).food.fdcId, usable.fdcId);
    });

    it('returns null when no candidate contains every word of the name', () => {
      assert.strictEqual(pickCandidate('dragon fruit', [food('Fruit cocktail, canned')]), null);
    });

    it('reports low confidence when several foods fit equally well', () => {
      const picked = pickCandidate('cheese', [food('Cheese, brie'), food('Cheese, blue')]);

      assert.ok(picked, 'a best guess is still returned');
      assert.strictEqual(picked.confidence, 'low');
    });

    it('returns null for an empty name or no candidates', () => {
      assert.strictEqual(pickCandidate('', [food('Garlic, raw')]), null);
      assert.strictEqual(pickCandidate('garlic', []), null);
      assert.strictEqual(pickCandidate('garlic', undefined), null);
    });
  });

  describe('rankCandidates', () => {
    it('orders usable candidates best first and leaves the input untouched', () => {
      const foods = [food('Spices, garlic powder'), food('Garlic, raw')];
      const before = JSON.stringify(foods);

      const ranked = rankCandidates('garlic', foods);

      assert.deepStrictEqual(ranked.map((entry) => entry.food.description), ['Garlic, raw', 'Spices, garlic powder']);
      assert.ok(ranked[0].score > ranked[1].score);
      assert.strictEqual(JSON.stringify(foods), before);
    });
  });
});

const assert = require('node:assert/strict');
const { parseMeasure, deterministicMap } = require('../../services/recipeSources/mapperService');

describe('MealDB source measures', () => {
  for (const [measure, quantity, unit] of [
    ['1/4 cup', 0.25, 'cup'], ['1/2 teaspoon', 0.5, 'teaspoon'],
    ['¼ cup', 0.25, 'cup'], ['¾ cup', 0.75, 'cup'],
    ['2-1/2 cups', 2.5, 'cups'], ['1 1/2 cups', 1.5, 'cups'], ['1½ cups', 1.5, 'cups'],
    ['100g', 100, 'g'], ['300ml', 300, 'ml'], ['1.2 kg', 1.2, 'kg'],
    ['175g/6oz', 175, 'g'], ['8 cloves chopped', 8, 'cloves'], ['2 large', 2, null],
  ]) {
    it(`parses ${measure} without converting between units`, () => {
      const parsed = parseMeasure(measure);
      assert.equal(parsed.quantity, quantity);
      assert.equal(parsed.unit, unit);
    });
  }
  for (const measure of ['sprinkling', 'To taste', 'to serve', 'sprigs of fresh', '1-2 cups', '1 to 2 cups', '1/0 cup', '2 x 400g tins']) {
    it(`preserves ${measure} for review`, () => {
      assert.deepEqual(parseMeasure(measure), { quantity: null, unit: null, notes: measure });
    });
  }
  it('keeps source wording alongside parsed quantities and missing measures', () => {
    const draft = deterministicMap({ ingredients: [
      { name: 'Flour', measure: '175g/6oz' }, { name: 'Salt', measure: 'To taste' }, { name: 'Water', measure: '' },
    ] });
    assert.equal(draft.ingredients.length, 3);
    assert.equal(draft.ingredients[0].source_measure, '175g/6oz');
    assert.equal(draft.ingredients[0].notes, '/6oz');
    assert.equal(draft.ingredients[1].quantity, null);
    assert.equal(draft.ingredients[2].quantity, null);
    assert.equal(draft.servings, null);
    assert.equal(draft.cook_time_minutes, null);
  });
});

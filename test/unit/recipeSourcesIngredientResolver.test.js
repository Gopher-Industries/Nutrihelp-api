/**
 * Unit tests for the external-ingredient resolver's matching rules.
 * These cover the pure helpers; the Supabase-backed resolveIngredients is
 * exercised by the integration path.
 */
const assert = require('assert');
const { normalizeName, singularize } = require('../../services/recipeSources/ingredientResolver');

describe('normalizeName', () => {
  it('lowercases and strips punctuation', () => {
    assert.strictEqual(normalizeName('Parmigiano-Reggiano'), 'parmigiano reggiano');
  });

  it('collapses whitespace', () => {
    assert.strictEqual(normalizeName('  chopped   tomatoes '), 'chopped tomatoes');
  });

  it('returns an empty string for non-strings', () => {
    assert.strictEqual(normalizeName(null), '');
    assert.strictEqual(normalizeName(undefined), '');
  });
});

describe('singularize', () => {
  it('folds simple plurals', () => {
    assert.strictEqual(singularize('mushrooms'), 'mushroom');
    assert.strictEqual(singularize('carrots'), 'carrot');
  });

  it('folds -ies plurals', () => {
    assert.strictEqual(singularize('berries'), 'berry');
  });

  it('folds -es plurals', () => {
    assert.strictEqual(singularize('tomatoes'), 'tomato');
  });

  it('leaves -ss words alone', () => {
    assert.strictEqual(singularize('watercress'), 'watercress');
  });

  it('leaves short words alone', () => {
    assert.strictEqual(singularize('gas'), 'gas');
  });
});

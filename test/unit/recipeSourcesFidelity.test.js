/**
 * Unit tests for the mapper's fidelity guardrail. Pure functions, no I/O.
 */
const assert = require('assert');
const { normalizeText, checkFidelity } = require('../../services/recipeSources/fidelity');

const SOURCE = {
  ingredients: [
    { name: 'penne rigate', measure: '1 pound' },
    { name: 'olive oil', measure: '1/4 cup' },
    { name: 'garlic', measure: '3 cloves' },
  ],
  instructions:
    'Bring a large pot of salted water to a boil. Add the penne and cook until al dente. '
    + 'Heat the olive oil in a pan and saute the garlic until fragrant. Toss the pasta through the sauce and serve.',
};

describe('normalizeText', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    assert.strictEqual(normalizeText('  Penne,  RIGATE!  '), 'penne rigate');
  });

  it('returns an empty string for non-string input', () => {
    assert.strictEqual(normalizeText(null), '');
    assert.strictEqual(normalizeText(undefined), '');
    assert.strictEqual(normalizeText(42), '');
  });
});

describe('checkFidelity', () => {
  it('accepts a draft whose content all traces back to the source', () => {
    const draft = {
      ingredients: [
        { name: 'penne rigate', quantity: 1, unit: 'pound' },
        { name: 'olive oil', quantity: 0.25, unit: 'cup' },
      ],
      instructions: [
        'Bring a large pot of salted water to a boil',
        'Add the penne and cook until al dente',
        'Serve',
      ],
    };

    const result = checkFidelity(draft, SOURCE);

    assert.strictEqual(result.ok, true, `unexpected violations: ${result.violations.join('; ')}`);
    assert.deepStrictEqual(result.violations, []);
  });

  it('rejects an ingredient that never appears in the source', () => {
    const draft = {
      ingredients: [{ name: 'penne rigate' }, { name: 'truffle oil' }],
      instructions: ['Bring a large pot of salted water to a boil'],
    };

    const result = checkFidelity(draft, SOURCE);

    assert.strictEqual(result.ok, false);
    assert.ok(
      result.violations.some((v) => v.includes('truffle oil')),
      `expected a violation naming truffle oil, got: ${result.violations.join('; ')}`
    );
  });

  it('rejects an instruction step invented wholesale', () => {
    const draft = {
      ingredients: [{ name: 'penne rigate' }],
      instructions: ['Marinate the chicken overnight in yoghurt and warm spices'],
    };

    const result = checkFidelity(draft, SOURCE);

    assert.strictEqual(result.ok, false);
    assert.ok(result.violations.some((v) => v.toLowerCase().includes('instruction')));
  });

  it('allows short connective steps that cannot be meaningfully compared', () => {
    const draft = {
      ingredients: [{ name: 'garlic' }],
      instructions: ['Serve hot'],
    };

    assert.strictEqual(checkFidelity(draft, SOURCE).ok, true);
  });

  it('treats a draft with no ingredients and no instructions as passing', () => {
    assert.strictEqual(checkFidelity({ ingredients: [], instructions: [] }, SOURCE).ok, true);
  });
});

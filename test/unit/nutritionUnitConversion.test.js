/**
 * Unit tests for turning a recipe quantity and unit into grams.
 *
 * The recipe save calculation multiplies per-100 g nutrient values by a gram
 * weight, so "2 cloves" or "1/4 cup" must become grams first. Portion fixtures
 * are real USDA `foodPortions` entries. Pure functions, no I/O.
 */
const assert = require('assert');
const {
  normalizeUnit,
  extractPortions,
  toGrams,
} = require('../../services/nutritionSources/unitConversion');

// "Garlic, raw" (SR Legacy 169230)
const GARLIC_PORTIONS = [
  { amount: 1, modifier: 'tsp', gramWeight: 2.8 },
  { amount: 1, modifier: 'clove', gramWeight: 3 },
  { amount: 3, modifier: 'cloves', gramWeight: 9 },
  { amount: 1, modifier: 'cup', gramWeight: 136 },
];

// "Oil, olive, extra virgin" (Foundation 748608)
const OLIVE_OIL_PORTIONS = [
  { amount: 100, gramWeight: 90.7, modifier: '', measureUnit: { name: 'milliliter', abbreviation: 'ml' } },
];

// "Egg, whole, raw, fresh" (SR Legacy 171287)
const EGG_PORTIONS = [
  { amount: 1, modifier: 'large', gramWeight: 50 },
  { amount: 1, modifier: 'medium', gramWeight: 44 },
  { amount: 1, modifier: 'small', gramWeight: 38 },
  { amount: 1, modifier: 'cup (4.86 large eggs)', gramWeight: 243 },
];

// "Onions, raw" (SR Legacy 170000)
const ONION_PORTIONS = [
  { amount: 1, modifier: 'cup, chopped', gramWeight: 160 },
  { amount: 1, modifier: 'tbsp chopped', gramWeight: 10 },
  { amount: 1, modifier: 'medium (2-1/2" dia)', gramWeight: 110 },
  { amount: 1, modifier: 'slice, thin', gramWeight: 9 },
];

describe('nutritionSources/unitConversion', () => {
  describe('normalizeUnit', () => {
    it('folds the spellings the measure parser emits onto one canonical unit', () => {
      const cases = {
        Tablespoons: 'tbsp', tbls: 'tbsp', tbs: 'tbsp', TBSP: 'tbsp',
        teaspoon: 'tsp', Cups: 'cup', grams: 'g', kilogram: 'kg',
        pound: 'lb', lbs: 'lb', ounces: 'oz', 'fl oz': 'floz',
        millilitres: 'ml', liter: 'l', cloves: 'clove', leaves: 'leaf',
        tin: 'can', cans: 'can', pcs: 'piece', pieces: 'piece',
      };
      for (const [input, expected] of Object.entries(cases)) {
        assert.strictEqual(normalizeUnit(input), expected, input);
      }
    });

    it('returns null for an empty unit', () => {
      assert.strictEqual(normalizeUnit(null), null);
      assert.strictEqual(normalizeUnit('  '), null);
    });
  });

  describe('extractPortions', () => {
    it('reduces a multi-unit household portion to the weight of one unit', () => {
      const cloves = extractPortions(GARLIC_PORTIONS).filter((portion) => portion.unit === 'clove');

      assert.ok(cloves.length >= 1);
      assert.ok(cloves.every((portion) => portion.grams === 3));
    });

    it('reads the unit from a described modifier such as "cup, chopped"', () => {
      const cup = extractPortions(ONION_PORTIONS).find((portion) => portion.unit === 'cup');

      assert.strictEqual(cup.grams, 160);
    });

    it('reads Foundation portions, which carry the unit in measureUnit', () => {
      assert.deepStrictEqual(extractPortions(OLIVE_OIL_PORTIONS), [
        { unit: 'ml', size: null, grams: 0.907, label: 'ml' },
      ]);
    });

    it('records a size word as a size, not a unit', () => {
      const large = extractPortions(EGG_PORTIONS).find((portion) => portion.size === 'large');

      assert.strictEqual(large.unit, null);
      assert.strictEqual(large.grams, 50);
    });

    it('drops portions with no usable weight or amount', () => {
      const messy = [
        { amount: 0, modifier: 'cup', gramWeight: 100 },
        { amount: 1, modifier: 'cup', gramWeight: 0 },
        { amount: 1, modifier: 'cup' },
        null,
      ];

      assert.deepStrictEqual(extractPortions(messy), []);
      assert.deepStrictEqual(extractPortions(undefined), []);
    });
  });

  describe('toGrams', () => {
    it('converts mass units without needing any portion data', () => {
      assert.deepStrictEqual(toGrams({ quantity: 400, unit: 'g' }), { grams: 400, source: 'mass' });
      assert.deepStrictEqual(toGrams({ quantity: 1, unit: 'pound' }), { grams: 453.59, source: 'mass' });
      assert.deepStrictEqual(toGrams({ quantity: 2, unit: 'oz' }), { grams: 56.7, source: 'mass' });
      assert.deepStrictEqual(toGrams({ quantity: 0.5, unit: 'kg' }), { grams: 500, source: 'mass' });
    });

    it("uses the food's own portion when USDA lists that unit", () => {
      assert.deepStrictEqual(toGrams({ quantity: 2, unit: 'cloves' }, GARLIC_PORTIONS), {
        grams: 6,
        source: 'usda_portion',
      });
    });

    it("derives other volumes from the food's density when the exact unit is missing", () => {
      // Garlic lists tsp (2.8 g / 5 ml) but no tbsp: 15 ml at 0.56 g/ml.
      assert.deepStrictEqual(toGrams({ quantity: 1, unit: 'tbsp' }, GARLIC_PORTIONS), {
        grams: 8.4,
        source: 'usda_density',
      });
    });

    it('converts a fraction of a cup of oil through its millilitre weight', () => {
      // 0.25 cup = 60 ml at 0.907 g/ml
      assert.deepStrictEqual(toGrams({ quantity: 0.25, unit: 'cup' }, OLIVE_OIL_PORTIONS), {
        grams: 54.42,
        source: 'usda_density',
      });
    });

    it('sizes a counted ingredient from the size word in its notes', () => {
      assert.deepStrictEqual(toGrams({ quantity: 2, unit: null, notes: 'large eggs' }, EGG_PORTIONS), {
        grams: 100,
        source: 'usda_portion',
      });
    });

    it('assumes a medium item when a counted ingredient gives no size', () => {
      assert.deepStrictEqual(toGrams({ quantity: 1, unit: null, notes: 'chopped' }, ONION_PORTIONS), {
        grams: 110,
        source: 'usda_portion',
      });
      assert.deepStrictEqual(toGrams({ quantity: 3, unit: 'pieces' }, EGG_PORTIONS), {
        grams: 132,
        source: 'usda_portion',
      });
    });

    it('counts a pinch, a dash or "to taste" as nothing', () => {
      assert.deepStrictEqual(toGrams({ quantity: 1, unit: 'pinch' }), { grams: 0, source: 'negligible' });
      assert.deepStrictEqual(toGrams({ quantity: null, unit: null, notes: 'to taste' }), {
        grams: 0,
        source: 'negligible',
      });
      assert.deepStrictEqual(toGrams({ quantity: null, unit: null, notes: 'Sprinkling' }), {
        grams: 0,
        source: 'negligible',
      });
    });

    it('returns null rather than guessing when nothing applies', () => {
      const unknown = { grams: null, source: null };

      assert.deepStrictEqual(toGrams({ quantity: 1, unit: 'bunch' }, GARLIC_PORTIONS), unknown);
      assert.deepStrictEqual(toGrams({ quantity: 1, unit: 'cup' }, []), unknown);
      assert.deepStrictEqual(toGrams({ quantity: null, unit: null, notes: 'for frying' }), unknown);
      assert.deepStrictEqual(toGrams({ quantity: 2, unit: null }, []), unknown);
    });

    it('rejects a quantity that is not a positive number', () => {
      const unknown = { grams: null, source: null };

      for (const quantity of [0, -1, NaN, 'abc']) {
        assert.deepStrictEqual(toGrams({ quantity, unit: 'g' }), unknown, String(quantity));
      }
    });
  });
});

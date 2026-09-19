/**
 * Unit tests for the USDA nutrient mapper.
 *
 * The mapper turns USDA FoodData Central nutrient lists into the column units
 * of the shared `ingredients` table (everything per 100 g; sodium and vitamins
 * in grams). Fixtures are trimmed copies of real API responses. No I/O.
 */
const assert = require('assert');
const {
  mapNutrients,
  hasCoreNutrients,
  NUTRIENT_COLUMNS,
} = require('../../services/nutritionSources/nutrientMapper');

// "Garlic, raw" (fdcId 169230), search-result shape.
const GARLIC_SEARCH_SHAPE = [
  { nutrientId: 1008, nutrientName: 'Energy', value: 149, unitName: 'KCAL' },
  { nutrientId: 1003, nutrientName: 'Protein', value: 6.36, unitName: 'G' },
  { nutrientId: 1004, nutrientName: 'Total lipid (fat)', value: 0.5, unitName: 'G' },
  { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', value: 33.06, unitName: 'G' },
  { nutrientId: 1079, nutrientName: 'Fiber, total dietary', value: 2.1, unitName: 'G' },
  { nutrientId: 2000, nutrientName: 'Total Sugars', value: 1, unitName: 'G' },
  { nutrientId: 1093, nutrientName: 'Sodium, Na', value: 17, unitName: 'MG' },
  { nutrientId: 1162, nutrientName: 'Vitamin C, total ascorbic acid', value: 31.2, unitName: 'MG' },
  { nutrientId: 1106, nutrientName: 'Vitamin A, RAE', value: 0, unitName: 'UG' },
  { nutrientId: 1114, nutrientName: 'Vitamin D (D2 + D3)', value: 0, unitName: 'UG' },
  { nutrientId: 1178, nutrientName: 'Vitamin B-12', value: 0, unitName: 'UG' },
];

// The same food in the detail shape returned by GET /food/{fdcId}.
const GARLIC_DETAIL_SHAPE = GARLIC_SEARCH_SHAPE.map((n) => ({
  nutrient: { id: n.nutrientId, name: n.nutrientName, unitName: n.unitName.toLowerCase() },
  amount: n.value,
}));

describe('nutritionSources/nutrientMapper', () => {
  describe('mapNutrients', () => {
    it('maps the search-result shape onto the table columns per 100 g', () => {
      const mapped = mapNutrients(GARLIC_SEARCH_SHAPE);

      assert.strictEqual(mapped.calories, 149);
      assert.strictEqual(mapped.protein, 6.36);
      assert.strictEqual(mapped.fat, 0.5);
      assert.strictEqual(mapped.carbohydrates, 33.06);
      assert.strictEqual(mapped.fiber, 2.1);
      assert.strictEqual(mapped.sugar, 1);
    });

    it('converts sodium from milligrams to the grams the table stores', () => {
      assert.strictEqual(mapNutrients(GARLIC_SEARCH_SHAPE).sodium, 0.017);
    });

    it('converts vitamin C from milligrams to grams', () => {
      assert.strictEqual(mapNutrients(GARLIC_SEARCH_SHAPE).vitamin_c, 0.0312);
    });

    it('converts microgram vitamins to grams', () => {
      const butterLike = [
        { nutrientId: 1106, value: 684, unitName: 'UG' },
        { nutrientId: 1114, value: 1.5, unitName: 'UG' },
        { nutrientId: 1178, value: 0.17, unitName: 'UG' },
      ];
      const mapped = mapNutrients(butterLike);

      assert.strictEqual(mapped.vitamin_a, 0.000684);
      assert.strictEqual(mapped.vitamin_d, 0.0000015);
      assert.strictEqual(mapped.vitamin_b, 0.00000017);
    });

    it('maps the food-detail shape to the same result as the search shape', () => {
      assert.deepStrictEqual(mapNutrients(GARLIC_DETAIL_SHAPE), mapNutrients(GARLIC_SEARCH_SHAPE));
    });

    it('returns every table column, with null where USDA has no figure', () => {
      const mapped = mapNutrients([{ nutrientId: 1008, value: 52, unitName: 'KCAL' }]);

      assert.deepStrictEqual(Object.keys(mapped).sort(), [...NUTRIENT_COLUMNS].sort());
      assert.strictEqual(mapped.calories, 52);
      assert.strictEqual(mapped.protein, null);
      assert.strictEqual(mapped.sodium, null);
    });

    it('keeps a reported zero as zero rather than treating it as missing', () => {
      assert.strictEqual(mapNutrients(GARLIC_SEARCH_SHAPE).vitamin_d, 0);
    });

    it('falls back to Atwater energy when the plain energy figure is absent', () => {
      const foundationLike = [
        { nutrientId: 2047, nutrientName: 'Energy (Atwater General Factors)', value: 61, unitName: 'KCAL' },
        { nutrientId: 2048, nutrientName: 'Energy (Atwater Specific Factors)', value: 60, unitName: 'KCAL' },
      ];

      assert.strictEqual(mapNutrients(foundationLike).calories, 61);
    });

    it('ignores the kilojoule energy row, which shares the word "Energy"', () => {
      const withKilojoules = [
        { nutrientId: 1062, nutrientName: 'Energy', value: 623, unitName: 'kJ' },
        { nutrientId: 1008, nutrientName: 'Energy', value: 149, unitName: 'KCAL' },
      ];

      assert.strictEqual(mapNutrients(withKilojoules).calories, 149);
    });

    it('falls back to the older sugars id when total sugars is absent', () => {
      assert.strictEqual(mapNutrients([{ nutrientId: 1063, value: 4.2, unitName: 'G' }]).sugar, 4.2);
    });

    it('returns all-null columns for empty or malformed input', () => {
      for (const input of [undefined, null, [], [null, {}, { nutrientId: 1008 }]]) {
        const mapped = mapNutrients(input);
        assert.ok(Object.values(mapped).every((value) => value === null));
      }
    });
  });

  describe('hasCoreNutrients', () => {
    it('accepts a record with energy and the three macros', () => {
      assert.strictEqual(hasCoreNutrients(mapNutrients(GARLIC_SEARCH_SHAPE)), true);
    });

    it('rejects a record with no energy, like some Foundation oils', () => {
      const fattyAcidsOnly = [{ nutrientId: 1004, value: 100, unitName: 'G' }];

      assert.strictEqual(hasCoreNutrients(mapNutrients(fattyAcidsOnly)), false);
    });
  });
});

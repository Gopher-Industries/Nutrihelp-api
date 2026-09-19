/**
 * Maps USDA FoodData Central nutrient lists onto the nutrient columns of the
 * shared `ingredients` table.
 *
 * The table stores everything per 100 g, which is also USDA's basis, so no
 * rescaling is needed. Units differ though: the table holds sodium and the
 * vitamins in GRAMS (Butter's vitamin A is stored as 0.000684), while USDA
 * reports them in mg and µg. See technical_docs/usda-nutrition-design.md §4.
 *
 * A column is null when USDA has no figure. It is never zero-filled: a missing
 * value and a measured zero mean different things downstream.
 */

// Column -> USDA nutrient ids in order of preference, and the factor that
// converts the USDA unit into the table's unit.
const COLUMN_SOURCES = {
  // 1008 is plain energy in kcal. Foundation foods often carry only the
  // Atwater figures (2047 general, 2048 specific). 1062 is kJ and is never used.
  calories: { ids: [1008, 2047, 2048], factor: 1 },
  protein: { ids: [1003], factor: 1 },
  fat: { ids: [1004], factor: 1 },
  carbohydrates: { ids: [1005], factor: 1 },
  fiber: { ids: [1079], factor: 1 },
  sugar: { ids: [2000, 1063], factor: 1 },
  sodium: { ids: [1093], factor: 0.001 }, // mg -> g
  vitamin_a: { ids: [1106], factor: 0.000001 }, // µg RAE -> g
  // The column does not say which B vitamin. Existing rows for Milk and Butter
  // match B-12, so B-12 it is; the design doc records the ambiguity.
  vitamin_b: { ids: [1178], factor: 0.000001 }, // µg -> g
  vitamin_c: { ids: [1162], factor: 0.001 }, // mg -> g
  vitamin_d: { ids: [1114], factor: 0.000001 }, // µg -> g
};

const NUTRIENT_COLUMNS = Object.freeze(Object.keys(COLUMN_SOURCES));
const CORE_COLUMNS = ['calories', 'protein', 'fat', 'carbohydrates'];

/**
 * USDA uses two shapes for the same thing:
 *   search results: { nutrientId, value }
 *   food details:   { nutrient: { id }, amount }
 */
function readEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const id = Number(entry.nutrientId ?? entry.nutrient?.id);
  const raw = entry.value ?? entry.amount;
  if (raw === null || raw === undefined || raw === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(id) || !Number.isFinite(value)) return null;
  return { id, value };
}

// Multiplying by 0.001 leaves binary noise (17 * 0.001 = 0.017000000000000001).
function tidy(value) {
  return Number(value.toPrecision(10));
}

/**
 * @param {Array<object>} foodNutrients USDA nutrient entries, either shape
 * @returns {Record<string, number|null>} one key per nutrient column
 */
function mapNutrients(foodNutrients) {
  const byId = new Map();
  for (const entry of Array.isArray(foodNutrients) ? foodNutrients : []) {
    const parsed = readEntry(entry);
    if (parsed && !byId.has(parsed.id)) byId.set(parsed.id, parsed.value);
  }

  const mapped = {};
  for (const [column, { ids, factor }] of Object.entries(COLUMN_SOURCES)) {
    const id = ids.find((candidate) => byId.has(candidate));
    mapped[column] = id === undefined ? null : tidy(byId.get(id) * factor);
  }
  return mapped;
}

/**
 * Some Foundation records hold only a fatty-acid profile. Without energy and
 * the macros a record cannot describe an ingredient, so it is not usable.
 */
function hasCoreNutrients(mapped) {
  return CORE_COLUMNS.every((column) => Number.isFinite(mapped?.[column]));
}

module.exports = { mapNutrients, hasCoreNutrients, NUTRIENT_COLUMNS };

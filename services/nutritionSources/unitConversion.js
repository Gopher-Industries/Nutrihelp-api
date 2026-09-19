/**
 * Converts a recipe quantity and unit into grams.
 *
 * The recipe save calculation multiplies per-100 g nutrient values by a gram
 * weight, so it can only total an ingredient whose amount is known in grams.
 * Tiers, first hit wins (see technical_docs/usda-nutrition-design.md §5):
 *
 *   mass          g, kg, mg, oz, lb
 *   usda_portion  the food's own USDA portion for that unit or size
 *   usda_density  any USDA volume portion gives a density for every volume unit
 *   negligible    pinch, dash, "to taste": counted as 0 g
 *
 * When nothing applies the answer is null, never a guess.
 */

const MASS_IN_GRAMS = { g: 1, kg: 1000, mg: 0.001, oz: 28.349523125, lb: 453.59237 };

// US nutrition-labelling rounding (21 CFR 101.9): tsp 5 ml, tbsp 15 ml, cup 240 ml, fl oz 30 ml.
const VOLUME_IN_ML = { ml: 1, l: 1000, tsp: 5, tbsp: 15, cup: 240, floz: 30 };

const NEGLIGIBLE_UNITS = new Set(['pinch', 'dash']);
const NEGLIGIBLE_NOTES = /\b(to taste|sprinkl\w*|pinch|dash|garnish)\b/i;
const SIZE_WORDS = /\b(extra large|large|medium|small)\b/i;
const DEFAULT_SIZE = 'medium';

const UNIT_ALIASES = {
  g: ['g', 'gram', 'grams', 'gm', 'gms'],
  kg: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilo', 'kilos'],
  mg: ['mg', 'milligram', 'milligrams'],
  oz: ['oz', 'ounce', 'ounces'],
  lb: ['lb', 'lbs', 'pound', 'pounds'],
  ml: ['ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters'],
  l: ['l', 'litre', 'litres', 'liter', 'liters'],
  tsp: ['tsp', 'tsps', 'teaspoon', 'teaspoons'],
  tbsp: ['tbsp', 'tbsps', 'tbs', 'tbls', 'tablespoon', 'tablespoons'],
  cup: ['cup', 'cups'],
  floz: ['fl oz', 'floz', 'fluid ounce', 'fluid ounces'],
  clove: ['clove', 'cloves'],
  leaf: ['leaf', 'leaves'],
  piece: ['piece', 'pieces', 'pc', 'pcs'],
  can: ['can', 'cans', 'tin', 'tins'],
  sprig: ['sprig', 'sprigs'],
  bunch: ['bunch', 'bunches'],
  slice: ['slice', 'slices'],
  stick: ['stick', 'sticks'],
  pinch: ['pinch', 'pinches'],
  dash: ['dash', 'dashes'],
};

const CANONICAL_BY_ALIAS = new Map();
for (const [canonical, aliases] of Object.entries(UNIT_ALIASES)) {
  for (const alias of aliases) CANONICAL_BY_ALIAS.set(alias, canonical);
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function clean(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @returns {string|null} canonical unit, or the cleaned text for a unit we do not know
 */
function normalizeUnit(unit) {
  const text = clean(unit);
  if (!text) return null;
  return CANONICAL_BY_ALIAS.get(text) || text;
}

/**
 * USDA portions come in two shapes:
 *   SR Legacy:  { amount: 3, modifier: 'cloves', gramWeight: 9 }
 *   Foundation: { amount: 100, measureUnit: { abbreviation: 'ml' }, gramWeight: 90.7 }
 * Both reduce to the weight of ONE unit. A modifier such as "large" is a size,
 * not a unit; "cup, chopped" is the unit cup.
 *
 * @returns {Array<{unit: string|null, size: string|null, grams: number, label: string}>}
 */
function extractPortions(foodPortions) {
  const portions = [];
  for (const entry of Array.isArray(foodPortions) ? foodPortions : []) {
    const amount = Number(entry?.amount);
    const gramWeight = Number(entry?.gramWeight);
    if (!(amount > 0) || !(gramWeight > 0)) continue;

    const measure = entry.measureUnit?.abbreviation || entry.measureUnit?.name;
    const label = String(
      measure && measure !== 'undetermined' ? measure : entry.modifier || ''
    ).trim();
    const text = clean(label);
    if (!text) continue;

    const sizeMatch = text.match(new RegExp(`^${SIZE_WORDS.source}`, 'i'));
    let unit = null;
    if (!sizeMatch) {
      const leading = text.startsWith('fl oz') ? 'fl oz' : text.split(/[^a-z]+/)[0];
      unit = normalizeUnit(leading);
    }

    portions.push({
      unit,
      size: sizeMatch ? sizeMatch[1].toLowerCase() : null,
      grams: round(gramWeight / amount, 4),
      label,
    });
  }
  return portions;
}

// The plainest label wins: "cup" describes the ingredient better than "cup, chopped".
function plainest(portions) {
  return portions.slice().sort((a, b) => a.label.length - b.label.length)[0];
}

function fromDensity(quantity, unit, portions) {
  const volumes = portions.filter((portion) => VOLUME_IN_ML[portion.unit]);
  if (!volumes.length) return null;

  // Density from the nearest-sized portion: a teaspoon packs differently to a cup.
  const wanted = VOLUME_IN_ML[unit];
  const nearest = volumes
    .slice()
    .sort(
      (a, b) =>
        Math.abs(Math.log(VOLUME_IN_ML[a.unit] / wanted)) -
        Math.abs(Math.log(VOLUME_IN_ML[b.unit] / wanted))
    )[0];
  const gramsPerMl = nearest.grams / VOLUME_IN_ML[nearest.unit];
  return quantity * wanted * gramsPerMl;
}

function fromCount(quantity, notes, portions) {
  const sized = portions.filter((portion) => portion.size);
  if (!sized.length) return null;

  const asked = String(notes || '').match(SIZE_WORDS);
  const size = asked ? asked[1].toLowerCase() : DEFAULT_SIZE;
  const match =
    sized.find((portion) => portion.size === size) ||
    sized.find((portion) => portion.size === DEFAULT_SIZE);
  return match ? quantity * match.grams : null;
}

const UNKNOWN = Object.freeze({ grams: null, source: null });

/**
 * @param {{quantity: number|null, unit?: string|null, notes?: string|null}} measure
 * @param {Array<object>} [foodPortions] raw USDA `foodPortions` of the matched food
 * @returns {{grams: number|null, source: 'mass'|'usda_portion'|'usda_density'|'negligible'|null}}
 */
function toGrams({ quantity, unit, notes } = {}, foodPortions = []) {
  const canonical = normalizeUnit(unit);
  const hasQuantity = quantity !== null && quantity !== undefined && quantity !== '';

  if (
    NEGLIGIBLE_UNITS.has(canonical) ||
    (!hasQuantity && NEGLIGIBLE_NOTES.test(String(notes || '')))
  ) {
    return { grams: 0, source: 'negligible' };
  }

  const amount = Number(quantity);
  if (!(amount > 0)) return { ...UNKNOWN };

  if (MASS_IN_GRAMS[canonical]) {
    return { grams: round(amount * MASS_IN_GRAMS[canonical], 2), source: 'mass' };
  }

  const portions = extractPortions(foodPortions);

  if (canonical && canonical !== 'piece') {
    const exact = portions.filter((portion) => portion.unit === canonical);
    if (exact.length)
      return { grams: round(amount * plainest(exact).grams, 2), source: 'usda_portion' };

    if (VOLUME_IN_ML[canonical]) {
      const grams = fromDensity(amount, canonical, portions);
      if (grams !== null) return { grams: round(grams, 2), source: 'usda_density' };
    }
    return { ...UNKNOWN };
  }

  const counted = fromCount(amount, notes, portions);
  return counted === null ? { ...UNKNOWN } : { grams: round(counted, 2), source: 'usda_portion' };
}

module.exports = { normalizeUnit, extractPortions, toGrams, MASS_IN_GRAMS, VOLUME_IN_ML };

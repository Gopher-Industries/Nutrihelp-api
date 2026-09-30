/**
 * Last-resort weight estimate for measures USDA portion data cannot weigh,
 * such as "1 tin" of tomatoes or "1 bunch" of parsley.
 *
 * This is the one place in nutritionSources where a model supplies a number, so
 * it is fenced in three ways:
 *   - it only ever answers "what does ONE unit weigh"; the quantity is applied
 *     here, and nutrient values still come from USDA;
 *   - every answer must fall inside a plausibility range for its unit;
 *   - the result is labelled `llm_estimate`, and that label travels with the
 *     weight into the saved recipe so the UI can say the total is an estimate.
 *
 * It never throws. An unusable answer is an unknown weight, exactly as before.
 */
const { normalizeUnit, VOLUME_IN_ML } = require('./unitConversion');
const logger = require('../../utils/logger');

// Grams per millilitre. Dried herbs sit near 0.1, honey and syrups near 1.4.
const DENSITY_RANGE = [0.05, 2.5];

// Plausible grams for ONE of each counted unit.
const COUNT_RANGES = {
  can: [50, 3000],
  leaf: [0.02, 60],
  sprig: [0.2, 40],
  bunch: [5, 1500],
  slice: [1, 600],
  stick: [2, 600],
  clove: [0.5, 30],
};
const WHOLE_ITEM_RANGE = [0.2, 5000];

const UNKNOWN = Object.freeze({ grams: null, source: null });

function rangeFor(unit) {
  const canonical = normalizeUnit(unit);
  if (VOLUME_IN_ML[canonical]) {
    return DENSITY_RANGE.map((density) => density * VOLUME_IN_ML[canonical]);
  }
  return COUNT_RANGES[canonical] || WHOLE_ITEM_RANGE;
}

function describe(item, index) {
  const unit = String(item.unit || '').trim() || 'whole item';
  const notes = String(item.notes || '').trim();
  return `${index}: one ${unit} of ${item.name}${notes ? ` (${notes})` : ''}`;
}

/**
 * @param {Array<{name: string, quantity: number|null, unit?: string|null, notes?: string|null}>} items
 * @param {(prompt: string) => Promise<string>} generate
 * @returns {Promise<Array<{grams: number|null, source: 'llm_estimate'|null}>>} aligned with items
 */
async function estimateWeights(items = [], generate = null) {
  const results = items.map(() => ({ ...UNKNOWN }));
  const asked = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Number(item?.quantity) > 0 && String(item?.name || '').trim());
  if (!generate || !asked.length) return results;

  const prompt = `You estimate typical retail and kitchen weights for recipe ingredients.
For each line, give the weight in grams of ONE of the stated unit of that ingredient, as a home cook would buy or measure it. A "tin" or "can" means the usual retail size for that food. Give the edible contents, not the packaging.
If you cannot give a sensible typical weight, answer null for that line.

${asked.map(({ item, index }) => describe(item, index)).join('\n')}

Return strict JSON only, no markdown: [{"index": number, "grams_per_unit": number or null}]`;

  let parsed;
  try {
    const raw = await generate(prompt);
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end <= start) return results;
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch (error) {
    logger.warn('[nutritionSources][estimate] weight estimate skipped', { error: error.message });
    return results;
  }

  const askedByIndex = new Map(asked.map(({ item, index }) => [index, item]));
  for (const entry of Array.isArray(parsed) ? parsed : []) {
    const item = askedByIndex.get(entry?.index);
    const perUnit = entry?.grams_per_unit;
    if (!item || typeof perUnit !== 'number' || !Number.isFinite(perUnit)) continue;

    const [min, max] = rangeFor(item.unit);
    if (perUnit < min || perUnit > max) {
      logger.warn('[nutritionSources][estimate] implausible weight rejected', {
        name: item.name,
        unit: item.unit,
        perUnit,
      });
      continue;
    }

    results[entry.index] = {
      grams: Math.round(perUnit * Number(item.quantity) * 100) / 100,
      source: 'llm_estimate',
    };
  }
  return results;
}

module.exports = { estimateWeights };

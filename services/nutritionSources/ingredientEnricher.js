/**
 * Save-time nutrition enrichment for resolved recipe ingredients.
 *
 * Runs after recipeSources/ingredientResolver, which answers "which row is this
 * ingredient". This step answers the two questions the recipe save calculation
 * then depends on:
 *
 *   1. How many grams is "2 cloves" or "1/4 cup"?   -> grams, grams_source
 *   2. Does the row have nutrient values at all?     -> filled from USDA if not
 *
 * Writes go to the SHARED ingredients table, so they are narrow by design:
 * only when the caller sets `fillMissing` (save time, never preview), only into
 * a row where EVERY nutrient column is null, only from a confident USDA match,
 * and guarded in SQL so a concurrent fill is never overwritten. Existing values
 * are never changed. See technical_docs/usda-nutrition-design.md §7.
 *
 * It never throws for a USDA or database problem: a recipe must still save.
 */
const { supabaseService } = require('../supabaseClient');
const { lookupIngredient } = require('./index');
const { toGrams } = require('./unitConversion');
const { NUTRIENT_COLUMNS } = require('./nutrientMapper');
const logger = require('../../utils/logger');

const INGREDIENTS_TABLE = 'ingredients';
const LOOKUP_CONCURRENCY = 5;
// A low-confidence match is a guess between similar foods. Good enough to weigh
// a cup of it, not good enough to write into a table everyone shares.
const WRITABLE_CONFIDENCE = new Set(['high', 'llm']);

function hasId(item) {
  return item?.id !== null && item?.id !== undefined;
}

function lookupName(item) {
  // The nutrients describe the table row, so look up the row's own name.
  return String(item.matchedName || item.name || '').trim();
}

function isEmptyRow(row) {
  return Boolean(row) && NUTRIENT_COLUMNS.every((column) => row[column] === null || row[column] === undefined);
}

async function readCurrentNutrition(ids) {
  const current = new Map();
  if (!ids.length) return current;

  const { data, error } = await supabaseService
    .from(INGREDIENTS_TABLE)
    .select(['id', ...NUTRIENT_COLUMNS].join(','))
    .in('id', ids);

  if (error) {
    // Without the current values we cannot prove a row is empty, so nothing is written.
    logger.warn('[nutritionSources][enrich] could not read current nutrition', { error: error.message });
    return current;
  }
  for (const row of data || []) current.set(Number(row.id), row);
  return current;
}

async function runLookups(names, generate) {
  const results = new Map();
  const queue = [...names];

  async function worker() {
    while (queue.length) {
      const name = queue.shift();
      try {
        results.set(name, await lookupIngredient(name, { generate }));
      } catch (error) {
        logger.warn('[nutritionSources][enrich] lookup failed', { name, error: error.message });
        results.set(name, { status: 'unavailable', reason: 'error' });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(LOOKUP_CONCURRENCY, queue.length) }, worker));
  return results;
}

async function fillRow(id, nutrients) {
  const measured = Object.fromEntries(
    Object.entries(nutrients).filter(([, value]) => value !== null && value !== undefined)
  );
  if (!Object.keys(measured).length) return false;

  const { data, error } = await supabaseService
    .from(INGREDIENTS_TABLE)
    .update(measured)
    .eq('id', id)
    .is('calories', null) // never overwrite: a row filled since we read it is left alone
    .select('id');

  if (error) {
    logger.warn('[nutritionSources][enrich] could not fill nutrition', { id, error: error.message });
    return false;
  }
  return Array.isArray(data) && data.length > 0;
}

/**
 * @param {Array<object>} resolved output of resolveIngredients, in order
 * @param {Array<{name: string, quantity?: number|null, unit?: string|null, notes?: string|null}>} measures
 *   the same ingredients the resolver was given; blank names are skipped exactly as it skips them
 * @param {{fillMissing?: boolean, generate?: Function}} [options]
 * @returns {Promise<Array<object>>} each resolved item plus
 *   grams, grams_source and nutrition: {status: 'existing'|'filled'|'missing'|'unavailable', source}
 */
async function enrichIngredients(resolved = [], measures = [], options = {}) {
  const { fillMissing = false, generate = null } = options;
  if (!resolved.length) return [];

  const named = (measures || []).filter((measure) => String(measure?.name || '').trim());
  const ids = [...new Set(resolved.filter(hasId).map((item) => Number(item.id)))];
  const current = await readCurrentNutrition(ids);

  // First pass, no I/O: weigh what needs no portion data and decide who needs USDA.
  const plans = resolved.map((item, index) => {
    const measure = named[index] || {};
    const row = hasId(item) ? current.get(Number(item.id)) : null;
    const empty = isEmptyRow(row);
    const weight = toGrams(measure);
    const needsPortions = weight.source === null;
    const needsFill = fillMissing && empty;
    return { item, measure, row, empty, weight, wantsLookup: hasId(item) && (needsPortions || needsFill) };
  });

  const names = [...new Set(plans.filter((plan) => plan.wantsLookup).map((plan) => lookupName(plan.item)))];
  const lookups = await runLookups(names.filter(Boolean), generate);

  const fills = new Map(); // id -> boolean, so a repeated ingredient is filled once
  const enriched = [];

  for (const plan of plans) {
    const { item, measure, row, empty } = plan;
    const lookup = plan.wantsLookup ? lookups.get(lookupName(item)) : null;
    const found = lookup?.status === 'found';

    const weight = plan.weight.source === null && found ? toGrams(measure, lookup.foodPortions) : plan.weight;

    let status = 'missing';
    let source = null;
    if (row && !empty) {
      status = 'existing';
    } else if (lookup?.status === 'unavailable') {
      status = 'unavailable';
    } else if (fillMissing && empty && found && WRITABLE_CONFIDENCE.has(lookup.confidence)) {
      const id = Number(item.id);
      if (!fills.has(id)) fills.set(id, await fillRow(id, lookup.nutrients));
      if (fills.get(id)) {
        status = 'filled';
        source = {
          provider: 'usda',
          fdcId: lookup.fdcId,
          description: lookup.description,
          confidence: lookup.confidence,
        };
        logger.info('[nutritionSources][enrich] filled nutrition from USDA', {
          id,
          name: lookupName(item),
          fdcId: lookup.fdcId,
        });
      }
    }

    enriched.push({
      ...item,
      grams: weight.grams,
      grams_source: weight.source,
      nutrition: { status, source },
    });
  }

  return enriched;
}

module.exports = { enrichIngredients };

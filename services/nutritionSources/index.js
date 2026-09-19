/**
 * Ingredient nutrition lookup: name in, USDA nutrients and portion weights out.
 *
 *   search USDA -> rank candidates -> (optional LLM tie-break) -> load portions
 *
 * Nutrient values only ever come from USDA. The LLM tier is a choice between
 * USDA records, validated against the candidate list in code; it cannot supply
 * a number. A lookup never throws: callers are on a save path, and a missing
 * nutrition figure must not stop a recipe from saving.
 *
 * Results are cached in memory for the life of the process, because ingredient
 * names repeat heavily and the public demo key allows about 10 requests an hour.
 */
const usdaClient = require('./usdaClient');
const { mapNutrients } = require('./nutrientMapper');
const { rankCandidates, pickCandidate } = require('./foodMatcher');
const logger = require('../../utils/logger');

const MAX_LLM_CANDIDATES = 8;
const NOT_FOUND = Object.freeze({ status: 'not_found' });

const cache = new Map();

function cacheKey(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Asks the LLM which candidate is the ingredient.
 * @returns {Promise<object|null|undefined>} the chosen candidate, null when the
 *   model says none fits, undefined when the answer cannot be used
 */
async function chooseWithLlm(name, ranked, generate) {
  const candidates = ranked.slice(0, MAX_LLM_CANDIDATES).map((entry) => entry.food);
  const prompt = `You match a recipe ingredient to a food record from the USDA FoodData Central database.
Pick the ONE record that is the same food as the ingredient, in the form a home cook would buy for a recipe. Prefer the raw, unprepared food unless the ingredient names a processed form.
Answer with an fdcId from the list below, or null if none of them is this ingredient. Never answer with an id that is not in the list.

Ingredient: ${name}

Records:
${candidates.map((food) => `${food.fdcId}: ${food.description}`).join('\n')}

Return strict JSON only, no markdown: {"fdcId": number or null}`;

  try {
    const raw = await generate(prompt);
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end <= start) return undefined;
    const answer = JSON.parse(raw.slice(start, end + 1));

    if (answer.fdcId === null) return null;
    // Trust nothing off-list: the id must be one we offered.
    return candidates.find((food) => Number(food.fdcId) === Number(answer.fdcId));
  } catch (error) {
    logger.warn('[nutritionSources] LLM tie-break skipped', { name, error: error.message });
    return undefined;
  }
}

async function loadPortions(fdcId) {
  try {
    const food = await usdaClient.getFood(fdcId);
    return food?.foodPortions || [];
  } catch (error) {
    // The nutrients are still good. Only unit conversion loses out.
    logger.warn('[nutritionSources] portions unavailable', { fdcId, error: error.message });
    return [];
  }
}

/**
 * @param {string} name ingredient name
 * @param {{generate?: (prompt: string) => Promise<string>}} [options]
 * @returns {Promise<
 *   {status: 'found', confidence: 'high'|'llm'|'low', fdcId, description, dataType, nutrients, foodPortions} |
 *   {status: 'not_found'} |
 *   {status: 'unavailable', reason: string}>}
 */
async function lookupIngredient(name, { generate = null } = {}) {
  const key = cacheKey(name);
  if (!key) return { ...NOT_FOUND };
  if (cache.has(key)) return cache.get(key);

  let foods;
  try {
    foods = await usdaClient.searchFoods(key);
  } catch (error) {
    logger.warn('[nutritionSources] USDA search failed', { name: key, reason: error.code });
    return { status: 'unavailable', reason: error.code || 'unavailable' };
  }

  let picked = pickCandidate(key, foods);
  if (picked && picked.confidence === 'low' && generate) {
    const chosen = await chooseWithLlm(key, rankCandidates(key, foods), generate);
    if (chosen === null) picked = null;
    else if (chosen) picked = { food: chosen, confidence: 'llm' };
  }

  if (!picked) {
    cache.set(key, { ...NOT_FOUND });
    return { ...NOT_FOUND };
  }

  const result = {
    status: 'found',
    confidence: picked.confidence,
    fdcId: picked.food.fdcId,
    description: picked.food.description,
    dataType: picked.food.dataType,
    nutrients: mapNutrients(picked.food.foodNutrients),
    foodPortions: await loadPortions(picked.food.fdcId),
  };
  cache.set(key, result);
  return result;
}

module.exports = { lookupIngredient };

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
const MAX_REWRITTEN_SEARCHES = 3;
const CANDIDATES_PER_REWRITE = 4;
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
async function chooseWithLlm(name, foods, generate) {
  const candidates = foods.slice(0, MAX_LLM_CANDIDATES);
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

/**
 * USDA words things its own way: ketchup is "Catsup", breadcrumbs is "Bread
 * crumbs, dry, grated, plain", caster sugar is "Sugars, granulated". When the
 * plain name finds nothing, the LLM is asked how USDA would phrase it. Its
 * answer is only ever a search query: whatever USDA returns is then put to
 * chooseWithLlm, so a record is still only accepted from a real candidate list.
 */
async function suggestSearchTerms(name, generate) {
  const prompt = `The USDA FoodData Central database describes generic foods in its own style, head noun first.
Examples: ketchup is "catsup"; breadcrumbs is "bread crumbs dry plain"; caster sugar is "sugars granulated"; turmeric powder is "spices turmeric ground"; penne is "pasta dry enriched"; parmigiano-reggiano is "cheese parmesan hard".
Give up to ${MAX_REWRITTEN_SEARCHES} short search phrases likely to find the generic USDA record for this recipe ingredient. Most likely first.

Ingredient: ${name}

Return strict JSON only, no markdown: ["phrase", "phrase"]`;

  try {
    const raw = await generate(prompt);
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end <= start) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1));

    const terms = [];
    for (const entry of Array.isArray(parsed) ? parsed : []) {
      const term = typeof entry === 'string' ? cacheKey(entry) : '';
      if (term && term !== cacheKey(name) && !terms.includes(term)) terms.push(term);
    }
    return terms.slice(0, MAX_REWRITTEN_SEARCHES);
  } catch (error) {
    logger.warn('[nutritionSources] search rewrite skipped', { name, error: error.message });
    return [];
  }
}

async function findByRewording(name, generate) {
  const terms = await suggestSearchTerms(name, generate);
  const pool = new Map();

  for (const term of terms) {
    try {
      const ranked = rankCandidates(term, await usdaClient.searchFoods(term));
      for (const { food } of ranked.slice(0, CANDIDATES_PER_REWRITE)) {
        if (!pool.has(food.fdcId)) pool.set(food.fdcId, food);
      }
    } catch (error) {
      logger.warn('[nutritionSources] rewritten search failed', { name, term, reason: error.code });
    }
  }

  if (!pool.size) return null;
  // Judged against the ORIGINAL name: the rewrite only widened the net.
  const chosen = await chooseWithLlm(name, [...pool.values()], generate);
  return chosen ? { food: chosen, confidence: 'llm' } : null;
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

  // Prompts show the name as the user typed it; the key is only for cache and search.
  const typed = String(name).replace(/\s+/g, ' ').trim();

  let picked = pickCandidate(key, foods);
  if (picked && picked.confidence === 'low' && generate) {
    const ranked = rankCandidates(key, foods).map((entry) => entry.food);
    const chosen = await chooseWithLlm(typed, ranked, generate);
    if (chosen === null) picked = null;
    else if (chosen) picked = { food: chosen, confidence: 'llm' };
  } else if (!picked && generate) {
    picked = await findByRewording(typed, generate);
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

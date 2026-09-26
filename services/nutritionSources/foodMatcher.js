/**
 * Ranks USDA search candidates against an ingredient name.
 *
 * USDA's relevance order cannot be trusted: "olive oil" returns "Oil, corn,
 * peanut, and olive" first. USDA descriptions are comma-separated with the head
 * noun first ("Oil, olive, salad or cooking"), which is what the scoring leans
 * on. This is a heuristic, so callers get a confidence and should only act
 * automatically on 'high'.
 */
const { mapNutrients, hasCoreNutrients } = require('./nutrientMapper');

const STOPWORDS = new Set([
  'and',
  'or',
  'with',
  'without',
  'of',
  'the',
  'a',
  'an',
  'in',
  'for',
  'to',
]);

// Words that say nothing about which food it is.
const NEUTRAL = new Set([
  'raw',
  'fresh',
  'whole',
  'table',
  'plain',
  'regular',
  'commercial',
  'average',
  'year',
  'round',
  'ripe',
  'mature',
  'uncooked',
  'unprepared',
  'all',
  'leaf',
]);

// A recipe ingredient means the unprocessed food unless it says otherwise.
const PROCESSED = new Set([
  'canned',
  'frozen',
  'cooked',
  'boiled',
  'fried',
  'roasted',
  'baked',
  'grilled',
  'braised',
  'stewed',
  'dried',
  'dehydrated',
  'powder',
  'juice',
  'sauce',
  'soup',
  'paste',
  'puree',
  'pickled',
  'smoked',
  'cured',
  'sweetened',
  'babyfood',
  'mix',
  'snack',
  'restaurant',
  'product',
  'imitation',
  'substitute',
]);

// USDA files many foods under a category heading: "Spices, cardamom",
// "Beverages, water, tap". The heading is not the food, so it is skipped when
// working out what a record is actually about.
const CATEGORY_HEADINGS = new Set([
  'spice',
  'beverage',
  'nut',
  'seed',
  'fish',
  'mollusk',
  'crustacean',
  'cereal',
  'sweetener',
  'candy',
  'snack',
  'legume',
]);

// Two candidates closer than this are a coin toss, not a match.
const CONFIDENT_MARGIN = 5;
// A record that is ABOUT the ingredient outranks one that merely mentions it.
const HEAD_BONUS = 25;

function singular(word) {
  if (word === 'leaves') return 'leaf';
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('oes')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

function tokens(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .split(' ')
    .filter((word) => word && !STOPWORDS.has(word))
    .map(singular);
}

/**
 * True when the record is about this ingredient rather than something that
 * contains its name. USDA descriptions lead with the food: in "Water
 * convolvulus, raw" the food is a vegetable, in "Chicken spread" a spread, in
 * "Bread, cinnamon" a bread. The leading segment (after any category heading)
 * must be made of the ingredient's own words.
 *
 * Found the hard way: a dry run matched "Water" to "Water convolvulus" with
 * high confidence, because it was the only record containing the word.
 */
function isAboutIngredient(wanted, description) {
  const segments = String(description || '')
    .replace(/\([^)]*\)/g, ' ') // "(cilantro)" is an alternative name, not part of the food
    .split(',')
    .map((segment) => tokens(segment))
    .filter((segment) => segment.length);

  while (segments.length > 1 && segments[0].every((word) => CATEGORY_HEADINGS.has(word))) {
    segments.shift();
  }

  const head = (segments[0] || []).filter((word) => !NEUTRAL.has(word) && word !== 'product');
  return head.length > 0 && head.every((word) => wanted.has(word));
}

function scoreCandidate(queryTokens, food) {
  const described = tokens(food.description);
  const wanted = new Set(queryTokens);

  let positionSum = 0;
  for (const token of wanted) {
    const index = described.indexOf(token);
    if (index === -1) return null; // every word of the name must be present
    positionSum += index;
  }

  let score = 100 - 4 * positionSum;
  for (const word of new Set(described)) {
    if (wanted.has(word)) continue;
    if (PROCESSED.has(word)) score -= 15;
    else if (!NEUTRAL.has(word)) score -= 2;
  }
  if (described.includes('raw')) score += 6;
  if (described.includes('whole')) score += 3;
  if (food.dataType === 'SR Legacy') score += 3; // fuller nutrients and household portions

  const aboutIngredient = isAboutIngredient(wanted, food.description);
  if (aboutIngredient) score += HEAD_BONUS;

  return { score, aboutIngredient };
}

/**
 * @returns {Array<{food: object, score: number}>} usable candidates, best first
 */
function rankCandidates(name, foods) {
  const queryTokens = tokens(name);
  if (!queryTokens.length || !Array.isArray(foods)) return [];

  return foods
    .filter((food) => food && hasCoreNutrients(mapNutrients(food.foodNutrients)))
    .map((food) => ({ food, ...scoreCandidate(queryTokens, food) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score);
}

/**
 * @returns {{food: object, confidence: 'high'|'low', score: number}|null}
 */
function pickCandidate(name, foods) {
  const ranked = rankCandidates(name, foods);
  if (!ranked.length) return null;

  const [best, runnerUp] = ranked;
  const clear = !runnerUp || best.score - runnerUp.score >= CONFIDENT_MARGIN;
  // Being the only candidate, or the best of a bad lot, proves nothing.
  const confident = clear && best.aboutIngredient;
  return { food: best.food, score: best.score, confidence: confident ? 'high' : 'low' };
}

module.exports = { rankCandidates, pickCandidate, tokens };

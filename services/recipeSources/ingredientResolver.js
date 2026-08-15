/**
 * Resolves external recipe ingredient names to NutriHelp ingredient ids.
 *
 * TheMealDB names only match NutriHelp's ~276-item vocabulary about 25% of the
 * time ("penne rigate", "Parmigiano-Reggiano", "Breadcrumbs" are all absent), and
 * the create-recipe save path silently drops anything it cannot resolve. That
 * loses most of a prefilled recipe without telling anyone.
 *
 * Strategy, cheapest first:
 *   1. exact match (case/whitespace-insensitive)
 *   2. normalised match — punctuation stripped, singular/plural folded
 *   3. create the missing ingredient — ONLY when `createMissing` is set
 *
 * Creation writes to the SHARED ingredients table, so it is off by default and
 * gated on an explicit caller opt-in. Previewing a recipe must never leave rows
 * behind: only saving one does. Beyond that it stays conservative — never
 * insert a name that already exists in any casing, always record the
 * AI-assigned category, and leave nutrition columns null rather than inventing
 * values (the same "no invented data" rule the mapper follows).
 */
const { supabaseService } = require('../supabaseClient');
const logger = require('../../utils/logger');

const INGREDIENTS_TABLE = 'ingredients';

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Folds simple plurals so "Eggs" matches "Egg" and "Tomatoes" matches "Tomato". */
function singularize(value) {
  if (value.endsWith('ies') && value.length > 4) return `${value.slice(0, -3)}y`;
  if (value.endsWith('es') && value.length > 3) return value.slice(0, -2);
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 3) return value.slice(0, -1);
  return value;
}

/**
 * Matches on the head noun when the full name is absent: "egg yolks" -> "Egg",
 * "beef fillet" -> "Beef". Only considers the last one or two words, and only
 * words of 4+ characters, so "red chilli flakes" does not collapse to "Rice"
 * on a coincidental short-word hit.
 */
function findTrailingWordMatch(foldedName, exact) {
  const words = foldedName.split(' ').filter(Boolean);
  if (words.length < 2) return null;

  const candidates = [words.slice(-2).join(' '), words[words.length - 1]];

  for (const candidate of candidates) {
    if (candidate.length < 4) continue;
    const hit = exact.get(candidate) || exact.get(singularize(candidate));
    if (hit) return hit;
  }

  return null;
}

async function getMaxIngredientId() {
  const { data, error } = await supabaseService
    .from(INGREDIENTS_TABLE)
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0]?.id || 0;
}

function buildLookup(rows) {
  const exact = new Map();
  const loose = new Map();

  for (const row of rows) {
    const normalized = normalizeName(row.name);
    if (!exact.has(normalized)) exact.set(normalized, row);

    const folded = singularize(normalized);
    if (!loose.has(folded)) loose.set(folded, row);
  }

  return { exact, loose };
}

function insertIngredient(row) {
  return supabaseService
    .from(INGREDIENTS_TABLE)
    .insert(row)
    .select('id,name,category')
    .single();
}

/**
 * @param {Array<{name: string, category?: string}>} ingredients
 * @param {{createMissing?: boolean}} [options] createMissing defaults to false:
 *   matching is read-only unless the caller explicitly asks for creation.
 * @returns {Promise<Array<{name, id, category, status: 'matched'|'unmatched'|'created'|'failed', matchedName?}>>}
 */
async function resolveIngredients(ingredients = [], options = {}) {
  const { createMissing = false } = options;
  if (!ingredients.length) return [];

  const { data: existing, error } = await supabaseService
    .from(INGREDIENTS_TABLE)
    .select('id,name,category')
    .limit(5000);

  if (error) throw error;

  const { exact, loose } = buildLookup(existing || []);
  const results = [];
  let nextId = null;

  for (const ingredient of ingredients) {
    const rawName = String(ingredient?.name || '').trim();
    if (!rawName) continue;

    const normalized = normalizeName(rawName);
    const folded = singularize(normalized);
    const hit =
      exact.get(normalized) ||
      loose.get(folded) ||
      // "Parmigiano-Reggiano cheese" -> "Cheese": if the source name ends with a
      // known ingredient, prefer the existing row over minting a near-duplicate.
      findTrailingWordMatch(folded, exact);

    if (hit) {
      results.push({
        name: rawName,
        id: hit.id,
        category: hit.category,
        status: 'matched',
        matchedName: hit.name,
      });
      continue;
    }

    if (!createMissing) {
      // Read-only mode (preview). Report the gap and leave the shared table
      // alone. `category` is deliberately null rather than a guess so the
      // caller's own classification survives instead of being overwritten.
      results.push({ name: rawName, id: null, category: null, status: 'unmatched' });
      continue;
    }

    // Not in the vocabulary — add it. Nutrition columns stay null: we have no
    // real figures and will not invent them.
    //
    // The id is assigned explicitly because this table's identity sequence is
    // out of sync with its rows (rows were inserted with explicit ids at some
    // point), so relying on the default raises a duplicate-key error on the
    // primary key. Fixing the sequence itself would need a migration on the
    // shared database.
    const category = ingredient?.category || 'Pantry';
    nextId = nextId === null ? (await getMaxIngredientId()) + 1 : nextId + 1;

    const { data: inserted, error: insertError } = await insertIngredient({
      id: nextId,
      name: rawName,
      category,
    });

    if (insertError) {
      logger.warn('[recipeSources][ingredients] could not create ingredient', {
        name: rawName,
        error: insertError.message,
      });
      results.push({ name: rawName, id: null, category, status: 'failed' });
      continue;
    }

    logger.info('[recipeSources][ingredients] created ingredient', {
      name: inserted.name,
      id: inserted.id,
      category: inserted.category,
    });

    // Keep the lookup current so duplicates inside one recipe resolve to the
    // row we just created rather than inserting it twice.
    const insertedNormalized = normalizeName(inserted.name);
    exact.set(insertedNormalized, inserted);
    loose.set(singularize(insertedNormalized), inserted);

    results.push({
      name: rawName,
      id: inserted.id,
      category: inserted.category,
      status: 'created',
    });
  }

  return results;
}

module.exports = { resolveIngredients, normalizeName, singularize };

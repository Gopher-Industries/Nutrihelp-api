/**
 * Resolves external recipe ingredient names to NutriHelp ingredient ids.
 *
 * Why: on master the create-recipe save path keeps only ingredients whose name
 * is already in the ingredients table and drops the rest silently. TheMealDB
 * names match that table poorly (about 37% of distinct names, 63% of
 * occurrences, measured 2026-09-02 over all 790 recipes) because the table is
 * small, holds dish names as ingredients and lacks plain rows like "Sugar".
 *
 * Tiers, cheapest first:
 *   1. exact match (case/whitespace-insensitive)
 *   2. normalised match: punctuation stripped, plurals folded
 *   3. head-noun match: "Beef Fillet" -> "Beef"
 *   4. semantic match via LLM, answer must be an entry from the list (optional)
 *   5. create the missing ingredient, ONLY when `createMissing` is set
 *
 * Creation writes to the SHARED ingredients table: off by default, opt-in at
 * save time only, never on preview. Nothing is dropped silently; every name
 * comes back with a status. Created rows keep nutrition null, no invented data.
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
 * Asks the LLM to match the still-unmatched names against the existing
 * vocabulary. This is classification against a fixed list, not generation:
 * the model may only answer with an entry from the vocabulary or null, and
 * every answer is validated against the list in code before it is trusted.
 * It exists to stop near-duplicates the mechanical tiers cannot see —
 * "caster sugar" IS the existing "Sugar" — from being created as new rows.
 *
 * Returns Map<inputName, vocabularyRow>. Any model failure returns an empty
 * map so resolution proceeds exactly as if the tier did not exist.
 */
async function semanticMatch(unmatchedNames, vocabularyRows, exact, generate) {
  if (!unmatchedNames.length || !generate) return new Map();

  const prompt = `You match grocery ingredient names against an existing vocabulary list.
For each input name, answer with the ONE vocabulary entry that is the same ingredient — a different wording, spelling, plural, or a specific form of the same food. Examples: "caster sugar" is "Sugar"; "egg yolks" is "Egg"; "beef fillet" is "Beef".
If the input is a genuinely different ingredient with no vocabulary entry, answer null. "coconut milk" is NOT "Milk". Do not match merely related foods.
Never answer with anything that is not in the vocabulary. When unsure, answer null.

Vocabulary:
${vocabularyRows.map((row) => row.name).join('\n')}

Inputs:
${unmatchedNames.join('\n')}

Return strict JSON only, no markdown: [{"input": "name", "match": "vocabulary entry or null"}]`;

  try {
    const raw = await generate(prompt);
    const start = raw.indexOf('[');
    const end = raw.lastIndexOf(']');
    if (start === -1 || end <= start) return new Map();
    const parsed = JSON.parse(raw.slice(start, end + 1));

    const matches = new Map();
    for (const entry of Array.isArray(parsed) ? parsed : []) {
      if (!entry || typeof entry.input !== 'string' || typeof entry.match !== 'string') continue;
      // Trust nothing off-list: the answer must resolve to a real row.
      const hit = exact.get(normalizeName(entry.match));
      if (hit && unmatchedNames.includes(entry.input)) {
        matches.set(entry.input, hit);
        logger.info('[recipeSources][ingredients] semantic match', {
          input: entry.input,
          matched: hit.name,
        });
      }
    }
    return matches;
  } catch (error) {
    logger.warn('[recipeSources][ingredients] semantic match skipped', {
      error: error.message,
    });
    return new Map();
  }
}

/**
 * @param {Array<{name: string, category?: string}>} ingredients
 * @param {{createMissing?: boolean, generate?: Function}} [options]
 *   createMissing defaults to false: matching is read-only unless the caller
 *   explicitly asks for creation. `generate` enables the semantic matching
 *   tier; when absent, only the mechanical tiers run (keeps tests offline).
 * @returns {Promise<Array<{name, id, category, status: 'matched'|'unmatched'|'created'|'failed', matchedName?}>>}
 */
async function resolveIngredients(ingredients = [], options = {}) {
  const { createMissing = false, generate = null } = options;
  if (!ingredients.length) return [];

  const { data: existing, error } = await supabaseService
    .from(INGREDIENTS_TABLE)
    .select('id,name,category')
    .limit(5000);

  if (error) throw error;

  const { exact, loose } = buildLookup(existing || []);

  // Pass 1: mechanical matching, collecting what it cannot place.
  const mechanicalHits = new Map();
  const pendingNames = [];
  for (const ingredient of ingredients) {
    const rawName = String(ingredient?.name || '').trim();
    if (!rawName || mechanicalHits.has(rawName)) continue;
    const normalized = normalizeName(rawName);
    const folded = singularize(normalized);
    const hit =
      exact.get(normalized) ||
      loose.get(folded) ||
      // "Parmigiano-Reggiano cheese" -> "Cheese": if the source name ends with a
      // known ingredient, prefer the existing row over minting a near-duplicate.
      findTrailingWordMatch(folded, exact);
    if (hit) mechanicalHits.set(rawName, hit);
    else if (!pendingNames.includes(rawName)) pendingNames.push(rawName);
  }

  // Pass 2: semantic matching over the remainder, before anything is created.
  const semanticHits = await semanticMatch(pendingNames, existing || [], exact, generate);

  const results = [];
  let nextId = null;

  for (const ingredient of ingredients) {
    const rawName = String(ingredient?.name || '').trim();
    if (!rawName) continue;

    const hit = mechanicalHits.get(rawName) || semanticHits.get(rawName) || (() => {
      // A row created earlier in this same request also counts as a match.
      const normalized = normalizeName(rawName);
      return exact.get(normalized) || loose.get(singularize(normalized));
    })();

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

    let { data: inserted, error: insertError } = await insertIngredient({
      id: nextId,
      name: rawName,
      category,
    });

    // max-id + 1 is racy: two concurrent creates compute the same id, and the
    // loser's insert fails on the primary key. Re-read the max and retry once
    // so its ingredient still gets created instead of silently vanishing.
    if (insertError && insertError.code === '23505') {
      nextId = (await getMaxIngredientId()) + 1;
      logger.warn('[recipeSources][ingredients] id collision, retrying once', {
        name: rawName,
        nextId,
      });
      ({ data: inserted, error: insertError } = await insertIngredient({
        id: nextId,
        name: rawName,
        category,
      }));
    }

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

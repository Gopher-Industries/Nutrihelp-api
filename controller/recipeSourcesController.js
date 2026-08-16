const recipeSources = require('../services/recipeSources');
const mapperService = require('../services/recipeSources/mapperService');
const { resolveIngredients } = require('../services/recipeSources/ingredientResolver');

/**
 * LLM generator for the resolver's semantic-matching tier, or null when no
 * provider is configured — the resolver then runs its mechanical tiers only.
 */
function semanticGenerate() {
  if (!process.env.OPENROUTER_API_KEY && !process.env.GEMINI_API_KEY) return null;
  try {
    return mapperService.resolveProvider().generate;
  } catch (_error) {
    return null;
  }
}
const logger = require('../utils/logger');

exports.searchSources = async (req, res) => {
  const startedAt = Date.now();
  const { q } = req.query;
  const trace = { requestId: req.requestId, userId: req.user?.userId, q };

  logger.info('[recipeSources] GET /search', trace);

  try {
    const results = await recipeSources.searchAll(q);
    logger.info('[recipeSources] GET /search 200', {
      ...trace,
      results: results.length,
      ms: Date.now() - startedAt,
    });
    return res.status(200).json({ success: true, data: { results } });
  } catch (err) {
    logger.error('[recipeSources] GET /search 502', {
      ...trace,
      error: err.message,
      ms: Date.now() - startedAt,
    });
    return res.status(502).json({ success: false, error: 'Recipe source search failed' });
  }
};

exports.mapSource = async (req, res) => {
  const startedAt = Date.now();
  const { source, external_id: externalId } = req.body;
  const trace = { requestId: req.requestId, userId: req.user?.userId, source, externalId };

  logger.info('[recipeSources] POST /map', trace);

  const adapter = recipeSources.getAdapter(source);
  if (!adapter) {
    logger.warn('[recipeSources] POST /map 400 unknown source', {
      ...trace,
      knownSources: recipeSources.listSources(),
    });
    return res.status(400).json({ success: false, error: `Unknown recipe source "${source}"` });
  }

  let sourceRecipe;
  try {
    sourceRecipe = await adapter.lookup(externalId);
  } catch (err) {
    logger.error('[recipeSources] POST /map 502 lookup failed', {
      ...trace,
      error: err.message,
      ms: Date.now() - startedAt,
    });
    return res.status(502).json({ success: false, error: 'Recipe source lookup failed' });
  }

  if (!sourceRecipe) {
    logger.warn('[recipeSources] POST /map 404 not found at source', {
      ...trace,
      ms: Date.now() - startedAt,
    });
    return res.status(404).json({ success: false, error: 'Recipe not found at source' });
  }

  try {
    const result = await mapperService.mapRecipe(sourceRecipe);

    // Match each mapped ingredient against NutriHelp's vocabulary so the save
    // path does not have to match by name — that silently dropped roughly three
    // quarters of an external recipe's ingredients.
    //
    // READ-ONLY on purpose. Previewing a recipe and walking away must not leave
    // rows in the shared ingredients table; creation happens at save time via
    // POST /resolve-ingredients.
    try {
      const resolved = await resolveIngredients(result.draft.ingredients, {
        createMissing: false,
        generate: semanticGenerate(),
      });
      const byName = new Map(resolved.map((row) => [row.name, row]));

      result.draft.ingredients = result.draft.ingredients.map((ingredient) => {
        const match = byName.get(String(ingredient.name || '').trim());
        if (!match) return ingredient;
        return {
          ...ingredient,
          ingredient_id: match.id,
          category: match.category || ingredient.category,
          matched_name: match.matchedName || match.name,
          resolution: match.status,
        };
      });

      result.ingredient_resolution = {
        matched: resolved.filter((row) => row.status === 'matched').length,
        unmatched: resolved.filter((row) => row.status === 'unmatched').length,
        failed: resolved.filter((row) => row.status === 'failed').length,
      };
    } catch (resolveError) {
      // Resolution is an enhancement — never fail a mapping over it.
      logger.warn('[recipeSources] ingredient resolution failed', {
        ...trace,
        error: resolveError.message,
      });
    }

    logger.info('[recipeSources] POST /map 200', {
      ...trace,
      strategy: result.mapper.strategy,
      model: result.mapper.model,
      ingredients: result.draft.ingredients.length,
      instructions: result.draft.instructions.length,
      unmappedCount: result.unmapped_fields.length,
      ms: Date.now() - startedAt,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    logger.error('[recipeSources] POST /map 500 mapping failed', {
      ...trace,
      error: err.message,
      ms: Date.now() - startedAt,
    });
    return res.status(500).json({ success: false, error: 'Recipe mapping failed' });
  }
};

/**
 * Save-time counterpart to /map: resolves ingredient names to ids, CREATING the
 * ones NutriHelp does not have yet.
 *
 * Split out from /map deliberately. Creation writes to the shared ingredients
 * table, so it is tied to an explicit user action (saving a recipe) rather than
 * to merely previewing one.
 */
exports.resolveIngredientsForSave = async (req, res) => {
  const startedAt = Date.now();
  const { ingredients } = req.body;
  const trace = {
    requestId: req.requestId,
    userId: req.user?.userId,
    count: ingredients.length,
  };

  logger.info('[recipeSources] POST /resolve-ingredients', trace);

  try {
    const resolved = await resolveIngredients(ingredients, {
      createMissing: true,
      generate: semanticGenerate(),
    });

    logger.info('[recipeSources] POST /resolve-ingredients 200', {
      ...trace,
      matched: resolved.filter((row) => row.status === 'matched').length,
      created: resolved.filter((row) => row.status === 'created').length,
      failed: resolved.filter((row) => row.status === 'failed').length,
      ms: Date.now() - startedAt,
    });

    return res.status(200).json({ success: true, data: { resolved } });
  } catch (err) {
    logger.error('[recipeSources] POST /resolve-ingredients 500', {
      ...trace,
      error: err.message,
      ms: Date.now() - startedAt,
    });
    return res.status(500).json({ success: false, error: 'Ingredient resolution failed' });
  }
};

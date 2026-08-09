const recipeSources = require('../services/recipeSources');
const mapperService = require('../services/recipeSources/mapperService');
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

/**
 * Source registry.
 *
 * Adding a source means writing an adapter with { SOURCE_ID, search, lookup }
 * and listing it here — no route, controller or frontend change required.
 */
const theMealDb = require('./adapters/theMealDb');
const logger = require('../../utils/logger');

const ADAPTERS = {
  [theMealDb.SOURCE_ID]: theMealDb,
};

function listSources() {
  return Object.keys(ADAPTERS);
}

function getAdapter(sourceId) {
  return ADAPTERS[sourceId] || null;
}

/**
 * Fans out to every adapter. One failing source degrades to no results from
 * that source rather than failing the whole search.
 */
async function searchAll(query) {
  const sourceIds = listSources();
  const startedAt = Date.now();
  logger.info('[recipeSources] fan-out search start', { query, sources: sourceIds });

  const settled = await Promise.allSettled(
    sourceIds.map((sourceId) => ADAPTERS[sourceId].search(query))
  );

  const rows = settled.flatMap((outcome, index) => {
    if (outcome.status === 'fulfilled') return outcome.value;
    logger.warn('[recipeSources] adapter search failed', {
      source: sourceIds[index],
      error: outcome.reason?.message,
    });
    return [];
  });

  logger.info('[recipeSources] fan-out search done', {
    query,
    results: rows.length,
    failedSources: settled.filter((o) => o.status === 'rejected').length,
    ms: Date.now() - startedAt,
  });

  return rows;
}

module.exports = { listSources, getAdapter, searchAll };

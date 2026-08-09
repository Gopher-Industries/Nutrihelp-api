/**
 * Source registry.
 *
 * Adding a source means writing an adapter with { SOURCE_ID, search, lookup }
 * and listing it here — no route, controller or frontend change required.
 */
const theMealDb = require('./adapters/theMealDb');

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
  const settled = await Promise.allSettled(
    sourceIds.map((sourceId) => ADAPTERS[sourceId].search(query))
  );

  return settled.flatMap((outcome, index) => {
    if (outcome.status === 'fulfilled') return outcome.value;
    console.warn(
      `[recipeSources] adapter "${sourceIds[index]}" search failed:`,
      outcome.reason?.message
    );
    return [];
  });
}

module.exports = { listSources, getAdapter, searchAll };
